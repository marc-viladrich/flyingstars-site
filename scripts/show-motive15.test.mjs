// Fünfzehnte Fassung (Marc, 30.10.2026, 22 Uhr): Wächter für die Motiv-Änderungen dieser Runde (ohne Browser).
//   - FLYINGSTARS als Formation ohne Querstrich im A (Glyphe „Λ“ des Textplaners)
//   - Raketenflamme hängt an der Düse (Start und Landung), statt als Säule bis zum Boden zu reichen
//   - QR-Code in ODYSSEY: die Scanlinie läuft von oben nach unten über den Code
//   - Antrag: die Hand aus FlyingStars' eigener Show (Foto), mit Armband, der Ring sitzt am Ende auf dem Ringfinger
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { brandText } = await import('../src/scripts/scenes/text.js');
const { loadTextEngine, textFormation } = await import('../src/scripts/text-formation.js');

const motif = (o, id) => OCCASIONS.find((x) => x.id === o).motifs.find((m) => m.id === id);
const at = (b, j, t) => { const p = b.pts[j], o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; };

test('FLYINGSTARS steht wie im Logo ohne Querstrich im A', async () => {
  assert.equal(brandText('FlyingStars'), 'FLYINGSTΛRS');
  assert.equal(brandText('Danke, flying stars!'), 'Danke, FLYINGSTΛRS!');
  assert.equal(brandText('Anna & Ben'), 'Anna & Ben');
  await loadTextEngine();
  const r = textFormation(brandText('FlyingStars'), 200);
  assert.ok(r && r.pts.length === 200 && !r.unknown.length, 'der Textplaner kennt die Glyphe');
});

test('Raketenflamme: hängt an der Düse, wächst beim Start, keine Säule bis zum Boden', async () => {
  for (const n of [300, 450, 600]) {
    const seq = await buildSequence([motif('launch', 'rakete')], 'ODYSSEY', n, [255, 255, 255], 'launch');
    const go = seq.beats.find((b) => b.caption.startsWith('Zündung')), trail = go.groups.findIndex((g) => g.name === 'trail');
    const start = go.groups.slice(0, trail).reduce((s, g) => s + g.count, 0), TR = go.groups[trail].count, RK = go.groups[0].count;
    for (const t of [0, 1.5, 3, 6, 9]) {
      const rocket = Array.from({ length: RK }, (_, j) => at(go, j, t)), flame = Array.from({ length: TR }, (_, k) => at(go, start + k, t));
      const nozzle = Math.min(...rocket.filter((p) => Math.abs(p[0] - rocket[0][0]) < 0.2).map((p) => p[1]));
      const top = Math.max(...flame.map((p) => p[1])), bottom = Math.min(...flame.map((p) => p[1]));
      assert.ok(Math.abs(top - nozzle) < 0.12, `n ${n}, t ${t}: Flamme beginnt an der Düse (${top.toFixed(2)} / ${nozzle.toFixed(2)})`);
      assert.ok(top - bottom < 0.75, `n ${n}, t ${t}: Flamme ${(top - bottom).toFixed(2)} lang, keine Säule`);
      if (t >= 6) assert.ok(top - bottom > 0.35, 'nach der Zündung eine lange Flamme');
      // Flammenform: am breitesten nah an der Düse, zur Spitze hin schmal (vorher umgekehrt: ein dünner Stiel an der Düse
      // und ein breiter Klumpen unten an der Rampe)
      const L = top - bottom, width = (a, b) => { const xs = flame.filter((p) => p[1] <= top - a * L && p[1] >= top - b * L).map((p) => p[0]); return xs.length ? Math.max(...xs) - Math.min(...xs) : 0; };
      assert.ok(width(0.15, 0.5) > 1.4 * width(0.75, 1), `n ${n}, t ${t}: oben ${width(0.15, 0.5).toFixed(2)} breit, Spitze ${width(0.75, 1).toFixed(2)}`);
    }
    // Landung (eigenes Motiv „Mondlandung“): die leuchtenden Flammendrohnen beginnen an der Düse (vorher eine Lücke)
    if (n < 450) continue; // die Mondlandung spielt ab ODYSSEY 450 (Freischalt-Leiter, sechzehnte Fassung)
    const moon = await buildSequence([motif('launch', 'mond')], 'ODYSSEY', n, [255, 255, 255], 'launch');
    const land = moon.beats.find((b) => b.caption.includes('landet')), g = land.groups, s0 = g.slice(0, g.findIndex((x) => x.name === 'trail')).reduce((a, x) => a + x.count, 0);
    for (const t of [0.5, 2, 3.5]) {
      const rocket = Array.from({ length: g[0].count }, (_, j) => at(land, j, t)), nozzle = Math.min(...rocket.filter((p) => Math.abs(p[0] - (-0.05)) < 0.1).map((p) => p[1]));
      const lit = Array.from({ length: g.find((x) => x.name === 'trail').count }, (_, k) => at(land, s0 + k, t)).filter((o) => o[3] > 0.3);
      assert.ok(Math.abs(Math.max(...lit.map((o) => o[1])) - nozzle) < 0.08, `Landung t ${t}: Flamme an der Düse`);
    }
  }
});

