// Ladeprüfung am Build (docs/himmel.md → Performance): npm run build && npm run perf:start [-- <basis-url>]
// Ohne URL liefert das Skript dist/ selbst aus. Je Seite Handy-Profil (412 × 823, Pixeldichte 1,75, CPU 4×):
//  1. Das LCP-Element ist Standbild oder Überschrift, nie das Hero-Video (dessen erstes Einzelbild käme erst nach dem Laden
//     der Videodatei; Lighthouse mobil maß dafür 3,7 statt 2,1 s).
//  2. Vor dem LCP startet kein Request für Schwarm, Show-Folge oder (außer auf der Preisseite) Katalog-Formationen.
//  3. Durchscrollen der Startseite erzeugt höchstens 0,1 CLS (das mitwandernde Canvas erzeugte vorher 5–8).
//  4. An keiner Section-Grenze der Startseite ruckelt es (Frames, Long Tasks; siehe unten und tools/himmel/grenzen.mjs).
// Zeiten unter Last schwanken; geprüft wird die Struktur. Die Lighthouse-Werte stehen in docs/himmel.md.
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { measure, serveDist, table } from './grenzen.mjs';

const PAGES = ['/', '/drohnenshow-werbung/', '/drohnenshow-preise/'];
// Was erst nach dem ersten Bild laden darf. Die Preisseite lädt ihren Konfigurator (eigene Szenen und Katalogdaten) bewusst
// früh; dort zählt nur der Himmel.
const LATE = /\/(schwarm|folge)\.[\w-]+\.js$|\/media\/himmel\//, LATE_SHOW = /\/(scenes|show-scenes)\.[\w-]+\.js$|\/media\/katalog\//;
const lateRe = (path) => (path === '/drohnenshow-preise/' ? LATE.source : `${LATE.source}|${LATE_SHOW.source}`);
// Eigener kleiner Server für dist/ (astro preview läuft je Projekt nur einmal), mit Range-Anfragen fürs Video
let base = process.argv[2], server;
if (!base) { server = await serveDist(fileURLToPath(new URL('../../dist/', import.meta.url))); base = server.base; }
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
}
// 4. Section-Grenzen der Startseite (Runde 5, Marc: „beim Wechsel von einer Section zur nächsten … mega kacke“): zeitgesteuert
//    durchscrollen, Chromium mit GPU, CPU 4×, 1440 px. Je Grenze höchstens ein ausgelassener Frame (rAF ≤ 34 ms bei 60 Hz;
//    33,4 ms = genau ein Frame zu spät), p95 im Takt, keine Long Tasks > 50 ms. WebKit (Safari) lässt sich nicht drosseln und
//    schwankt mit der Last der Maschine; dessen Messung steht in docs/himmel.md (node tools/himmel/grenzen.mjs --engines webkit).
try {
  const rows = (await measure(base, { engines: ['chromium'], widths: [1440], runs: 1, cpu: 4 })).filter((r) => r.kind === 'Grenze');
  console.log('\n' + table(rows));
  for (const r of rows) {
    if (r.max > 34 || r.p95 > 17.5) fail.push(`Grenze ${r.key}: Frames p95 ${r.p95} / max ${r.max} ms (Budget p95 17,5 / max 34 ms)`);
    if (r.lt) fail.push(`Grenze ${r.key}: ${r.lt} Long Tasks > 50 ms (längster ${Math.round(r.ltMax)} ms)`);
  }
} finally { server?.close(); }
if (fail.length) { console.error('\n' + fail.join('\n')); process.exitCode = 1; } else console.log('\nLadeprüfung bestanden.');
