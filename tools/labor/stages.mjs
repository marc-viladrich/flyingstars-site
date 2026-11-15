// Jede Bühne des Schwarms fotografieren: node tools/labor/stages.mjs <outDir> [w=1440] [h=900] [engine=chromium] [query]
import { chromium, webkit } from '@playwright/test';
const [out, w = '1440', h = '900', engine = 'chromium', query = 'schrift=geist-pixel&einsatz=alles&himmel=antwortet'] = process.argv.slice(2);
const PAGES = { home: ['/', ['.hm-zeile', '#anlaesse', '#pakete', '#projekte', '#team', '#anfrage']], werbung: ['/drohnenshow-werbung/', ['.hm-zeile', 'main #referenzen', '#freigabe', '#pakete', '#orte', '#anfrage']] };
const only = process.env.ONLY?.split(',');
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
for (const [name, [path, sels]] of Object.entries(PAGES)) {
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1) });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
  await page.goto(`http://localhost:4560${path}?${query}`, { waitUntil: 'load' }); await page.waitForTimeout(900);
  let y = 0;
  for (const sel of sels) {
    if (only && !only.some((o) => sel.includes(o))) continue;
    const target = await page.evaluate((s) => { const el = document.querySelector(s); return el ? Math.max(0, el.getBoundingClientRect().top + scrollY - 90) : -1; }, sel);
    if (target < 0) { console.log(name, sel, 'fehlt'); continue; }
    while (y < target) { y = Math.min(target, y + 420); await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); }
    await page.waitForTimeout(+(process.env.WAIT || 3600));
    await page.screenshot({ path: `${out}/${name}-${sel.replace(/[^a-z]/gi, '')}-${w}.png` });
  }
  await page.close();
}
await browser.close();
