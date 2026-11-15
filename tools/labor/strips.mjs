// Seite in Streifen fotografieren: node tools/labor/strips.mjs <url> <prefix> [width=1440] [strip=1800] [scale=0.5] [engine=chromium]
import { chromium, webkit } from '@playwright/test';
const [url, prefix, w = '1440', strip = '1800', scale = '0.5', engine = 'chromium'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: +w, height: 900 }, deviceScaleFactor: +scale });
await page.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(600);
let total = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(160); }
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(900);
total = await page.evaluate(() => document.documentElement.scrollHeight);
const secs = await page.evaluate(() => [...document.querySelectorAll('main > *, footer')].map((s) => ({ tag: s.tagName, id: s.id, cls: s.className.toString().slice(0, 60), top: Math.round(s.getBoundingClientRect().top + scrollY), h: Math.round(s.getBoundingClientRect().height) })));
console.log(JSON.stringify({ total, secs }, null, 0));
let i = 0;
for (let y = 0; y < total; y += +strip) {
  await page.screenshot({ path: `${prefix}-${String(i++).padStart(2, '0')}.png`, fullPage: true, clip: { x: 0, y, width: +w, height: Math.min(+strip, total - y) } });
}
await browser.close();
