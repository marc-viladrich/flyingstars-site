import { chromium } from '@playwright/test';
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const f of ['space-grotesk','doto','array','geist-pixel','fontlab','adaxi','departure-mono']) {
  await page.goto(`http://localhost:4560/?schrift=${f}&auftritt=aus`, { waitUntil: 'load' }); await page.waitForTimeout(900);
  const r = await page.evaluate(() => { const out = {}; const h1 = document.querySelector('.hero h1'); const cs = getComputedStyle(h1); const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;width:1ch;font:inherit'; h1.append(probe); out.ch = +(probe.getBoundingClientRect().width / parseFloat(cs.fontSize)).toFixed(3); probe.remove(); out.h1w = Math.round(h1.getBoundingClientRect().width); out.h1h = Math.round(h1.getBoundingClientRect().height); out.fs = cs.fontSize; out.h2 = [...document.querySelectorAll('h2:not(.footer-heading)')].slice(0, 9).map(h => Math.round(h.getBoundingClientRect().height) + '/' + Math.round(h.scrollWidth)); return out; });
  console.log(f.padEnd(16), JSON.stringify(r));
}
await browser.close();
