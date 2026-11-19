// Runde 9 (Marc: „dass man sieht, wie aus einer 2D-Shape eine 3D-Shape wird“): die Schneeflocken-Eskalation der
// Startseite als Motiv des Konfigurators (scenes/schnee.js: snowTree3d für 3D, snowTreeStory für 3D+).
// Aufruf: node --test scripts/schnee-eskalation.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { builders } = await import('../src/scripts/scenes/schnee.js');

const seq = (pkg, build, n) => buildSequence([{ id: 'schnee', label: 'Lichterbaum', tiers: { [pkg]: { build, caption: 'Lichterbaum', minDrones: 0 } } }], pkg, n, null, 'silvester');
/** Lage der Drohnen eines Bildes zur (rohen) Zeit t. */
const at = (beat, t) => beat.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; (beat.steady?.raw ?? beat.live)?.(p, j, t, o); return o; });

test('die räumliche Flocke beginnt flach (deckungsgleich mit der flachen) und ist nach dem Auffalten räumlich', () => {
  for (const n of [200, 300, 450]) {
    const b = builders.snow3d(n, '').beats[0];
    const start = at(b, 0), open = at(b, 1.4);
    assert.ok(Math.max(...start.map((o) => Math.abs(o[2]))) < 1e-6, `${n}: beginnt nicht flach`);
    const depth = Math.max(...open.map((o) => o[2])) - Math.min(...open.map((o) => o[2]));
    assert.ok(depth > 0.8, `${n}: nach dem Auffalten nur ${depth.toFixed(2)} tief`);
  }
});

test('3D: flache Flocke → räumliche Flocke → Lichterbaum; 3D+: dazu die Akte der Baumgeschichte; immer n Drohnen', async () => {
  for (const n of [200, 300, 600]) {
    const h = (await seq('HORIZON', 'snowTree3d', n)).beats, o = (await seq('ODYSSEY', 'snowTreeStory', n)).beats;
    assert.equal(h.length, 3, `3D ${n}: ${h.length} Bilder`);
    assert.equal(o.length, 5, `3D+ ${n}: ${o.length} Bilder`);
    for (const b of [...h, ...o]) assert.equal(b.pts.length, n, `${n}: ${b.caption} hat ${b.pts.length} Drohnen`);
    // zwischen flacher und räumlicher Flocke fliegen dieselben Drohnen, ohne Wolke (sonst sähe man keine Verwandlung)
    assert.ok(!h[1].cloud && !o[1].cloud, `${n}: Wolke vor dem Auffalten`);
    // die flache Flocke ist die räumliche in ihrer Ruhelage: dieselbe Punktlage, also kein Flug, nur das Auffalten
    for (const seqBeats of [h, o]) assert.ok(seqBeats[0].pts.every((p, j) => Math.hypot(p[0] - seqBeats[1].pts[j][0], p[1] - seqBeats[1].pts[j][1], (p[2] || 0) - (seqBeats[1].pts[j][2] || 0)) < 1e-9), `${n}: flache und räumliche Flocke liegen nicht deckungsgleich`);
  }
});
