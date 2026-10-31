import test from 'node:test';
import assert from 'node:assert/strict';
import { DRONE_RANGES, DRONE_STEP, DRONES_MIN, DRONES_MAX, PACKAGE_NAMES, packageForDrones, snapDrones, clampToPackage, configuratorPrice, priceFor } from '../src/content/show-packages.ts';

// Zwölfte Fassung: Paket und Drohnenzahl sind preisbindend, jedes Paket hat einen eigenen Drohnenbereich.
const selectable = [];
for (let n = DRONES_MIN; n <= DRONES_MAX; n += DRONE_STEP) if (snapDrones(n) === n) selectable.push(n);

test('Bereiche sind getrennt, aufsteigend, lückenlos und decken die Reglergrenzen ab (dreizehnte Fassung)', () => {
  const ranges = PACKAGE_NAMES.map((p) => DRONE_RANGES[p]);
  ranges.forEach((r, i) => { assert.ok(r.min <= r.max); if (i) assert.equal(r.min, ranges[i - 1].max + DRONE_STEP, 'der nächste Bereich beginnt eine Stufe nach dem vorigen'); });
  assert.equal(ranges[0].min, DRONES_MIN); assert.equal(ranges.at(-1).max, DRONES_MAX);
  for (let n = DRONES_MIN; n <= DRONES_MAX; n += DRONE_STEP) assert.equal(snapDrones(n), n, `${n} ist wählbar, ohne umgesetzt zu werden`);
});

test('Jede wählbare Drohnenzahl gehört zu genau einem Paket, der Preis steigt nie, wenn Drohnen dazukommen', () => {
  let last = 0;
  for (const n of selectable) {
    const p = packageForDrones(n), price = configuratorPrice(n);
    assert.ok(n >= DRONE_RANGES[p].min && n <= DRONE_RANGES[p].max, `${n} liegt in ${p}`);
    assert.ok(Number.isFinite(price) && price >= last, `${n}: ${price} ≥ ${last}`);
    last = price;
  }
});

test('HORIZON kostet nie mehr als ODYSSEY bei gleicher oder höherer Drohnenzahl (und SPARK nie mehr als HORIZON)', () => {
  for (const [lo, hi] of [['SPARK', 'HORIZON'], ['HORIZON', 'ODYSSEY']]) {
    const maxLo = Math.max(...selectable.filter((n) => packageForDrones(n) === lo).map(configuratorPrice));
    const minHi = Math.min(...selectable.filter((n) => packageForDrones(n) === hi).map(configuratorPrice));
    assert.ok(maxLo < minHi, `${lo} höchstens ${maxLo} €, ${hi} ab ${minHi} €`);
  }
  for (const a of selectable) for (const b of selectable) if (b >= a && packageForDrones(a) === 'HORIZON' && packageForDrones(b) === 'ODYSSEY') assert.ok(configuratorPrice(a) <= configuratorPrice(b), `HORIZON ${a} ≤ ODYSSEY ${b}`);
});

test('Ziehen und Hovern über die Paketgrenze: kein Hin und Her (Marc, 30.10.2026)', () => {
  // Nachbau dessen, was der Regler beim Ziehen meldet: viele input-Ereignisse mit dem Wert unter dem Zeiger, auch
  // mehrfach derselbe Wert (Zittern der Hand). Die Seite übernimmt snapDrones(Wert, bisher). Vorher (Lücke 160–190)
  // kippte derselbe Zeigerwert zwischen 150 und 200; jetzt muss jeder Wert genau so übernommen werden.
  for (const [a, b] of [[DRONE_RANGES.SPARK.max, DRONE_RANGES.HORIZON.min], [DRONE_RANGES.HORIZON.max, DRONE_RANGES.ODYSSEY.min]]) {
    let value = a - 3 * DRONE_STEP;
    const seen = [];
    for (const pointer of [a - 20, a - 10, a, a + 5, a + 10, b, b - 5, a + 5, a, a + 10, b, b, b + 10, b, a, a]) { value = snapDrones(pointer, value); seen.push(value); }
    seen.forEach((v, i) => assert.equal(v, snapDrones([a - 20, a - 10, a, a + 5, a + 10, b, b - 5, a + 5, a, a + 10, b, b, b + 10, b, a, a][i]), 'der Wert folgt dem Zeiger'));
    // der Zeiger bleibt auf einer Stelle: der Wert (und damit das Paket) bleibt stehen
    for (const pointer of [a, a + 4, b - 4, b]) { let v = value; const pkgs = new Set(); for (let k = 0; k < 20; k++) { v = snapDrones(pointer, v); pkgs.add(packageForDrones(v)); } assert.equal(pkgs.size, 1, `Zeiger bei ${pointer}: ein Paket`); }
  }
  assert.equal(packageForDrones(DRONE_RANGES.SPARK.max), 'SPARK'); assert.equal(packageForDrones(DRONE_RANGES.HORIZON.min), 'HORIZON');
  assert.equal(packageForDrones(DRONE_RANGES.HORIZON.max + DRONE_STEP), 'ODYSSEY');
  assert.equal(snapDrones(DRONES_MAX + 500), DRONES_MAX); assert.equal(snapDrones(3), DRONES_MIN);
  assert.equal(clampToPackage('HORIZON', 450), DRONE_RANGES.HORIZON.max); assert.equal(clampToPackage('ODYSSEY', 120), DRONE_RANGES.ODYSSEY.min);
});

