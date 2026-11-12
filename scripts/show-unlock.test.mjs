// Sechzehnte Fassung (Marc, 31.10.2026: „mit mehr Drohnen neue, komplexere Motive freischalten“). Wächter für die
// Freischalt-Leiter, nur aus den Daten (ohne Motivbau, Laufzeit unter einer Sekunde): Für jeden Anlass und jedes Paket
// - am Einstieg des Pakets spielen mindestens drei Motive,
// - innerhalb des Paketbereichs schaltet mehr Drohnen mindestens ein Motiv frei,
// - mehr Drohnen nehmen nie ein Motiv weg (über den ganzen Regler, auch über Paketgrenzen),
// - ODYSSEY zeigt nie weniger Motive als HORIZON, HORIZON nie weniger als SPARK,
// - jede Freischaltung löst die Meldung aus (freshMotifs nicht leer), und gesperrte Motive nennen ihre Schwelle.
// Aufruf: node --test scripts/show-unlock.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCASIONS, LADDER, PACKAGE_ORDER, playable, unlockAt } from '../src/content/show-configurator.js';
import { DRONE_RANGES, DRONE_STEP, DRONES_MIN, DRONES_MAX, packageForDrones } from '../src/content/show-packages.ts';
import { freshMotifs, canPlay, possibleFrom } from '../src/scripts/show-tempo.js';

const counts = []; for (let n = DRONES_MIN; n <= DRONES_MAX; n += DRONE_STEP) counts.push(n);
const playing = (o, n) => o.motifs.filter((m) => playable(m, packageForDrones(n), n));

test('Leiter: feste Inhaltsschwellen bleiben unabhängig vom Reglermaximum im Paketbereich', () => {
  assert.deepEqual(LADDER, { SPARK: [100, 150], HORIZON: [200, 250], ODYSSEY: [300, 450] });
  for (const pkg of PACKAGE_ORDER) {
    const { min, max } = DRONE_RANGES[pkg], [a, b] = LADDER[pkg];
    assert.equal(a, min, `${pkg}: erste Sprosse = Einstieg`);
    assert.ok(b > a && b <= max && b % DRONE_STEP === 0, `${pkg}: zweite Sprosse ${b} im Bereich ${min}–${max}`);
  }
});

// Runde 24 (Marc, 06.11.2026: „pro Zielgruppe mindestens 5 Motive“): vorher drei
test('Am Einstieg jedes Pakets spielen je Anlass mindestens fünf Motive', () => {
  for (const o of OCCASIONS) for (const pkg of PACKAGE_ORDER) {
    const n = DRONE_RANGES[pkg].min, list = playing(o, n);
    assert.ok(list.length >= 5, `${o.id} ${pkg} ${n}: ${list.map((m) => m.id).join(', ')}`);
  }
});

test('In jedem Paket schaltet mehr Drohnen mindestens ein Motiv frei, und die Meldung nennt es', () => {
  for (const o of OCCASIONS) for (const pkg of PACKAGE_ORDER) {
    const { min, max } = DRONE_RANGES[pkg], steps = [];
    for (let n = min + DRONE_STEP; n <= max; n += DRONE_STEP) {
      const fresh = freshMotifs(o.motifs, { pkg, drones: n - DRONE_STEP }, { pkg, drones: n });
      if (fresh.length) steps.push(`${n}: ${fresh.map((m) => m.id).join(', ')}`);
    }
    assert.ok(steps.length >= 1, `${o.id} ${pkg}: keine Freischaltung zwischen ${min} und ${max}`);
  }
});

test('Mehr Drohnen nehmen nie ein Motiv weg (über den ganzen Regler), jede neue Zahl meldet genau die neuen Motive', () => {
  for (const o of OCCASIONS) for (let i = 1; i < counts.length; i++) {
    const a = counts[i - 1], b = counts[i], A = playing(o, a), B = playing(o, b);
    for (const m of A) assert.ok(B.includes(m), `${o.id}: ${m.id} spielt bei ${a}, aber nicht bei ${b}`);
    const fresh = freshMotifs(o.motifs, { pkg: packageForDrones(a), drones: a }, { pkg: packageForDrones(b), drones: b });
    assert.deepEqual(fresh.map((m) => m.id), B.filter((m) => !A.includes(m)).map((m) => m.id), `${o.id} ${a} → ${b}`);
  }
});

test('Größere Pakete zeigen nie weniger: ODYSSEY ⊇ HORIZON ⊇ SPARK bei jeder Drohnenzahl', () => {
  for (const o of OCCASIONS) for (let p = 1; p < PACKAGE_ORDER.length; p++) {
    const lo = PACKAGE_ORDER[p - 1], hi = PACKAGE_ORDER[p];
    const most = playing(o, DRONE_RANGES[lo].max), least = playing(o, DRONE_RANGES[hi].min);
    for (const m of most) assert.ok(least.includes(m), `${o.id}: ${m.id} in ${lo} ${DRONE_RANGES[lo].max}, nicht in ${hi} ${DRONE_RANGES[hi].min}`);
    assert.ok(least.length >= most.length, `${o.id}: ${hi} zeigt weniger als ${lo}`);
  }
});

test('Komplexere Motive später: eine Geschichte ohne kleinere Fassung kommt nach jedem Motiv mit SPARK-Fassung', () => {
  for (const o of OCCASIONS) {
    const odysseyOnly = o.motifs.filter((m) => !m.tiers.SPARK && !m.tiers.HORIZON), withSpark = o.motifs.filter((m) => m.tiers.SPARK);
    for (const s of odysseyOnly) for (const m of withSpark) assert.ok(s.minDrones > m.minDrones, `${o.id}: ${s.id} (${s.minDrones}) vor ${m.id} (${m.minDrones})`);
    // minDrones am Motiv = erste Drohnenzahl, bei der es spielt
    for (const m of o.motifs) {
      const first = counts.find((n) => playable(m, packageForDrones(n), n));
      assert.equal(m.minDrones, first, `${o.id} ${m.id}`);
    }
  }
});

test('Gesperrte Motive nennen ihre Schwelle: unlockAt, Hinweis an der Spur und Freischalten passen zusammen', () => {
  for (const o of OCCASIONS) for (const n of counts) for (const m of o.motifs) {
    const pkg = packageForDrones(n), at = unlockAt(m, n);
    if (playable(m, pkg, n)) { assert.equal(at, null, `${o.id} ${m.id} ${n}: spielt schon`); continue; }
    assert.ok(at > n, `${o.id} ${m.id} ${n}: Schwelle ${at}`);
    assert.ok(canPlay(m, packageForDrones(at), at) && !canPlay(m, packageForDrones(at - DRONE_STEP), at - DRONE_STEP), `${o.id} ${m.id}: spielt ab ${at}, nicht bei ${at - DRONE_STEP}`);
    // dieselbe Zahl, die der Hinweis an der Spur im Paket der Schwelle nennt
    const p = packageForDrones(at);
    assert.equal(possibleFrom(m.tiers[p], DRONE_RANGES[p].min), at, `${o.id} ${m.id}: Hinweis`);
  }
});
