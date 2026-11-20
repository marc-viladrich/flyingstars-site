// Sechzehnte Fassung (Marc, 31.10.2026: „mit mehr Drohnen neue, komplexere Motive freischalten“). Wächter für die
// Freischalt-Leiter, nur aus den Daten (ohne Motivbau, Laufzeit unter einer Sekunde).
// Runde 9 (20.11.2026): umgestellt auf das Modell je Art der Show (seit Runde 5 bestimmt die Art die Fassung, nicht mehr
// die Drohnenzahl das Paket) und auf die Einstufung 3D/3D+ (scenes/catalog-3d/stufen.js). Je Anlass und Art:
// - am Einstieg der Art spielen mindestens fünf Motive,
// - mehr Drohnen nehmen nie ein Motiv weg (über alle Preisstufen der Art), jede neue Zahl meldet genau die neuen Motive,
// - innerhalb der Art schaltet mehr Drohnen mindestens ein Motiv frei (Ausnahmen unten, offen an Marc),
// - 3D+ zeigt bei derselben Drohnenzahl nie weniger als 3D (2D und 3D sind seit der Einstufung getrennte Mengen),
// - gesperrte Motive nennen ihre Schwelle als Preisstufe, und dort spielen sie.
// Aufruf: node --test scripts/show-unlock.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCASIONS, LADDER, PACKAGE_ORDER, STAGES, unlockAt } from '../src/content/show-configurator.js';
import { DRONE_RANGES, DRONE_STEP, SHOW_ARTS, ART_TIER, artMin, droneStops, stopAtLeast } from '../src/content/show-packages.ts';
import { freshMotifs, canPlay, possibleFrom } from '../src/scripts/show-tempo.js';

const playing = (o, tier, n) => o.motifs.filter((m) => canPlay(m, tier, n));
// Runde 10 (Marc 20.11.2026: „mindestens 2 freigeschaltete Motive“ bei 3D 250): jede Art schaltet in jedem Anlass frei.
const NO_3D_UNLOCK = new Set();

test('Leiter: feste Inhaltsschwellen bleiben unabhängig vom Reglermaximum im Paketbereich', () => {
  assert.deepEqual(LADDER, { SPARK: [100, 150], HORIZON: [200, 250], ODYSSEY: [300, 400] });
  for (const pkg of PACKAGE_ORDER) {
    const { min, max } = DRONE_RANGES[pkg], [a, b] = LADDER[pkg];
    assert.equal(a, min, `${pkg}: erste Sprosse = Einstieg`);
    assert.ok(b > a && b <= max && b % DRONE_STEP === 0, `${pkg}: zweite Sprosse ${b} im Bereich ${min}–${max}`);
  }
});

// Runde 24 (Marc, 06.11.2026: „pro Zielgruppe mindestens 5 Motive“)
test('Am Einstieg jeder Art spielen je Anlass mindestens fünf Motive', () => {
  for (const o of OCCASIONS) for (const art of SHOW_ARTS) {
    const list = playing(o, ART_TIER[art], artMin(art));
    assert.ok(list.length >= 5, `${o.id} ${art} ${artMin(art)}: ${list.map((m) => m.id).join(', ')}`);
  }
});

test('In jeder Art schaltet mehr Drohnen mindestens ein Motiv frei, und die Meldung nennt es', () => {
  const missing = [];
  for (const o of OCCASIONS) for (const art of SHOW_ARTS) {
    const tier = ART_TIER[art], stops = droneStops(art);
    let any = false;
    for (let i = 1; i < stops.length; i++) if (freshMotifs(o.motifs, { pkg: tier, drones: stops[i - 1] }, { pkg: tier, drones: stops[i] }).length) any = true;
    if (!any) missing.push(`${o.id} ${art}`);
  }
  assert.deepEqual(missing, [...NO_3D_UNLOCK].map((id) => `${id} 3d`), 'Freischaltungen je Art');
});

test('Mehr Drohnen nehmen nie ein Motiv weg (je Art über alle Preisstufen), jede neue Zahl meldet genau die neuen Motive', () => {
  for (const o of OCCASIONS) for (const art of SHOW_ARTS) {
    const tier = ART_TIER[art], stops = droneStops(art);
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1], b = stops[i], A = playing(o, tier, a), B = playing(o, tier, b);
      for (const m of A) assert.ok(B.includes(m), `${o.id} ${art}: ${m.id} spielt bei ${a}, aber nicht bei ${b}`);
      const fresh = freshMotifs(o.motifs, { pkg: tier, drones: a }, { pkg: tier, drones: b });
      assert.deepEqual(fresh.map((m) => m.id), B.filter((m) => !A.includes(m)).map((m) => m.id), `${o.id} ${art} ${a} → ${b}`);
    }
  }
});

test('3D+ zeigt bei derselben Drohnenzahl nie weniger als 3D', () => {
  for (const o of OCCASIONS) for (const n of droneStops('story')) {
    const three = playing(o, 'HORIZON', n), plus = playing(o, 'ODYSSEY', n);
    // coveredBy (Runde 10): das Bild steckt in 3D+ in einer Story desselben Anlasses, die dann spielen muss
    for (const m of three) assert.ok(plus.includes(m) || plus.some((x) => x.id === m.coveredBy), `${o.id} ${n}: ${m.id} in 3D, nicht in 3D+`);
  }
});

