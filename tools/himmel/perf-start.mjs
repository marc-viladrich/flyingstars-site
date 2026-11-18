// Ladeprüfung am Build (docs/himmel.md → Performance): npm run build && npm run perf:start [-- <basis-url>]
// Ohne URL liefert das Skript dist/ selbst aus. Je Seite Handy-Profil (412 × 823, Pixeldichte 1,75, CPU 4×):
//  1. Das LCP-Element ist Standbild oder Überschrift, nie das Hero-Video (dessen erstes Einzelbild käme erst nach dem Laden
//     der Videodatei; Lighthouse mobil maß dafür 3,7 statt 2,1 s).
//  2. Vor dem LCP startet kein Request für Schwarm, Show-Folge oder (außer auf der Preisseite) Katalog-Formationen.
//  3. Durchscrollen der Startseite erzeugt höchstens 0,1 CLS (das mitwandernde Canvas erzeugte vorher 5–8).
//  4. An keiner Section-Grenze der Startseite ruckelt es (Frames, Long Tasks; siehe unten und tools/himmel/grenzen.mjs).
//  5. Punktübergänge an jeder Farbgrenze, ohne Trennlinie (tools/himmel/uebergaenge-pruefen.mjs).
//  6. Gemeinsames mobiles Budget für Start- und Preisseite (Audit P3, 18.11.2026): LCP im Profil oben und das
//     blockierende CSS (Stylesheets im Kopf plus alle eingebetteten Styles), roh und Brotli-komprimiert wie beim Hosting.
// Zeiten unter Last schwanken; geprüft wird die Struktur. Die Lighthouse-Werte stehen in docs/himmel.md.
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { measure, serveDist, table } from './grenzen.mjs';
import { check as checkTransitions } from './uebergaenge-pruefen.mjs';
import { brotliCompressSync, constants as zlib } from 'node:zlib';

// 6. Budget, gemessen am 18.11.2026 (Brotli Stufe 5 je Datei): vor dem CSS-Zuschnitt je Route Start 209 kB roh / 39,6 kB
//    Brotli, Preise 234 / 44,1; danach Start 156 / 31,4, Preise 147 / 29,7. Gleiches Budget für beide Routen mit rund
//    5 % Luft; wer es reißen muss, begründet das hier. LCP-Budget = „gut“ nach Core Web Vitals.
const BUDGET = { routes: ['/', '/drohnenshow-preise/'], lcpMs: 2500, cssRaw: 165_000, cssBrotli: 33_000 };
const brotli = (text) => brotliCompressSync(Buffer.from(text), { params: { [zlib.BROTLI_PARAM_QUALITY]: 5 } }).length;
/** Render-blockierendes CSS einer Seite: verlinkte Stylesheets im Kopf ohne media=print und alle eingebetteten <style>. */
async function blockingCss(base, path) {
  const html = await (await fetch(base + path)).text();
  const head = html.slice(0, html.indexOf('</head>'));
  const hrefs = [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((m) => m[0]).filter((tag) => !/media="print"/.test(tag)).map((tag) => tag.match(/href="([^"]+)"/)[1]);
  const sheets = await Promise.all(hrefs.map(async (href) => (await fetch(new URL(href, base + path))).text()));
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const all = [...sheets, ...inline];
  return { files: hrefs.length, raw: all.reduce((n, css) => n + Buffer.byteLength(css), 0), br: all.reduce((n, css) => n + brotli(css), 0) };
}

const UEBERGANG_SEITEN = ['/', '/drohnenshow-preise/', '/faq/', '/ueber-uns/', '/nfl-berlin-game/', '/drohnenshow-indoor/'];

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
    else if (BUDGET.routes.includes(path) && last.t > BUDGET.lcpMs) fail.push(`${path}: LCP ${Math.round(last.t)} ms (Budget ${BUDGET.lcpMs} ms)`);
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
  for (const path of BUDGET.routes) {
    const css = await blockingCss(base, path);
    console.log(`${path.padEnd(22)} blockierendes CSS ${css.files} Dateien, ${(css.raw / 1000).toFixed(1)} kB roh / ${(css.br / 1000).toFixed(1)} kB Brotli`);
    if (css.raw > BUDGET.cssRaw) fail.push(`${path}: blockierendes CSS ${css.raw} B roh (Budget ${BUDGET.cssRaw})`);
    if (css.br > BUDGET.cssBrotli) fail.push(`${path}: blockierendes CSS ${css.br} B Brotli (Budget ${BUDGET.cssBrotli})`);
  }
} finally {
  await browser.close();
}
// 4. Section-Grenzen der Startseite (Runde 5, Marc: „beim Wechsel von einer Section zur nächsten … mega kacke“): zeitgesteuert
//    durchscrollen, Chromium mit GPU, CPU 4×, 1440 px. Je Grenze höchstens ein ausgelassener Frame (rAF ≤ 34 ms bei 60 Hz;
//    33,4 ms = genau ein Frame zu spät), p95 im Takt, keine Long Tasks > 50 ms. WebKit (Safari) lässt sich nicht drosseln und
//    schwankt mit der Last der Maschine; dessen Messung steht in docs/himmel.md (node tools/himmel/grenzen.mjs --engines webkit).
try {
  // drei Läufe, je Grenze der Median: Ein einzelner Ausreißer durch andere Prozesse auf der Maschine ist kein Ruckeln der Seite
  const rows = (await measure(base, { engines: ['chromium'], widths: [1440], runs: 3, cpu: 4 })).filter((r) => r.kind === 'Grenze');
  console.log('\n' + table(rows));
  for (const r of rows) {
    if (r.max > 34 || r.p95 > 17.5) fail.push(`Grenze ${r.key}: Frames p95 ${r.p95} / max ${r.max} ms (Budget p95 17,5 / max 34 ms)`);
    if (r.lt) fail.push(`Grenze ${r.key}: ${r.lt} Long Tasks > 50 ms (längster ${Math.round(r.ltMax)} ms)`);
  }
  // 5. Punktübergänge (Runde 6): jede Farbgrenze mit Punkten, ohne Trennlinie, Band über keinem Inhalt. Hier sechs typische
  //    Seiten bei 390 und 1440 px; alle Seiten: npm run check:uebergaenge
  for (const width of [390, 1440]) for (const g of await checkTransitions(base, UEBERGANG_SEITEN, { width })) {
    if (g.missing) fail.push(`${g.path} ${width} px: ${g.a} → ${g.b} ohne Punktübergang`);
    if (g.lined) fail.push(`${g.path} ${width} px: ${g.a} → ${g.b} mit Trennlinie (${g.line})`);
    if (g.hides) fail.push(`${g.path} ${width} px: Band ${g.a} → ${g.b} überdeckt ${g.covered.join(', ')}`);
  }
  console.log(`Punktübergänge: ${UEBERGANG_SEITEN.length} Seiten bei 390 und 1440 px geprüft`);
} finally { server?.close(); }
if (fail.length) { console.error('\n' + fail.join('\n')); process.exitCode = 1; } else console.log('\nLadeprüfung bestanden.');
