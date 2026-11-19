// Layout-Prüfung über alle Seiten (Marc, 02.11.2026: „Mich nervt es, dass ich dir diese Inconsistencies erklären muss“).
// Findet die Fehlerklassen, die er bisher von Hand gemeldet hat, automatisch:
//   orphan    Absatz oder Überschrift, deren letzte Zeile aus einem einzigen Wort besteht und kürzer als 40 % der
//             längsten Zeile ist (ein langes Einzelwort wie „Einstiegspreise.“ in einer Überschrift ist kein Hurenkind)
//   contain   sichtbarer Inhalt (Text, Bild, Video, Knopf) außerhalb der Content-Breite. Erlaubt sind nur Bereiche mit
//             [data-bleed] (z. B. das Showreel rechts im Seitenkopf) und alles, was als Fläche hinter dem Inhalt liegt
//   empty-h   Überschrift ohne Text (z. B. Daten aus einem veralteten Zwischenspeicher)
//   overflow  Seite scrollt seitlich
//   cta       Abschluss-Kasten (.promise, CtaBox.astro) ohne Gesichter, Überschrift oder Inhalt (Text oder Liste), mit mehr
//             als einer Inhaltsform oder nicht genau einem Anfragelink (Marc, 02.11.2026: „empty-looking CTAs“)
//   head-gap  Section-Kopf weicht von den Abstandsrollen --head-gap-kicker/-text/-cta/-content ab (global.css, Runde 6);
//             folgt dem Kopf Fließtext, gilt immer --head-gap-text (Runde 7)
//   hero-top  erste Zeile (Kicker oder h1) einer Seite mit .page-top nicht auf --hero-top (Marc, 02.11.2026: „Die Hero
//             section sollte überall auf der gleichen Höhe anfangen“). Ausnahme: Seiten, deren Kopf mit einem Bild beginnt (.page-404)
//   rail      Zeitstrahl (.ruler Netzplan, .lf-steps Ablauf, .ms Meilensteine): jeder Punkt liegt mit seinem Mittelpunkt auf
//             der Linie, die Linie reicht vom ersten bis zum letzten Punkt und nicht darüber hinaus (Marc, 18.11.2026, iPhone:
//             erster und letzter Punkt saßen auf der Zahl statt auf der Linie, die Linie endete vor dem letzten Eintrag)
//   deco      kleines Schmuckelement (Punkt, Icon, aria-hidden, ≤ 90 px) liegt auf fremdem sichtbarem Text
//   text-overlap (Textüberlagerung) sichtbare Textrechtecke verschiedener Rasterzellen überlagern sich
// Aufruf: node scripts/layout-audit.mjs [basis-url] [--start=/en/] [--widths=390,1440,1920] [--only=orphan,contain] [--browser=webkit]
// Ohne Basis-URL: http://127.0.0.1:4391. Die Seiten kommen aus den Links der Startseite und des Footers (Crawl, max. 200; --start begrenzt auf diesen Pfadpräfix).
import { pathToFileURL } from 'node:url';
import { chromium, webkit } from 'playwright';

const categories = ['orphan', 'contain', 'empty-h', 'overflow', 'cta', 'hero-top', 'head-gap', 'rail', 'deco', 'text-overlap'];

