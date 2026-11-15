// Bildfolge eines Auftritts: node tools/labor/frames.mjs <url> <out-prefix> <selector> [engine] [ms,ms,…]
import { chromium, webkit } from '@playwright/test';
const [url, out, sel, engine = 'chromium', times = '0,250,500,800,1200,2200'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1500);
const el = page.locator(sel).first();
const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; });
await page.evaluate((y) => scrollTo({ top: Math.max(0, y - 200), behavior: 'instant' }), box.y);
// Auftritt neu starten und in festen Abständen aufnehmen
await page.evaluate((s) => { const h = document.querySelector(s); h.classList.remove('lab-in'); void h.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('lab-in'))); }, sel);
let last = 0; const shots = [];
for (const t of times.split(',').map(Number)) { await page.waitForTimeout(Math.max(0, t - last)); last = t; const p = `${out}-${String(t).padStart(4, '0')}.png`; await el.screenshot({ path: p }); shots.push(p); }
console.log(shots.join('\n')); await browser.close();
