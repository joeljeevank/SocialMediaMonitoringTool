import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class CollectorService {
  constructor(
    @InjectRepository(Analytics) private analyticsRepo: Repository<Analytics>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
  ) {}

  async collectData(accountId: number) {
    const account = await this.accountRepo.findOne({ 
      where: { id: accountId },
      relations: { organizations: true }
    });
    if (!account) throw new InternalServerErrorException('Account not found');

    let targetUrl = '';
    if (account.organizations && account.organizations.length > 0) {
       targetUrl = `https://www.linkedin.com/company/${account.organizations[0].id}/`;
    } else {
       targetUrl = account.profileUrl; // Use the exact connected account URL
    }

    const userDataDir = path.resolve(__dirname, '..', `.linkedin-browser-profile-${accountId}`);
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let currentStep = 'Initialization';
    
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // LinkedIn heavily blocks headless: true, so we must keep it visible (but you don't need to login!)
      });

      page = await context.newPage();
      
      // Step 1: Session Check
      console.log('=== LINKEDIN COLLECTION START ===');
      currentStep = 'Session Check';
      await page.goto('https://www.linkedin.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000); // Allow redirects
      
      const sessionUrl = page.url();
      const sessionTitle = await page.title();
      
      const isLoginPage =
        sessionUrl.includes('/login') ||
        sessionUrl.includes('/signup') ||
        sessionUrl.includes('/authwall') ||
        sessionUrl.includes('/checkpoint') ||
        sessionUrl.includes('/hp') ||
        (sessionUrl === 'https://www.linkedin.com/' && (await page.locator('form[action*="login"]').count()) > 0);

      const hasGlobalNav = (await page.locator('#global-nav').count()) > 0;
      let isAuthenticated = hasGlobalNav || sessionUrl.includes('/feed');
      
      if (!isAuthenticated && !isLoginPage) {
        // Fallback robust check by strictly looking for logged-in specific DOM elements
        isAuthenticated = await page.evaluate(() => {
          const hasProfileMenu = !!document.querySelector('[data-testid="nav-profile"], .global-nav__me');
          const hasFeedLayout = !!document.querySelector('.scaffold-layout');
          return hasProfileMenu || hasFeedLayout;
        }).catch(() => false);
      }

      console.log('\n--- LINKEDIN SESSION CHECK ---');
      console.log(`Profile directory: ${userDataDir}`);
      console.log(`Current URL: ${sessionUrl}`);
      console.log(`Page title: ${sessionTitle}`);
      console.log(`Authenticated: ${isAuthenticated ? 'YES' : 'NO'}`);
      console.log(`Login page detected: ${isLoginPage ? 'YES' : 'NO'}`);
      console.log('------------------------------\n');

      if (!isAuthenticated) {
         console.log('Authenticated: NO. Pausing so user can log in manually...');
         
         let loggedIn = false;
         for (let i = 0; i < 60; i++) { // wait up to 120 seconds
            await page.waitForTimeout(2000);
            const currentUrl = page.url();
            if (currentUrl.includes('/feed') || currentUrl.includes('/in/') || currentUrl.includes('/company/')) {
               loggedIn = true;
               console.log('User manually logged in during scraping!');
               break;
            }
         }

         if (!loggedIn) {
            await context.close();
            console.log('=== LINKEDIN COLLECTION FAILED ===');
            throw new BadRequestException('LinkedIn browser session is not authenticated. Action: Run LinkedIn login setup.');
         }
      }

      // Step 2: Navigate to target company page
      currentStep = 'Navigate to Target Page';
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
         await context.close();
         console.log('=== LINKEDIN COLLECTION FAILED ===');
         throw new BadRequestException(`Profile not found. LinkedIn redirected to: ${finalUrl}. Please check if the username is correct.`);
      }

      // Step 3: Extract Data
      console.log('=== ANALYTICS DATA EXTRACTION ===');
      currentStep = 'Extract Followers';
      let followers: number | null = null;
      let followerText = '';
      let followerElementDetected = 'NO';
      
      try {
         const followerLocators = [
           'a[href*="/followers/"]',
           'ul.pv-top-card--list li',
           '.pv-top-card--list-bullet li',
           'span.text-body-small.t-black--light',
           '.org-top-card-summary-info-list__info-item',
           '.t-normal.t-black--light',
           'div.t-14.t-black--light',
           '.org-top-card-summary__follower-count',
           '*:has-text("followers")'
         ];
         
         let debugTexts = [];
         for (const sel of followerLocators) {
            const elements = await page.locator(sel).all();
            for (const el of elements) {
               const text = await el.innerText().catch(()=>'');
               const lowerText = text.toLowerCase();
               if (lowerText.includes('follower') || lowerText.includes('connection')) {
                  debugTexts.push(text);
                  followerText = text;
                  const match = text.match(/([\d,\.]+)([kKmM]?)\+?\s*(follower|connection)/i);
                  if (match) {
                     let num = parseFloat(match[1].replace(/,/g, ''));
                     const suffix = match[2].toLowerCase();
                     if (suffix === 'k') num *= 1000;
                     if (suffix === 'm') num *= 1000000;
                     followers = Math.floor(num);
                     followerElementDetected = 'YES';
                     break;
                  }
               }
            }
            if (followers !== null) break;
         }
         const fs = require('fs');
         fs.writeFileSync('follower_debug.txt', debugTexts.join('\n---\n'));
      } catch (e: any) {
         console.error('Error during follower extraction:', e.message);
      }
      
      let postsScraped = [];
      let postElementsDetected = 0;
      let reactionElementsDetected = 0;
      let commentElementsDetected = 0;
      
      try {
         console.log('=== ANALYTICS PAGE NAVIGATION ===');
         currentStep = 'Navigate to Posts';
         // The recent activity URL can vary. We'll try the main targetUrl first because recent posts load there often.
         // Use finalUrl (which resolves LinkedIn username aliases) instead of targetUrl to avoid 404s
         let cleanFinalUrl = finalUrl.split('?')[0];
         if (!cleanFinalUrl.endsWith('/')) {
             cleanFinalUrl += '/';
         }

         let postsUrl = '';
         if (cleanFinalUrl.includes('/company/')) {
            postsUrl = cleanFinalUrl + 'posts/?feedView=all';
         } else {
            // Personal profiles use /recent-activity/shares/ to see ONLY posts authored/shared (not likes/comments on others)
            postsUrl = cleanFinalUrl + 'recent-activity/shares/';
         }
         
         // Add timestamp to bypass local browser cache if the user just deleted a post
         const cacheBuster = `?t=${Date.now()}`;
         postsUrl = postsUrl.includes('?') ? postsUrl + `&t=${Date.now()}` : postsUrl + cacheBuster;
         
         await page.goto(postsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
         
         // Wait for network to settle to avoid Execution context destroyed errors during SPA navigation
         await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
         await page.waitForTimeout(4000); // Give SPA a moment to fully render
         
         const preExtractUrl = page.url();
         const preExtractTitle = await page.title();
         console.log(`Current URL before extraction: ${preExtractUrl}`);
         console.log(`Page title before extraction: ${preExtractTitle}`);
         
         currentStep = 'Extract Posts';
         
         // Controlled scroll to trigger lazy loading
         for(let i=0; i<4; i++) {
            try {
               await page.evaluate(() => window.scrollBy(0, 800));
            } catch (err) {
               console.log('Scroll failed (possibly due to background navigation), ignoring...');
            }
            await page.waitForTimeout(2500);
         }
         
         const postSelectors = [
           'div[data-urn^="urn:li:activity:"]',
           '.feed-shared-update-v2',
           '.occludable-update',
           '.update-components-update-v2',
           'div.feed-shared-update-v2',
           'div.share-update-card'
         ];
         
         let postElements: any[] = [];
         let usedSelector = '';
         for (const sel of postSelectors) {
             const elements = await page.locator(sel).all();
             if (elements.length > 0) {
                 postElements = elements;
                 usedSelector = sel;
                 break;
             }
         }
         
         postElementsDetected = postElements.length;
         console.log('\n=== POST EXTRACTION DEBUG ===');
         console.log(`Posts found: ${postElementsDetected}`);
         
         if (postElementsDetected === 0) {
             console.log('=== NO POSTS FOUND ===');
             console.log('The LinkedIn page loaded successfully, but no post elements were found (possibly user has no posts). Continuing with 0 posts.');
         } else {
         
         const seenPostsMap = new Map();
         let scrapedCount = 0;
         
         for (let i = 0; i < postElements.length && scrapedCount < 5; i++) {
            const el = postElements[i];
            
            let urn = await el.getAttribute('data-urn').catch(()=>null);
            if (!urn) {
                urn = await el.locator('[data-urn]').first().getAttribute('data-urn').catch(()=>null);
            }
                        // 1. Expand "...see more" button if present inside the post to expose full post description
             try {
               const seeMoreLoc = el.locator('button.feed-shared-inline-show-more-text__button, button:has-text("…see more"), button:has-text("see more"), button:has-text("…more")');
               if (await seeMoreLoc.count() > 0) {
                 await seeMoreLoc.first().click({ timeout: 1000 }).catch(() => {});
               }
             } catch (e) {}

             // 2. Extract post description using prioritized LinkedIn commentary selectors
             let rawContent = '';
             const descSelectors = [
               '.feed-shared-inline-show-more-text',
               '.feed-shared-update-v2__description-wrapper',
               '.feed-shared-update-v2__description',
               '.update-components-text',
               '.update-components-update-v2__commentary',
               '.feed-shared-text-view',
               '.feed-shared-text',
               '[data-ad-preview="message"]',
               '.feed-shared-main-content'
             ];

             for (const dSel of descSelectors) {
               const dLoc = el.locator(dSel);
               const count = await dLoc.count().catch(() => 0);
               if (count > 0) {
                 const t = await dLoc.first().innerText().catch(() => '');
                 if (t && t.trim().length > 0) {
                   rawContent = t.trim();
                   break;
                 }
               }
             }

             // 3. Fallback: extract description directly from post element
             if (!rawContent) {
               rawContent = await el.evaluate((node: any) => {
                 const textEls = node.querySelectorAll('[dir="ltr"], [dir="rtl"], .update-components-text, .feed-shared-inline-show-more-text');
                 for (let i = 0; i < textEls.length; i++) {
                   const elItem = textEls[i] as HTMLElement;
                   if (!elItem.closest('.feed-shared-actor, .update-components-actor, .social-details-social-counts, .feed-shared-social-actions, .feed-shared-social-action-bar, button')) {
                     const text = elItem.innerText || elItem.textContent || '';
                     if (text.trim().length > 0) return text.trim();
                   }
                 }
                 return '';
               }).catch(() => '');
             }

             const cleanContent = rawContent
               .replace(/…\s*see more/gi, '')
               .replace(/\.\.\.\s*see more/gi, '')
               .replace(/…\s*more/gi, '')
               .trim();

             // Extract author with fallback
             let author = '';
             const authorSelectors = [
               '.update-components-actor__name',
               '.feed-shared-actor__name',
               'span.update-components-actor__title',
               '.update-components-actor__title'
             ];
             for (const aSel of authorSelectors) {
               const aLoc = el.locator(aSel);
               if (await aLoc.count().catch(() => 0) > 0) {
                 const text = await aLoc.first().innerText().catch(() => '');
                 if (text && text.trim()) {
                   let cleanedAuthor = text
                     .replace(/•?\s*Verified/gi, '')
                     .replace(/•?\s*You\b/gi, '')
                     .replace(/[•·\s]+$/, '')
                     .trim();

                   // If author name is duplicated (e.g. "Joel Jeevan Kumar S Joel Jeevan Kumar S")
                   const words = cleanedAuthor.split(/\s+/);
                   if (words.length >= 2 && words.length % 2 === 0) {
                     const half = words.length / 2;
                     const firstHalf = words.slice(0, half).join(' ');
                     const secondHalf = words.slice(half).join(' ');
                     if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
                       cleanedAuthor = firstHalf;
                     }
                   }
                   author = cleanedAuthor;
                   break;
                 }
               }
             }

             let postUrl = '';
             if (urn) {
                 postUrl = `https://www.linkedin.com/feed/update/${urn}/`;
             } else {
                 const href = await el.locator('a').first().getAttribute('href').catch(()=>null);
                 if (href) postUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
             }

             // Extract post date with real-time accuracy
             let postDate = '';

             // Priority 1: LinkedIn Activity URN Snowflake ID contains exact creation timestamp (first 42 bits)
             const activityMatch = (urn || postUrl || '').match(/(?:activity|share)[:/]+(\d{17,20})/);
             if (activityMatch) {
               try {
                 const activityId = BigInt(activityMatch[1]);
                 const timestampMs = Number(activityId >> BigInt(22));
                 const date = new Date(timestampMs);
                 if (!isNaN(date.getTime()) && date.getFullYear() > 2005 && date.getTime() <= Date.now() + 86400000) {
                   const diffMs = Date.now() - date.getTime();
                   if (diffMs < 0) {
                     postDate = 'Just now';
                   } else {
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
                                 const diffYears = Math.floor(diffDays / 365);
                                 postDate = diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
                               }
                             }
                           }
                         }
                       }
                     }
                   }
                 }
               } catch (e) {}
             }

             // Priority 2: Fallback to DOM selectors
             if (!postDate) {
               const dateSelectors = [
                 '.update-components-actor__sub-description',
                 '.feed-shared-actor__sub-description',
                 'span.update-components-actor__sub-description-t-black--light'
               ];
               for (const dSel of dateSelectors) {
                 const dLoc = el.locator(dSel);
                 if (await dLoc.count().catch(() => 0) > 0) {
                   const text = await dLoc.first().innerText().catch(() => '');
                   if (text && text.trim()) {
                     let cleanedDate = text.trim();
                     cleanedDate = cleanedDate.replace(/•?\s*visible to.*$/i, '').trim();

                     const longMatch = cleanedDate.match(/(\d+\s*(?:second|minute|hour|day|week|month|year)s?\s*ago)/i);
                     if (longMatch) {
                       cleanedDate = longMatch[1];
                     } else {
                       const shortMatch = cleanedDate.match(/^(\d+)(mo|[smhdwy])/i);
                       if (shortMatch) {
                         const num = parseInt(shortMatch[1], 10);
                         const u = shortMatch[2].toLowerCase();
                         const unitMap: Record<string, string> = {
                           s: num === 1 ? '1 second ago' : `${num} seconds ago`,
                           m: num === 1 ? '1 minute ago' : `${num} minutes ago`,
                           h: num === 1 ? '1 hour ago' : `${num} hours ago`,
                           d: num === 1 ? '1 day ago' : `${num} days ago`,
                           w: num === 1 ? '1 week ago' : `${num} weeks ago`,
                           mo: num === 1 ? '1 month ago' : `${num} months ago`,
                           y: num === 1 ? '1 year ago' : `${num} years ago`
                         };
                         cleanedDate = unitMap[u] ? unitMap[u] : shortMatch[0];
                       }
                     }
                     cleanedDate = cleanedDate.replace(/[•·\s]+$/, '').trim();
                     postDate = cleanedDate;
                     break;
                   }
                 }
               }
             }
            
            let likes: number | null = null;
            const likeSelectors = [
              '.social-details-social-counts__reactions-count',
              '.social-details-social-counts__social-proof-text',
              'button[aria-label*="reaction"]',
              'span.social-details-social-counts__reactions-count'
            ];
            for (const lSel of likeSelectors) {
              const lEls = await el.locator(lSel).all();
              for (const lEl of lEls) {
                const text = await lEl.innerText().catch(()=>'');
                const aria = await lEl.getAttribute('aria-label').catch(()=>'');
                const t = (text + ' ' + (aria||'')).toLowerCase();
                if (/\d/.test(t) && !t.includes('react to')) {
                   const match = t.match(/([\d,]+)/);
                   if (match) {
                     likes = parseInt(match[1].replace(/,/g, ''), 10);
                     reactionElementsDetected++;
                     break;
                   }
                }
              }
              if (likes !== null) break;
            }
            
            let comments: number | null = null;
            let extractedCommentText = '';
            console.log(`\n=== COMMENT EXTRACTION DEBUG ===`);
            console.log(`Post Description: ${cleanContent.substring(0, 40)}...`);
            const commentSelectors = [
              'li.social-details-social-counts__comments button',
              'li.social-details-social-counts__item--right-aligned button',
              'button[aria-label*="comment"]',
              'span:has-text("comment")',
              '.social-details-social-counts__comments'
            ];
            
            console.log('Comment selectors checked:');
            for (const cSel of commentSelectors) {
              const cEls = await el.locator(cSel).all();
              console.log(`Selector: ${cSel}, Elements found: ${cEls.length}`);
              for (const cEl of cEls) {
                const text = await cEl.innerText().catch(()=>'');
                const ariaLabel = await cEl.getAttribute('aria-label').catch(()=>'');
                
                const textsToCheck = [text.toLowerCase(), ariaLabel?.toLowerCase() || ''];
                for (const t of textsToCheck) {
                  // Must contain comment but NOT be the action button
                  if (t && t.includes('comment') && !t.includes('comment on') && !t.includes('leave a comment')) {
                    const match = t.match(/([\d,]+)\s*comment/i);
                    if (match) {
                      comments = parseInt(match[1].replace(/,/g, ''), 10);
                      extractedCommentText = t;
                      commentElementsDetected++;
                      break;
                    }
                  }
                }
                if (comments !== null) break;
              }
              if (comments !== null) break;
            }
            
            if (comments === null) {
               console.log(`Extracted text: NONE`);
               console.log(`Final comment count: Comments unavailable: engagement count was not present in the loaded DOM`);
            } else {
               console.log(`Extracted text: ${extractedCommentText}`);
               console.log(`Final comment count: ${comments}`);
            }

            // Extract impressions / views with fallback selectors
            let impressions: number | null = null;
            let extractedImpressionText = '';
            console.log(`\n=== IMPRESSION / VIEW EXTRACTION DEBUG ===`);
            const impressionSelectors = [
              'a[href*="analytics/post-summary"]',
              'a[href*="/analytics/"]',
              'span.ca-entry-point__num-views',
              '.ca-entry-point',
              '.feed-shared-bottom-bar__analytics-button',
              'button[aria-label*="impression"]',
              'a[aria-label*="impression"]',
              'button[aria-label*="view"]',
              'a[aria-label*="view"]',
              '[data-test-id*="analytics"]',
              'div.feed-shared-bottom-bar',
              'div.ca-entry-point',
              'span:has-text("impression")',
              'button:has-text("impression")',
              'a:has-text("impression")',
              'span:has-text("view")',
              'button:has-text("view")',
              'a:has-text("view")'
            ];

            for (const iSel of impressionSelectors) {
              const iEls = await el.locator(iSel).all().catch(() => []);
              for (const iEl of iEls) {
                const text = await iEl.innerText().catch(() => '');
                const aria = await iEl.getAttribute('aria-label').catch(() => '');
                const t = (text + ' ' + (aria || '')).toLowerCase();

                // Exclude generic navigation and action buttons
                const isNavAction = 
                  t.includes('view profile') || 
                  t.includes('view post') || 
                  t.includes('view full') || 
                  t.includes('view more') || 
                  t.includes('view on') ||
                  t.includes('react to');

                if (t && !isNavAction && (t.includes('impression') || t.includes('view'))) {
                  const match = 
                    t.match(/([\d,]+)\s*(?:post\s*)?impression/i) || 
                    t.match(/(?:impression|view)s?[:\s]+([\d,]+)/i) ||
                    t.match(/([\d,]+)\s*(?:post\s*)?view/i);
                  if (match) {
                    impressions = parseInt(match[1].replace(/,/g, ''), 10);
                    extractedImpressionText = t.trim();
                    break;
                  }
                }
              }
              if (impressions !== null) break;
            }

            // Fallback: Check whole card text for "X impressions"
            if (impressions === null) {
              const fullElText = await el.innerText().catch(() => '');
              const match = 
                fullElText.match(/([\d,]+)\s*(?:post\s*)?impression/i) || 
                fullElText.match(/(?:analytics|impressions?)[:\s]+([\d,]+)/i);
              if (match) {
                impressions = parseInt(match[1].replace(/,/g, ''), 10);
                extractedImpressionText = match[0];
              }
            }

            console.log(`Impression text: ${extractedImpressionText || 'none'}`);
            console.log(`Final Impressions / Views: ${impressions !== null ? impressions : 0}`);

            console.log(`\n=== POST ENGAGEMENT ===`);
            console.log(`Post Description: ${cleanContent.substring(0, 60)}...`);
            console.log(`Impressions: ${impressions !== null ? impressions : 0}`);
            console.log(`Reactions: ${likes !== null ? likes : 'unavailable'}`);
            console.log(`Comments: ${comments !== null ? comments : 'unavailable'}`);
            console.log(`Post Date: ${postDate.trim()}`);
            console.log(`Post URL: ${postUrl}`);
            
            const isDeletedPost = 
              cleanContent.toLowerCase().includes('this post has been deleted') ||
              cleanContent.toLowerCase().includes('this post was deleted') ||
              cleanContent.toLowerCase().includes('post has been removed') ||
              cleanContent.toLowerCase().includes('this post is unavailable') ||
              cleanContent.toLowerCase().includes('this post is no longer available');

            if (!isDeletedPost && (cleanContent || author.trim())) {
              const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
              const dedupeKey = `${normalize(author)}|${normalize(postDate)}|${normalize(cleanContent)}`;
              
              if (seenPostsMap.has(dedupeKey)) {
                 // Duplicate found (likely a nested/ghost element). Merge engagements.
                 const existing = seenPostsMap.get(dedupeKey);
                 if (likes !== null && (existing.likes === null || likes > existing.likes)) existing.likes = likes;
                 if (comments !== null && (existing.comments === null || comments > existing.comments)) existing.comments = comments;
                 if (impressions !== null && (existing.impressions === null || impressions > existing.impressions)) {
                   existing.impressions = impressions;
                   existing.views = impressions;
                 }
              } else {
                 const newPost = {
                   author: normalize(author),
                   content: normalize(cleanContent),
                   postUrl,
                   postDate: normalize(postDate),
                   likes,
                   comments,
                   impressions: impressions !== null ? impressions : 0,
                   views: impressions !== null ? impressions : 0,
                   date: new Date().toISOString()
                 };
                 seenPostsMap.set(dedupeKey, newPost);
                 postsScraped.push(newPost);
                 scrapedCount++;
              }
            }
             }
         } // End of else block for postElementsDetected > 0
      } catch(e: any) {
         if (e instanceof BadRequestException) throw e;
         console.error('Error during posts extraction:', e.message);
         throw new InternalServerErrorException('Error during posts extraction: ' + e.message);
      }
      
      await context.close();

      if (followers === null && postElementsDetected === 0) {
         console.log('=== LINKEDIN COLLECTION WARNING ===');
         console.log('LinkedIn page loaded but no followers or posts were found. Target DOM selectors may have changed, or the account is completely empty. Proceeding with 0s.');
      }

      console.log('=== DATA PROCESSING ===');
      const timestamp = new Date().toISOString();
      const dateStr = timestamp.split('T')[0];
      
      // Save Analytics
      const newLikes = postsScraped.reduce((sum, p) => sum + (p.likes || 0), 0);
      const newComments = postsScraped.reduce((sum, p) => sum + (p.comments || 0), 0);
      const newViews = postsScraped.reduce((sum, p) => sum + (p.impressions || p.views || 0), 0);
      const newFollowers = followers !== null ? followers : 0;
      const newRecentPosts = postsScraped.length;

      const finalCollectionTime = timestamp;

      const newAnalytics = this.analyticsRepo.create({
        date: dateStr,
        likes: newLikes,
        comments: newComments,
        shares: 0, 
        views: newViews, 
        followers: newFollowers, 
        recentPosts: newRecentPosts,
        account: account,
        dataSource: 'Scraper',
        unavailableMetrics: 'unique_viewers,shares,demographics' + (followers === null ? ',followers' : ''),
        lastCollectionTime: finalCollectionTime
      });
      await this.analyticsRepo.save(newAnalytics);

      console.log('=== LINKEDIN COLLECTION SUCCESS ===');
      return { 
        status: 'success', 
        success: true,
        message: 'Data collected successfully', 
        data: {
          followers,
          posts: postsScraped,
          unavailable: ['unique_viewers', 'demographics', 'shares'],
          lastCollectionTime: finalCollectionTime,
          dataSource: 'Scraper'
        }
      };

    } catch (err: any) {
      if (context) await context.close();
      console.log('=== LINKEDIN COLLECTION FAILED ===');
      console.error('Exception during scrape:', err.message);
      console.error('Stack trace:', err.stack);
      console.error('Failed Step:', currentStep);
      
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
          throw err;
      }
      throw new InternalServerErrorException(err.message);
    }
  }
}

