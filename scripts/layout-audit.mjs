// Layout-Prüfung über alle Seiten (Marc, 02.11.2026: „Mich nervt es, dass ich dir diese Inconsistencies erklären muss“).
// Findet die Fehlerklassen, die er bisher von Hand gemeldet hat, automatisch:
//   orphan    Absatz oder Überschrift, deren letzte Zeile aus einem einzigen Wort besteht und kürzer als 40 % der
//             längsten Zeile ist (ein langes Einzelwort wie „Einstiegspreise.“ in einer Überschrift ist kein Hurenkind)
//   contain   sichtbarer Inhalt (Text, Bild, Video, Knopf) außerhalb der Content-Breite. Erlaubt sind nur Bereiche mit
//             [data-bleed] (z. B. das Showreel rechts im Seitenkopf) und alles, was als Fläche hinter dem Inhalt liegt
//   empty-h   Überschrift ohne Text (z. B. Daten aus einem veralteten Zwischenspeicher)
//   overflow  Seite scrollt seitlich
// Aufruf: node scripts/layout-audit.mjs [basis-url] [--start=/en/] [--widths=390,1440,1920] [--only=orphan,contain] [--browser=webkit]
// Ohne Basis-URL: http://127.0.0.1:4391. Die Seiten kommen aus den Links der Startseite und des Footers (Crawl, max. 200; --start begrenzt auf diesen Pfadpräfix).
import { chromium, webkit } from 'playwright';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4391').replace(/\/$/, '');
// Optionaler Einstieg und Crawl-Bereich, etwa /en/ oder /nl/.
const startArg = args.find((a) => a.startsWith('--start='))?.slice(8) ?? '/';
if (!startArg.startsWith('/') || startArg.startsWith('//') || /[?#]/.test(startArg)) throw new Error('--start muss ein lokaler Pfad ohne Query/Hash sein');
const start = startArg.endsWith('/') ? startArg : startArg + '/';
const widths = (args.find((a) => a.startsWith('--widths='))?.slice(9) ?? '390,1440,1920').split(',').map(Number);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const want = (k) => !only || only.includes(k);
const engine = args.find((a) => a.startsWith('--browser='))?.slice(10) === 'webkit' ? webkit : chromium;

const browser = await engine.launch();
// Dev-Server baut Seiten beim ersten Aufruf; ein abgebrochener Aufruf wird einmal wiederholt
const go = async (url, waitUntil) => { try { return await page.goto(url, { waitUntil }); } catch { await page.waitForTimeout(800); return page.goto(url, { waitUntil }); } };
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

// Seiten einsammeln
const seen = new Set([start]);
const queue = [start];
while (queue.length && seen.size < 200) {
  const path = queue.shift();
  await go(base + path, 'domcontentloaded');
  const links = await page.$$eval('a[href^="/"]', (as) => as.map((a) => new URL(a.href).pathname));
  for (const l of links) if (l.startsWith(start) && !seen.has(l) && !/\.(pdf|jpe?g|png|mp4|svg|webp|xml)$/.test(l) && !l.startsWith('/poc') && !l.startsWith('/api')) { seen.add(l); queue.push(l); }
}
const paths = [...seen].sort();

const findings = [];
for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of paths) {
    const res = await go(base + path, 'load');
    if (!res || res.status() >= 400) continue;
    // Redirect-Seiten (meta refresh) überspringen
    if (await page.$('meta[http-equiv="refresh"]')) continue;
    await page.evaluate(() => document.fonts.ready);
    const out = await page.evaluate(({ checks }) => {
      const r = [];
      const vw = document.documentElement.clientWidth;
      const name = (el) => {
        const id = el.closest('[id]')?.id;
        const cls = typeof el.className === 'string' ? el.className.split(' ').filter((c) => c && !c.startsWith('astro-')).slice(0, 2).join('.') : '';
        return `${id ? '#' + id + ' ' : ''}${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
      };
      const shown = (el) => {
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && !el.closest('[hidden],[inert],.sr-only,dialog:not([open]),[aria-hidden="true"]');
      };
      if (checks.includes('overflow') && document.documentElement.scrollWidth > vw + 1) r.push({ k: 'overflow', what: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });
      if (checks.includes('empty-h')) for (const h of document.querySelectorAll('h1,h2,h3,h4')) if (!h.textContent.trim() && !h.querySelector('img,svg[aria-label]')) r.push({ k: 'empty-h', what: name(h) });
      if (checks.includes('orphan')) {
        for (const el of document.querySelectorAll('main :is(p,h1,h2,h3,h4,li,dd,figcaption,blockquote,.lead)')) {
          if (!shown(el) || el.closest('nav,table,.chips,[data-no-orphan-check]')) continue;
          // nur Blöcke, die selbst Text tragen (keine Container voller Kinderblöcke)
          if (el.querySelector('p,div,ul,ol,h1,h2,h3,h4')) continue;
          // Flex/Grid-Inhalte (Icon + Text, Ziffernklappen) sind kein fließender Text
          if (/flex|grid/.test(getComputedStyle(el).display)) continue;
          // harte Umbrüche (<br>) und Blockkinder (z. B. das wechselnde Wort im Hero) setzen die letzte Zeile bewusst
          if (el.querySelector('br') || [...el.children].some((c) => /block|flex|grid/.test(getComputedStyle(c).display))) continue;
          const range = document.createRange();
          range.selectNodeContents(el);
          const rects = [...range.getClientRects()].filter((x) => x.width > 0.5);
          if (!rects.length) continue;
          // Zeilen nach Oberkante gruppieren
          const lines = [];
          // gleiche Zeile = Rechtecke überlappen senkrecht (große Ziffer und kleine Einheit liegen auf einer Grundlinie)
          for (const x of rects) { const cy = (x.top + x.bottom) / 2; const l = lines.find((y) => cy > y.top && cy < y.bottom); if (l) { l.left = Math.min(l.left, x.left); l.right = Math.max(l.right, x.right); l.top = Math.min(l.top, x.top); l.bottom = Math.max(l.bottom, x.bottom); } else lines.push({ top: x.top, bottom: x.bottom, left: x.left, right: x.right }); }
          if (lines.length < 2) continue;
          lines.sort((a, b) => a.top - b.top);
          // Wörter der letzten Zeile zählen
          const last = lines[lines.length - 1];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let words = 0;
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const re = /\S+/g; let m;
            while ((m = re.exec(n.data))) {
              const wr = document.createRange(); wr.setStart(n, m.index); wr.setEnd(n, m.index + m[0].length);
              const b = [...wr.getClientRects()].pop();
              if (b && (b.top + b.bottom) / 2 > last.top && (b.top + b.bottom) / 2 < last.bottom) words++;
            }
          }
          const widest = Math.max(...lines.map((l) => l.right - l.left));
          if (words === 1 && last.right - last.left < widest * 0.4) r.push({ k: 'orphan', what: `${name(el)}: „…${el.textContent.trim().split(/\s+/).slice(-3).join(' ')}“` });
        }
      }
      if (checks.includes('contain')) {
        const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 20;
        const max = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--content-max')) || 1792;
        const gutter = Math.max(pad, (vw - max) / 2);
        const seenEl = new Set();
        for (const el of document.querySelectorAll('main :is(h1,h2,h3,h4,p,li,dt,dd,img,video,canvas,button,a.btn,a.link,table,figure,label,span.mono,.kicker)')) {
          if (!shown(el) || el.closest('[data-bleed],.table-wrap,.marquee,[data-marquee],.logos-track') ) continue;
          // sichtbarer Teil: an jedem Vorfahren mit overflow ≠ visible abgeschnitten (Karussells, Laufbänder)
          const r0 = el.getBoundingClientRect();
          const b = { left: r0.left, right: r0.right };
          for (let p = el.parentElement; p; p = p.parentElement) {
            if (getComputedStyle(p).overflowX !== 'visible') { const pb = p.getBoundingClientRect(); b.left = Math.max(b.left, pb.left); b.right = Math.min(b.right, pb.right); }
          }
          if (b.right - b.left < 1) continue;
          const out = b.left < gutter - 2 || b.right > vw - gutter + 2;
          if (!out) continue;
          // nur den äußersten Verursacher melden
          let top = el; for (let p = el.parentElement; p && p.tagName !== 'MAIN'; p = p.parentElement) { const pb = p.getBoundingClientRect(); if (pb.left < gutter - 2 || pb.right > vw - gutter + 2) { if (shown(p) && p.matches('h1,h2,h3,h4,p,li,figure,img,video,canvas,button,a.btn,label,table')) top = p; } }
          if (seenEl.has(top)) continue; seenEl.add(top);
          r.push({ k: 'contain', what: `${name(top)} ${Math.round(b.left)}–${Math.round(b.right)} (Inhalt ${Math.round(gutter)}–${Math.round(vw - gutter)})` });
        }
      }
      return r;
    }, { checks: ['orphan', 'contain', 'empty-h', 'overflow'].filter(want) });
    for (const f of out) findings.push({ width, path, ...f });
  }
}
await browser.close();

const byKind = {};
for (const f of findings) (byKind[f.k] ??= []).push(f);
for (const [k, list] of Object.entries(byKind)) {
  console.log(`\n## ${k} (${list.length})`);
  for (const f of list) console.log(`${String(f.width).padStart(4)}  ${f.path}  ${f.what}`);
}
console.log(`\n${paths.length} Seiten × ${widths.length} Breiten, ${findings.length} Befunde`);
process.exitCode = findings.length ? 1 : 0;
