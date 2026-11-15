// Sectionkante fotografieren (Ober- oder Unterkante): node tools/labor/kante.mjs <out.png> <selector> [top|bottom] [w=1440] [engine] [path=/]
import { chromium, webkit } from '@playwright/test';
const [out, sel, edge = 'top', w = '1440', engine = 'chromium', path = '/'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: +w, height: 900 }, deviceScaleFactor: +(process.env.DPR || 2) });
await page.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
await page.goto(`http://localhost:4560${path}?${process.env.Q || 'schrift=geist-pixel&einsatz=alles&himmel=aus&kante=punkte'}`, { waitUntil: 'load' }); await page.waitForTimeout(700);
const y = await page.evaluate(([s, e]) => { const r = document.querySelector(s).getBoundingClientRect(); const v = (e === 'top' ? r.top : r.bottom) + scrollY; scrollTo(0, v - 450); return v; }, [sel, edge]);
await page.waitForTimeout(900);
const sy = await page.evaluate(() => scrollY);
await page.screenshot({ path: out, clip: { x: 0, y: y - sy - 130, width: Math.min(+w, +(process.env.CW || 900)), height: 260 } });
await browser.close();
