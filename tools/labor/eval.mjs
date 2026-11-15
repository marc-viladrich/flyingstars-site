// node tools/labor/eval.mjs <url> '<js expression>' [engine]
import { chromium, webkit } from '@playwright/test';
const [url, expr, engine = 'chromium'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()); }); page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
console.log(JSON.stringify(await page.evaluate(expr), null, 1));
await browser.close();