// Self-contained so Playwright can run the same inspection in the crawl and in fixtures.
export function inspectLayout({ checks }) {
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
  if (checks.includes('cta')) for (const box of document.querySelectorAll('main .promise')) {
    const missing = [['.faces', 'Gesichter'], [':is(h1,h2,h3)', 'Überschrift']].filter(([sel]) => !box.querySelector(sel)?.textContent?.trim() && !box.querySelector(sel)?.querySelector?.('img')).map(([, n]) => n);
    // Inhalt: ein Absatz unter der Überschrift oder eine Liste (Listenvariante), jeweils mit Text
    const content = [...box.querySelectorAll('p, ul, ol')].filter((e) => !e.closest('.faces, .actions') && !e.parentElement.closest('p, ul, ol') && e.textContent.trim());
    if (!content.length) missing.push('Text oder Liste');
    if (missing.length) r.push({ k: 'cta', what: `${name(box)} ohne ${missing.join(', ')}` });
    if (content.length > 1) r.push({ k: 'cta', what: `${name(box)} mit ${content.length} Inhaltsformen statt einer` });
    const links = box.querySelectorAll('a[href]').length;
    if (links !== 1) r.push({ k: 'cta', what: `${name(box)} mit ${links} Links statt genau einem Anfragelink` });
  }
  if (checks.includes('hero-top')) { const main = document.querySelector('main.page-top'); const first = main?.querySelector('.kicker, h1');
    if (first && !main.querySelector('.page-404')) { const probe = document.createElement('div'); probe.style.height = 'var(--hero-top)'; document.body.append(probe); const want = probe.offsetHeight; probe.remove();
      const top = first.getBoundingClientRect().top + scrollY; if (Math.abs(top - want) > 3) r.push({ k: 'hero-top', what: `${name(first)} beginnt bei ${Math.round(top)} statt ${want}` }); } }
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
    const swipeRows = new Set();
    for (const row of document.querySelectorAll('main [data-crew]')) {
      const style = getComputedStyle(row);
      if (!shown(row) || !['auto', 'scroll'].includes(style.overflowX) || !/^x\b/.test(style.scrollSnapType)) continue;
      swipeRows.add(row);
      const cards = [...row.children].filter(shown);
      if (!cards.length) continue;

      const original = row.scrollLeft;
      const extent = (row.scrollWidth - row.clientWidth) * (style.direction === 'rtl' ? -1 : 1);
      const clip = { left: 0, right: vw };
      for (let p = row; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX === 'visible') continue;
        const left = p.getBoundingClientRect().left + p.clientLeft;
        clip.left = Math.max(clip.left, left);
        clip.right = Math.min(clip.right, left + p.clientWidth);
      }
      try {
        for (const [card, edge, left] of [[cards[0], 'Erste', 0], [cards.at(-1), 'Letzte', extent]]) {
          row.scrollTo({ left, behavior: 'instant' });
          const box = card.getBoundingClientRect();
          if (box.left < clip.left - 1 || box.right > clip.right + 1) {
            r.push({ k: 'contain', what: `${name(row)}: ${edge} Karte horizontal nicht vollständig erreichbar` });
          }
        }
      } finally {
        row.scrollTo({ left: original, behavior: 'instant' });
      }
    }
    // Tokens über ein Mess-Element auflösen: parseFloat las aus „112rem“ 112 und aus clamp() gar nichts (dann galt still
    // 20 px Rand). Seit der rem-Umstellung (03.11.2026) stehen alle Längen in rem.
    const len = (v) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;visibility:hidden;width:var(${v})`; document.body.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
    const pad = len('--pad') || 20;
    const max = len('--content-max') || 1792;
    const gutter = Math.max(pad, (vw - max) / 2);
    const seenEl = new Set();
    for (const el of document.querySelectorAll('main :is(h1,h2,h3,h4,p,li,dt,dd,img,video,canvas,button,a.btn,a.link,table,figure,label,span.mono,.kicker)')) {
      if (!shown(el) || el.closest('[data-bleed],.table-wrap,.marquee,[data-marquee],.logos-track')) continue;
      const swipeRow = el.closest('[data-crew]');
      if (swipeRows.has(swipeRow) && el !== swipeRow) continue;
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
  // head-gap: Abstände jedes Section-Kopfs gegen die Rollen --head-gap-* (global.css, Runde 6, Marc: „einheitliche gaps
  // between headings and body copy … a centrally defined system“). Gebunden an das Markup von SectionHead.astro, nicht an
  // Klassennamen: jeder [data-section-head] (auch „contents“, dessen Kinder im Layout der Eltern stehen) und sein
  // Textblock .head-body. Kopf → folgender Block nach dem Vertrag data-head-next (Rolle des Abstands). Gemessen werden
  // Paare, die untereinander stehen; überlappt der folgende Block den Kopf, ist das ein Befund und wird nicht übersprungen.
  if (checks.includes('head-gap')) {
    const tok = (n) => { const probe = document.createElement('div'); probe.style.cssText = `position:absolute;margin-top:var(--head-gap-${n})`; document.body.append(probe); const v = parseFloat(getComputedStyle(probe).marginTop); probe.remove(); return v; };
    const box = (e) => e.getBoundingClientRect();
    const shown = (e) => box(e).height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.matches('script, style, .sr-only');
    const isCta = (e) => e.matches('.actions, a.link, a.btn') || (e.matches('p, div') && e.querySelector(':scope > :is(a.link, a.btn)') && ![...e.children].some((c) => !c.matches('a, br')));
    const sideBySide = (a, b) => { const x = box(a), y = box(b); return x.right <= y.left + 1 || y.right <= x.left + 1; };
    const check = (role, a, b, head) => { if (!a || !b || sideBySide(a, b)) return; const T = tok(role), gap = box(b).top - box(a).bottom;
      if (Math.abs(gap - T) > 2) r.push({ k: 'head-gap', what: `${name(head)} ${role}: ${Math.round(gap)} px statt ${Math.round(T)}${gap < -1 ? ' (überlappt)' : ''}` }); };
    // Erster Absatz am oberen Rand eines Blocks: absteigend über das jeweils erste sichtbare Kind; Karten, Listen, Tabellen,
    // Formulare, Abbildungen und Aufklapper sind Inhalt, kein Fließtext
    const leadsWithText = (el) => {
      for (let e = el; e; e = [...e.children].find(shown)) {
        if (e.matches('article, li, ul, ol, dl, table, form, figure, details, [data-head-group], [data-section-head]')) return null;
        if (e.matches('p')) return e.textContent.trim() && Math.abs(box(e).top - box(el).top) <= 2 ? e : null;
      }
      return null;
    };
    // Kinder in Lesereihenfolge: der Textblock .head-body zählt mit seinen Kindern
    const flow = (head) => [...head.children].flatMap((c) => c.matches('.head-body') ? [...c.children] : [c]).filter(shown);
    for (const head of document.querySelectorAll('main [data-section-head]')) {
      const kids = flow(head); if (!kids.length) continue;
      const H = kids.find((c) => c.matches('h1, h2, h3')); if (!H) continue;
      const k = H.querySelector(':scope > .kicker'), line = H.querySelector(':scope > .head-line');
      if (k && line && shown(k)) check('kicker', k, line, head);
      for (let i = 1; i < kids.length; i++) {
        const prev = kids[i - 1], cur = kids[i];
        if (isCta(cur) && (prev === H || prev.matches('p'))) check('cta', prev, cur, head);
        else if (cur.matches('p') && (prev === H || prev.matches('p'))) check('text', prev, cur, head);
      }
      // Kopf → folgender Block: erstes sichtbares Element nach dem Kopf (bei „contents“ nach seinem letzten Kind), notfalls
      // nach einem Vorfahren innerhalb der Section; Rolle aus dem Vertrag data-head-next
      const role = head.dataset.headNext; if (!role) continue;
      const last = head.matches('[data-section-head="contents"]') ? head.lastElementChild : head;
      let next = null;
      for (let from = last; from && !next && !from.matches('section, main'); from = from.parentElement) {
        for (let n = from.nextElementSibling; n; n = n.nextElementSibling) if (shown(n)) { next = n; break; }
      }
      // Beginnt der folgende Block mit Fließtext (ein Absatz, nicht in Karte, Liste, Tabelle oder Formular), ist der Abstand
      // immer Überschrift → Text, egal welche Rolle der Kopf meldet (Runde 7, Marc: „Der Abstand zwischen Heading und
      // Bodycopy sollte einheitlich sein“; vorher meldeten Köpfe über Galerie und Bühne „content“ und bestanden mit 56 px)
      const text = next && leadsWithText(next);
      if (text && role !== 'text') r.push({ k: 'head-gap', what: `${name(head)} meldet „${role}“, darunter steht Fließtext (${name(text)})` });
      if (next) check(text ? 'text' : role, head.matches('[data-section-head="contents"]') ? kids.at(-1) : head, text || next, head);
    }
    // Kopfgruppen: Ein Block mit derselben Oberkante wie ein Kopfteil gehört direkt zur Abstandsprüfung.
    // Sonst entscheidet die größte Unterkante der oberhalb beginnenden Blöcke, ob ein Kopfteil direkt vorausgeht.
    // Ein anderer Block dazwischen (Handy: Bedienung unter der Vorschau) beendet die Abstandsrolle des Kopfes.
    for (const group of document.querySelectorAll('main [data-head-group]')) {
      const role = group.dataset.headGroup, T = tok(role);
      const items = [...group.children].filter((e) => shown(e) && !e.matches('style, script'))
        .map((e) => ({ rect: box(e), head: e.matches('[data-head-part]') }))
        .sort((a, b) => b.rect.bottom - a.rect.bottom);
      for (const { rect: block } of items.filter(({ head }) => !head)) {
        const nearest = items.find(({ head, rect }) => head && Math.abs(rect.top - block.top) <= 1)
          ?? items.find(({ rect }) => rect.top < block.top - 1);
        if (!nearest?.head) continue;
        const gap = block.top - nearest.rect.bottom;
        if (Math.abs(gap - T) > 2) r.push({ k: 'head-gap', what: `${name(group)} ${role}: ${Math.round(gap)} px statt ${Math.round(T)}${gap < -1 ? ' (überlappt)' : ''}` });
      }
    }
  }
  // rail: Punkte und Linie eines Zeitstrahls. Linienabschnitte sind Pseudo-Elemente (Liste oder Eintrag, ::before/::after)
  // oder echte Elemente (.ms-line); gemessen wird im Seitenkoordinatensystem über die aufgelösten Maße der Pseudo-Elemente.
  // gezeichnet: wie shown(), aber Schmuck ist absichtlich aria-hidden und zählt trotzdem
  const drawn = (el) => { const st = getComputedStyle(el), b = el.getBoundingClientRect(); return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0 && b.width > 0 && b.height > 0 && !el.closest('[hidden],[inert],dialog:not([open])'); };
  if (checks.includes('rail')) {
    const pseudoBox = (host, pseudo) => {
      const s = getComputedStyle(host, pseudo); if (s.display === 'none' || s.content === 'none' || s.content === 'normal' || s.position !== 'absolute') return null;
      const hb = host.getBoundingClientRect(), hs = getComputedStyle(host);
      const x = hb.left + (parseFloat(hs.borderLeftWidth) || 0) + parseFloat(s.left), y = hb.top + (parseFloat(hs.borderTopWidth) || 0) + parseFloat(s.top);
      const w = parseFloat(s.width), h = parseFloat(s.height);
      return w > 0 && h > 0 && Number.isFinite(x + y) ? { x1: x, x2: x + w, y1: y, y2: y + h } : null;
    };
    const kinds = [['.ruler', '.dot'], ['.lf-steps', '.lf-dot'], ['.ms', '.ms-dot']];
    for (const [listSel, dotSel] of kinds) for (const list of document.querySelectorAll(`main ${listSel}`)) {
      if (!drawn(list)) continue;
      const dots = [...list.querySelectorAll(dotSel)].filter(drawn).map((d) => { const b = d.getBoundingClientRect(); return { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 }; });
      const segs = [pseudoBox(list, '::before'), pseudoBox(list, '::after'), ...[...list.children].flatMap((li) => [pseudoBox(li, '::before'), pseudoBox(li, '::after')]),
        ...[...list.querySelectorAll('.ms-line')].filter(drawn).map((l) => { const b = l.getBoundingClientRect(); return { x1: b.left, x2: b.right, y1: b.top, y2: b.bottom }; })]
        .filter((g) => g && Math.min(g.x2 - g.x1, g.y2 - g.y1) <= 4); // nur Linien, keine Flächen (Abzweig-Bögen sind gestrichelte Rahmen)
      if (dots.length < 2 || !segs.length) continue;
      const vertical = Math.abs(dots.at(-1).y - dots[0].y) > Math.abs(dots.at(-1).x - dots[0].x);
      const lab = `${name(list)}`;
      dots.forEach((d, i) => { if (!segs.some((g) => d.x >= g.x1 - 1.5 && d.x <= g.x2 + 1.5 && d.y >= g.y1 - 1.5 && d.y <= g.y2 + 1.5)) r.push({ k: 'rail', what: `${lab}: Punkt ${i + 1}/${dots.length} nicht auf der Linie` }); });
      const lo = Math.min(...segs.map((g) => vertical ? g.y1 : g.x1)), hi = Math.max(...segs.map((g) => vertical ? g.y2 : g.x2));
      const a = vertical ? dots[0].y : dots[0].x, z = vertical ? dots.at(-1).y : dots.at(-1).x;
      if (lo > a + 1.5) r.push({ k: 'rail', what: `${lab}: Linie beginnt ${Math.round(lo - a)} px nach dem ersten Punkt` });
      if (hi < z - 1.5) r.push({ k: 'rail', what: `${lab}: Linie endet ${Math.round(z - hi)} px vor dem letzten Punkt` });
      if (hi > z + 16) r.push({ k: 'rail', what: `${lab}: Linie läuft ${Math.round(hi - z)} px über den letzten Punkt hinaus` });
    }
  }
  if (checks.includes('text-overlap')) {
    const main = document.querySelector('main');
    const styles = new Map();
    const style = (el) => {
      if (!styles.has(el)) styles.set(el, getComputedStyle(el));
      return styles.get(el);
    };
    const grids = new Map();
    const range = document.createRange();
    if (main) {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        const text = node.data.trim().replace(/\s+/g, ' ');
        if (!text || el.closest('script,style,svg,canvas,.sr-only,[hidden],dialog:not([open])')) continue;
        const details = el.closest('details:not([open])');
        if (details && el.closest('summary')?.parentElement !== details) continue;
        const css = style(el);
        if (css.visibility !== 'visible') continue;
        const lineHeight = parseFloat(css.lineHeight);

        const items = [];
        const clips = [];
        let visible = true;
        for (let item = el; item !== main; item = item.parentElement) {
          const css = style(item);
          if (css.display === 'none' || Number(css.opacity) === 0) { visible = false; break; }
          if (css.overflowX !== 'visible' || css.overflowY !== 'visible') clips.push([item.getBoundingClientRect(), css]);
          if (css.display === 'contents' || ['absolute', 'fixed'].includes(css.position)) continue;
          let grid = item.parentElement;
          while (grid !== main && style(grid).display === 'contents') grid = grid.parentElement;
          if (['grid', 'inline-grid'].includes(style(grid).display)) items.push([grid, item]);
        }
        if (!visible || !items.length) continue;

        range.selectNodeContents(node);
        const rects = [...range.getClientRects()].map(({ left, top, right, bottom }) => {
          // Range includes font ascenders/descenders beyond a tight CSS line box.
          const extra = (bottom - top - lineHeight) / 2;
          if (extra > 0) { top += extra; bottom -= extra; }
          for (const [box, css] of clips) {
            if (css.overflowX !== 'visible') { left = Math.max(left, box.left); right = Math.min(right, box.right); }
            if (css.overflowY !== 'visible') { top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom); }
          }
          return { left, top, right, bottom, text };
        }).filter((box) => box.right - box.left > 1 && box.bottom - box.top > 1);

        for (const [grid, item] of items) {
          if (!grids.has(grid)) grids.set(grid, new Map());
          const cells = grids.get(grid);
          if (!cells.has(item)) cells.set(item, []);
          cells.get(item).push(...rects);
        }
      }
    }
    for (const [grid, cells] of grids) {
      const items = [...cells.entries()];
      for (const [i, [first, boxes]] of items.entries()) {
        for (const [second, otherBoxes] of items.slice(i + 1)) {
          // Report one representative collision per pair of grid items.
          collision: for (const a of boxes) for (const b of otherBoxes) {
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (x <= 1 || y <= 1) continue;
            const what = `${name(grid)}: ${name(first)} „${a.text.slice(0, 45)}“ und ${name(second)} „${b.text.slice(0, 45)}“`;
            r.push({ k: 'text-overlap', what: `Textüberlagerung in ${what}` });
            break collision;
          }
        }
      }
    }
  }

  // deco: kleine Schmuckelemente auf fremdem Text. Text zählt nur, wo er sichtbar ist (Deckkraft der Vorfahren, Ausschnitt
  // durch overflow-Vorfahren, geschlossene <details>); große Flächen (Bühnen, Hintergründe) sind kein Schmuck in diesem Sinn.
  if (checks.includes('deco')) {
    const clipBox = (el, b) => { let l = b.left, t = b.top, rr = b.right, bb = b.bottom;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflow !== 'visible' || cs.clipPath !== 'none' || (p.tagName === 'DETAILS' && !p.open)) { const pb = p.getBoundingClientRect(); l = Math.max(l, pb.left); t = Math.max(t, pb.top); rr = Math.min(rr, pb.right); bb = Math.min(bb, pb.bottom); } }
      return rr - l > 1 && bb - t > 1 ? { left: l, top: t, right: rr, bottom: bb } : null; };
    const visible = (el) => { if (!drawn(el)) return false; let o = 1; for (let p = el; p && p !== document.body; p = p.parentElement) { o *= Number(getComputedStyle(p).opacity); if (o < 0.05) return false; } return true; };
    const texts = [];
    for (const el of document.querySelectorAll('main *')) {
      if (el.closest('[aria-hidden="true"], .sr-only, svg, canvas') || !shown(el) || !visible(el)) continue;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.data.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const b0 of rg.getClientRects()) { const b = b0.width > 2 && b0.height > 2 && clipBox(el, b0); if (b) texts.push({ el, b }); } }
    }
    const seenDeco = new Set();
    for (const d of document.querySelectorAll('main :is([aria-hidden="true"], .dot, .ms-dot, .lf-dot)')) {
      if (!visible(d) || d.querySelector('p, h1, h2, h3, h4')) continue;
      const db = d.getBoundingClientRect(); if (db.width > 90 || db.height > 90 || db.width < 3) continue;
      for (const t of texts) {
        if (d.contains(t.el) || t.el.contains(d)) continue;
        const ix = Math.min(db.right, t.b.right) - Math.max(db.left, t.b.left), iy = Math.min(db.bottom, t.b.bottom) - Math.max(db.top, t.b.top);
        if (ix > 3 && iy > 3 && ix * iy > 0.15 * db.width * db.height && !seenDeco.has(d)) { seenDeco.add(d); r.push({ k: 'deco', what: `${name(d)} liegt auf „${t.el.textContent.trim().slice(0, 30)}“` }); }
      }
    }
  }
  return r;
}

async function run(args) {
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
    for (const l of links) if (l.startsWith(start) && !seen.has(l) && !/\.(pdf|jpe?g|png|mp4|svg|webp|xml)$/.test(l) && !l.startsWith('/api')) { seen.add(l); queue.push(l); }
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
      const out = await page.evaluate(inspectLayout, { checks: categories.filter(want) });
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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run(process.argv.slice(2));
