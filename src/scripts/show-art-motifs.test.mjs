// Runde 9 (Marc 20.11.2026): Motive je Art der Show nach der Einstufung des 3D-Agenten (scenes/catalog-3d/stufen.js).
// - 2D (SPARK): alle Motive mit 2D-Fassung.
// - 3D (HORIZON): nur Motive mit echter 3D-Fassung der Stufe 3D; kein Motiv ohne 3D-Fassung, kein 3D+-Motiv.
// - 3D+ (ODYSSEY): alle eingestuften Motive (3D und 3D+) und die reinen Geschichten; kein Katalogmotiv ohne 3D-Fassung.
// Aufruf: node --test src/scripts/show-art-motifs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCASIONS, stufeOf, artForMotif, occasionOfMotif } from '../content/show-configurator.js';
import { KLASSE_KATALOG, STUFE_FORMATION, STUFE_EIGEN } from './scenes/catalog-3d/stufen.js';
import { artMin, DRONES_MAX, SHOW_ARTS, ART_TIER } from '../content/show-packages.ts';

const catalogMotif = (m) => 'flat' in m;
const has3d = (m) => catalogMotif(m) ? Boolean(KLASSE_KATALOG[m.catalog] || STUFE_FORMATION[m.catalog]) : Boolean(STUFE_EIGEN[m.id]);

test('3D zeigt nur Motive der Stufe 3D mit echter 3D-Fassung', () => {
  for (const o of OCCASIONS) for (const m of o.motifs) if (m.tiers.HORIZON) {
    assert.ok(has3d(m), `${o.id} ${m.id}: in 3D ohne 3D-Fassung`);
    assert.equal(stufeOf(m), '3D', `${o.id} ${m.id}: Stufe ${stufeOf(m)} in 3D`);
  }
});

test('3D+ zeigt alle eingestuften Motive und kein Katalogmotiv ohne 3D-Fassung', () => {
  for (const o of OCCASIONS) for (const m of o.motifs) {
    const stufe = stufeOf(m);
    // Runde 10: ein Motiv darf in 3D+ fehlen, wenn eine 3D+-Story desselben Anlasses sein Bild schon zeigt (coveredBy)
    const covered = m.coveredBy && o.motifs.some((x) => x.id === m.coveredBy && x.tiers.ODYSSEY);
    if (stufe && !covered) assert.ok(m.tiers.ODYSSEY, `${o.id} ${m.id}: eingestuft (${stufe}), fehlt in 3D+`);
    if (catalogMotif(m) && !has3d(m)) assert.ok(!m.tiers.HORIZON && !m.tiers.ODYSSEY, `${o.id} ${m.id}: ohne 3D-Fassung in 3D/3D+`);
  }
});

test('jedes eigene Motiv mit 3D-Fassung hat eine Stufe (neue Motive fallen sonst durch)', () => {
  for (const o of OCCASIONS) for (const m of o.motifs) if (!catalogMotif(m) && (m.tiers.HORIZON || (m.tiers.ODYSSEY && m.tiers.SPARK))) assert.ok(STUFE_EIGEN[m.id], `${o.id} ${m.id}: keine Stufe in STUFE_EIGEN`);
});

test('am Einstieg jeder Art spielen je Anlass mindestens drei Motive, mehr Drohnen nehmen keins weg', () => {
  for (const o of OCCASIONS) for (const [art, tier] of [['2d', 'SPARK'], ['3d', 'HORIZON'], ['story', 'ODYSSEY']]) {
    const at = (n) => o.motifs.filter((m) => m.tiers[tier] && m.tiers[tier].minDrones <= n);
    assert.ok(at(artMin(art)).length >= 3, `${o.id} ${art} ${artMin(art)}: ${at(artMin(art)).map((m) => m.id).join(', ')}`);
    assert.ok(at(DRONES_MAX).length >= at(artMin(art)).length);
  }
});

test('3D+ spielt die einzelne 3D-Szene jedes 3D+-Motivs vor seiner Geschichte, 3D nicht', () => {
  const all = OCCASIONS.flatMap((o) => o.motifs.map((m, i) => ({ o, m, i })));
  const scenes = [['fussball', 'kickHorizon'], ['sprung', 'diveHorizon'], ['kolibri', 'hummingbird3d'], ['delfin', 'dolphin3d'], ['falter', 'butterfly3d'], ['lotus', 'lotus3d'], ['riesenrad', 'wheel3d'], ['tanz', 'dancer3d'], ['herz', 'heartTunnel'], ['vorhang', 'curtainStar'], ['feuerwerk', 'fireworkHorizon']];
  // jedes eigene 3D+-Motiv mit Geschichte hat seine Szene (neue Motive fallen sonst durch)
  for (const [id, [stufe]] of Object.entries(STUFE_EIGEN)) if (stufe === '3D+') assert.ok(scenes.some(([x]) => x === id), `${id}: 3D+-Motiv ohne eigene Szene vor der Geschichte`);
  for (const [id, build] of scenes) {
    const scene = all.filter(({ m }) => Object.values(m.tiers).some((v) => v.build === build));
    assert.ok(scene.length >= 1, `${build} spielt nirgends`);
    for (const { o, m, i } of scene) {
      assert.deepEqual(Object.keys(m.tiers), ['ODYSSEY'], `${o.id} ${m.id}: ${build} nur in 3D+`);
      assert.equal(o.motifs[i + 1]?.id, id, `${o.id} ${m.id}: nicht direkt vor der Geschichte ${id}`);
      assert.equal(stufeOf(m), '3D+');
      assert.notEqual(m.label, o.motifs[i + 1].label, `${o.id} ${m.id}: gleicher Name wie die Geschichte`);
    }
  }
});

test('Direktlinks: jedes Motiv in jeder Art landet in einer Art, in der es spielt (erst größer, dann kleiner)', () => {
  for (const o of OCCASIONS) for (const m of o.motifs) for (const art of SHOW_ARTS) {
    const to = artForMotif(m, art);
    assert.ok(to && m.tiers[ART_TIER[to]], `${o.id} ${m.id} ${art}: keine Art`);
    if (m.tiers[ART_TIER[art]]) assert.equal(to, art, `${o.id} ${m.id}: spielt in ${art}, wechselt trotzdem`);
    else {
      const up = SHOW_ARTS.slice(SHOW_ARTS.indexOf(art) + 1).find((a) => m.tiers[ART_TIER[a]]);
      if (up) assert.equal(to, up, `${o.id} ${m.id} ${art}: nächste größere Art ist ${up}`);
    }
    assert.equal(occasionOfMotif(OCCASIONS, m.id)?.motifs.some((x) => x.id === m.id), true);
  }
  const fussball = OCCASIONS.flatMap((o) => o.motifs).find((m) => m.id === 'fussball');
  assert.equal(artForMotif(fussball, '3d'), 'story');
  const golf = OCCASIONS.flatMap((o) => o.motifs).find((m) => m.catalog === 'golfcaddy');
  assert.equal(artForMotif(golf, 'story'), '2d');
});
