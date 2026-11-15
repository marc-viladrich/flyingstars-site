// Schrift-Labor: Zustand, Auftritt der Schlagzeilen und Bedienleiste.
// Der Zustand steht als data-lab-* an <html> (gesetzt vom Inline-Skript in Base.astro, vor dem ersten Bild);
// URL-Parameter (?schrift=geist-pixel&auftritt=lauf …) gewinnen, damit sich jede Fassung verlinken lässt.
import { initHimmel } from './himmel';

type Key = 'font' | 'scope' | 'labels' | 'motion' | 'himmel' | 'kante' | 'elsh' | 'soft';
type State = Record<Key, string>;

const STORE = 'flyingstars:labor';
const PARAM: Record<Key, string> = { font: 'schrift', scope: 'einsatz', labels: 'etiketten', motion: 'auftritt', himmel: 'himmel', kante: 'kante', elsh: 'pixel', soft: 'ecken' };
const DEFAULTS: State = { font: 'space-grotesk', scope: 'h2', labels: 'standard', motion: 'lauf', himmel: 'aus', kante: 'linie', elsh: 'rund', soft: 'voll' };

interface Font { id: string; label: string; face?: string; load?: string[]; axis?: boolean; all?: boolean; note?: string }
export const FONTS: Font[] = [
  { id: 'space-grotesk', label: 'Space Grotesk (Ist-Stand)' },
  { id: 'geist-pixel', label: 'Geist Pixel', face: 'Geist Pixel', load: ['400 1em "Geist Pixel"'], axis: true, all: true, note: 'Formachse je Pixel: eckig oder rund. Gefüllt bleiben die Kanten hart.' },
  { id: 'pixel-weich', label: 'Geist Pixel, weiche Ecken (Demo)', face: 'FS Pixel Weich', load: ['400 1em "FS Pixel Weich"', '400 1em "Geist Pixel"'], axis: true, all: true, note: 'Eigene Ableitung: Die Ecken der gefüllten Form sind gerundet. 16 KB. Der Auftritt lädt zusätzlich Geist Pixel.' },
];

const root = document.documentElement;
const state = (): State => Object.fromEntries((Object.keys(DEFAULTS) as Key[]).map((k) => [k, root.getAttribute(`data-lab-${k}`) || DEFAULTS[k]])) as State;
const font = () => FONTS.find((f) => f.id === state().font) ?? FONTS[0];

function set(patch: Partial<State>) {
  const next = { ...state(), ...patch };
  for (const k of Object.keys(DEFAULTS) as Key[]) root.setAttribute(`data-lab-${k}`, next[k]);
  try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* privater Modus */ }
  // Adresse mitführen: Was Marc sieht, lässt sich so weitergeben
  const url = new URL(location.href);
  for (const k of Object.keys(DEFAULTS) as Key[]) { if (next[k] === DEFAULTS[k]) url.searchParams.delete(PARAM[k]); else url.searchParams.set(PARAM[k], next[k]); }
  history.replaceState(history.state, '', url);
  document.dispatchEvent(new CustomEvent('lab:change', { detail: next }));
}

/* ---------- Auftritt der Schlagzeilen ---------- */

const HEADS = 'h1, h2:not(.footer-heading), .eco-title';
let prepared: HTMLElement[] = [];
let io: IntersectionObserver | undefined;
let run = 0;

// Zerlegt die Textknoten einer Schlagzeile in Buchstaben. Wörter bleiben ganz (kein Umbruch im Wort),
// der wechselnde Hero-Begriff (.word) bleibt unberührt, weil ein anderes Skript seinen Text tauscht.
function split(head: HTMLElement, variable: boolean) {
  const walker = document.createTreeWalker(head, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent?.trim() && !(n.parentElement?.closest('.word, .sr-only'))) texts.push(n as Text);
  const units: HTMLElement[] = [];
  for (const text of texts) {
    // Ohne Achse zählt ein Verlaufswort als ein Stück (Deckkraft an Buchstaben schneidet den Verlauf ab)
    const whole = !variable && text.parentElement?.closest('.grad');
    if (whole) { const g = text.parentElement!.closest('.grad') as HTMLElement; if (!units.includes(g)) { g.classList.add('lab-u'); units.push(g); } continue; }
    const frag = document.createDocumentFragment();
    for (const part of text.textContent!.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(part); continue; }
      const word = document.createElement('span'); word.className = 'lab-wd'; word.style.whiteSpace = 'nowrap';
      for (const ch of Array.from(part)) { const c = document.createElement('span'); c.className = 'lab-c lab-u'; c.textContent = ch; word.append(c); units.push(c); }
      frag.append(word);
    }
    text.replaceWith(frag);
  }
  // Der ganze Lauf dauert höchstens 1,1 s, bei kurzen Zeilen 38 ms je Buchstabe
  const step = Math.min(38, 1100 / Math.max(1, units.length));
  units.forEach((u, i) => u.style.setProperty('--d', `${Math.round(i * step)}ms`));
}

