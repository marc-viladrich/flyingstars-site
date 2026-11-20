// Runde 10 (Marc 20.11.2026: „die Motive sind zu weit nach unten gerückt … können an den oberen Rand“, am Handy „zu klein“):
// Einpassung der Bühne (show-field.js, view + fitProjected). Gemessen wird das gezeichnete Bild (screenOf, dieselbe
// Projektion wie render): es steht in der Mitte des freien Teils über der Steuerleiste, stößt nirgends an und füllt ihn.
// Aufruf: node --test scripts/show-fit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createField } from '../src/scripts/show-field.js';

function fixture(t, { width, height, view, fitProjected }) {
  const saved = new Map();
  const set = (key, value) => { saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); };
  t.after(() => { for (const [key, d] of saved) { if (d) Object.defineProperty(globalThis, key, d); else delete globalThis[key]; } });
  const ctx = { setTransform() {}, clearRect() {}, fillRect() {}, createRadialGradient: () => ({ addColorStop() {} }), drawImage() {} };
  set('window', {}); set('devicePixelRatio', 1);
  set('matchMedia', () => ({ matches: false, addEventListener() {} }));
  set('document', { hidden: false, documentElement: { classList: { contains: () => false } }, addEventListener() {}, createElement: () => ({ getContext: () => ctx }) });
  set('IntersectionObserver', class { observe() {} });
  set('requestAnimationFrame', () => 1); set('cancelAnimationFrame', () => {});
  const canvas = { dataset: {}, getContext: () => ctx, getBoundingClientRect: () => ({ width, height }) };
  return createField(canvas, { view, fitProjected });
}
const box = (pts) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
// Formen, wie sie in den Anlässen vorkommen: hoch und flach (Flasche), breit (Schriftzug), mit viel Tiefe (3D-Körper, der
// durch die Kippung der Bühne sonst nach unten rutscht), außermittig gezeichnet (Punkte nicht um 0)
const SHAPES = {
  hoch: Array.from({ length: 200 }, (_, i) => [Math.sin(i) * 0.3, (i / 199) * 2 - 1, 0, 255, 255, 255]),
  breit: Array.from({ length: 200 }, (_, i) => [(i / 199) * 4 - 2, Math.sin(i * 0.7) * 0.3, 0, 255, 255, 255]),
  tief: Array.from({ length: 300 }, (_, i) => { const a = i * 2.399, r = Math.sqrt((i + 1) / 300); return [Math.cos(a) * r, Math.sin(a) * r * 0.6, ((i % 7) / 6) * 1.6 - 0.8, 255, 255, 255]; }),
  versetzt: Array.from({ length: 150 }, (_, i) => [3 + Math.cos(i) * 0.5, 5 + (i / 149) * 1.4, 0, 255, 255, 255]),
};
const STAGES = [[390, 332, 64], [430, 466, 64], [820, 590, 70], [887, 700, 72], [1400, 1000, 74]]; // Breite, Höhe, Steuerleiste

for (const [width, height, bar] of STAGES) {
  test(`${width} × ${height}: jedes Motiv steht mittig über der Steuerleiste, nichts stößt an, das Bild füllt den freien Teil`, (t) => {
    const view = () => ({ top: 8, bottom: bar + 8 }), free = { top: 8, bottom: height - bar - 8 };
    for (const [name, pts] of Object.entries(SHAPES)) {
      const field = fixture(t, { width, height, view, fitProjected: true });
      field.show({ beats: [{ pts, hold: Infinity }] }, 300, 1, { instant: true });
      const b = box(field.screenOf());
      assert.ok(b.y0 >= free.top, `${name}: oben frei (${b.y0.toFixed(1)} ≥ ${free.top})`);
      assert.ok(b.y1 <= free.bottom, `${name}: über der Leiste (${b.y1.toFixed(1)} ≤ ${free.bottom})`);
      assert.ok(b.x0 >= 0 && b.x1 <= width, `${name}: seitlich in der Bühne`);
      assert.ok(Math.abs((b.y0 + b.y1) / 2 - (free.top + free.bottom) / 2) < 0.006 * height, `${name}: senkrecht mittig im freien Teil`);
      assert.ok(Math.abs((b.x0 + b.x1) / 2 - width / 2) < 0.006 * width, `${name}: waagrecht mittig`);
      // die Grenze, die bindet (Breite oder Höhe), ist zu mindestens 80 % genutzt
      const fill = Math.max((b.x1 - b.x0) / width, (b.y1 - b.y0) / (free.bottom - free.top));
      assert.ok(fill > 0.8, `${name}: füllt ${(fill * 100).toFixed(0)} %`);
    }
  });
}

test('ohne view und fitProjected bleibt die Einpassung wie bisher (Himmel)', (t) => {
  const field = fixture(t, { width: 900, height: 600 });
  field.show({ beats: [{ pts: SHAPES.hoch, hold: Infinity }] }, 300, 1, { instant: true });
  const b = box(field.screenOf());
  // S = min(900 · 0.36, 600 · 0.6) = 324, Mitte 450/300, Höhe ± 0,75 · S
  assert.ok(Math.abs((b.y1 - b.y0) - 2 * 0.75 * 324) < 30);
  assert.ok(Math.abs((b.y0 + b.y1) / 2 - 300) < 20);
});

test('Eigenbewegung zählt mit: was ein Bild während seiner Standzeit nach oben trägt, bleibt im freien Teil', (t) => {
  const width = 887, height = 700, bar = 72, view = () => ({ top: 8, bottom: bar + 8 });
  // eine Flasche, aus der ab der zweiten Sekunde eine Fontäne 1,4 Einheiten hoch steigt (wie der Korken bei Silvester)
  const pts = SHAPES.hoch.map((p) => [p[0] * 0.6, p[1] * 0.6, 0, 255, 255, 255]);
  const spray = (b, j, s, o) => { if (j % 5 === 0) o[1] += 1.4 * Math.min(1, Math.max(0, s - 1)); };
  for (const withFitPts of [false, true]) {
    const field = fixture(t, { width, height, view, fitProjected: true });
    field.show({ beats: [{ pts, live: spray, hold: 4, ...(withFitPts ? { fitPts: pts } : {}) }] }, 300, 1, { instant: true });
    const fr = field.screenOf(), y = fr.map((p) => p[1]);
    // in Ruhe (settle zeigt das Ende der Standzeit) steht die Fontäne oben; mit fitPts entscheidet die Szene selbst
    if (!withFitPts) assert.ok(Math.min(...y) >= 8 - 0.5, `Fontäne im Bild (${Math.min(...y).toFixed(1)})`);
    else assert.ok(Math.min(...y) < 8, 'mit fitPts zählt nur, was die Szene nennt');
  }
});
