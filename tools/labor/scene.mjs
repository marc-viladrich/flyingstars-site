// Eine Stelle ansteuern und fotografieren: node tools/labor/scene.mjs <url> <out.png> <selector> [waitMs=4200] [engine] [w=1440] [h=900] [offset=120] [actions-json]
import { chromium, webkit } from '@playwright/test';
const [url, out, sel, wait = '4200', engine = 'chromium', w = '1440', h = '900', offset = '120', actions = '[]'] = process.argv.slice(2);
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1), reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()); }); page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(900);
// in Etappen scrollen wie ein Mensch, damit der Schwarm unterwegs seine Bühnen findet
const target = await page.evaluate(([s, o]) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + scrollY - o : 0; }, [sel, +offset]);
let y = 0; while (y < target) { y = Math.min(target, y + 420); await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); }
await page.waitForTimeout(+wait);
for (const a of JSON.parse(actions)) {
  if (a.hover) await page.hover(a.hover); if (a.click) await page.click(a.click); if (a.fill) await page.fill(a.fill[0], a.fill[1]); if (a.eval) await page.evaluate(a.eval); if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: a.shot });
}
await page.screenshot({ path: out });
await browser.close();
