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
    } else if (process.env.LINKEDIN_TARGET_PAGE_URL) {
       targetUrl = process.env.LINKEDIN_TARGET_PAGE_URL;
    } else {
       targetUrl = account.profileUrl; // Fallback
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

      if (!isCompanyPage && !targetUrl.includes('/in/')) {
         await context.close();
         console.log('=== LINKEDIN COLLECTION FAILED ===');
         throw new BadRequestException(`Failed to reach the company page. Landed on: ${finalUrl}`);
      }

      // Step 3: Extract Data
      console.log('=== ANALYTICS DATA EXTRACTION ===');
      currentStep = 'Extract Followers';
      let followers: number | null = null;
      let followerText = '';
      let followerElementDetected = 'NO';
      
      try {
         const followerLocators = [
           '.org-top-card-summary-info-list__info-item',
           '.t-normal.t-black--light',
           'div.t-14.t-black--light',
           'div.org-top-card-summary-info-list',
           '.text-body-small.t-black--light',
           '.org-top-card-summary__follower-count',
           '*:has-text("followers")'
         ];
         
         for (const sel of followerLocators) {
            const elements = await page.locator(sel).all();
            for (const el of elements) {
               const text = await el.innerText().catch(()=>'');
               if (text.toLowerCase().includes('follower')) {
                  followerText = text;
                  const match = text.match(/([\d,]+)\s+follower/i);
                  if (match) {
                     followers = parseInt(match[1].replace(/,/g, ''), 10);
                     followerElementDetected = 'YES';
                     break;
                  }
               }
            }
            if (followers !== null) break;
         }
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
         let postsUrl = '';
         if (targetUrl.includes('/company/')) {
            postsUrl = targetUrl.endsWith('/') ? targetUrl + 'posts/?feedView=all' : targetUrl + '/posts/?feedView=all';
         } else {
            // Personal profiles use /recent-activity/shares/ to see ONLY posts (not likes/comments)
            postsUrl = targetUrl.endsWith('/') ? targetUrl + 'recent-activity/shares/' : targetUrl + '/recent-activity/shares/';
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
         
         const seenUrns = new Set();
         const seenContents = new Set();
         let scrapedCount = 0;
         
         for (let i = 0; i < postElements.length && scrapedCount < 5; i++) {
            const el = postElements[i];
            
            let urn = await el.getAttribute('data-urn').catch(()=>null);
            
            // Fallback: try to find an inner element with data-urn if the outer doesn't have it
            if (!urn) {
                urn = await el.locator('[data-urn]').first().getAttribute('data-urn').catch(()=>null);
            }
            
            if (urn && seenUrns.has(urn)) {
               continue; // Skip duplicate URN
            }
            
            const content = await el.locator('.feed-shared-update-v2__description, .break-words, .update-components-text, .update-components-update-v2__commentary span[dir="ltr"]').innerText().catch(()=>'');
            const cleanContent = content.trim();
            
            if (cleanContent && seenContents.has(cleanContent)) {
               continue; // Skip duplicate content
            }
            
            if (urn) seenUrns.add(urn);
            if (cleanContent) seenContents.add(cleanContent);

            const author = await el.locator('.update-components-actor__name, .feed-shared-actor__name, span.update-components-actor__title').innerText().catch(()=>'');
            const postDate = await el.locator('.update-components-actor__sub-description, .feed-shared-actor__sub-description, span.update-components-actor__sub-description-t-black--light').innerText().catch(()=>'');
            
            let postUrl = '';
            if (urn) {
                postUrl = `https://www.linkedin.com/feed/update/${urn}/`;
            } else {
                const href = await el.locator('a').first().getAttribute('href').catch(()=>null);
                if (href) postUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
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
            console.log(`Post: ${content.trim().substring(0, 30)}...`);
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

            console.log(`\n=== POST ENGAGEMENT ===`);
            console.log(`Post: ${content.trim().substring(0, 30)}...`);
            console.log(`Reactions: ${likes !== null ? likes : 'unavailable'}`);
            console.log(`Comments: ${comments !== null ? comments : 'unavailable'}`);
            console.log(`Post Date: ${postDate.trim()}`);
            console.log(`Post URL: ${postUrl}`);
            
            if (cleanContent || author.trim()) {
              postsScraped.push({
                 author: author.trim(),
                 content: cleanContent,
                 postUrl,
                 postDate: postDate.trim(),
                 likes,
                 comments,
                 date: new Date().toISOString()
              });
              scrapedCount++;
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
      const newFollowers = followers !== null ? followers : 0;
      const newRecentPosts = postsScraped.length;

      const lastAnalytics = await this.analyticsRepo.findOne({
        where: { account: { id: accountId } },
        order: { id: 'DESC' }
      });

      let finalCollectionTime = timestamp;
      if (lastAnalytics) {
        if (
          lastAnalytics.likes === newLikes &&
          lastAnalytics.comments === newComments &&
          lastAnalytics.followers === newFollowers &&
          lastAnalytics.recentPosts === newRecentPosts
        ) {
          finalCollectionTime = lastAnalytics.lastCollectionTime || timestamp;
        }
      }

      const newAnalytics = this.analyticsRepo.create({
        date: dateStr,
        likes: newLikes,
        comments: newComments,
        shares: 0, 
        views: 0, 
        followers: newFollowers, 
        recentPosts: newRecentPosts,
        account: account,
        dataSource: 'Scraper',
        unavailableMetrics: 'impressions,unique_viewers,shares,views,demographics' + (followers === null ? ',followers' : ''),
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
          unavailable: ['impressions', 'unique_viewers', 'demographics', 'views', 'shares'],
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