function restore() {
  io?.disconnect();
  // Auspacken statt innerHTML zurückschreiben: Andere Skripte (wechselndes Hero-Wort) halten Verweise auf die Knoten
  for (const head of prepared) {
    head.querySelectorAll('.lab-wd').forEach((w) => w.replaceWith(w.textContent ?? ''));
    head.querySelectorAll<HTMLElement>('.lab-u').forEach((u) => { u.classList.remove('lab-u'); u.style.removeProperty('--d'); });
    head.normalize(); head.classList.remove('lab-h', 'lab-in'); head.removeAttribute('aria-label');
  }
  prepared = [];
}

async function prepare() {
  const mine = ++run;
  restore();
  const s = state(), f = font();
  if (!f.face || s.motion === 'aus' || !root.classList.contains('reveal')) return;
  try { await Promise.all(f.load!.map((l) => document.fonts.load(l))); } catch { /* Schrift fehlt: ohne Auftritt weiter */ }
  if (mine !== run) return;
  const heads = [...document.querySelectorAll<HTMLElement>(HEADS)].filter((h) => !h.closest('.labbar, [data-lab-still]'));
  for (const head of heads) {
    if (s.motion === 'lauf') { head.setAttribute('aria-label', head.textContent?.replace(/\s+/g, ' ').trim() ?? ''); split(head, Boolean(f.axis)); }
    head.classList.add('lab-h');
  }
  prepared = heads;
  // Zwei Bilder warten, damit der Startzustand gezeichnet ist, bevor die erste Schlagzeile losläuft
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (mine !== run) return;
    io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add('lab-in'); io!.unobserve(e.target); } }, { rootMargin: '0px 0px -12% 0px', threshold: 0.4 });
    heads.forEach((h) => io!.observe(h));
  }));
}

/* ---------- Bedienleiste ---------- */

const seg = (key: Key, label: string, options: [string, string][]) => `<div class="labbar-row" data-row="${key}" role="radiogroup" aria-labelledby="lab-l-${key}"><span class="labbar-l" id="lab-l-${key}">${label}</span><div class="labbar-seg">${options.map(([v, t]) => `<label><input type="radio" name="lab-${key}" value="${v}"><span>${t}</span></label>`).join('')}</div></div>`;

