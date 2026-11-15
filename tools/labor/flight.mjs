// Flug zwischen zwei Bühnen in Einzelbildern: node tools/labor/flight.mjs <url> <prefix> <fromSel> <toSel> [engine] [w] [h] [times=300,900,1500,2300,3600]
import { chromium, webkit } from '@playwright/test';
const [url, prefix, from, to, engine = 'chromium', w = '1440', h = '900', times = '300,900,1500,2300,3600'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(900);
const top = (s) => page.evaluate((q) => document.querySelector(q).getBoundingClientRect().top + scrollY - 120, s);
const glide = async (target) => { let y = await page.evaluate(() => scrollY); const dir = Math.sign(target - y); while (y !== target) { y = dir > 0 ? Math.min(target, y + 90) : Math.max(target, y - 90); await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(16); } };
await glide(await top(from)); await page.waitForTimeout(4200);
await page.screenshot({ path: `${prefix}-start.png` });
await glide(await top(to));
let t = 0; for (const ms of times.split(',').map(Number)) { await page.waitForTimeout(ms - t); t = ms; await page.screenshot({ path: `${prefix}-${String(ms).padStart(4, '0')}.png` }); }
await browser.close();
