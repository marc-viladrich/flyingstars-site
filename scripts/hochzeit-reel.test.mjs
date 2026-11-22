// Runde 20f (Marc, 22.11.2026): der Konfigurator-Teaser der Hochzeitsseite zeigt die wichtigsten Hochzeitsmotive aus dem
// Konfigurator mit ihrer Steigerung („die unterschiedliche Range“), auch wenn sie im Seitenkopf schon vorkommen: Herz 2D →
// Herztunnel → Amors Pfeil, Eheringe → Solitär 3D, Ring an der Hand, Sektgläser 2D → 3D, Torte 2D → 3D, Sektflasche 3D →
// Korken 3D+. Wächter: diese Motive in diesen Fassungen sind im Ablauf, und jede Wahl der Art behält genug eigene Motive.
// Aufruf: node --test scripts/hochzeit-reel.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location ??= { pathname: '/' };
const { buildReel } = await import('../src/scripts/show-teaser.js');

const tiersOf = (beats) => {
  const out = {};
  for (const b of beats) if (b.reel?.motif) (out[b.reel.motif] ??= new Set()).add(b.reel.pkg);
  return out;
};

test('Hochzeit-Teaser: die wichtigsten Motive mit ihrer Steigerung', async () => {
  const { beats } = await buildReel('hochzeit');
  const t = tiersOf(beats);
  const want = { herz: ['SPARK', 'HORIZON', 'ODYSSEY'], ring: ['SPARK', 'HORIZON'], antrag: ['ODYSSEY'], glaeser: ['SPARK', 'HORIZON'], torte: ['SPARK', 'HORIZON'], sekt: ['HORIZON', 'ODYSSEY'] };
  for (const [m, tiers] of Object.entries(want)) for (const k of tiers) assert.ok(t[m]?.has(k), `${m} fehlt in ${k}`);
});

test('Hochzeit-Teaser: jede Art der Show behält mindestens vier Motive', async () => {
  for (const art of ['2d', '3d', 'story']) {
    const { beats } = await buildReel('hochzeit', { art });
    const motifs = new Set(beats.map((b) => b.reel?.motif ?? b.reel?.kind));
    assert.ok(motifs.size >= 4, `${art}: nur ${[...motifs].join(', ')}`);
  }
});
