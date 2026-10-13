const puppeteer = require('puppeteer');
const path = require('path');

async function execute() {
    // credentials come from the environment, never from this file
    const email = process.env.TBTH_TEST_EMAIL;
    const password = process.env.TBTH_TEST_PASSWORD;
    if (!email || !password) {
        console.error('Set TBTH_TEST_EMAIL and TBTH_TEST_PASSWORD first.');
        process.exit(1);
    }
    const basePath = 'C:\\Users\\aarons\\.gemini\\antigravity\\brain\\1ce8e065-610a-4eb4-a3b6-7b753fd53410\\browser';

    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1280, height: 800 } });
    const page = await browser.newPage();

    try {
        console.log('Navigating to live site...');
        await page.goto('https://www.truthbtoldhub.com/', { waitUntil: 'networkidle2' });

        console.log('Entering credentials...');
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);

        console.log('Clicking login...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => console.log('Navigation timeout, continuing...'))
        ]);

        // Wait a bit extra for dynamic content
        await new Promise(r => setTimeout(r, 5000));

        const adminPath = path.join(basePath, 'admin_hub.png');
        await page.screenshot({ path: adminPath, fullPage: true });
        console.log(`Saved screenshot to ${adminPath}`);

    } catch (err) {
        console.error('Error during execution:', err);
        const errorPath = path.join(basePath, 'error_state.png');
        await page.screenshot({ path: errorPath, fullPage: true }).catch(() => { });
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

execute();
