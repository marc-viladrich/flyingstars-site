// Spielt eine Show des Konfigurators in Node mit der echten Engine (src/scripts/show-field.js) ab, ohne Browser:
// Canvas, matchMedia, IntersectionObserver und requestAnimationFrame sind Attrappen, die Show-Uhr läuft mit festen
// Bildschritten. Jedes Bild liefert die Positionen aller Drohnen in der Luft (Anzeigeeinheiten) an onFrame.
// Nur für Tests (scripts/show-finte.test.mjs).
import './show-node-env.mjs';

const noop = () => {};
const ctx2d = { setTransform: noop, clearRect: noop, drawImage: noop, beginPath: noop, arc: noop, fill: noop, fillRect: noop, createRadialGradient: () => ({ addColorStop: noop }), set globalCompositeOperation(v) {}, set globalAlpha(v) {}, set fillStyle(v) {} };
const fakeCanvas = () => ({ width: 0, height: 0, dataset: {}, getContext: () => ctx2d, getBoundingClientRect: () => ({ width: 960, height: 640 }) });
let queue = [];
Object.assign(globalThis, {
  window: globalThis,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener: noop }),
  requestAnimationFrame: (cb) => { queue.push(cb); return queue.length; },
  cancelAnimationFrame: () => { queue = []; },
  IntersectionObserver: class { constructor(cb) { this.cb = cb; } observe() { this.cb([{ isIntersecting: true }]); } },
});
globalThis.document = { hidden: false, documentElement: { classList: { contains: () => false } }, addEventListener: noop, createElement: fakeCanvas };

const { createField } = await import('../src/scripts/show-field.js');
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { SHOW_PACKAGES } = await import('../src/content/show-packages.ts');

/**
 * Baut die Folge eines Anlasses für Paket und Drohnenzahl und spielt sie ab Bild `at` ab, bis die Runde einmal
 * herum ist (oder `seconds` vergangen sind). onFrame(t, pos, beat, active, field) bekommt die Positionen (flach, x y z
 * je Drohne) der Drohnen, die gerade ein Bild tragen (active), und den Index des laufenden Bildes. wrap(get) bekommt
 * eine Funktion, die je Bild die Zuordnung Drohne → Punkt des laufenden Bildes liefert.
 */
export async function simulate({ motifs, occasion, pkg, n, fps = 30, seconds = Infinity, at = 0, onFrame, wrap }) {
  const scene = await buildSequence(motifs, pkg, n, undefined, occasion);
  const canvas = fakeCanvas();
  const field = createField(canvas, {});
  let last = null, laps = 0;
  window.__showTrace = { push: ([t, pos, beat, active]) => { onFrame?.(t, pos, beat, active, scene, field); if (last !== null && beat < last) laps++; last = beat; } };
  queue = [];
  field.show(scene, n, Math.min(1, Math.sqrt(n / SHOW_PACKAGES.ODYSSEY.base)), { at });
  if (wrap) {
    // Zuordnung Drohne → Bildpunkt mitschreiben: die Engine fragt live() je Bild für jede Drohne i = 0, 1, … nach ihrem
    // Punkt order[i]. Erst nach show() eingehängt, damit der Maßstab (fit) unverändert bleibt.
    let calls = [];
    for (const b of scene.beats) { const own = b.live; b.live = (p, j, t, o, ...rest) => { calls.push(j); own?.(p, j, t, o, ...rest); }; }
    wrap(() => { const r = calls; calls = []; return r; });
  }
  let ms = 1000, frames = 0;
  while (queue.length && laps < 1 && frames < seconds * fps) {
    const cbs = queue; queue = [];
    ms += 1000 / fps; frames++;
    for (const cb of cbs) cb(ms);
  }
  window.__showTrace = null;
  return { scene, frames };
}
