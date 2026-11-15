// Proben-Abschnitte einzeln fotografieren: node tools/labor/probe.mjs <outdir> [engine]
import { chromium, webkit } from '@playwright/test';
const [out, engine = 'webkit'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:4560/fonts/labor2/probe.html', { waitUntil: 'load' }); await page.waitForTimeout(1500);
await page.evaluate(() => document.fonts.ready);
const n = await page.locator('section').count();
for (let i = 0; i < n; i++) {
  const s = page.locator('section').nth(i); const name = (await s.locator('h2, h1, header').first().textContent().catch(() => `s${i}`) || `s${i}`).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  await s.screenshot({ path: `${out}/p-${String(i).padStart(2, '0')}-${name}.png` }); console.log(i, name);
}
await browser.close();
