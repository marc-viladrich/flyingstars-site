// Chopper-Spielszene (Hochzeit, „Kinder und Hunde willkommen“), Runde 10. Marc, 20.11.2026: „Random, dass da Punkte überall
// an den Kleidern sind, die Arme so dicht besiedelt und die Beine, insbesondere bei den Mädchen, so wenig besiedelt. Das
// Gesicht kann man nicht richtig erkennen“, „die Illustration könnte ein ganzes Stück größer sein“.
// Runde 10b: „Die Kinder brauchen nur etwas mehr Abstand zu Chopper“, „Chopper kann ruhig auch in der 404-Seite und woanders
// ohne filling dots erscheinen“.
// Wächter: Umrissfiguren mit gleichmäßigem Linienabstand in jedem Körperteil, Gesicht mit Augen und Mund, keine Linie quer
// über das Gesicht, Drohnenzahlen wie angesagt, die Szene füllt jede Bühnenform, Mindestabstand Kind ↔ Chopper über die
// ganze Schleife, Chopper überall derselbe Umriss.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kidFigure, KID_DRONES } from '../src/scripts/effects/chopper-play.js';
import { chopperOutline, CHOPPER_COUNT } from '../src/scripts/effects/chopper.js';

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
/** Abstand jeder Drohne zu ihrer nächsten Nachbarin (über alle Teile der Figur). */
function nearest(pts) {
  return pts.map((p, i) => Math.min(...pts.map((q, j) => (i === j ? Infinity : Math.hypot(p.x - q.x, p.y - q.y)))));
}

for (const kind of ['girl', 'boy']) {
  const f = kidFigure(kind);
  const all = [...f.body, ...f.left, ...f.right], nn = nearest(all), m = median(nn);

  test(`${kind}: Drohnenzahl wie angesagt`, () => {
    assert.equal(f.body.length, KID_DRONES[kind].body);
    assert.equal(f.left.length, KID_DRONES[kind].arm);
    assert.equal(f.right.length, KID_DRONES[kind].arm);
  });

  test(`${kind}: Arme, Beine und Kleidung gleich dicht besetzt (Linienabstand je Teil ±30 % vom Median)`, () => {
    const groups = {
      arme: all.map((p, i) => i).filter((i) => i >= f.body.length),
      beine: f.body.map((p, i) => i).filter((i) => f.body[i].tag === 'skin' && f.body[i].y < 0.3 && f.body[i].y > 0.08),
      kleidung: f.body.map((p, i) => i).filter((i) => ['dress', 'shirt', 'shorts'].includes(f.body[i].tag)),
    };
    for (const [name, idx] of Object.entries(groups)) {
      assert.ok(idx.length >= 12, `${name}: ${idx.length} Drohnen`);
      const g = median(idx.map((i) => nn[i]));
      assert.ok(g > 0.7 * m && g < 1.3 * m, `${name}: ${g.toFixed(4)} gegen ${m.toFixed(4)}`);
    }
  });

  test(`${kind}: Umrisse statt Füllung (keine Drohne mitten in Kleid oder Shirt)`, () => {
    // Mitte des Oberkörpers: dort lag bei den gefüllten Flächen ein Punkteteppich
    const inner = f.body.filter((p) => Math.abs(p.x) < 0.05 && p.y > 0.47 && p.y < 0.66);
    assert.deepEqual(inner, []);
  });

  test(`${kind}: Gesicht mit zwei Augen und einem Mund, nichts Fremdes quer übers Gesicht`, () => {
    assert.equal(f.body.filter((p) => p.tag === 'eye').length, 2);
    assert.ok(f.body.filter((p) => p.tag === 'mouth').length >= 3);
    // Gesichtsfläche innerhalb der Wangen (die Kopflinie selbst liegt bei |x| ≈ 0,085)
    const face = f.body.filter((p) => Math.abs(p.x) < 0.075 && p.y > 0.74 && p.y < 0.84);
    assert.deepEqual(face.filter((p) => !['eye', 'mouth'].includes(p.tag)).map((p) => p.tag), []);
  });
}

test('Chopper als Umriss: Teile und Drohnenzahl wie angesagt, gleich dicht wie die Kinder', () => {
  const d = chopperOutline();
  assert.equal(d.body.length + d.ear.length + d.tail.length + 2 * 17, CHOPPER_COUNT);
  assert.equal(d.body.filter((p) => p.tag === 'eye').length, 1);
  // Bühnenmaß: Kind × K (0,86), Hund × dogSize (0,53), siehe chopper-moods.js
  const kid = median(nearest([...kidFigure('girl').body])) * 0.86, dog = median(nearest(d.body)) * 0.53;
  assert.ok(dog > 0.7 * kid && dog < 1.4 * kid, `Hund ${dog.toFixed(4)} gegen Kind ${kid.toFixed(4)}`);
});