test('Einstiegspreise bleiben die bekannten Paketpreise', () => {
  for (const p of PACKAGE_NAMES) assert.equal(configuratorPrice(DRONE_RANGES[p].min), priceFor(p, DRONE_RANGES[p].min));
  assert.equal(configuratorPrice(100), 7900); assert.equal(configuratorPrice(200), 15900); assert.equal(configuratorPrice(300), 34900);
  // bis 150 Drohnen wie die Referenz (Preisseite), darüber der Platzhalter-Aufpreis
  for (let n = 100; n <= 150; n += 10) assert.equal(configuratorPrice(n), priceFor('SPARK', n));
  assert.equal(configuratorPrice(190), 15200);
});

// ---------- Vierzehnte Fassung (A): Freischalten, Hinweis an der Spur, Abfolge, Lichtlauf ----------
import { OCCASIONS } from '../src/content/show-configurator.js';
import { canPlay, freshMotifs, unlockNote, possibleFrom, minDronesOf, composeShow, rankOf, runLight, hilbertOrder, LOGO_SEGMENT, TOUR_SEGMENT, TEMPO } from '../src/scripts/show-tempo.js';

test('Freischalten: auch ein Paketwechsel meldet alle neuen Motive, in der Reihenfolge des Anlasses', () => {
  for (const o of OCCASIONS) {
    for (const [a, b] of [[{ pkg: 'SPARK', drones: 190 }, { pkg: 'HORIZON', drones: 200 }], [{ pkg: 'ODYSSEY', drones: 300 }, { pkg: 'ODYSSEY', drones: 600 }], [{ pkg: 'HORIZON', drones: 290 }, { pkg: 'ODYSSEY', drones: 600 }]]) {
      const fresh = freshMotifs(o.motifs, a, b);
      // genau die Motive, die jetzt spielen und vorher nicht
      assert.deepEqual(fresh.map((m) => m.id), o.motifs.filter((m) => canPlay(m, b.pkg, b.drones) && !canPlay(m, a.pkg, a.drones)).map((m) => m.id));
      assert.deepEqual(fresh, o.motifs.filter((m) => fresh.includes(m)), 'Reihenfolge des Anlasses');
      assert.deepEqual(freshMotifs(o.motifs, b, a).filter((m) => fresh.includes(m)), [], 'zurück: nichts davon ist neu');
    }
  }
  // Hochzeit (vierzehnte Fassung, Teil B): Lotusblüten gibt es nur als ODYSSEY-Geschichte ab 300, den Antrag ab 450.
  // Der Paketwechsel HORIZON → ODYSSEY schaltet die Lotusblüten frei, der Sprung bis 600 beide auf einmal.
  const wedding = OCCASIONS.find((o) => o.id === 'hochzeit').motifs, ids = (list) => list.map((m) => m.id);
  assert.deepEqual(ids(freshMotifs(wedding, { pkg: 'HORIZON', drones: 290 }, { pkg: 'ODYSSEY', drones: 300 })), ['lotus']);
  assert.deepEqual(ids(freshMotifs(wedding, { pkg: 'HORIZON', drones: 290 }, { pkg: 'ODYSSEY', drones: 600 })), ['lotus', 'antrag']);
  assert.deepEqual(ids(freshMotifs(wedding, { pkg: 'ODYSSEY', drones: 440 }, { pkg: 'ODYSSEY', drones: 450 })), ['antrag']);
  // jeder Anlass hat beim Einstieg in ODYSSEY mindestens ein neues Motiv (Schwelle UNLOCK[0] = 300)
  for (const o of OCCASIONS) assert.ok(freshMotifs(o.motifs, { pkg: 'HORIZON', drones: 290 }, { pkg: 'ODYSSEY', drones: 300 }).length >= 1, o.id);
  assert.equal(unlockNote([{ label: 'Ring' }]), 'Neues Motiv freigeschaltet: Ring');
  assert.equal(unlockNote([{ label: 'Ring' }, { label: 'Lotusblüten' }, { label: 'Herz' }]), '3 neue Motive: Ring, Lotusblüten, Herz');
});