test('Komplexere Motive später: eine Geschichte ohne kleinere Fassung kommt nach jedem Motiv mit 2D-Fassung', () => {
  for (const o of OCCASIONS) {
    const odysseyOnly = o.motifs.filter((m) => !m.tiers.SPARK && !m.tiers.HORIZON), withSpark = o.motifs.filter((m) => m.tiers.SPARK);
    // Runde 11: 2D reicht jetzt bis 300 (Adventskranz); eine Geschichte ab 300 darf zusammen mit einem 2D-Motiv ab 300 kommen,
    // nur nicht früher als eines.
    for (const s of odysseyOnly) for (const m of withSpark) assert.ok(s.minDrones > m.minDrones || (s.minDrones === m.minDrones && m.minDrones >= 300), `${o.id}: ${s.id} (${s.minDrones}) vor ${m.id} (${m.minDrones})`);
    // minDrones am Motiv = erste Drohnenzahl, bei der es in irgendeiner Art spielt
    for (const m of o.motifs) {
      const first = Math.min(...SHOW_ARTS.flatMap((art) => droneStops(art).filter((n) => canPlay(m, ART_TIER[art], n)).slice(0, 1)));
      assert.equal(stopAtLeast(SHOW_ARTS.find((a) => m.tiers[ART_TIER[a]]), m.minDrones), first, `${o.id} ${m.id}`);
    }
  }
});

test('Gesperrte Motive nennen ihre Schwelle als Preisstufe: dort spielen sie, eine Stufe darunter nicht', () => {
  for (const o of OCCASIONS) for (const art of SHOW_ARTS) {
    const tier = ART_TIER[art], stops = droneStops(art);
    for (const n of stops) for (const m of o.motifs) {
      if (!m.tiers[tier]) continue;
      const at = unlockAt(m, n, tier);
      if (canPlay(m, tier, n)) { assert.equal(at, null, `${o.id} ${m.id} ${art} ${n}: spielt schon`); continue; }
      const shown = stopAtLeast(art, at); // Schloss und Hinweis zeigen die Preisstufe (show-configurator.js drawLocks/tipText)
      assert.ok(shown > n, `${o.id} ${m.id} ${art} ${n}: Schwelle ${shown}`);
      assert.ok(canPlay(m, tier, shown), `${o.id} ${m.id} ${art}: spielt bei ${shown} nicht`);
      const below = stops[stops.indexOf(shown) - 1];
      assert.ok(below === undefined || !canPlay(m, tier, below), `${o.id} ${m.id} ${art}: spielt schon bei ${below}`);
      assert.equal(stopAtLeast(art, possibleFrom(m.tiers[tier], artMin(art))), shown, `${o.id} ${m.id} ${art}: Hinweis an der Spur`);
    }
  }
});

// Runde 10 (Marc 20.11.2026: „Im Idealfall sollte es mindestens 2 freigeschaltete Motive geben … auch bei 150 Drohnen
// mindestens 2 zusätzliche Motive … bei den 2D-Shows“, „überrascht, wie viele neue Motive auf einmal möglich werden, wenn
// man nur auf 110 oder 120 hochschraubt“): Freischaltungen nur auf den Stufen der Art (2D 100/150/200, 3D 200/250,
// 3D+ 300/400), und jede Stufe, die etwas freischaltet, schaltet mindestens zwei Motive frei. Über alle Anlässe und Arten
// aus den Daten, neue Motive und Anlässe sind automatisch dabei.
// Runde 11, erste Welle großer Motive (Marc: „mit 3–5 starten … dann schauen wir weiter“): diese Stufen schalten bisher nur
// ein Motiv frei. Die Liste wird mit jeder Welle kürzer und muss am Ende leer sein; ein neues Motiv auf einer dieser Stufen
// entfernt seine Zeile hier. Marcs Ziel und offene Stufen: docs/show-konfigurator.md, Abschnitt „Große Motive“.
const AUFBAU = [
  'silvester 2d 300: nur adventskranz', 'silvester 3d 300: nur adventskranz',
  'silvester 3d 900: nur countdown', 'silvester story 900: nur countdown',
  'launch 3d 700: nur satellit', 'launch story 700: nur satellit',
  'festival 3d 400: nur tintenfisch',
  'hochzeit 3d 500: nur erstertanz', 'hochzeit story 500: nur erstertanz',
];
test('Freischaltungen nur auf den Stufen der Art, je Stufe mindestens zwei Motive', () => {
  const wrong = [];
  for (const o of OCCASIONS) for (const art of SHOW_ARTS) {
    const tier = ART_TIER[art], stops = droneStops(art);
    for (let i = 1; i < stops.length; i++) {
      const fresh = freshMotifs(o.motifs, { pkg: tier, drones: stops[i - 1] }, { pkg: tier, drones: stops[i] });
      if (!fresh.length) continue;
      if (!STAGES[tier].includes(stops[i])) wrong.push(`${o.id} ${art} ${stops[i]}: keine Stufe (${fresh.map((m) => m.id).join(', ')})`);
      else if (fresh.length < 2) wrong.push(`${o.id} ${art} ${stops[i]}: nur ${fresh[0].id}`);
    }
  }
  assert.deepEqual(wrong, AUFBAU);
});

test('3D 250 und 2D 150 schalten in jedem Anlass mindestens zwei Motive frei', () => {
  for (const o of OCCASIONS) for (const [tier, a, b] of [['HORIZON', 200, 250], ['SPARK', 140, 150]]) {
    const fresh = freshMotifs(o.motifs, { pkg: tier, drones: a }, { pkg: tier, drones: b });
    assert.ok(fresh.length >= 2, `${o.id} ${tier} ${b}: ${fresh.map((m) => m.id).join(', ')}`);
  }
});
