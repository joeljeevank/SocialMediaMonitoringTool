const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure Playwright installs browsers into node_modules so Render does not discard them
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

console.log('[install-browsers] Setting PLAYWRIGHT_BROWSERS_PATH=0');

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
  console.log('[install-browsers] Installing Playwright Chromium browser binary into node_modules...');
  try {
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: '0',
      },
    });
    console.log('[install-browsers] Playwright Chromium installation completed successfully.');
  } catch (err) {
    console.error('[install-browsers] Error installing Playwright Chromium:', err.message);
  }
} else {
  console.log('[install-browsers] Skipping download, browser is already available in node_modules.');
}

// Ensure execution permissions on Linux/macOS
try {
  if (process.platform !== 'win32' && fs.existsSync(localBrowsersDir)) {
    execSync(`chmod -R 755 "${localBrowsersDir}"`);
    console.log('[install-browsers] Ensured executable permissions on ' + localBrowsersDir);
  }
} catch (e) {
  console.warn('[install-browsers] Could not set permissions:', e.message);
}