test('Mindestzahl: minDrones vor min, der Hinweis an der Spur nie unter dem Paketbereich', () => {
  assert.equal(minDronesOf({ minDrones: 420, min: 450 }), 420);
  assert.equal(minDronesOf({ min: 450 }), 450);
  assert.equal(minDronesOf({}), 0);
  assert.equal(possibleFrom({}, DRONE_RANGES.ODYSSEY.min), 300);
  assert.equal(possibleFrom({ min: 450 }, DRONE_RANGES.ODYSSEY.min), 450);
  for (const o of OCCASIONS) for (const m of o.motifs) for (const p of PACKAGE_NAMES) if (m.tiers[p]) {
    const from = possibleFrom(m.tiers[p], DRONE_RANGES[p].min);
    assert.ok(canPlay(m, p, Math.max(from, DRONE_RANGES[p].min)), `${o.id} ${m.id} ${p} spielt ab ${from}`);
    if (from > DRONE_RANGES[p].min) assert.ok(!canPlay(m, p, from - DRONE_STEP), `${o.id} ${m.id} ${p} nicht unter ${from}`);
  }
});

const line = (n, dx = 1) => Array.from({ length: n }, (_, i) => [(i / n) * dx, 0, 0, 255, 255, 255]);
test('Abfolge: Text-Durchlauf einmal vorn, Logo eröffnet die Runde und kehrt jedes zweite Motiv zurück', () => {
  const b = (segment, extra = {}) => ({ segment, pts: line(10), hold: 2, ...extra });
  const main = { beats: [b(0), b(0, { cloud: true }), b(1, { cloud: true }), b(2, { cloud: true }), b(3, { interlude: true, cloud: true }), b(3), b(4, { interlude: true, cloud: true }), b(4), b(0, { interlude: true, cloud: true })], loopTo: 0 };
  const tour = { beats: [b(0, { hold: 3 }), b(0, { hold: 3 }), b(0, { hold: 9 }), b(1, { hold: 9 }), b(2, { interlude: true }), b(2, { hold: 9, tour: false }), b(2, { hold: 9 })] };
  const s = composeShow({ main, tour, logo: line(10), textStyle: 'print', textSegment: 4, tourCaption: (c, st) => `T ${st}` });
  const intro = s.beats.slice(0, s.loopTo), round = s.beats.slice(s.loopTo);
  assert.deepEqual(intro.map((x) => x.textStyle), ['script', 'script', 'print', 'initials'], 'je Schrift bis sie 5 s stand, ohne Figuren und ohne tour: false');
  assert.deepEqual(intro.map((x) => x.segment), [TOUR_SEGMENT, TOUR_SEGMENT, TOUR_SEGMENT + 1, TOUR_SEGMENT + 2]);
  assert.equal(intro[0].caption, 'T script');
  assert.deepEqual(round.map((x) => (x.logo ? 'L' : x.segment)), ['L', 0, 0, 1, 'L', 2, 3, 3, 'L', 4, 4], 'Logo vorn, dann vor jedem zweiten Motiv (vor dessen Figur); die Schlussfigur entfällt');
  assert.ok(round.filter((x) => x.logo).every((x) => x.cloud === true && x.hold === TEMPO.logoHold && x.segment === LOGO_SEGMENT));
  assert.equal(round[5].cloud, false, 'nach dem Logo keine zweite Wolke');
  assert.equal(round[9].cloud, false, 'auch eine Figur nach dem Logo fliegt normal');
  assert.equal(round[2].cloud, true, 'Wolken mitten im Motiv bleiben');
  assert.equal(round.at(-1).textStyle, 'print', 'das Text-Finale trägt die gewählte Schrift');
  assert.equal(main.beats[2].cloud, true, 'die gebauten Bilder bleiben unverändert (Cache)');
  // ohne Text und Logo: die Show des Anlasses unverändert
  const plain = composeShow({ main });
  assert.equal(plain.loopTo, 0); assert.equal(plain.beats.length, main.beats.length);
  plain.beats.forEach((x, i) => assert.equal(x.cloud, main.beats[i].cloud));
});

