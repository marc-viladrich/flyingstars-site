// Punktübergänge prüfen (docs/himmel.md → Punktübergänge): Jede Grenze zweier benachbarter Sections mit unterschiedlichem
// berechnetem Hintergrund braucht den Punktübergang und darf keine Trennlinie tragen.
//   node tools/himmel/uebergaenge-pruefen.mjs [dist-ordner] [--width 1440] [--pages /,/faq/] [--all]
// Ohne --pages: alle Seiten aus dist/ (deutsch, englisch, niederländisch). --all listet auch die Grenzen ohne Befund.
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { serveDist } from './grenzen.mjs';

/** Alle Seiten eines dist-Ordners als Pfade (/, /faq/, /en/…), ohne Weiterleitungen. */
export function pages(dist) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory() && !['_astro', 'media', 'fonts', 'brand'].includes(e.name)) walk(p);
      else if (e.name === 'index.html' && statSync(p).size > 2000) out.push('/' + relative(dist, dir).split('\\').join('/') + (dir === dist ? '' : '/'));
    }
  };
  walk(dist);
  return out.map((p) => p.replace(/^\/\//, '/')).sort();
}

/** Im Browser: Grenzen zwischen benachbarten Sections mit Farbe, Übergang und Linie. */
function inspect() {
  const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(.*,\s*0\)$|transparent/.test(c)) return c; } return 'rgb(0, 0, 0)'; };
  // Band vorhanden und nicht abgeschnitten: content-visibility/contain: paint der eigenen Section schneiden alles über ihren Rand ab
  const clips = (el) => { const s = getComputedStyle(el); return s.contentVisibility === 'auto' || s.contentVisibility === 'hidden' || /paint|strict|content/.test(s.contain) || s.overflowY !== 'visible'; };
  const mask = (el, pseudo) => { const s = getComputedStyle(el, pseudo); return s.content !== 'none' && /uebergang/.test(s.maskImage || s.webkitMaskImage || '') && !clips(el); };
  // sichtbarer Teil eines Elements: zugeschnitten auf Vorfahren mit overflow (zugeklappte Antworten, Leisten)
  const visible = (el, stop) => { const q = el.getBoundingClientRect(); let t = q.top, bt = q.bottom, l = Math.max(0, q.left), rt = Math.min(innerWidth, q.right); for (let u = el.parentElement; u && u !== stop.parentElement; u = u.parentElement) { const o = getComputedStyle(u); if (o.overflowY === 'visible' && o.overflowX === 'visible') continue; const c = u.getBoundingClientRect(); t = Math.max(t, c.top); bt = Math.min(bt, c.bottom); l = Math.max(l, c.left); rt = Math.min(rt, c.right); } return bt - t > 1 && rt - l > 1 ? { top: t, bottom: bt, width: rt - l, height: bt - t } : null; };
  const line = (el, side) => { const s = getComputedStyle(el); const w = parseFloat(s[`border${side}Width`]); const c = s[`border${side}Color`]; return w > 0 && s[`border${side}Style`] !== 'none' && !/rgba\(.*,\s*0\)$|transparent/.test(c) ? `${w}px ${c}` : null; };
  // Blöcke der Seite: Sections und Kopf-/Fußbereiche, die nicht in einer anderen Section liegen
  const all = [...document.querySelectorAll('main section, main > *, body > footer, footer.footer')].filter((el) => el.offsetHeight > 40 && !el.parentElement.closest('main section'));
  const blocks = [...new Set(all)].map((el) => ({ el, r: el.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top);
  const out = [];
  for (let i = 1; i < blocks.length; i++) {
    const a = blocks[i - 1], b = blocks[i];
    if (Math.abs(b.r.top - a.r.bottom) > 2) continue; // nur unmittelbar benachbarte Blöcke
    const ca = bg(a.el), cb = bg(b.el), name = (e) => e.id || e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.');
    // Das untere Band von a liegt unter b, sobald b positioniert ist und selbst eine Fläche malt; dann zählt nur das obere von b
    const sb = getComputedStyle(b.el), covers = sb.position !== 'static' && (!/rgba\(.*,\s*0\)$|transparent/.test(sb.backgroundColor) || sb.backgroundImage !== 'none');
    const up = mask(b.el, '::before'), down = mask(a.el, '::after') && !covers;
    // Kein Band darf Inhalt des Nachbarn überdecken (Bilder, Text, Bedienelemente). Canvas-Kästen zählen nicht (Show-Bühnen sind
    // absichtlich größer als ihr Bild), ebenso Elemente, die selbst über die Kante ragen (Leisten, aufklappbare Inhalte).
    const band = up ? b.el : down ? a.el : null, hit = [];
    if (band) {
      const s = getComputedStyle(band, up ? '::before' : '::after'), h = parseFloat(s.height), r = band.getBoundingClientRect();
      const y0 = up ? r.top - h : r.bottom, y1 = y0 + h, other = up ? a.el : b.el;
      for (const el of other.querySelectorAll('img, video, p, h1, h2, h3, li, a, button, input, figure')) { if (el.closest('details:not([open])') && !el.closest('summary')) continue; // zugeklappte Antworten sind unsichtbar
        const q = visible(el, other), inside = q && (up ? q.bottom <= r.top + 1 : q.top >= r.bottom - 1); if (inside && q.width && q.height && q.bottom > y0 + 1 && q.top < y1 - 1 && getComputedStyle(el).visibility !== 'hidden') hit.push(name(el)); }
    }
    out.push({ y: Math.round(b.r.top + scrollY), a: name(a.el), b: name(b.el), ca, cb, differ: ca !== cb, dots: up || down, covered: hit.slice(0, 3), line: line(b.el, 'Top') || line(a.el, 'Bottom') });
  }
  return out;
}

export async function check(base, paths, { width = 1440 } = {}) {
  const browser = await chromium.launch(), result = [];
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const path of paths) {
      await page.goto(base + path, { waitUntil: 'load' });
      // einmal durchscrollen: Sections mit content-visibility werden erst in der Nähe ausgelegt, vorher stimmen ihre Maße nicht
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); } scrollTo({ top: 0, behavior: 'instant' }); });
      for (const g of await page.evaluate(inspect)) result.push({ path, ...g, missing: g.differ && !g.dots, lined: g.differ && !!g.line, hides: g.differ && g.covered.length > 0 });
    }
  } finally { await browser.close(); }
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const dist = args[0] && !args[0].startsWith('--') ? args[0] : fileURLToPath(new URL('../../dist/', import.meta.url));
  const srv = await serveDist(dist);
  try {
    const paths = opt('pages') ? opt('pages').split(',') : pages(resolve(dist));
    const rows = await check(srv.base, paths, { width: +opt('width', 1440) });
    const bad = rows.filter((r) => r.missing || r.lined || r.hides), shown = args.includes('--all') ? rows : bad;
    for (const r of shown) console.log(`${r.path.padEnd(42)} ${String(r.y).padStart(6)}  ${r.a} → ${r.b}  ${r.ca} | ${r.cb}  ${r.differ ? 'Farbwechsel' : 'gleich'}${r.dots ? ' · Punkte' : ''}${r.line ? ' · Linie ' + r.line : ''}${r.missing ? '  ✗ ohne Punktübergang' : ''}${r.lined ? '  ✗ Linie' : ''}${r.hides ? `  ✗ Band überdeckt ${r.covered.join(', ')}` : ''}`);
    console.log(`\n${paths.length} Seiten, ${rows.length} Grenzen, ${rows.filter((r) => r.differ).length} mit Farbwechsel; ohne Punktübergang: ${rows.filter((r) => r.missing).length}, mit Trennlinie: ${rows.filter((r) => r.lined).length}, Band über Inhalt: ${rows.filter((r) => r.hides).length}`);
    if (bad.length) process.exitCode = 1;
  } finally { srv.close(); }
}
