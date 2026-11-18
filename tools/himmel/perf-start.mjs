// Ladeprüfung am Build (docs/himmel.md → Performance): npm run build && npm run perf:start [-- <basis-url>]
// Ohne URL liefert das Skript dist/ selbst aus. Je Seite Handy-Profil (412 × 823, Pixeldichte 1,75, CPU 4×):
//  1. Das LCP-Element ist Standbild oder Überschrift, nie das Hero-Video (dessen erstes Einzelbild käme erst nach dem Laden
//     der Videodatei; Lighthouse mobil maß dafür 3,7 statt 2,1 s).
//  2. Vor dem LCP startet kein Request für Schwarm, Show-Folge oder (außer auf der Preisseite) Katalog-Formationen.
//  3. Durchscrollen der Startseite erzeugt höchstens 0,1 CLS (das mitwandernde Canvas erzeugte vorher 5–8).
// Zeiten unter Last schwanken; geprüft wird die Struktur. Die Lighthouse-Werte stehen in docs/himmel.md.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PAGES = ['/', '/drohnenshow-werbung/', '/drohnenshow-preise/'];
// Was erst nach dem ersten Bild laden darf. Die Preisseite lädt ihren Konfigurator (eigene Szenen und Katalogdaten) bewusst
// früh; dort zählt nur der Himmel.
const LATE = /\/(schwarm|folge)\.[\w-]+\.js$|\/media\/himmel\//, LATE_SHOW = /\/(scenes|show-scenes)\.[\w-]+\.js$|\/media\/katalog\//;
const lateRe = (path) => (path === '/drohnenshow-preise/' ? LATE.source : `${LATE.source}|${LATE_SHOW.source}`);
// Eigener kleiner Server für dist/ (astro preview läuft je Projekt nur einmal), mit Range-Anfragen fürs Video
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml' };
function serve(req, res) {
  let file = join(DIST, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  const size = statSync(file).size, type = TYPES[extname(file)] ?? 'application/octet-stream', range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? +range[1] : size - +range[2], end = range[1] && range[2] ? +range[2] : size - 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
  } else { res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size }); createReadStream(file).pipe(res); }
}
let base = process.argv[2], server;
if (!base) {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/ fehlt: vorher npm run build');
  server = createServer(serve);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
}
const fail = [];
const browser = await chromium.launch();
try {
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__lcp = []; window.__cls = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: e.startTime, tag: e.element?.tagName ?? '?', url: e.url }))).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(base + path, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    const { lcp, late } = await page.evaluate((re) => ({
      lcp: window.__lcp,
      late: performance.getEntriesByType('resource').filter((r) => new RegExp(re).test(r.name)).map((r) => ({ name: r.name.replace(location.origin, ''), t: r.startTime })),
    }), lateRe(path));
    const last = lcp.at(-1);
    const tags = lcp.map((e) => e.tag).join(' → ');
    if (!last) fail.push(`${path}: kein LCP-Eintrag`);
    else {
      if (lcp.some((e) => e.tag === 'VIDEO')) fail.push(`${path}: Hero-Video wird LCP-Element (${tags})`);
      const early = late.filter((r) => r.t < last.t);
      if (early.length) fail.push(`${path}: vor dem LCP (${Math.round(last.t)} ms) geladen: ${early.map((r) => r.name).join(', ')}`);
    }
    let cls = 0;
    if (path === '/') {
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 300) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(120); }
      await page.waitForTimeout(600);
      cls = await page.evaluate(() => window.__cls);
      if (cls > 0.1) fail.push(`${path}: CLS beim Durchscrollen ${cls.toFixed(3)} (Budget 0,1)`);
    }
    console.log(`${path.padEnd(22)} LCP ${last ? Math.round(last.t) + ' ms ' + last.tag : '–'} (${tags})  später geladen: ${late.length}${path === '/' ? `  CLS Scroll ${cls.toFixed(3)}` : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server?.close();
}
if (fail.length) { console.error('\n' + fail.join('\n')); process.exitCode = 1; } else console.log('\nLadeprüfung bestanden.');