test('Lichtlauf folgt den Linien: kein Sprung zwischen Bildvierteln, weicher Kopf ohne Kante', () => {
  // zwei Linien: ein Kreis und eine Linie darunter. Nachbarn im Rang liegen fast immer auch räumlich nebeneinander
  const circle = Array.from({ length: 160 }, (_, i) => { const a = (i / 160) * Math.PI * 2; return [Math.cos(a), Math.sin(a) + 0.3, 0]; });
  const base = Array.from({ length: 60 }, (_, i) => [-1 + (2 * i) / 59, -1.2, 0]);
  const all = [...circle, ...base], pts = all.map((_, i) => all[(i * 37) % all.length]); // Eingabereihenfolge egal (37 teilerfremd zu 220)
  const gap = (2 * Math.PI / 160) * 1.6;
  const jumpsOf = (order) => order.slice(1).filter((p, i) => Math.hypot(p[0] - order[i][0], p[1] - order[i][1]) > gap * 2).length;
  const rank = rankOf({ pts }), order = pts.map((p, j) => [rank[j], p]).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
  const jumps = jumpsOf(order), hilbert = jumpsOf(hilbertOrder(pts.length, (j) => pts[j][0], (j) => pts[j][1]).map((j) => pts[j]));
  assert.ok(jumps <= 3, `${jumps} Sprünge (Linie → Kreis, Rückweg)`);
  assert.ok(hilbert > jumps * 3, `Gegenprobe: die alte Hilbert-Ordnung springt ${hilbert}-mal`);
  // der Kopf: an jeder Stelle stetig, kein Wert springt zwischen zwei sehr nahen Rängen
  for (let t = 0.6; t < 3; t += 0.05) for (let u = 0; u < 1; u += 0.01) assert.ok(Math.abs(runLight(u + 0.001, t) - runLight(u, t)) < 0.02);
});

test('Fünfzehnte Fassung: das Logo glänzt mit dem Lichtlauf aus Studie 1, ohne Blitz an der Ankunft', () => {
  // eine Fläche: runFits() gäbe ihr keinen Lauf, das Logo bekommt ihn trotzdem
  const area = Array.from({ length: 400 }, (_, i) => [(i % 20) / 10 - 1, Math.floor(i / 20) / 10 - 1, 0, 255, 255, 255]);
  const s = composeShow({ main: { beats: [{ segment: 0, pts: line(10), hold: 2 }] }, logo: area });
  const logo = s.beats.find((x) => x.logo);
  assert.equal(logo.run, true, 'das Logo hat immer einen Lichtlauf');
  assert.equal(logo.runLight, TEMPO.logoRun);
  const P = TEMPO.logoRun;
  assert.ok(Math.abs(P.width - 0.06) < 1e-9 && Math.abs(P.strength - 0.6) < 1e-9 && Math.abs(1.6 / P.duration - 0.45) < 0.01, 'Parameter wie Studie 1 (waveWidth 0,06, boost 0,6, wave 0,45)');
  // an der Ankunft (tau 0) und kurz danach: kein Licht am Anfang der Form, der Kopf steht noch vor ihr
  for (let tau = 0; tau < 0.3; tau += 0.02) for (let u = 0; u <= 1; u += 0.02) assert.ok(runLight(u, tau, P) < 0.06, `tau ${tau.toFixed(2)}, u ${u.toFixed(2)}`);
  // nur aufhellend, weich, und er läuft wirklich über die ganze Form
  let peak = 0;
  for (let tau = 0; tau < 8; tau += 0.05) for (let u = 0; u < 1; u += 0.01) { const v = runLight(u, tau, P); assert.ok(v >= 0); assert.ok(Math.abs(runLight(u + 0.001, tau, P) - v) < 0.03); peak = Math.max(peak, v); }
  assert.ok(peak > 0.5, `Spitze ${peak.toFixed(2)}`);
});
