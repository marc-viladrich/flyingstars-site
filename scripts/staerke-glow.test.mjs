// Runde 7 und 9 (Marc, 19.11.2026): kein Schein an Überschriften, Verlaufsworte gewinnen stattdessen an Schriftstärke; Fallstudien-
// Konturzeile nur als direktes Kind (die frühere Buchstaben-Zerlegung machte jeden zweiten Buchstaben zur Kontur).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('kein Glow und kein Lichtlauf an Überschriften', () => {
  assert.equal(existsSync(new URL('../src/scripts/himmel/lichtlauf.ts', import.meta.url)), false);
  const css = read('src/styles/himmel.css');
  assert.doesNotMatch(css, /text-shadow|hm-licht|hm-lauf/);
  assert.doesNotMatch(read('src/scripts/himmel/index.ts'), /lichtlauf/);
  for (const f of ['src/styles/global.css', 'src/styles/case.css']) assert.doesNotMatch(read(f), /(^|[^-])text-shadow\s*:/m, `${f}: text-shadow`);
});

test('Verlaufsworte: dünner Start nur mit Bewegung, Endstärke sonst sofort', () => {
  const css = read('src/styles/himmel.css');
  assert.match(css, /html\.reveal:not\(\.motion-paused\) :is\(h1, h2, h3\) \.grad:not\(\.st-an, \.st-bereit\),\s*html\.reveal:not\(\.motion-paused\) :is\(h1, h2, h3\) \.grad\.st-bereit:not\(\.st-an\) \.st-v \{ font-weight: 300; \}/);
  assert.match(css, /html\.motion-paused :is\(h1, h2, h3\) \.grad \.st-v \{ transition: none; \}/);
  // 300 ist die untere Grenze der Gewichtsachse der geladenen Schrift
  assert.match(read('src/styles/fonts.css'), /font-family: 'Space Grotesk';[\s\S]*?font-weight: 300 700;/);
});

