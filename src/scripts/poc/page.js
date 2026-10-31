import { Swarm, formation, gradientAt, hilbertSort, reduceMotion, motionPaused } from '../effects/swarm.js';
import { SHAPES } from '../effects/shapes.js';
import { dotImage } from '../effects/dotimage.js';
import logo from '../../data/logo-dots.json';

const $ = (r, s) => r.querySelector(s);
const val = (r, name) => $(r, `input[name="${name}"]:checked`)?.value;
const still = () => reduceMotion() || motionPaused();

// Tempo nach Marcs Vorgabe (30.10.): Übergänge langsam wie in echt, Logos stehen lang (5 s), Motive kurz (2 s)
export const TEMPO = { transition: 5200, hold: 2000, holdLogo: 5000, wave: 0.45 };

// Studien erst aufbauen, wenn sie in die Nähe kommen (spart Rechenzeit beim Laden)
const near = (el, fn) => new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); fn(el); } }, { rootMargin: '300px' }).observe(el);

// Das FlyingStars-Logo ist selbst ein Lichtpunkt-Raster (88 Punkte). Für große Drohnenzahlen wird es
// verdichtet: zwischen benachbarten Punkten kommt je ein weiterer, die Linien des Logos werden dichter (256).
const DOTS = logo.dots.map(([x, y, r, g, b]) => ({ x, y: -y, c: [r, g, b] }));
const DENSE = (() => {
  let d0 = Infinity;
  for (let i = 0; i < DOTS.length; i++) for (let j = i + 1; j < DOTS.length; j++) d0 = Math.min(d0, Math.hypot(DOTS[i].x - DOTS[j].x, DOTS[i].y - DOTS[j].y));
  const mids = [];
  for (let i = 0; i < DOTS.length; i++) for (let j = i + 1; j < DOTS.length; j++) {
    const a = DOTS[i], b = DOTS[j];
    if (Math.hypot(a.x - b.x, a.y - b.y) < d0 * 1.2) mids.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c: a.c.map((v, k) => Math.round((v + b.c[k]) / 2)) });
  }
  return [...DOTS, ...mids];
})();
// Schriftzug in der Einstrich-Schrift des FlyingStars-Textplaners (siehe strokeText in swarm.js)
// „Λ“ = A ohne Querstrich wie im FlyingStars-Logo (eigene Glyphe in formwerk/font.js)
const WORDMARK = { kind: 'text', text: 'FLYINGST\u039BRS' };
/**
 * FlyingStars-Zeichen wie in den eigenen Shows: Logo und darunter der Schriftzug im Verlauf.
 * Unter 180 Drohnen nur das Logo, ab 420 das verdichtete Logo, der Rest geht an den Schriftzug.
 */
async function fsMark(n) {
  if (n < 180) return hilbertSort(DOTS.map(d => ({ x: d.x * 0.85, y: d.y * 0.85, c: d.c, wt: 1 })));
  const mark = n >= 420 ? DENSE : DOTS, out = mark.map(d => ({ x: d.x * 0.56, y: d.y * 0.56 - 0.3, c: d.c, wt: 1 }));
  const text = await formation(WORDMARK, n - mark.length);
  for (const p of text) out.push({ x: p.x * 0.86, y: p.y * 0.86 + 0.52, c: gradientAt((p.x + 1) / 2), wt: p.wt });
  return hilbertSort(out);
}

