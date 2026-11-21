// Bildzeiten des Lichtkegels der NRW-Karte (Runde 16): 3 s Mausbewegung über der Karte, rAF-Abstände im Browser.
// Aufruf: node tools/standort/measure-light.mjs <baseURL> <label> [outdir]  (Server muss laufen, z. B. astro preview)
import { chromium, webkit } from 'playwright';
const [base = 'http://127.0.0.1:4775', label = 'run', out = '.'] = process.argv.slice(2);
const stats = (d) => { const s = [...d].sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { frames: s.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +s.at(-1).toFixed(1), over33: s.filter((x) => x > 33.4).length, over50: s.filter((x) => x > 50).length }; };
for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: process.env.HEADED !== "1" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${base}/ueber-uns/`);
  const map = page.locator('#standort .loc-stage');
  await map.scrollIntoViewIfNeeded();
  await map.locator('img').evaluate((img) => img.decode());
  const b = await map.boundingBox();
  const at = (t) => ({ x: b.x + b.width * (0.5 + 0.32 * Math.cos(t * 2.1)), y: b.y + b.height * (0.5 + 0.3 * Math.sin(t * 3.3)) });
  for (const round of [0, 1]) {
    await page.mouse.move(at(0).x, at(0).y);
    await page.waitForTimeout(400);
    // __f: Abstände der rAF-Aufrufe; __r: Renderkosten je Bild = Zeit vom rAF bis zur ersten Nachricht danach (Style, Layout,
    // Malen laufen im selben Task nach den rAF-Rückrufen)
    await page.evaluate(() => { window.__f = []; window.__r = []; const ch = new MessageChannel(); let t1 = 0; ch.port1.onmessage = () => window.__r.push(performance.now() - t1);
      let last = performance.now(); const tick = (t) => { window.__f.push(t - last); last = t; t1 = performance.now(); ch.port2.postMessage(0); if (window.__run) requestAnimationFrame(tick); }; window.__run = true; requestAnimationFrame(tick); });
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) { const p = at((Date.now() - t0) / 1000); await page.mouse.move(p.x, p.y); }
    const [d, r] = await page.evaluate(() => { window.__run = false; return [window.__f.slice(2), window.__r.slice(2)]; });
    if (round === 1) {
      const rs = [...r].sort((a, c) => a - c);
      console.log(JSON.stringify({ label, browser: name, ...stats(d), renderMedian: +rs[rs.length >> 1].toFixed(2), renderP95: +rs[Math.floor(rs.length * 0.95)].toFixed(2), renderMax: +rs.at(-1).toFixed(2) }));
      await page.screenshot({ path: `${out}/${label}-${name}.png`, clip: { x: b.x, y: b.y, width: b.width, height: b.height } });
    }
  }
  // Ruhebild für den Pixelvergleich alt/neu: Licht steht still an einer festen Stelle
  await page.mouse.move(b.x + b.width * 0.62, b.y + b.height * 0.47);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${label}-${name}-still.png`, clip: { x: b.x, y: b.y, width: b.width, height: b.height } });
  await browser.close();
}
