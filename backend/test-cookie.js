const { chromium } = require('playwright');
require('dotenv').config();

async function run() {
    console.log("Checking cookie:", process.env.LINKEDIN_LI_AT_COOKIE ? "EXISTS" : "MISSING");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies([{
        name: 'li_at',
        value: process.env.LINKEDIN_LI_AT_COOKIE || '',
        domain: '.linkedin.com', // changed to .linkedin.com
        path: '/',
        secure: true,
        sameSite: 'None'
    }]);
    
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
    const url = page.url();
    const title = await page.title();
    console.log("URL after feed navigation:", url);
    console.log("Title after feed navigation:", title);
    
    if (url.includes('/login') || url.includes('/signup') || url.includes('/authwall') || url.includes('/hp')) {
        console.log("COOKIE IS INVALID OR EXPIRED!");
    } else {
        console.log("COOKIE WORKED!");
    }
    
    await browser.close();
}

run().catch(console.error);
