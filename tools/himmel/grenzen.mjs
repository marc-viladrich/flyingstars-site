// Ruckeln an Section-Grenzen messen (docs/himmel.md → Performance). Scrollt eine Seite zeitgesteuert mit fester
// Geschwindigkeit (600 px/s, wie ruhiges Lesen) von oben nach unten und ordnet jeden Frame (rAF-Abstand) und jeden Long Task
// der Section-Grenze zu, die gerade im Bild ist (bei mehreren: die der Bildmitte nächste); sonst der Section selbst.
//
//   node tools/himmel/grenzen.mjs [dist-ordner|url] [--engines chromium,webkit] [--widths 1440,1920] [--runs 3] [--cpu 4] [--path /]
//
// Pixeldichte 2, Chromium mit echter GPU (Metal). CPU-Drosselung gibt es nur in Chromium (CDP); WebKit läuft ungedrosselt und
// kennt keine Long Tasks und keinen Trace (dort „–“). Bildpause: Abstand zweier ausgegebener Frames mit neuem Hauptthread-Bild.
// Ausgabe je Grenze: Median über die Läufe von p50 / p95 / max der Frame-Abstände und die Long Tasks (Anzahl, längster).
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from '@playwright/test';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml' };

/** Statischer Server für einen dist-Ordner, mit Range-Anfragen fürs Video. Gibt { base, close } zurück. */
export async function serveDist(dist) {
  const root = resolve(dist) + '/';
  if (!existsSync(join(root, 'index.html'))) throw new Error(`${root} hat keine index.html: vorher npm run build`);
  const server = createServer((req, res) => {
    let file = join(root, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    const size = statSync(file).size, type = TYPES[extname(file)] ?? 'application/octet-stream', range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? +range[1] : size - +range[2], end = range[1] && range[2] ? +range[2] : size - 1;
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
    } else { res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size }); createReadStream(file).pipe(res); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

const pct = (v, q) => { if (!v.length) return 0; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const median = (v) => pct(v, 0.5);

/** Ein Durchlauf: liefert je Abschnitt (Grenze „a → b“ oder Section „a“) die Frame-Abstände und Long Tasks. */
async function run(browser, url, { width, height, cpu, speed = 600, block, css }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 }); // Retina wie Marcs Mac
  const page = await ctx.newPage();
  const throttled = browser.browserType().name() === 'chromium';
  // Diagnose: Requests sperren (--block <regex>) bzw. CSS einspielen (--css <regeln>), um einen Effekt einzeln abzuschalten
  if (block) await page.route((u) => new RegExp(block).test(u.href), (r) => r.abort());
  if (css) await page.addInitScript((c) => addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = c; document.head.append(st); }), css);
  if (throttled && cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  await page.addInitScript(() => {
    window.__lt = [];
    if (!PerformanceObserver.supportedEntryTypes?.includes('longtask')) { window.__lt = null; return; }
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(url, { waitUntil: 'load' });
  // Schwarm starten (erstes Scrollen) und einschwingen lassen
  await page.evaluate(() => scrollTo(0, 2)); await page.waitForTimeout(3500);
  if (throttled) await browser.startTracing(page, { categories: ['toplevel', 'benchmark', 'cc', 'devtools.timeline', 'disabled-by-default-devtools.timeline.frame'] });
  const data = await page.evaluate((speed) => new Promise((done) => {
    const mark = performance.now(); console.timeStamp('hm-grenzen');
    const els = [...document.querySelectorAll('main section[id], main #kundinnen, main .hm-zeile, body > footer, footer.footer')]
      .filter((el, i, a) => a.indexOf(el) === i && !el.parentElement.closest('main section[id]'));
    const tops = els.map((el) => ({ name: el.id || el.className.split(' ')[0], y: el.getBoundingClientRect().top + scrollY })).sort((a, b) => a.y - b.y);
    const H = document.documentElement.scrollHeight - innerHeight, frames = [];
    let t0 = 0, last = 0;
    const tick = (now) => {
      if (!t0) { t0 = now; last = now; }
      const y = Math.min(H, (now - t0) / 1000 * speed);
      // instant: die Seite hat html { scroll-behavior: smooth }. Chromium startete damit bei jedem scrollTo eine neue
      // weiche Bewegung und kam kaum vom Fleck (Ziel 6000 px, Ist 911 px; Messung 18.11.2026), die Frames wurden also
      // falschen Grenzen zugeordnet. WebKit folgte auch vorher.
      scrollTo({ top: y, behavior: 'instant' });
      frames.push([now, now - last, y]); last = now;
      if (y < H) requestAnimationFrame(tick); else done({ frames: frames.slice(1), tops, vh: innerHeight, lt: window.__lt, mark });
    };
    requestAnimationFrame(tick);
  }), speed);
  // Ausgegebene Frames laut Compositor (Chromium-Trace): vollständig, nur teilweise (Hauptthread zu spät) oder verworfen
  let shown = null, work = null;
  if (throttled) {
    const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
    const m = ev.find((e) => e.name === 'TimeStamp' && e.args?.data?.message === 'hm-grenzen');
    if (m) {
      const off = m.ts / 1000 - data.mark, rep = ev.filter((e) => e.name === 'PipelineReporter' && e.ph === 'b' && e.args?.frame_reporter);
      const host = Object.entries(rep.reduce((c, e) => { const k = e.args.frame_reporter.layer_tree_host_id; c[k] = (c[k] || 0) + 1; return c; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0];
      shown = rep.filter((e) => String(e.args.frame_reporter.layer_tree_host_id) === host).map((e) => [e.ts / 1000 - off, e.args.frame_reporter.state]).sort((a, b) => a[0] - b[0]);
      // Arbeitszeit im Renderer, unabhängig von der Last der Maschine: Tasks des Hauptthreads (dort setzt das Skript seine Marke)
      // und Rastern der Kacheln im selben Prozess
      const tasks = (e) => e.ph === 'X' && e.pid === m.pid && ((e.tid === m.tid && (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask')) || e.name === 'RasterTask');
      work = ev.filter(tasks).map((e) => [e.ts / 1000 - off, (e.dur ?? 0) / 1000, e.tid === m.tid ? 'main' : 'raster']);
    }
  }
  await ctx.close();
  const { frames, tops, vh, lt } = data;
  const label = (y) => {
    const inView = tops.slice(1).map((s, i) => ({ s, prev: tops[i] })).filter(({ s }) => s.y > y && s.y < y + vh);
    if (inView.length) { const b = inView.sort((a, c) => Math.abs(a.s.y - y - vh / 2) - Math.abs(c.s.y - y - vh / 2))[0]; return `${b.prev.name} → ${b.s.name}`; }
    return [...tops].reverse().find((s) => s.y <= y + vh / 2)?.name ?? 'oben';
  };
  const out = new Map(), at = (k) => { if (!out.has(k)) out.set(k, { dt: [], lt: [], drop: 0, part: 0, all: 0, gap: [], main: 0, raster: 0 }); return out.get(k); };
  for (const [, dt, y] of frames) at(label(y)).dt.push(dt);
  const yAt = (t) => (frames.find((q) => q[0] >= t) ?? frames.at(-1))[2];
  if (work) for (const [t, d, kind] of work) { if (t < frames[0][0] || t > frames.at(-1)[0]) continue; at(label(yAt(t)))[kind] += d; }
  if (shown) {
    let prev = null;
    for (const [t, state] of shown) {
      if (t < frames[0][0] || t > frames.at(-1)[0]) continue;
      const o = at(label(yAt(t)));
      // Bildpause = Abstand zwischen zwei ausgegebenen Frames mit neuem Hauptthread-Bild (Canvas, Scrollposition)
      if (state === 'STATE_DROPPED') o.drop++; else if (state === 'STATE_PRESENTED_PARTIAL') o.part++; else { o.all++; if (prev !== null) o.gap.push(t - prev); prev = t; }
    }
  }
  if (lt) for (const [t, d] of lt) {
    if (t < frames[0][0] || t > frames.at(-1)[0]) continue;
    at(label(yAt(t))).lt.push(d);
  }
  return { out, order: [...new Set(frames.map(([, , y]) => label(y)))], hasLt: !!lt, hasTrace: !!shown, hasWork: !!work };
}

/** Mehrere Läufe je Engine und Breite; Ergebnis je Abschnitt: Median der Läufe. */
export async function measure(base, { path = '/', engines = ['chromium'], widths = [1440], runs = 3, cpu = 4, block, css } = {}) {
  const rows = [];
  for (const name of engines) {
    // Echte GPU (Metal) statt Software-Rendering: sonst fehlen genau die Zeichen- und Compositing-Kosten
    const browser = await (name === 'webkit' ? webkit : chromium).launch(name === 'webkit' ? {} : { args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] });
    try {
      for (const width of widths) {
        const height = width >= 1900 ? 1080 : 900, res = [];
        for (let i = 0; i < runs; i++) res.push(await run(browser, base + path, { width, height, cpu, block, css }));
        for (const key of res[0].order) {
          const per = res.map((r) => r.out.get(key) ?? { dt: [], lt: [], drop: 0, part: 0, all: 0, gap: [], main: 0, raster: 0 });
          const m = (f) => Math.round(median(per.map((p) => f(p))) * 10) / 10;
          rows.push({ engine: name, width, cpu: name === 'chromium' ? cpu : 1, key, kind: key.includes('→') ? 'Grenze' : 'Section', n: m((p) => p.dt.length),
            p50: m((p) => pct(p.dt, 0.5)), p95: m((p) => pct(p.dt, 0.95)), max: m((p) => Math.max(0, ...p.dt)),
            lt: res[0].hasLt ? m((p) => p.lt.filter((d) => d > 50).length) : null, ltMax: res[0].hasLt ? m((p) => Math.max(0, ...p.lt)) : null,
            // Compositor: Anteil verworfener + unvollständiger Frames in %, längste Pause zwischen zwei ausgegebenen Frames
            bad: res[0].hasTrace ? m((p) => (100 * p.drop) / Math.max(1, p.drop + p.part + p.all)) : null,
            gap95: res[0].hasTrace ? m((p) => pct(p.gap, 0.95)) : null, gap: res[0].hasTrace ? m((p) => Math.max(0, ...p.gap)) : null,
            // Arbeit je Sekunde Scrollen in diesem Abschnitt (ms/s): Hauptthread und Rastern
            mainPs: res[0].hasWork ? m((p) => (1000 * p.main) / Math.max(1, p.dt.reduce((s, v) => s + v, 0))) : null,
            rasterPs: res[0].hasWork ? m((p) => (1000 * p.raster) / Math.max(1, p.dt.reduce((s, v) => s + v, 0))) : null });
        }
      }
    } finally { await browser.close(); }
  }
  return rows;
}

export function table(rows) {
  const lines = ['| Engine | Breite | Abschnitt | rAF p50 / p95 / max ms | Long Tasks >50 ms (längster) | verworfene Frames % | Bildpause p95 / max ms | Arbeit ms/s Hauptthread / Rastern |', '|---|---|---|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.engine}${r.cpu > 1 ? ` ${r.cpu}×` : ''} | ${r.width} | ${r.kind === 'Grenze' ? r.key : `(${r.key})`} | ${r.p50} / ${r.p95} / ${r.max} | ${r.lt === null ? '–' : `${r.lt} (${Math.round(r.ltMax)})`} | ${r.bad ?? '–'} | ${r.gap === null ? '–' : `${r.gap95} / ${r.gap}`} | ${r.mainPs === null ? '–' : `${Math.round(r.mainPs)} / ${Math.round(r.rasterPs)}`} |`);
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const target = args[0] && !args[0].startsWith('--') ? args[0] : fileURLToPath(new URL('../../dist/', import.meta.url));
  const srv = /^https?:/.test(target) ? null : await serveDist(target);
  try {
    const rows = await measure(srv ? srv.base : target.replace(/\/$/, ''), { path: opt('path', '/'), engines: opt('engines', 'chromium').split(','), widths: opt('widths', '1440').split(',').map(Number), runs: +opt('runs', 3), cpu: +opt('cpu', 4), block: opt('block'), css: opt('css') });
    console.log(table(rows));
    if (args.includes('--json')) console.log(JSON.stringify(rows));
  } finally { srv?.close(); }
}
