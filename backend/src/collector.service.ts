import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Analytics } from './analytics.entity';
import { Post } from './post.entity';
import { Account } from './account.entity';
import { chromium, BrowserContext, Page } from 'playwright';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}

@Injectable()
export class CollectorService {
  private activeCollections = new Set<number>();

  constructor(
    @InjectRepository(Analytics) private analyticsRepo: Repository<Analytics>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
  ) {}

  private async extractFollowers(page: Page, contextLabel: string = 'Page'): Promise<number | null> {
    try {
      console.log(`[Followers] Scanning ${contextLabel} for genuine profile follower/connection metrics...`);

      const result = await page.evaluate(() => {
        const parseFollower = (text: string): number | null => {
          if (!text || text.length > 80) return null;
          const m = text.match(/([\d,\.]+)\s*([kKmM]?)\s*followers?/i);
          if (m) {
            let num = parseFloat(m[1].replace(/,/g, ''));
            const s = (m[2] || '').toLowerCase();
            if (s === 'k') num *= 1000;
            if (s === 'm') num *= 1000000;
            return Math.floor(num);
          }
          return null;
        };

        const parseConnection = (text: string): number | null => {
          if (!text || text.length > 80) return null;
          const m = text.match(/([\d,\.]+)\s*([kKmM]?)\+?\s*connections?/i);
          if (m) {
            let num = parseFloat(m[1].replace(/,/g, ''));
            const s = (m[2] || '').toLowerCase();
            if (s === 'k') num *= 1000;
            if (s === 'm') num *= 1000000;
            return Math.floor(num);
          }
          return null;
        };

        const main = document.querySelector('main') || document.body;

        const isExcluded = (el: Element | null): boolean => {
          if (!el) return false;
          let p: Element | null = el;
          while (p && p !== document.body) {
            const id = (p.id || '').toLowerCase();
            const text = (p.textContent || '').slice(0, 300).toLowerCase();
            if (
              id.includes('interest') ||
              p.getAttribute('data-section') === 'interests' ||
              p.tagName === 'ASIDE' ||
              p.classList.contains('scaffold-layout__aside') ||
              p.classList.contains('ad-banner-container') ||
              text.includes('connections follow this page') ||
              text.includes('connection follows this page') ||
              text.includes('people also follow') ||
              text.includes('trending news') ||
              text.includes('linkedin news')
            ) {
              return true;
            }
            p = p.parentElement;
          }
          return false;
        };

        // 1. Check Activity section on profile page (e.g. "34 followers" or "0 followers")
        const activitySections = Array.from(main.querySelectorAll('section, div')).filter(s => {
          const h2 = s.querySelector('h2');
          return h2 && (h2.textContent || '').trim().toLowerCase().includes('activity');
        });
        for (const act of activitySections) {
          if (isExcluded(act)) continue;
          const els = act.querySelectorAll('p, span, li, div');
          for (const el of Array.from(els)) {
            const count = parseFollower((el.textContent || '').trim());
            if (count !== null) return count;
          }
        }

        // 2. Check Top Card elements specifically
        const topCardSelectors = [
          '.pv-top-card',
          'section.artdeco-card:first-of-type',
          '.org-top-card',
          '.org-top-card-summary-info-list',
          '.org-top-card-summary__follower-count',
          'ul.pv-top-card--list li',
          '.pv-top-card--list-bullet li',
          'a[href*="/followers/"]',
          'a[href*="/details/connections"]',
          'a[href*="/connections"]',
          '.feed-shared-creator-v2__follower-count',
        ];

        for (const sel of topCardSelectors) {
          const els = main.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            if (isExcluded(el)) continue;
            const count = parseFollower((el.textContent || '').trim());
            if (count !== null) return count;
          }
        }

        // 3. Activity feed page header block (e.g. /recent-activity/all/)
        const allTextNodes = Array.from(main.querySelectorAll('p, span, a, h3, li'));
        for (const el of allTextNodes) {
          if (isExcluded(el)) continue;
          const text = (el.textContent || '').trim();
          const count = parseFollower(text);
          if (count !== null) return count;
        }

        // 4. Fallback to connections in Top Card if no followers found
        for (const sel of topCardSelectors) {
          const els = main.querySelectorAll(sel);
          for (const el of Array.from(els)) {
            if (isExcluded(el)) continue;
            const count = parseConnection((el.textContent || '').trim());
            if (count !== null) return count;
          }
        }

        return null;
      }).catch(() => null);

      if (result !== null) {
        console.log(`[Followers] Successfully detected ${result} followers from ${contextLabel}!`);
        return result;
      }
      return null;
    } catch (err: any) {
      console.warn(`[Followers] Extraction warning: ${err.message}`);
      return null;
    }
  }

  private async extractProfileAnalytics(page: Page): Promise<{ impressions: number | null; profileViews: number | null }> {
    try {
      return await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        let impressions: number | null = null;
        let profileViews: number | null = null;

        const allPs = Array.from(main.querySelectorAll('p, span, h3, div'));
        for (const el of allPs) {
          const text = (el.textContent || '').trim();
          if (impressions === null) {
            const impMatch = text.match(/([\d,\.]+)\s*([kKmM]?)\s*post\s*impressions?/i);
            if (impMatch) {
              let num = parseFloat(impMatch[1].replace(/,/g, ''));
              const s = (impMatch[2] || '').toLowerCase();
              if (s === 'k') num *= 1000;
              if (s === 'm') num *= 1000000;
              impressions = Math.floor(num);
            }
          }
          if (profileViews === null) {
            const pvMatch = text.match(/([\d,\.]+)\s*([kKmM]?)\s*profile\s*views?/i);
            if (pvMatch) {
              let num = parseFloat(pvMatch[1].replace(/,/g, ''));
              const s = (pvMatch[2] || '').toLowerCase();
              if (s === 'k') num *= 1000;
              if (s === 'm') num *= 1000000;
              profileViews = Math.floor(num);
            }
          }
        }
        return { impressions, profileViews };
      });
    } catch {
      return { impressions: null, profileViews: null };
    }
  }

  private async extractPostsFromDom(page: Page, fallbackAuthor: string): Promise<any[]> {
    try {
      const rawPosts = await page.evaluate((authorFallback) => {
        const results: any[] = [];
        const seenUrns = new Set<string>();

        // 1. Gather all activity links or update links across the page
        const candidateLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="urn:li:activity:"], a[href*="/analytics/post-summary/"], a[href*="/feed/update/urn:li:activity:"], a[href*="/activity/"]'
        ));

        for (const link of candidateLinks) {
          const m = link.href.match(/(?:activity|share|update)[:/]+(\d{17,20})/);
          if (!m) continue;
          const urn = `urn:li:activity:${m[1]}`;
          if (seenUrns.has(urn)) continue;

          // Find the enclosing post card container
          let cur: HTMLElement | null = link.parentElement;
          let card: HTMLElement | null = null;
          while (cur && cur !== document.body && cur.tagName !== 'MAIN') {
            const t = cur.innerText || '';
            const otherUrnLinks = Array.from(cur.querySelectorAll<HTMLAnchorElement>('a')).filter(a =>
              a.href && a.href.includes('urn:li:activity:') && !a.href.includes(m[1])
            );
            if (otherUrnLinks.length === 0 && (t.includes('Like') || t.includes('Comment') || t.includes('reaction') || t.includes('Repost') || t.includes('repost'))) {
              card = cur;
            }
            cur = cur.parentElement;
          }

          if (!card) continue;
          seenUrns.add(urn);
          const fullText = card.innerText || '';

          // Likes / Reactions
          let likes = 0;
          const otherMatch = fullText.match(/(?:and|\&)\s*([\d,]+)\s*other/i);
          const reactMatch = fullText.match(/([\d,]+)\s*(?:reaction|like)s?/i);
          if (otherMatch) {
            likes = parseInt(otherMatch[1].replace(/,/g, ''), 10) + 1;
          } else if (reactMatch) {
            likes = parseInt(reactMatch[1].replace(/,/g, ''), 10);
          } else {
            const reactEl = card.querySelector('.social-details-social-counts__reactions-count, button[aria-label*="reaction"]');
            if (reactEl) {
              const rt = reactEl.textContent || reactEl.getAttribute('aria-label') || '';
              const rm = rt.match(/([\d,]+)/);
              if (rm) likes = parseInt(rm[1].replace(/,/g, ''), 10);
            }
          }

          // Comments
          let comments = 0;
          const commMatch = fullText.match(/([\d,]+)\s*comment/i);
          if (commMatch) {
            comments = parseInt(commMatch[1].replace(/,/g, ''), 10);
          } else {
            const commEl = card.querySelector('li.social-details-social-counts__comments, button[aria-label*="comment"]');
            if (commEl) {
              const ct = commEl.textContent || commEl.getAttribute('aria-label') || '';
              const cm = ct.match(/([\d,]+)/);
              if (cm) comments = parseInt(cm[1].replace(/,/g, ''), 10);
            }
          }

          // Impressions / Views
          let impressions = 0;
          const impMatch = fullText.match(/([\d,]+)\s*(?:post\s*)?impression/i) || fullText.match(/([\d,]+)\s*(?:post\s*)?view/i);
          if (impMatch) {
            impressions = parseInt(impMatch[1].replace(/,/g, ''), 10);
          } else {
            const impEl = card.querySelector('a[href*="analytics/post-summary"], a[href*="/analytics/"], .ca-entry-point, button[aria-label*="impression"], a[aria-label*="view"]');
            if (impEl) {
              const it = impEl.textContent || impEl.getAttribute('aria-label') || '';
              const im = it.match(/([\d,]+)/);
              if (im) impressions = parseInt(im[1].replace(/,/g, ''), 10);
            }
          }

          // Shares / Reposts
          let shares = 0;
          const repMatch = fullText.match(/([\d,]+)\s*(?:repost|share)s?/i);
          if (repMatch) {
            shares = parseInt(repMatch[1].replace(/,/g, ''), 10);
          } else {
            const repEl = card.querySelector('li.social-details-social-counts__item--right-aligned button[aria-label*="repost"], button[aria-label*="share"]');
            if (repEl) {
              const rt = repEl.textContent || repEl.getAttribute('aria-label') || '';
              const rm = rt.match(/([\d,]+)/);
              if (rm) shares = parseInt(rm[1].replace(/,/g, ''), 10);
            }
          }

          // Date from card
          let domDate = '';
          const dateEl = card.querySelector<HTMLElement>(
            '.update-components-actor__sub-description, .feed-shared-actor__sub-description, span.update-components-actor__sub-description-t-black--light'
          );
          if (dateEl) {
            domDate = (dateEl.innerText || '').replace(/•?\s*visible to.*$/i, '').trim();
          }

          // Author
          let author = '';
          const authorEl = card.querySelector<HTMLElement>(
            '.update-components-actor__name, .feed-shared-actor__name, h3, h4, span.update-components-actor__title'
          );
          if (authorEl) {
            author = (authorEl.textContent || '')
              .replace(/•?\s*Verified/gi, '')
              .replace(/•?\s*You\b/gi, '')
              .replace(/[•·\s]+$/, '')
              .trim();
          }
          if (!author) {
            const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
            const firstClean = lines.find(l => !['feed post', '• you'].includes(l.toLowerCase()));
            if (firstClean && firstClean.length < 50) author = firstClean;
          }
          if (!author) author = authorFallback;

          // Content
          let content = '';
          const descEl = card.querySelector<HTMLElement>(
            '.feed-shared-inline-show-more-text, .update-components-text, .feed-shared-text-view, [data-ad-preview="message"]'
          );
          if (descEl) {
            content = (descEl.innerText || descEl.textContent || '').trim();
          }
          if (!content) {
            const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
            const ignoreList = [
              'feed post', 'like', 'comment', 'repost', 'send', 'view analytics', '• you',
              author.toLowerCase()
            ];
            const contentLines = lines.filter(l => {
              const lower = l.toLowerCase();
              if (ignoreList.some(ign => lower === ign || lower.startsWith(ign))) return false;
              if (lower.includes('reactions') || lower.includes('comments') || lower.includes('impressions')) return false;
              if (lower.includes('student at') || lower.includes('software engineer') || lower.includes('connections')) return false;
              return true;
            });
            content = contentLines.slice(0, 5).join('\n');
          }
          content = content.replace(/…\s*see more/gi, '').replace(/\.\.\.\s*see more/gi, '').trim();

          results.push({
            id: urn,
            author,
            content,
            postUrl: `https://www.linkedin.com/feed/update/${urn}/`,
            likes,
            comments,
            impressions,
            views: impressions,
            shares,
            domDate,
          });
        }

        // 2. Fallback to traditional selectors if candidate links yielded nothing
        if (results.length === 0) {
          const tradEls = Array.from(document.querySelectorAll<HTMLElement>(
            '.feed-shared-update-v2, div[data-urn*="activity"], div[data-view-name*="feed-full-update"]'
          ));
          for (const el of tradEls) {
            const urnAttr = el.getAttribute('data-urn') || '';
            const m = urnAttr.match(/(?:activity|share)[:/]+(\d{17,20})/);
            const actId = m ? `urn:li:activity:${m[1]}` : (urnAttr || `urn:li:post:${Math.random().toString(36).slice(2)}`);
            if (seenUrns.has(actId)) continue;
            seenUrns.add(actId);

            const text = el.innerText || '';
            const likesM = text.match(/([\d,]+)\s*reaction/i);
            const commM = text.match(/([\d,]+)\s*comment/i);
            const impM = text.match(/([\d,]+)\s*impression/i);
            const repM = text.match(/([\d,]+)\s*repost/i);

            results.push({
              id: actId,
              author: authorFallback,
              content: text.slice(0, 300).trim(),
              postUrl: m ? `https://www.linkedin.com/feed/update/${actId}/` : '',
              likes: likesM ? parseInt(likesM[1].replace(/,/g, ''), 10) : 0,
              comments: commM ? parseInt(commM[1].replace(/,/g, ''), 10) : 0,
              impressions: impM ? parseInt(impM[1].replace(/,/g, ''), 10) : 0,
              views: impM ? parseInt(impM[1].replace(/,/g, ''), 10) : 0,
              shares: repM ? parseInt(repM[1].replace(/,/g, ''), 10) : 0,
              domDate: '',
            });
          }
        }

        return results;
      }, fallbackAuthor).catch(() => []);

      // Enrich posts in Node with Snowflake ID timestamp calculation
      const enrichedPosts = (rawPosts || []).map((p: any) => {
        let postDate = p.domDate || '';
        let isoDate = new Date().toISOString();
        const m = (p.id || '').match(/(?:activity|share)[:/]+(\d{17,20})/);
        if (m) {
          try {
            const activityId = BigInt(m[1]);
            const timestampMs = Number(activityId >> BigInt(22));
            const dateObj = new Date(timestampMs);
            if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() > 2005 && dateObj.getTime() <= Date.now() + 86400000) {
              isoDate = dateObj.toISOString();
              const diffMs = Date.now() - dateObj.getTime();
              const diffSecs = Math.floor(diffMs / 1000);
              if (diffSecs < 60) {
                postDate = 'Just now';
              } else {
                const diffMins = Math.floor(diffSecs / 60);
                if (diffMins < 60) {
                  postDate = diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
                } else {
                  const diffHours = Math.floor(diffMins / 60);
                  if (diffHours < 24) {
                    postDate = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
                  } else {
                    const diffDays = Math.floor(diffHours / 24);
                    if (diffDays < 7) {
                      postDate = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
                    } else {
                      const diffWeeks = Math.floor(diffDays / 7);
                      if (diffWeeks < 5) {
                        postDate = diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
                      } else {
                        const diffMonths = Math.floor(diffDays / 30);
                        if (diffMonths < 12) {
                          postDate = diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
                        } else {
                          postDate = `${Math.floor(diffDays / 365)} years ago`;
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch {}
        }
        if (!postDate && p.domDate) {
          postDate = p.domDate;
        }
        if (!postDate) {
          postDate = 'Recently';
        }
        return {
          ...p,
          postDate,
          date: isoDate,
          views: p.impressions || 0,
        };
      });

      return enrichedPosts;
    } catch (e: any) {
      console.warn('[CollectorService] DOM post extraction warning:', e.message);
      return [];
    }
  }

  private cleanStaleLocks(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    const lockFiles = [
      'SingletonLock',
      'SingletonCookie',
      'SingletonSocket',
      'lockfile',
    ];
    for (const file of lockFiles) {
      const lockPath = path.join(dirPath, file);
      if (fs.existsSync(lockPath)) {
        try {
          fs.unlinkSync(lockPath);
          console.log(`[CollectorService] Removed stale lock: ${lockPath}`);
        } catch (e: any) {
          console.warn(`[CollectorService] Could not remove lock ${lockPath}:`, e.message);
        }
      }
    }
  }

  private findChromiumExecutable(): string | undefined {
    // 1. If PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is explicitly set in env, prioritize it
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH && fs.existsSync(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)) {
      return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    }

    // 2. Candidate root directories where Playwright might have installed Chromium
    const candidateRoots = [
      path.resolve(process.cwd(), 'node_modules', 'playwright-core', '.local-browsers'),
      path.resolve(process.cwd(), 'backend', 'node_modules', 'playwright-core', '.local-browsers'),
      path.resolve(__dirname, '..', 'node_modules', 'playwright-core', '.local-browsers'),
      path.resolve(__dirname, '..', '..', 'node_modules', 'playwright-core', '.local-browsers'),
      '/opt/render/.cache/ms-playwright',
      path.join(process.env.HOME || '', '.cache', 'ms-playwright'),
      path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    ];

    for (const root of candidateRoots) {
      if (!fs.existsSync(root)) continue;
      try {
        const items = fs.readdirSync(root);
        for (const item of items) {
          if (!item.startsWith('chromium')) continue;
          const itemPath = path.join(root, item);
          const subItems = fs.readdirSync(itemPath);
          for (const sub of subItems) {
            const subPath = path.join(itemPath, sub);
            if (fs.statSync(subPath).isDirectory()) {
              const files = fs.readdirSync(subPath);
              for (const file of files) {
                if (
                  file === 'chrome' ||
                  file === 'chrome.exe' ||
                  file === 'chrome-headless-shell' ||
                  file === 'chrome-headless-shell.exe'
                ) {
                  const fullBinary = path.join(subPath, file);
                  // Ensure executable permissions on Linux/macOS
                  if (process.platform !== 'win32') {
                    try { fs.chmodSync(fullBinary, 0o755); } catch (e) {}
                  }
                  console.log(`[CollectorService] Discovered Chromium executable: ${fullBinary}`);
                  return fullBinary;
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[CollectorService] Error searching root ${root}:`, err.message);
      }
    }

    // 3. Fallback: check standard Linux system binaries
    const systemBinaries = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ];
    for (const sysBin of systemBinaries) {
      if (fs.existsSync(sysBin)) {
        console.log(`[CollectorService] Found system browser at: ${sysBin}`);
        return sysBin;
      }
    }

    // 4. Fallback: try chromium.executablePath() if playwright knows it
    try {
      const defaultPath = chromium.executablePath();
      if (defaultPath && fs.existsSync(defaultPath)) {
        if (process.platform !== 'win32') {
          try { fs.chmodSync(defaultPath, 0o755); } catch (e) {}
        }
        return defaultPath;
      }
    } catch (e) {}

    return undefined;
  }

  private ensureChromiumExecutable(): string | undefined {
    let binary = this.findChromiumExecutable();
    if (binary) return binary;

    console.warn('[CollectorService] No Chromium executable detected on server. Attempting emergency installation...');
    try {
      const { execSync } = require('child_process');
      // Install with PLAYWRIGHT_BROWSERS_PATH=0 so it installs inside node_modules
      execSync('npx playwright install chromium', {
        stdio: 'inherit',
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: '0',
        },
      });

      binary = this.findChromiumExecutable();
      if (binary) {
        console.log(`[CollectorService] Emergency installation succeeded, binary at: ${binary}`);
        return binary;
      }
    } catch (installErr: any) {
      console.error('[CollectorService] Emergency browser installation failed:', installErr.message);
    }

    return undefined;
  }

  private async launchBrowserWithRetry(userDataDir: string): Promise<BrowserContext> {
    this.cleanStaleLocks(userDataDir);
    this.cleanStaleLocks(path.join(userDataDir, 'Default'));

    const isProduction =
      process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    const isHeadless =
      process.env.HEADLESS !== undefined
        ? process.env.HEADLESS === 'true'
        : isProduction;

    let executablePath = this.ensureChromiumExecutable();
    console.log(`[CollectorService] Launching persistent context (headless: ${isHeadless}, executable: ${executablePath || 'Playwright default'})...`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const launchOptions: any = {
          headless: isHeadless,
          viewport: { width: 1280, height: 800 },
          locale: 'en-US',
          timezoneId: 'America/New_York',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--dns-result-order=ipv4first',
            '--enable-features=NetworkServiceInProcess',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          ],
          ignoreDefaultArgs: ['--enable-automation'],
        };

        if (executablePath) {
          launchOptions.executablePath = executablePath;
        }

        const context = await chromium.launchPersistentContext(userDataDir, launchOptions);

        try {
          await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined,
            });
          });
        } catch (e) {}

        return context;
      } catch (err: any) {
        console.warn(`[CollectorService] Launch attempt ${attempt} failed: ${err.message}`);
        if (
          err.message?.includes("Executable doesn't exist") ||
          err.message?.includes('playwright install')
        ) {
          console.warn('[CollectorService] Browser binary missing or incompatible, attempting reinstall...');
          executablePath = this.ensureChromiumExecutable();
          if (attempt === 3) {
            throw new BadRequestException(
              `Chromium browser binary could not be started on Render (${err.message}). In your Render Dashboard, please set environment variable PLAYWRIGHT_BROWSERS_PATH=0 and trigger a manual deploy.`,
            );
          }
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        } else if (
          err.message?.includes('Opening in existing browser session') ||
          err.message?.includes('already in use')
        ) {
          this.cleanStaleLocks(userDataDir);
          this.cleanStaleLocks(path.join(userDataDir, 'Default'));
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          throw err;
        }
      }
    }
    throw new InternalServerErrorException(
      'Failed to launch browser context. Another Chromium process may be holding the profile lock.',
    );
  }

  private async safeGotoWithRetry(
    page: Page,
    url: string,
    options: Parameters<Page['goto']>[1] = {},
    maxRetries = 3,
  ): Promise<any> {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
          ...options,
        });
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || '').toLowerCase();

        // Immediately throw on redirect loops (handled specifically by caller)
        if (msg.includes('err_too_many_redirects') || msg.includes('too many redirects')) {
          throw err;
        }

        const isTransientNetworkError =
          msg.includes('err_name_not_resolved') ||
          msg.includes('name not resolved') ||
          msg.includes('err_connection_reset') ||
          msg.includes('err_connection_timed_out') ||
          msg.includes('err_connection_refused') ||
          msg.includes('err_internet_disconnected') ||
          msg.includes('err_network_changed') ||
          msg.includes('err_timed_out') ||
          msg.includes('timeouterror') ||
          msg.includes('timeout') ||
          msg.includes('net::');

        if (isTransientNetworkError && attempt < maxRetries) {
          const delayMs = attempt * 2000;
          console.warn(
            `[CollectorService] Navigation to ${url} failed on attempt ${attempt}/${maxRetries} (${err.message?.split('\n')[0]}). Retrying in ${delayMs}ms...`,
          );
          await page.waitForTimeout(delayMs);
          continue;
        }

        throw err;
      }
    }
    throw lastError;
  }
  async collectData(accountId: number) {
    if (this.activeCollections.has(accountId)) {
      throw new BadRequestException(
        'Data collection for this account is already in progress. Please wait a moment.',
      );
    }
    this.activeCollections.add(accountId);

    const account = await this.accountRepo.findOne({
      where: { id: accountId },
      relations: { organizations: true },
    });
    if (!account) {
      this.activeCollections.delete(accountId);
      throw new InternalServerErrorException('Account not found');
    }

    let targetUrl = '';
    if (account.organizations && account.organizations.length > 0) {
      targetUrl = `https://www.linkedin.com/company/${account.organizations[0].id}/`;
    } else {
      targetUrl = account.profileUrl; // Use the exact connected account URL
    }

    let userDataDir = path.resolve(
      process.cwd(),
      `.linkedin-browser-profile-${accountId}`,
    );
    if (!fs.existsSync(userDataDir)) {
      const globalProfile = path.resolve(
        process.cwd(),
        '.linkedin-browser-profile',
      );
      if (fs.existsSync(globalProfile)) {
        userDataDir = globalProfile;
      }
    }

    const isProduction =
      process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    const isHeadless =
      process.env.HEADLESS !== undefined
        ? process.env.HEADLESS === 'true'
        : isProduction;

    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let currentStep = 'Initialization';

    try {
      context = await this.launchBrowserWithRetry(userDataDir);

      // Only inject cookie if in production cloud (Render) or explicitly requested
      // On local machine, the persistent browser profile handles sessions natively
      const shouldInjectCookie = isProduction || process.env.FORCE_COOKIE_INJECTION === 'true';

      if (shouldInjectCookie && process.env.LINKEDIN_LI_AT_COOKIE) {
        const rawCookie = process.env.LINKEDIN_LI_AT_COOKIE.trim().replace(/^["']|["']$/g, '');
        try {
          await context.addCookies([
            {
              name: 'li_at',
              value: rawCookie,
              domain: '.www.linkedin.com',
              path: '/',
              secure: true,
              httpOnly: true,
              sameSite: 'None',
            },
            {
              name: 'li_at',
              value: rawCookie,
              domain: '.linkedin.com',
              path: '/',
              secure: true,
              httpOnly: true,
              sameSite: 'None',
            },
          ]);
          console.log(
            '[CollectorService] Injected LINKEDIN_LI_AT_COOKIE into cloud browser context',
          );
        } catch (cookieErr: any) {
          console.warn(
            '[CollectorService] Failed to inject LI_AT cookie:',
            cookieErr.message,
          );
        }
      }

      page = await context.newPage();

      // Step 1: Session Check
      console.log('=== LINKEDIN COLLECTION START ===');
      currentStep = 'Session Check';
      try {
        await this.safeGotoWithRetry(page, 'https://www.linkedin.com/feed/', {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
      } catch (navErr: any) {
        if (
          navErr.message?.includes('ERR_TOO_MANY_REDIRECTS') ||
          navErr.message?.includes('too many redirects')
        ) {
          if (isProduction) {
            console.error('[CollectorService] ERR_TOO_MANY_REDIRECTS: LinkedIn rejected the session cookie on cloud.');
            if (context) await context.close();
            throw new BadRequestException(
              'LinkedIn session cookie (LINKEDIN_LI_AT_COOKIE) has expired or was revoked by LinkedIn. Please copy a fresh "li_at" cookie from your browser and update it in your Render Dashboard Environment Variables.',
            );
          } else {
            console.warn('[CollectorService] ERR_TOO_MANY_REDIRECTS detected locally. Clearing cookies and navigating to login...');
            await context.clearCookies().catch(() => {});
            await this.safeGotoWithRetry(page, 'https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
          }
        } else if (
          navErr.message?.includes('ERR_NAME_NOT_RESOLVED') ||
          navErr.message?.includes('name not resolved')
        ) {
          if (context) await context.close();
          throw new BadRequestException(
            'Unable to connect to LinkedIn (DNS resolution error: ERR_NAME_NOT_RESOLVED). Please check your internet connection and try again.',
          );
        } else if (
          navErr.message?.includes('ERR_INTERNET_DISCONNECTED') ||
          navErr.message?.includes('ERR_NETWORK_CHANGED') ||
          navErr.message?.includes('ERR_CONNECTION_RESET')
        ) {
          if (context) await context.close();
          throw new BadRequestException(
            `Network connection error (${navErr.message.split('\n')[0]}). Please check your internet connection and try again.`,
          );
        } else {
          throw navErr;
        }
      }
      await page.waitForTimeout(3000); // Allow redirects

      const sessionUrl = page.url();
      const sessionTitle = await page.title();

      const isLoginPage =
        sessionUrl.includes('/login') ||
        sessionUrl.includes('/signup') ||
        sessionUrl.includes('/authwall') ||
        sessionUrl.includes('/checkpoint') ||
        sessionUrl.includes('/hp') ||
        (sessionUrl === 'https://www.linkedin.com/' &&
          (await page.locator('form[action*="login"]').count()) > 0);

      const hasGlobalNav = (await page.locator('#global-nav').count()) > 0;
      let isAuthenticated = hasGlobalNav || sessionUrl.includes('/feed');

      if (!isAuthenticated && !isLoginPage) {
        // Fallback robust check by strictly looking for logged-in specific DOM elements
        isAuthenticated = await page
          .evaluate(() => {
            const hasProfileMenu = !!document.querySelector(
              '[data-testid="nav-profile"], .global-nav__me',
            );
            const hasFeedLayout = !!document.querySelector('.scaffold-layout');
            return hasProfileMenu || hasFeedLayout;
          })
          .catch(() => false);
      }

      console.log('\n--- LINKEDIN SESSION CHECK ---');
      console.log(`Profile directory: ${userDataDir}`);
      console.log(`Current URL: ${sessionUrl}`);
      console.log(`Page title: ${sessionTitle}`);
      console.log(`Authenticated: ${isAuthenticated ? 'YES' : 'NO'}`);
      console.log(`Login page detected: ${isLoginPage ? 'YES' : 'NO'}`);
      console.log('------------------------------\n');

      if (!isAuthenticated) {
        if (isHeadless) {
          if (context) await context.close();
          console.log('=== LINKEDIN COLLECTION FAILED ===');
          throw new BadRequestException(
            'LinkedIn browser session is not authenticated. Please add or update your LINKEDIN_LI_AT_COOKIE in your Render environment variables.',
          );
        }

        console.log(
          'Authenticated: NO. Pausing so user can log in manually...',
        );

        let loggedIn = false;
        for (let i = 0; i < 60; i++) {
          // wait up to 120 seconds
          await page.waitForTimeout(2000);
          const currentUrl = page.url();
          if (
            currentUrl.includes('/feed') ||
            currentUrl.includes('/in/') ||
            currentUrl.includes('/company/')
          ) {
            loggedIn = true;
            console.log('User manually logged in during scraping!');
            break;
          }
        }

        if (!loggedIn) {
          if (context) await context.close();
          console.log('=== LINKEDIN COLLECTION FAILED ===');
          throw new BadRequestException(
            'LinkedIn browser session is not authenticated. Action: Run LinkedIn login setup.',
          );
        }
      }

      // Step 2: Navigate to target company page
      currentStep = 'Navigate to Target Page';
      try {
        await this.safeGotoWithRetry(page, targetUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
      } catch (targetNavErr: any) {
        if (
          targetNavErr.message?.includes('ERR_TOO_MANY_REDIRECTS') ||
          targetNavErr.message?.includes('too many redirects')
        ) {
          if (context) await context.close();
          throw new BadRequestException(
            'LinkedIn session cookie (LINKEDIN_LI_AT_COOKIE) has expired or was revoked by LinkedIn. Please extract a fresh "li_at" cookie from your browser and update your backend/.env (for local) or Render Dashboard (for cloud).',
          );
        } else if (
          targetNavErr.message?.includes('ERR_NAME_NOT_RESOLVED') ||
          targetNavErr.message?.includes('name not resolved')
        ) {
          if (context) await context.close();
          throw new BadRequestException(
            'Unable to connect to LinkedIn (DNS resolution error: ERR_NAME_NOT_RESOLVED). Please check your internet connection and try again.',
          );
        } else if (
          targetNavErr.message?.includes('ERR_INTERNET_DISCONNECTED') ||
          targetNavErr.message?.includes('ERR_NETWORK_CHANGED') ||
          targetNavErr.message?.includes('ERR_CONNECTION_RESET')
        ) {
          if (context) await context.close();
          throw new BadRequestException(
            `Network connection error (${targetNavErr.message.split('\n')[0]}). Please check your internet connection and try again.`,
          );
        }
        throw targetNavErr;
      }
      await page.waitForTimeout(3000); // Allow elements to load

      const finalUrl = page.url();
      const finalTitle = await page.title();
      const isCompanyPage = finalUrl.includes('/company/');

      console.log(`TARGET URL: ${targetUrl}`);
      console.log(`FINAL URL: ${finalUrl}`);
      console.log(`PAGE TITLE: ${finalTitle}`);
      console.log(`COMPANY PAGE DETECTED: ${isCompanyPage ? 'YES' : 'NO'}\n`);

      if (isCompanyPage) {
        console.log('=== COMPANY PAGE DETECTED ===');
      }

      if (!finalUrl.includes('/company/') && !finalUrl.includes('/in/')) {
        if (context) await context.close();
        console.log('=== LINKEDIN COLLECTION FAILED ===');
        throw new BadRequestException(
          `Profile not found. LinkedIn redirected to: ${finalUrl}. Please check if the username is correct.`,
        );
      }

      // Step 3: Extract Data
      console.log('=== ANALYTICS DATA EXTRACTION ===');
      currentStep = 'Extract Followers';
      await page.waitForTimeout(3000); // Allow dynamic header/top card to hydrate
      let followers: number | null = await this.extractFollowers(page, 'Profile Page');
      let followerElementDetected = followers !== null ? 'YES' : 'NO';
      
      let postsScraped: any[] = [];
      let postElementsDetected = 0;

      // Profile Analytics (Post Impressions / Profile Views) from the profile page
      const profileAnalytics = await this.extractProfileAnalytics(page);
      console.log(`[CollectorService] Profile analytics on main profile: impressions=${profileAnalytics.impressions}, views=${profileAnalytics.profileViews}`);

      try {
        console.log('=== ANALYTICS PAGE NAVIGATION ===');
        currentStep = 'Navigate to Posts';
        let cleanFinalUrl = finalUrl.split('?')[0];
        if (!cleanFinalUrl.endsWith('/')) {
          cleanFinalUrl += '/';
        }

        let candidateUrls: string[] = [];
        if (cleanFinalUrl.includes('/company/')) {
          candidateUrls = [
            cleanFinalUrl + 'posts/?feedView=all',
            cleanFinalUrl + 'posts/',
          ];
        } else {
          // Personal profiles: authored posts live under /recent-activity/all/ or /recent-activity/shares/
          candidateUrls = [
            cleanFinalUrl + 'recent-activity/all/',
            cleanFinalUrl + 'recent-activity/shares/',
            cleanFinalUrl + 'recent-activity/shares/?feedView=all',
            cleanFinalUrl,
          ];
        }

        for (const candidate of candidateUrls) {
          console.log(`[CollectorService] Trying posts URL: ${candidate}`);
          try {
            await this.safeGotoWithRetry(page, candidate, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });
          } catch (navErr: any) {
            console.warn(
              `[CollectorService] Failed navigating to ${candidate}: ${navErr.message}. Trying next candidate...`,
            );
            await page.waitForTimeout(1000);
            continue;
          }

          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(4000); // Give SPA a moment to fully render

          // If followers were not detected on profile page, extract from Activity feed page header
          if (followers === null) {
            console.log('Followers not found on profile; attempting extraction from Activity feed page...');
            const actFollowers = await this.extractFollowers(page, 'Activity Feed Page');
            if (actFollowers !== null) {
              followers = actFollowers;
              followerElementDetected = 'YES';
              console.log(`Followers recovered from Activity page: ${followers}`);
            }
          }

          currentStep = 'Extract Posts';

          console.log('=== DEEP FEED SCROLLING: LOADING ALL AVAILABLE POSTS ===');
          let prevPostCount = 0;
          let unchangedCycles = 0;
          const maxScrollCycles = 20;

          for (let cycle = 0; cycle < maxScrollCycles; cycle++) {
            try {
              // 1. Expand "Show more" buttons if present
              const showMoreLoc = page.locator(
                'button.feed-shared-show-more-button, button:has-text("Show more results"), button:has-text("Show more activity"), button:has-text("Load more"), button:has-text("Show more")',
              );
              if ((await showMoreLoc.count().catch(() => 0)) > 0) {
                const firstBtn = showMoreLoc.first();
                if (await firstBtn.isVisible().catch(() => false)) {
                  console.log('Clicking "Show more" button to reveal older posts...');
                  await firstBtn.click({ timeout: 2000 }).catch(() => {});
                  await page.waitForTimeout(2000);
                }
              }

              // 2. Scroll down to trigger lazy loading
              await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
              await page.waitForTimeout(2000);

              // 3. Count detected post links in DOM
              const currentPostCount = await page.evaluate(() => {
                const links = document.querySelectorAll(
                  'a[href*="urn:li:activity:"], a[href*="/analytics/post-summary/"], a[href*="/feed/update/urn:li:activity:"]'
                );
                return links.length;
              }).catch(() => 0);
              console.log(`Scroll cycle ${cycle + 1}/${maxScrollCycles} - detected post links in DOM: ${currentPostCount}`);

              if (currentPostCount > prevPostCount) {
                prevPostCount = currentPostCount;
                unchangedCycles = 0;
              } else {
                unchangedCycles++;
                if (unchangedCycles === 1) {
                  await page.evaluate(() => window.scrollBy(0, -300));
                  await page.waitForTimeout(1000);
                  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                  await page.waitForTimeout(2000);
                } else if (unchangedCycles >= 3) {
                  console.log(`Feed reached the end or no new posts loaded after ${unchangedCycles} attempts. Ending scroll.`);
                  break;
                }
              }
            } catch (err: any) {
              console.log(`Scroll cycle ${cycle + 1} encountered: ${err.message}`);
              break;
            }
          }

          // Extract all posts from DOM
          const candidatePosts = await this.extractPostsFromDom(page, account.username);
          if (candidatePosts.length > 0) {
            console.log(`[CollectorService] Successfully detected & extracted ${candidatePosts.length} posts on candidate: ${candidate}`);
            postsScraped = candidatePosts;
            postElementsDetected = candidatePosts.length;
            break;
          } else {
            console.log(`[CollectorService] No posts detected on ${candidate}. Checking next candidate URL...`);
          }
        }

        // If candidate loop ended without posts, try on current page as final fallback
        if (postsScraped.length === 0) {
          postsScraped = await this.extractPostsFromDom(page, account.username);
          postElementsDetected = postsScraped.length;
        }
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
        console.error('Error during posts extraction:', e.message);
        throw new InternalServerErrorException(
          'Error during posts extraction: ' + e.message,
        );
      }

      console.log('=== DATA PROCESSING ===');
      const timestamp = new Date().toISOString();
      const dateStr = timestamp.split('T')[0];

      // Aggregate Metrics: Real-time, authentic counts from LinkedIn
      let newLikes = postsScraped.reduce((sum, p) => sum + (p.likes || 0), 0);
      let newComments = postsScraped.reduce((sum, p) => sum + (p.comments || 0), 0);
      let newShares = postsScraped.reduce((sum, p) => sum + (p.shares || 0), 0);
      const postImpressions = postsScraped.reduce((sum, p) => sum + (p.impressions || p.views || 0), 0);
      let newViews = Math.max(postImpressions, profileAnalytics.impressions || 0);
      let newRecentPosts = postsScraped.length;

      // Follower count: Genuine count extracted from LinkedIn. Only fallback if null.
      let newFollowers = followers;
      if (newFollowers === null) {
        const prevAnalytics = await this.analyticsRepo.findOne({
          where: { account: { id: account.id } },
          order: { id: 'DESC' },
        });
        if (prevAnalytics && prevAnalytics.followers !== null && prevAnalytics.followers !== undefined) {
          newFollowers = prevAnalytics.followers;
          console.log(`[CollectorService] Preserved existing follower count (${newFollowers}) for account ${account.id}`);
        } else {
          newFollowers = 0;
        }
      }

      const finalCollectionTime = timestamp;

      const newAnalytics = this.analyticsRepo.create({
        date: dateStr,
        likes: newLikes,
        comments: newComments,
        shares: newShares,
        views: newViews,
        followers: newFollowers,
        recentPosts: newRecentPosts,
        account: account,
        dataSource: 'Scraper',
        unavailableMetrics: 'unique_viewers,demographics',
        lastCollectionTime: finalCollectionTime,
      });
      await this.analyticsRepo.save(newAnalytics);

      // Save / Upsert All Scraped Posts into PostgreSQL
      for (const p of postsScraped) {
        try {
          let postRecord = await this.postRepo.findOne({ where: { id: p.id } });
          if (postRecord) {
            postRecord.content = p.content;
            postRecord.author = p.author;
            postRecord.postDate = p.postDate;
            postRecord.postUrl = p.postUrl;
            postRecord.impressions = p.impressions;
            postRecord.likes = p.likes ?? postRecord.likes;
            postRecord.comments = p.comments ?? postRecord.comments;
            postRecord.shares = p.shares ?? postRecord.shares;
            postRecord.account = account;
            postRecord.accountId = account.id;
            await this.postRepo.save(postRecord);
          } else {
            postRecord = this.postRepo.create({
              id: p.id,
              content: p.content,
              author: p.author,
              postDate: p.postDate,
              postUrl: p.postUrl,
              createdAt: p.date,
              impressions: p.impressions,
              likes: p.likes ?? 0,
              comments: p.comments ?? 0,
              shares: p.shares ?? 0,
              dataSource: 'Scraper',
              account: account,
              accountId: account.id,
            });
            await this.postRepo.save(postRecord);
          }
        } catch (postErr: any) {
          console.warn(`Could not persist post ${p.id}: ${postErr.message}`);
        }
      }

      console.log('=== LINKEDIN COLLECTION SUCCESS ===');
      console.log(`Followers: ${newFollowers}`);
      console.log(`Views: ${newViews}`);
      console.log(`Likes: ${newLikes}`);
      console.log(`Comments: ${newComments}`);
      console.log(`Shares: ${newShares}`);
      console.log(`All Posts: ${newRecentPosts}`);

      return {
        status: 'success',
        success: true,
        message: 'Data collected successfully',
        data: {
          followers: newFollowers,
          views: newViews,
          likes: newLikes,
          comments: newComments,
          shares: newShares,
          totalPosts: newRecentPosts,
          posts: postsScraped,
          unavailable: ['unique_viewers', 'demographics'],
          lastCollectionTime: finalCollectionTime,
          dataSource: 'Scraper',
        },
      };
    } catch (err: any) {
      console.log('=== LINKEDIN COLLECTION FAILED ===');
      console.error('Exception during scrape:', err.message);
      console.error('Stack trace:', err.stack);
      console.error('Failed Step:', currentStep);

      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(err.message);
    } finally {
      if (context) {
        await context.close().catch((e) => {
          console.warn('[CollectorService] Error closing browser context:', e.message);
        });
      }
      this.activeCollections.delete(accountId);
    }
  }

  async getPosts(accountId: number, options: {
    search?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const { search, sort = 'createdAt', order = 'DESC', page = 1, limit = 10 } = options;

    const query = this.postRepo.createQueryBuilder('post')
      .where('post.accountId = :accountId', { accountId });

    if (search && search.trim()) {
      query.andWhere('(post.content ILIKE :search OR post.author ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    const sortColumn = ['impressions', 'likes', 'comments', 'shares', 'createdAt'].includes(sort)
      ? `post.${sort}`
      : 'post.createdAt';

    query.orderBy(sortColumn, order);
    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
