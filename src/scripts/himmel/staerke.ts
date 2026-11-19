// Schriftstärke der Verlaufsworte (docs/DESIGN.md → Himmel; Runde 9): Der Begriff (.grad) steht dünn (300) und füllt sich, wenn
// er über 58 % der Fensterhöhe steht, in einem Schwung zur Stärke der Überschrift. Jedes Wort steht in einer Hülle (.st-w) mit
// unsichtbarer Kopie in Endstärke (::before, data-t), die allein die Breite bestimmt: kein Versatz, kein anderer Umbruch. Jedes
// Wort malt den Verlauf selbst, am ganzen Begriff ausgerichtet (WebKit malt background-clip: text nicht in inline-blocks).
// Begründungen und Maße: himmel.css; Wächter: scripts/staerke-glow.test.mjs. Im Editor-Build (data-afe) wird nichts umgebaut.

const SEL = ':is(h1, h2, h3) .grad';
const LATE = '0% 0% -42% 0%'; // auslösen, wenn das Wort über 58 % der Fensterhöhe steht

function stack(el: HTMLElement): void {
  if (el.classList.contains('st-bereit')) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent) texts.push(n as Text);
  for (const text of texts) {
    const frag = document.createDocumentFragment();
    // nur an umbrechbarem Leerraum teilen; geschützte Leerzeichen („Kein&nbsp;Müll.“) bleiben im Wort
    for (const part of text.textContent!.split(/([ \t\n\r\f]+|\u00AD)/)) {
      if (!part) continue;
      if (/^([ \t\n\r\f]+|\u00AD)$/.test(part)) { frag.append(part); continue; }
      const w = document.createElement('span'); w.className = 'st-w'; w.dataset.t = part;
      const v = document.createElement('span'); v.className = 'st-v'; v.textContent = part;
      w.append(v); frag.append(w);
    }
    text.replaceWith(frag);
  }
  // Satzzeichen direkt danach („Feuerwerk, …“) in die letzte Hülle, in Farbe und Stärke der Überschrift: nach einem
  // inline-block bricht Chromium sonst vor dem Komma um
  const next = el.nextSibling, last = [...el.querySelectorAll<HTMLElement>('.st-w')].pop();
  const m = next?.nodeType === 3 && last && el.lastChild === last ? /^[,.;:!?)»“…]+/.exec(next.textContent ?? '') : null;
  if (m && next && last) {
    next.textContent = next.textContent!.slice(m[0].length);
    const cs = getComputedStyle(el.parentElement ?? el);
    const p = document.createElement('span'); p.className = 'st-p'; p.textContent = m[0];
    p.style.fontWeight = cs.fontWeight; p.style.setProperty('-webkit-text-fill-color', cs.color); p.style.color = cs.color;
    last.firstElementChild!.append(p); last.dataset.t += m[0];
  }
  el.classList.add('st-bereit');
}

const PAD = 0.3; // em, Malfläche des Worts über seine Hülle hinaus (himmel.css .grad .st-v)
function verlauf(el: HTMLElement): void {
  const frags = [...el.getClientRects()]; if (!frags.length) return;
  const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
  // ohne hereingezogenes Satzzeichen (.st-p), wie vorher
  const total = frags.reduce((n, q) => n + q.width, 0) - [...el.querySelectorAll('.st-p')].reduce((n, p) => n + p.getBoundingClientRect().width, 0);
  for (const w of el.querySelectorAll<HTMLElement>('.st-w')) {
    const q = w.getBoundingClientRect(), mid = q.top + q.height / 2;
    let i = frags.findIndex((f) => mid >= f.top && mid <= f.bottom); if (i < 0) i = 0;
    const offset = frags.slice(0, i).reduce((n, f) => n + f.width, 0) + (q.left - frags[i].left);
    const v = w.firstElementChild as HTMLElement;
    v.style.setProperty('--st-bw', `${(total / fs).toFixed(4)}em`);
    v.style.setProperty('--st-bx', `${(PAD - offset / fs).toFixed(4)}em`);
  }
}

const live = () => document.documentElement.classList.contains('reveal') && 'IntersectionObserver' in window;
// Hüllen sofort beim Import (vor dem ersten Bild); staerke() startet nur die Auslöser
const words = [...document.querySelectorAll<HTMLElement>(SEL)];
for (const el of words) {
  if (el.closest('[data-afe]') || !live()) el.classList.add('st-an');
  else stack(el);
}
const stacked = words.filter((el) => el.classList.contains('st-bereit'));
const ausrichten = () => { for (const el of stacked) verlauf(el); };
ausrichten();
if (stacked.length) {
  (document.fonts?.ready ?? Promise.resolve()).then(ausrichten);
  let raf = 0; addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(ausrichten); }, { passive: true });
}

export function staerke(): void {
  const pending = new Set(words.filter((el) => !el.classList.contains('st-an')));
  if (!pending.size) return;
  const visible = new Set<Element>();
  const fill = (el: Element) => { el.classList.add('st-an'); pending.delete(el as HTMLElement); late.unobserve(el); seen.unobserve(el); visible.delete(el); };
  const late = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) fill(e.target); }, { rootMargin: LATE });
  // Seitenende: was nie über 58 % kommt, füllt sich sichtbar am Ende
  const atEnd = () => {
    if (!pending.size || innerHeight + scrollY < document.documentElement.scrollHeight - 2) return;
    for (const el of [...visible]) if (pending.has(el as HTMLElement)) fill(el);
  };
  const seen = new IntersectionObserver((entries) => { for (const e of entries) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); } atEnd(); });
  for (const el of pending) { late.observe(el); seen.observe(el); }
  addEventListener('scroll', atEnd, { passive: true });
}