test('QR-Code in ODYSSEY: eine Scanlinie läuft von oben nach unten über den Code', async () => {
  const seq = await buildSequence([motif('launch', 'qr')], 'ODYSSEY', 300, [255, 255, 255], 'launch');
  const scan = seq.beats.find((b) => b.caption.startsWith('„Scan me“'));
  const phone = scan.groups[0].count, ends = [phone - 2, phone - 1], code = Array.from({ length: scan.pts.length - phone }, (_, k) => phone + k);
  const ys = code.map((j) => scan.pts[j][1]), top = Math.max(...ys), bottom = Math.min(...ys);
  const y = (t) => at(scan, ends[0], t)[1];
  assert.ok(y(0) > top && y(3.4) < bottom, `die Enden der Linie fahren über den ganzen Code (${y(0).toFixed(2)} → ${y(3.4).toFixed(2)})`);
  for (let t = 0; t < 3.2; t += 0.1) assert.ok(y(t + 0.1) <= y(t) + 1e-9, 'der erste Durchgang läuft nur nach unten');
  assert.equal(at(scan, ends[1], 1.7)[1], y(1.7), 'beide Enden auf einer Höhe');
  // der Code steht still und wird nur heller, wo die Linie ist
  const lit = (t) => code.map((j) => at(scan, j, t));
  for (const t of [0.8, 1.6, 2.4]) for (const o of lit(t)) assert.ok(o[3] >= 1);
  const row = (t) => { const L = lit(t), near = L.filter((o) => Math.abs(o[1] - y(t)) < 0.05); return near.length ? Math.min(...near.map((o) => o[3])) : 2; };
  assert.ok(row(1.6) > 1.5, 'die Reihe unter der Linie leuchtet auf');
});

test('Antrag: die Hand aus FlyingStars’ Foto mit Armband, der Ring endet auf dem Ringfinger', async () => {
  for (const n of [450, 600]) {
    const seq = await buildSequence([motif('hochzeit', 'antrag')], 'ODYSSEY', n, [255, 255, 255], 'hochzeit');
    const b = seq.beats.find((x) => x.caption.startsWith('eine Hand')), ring = b.groups.find((g) => g.name === 'ring').count, body = b.groups.find((g) => g.name === 'body').count;
    assert.equal(b.pts.length, n);
    const gold = b.pts.slice(ring, ring + body).filter((p) => p[3] > p[5] + 60).length; // das Armband in Gold
    assert.ok(gold >= 40 && gold <= 50, `${gold} Armband-Drohnen (Foto: 46)`);
    // die Hand füllt das Bild von −1 bis 1 (Foto-Einheiten), der Ring sitzt am Ende auf dem Ringfinger
    const hand = b.pts.slice(ring, ring + body), xs = hand.map((p) => p[0]), yH = hand.map((p) => p[1]);
    assert.ok(Math.max(...yH) - Math.min(...yH) > 1.9 && Math.max(...xs) - Math.min(...xs) > 1.9);
    const end = Array.from({ length: ring }, (_, j) => at(b, j, 7.4)), cx = end.reduce((s, o) => s + o[0], 0) / ring, cy = end.reduce((s, o) => s + o[1], 0) / ring;
    const nearest = Math.min(...hand.map((p) => Math.hypot(p[0] - cx, p[1] - cy)));
    assert.ok(nearest < 0.2 && cx > -0.75 && cx < -0.2 && cy > -0.7 && cy < 0, `Ring bei (${cx.toFixed(2)}, ${cy.toFixed(2)}), nächste Handlinie ${nearest.toFixed(2)}`);
  }
});