test('Chopper überall ohne Füllpunkte: eine Quelle für 404, Danke-Seite, Team und Spielszene', () => {
  const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
  const chopper = read('scripts/effects/chopper.js'), moods = read('scripts/effects/chopper-moods.js'), page404 = read('components/Chopper404.astro');
  assert.doesNotMatch(chopper, /formation\(\{ kind: 'svg'/, 'keine abgetastete SVG-Fläche mehr');
  assert.match(chopper, /assemble\(/);
  assert.match(moods, /const p = await chopperParts\(\);/, 'alle Stimmungen nutzen denselben Hund');
  assert.match(page404, /chopperParts\(\)/);
  // Rumpfmitte: bei der gefüllten Fläche lag dort ein Punkteteppich (Bühnenrahmen, Rumpf-Ellipse um 184|178 SVG-Pixel)
  const d = chopperOutline(), S = (420 - 6) / 400, RW = Math.round(400 * S) + 6, RH = Math.round(300 * S) + 6;
  const [cx, cy] = [(3 + 184 * S - RW / 2) * 2 / RW, (3 + 178 * S - RH / 2) * 2 / RW], r = (20 * 2 * S) / RW;
  assert.deepEqual(d.body.filter((p) => Math.hypot(p.x - cx, p.y - cy) < r), []);
});

test('Kinder halten über die ganze Schleife Abstand zu Chopper (auch bei Wurf, Sprung und Fang)', async () => {
  const { chopperMood } = await import('../src/scripts/effects/chopper-moods.js');
  const { count, behaviour } = await chopperMood('play');
  const kid = (k) => KID_DRONES[k].body + 2 * KID_DRONES[k].arm, D = CHOPPER_COUNT;
  const ranges = { girl: [D, D + kid('girl')], boy: [D + kid('girl'), D + kid('girl') + kid('boy')] };
  const tx = new Float32Array(count), ty = new Float32Array(count), sw = { w: 740, h: 416, scale: 0.7, retarget() {} };
  const min = { girl: Infinity, boy: Infinity };
  for (let T = 1; T < 1 + 12.4; T += 1 / 30) {
    behaviour(T, tx, ty, sw);
    for (const [k, [a, b]] of Object.entries(ranges)) for (let i = a; i < b; i++) for (let d = 0; d < D; d++) min[k] = Math.min(min[k], Math.hypot(tx[i] - tx[d], ty[i] - ty[d]));
  }
  // Stand vorher (ab299e8): 0,064 bzw. 0,033 Einheiten, die Schwanzspitze traf die Hand des wartenden Kindes
  for (const k of ['girl', 'boy']) assert.ok(min[k] >= 0.095, `${k}: ${min[k].toFixed(3)}`);
});

test('die Szene füllt jede Bühnenform und hängt nicht mehr an einem festen Anteil', async () => {
  const src = readFileSync(new URL('../src/scripts/effects/chopper-moods.js', import.meta.url), 'utf8');
  const box = JSON.parse(src.match(/export const PLAY_BOX = (\{.*\});/)[1].replace(/(\w+):/g, '"$1":'));
  const scale = (w, h) => Math.min(w / box.w, h / box.h) / Math.min(w, h);
  for (const [w, h] of [[740, 493], [358, 268], [760, 507], [1000, 667]]) {
    const unit = scale(w, h) * Math.min(w, h);
    assert.ok(unit * box.w <= w + 0.5 && unit * box.h <= h + 0.5, `${w}×${h}`);
    assert.ok(unit * box.w >= w - 0.5 || unit * box.h >= h - 0.5, `${w}×${h} nutzt die Bühne nicht`);
  }
  assert.match(src, /sw\.scale = playScale\(sw\.w, sw\.h\)/);
  // Kinderhöhe bei 1440 px (Bühne 740 × 416): vorher rund 200 px
  assert.ok(0.86 * scale(740, 416) * 416 > 260, `${(0.86 * scale(740, 416) * 416).toFixed(0)} px`);
  const astro = readFileSync(new URL('../src/components/Chopper.astro', import.meta.url), 'utf8');
  assert.match(astro, /\.chopper-mood\.is-play \{ aspect-ratio: 16 \/ 9; \}/);
});

test('über eine ganze Schleife bleibt jede Drohne im Rahmen PLAY_BOX und die Szene nutzt ihn', async () => {
  const { chopperMood, PLAY_BOX } = await import('../src/scripts/effects/chopper-moods.js');
  const { count, behaviour } = await chopperMood('play');
  const tx = new Float32Array(count), ty = new Float32Array(count), sw = { w: 740, h: 416, scale: 0.7, retarget() {} };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let T = 1; T < 1 + 12.4; T += 1 / 30) {
    behaviour(T, tx, ty, sw);
    for (let i = 0; i < count; i++) { x0 = Math.min(x0, tx[i]); x1 = Math.max(x1, tx[i]); y0 = Math.min(y0, ty[i]); y1 = Math.max(y1, ty[i]); }
  }
  const rim = 0.02; // Platz für das Licht selbst
  assert.ok(-x0 + rim <= PLAY_BOX.w / 2 && x1 + rim <= PLAY_BOX.w / 2, `x ${x0.toFixed(3)} … ${x1.toFixed(3)}`);
  assert.ok(-y0 + rim <= PLAY_BOX.h / 2 && y1 + rim <= PLAY_BOX.h / 2, `y ${y0.toFixed(3)} … ${y1.toFixed(3)}`);
  assert.ok(x1 - x0 > 0.92 * PLAY_BOX.w, 'Breite wird genutzt');
});
