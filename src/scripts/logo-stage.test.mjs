// Runde 9, Punkt 4 (Marc 19.11.2026: Shell „sieht ganz anders aus als im Logo-Konfigurator selbst“). Wächter über alle
// Beispiele und beide Bühnen (1440 und 390 px, gemessen): das Logo steht im Logo-Modus ganz über der Hinweiskarte und in
// der Bühne, und die Show bekommt nach „Dieses Logo in der Show verwenden“ genau dieselben leuchtenden Punkte.
// Aufruf: node --test src/scripts/logo-stage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePoints } from './logo-v10/prepared.mjs';
import { logoFrame, LOGO_AREA } from './logo-stage.mjs';
import { createField } from './show-field.js';
import { SHOW_ARTS, stopAtLeast, artMin } from '../content/show-packages.ts';
import { LANDMARK_EXAMPLES } from './logo-examples.mjs';
import { landmarkFormation } from './logo-landmark.mjs';

const dir = new URL('../../public/media/logo-modus/beispiele/', import.meta.url);
// Runde 14: dazu die Wahrzeichen-Beispiele (Bremen = Stadtfest-Schlüssel, ohne vorberechnete Daten, bis 300 Drohnen)
const ids = [...JSON.parse(fs.readFileSync(new URL('sizes.json', dir))).map((x) => x.id), ...Object.keys(LANDMARK_EXAMPLES)];
const counts = (id) => (LANDMARK_EXAMPLES[id] ? [100, 150, 200, LANDMARK_EXAMPLES[id].max] : [100, 150, 200]);
// gemessen im Konfigurator: Bühne, Hinweiskarte (über die Breite) und Minimap (rechts unten), CSS-Pixel relativ zur Bühne
const STAGES = [
  { name: '1440', W: 844, H: 454, covers: [] },
  { name: '1440 Minimap', W: 844, H: 454, covers: [{ top: 396, left: 742, right: 830 }] },
  { name: '1440 Karte', W: 844, H: 454, covers: [{ top: 343, left: 160, right: 684 }] },
  { name: '390', W: 390, H: 422, covers: [] },
  { name: '390 Minimap', W: 390, H: 422, covers: [{ top: 370, left: 318, right: 380 }] },
  { name: '390 Karte', W: 390, H: 422, covers: [{ top: 300, left: 12, right: 378 }] },
];
const lit = (id, n) => { if (LANDMARK_EXAMPLES[id]) return landmarkFormation(id, n).map((q) => [q.x, -q.y, 0, ...q.c]); const d = JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir))), f = d.formations[d.steps[n]], p = decodePoints(f.p), out = []; for (let i = 0; i < p.length; i += 5) out.push([p[i] / 1000, -p[i + 1] / 1000, 0, ...d.palette[p[i + 2]]]); return out; };

// Runde 10b: gemessen wird das gezeichnete Logo auf der echten Bühne (show-field.js, Logo-Modus: Steuerleiste
// ausgeblendet, view oben 8 px), nicht eine Nachrechnung der Abbildung
function screenBox(t, pts, st) {
  const saved = new Map(), set = (k, v) => { saved.set(k, Object.getOwnPropertyDescriptor(globalThis, k)); Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: v }); };
  t.after(() => { for (const [k, d] of saved) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } });
  const ctx = { setTransform() {}, clearRect() {}, fillRect() {}, createRadialGradient: () => ({ addColorStop() {} }), drawImage() {} };
  set('window', {}); set('devicePixelRatio', 1); set('matchMedia', () => ({ matches: false, addEventListener() {} }));
  set('document', { hidden: false, documentElement: { classList: { contains: () => false } }, addEventListener() {}, createElement: () => ({ getContext: () => ctx }) });
  set('IntersectionObserver', class { observe() {} }); set('requestAnimationFrame', () => 1); set('cancelAnimationFrame', () => {});
  const field = createField({ dataset: {}, getContext: () => ctx, getBoundingClientRect: () => ({ width: st.W, height: st.H }) }, { view: () => ({ top: 8, bottom: 0 }), fitProjected: true });
  // wie logoBeat: dunkle Reserve dahinter, live blendet sie aus
  const reserve = Array.from({ length: 20 }, (_, i) => [pts[i % pts.length][0], pts[i % pts.length][1], -0.45, 0, 0, 0]);
  const frame = logoFrame(pts, st);
  field.show({ beats: [{ pts: [...pts, ...reserve], hold: Infinity, live: (_, j, __, o) => { if (j >= pts.length) o[3] = 0; }, ...frame }] }, pts.length + 20, 1, { instant: true });
  const xy = field.screenOf().slice(0, pts.length), ys = xy.map((p) => p[1]), xs = xy.map((p) => p[0]);
  return { frame, top: Math.min(...ys), bottom: Math.max(...ys), left: Math.min(...xs), right: Math.max(...xs) };
}

for (const id of ids) test(`${id}: im Logo-Modus mittig im freien Teil, über der Karte, nie an den Rand gedrückt`, (t) => {
  for (const n of counts(id)) for (const st of STAGES) {
    const pts = lit(id, n), b = screenBox(t, pts, st), tag = `${id} ${n} ${st.name}`;
    // nie über einer Abdeckung; mittig im ganzen Band oder, wenn es ausweichen muss, im Band über der Abdeckung
    for (const c of st.covers) assert.ok(!(c.left < b.right && c.right > b.left && b.bottom > c.top - 1), `${tag}: Logo über der Abdeckung`);
    const top = LOGO_AREA.top * st.H, bands = [LOGO_AREA.bottom * st.H, ...st.covers.filter((c) => c.left < b.right && c.right > b.left).map((c) => c.top - LOGO_AREA.gap * st.H)];
    assert.ok(b.top >= top - 1.5, `${tag}: Oberkante ${b.top.toFixed(0)} < ${top.toFixed(0)}`);
    const off = Math.min(...bands.map((bottom) => Math.abs((b.top - top) - (bottom - b.bottom))));
    assert.ok(off <= 0.02 * st.H + 1, `${tag}: nicht mittig (oben ${(b.top - top).toFixed(0)} px, unten ${bands.map((x) => (x - b.bottom).toFixed(0)).join(' / ')} px)`);
    const bottom = Math.min(...bands);
    // so groß, wie das Band erlaubt: fast seine Höhe, fast die erlaubte Breite oder die Obergrenze 1,6 × normal
    const fill = Math.max((b.bottom - b.top) / (bottom - top), (b.right - b.left) / (LOGO_AREA.width * st.W));
    assert.ok(fill >= 0.85, `${tag}: Logo zu klein (${(fill * 100).toFixed(0)} %)`);
    assert.ok(b.left >= 0 && b.right <= st.W, `${tag}: seitlich in der Bühne`);
    assert.ok(b.frame.fitPts.every((p, i) => p === pts[i]) && b.frame.fitPts.length === pts.length, 'gezeichnete Punkte unverändert, kein Hilfspunkt');
  }
});

test('Show nach der Übernahme: Drohnenzahl ≥ Bedarf, also dieselbe Formation (showLogoPoints nimmt sie unverändert)', () => {
  for (const id of ids) for (let n = 100; n <= 200; n += 10) {
    const need = lit(id, n).length;
    for (const art of SHOW_ARTS) { const drones = stopAtLeast(art, Math.max(artMin(art), need)); assert.ok(drones >= need, `${id} ${n} ${art}: ${drones} < ${need}`); }
  }
});