function bar() {
  const el = document.createElement('aside');
  el.className = 'labbar'; el.setAttribute('aria-label', 'Schrift-Labor');
  let open = true; try { open = localStorage.getItem(`${STORE}:bar`) !== 'zu'; } catch { /* egal */ }
  if (matchMedia('(max-width: 43.75em)').matches) open = false;
  el.toggleAttribute('data-open', open);
  el.innerHTML = `<div class="labbar-panel" id="labbar-panel">
      <div class="labbar-row"><label class="labbar-l" for="lab-font">Schrift</label><div class="labbar-font"><button type="button" data-step="-1" aria-label="Vorherige Schrift">‹</button><select id="lab-font">${FONTS.map((f) => `<option value="${f.id}">${f.label}</option>`).join('')}</select><button type="button" data-step="1" aria-label="Nächste Schrift">›</button></div></div>
      <p class="labbar-note" data-note hidden></p>
      ${seg('scope', 'Einsatz', [['h2', 'H1, H2'], ['h3', '+ Karten'], ['alles', 'alles']])}
      ${seg('labels', 'Etiketten', [['standard', 'bisher'], ['gleich', 'wie Schrift']])}
      ${seg('motion', 'Auftritt', [['aus', 'aus'], ['ganz', 'zugleich'], ['lauf', 'Lichtlauf']])}
      ${seg('elsh', 'Pixelform', [['eckig', 'eckig'], ['rund', 'rund']])}
      ${seg('soft', 'Ecken', [['halb', 'halb weich'], ['voll', 'weich']])}
      ${seg('himmel', 'Schwarm', [['aus', 'aus'], ['steht', 'steht'], ['fliegt', 'fliegt'], ['antwortet', 'antwortet']])}
      ${seg('kante', 'Übergänge', [['linie', 'Linie'], ['punkte', 'Punkte']])}
      <div class="labbar-foot"><button type="button" data-replay>Auftritt wiederholen</button><button type="button" data-finale title="Zeigt, was der Himmel nach dem Absenden der Anfrage macht">Anfrage-Finale</button><a href="/labor/">Übersicht</a><button type="button" data-reset>Ist-Stand</button></div>
    </div>
    <button type="button" class="labbar-toggle" aria-expanded="${open}" aria-controls="labbar-panel"><i aria-hidden="true"></i>Labor · <b data-current></b></button>`;
  document.body.append(el);

  const select = el.querySelector<HTMLSelectElement>('#lab-font')!;
  const sync = () => {
    const s = state(), f = font(), base = s.font === 'space-grotesk';
    select.value = s.font;
    el.querySelector('[data-current]')!.textContent = f.label.replace(' (Ist-Stand)', '');
    for (const k of ['scope', 'labels', 'motion', 'himmel', 'kante', 'elsh', 'soft'] as Key[]) el.querySelectorAll<HTMLInputElement>(`input[name="lab-${k}"]`).forEach((i) => { i.checked = i.value === s[k]; });
    const show = (k: string, on: boolean) => { el.querySelector<HTMLElement>(`[data-row="${k}"]`)!.hidden = !on; };
    show('scope', !base); show('motion', !base); show('labels', s.scope !== 'alles');
    el.querySelector<HTMLInputElement>('input[name="lab-scope"][value="alles"]')!.disabled = !f.all;
    show('elsh', s.font === 'geist-pixel'); show('soft', s.font === 'pixel-weich');
    // „wie Schrift“ gibt es nur mit einer Kandidatenschrift
    el.querySelector<HTMLInputElement>('input[name="lab-labels"][value="gleich"]')!.disabled = base;
    const note = el.querySelector<HTMLElement>('[data-note]')!; note.hidden = !f.note; note.textContent = f.note ?? '';
    el.querySelector<HTMLButtonElement>('[data-finale]')!.hidden = s.himmel !== 'antwortet';
    el.querySelector<HTMLButtonElement>('[data-replay]')!.disabled = base || s.motion === 'aus' || !root.classList.contains('reveal');
  };
  sync();
  document.addEventListener('lab:change', sync);

  select.addEventListener('change', () => apply({ font: select.value }));
  el.addEventListener('change', (e) => { const i = e.target as HTMLInputElement; if (i.type === 'radio') apply({ [i.name.replace('lab-', '')]: i.value } as Partial<State>); });
  el.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button'); if (!t) return;
    if (t.dataset.step) { const i = FONTS.findIndex((f) => f.id === state().font); apply({ font: FONTS[(i + Number(t.dataset.step) + FONTS.length) % FONTS.length].id }); }
    else if ('replay' in t.dataset) prepare();
    else if ('finale' in t.dataset) { document.querySelector('#inquiry-form')?.scrollIntoView({ block: 'start' }); scrollBy(0, -140); window.setTimeout(() => document.dispatchEvent(new CustomEvent('hm:finale')), 900); }
    else if ('reset' in t.dataset) apply({ ...DEFAULTS });
    else if (t.classList.contains('labbar-toggle')) { const now = !el.hasAttribute('data-open'); el.toggleAttribute('data-open', now); t.setAttribute('aria-expanded', String(now)); try { localStorage.setItem(`${STORE}:bar`, now ? 'auf' : 'zu'); } catch { /* egal */ } }
  });
}

function apply(patch: Partial<State>) {
  const before = state();
  // Ohne Kandidatenschrift kann das Etikett nicht „wie die Schrift“ sein
  if ((patch.font ?? before.font) === 'space-grotesk' && (patch.labels ?? before.labels) === 'gleich') patch.labels = 'standard';
  // Schriften, die bis ins UI tragen, zeigen sich zuerst überall
  if (patch.font && patch.font !== before.font && !patch.scope) { const f = FONTS.find((x) => x.id === patch.font); patch.scope = f?.all ? 'alles' : before.scope === 'alles' ? 'h2' : before.scope; }
  set(patch);
  const after = state();
  if (before.font !== after.font || before.motion !== after.motion) prepare();
}

// Erste Normalisierung (z. B. unbekannte Werte aus alten Adressen), dann Leiste, Auftritt und Muster
for (const k of Object.keys(DEFAULTS) as Key[]) if (!root.getAttribute(`data-lab-${k}`)) root.setAttribute(`data-lab-${k}`, DEFAULTS[k]);
if (!FONTS.some((f) => f.id === state().font)) root.setAttribute('data-lab-font', 'space-grotesk');
bar();
prepare();
initHimmel();
