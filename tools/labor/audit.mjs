// Überlauf-Prüfung je Schrift, Seite und Breite: node tools/labor/audit.mjs [engine] [extra query]
import { chromium, webkit } from '@playwright/test';
const engine = process.argv[2] || 'chromium', extra = process.argv[3] || '';
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
let bad = 0;
for (const width of [390, 940, 1440, 1920, 2560]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', (e) => { bad++; console.log('pageerror', e.message); });
  for (const f of (process.env.FONTS || 'geist-pixel,space-grotesk').split(',')) for (const path of ['/', '/drohnenshow-werbung/']) {
    await page.goto(`http://localhost:4560${path}?schrift=${f}&einsatz=alles&auftritt=lauf&himmel=antwortet${extra}`, { waitUntil: 'load' }); await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth, out = [];
      if (document.documentElement.scrollWidth > vw + 1) out.push(`Seite läuft seitlich aus: ${document.documentElement.scrollWidth} > ${vw}`);
      for (const h of document.querySelectorAll('main :is(h1, h2, h3, .ic-h, summary, .price, .fact-value)')) {
        if (h.closest('.labbar')) continue; const r = h.getBoundingClientRect(); if (!r.width) continue;
        // Wörter, die breiter sind als ihre Spalte (Karussells und Schauwörter laufen absichtlich aus dem Bild)
        const col = h.parentElement.getBoundingClientRect();
        if (h.scrollWidth > h.clientWidth + 2 && getComputedStyle(h).overflow === 'visible' && !h.closest('.eco, [data-slider], .occ-track')) out.push(`zu breit: «${h.textContent.trim().slice(0, 40)}» ${h.scrollWidth}>${h.clientWidth} (Spalte ${Math.round(col.width)})`);
      }
      return out;
    });
    if (r.length) { bad += r.length; console.log(`${width} ${f} ${path}\n  ` + r.join('\n  ')); }
  }
  await page.close();
}
console.log(bad ? `${bad} Befunde` : 'ohne Befund'); await browser.close();