function logoLab(root) {
  const cv = $(root, '[data-stage]'), status = $(root, '[data-status]'), file = $(root, '[data-file]');
  const wrap = $(root, '.stage-wrap'), pauseBtn = $(root, '[data-pause]'), textIn = $(root, '[data-text]');
  const sw = new Swarm(cv, { count: 600, scale: 0.44, dot: 2 });
  sw.wave = TEMPO.wave; sw.waveWidth = 0.06;
  let own = null, ownName = '', seq = ['fs', 'heart', 'moin'], at = 0, timer = 0, token = 0, first = true, paused = false;
  const names = { fs: 'Das FlyingStars-Logo', heart: 'Ein Herz', moin: 'Ein Gruß' };
  const count = () => +val(root, 'lab-n');

  async function show(key) {
    const my = ++token; clearTimeout(timer);
    const n = count();
    let pts;
    try {
      pts = key === 'fs' ? await fsMark(n) : await formation(key === 'own' ? own : SHAPES[key], n);
      if (!pts.length) throw new Error('leer');
    } catch {
      if (key === 'own') { own = null; seq = ['fs', 'heart', 'moin']; at = 0; }
      status.textContent = 'Diese Datei konnten wir nicht umrechnen. Am besten klappt ein SVG oder ein PNG mit transparentem Hintergrund.';
      return;
    }
    if (my !== token) return; // inzwischen etwas anderes gewählt
    sw.dot = n > 400 ? 1.6 : n > 250 ? 1.8 : 2.1;
    const colors = key === 'own' ? val(root, 'lab-c') : key === 'fs' ? 'source' : 'gradient';
    const dur = first ? 2600 : TEMPO.transition;
    sw.set(pts, { mode: first ? 'rise' : 'cloud', dur, colors });
    first = false;
    const label = key === 'own' ? ownName : names[key];
    status.textContent = `${label} mit ${n} Drohnen.` + (n <= 100 ? ' Bei 100 Drohnen bleibt die Grundform, feine Details und kleine Schrift fallen weg.' : '');
    if (!paused && !still()) timer = setTimeout(() => { at = (at + 1) % seq.length; show(seq[at]); }, dur + (key === 'own' || key === 'fs' ? TEMPO.holdLogo : TEMPO.hold));
  }
  const useOwn = (source, name) => {
    own = source; ownName = name;
    seq = ['own', 'fs', 'own', 'heart', 'own', 'moin']; at = 0; show('own');
  };
  const takeFile = f => {
    if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, '');
    if (f.type === 'image/svg+xml') f.text().then(markup => useOwn({ kind: 'svg', markup }, name));
    else if (/^image\//.test(f.type)) useOwn({ kind: 'image', src: URL.createObjectURL(f) }, name);
  };
  // nach dem Ablegen oder Auswählen verschwindet die Dropzone sofort, bis die Maus die Bühne einmal verlassen hat
  const done = () => wrap.classList.add('is-done');
  wrap.addEventListener('pointerleave', () => wrap.classList.remove('is-done'));
  file.addEventListener('change', e => { done(); takeFile(e.target.files?.[0]); });
  // Dropzone: die Bühne selbst nimmt Dateien an, ein Klick öffnet die Auswahl
  wrap.addEventListener('click', e => { if (!e.target.closest('button')) file.click(); });
  wrap.addEventListener('dragover', e => { e.preventDefault(); wrap.classList.add('is-drag'); });
  wrap.addEventListener('dragleave', e => { if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('is-drag'); });
  wrap.addEventListener('drop', e => { e.preventDefault(); wrap.classList.remove('is-drag'); done(); takeFile(e.dataTransfer?.files?.[0]); });
  // eigener Text erscheint von selbst, kurz nachdem man aufgehört hat zu tippen
  let typing = 0;
  const takeText = () => {
    clearTimeout(typing);
    const t = textIn.value.trim().slice(0, 14); if (!t) return;
    useOwn({ kind: 'text', text: t.toUpperCase() }, `„${t}“`);
  };
  textIn.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(takeText, 800); });
  textIn.closest('form').addEventListener('submit', e => { e.preventDefault(); takeText(); });
  // neue Drohnenzahl: zurück zum Logo (dem eigenen, sonst FlyingStars), Farben betreffen nur das eigene Logo
  root.querySelectorAll('input[name=lab-n]').forEach(i => i.addEventListener('change', () => { at = 0; show(seq[0]); }));
  root.querySelectorAll('input[name=lab-c]').forEach(i => i.addEventListener('change', () => { if (own) { at = 0; show('own'); } }));
  pauseBtn.addEventListener('click', () => {
    paused = !paused; pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Weiter' : 'Anhalten';
    if (paused) clearTimeout(timer); else { at = (at + 1) % seq.length; show(seq[at]); }
  });
  show('fs');
}

function motionLab(root) {
  const cv = $(root, '[data-stage]');
  const N = 300, keys = ['heart', 'ring', 'moin', 'anchor'];
  const sw = new Swarm(cv, { count: N, scale: 0.42, dot: 2.1 });
  let i = 0, timer = 0;
  const speed = () => +$(root, '[data-speed]').value;
  const waveOn = () => $(root, '[data-wave]').checked;
  const next = async () => {
    clearTimeout(timer);
    const pts = await formation(SHAPES[keys[i++ % keys.length]], N);
    const dur = (i === 1 ? 2600 : TEMPO.transition) / speed();
    sw.wave = waveOn() ? TEMPO.wave * speed() : 0;
    sw.set(pts, { mode: i === 1 ? 'rise' : 'cloud', dur });
    if (!still()) timer = setTimeout(next, dur + TEMPO.hold / speed());
  };
  $(root, '[data-next]').addEventListener('click', next);
  $(root, '[data-wave]').addEventListener('change', () => { sw.wave = waveOn() ? TEMPO.wave * speed() : 0; sw.kick(); });
  $(root, '[data-speed]').addEventListener('change', () => { if (waveOn()) sw.wave = TEMPO.wave * speed(); });
  next();
}

function marquee(root) {
  // Laufband pausiert bei globaler Pause und reduzierter Bewegung
  const sync = () => root.classList.toggle('still', still());
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); sync();
}

// Vorhang-Reveal aus dem Prototyp: Bild öffnet sich von unten, ohne JS ist alles sichtbar
function curtains() {
  const els = document.querySelectorAll('[data-curtain]');
  if (still() || !('IntersectionObserver' in window)) return;
  // beobachtet wird der Elternrahmen: ein per clip-path versteckter Rahmen meldet sonst nie Sichtbarkeit
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.querySelectorAll('[data-curtain]').forEach(c => c.classList.remove('pre')); io.unobserve(e.target); }), { threshold: 0.15 });
  els.forEach(el => { el.classList.add('pre'); io.observe(el.parentElement); });
}

export function initPoc() {
  document.querySelectorAll('[data-logo-lab]').forEach(el => near(el, logoLab));
  document.querySelectorAll('[data-motion-lab]').forEach(el => near(el, motionLab));
  curtains(); // vor allem, was Layout liest, damit die Bilder ohne Zwischenstand verdeckt starten
  document.querySelectorAll('[data-poc-marquee]').forEach(marquee);
  document.querySelectorAll('[data-dot-img]').forEach(el => dotImage(el, { step: +(el.dataset.step || 8) }));
}