// Runde 9 (Marc, 19.11.2026: „wenn die Schrift dicker wird, führt es zu einem Layout-Shift, ein, zwei Pixel“). Die Breite
// bestimmt eine unsichtbare Kopie in der Endstärke, nicht das sichtbare Wort. Browsermessung über alle Seiten mit Verlaufswort
// (Chromium und WebKit, 390/1440/1920): Nachbartext und Hüllen 0,000 px, Zeilenzahl unverändert.
test('Verlaufsworte: Breite steht vom ersten Bild an fest, ohne Zeichenabstands-Ausgleich', () => {
  const css = read('src/styles/himmel.css'), ts = read('src/scripts/himmel/staerke.ts');
  assert.match(css, /\.grad \.st-w \{ display: inline-block; \}/);
  assert.match(css, /\.grad \.st-w::before \{ content: attr\(data-t\); display: block; height: 0; overflow: hidden; visibility: hidden; white-space: nowrap; \}/);
  assert.match(css, /\.grad \.st-v \{ display: inline-block; width: 0; min-width: 100%; white-space: nowrap; \}/);
  // Grid-/Flex-Stapel sind Blöcke: Kopieren und innerText bekämen Leerraum vor ein folgendes Satzzeichen
  assert.doesNotMatch(css, /\.st-w[^{]*\{[^}]*display: inline-(grid|flex)/);
  for (const f of [css, ts]) assert.doesNotMatch(f, /--st-ls0|letter-spacing/);
  // Kopie nur als generierter Inhalt: kein zweites Textelement, das vorgelesen oder kopiert würde
  assert.match(ts, /w\.dataset\.t = part/);
  assert.doesNotMatch(ts, /st-k|aria-hidden/);
  // Im Editor-Build nie umbauen (sonst gerät die Hülle in gespeicherten Text)
  assert.match(ts, /el\.closest\('\[data-afe\]'\)/);
});

test('Verlaufsworte: der Verlauf malt je Wort, ausgerichtet am ganzen Begriff (WebKit malt clip: text nicht in inline-blocks)', () => {
  const css = read('src/styles/himmel.css'), ts = read('src/scripts/himmel/staerke.ts');
  assert.match(css, /\.grad\.st-bereit \{ background: none; \}/);
  assert.match(css, /\.grad\.st-bereit \.st-v \{[^}]*background: var\(--grad\) var\(--st-bx, 0\) 0 \/ var\(--st-bw, 100%\) 100% no-repeat, linear-gradient\(var\(--st-ink[^}]*background-clip: text;/);
  // Runde 14: Satzzeichen (.st-p) malt die zweite Ebene in Überschriftenfarbe, keine eigene Füllfarbe (Safari: schwarzes „?“)
  assert.doesNotMatch(ts, /text-fill-color/);
  assert.match(ts, /setProperty\('--st-ink', ink\)/);
  assert.match(ts, /setProperty\('--st-bw', `\$\{\(total \/ fs\)\.toFixed\(4\)\}em`\)/);
  // Malfläche über die Hülle hinaus: in CSS und Skript gleich; ob sie reicht, misst die Browserprüfung unten (Tinte)
  const pad = Number(ts.match(/const PAD = ([\d.]+);/)?.[1]);
  assert.ok(pad >= 0.2, `Malfläche ${pad} em`);
  assert.match(css, new RegExp(`box-sizing: content-box; padding-inline: ${pad}em; margin-inline: -${pad}em;`)); // border-box machte die Malfläche schmaler als das Wort
  assert.match(ts, /setProperty\('--st-bx', `\$\{\(PAD - offset \/ fs\)\.toFixed\(4\)\}em`\)/);
});

test('Verlaufsworte: später auslösen, dünn verharren, dann zuschnappen ohne Überschwingen (easeInExpo, Runde 14)', () => {
  const css = read('src/styles/himmel.css'), ts = read('src/scripts/himmel/staerke.ts');
  const m = css.match(/\.grad\.st-an \.st-v \{ transition: font-weight var\((--[\w-]+)\) cubic-bezier\(([^)]*)\) ([\d.]+)s; \}/);
  assert.ok(m, 'Übergang der Schriftstärke fehlt');
  const token = read('src/styles/global.css').match(new RegExp(`${m[1]}: ([\\d.]+)s;`));
  const [dur, curve, delay] = [Number(token?.[1]), m[2].split(',').map(Number), Number(m[3])];
  assert.ok(dur >= 0.6 && dur <= 1.2, `Dauer ${dur}s`);
  assert.ok(delay >= 0 && delay <= 0.3, `Verzögerung ${delay}s`);
  assert.ok(curve[1] >= 0 && curve[1] <= 1 && curve[3] >= 0 && curve[3] <= 1, 'Kurve schwingt über das Zielgewicht');
  assert.ok(curve[0] >= 0.5 && curve[2] >= 0.5, 'Kurve soll dünn verharren und dann beschleunigen (ease-in)');
  assert.match(css, /:is\(h1, h2, h3\) \.grad \{ font-weight: 700; \}/, 'Endstärke 700 (Marcs Labor-Wert)');
  const late = Number(ts.match(/const LATE = '0% 0% (-\d+)% 0%'/)?.[1]);
  assert.ok(late <= -35 && late >= -50, `Auslösung bei ${late} %`);
  assert.match(ts, /scrollHeight - 2/, 'Wörter am Seitenende füllen sich trotzdem');
});

test('Fallstudien: Konturzeile greift nur an der zweiten Titelzeile', () => {
  const css = read('src/styles/case.css');
  assert.doesNotMatch(css, /\.c-name span:nth-child\(2\)/);
  assert.match(css, /\.c-name > span:nth-child\(2\)/);
});

// ---------- Browserprüfung am Build (Runde 9) ----------
// STAERKE_DIST=<astro build --outDir …> node --test scripts/staerke-glow.test.mjs   (ohne die Variable übersprungen)
// Aufteilbar: STAERKE_ENGINES=chromium,webkit  STAERKE_WIDTHS=390,1440 (Standard: beide Engines, 390 und 1440 px).
// Alle Seiten mit Verlaufswort: (1) jedes Wort ist sichtbar (Farbprobe; WebKit malte background-clip: text nicht in
// inline-blocks), (2) keine Glyphe ragt über die Malfläche hinaus (Tinte gemessen, dünn und fett; Befund „Kein Rauch.“/
// „Alternative“), (3) keine Zeile beginnt mit einem Satzzeichen (zeichengenau, 320–1920 px; Befund „Feuerwerk / ,“),
// (4) jede Überschrift bricht um wie ohne Hülle (Höhe mit Hülle = Höhe nach Auflösen der Hüllen).
const DIST = process.env.STAERKE_DIST;
test('Browser: Verlaufsworte sichtbar, ohne Anschnitt, Satzzeichen kleben, Umbruch wie ohne Hülle', { skip: !DIST && 'STAERKE_DIST nicht gesetzt', timeout: 1_800_000 }, async () => {
  const { createServer } = await import('node:http');
  const { join, extname } = await import('node:path');
  const { readdirSync } = await import('node:fs');
  const pw = await import('@playwright/test');
  const sharp = (await import('sharp')).default;
  const engines = (process.env.STAERKE_ENGINES ?? 'chromium,webkit').split(',');
  const { appendFileSync } = await import('node:fs');
  const log = (m) => { if (process.env.STAERKE_LOG) appendFileSync(process.env.STAERKE_LOG, `${new Date().toISOString().slice(11, 19)} ${m}\n`); };
  const widths = (process.env.STAERKE_WIDTHS ?? '390,1440').split(',').map(Number);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  const server = createServer((req, res) => {
    let f = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (f.endsWith('/')) f += 'index.html';
    try { const body = readFileSync(join(DIST, f)); res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const pages = [];
  const walk = (dir, rel) => { for (const e of readdirSync(dir, { withFileTypes: true })) { if (e.isDirectory() && !['_astro', 'media', 'fonts', 'brand'].includes(e.name)) walk(join(dir, e.name), `${rel}${e.name}/`); else if (e.name === 'index.html' && /<h[123][^>]*>(?:(?!<\/h[123]>)[\s\S])*class="grad"/.test(readFileSync(join(dir, e.name), 'utf8'))) pages.push(rel); } };
  walk(DIST, '/');
  assert.ok(pages.length > 10, `nur ${pages.length} Seiten mit Verlaufswort gefunden`);
  if (process.env.STAERKE_PAGES) pages.splice(0, pages.length, ...process.env.STAERKE_PAGES.split(','));
  const problems = []; let words = 0;
  const COLORS = [[255, 40, 40], [40, 255, 40], [60, 120, 255]]; // je Wort abwechselnd, Nachbarwörter stören die Messung nicht
  const settle = 'html{scroll-behavior:auto!important}*{transition:none!important;animation:none!important}[data-reveal]{opacity:1!important;transform:none!important}';
  const PUNCT = /^[,.;:!?)»“]/;
  try {
    for (const name of engines) {
      const browser = await pw[name].launch();
      for (const width of widths) {
        const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage(); page.setDefaultTimeout(15000);
        for (const path of pages) {
          log(`${name} ${width} ${path} start`);
          await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => document.fonts.ready);
          await page.addStyleTag({ content: settle + '.grad .st-v{font-weight:inherit!important}' });
          // (4) Höhe je Überschrift (= Zeilenzahl): Endstärke mit Hülle gegen dieselbe Seite mit aufgelösten Hüllen. Nicht gegen
          // ohne JavaScript: Skripte ändern manche Köpfe auch selbst (Nachhaltigkeit)
          const hh = await page.evaluate(() => [...document.querySelectorAll(':is(h1,h2,h3)')].filter((h) => h.querySelector('.grad .st-w') && h.getClientRects().length).map((h) => {
            const before = h.getBoundingClientRect().height, html = h.innerHTML;
            h.querySelectorAll('.st-p').forEach((p) => { const g = p.closest('.grad'); g.after(p.textContent); p.remove(); });
            h.querySelectorAll('.st-w').forEach((w) => w.replaceWith(w.querySelector('.st-v').textContent)); h.querySelectorAll('.grad.st-bereit').forEach((g) => { g.classList.remove('st-bereit'); g.classList.add('st-an'); g.normalize(); }); // st-an: sonst greift die Dünn-Regel
            const after = h.getBoundingClientRect().height; h.innerHTML = html; return { t: h.textContent.trim().slice(0, 40), before, after }; }));
          for (const x of hh) if (Math.abs(x.before - x.after) > 1) problems.push(`${name} ${width} ${path}: „${x.t}“ ${x.before.toFixed(1)} px hoch statt ${x.after.toFixed(1)} (Umbruch geändert)`);
          const heads = await page.evaluate(() => [...document.querySelectorAll(':is(h1,h2,h3)')].filter((h) => h.querySelector('.grad .st-v') && h.getClientRects().length).length);
          for (let hi = 0; hi < heads; hi++) {
            // Überschrift ins Bild, Wörter in Fensterkoordinaten
            const ws = await page.evaluate((hi) => { const h = [...document.querySelectorAll(':is(h1,h2,h3)')].filter((h) => h.querySelector('.grad .st-v') && h.getClientRects().length)[hi]; h.scrollIntoView({ block: 'center' });
              return [...h.querySelectorAll('.grad .st-v')].map((v) => { const q = v.parentElement.getBoundingClientRect(), m = v.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, pl: m.left, pr: m.right, fs: parseFloat(getComputedStyle(v).fontSize), t: v.textContent }; }).filter((q) => q.w > 0 && q.y > -q.h && q.y < innerHeight); }, hi);
            if (!ws.length) continue;
            words += ws.length; log(`  h${hi}: ${ws.length} Wörter`);
            const clipOf = (w) => { const pad = w.fs * 0.6, x = Math.max(0, w.x - pad), y = Math.max(0, w.y - w.fs * 0.15); return { x, y, width: Math.min(width - x, w.w + 2 * pad), height: Math.min(900 - y, w.h + w.fs * 0.3) }; };
            const shoot = async (css, colorize) => {
              const tag = await page.addStyleTag({ content: css });
              if (colorize) await page.evaluate(([hi, C]) => { const h = [...document.querySelectorAll(':is(h1,h2,h3)')].filter((h) => h.querySelector('.grad .st-v') && h.getClientRects().length)[hi]; h.querySelectorAll('.grad .st-v').forEach((v, i) => { const c = `rgb(${C[i % 3].join(',')})`; v.style.setProperty('color', c, 'important'); v.style.setProperty('-webkit-text-fill-color', c, 'important'); }); }, [hi, COLORS]);
              const out = [];
              for (const w of ws) { const clip = clipOf(w); const buf = clip.width > 2 && clip.height > 2 ? await page.screenshot({ clip }).catch(() => null) : null; out.push(buf && { clip, ...(await sharp(buf).raw().toBuffer({ resolveWithObject: true })) }); }
              if (colorize) await page.evaluate(() => document.querySelectorAll('.grad .st-v').forEach((v) => { v.style.removeProperty('color'); v.style.removeProperty('-webkit-text-fill-color'); }));
              await tag.evaluate((n) => n.remove());
              return out;
            };
            // (2) Tinte gegen Malfläche (Box des sichtbaren Worts, soll Hülle ± PAD sein), dünn und in Endstärke
            const ink = [];
            for (const weight of ['300', 'inherit']) {
              const shots = await shoot(`body *{visibility:hidden!important}.grad .st-v{visibility:visible!important;background:none!important;font-weight:${weight}!important}`, true);
              shots.forEach((s, i) => {
                if (!s) return; const C = COLORS[i % 3], ch = C[0] > 200 ? 0 : C[1] > 200 ? 1 : 2, { data, info } = s, sx = info.width / s.clip.width;
                let minX = Infinity, maxX = -1, n = 0;
                for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const k = (y * info.width + x) * info.channels, v = data[k + ch]; let o = 0; for (let c = 0; c < 3; c++) if (c !== ch) o = Math.max(o, data[k + c]); if (v > 70 && v > o + 50) { n++; if (x < minX) minX = x; if (x > maxX) maxX = x; } }
                if (weight === 'inherit') ink[i] = n;
                if (!n) return;
                const w = ws[i], paintL = w.pl, paintR = w.pr, // Malfläche = echte Box des sichtbaren Worts
                  inkL = s.clip.x + minX / sx, inkR = s.clip.x + (maxX + 1) / sx;
                if (inkL < paintL - 0.5 || inkR > paintR + 0.5) problems.push(`${name} ${width} ${path}: „${w.t}“ (${weight}) Tinte ${inkL.toFixed(1)}–${inkR.toFixed(1)} außerhalb der Malfläche ${paintL.toFixed(1)}–${paintR.toFixed(1)}`);
              });
            }
            // (1) Sichtbarkeit mit dem echten Verlauf: farbige Pixel im Wort
            const shots = await shoot('body *{visibility:hidden!important}.grad,.grad *{visibility:visible!important}', false);
            shots.forEach((s, i) => {
              if (!s || !ink[i]) return; const { data, info } = s; let n = 0;
              for (let k = 0; k < data.length; k += info.channels) { const mx = Math.max(data[k], data[k + 1], data[k + 2]), mn = Math.min(data[k], data[k + 1], data[k + 2]); if (mx > 90 && mx - mn > 50) n++; }
              if (n < ink[i] * 0.3) problems.push(`${name} ${width} ${path}: „${ws[i].t}“ unsichtbar (${n} farbige Pixel bei ${ink[i]} Tintenpixeln)`);
            });
          }
        }
        // (3) Keine Zeile einer Überschrift mit Verlaufswort beginnt mit einem Satzzeichen (zeichengenau, einmal je Engine,
        // 320–1920 px; nur Seiten, auf denen ein Satzzeichen direkt am Verlaufswort steht)
        if (width === widths[0]) for (const path of pages) {
          await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => document.fonts.ready);
          if (!(await page.evaluate((src) => !!document.querySelector('.grad .st-p') || [...document.querySelectorAll(':is(h1,h2,h3) .grad')].some((g) => new RegExp(src).test(g.nextSibling?.textContent ?? '')), PUNCT.source))) continue;
          for (let w = 320; w <= 1920; w += 40) {
            await page.setViewportSize({ width: w, height: 900 });
            const bad = await page.evaluate((src) => { const out = [], re = new RegExp(src);
              for (const h of document.querySelectorAll(':is(h1,h2,h3)')) {
                if (!h.querySelector('.grad') || !h.getClientRects().length) continue;
                const first = new Map(); const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); const rg = document.createRange();
                for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (n.parentElement.closest('.sr-only')) continue; const t = n.textContent;
                  for (let i = 0; i < t.length; i++) { if (/[\s­⁠]/.test(t[i])) continue; rg.setStart(n, i); rg.setEnd(n, i + 1); const q = rg.getClientRects()[0]; if (!q || !q.width) continue;
                    const mid = q.top + q.height / 2; const key = [...first.keys()].find((k) => Math.abs(k - mid) < q.height / 3) ?? mid; const cur = first.get(key); if (!cur || q.left < cur.l) first.set(key, { l: q.left, c: t[i] }); } }
                for (const { c } of first.values()) if (re.test(c)) out.push(`${h.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)} → „${c}“`);
              }
              return out; }, PUNCT.source);
            for (const x of bad) problems.push(`${name} ${w} ${path}: Zeile beginnt mit Satzzeichen: ${x}`);
          }
          await page.setViewportSize({ width, height: 900 });
        }
        console.log(`# ${name} ${width}px: ${pages.length} Seiten, bisher ${words} Wörter, ${problems.length} Befunde`);
        await page.context().close();
      }
      await browser.close();
    }
  } finally { server.close(); }
  assert.deepEqual([...new Set(problems)].slice(0, 40), []);
});
