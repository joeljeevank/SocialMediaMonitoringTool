import { chromium } from 'playwright';
import * as path from 'path';

async function setupLogin() {
  const userDataDir = path.resolve(__dirname, '..', '.linkedin-browser-profile');

  console.log('----------------------------------------------------');
  console.log('Launching LinkedIn Login Setup...');
  console.log(`Using Profile Directory: ${userDataDir}`);
  console.log('----------------------------------------------------');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://www.linkedin.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  console.log('\n--- ACTION REQUIRED ---');
  console.log(
    'Please log in to your LinkedIn account in the opened browser window.',
  );
  console.log('You can complete the login manually.');
  console.log('Waiting for authentication to complete...\n');

  let authenticated = false;

  try {
    // Check every 2 seconds for up to 5 minutes.
    for (let i = 0; i < 150; i++) {
      await page.waitForTimeout(2000);

      const url = page.url();

      console.log(`Checking login... ${i + 1}/150`);
      console.log(`Current URL: ${url}`);

      // Detect pages that clearly indicate we are NOT authenticated.
      const isLoginPage =
        url.includes('/login') ||
        url.includes('/signup') ||
        url.includes('/authwall') ||
        url.includes('/checkpoint');

      if (isLoginPage) {
        continue;
      }

      // Check the page for common authenticated LinkedIn indicators.
      const authenticatedIndicator = await page.evaluate(() => {
        const text = document.body?.innerText?.toLowerCase() || '';

        const hasProfileMenu =
          !!document.querySelector(
            '[data-testid="nav-profile"], [aria-label*="Me" i], [aria-label*="profile" i]',
          );

        // 'home' is too generic and might appear in footers of logged-out pages.
        const hasFeed = text.includes('start a post');

        return hasProfileMenu || hasFeed;
      }).catch(() => false);

      if (authenticatedIndicator) {
        authenticated = true;

        console.log('\n============================================');
        console.log('SUCCESS: LinkedIn authentication detected!');
        console.log(`Current URL: ${page.url()}`);
        console.log('============================================\n');

        break;
      }

      // If the URL is a normal LinkedIn authenticated page,
      // consider it a possible authenticated state.
      if (
        url.startsWith('https://www.linkedin.com/') &&
        !isLoginPage
      ) {
        console.log('Normal LinkedIn page detected. Checking session...');

        // Give LinkedIn a little more time to render the authenticated UI.
        await page.waitForTimeout(3000);

        const finalUrl = page.url();

        if (
          finalUrl.startsWith('https://www.linkedin.com/') &&
          !finalUrl.includes('/login') &&
          !finalUrl.includes('/signup') &&
          !finalUrl.includes('/authwall') &&
          !finalUrl.includes('/checkpoint')
        ) {
          authenticated = true;

          console.log('\n============================================');
          console.log('SUCCESS: Authenticated LinkedIn session detected!');
          console.log(`Final URL: ${finalUrl}`);
          console.log('============================================\n');

          break;
        }
      }
    }
  } catch (error) {
    console.error('Error while checking authentication:', error);
  }

  if (authenticated) {
    console.log(
      'Login successful! Session has been saved to the persistent profile.',
    );

    console.log(
      '\nYou can now use this profile for the LinkedIn collector.',
    );

    console.log(
      `Profile: ${userDataDir}`,
    );

    console.log('\nLeaving browser open for 60 seconds just in case you need to finish anything...');

    await page.waitForTimeout(60000);
  } else {
    console.log('\n--------------------------------------------');
    console.log('LOGIN WAS NOT DETECTED');
    console.log('--------------------------------------------');
    console.log(`Final URL: ${page.url()}`);
    console.log(
      'The LinkedIn browser session was not confirmed.',
    );
  }

  await context.close();

  console.log('\nBrowser closed. Setup complete.');
}

setupLogin().catch((error) => {
  console.error('Login setup failed:', error);
  process.exit(1);
});