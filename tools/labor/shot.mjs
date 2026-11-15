// Screenshot-Helfer fürs Schrift-Labor: node tools/labor/shot.mjs <url> <out.png> [width=1440] [height=900] [mode=full|view|sel:<css>] [browser=chromium]
import { chromium, webkit } from '@playwright/test';
const [url, out, w = '1440', h = '900', mode = 'full', engine = 'chromium', wait = '900'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1) });
if (process.env.LAB_BAR !== 'auf') await page.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(600);
if (mode === 'full') {
  // Einmal durchscrollen, damit Reveals und Lazy-Bilder ausgelöst sind
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += +h * 0.8) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(140); }
  await page.evaluate(() => scrollTo(0, 0));
}
await page.waitForTimeout(+wait);
if (mode.startsWith('sel:')) { const el = page.locator(mode.slice(4)).first(); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(+wait); await el.screenshot({ path: out }); }
else await page.screenshot({ path: out, fullPage: mode === 'full' });
await browser.close();
