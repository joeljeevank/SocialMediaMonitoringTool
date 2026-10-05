const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure Playwright installs browsers into node_modules so Render does not discard them
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

console.log('[install-browsers] Setting PLAYWRIGHT_BROWSERS_PATH=' + process.env.PLAYWRIGHT_BROWSERS_PATH);

// Check if Chromium is already installed in local-browsers
const localBrowsersDir = path.resolve(__dirname, 'node_modules', 'playwright-core', '.local-browsers');
let alreadyInstalled = false;

if (fs.existsSync(localBrowsersDir)) {
  const files = fs.readdirSync(localBrowsersDir);
  if (files.some(f => f.startsWith('chromium') || f.startsWith('chrome'))) {
    console.log('[install-browsers] Chromium binary already detected in ' + localBrowsersDir);
    alreadyInstalled = true;
  }
}

if (!alreadyInstalled) {
  console.log('[install-browsers] Installing Playwright Chromium browser binary...');
  try {
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
      },
    });
    console.log('[install-browsers] Playwright Chromium installation completed successfully.');
  } catch (err) {
    console.error('[install-browsers] Error installing Playwright Chromium:', err.message);
  }
} else {
  console.log('[install-browsers] Skipping download, browser is already available.');
}
