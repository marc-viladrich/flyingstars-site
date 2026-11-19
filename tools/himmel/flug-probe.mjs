// Schleife v2: Schleicht zum Formular (90 px, dann stehen). Je Halt: endete die Zeichenschleife auf einem FLUG-Frame
// (gedimmte Lichter), obwohl niemand scrollt? Dann wartet der Flug auf das nächste Scroll-Ereignis: entweder hängen die
// Lichter sichtbar in der Luft (sichtbar ≥ 5) oder sie springen beim Weiterscrollen. Ausgeführte Frames erkennt die
// Schleife an clear() (clearRect auf der Schwarm-Fläche), gezeichnete an drawImage.
// Aufruf gegen einen Build: npx astro build --outDir /tmp/x && python3 -m http.server 4805 -d /tmp/x, dann
// node tools/himmel/flug-probe.mjs <chromium|webkit> <pfad> [basis-url]   exit 1 = rot (Runde 8, Marc: Drohnen „bleiben hängen“)
import { chromium, webkit } from 'playwright';
const [eng = 'chromium', path = '/', base = 'http://127.0.0.1:4805'] = process.argv.slice(2);
const b = await (eng === 'webkit' ? webkit : chromium).launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  const w = window; w.__X = []; let cur = null; // je ausgeführtem Frame: Zeit, Lichter (y Seite, alpha)
  const hm = (cv) => cv.parentElement?.classList.contains('hm-layer') && !cv.classList.contains('hm-folge');
  const open = () => { if (!cur) { cur = { t: performance.now(), d: [] }; w.__X.push(cur); queueMicrotask(() => { cur = null; }); } return cur; };
  const cr = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function (...a) { if (hm(this.canvas)) open(); return cr.apply(this, a); };
  const di = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, x, y, ...rest) {
    if (hm(this.canvas) && rest.length === 0) { const r = this.canvas.getBoundingClientRect(), k = r.width / this.canvas.width; open().d.push([r.top + scrollY + (y + img.height / 2) * k, this.globalAlpha]); }
    return di.call(this, img, x, y, ...rest);
  };
});
const p = await ctx.newPage();
if (eng === 'chromium') { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(1200);
const formTop = await p.evaluate(() => document.querySelector('#inquiry-form').getBoundingClientRect().top + scrollY);
const start = Math.round(formTop - 900 * 3.2), end = Math.round(formTop - 100);
for (let y = 0; y < start; y += 450) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(60); }
await p.evaluate((v) => scrollTo(0, v), start); await p.waitForTimeout(1500);
let waits = 0, visible = 0;
for (let y = start; y <= end; y += 90) {
  await p.evaluate((v) => scrollTo(0, v), y);
  const t1 = await p.evaluate(() => performance.now());
  await p.waitForTimeout(700);
  const r = await p.evaluate((t1) => {
    const X = window.__X, last = X.at(-1); if (!last) return null;
    const ran = X.filter((f) => f.t > t1 + 150).length, dim = last.d.length ? last.d.reduce((s, q) => s + q[1], 0) / last.d.length : 1;
    const inView = last.d.filter(([yy]) => yy >= scrollY && yy <= scrollY + innerHeight).length;
    return { ran, dim: +dim.toFixed(2), n: last.d.length, inView };
  }, t1);
  if (!r) continue;
  const waiting = r.ran === 0 && r.n > 0 && r.dim < 0.5; // Schleife endete auf einem Flug-Frame
  if (waiting) { waits++; if (r.inView >= 5) visible++; console.log(`  Halt bei Formular ${Math.round(formTop - (y + 900))} px unter Bildrand: Flug wartet auf Scrollen, ${r.n} gedimmte Lichter, davon ${r.inView} sichtbar`); }
}
console.log(`${eng} ${path}: Flug wartet auf Scrollen an ${waits} Halten, davon ${visible} mit sichtbar hängenden Lichtern`);
await b.close();
process.exitCode = waits ? 1 : 0;
