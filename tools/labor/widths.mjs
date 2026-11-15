import { chromium } from '@playwright/test';
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const base = {};
for (const f of ['space-grotesk','doto','array','geist-pixel','fontlab','adaxi','departure-mono']) {
  await page.goto(`http://localhost:4560/?schrift=${f}&auftritt=aus`, { waitUntil: 'load' }); await page.waitForTimeout(900);
  const r = await page.evaluate(() => ['Wir gestalten euer Stück Himmel', 'Transparente Preise. Keine Überraschungen', 'Für jeden Anlass die passende Show'].map((t) => { const h = document.querySelector('.sec-head h2'); const s = document.createElement('span'); s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'; s.textContent = t; h.append(s); const w = s.getBoundingClientRect().width; s.remove(); return w; }));
  if (f === 'space-grotesk') Object.assign(base, r);
  console.log(f.padEnd(16), r.map((w, i) => (w / base[i]).toFixed(3)).join('  '));
}
await browser.close();
