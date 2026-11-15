// Lichtlauf über die H1: einmal beim Laden läuft zusätzliches Licht Buchstabe für Buchstabe durch die Überschrift.
// Die Schrift steht von Anfang an voll da (kein Einblenden, keine Schriftachse), nur die Helligkeit wandert (docs/DESIGN.md
// → Lichtlauf). Nur die H1 jeder Seite, keine H2. Ohne Bewegung (html.reveal fehlt) passiert nichts.
//
// Die Buchstaben stehen nur für die Dauer des Laufs in eigenen Elementen; danach ist die Überschrift wieder reiner Text
// (Screenreader lesen sie währenddessen über aria-label als Ganzes).

const STEP_MAX = 34; // ms je Buchstabe
const RUN_MAX = 900; // ms vom ersten bis zum letzten Buchstaben
const PULSE = 500; // ms je Buchstabe, muss zu .hm-lauf in himmel.css passen

export function lichtlauf(): void {
  const root = document.documentElement;
  if (!root.classList.contains('reveal') || root.classList.contains('motion-paused')) return;
  const head = document.querySelector<HTMLElement>('main h1');
  if (!head || head.dataset.lauf !== undefined) return;
  head.dataset.lauf = '';

  // Wörter bleiben ganz (kein Umbruch im Wort). Der wechselnde Hero-Begriff (.word) bleibt unberührt, ein anderes Skript tauscht ihn.
  const walker = document.createTreeWalker(head, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent?.trim() && !n.parentElement?.closest('.word, .sr-only')) texts.push(n as Text);
  if (!texts.length) return;
  head.setAttribute('aria-label', head.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  const units: HTMLElement[] = [];
  for (const text of texts) {
    const frag = document.createDocumentFragment();
    for (const part of text.textContent!.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(part); continue; }
      const word = document.createElement('span'); word.className = 'hm-wd';
      for (const ch of Array.from(part)) { const c = document.createElement('span'); c.className = 'hm-c'; c.textContent = ch; word.append(c); units.push(c); }
      frag.append(word);
    }
    text.replaceWith(frag);
  }
  const step = Math.min(STEP_MAX, RUN_MAX / Math.max(1, units.length));
  units.forEach((u, i) => u.style.setProperty('--d', `${Math.round(i * step)}ms`));

  // Auspacken statt innerHTML zurückschreiben: andere Skripte halten Verweise auf Knoten der Überschrift
  const restore = () => {
    head.querySelectorAll('.hm-wd').forEach((w) => w.replaceWith(w.textContent ?? ''));
    head.normalize(); head.classList.remove('hm-lauf'); head.removeAttribute('aria-label');
  };
  // Zwei Bilder warten, damit der Startzustand gezeichnet ist
  requestAnimationFrame(() => requestAnimationFrame(() => {
    head.classList.add('hm-lauf');
    window.setTimeout(restore, units.length * step + PULSE + 100);
  }));
}
