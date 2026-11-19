// Runde 9, Punkt 4 (Marc 19.11.2026: Shell „sieht ganz anders aus als im Logo-Konfigurator selbst“). Wächter über alle
// Beispiele und beide Bühnen (1440 und 390 px, gemessen): das Logo steht im Logo-Modus ganz über der Hinweiskarte und in
// der Bühne, und die Show bekommt nach „Dieses Logo in der Show verwenden“ genau dieselben leuchtenden Punkte.
// Aufruf: node --test src/scripts/logo-stage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePoints } from './logo-v10/prepared.mjs';
import { logoFrame, logoScreenBox } from './logo-stage.mjs';
import { SHOW_ARTS, stopAtLeast, artMin } from '../content/show-packages.ts';

const dir = new URL('../../public/media/logo-modus/beispiele/', import.meta.url);
const ids = JSON.parse(fs.readFileSync(new URL('sizes.json', dir))).map((x) => x.id);
// gemessen 20.11.2026 im Konfigurator (Shell, Karte sichtbar): Bühne und Oberkante der Karte relativ zur Bühne
const STAGES = [{ name: '1440', W: 844, H: 454, coverTop: 343 }, { name: '390', W: 390, H: 354, coverTop: 265 }, { name: '1440 ohne Karte', W: 844, H: 454, coverTop: null }];
const lit = (id, n) => { const d = JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir))), f = d.formations[d.steps[n]], p = decodePoints(f.p), out = []; for (let i = 0; i < p.length; i += 5) out.push([p[i] / 1000, -p[i + 1] / 1000, 0, ...d.palette[p[i + 2]]]); return out; };

for (const id of ids) test(`${id}: im Logo-Modus ganz sichtbar über der Karte`, () => {
  for (const n of [100, 150, 200]) for (const st of STAGES) {
    const pts = lit(id, n), frame = logoFrame(pts, st), box = logoScreenBox(pts, frame, st);
    assert.ok(box.top >= 0.05 * st.H - 1, `${id} ${n} ${st.name}: Oberkante ${box.top.toFixed(0)}`);
    assert.ok(box.bottom <= (st.coverTop ?? st.H) - 0.03 * st.H + 1, `${id} ${n} ${st.name}: Unterkante ${box.bottom.toFixed(0)} unter der Karte`);
    // so groß, wie die freie Fläche erlaubt: entweder fast ihre Höhe oder (breite Wortmarken) fast die Breite
    assert.ok(box.bottom - box.top >= 0.8 * ((st.coverTop ?? st.H) - 0.1 * st.H) || box.width >= 0.85 * st.W, `${id} ${n} ${st.name}: Logo zu klein (${(box.bottom - box.top).toFixed(0)} × ${box.width.toFixed(0)} px)`);
    assert.ok(frame.fitPts.slice(0, pts.length).every((p, i) => p === pts[i]), 'gezeichnete Punkte unverändert');
  }
});

test('Show nach der Übernahme: Drohnenzahl ≥ Bedarf, also dieselbe Formation (showLogoPoints nimmt sie unverändert)', () => {
  for (const id of ids) for (let n = 100; n <= 200; n += 10) {
    const need = lit(id, n).length;
    for (const art of SHOW_ARTS) { const drones = stopAtLeast(art, Math.max(artMin(art), need)); assert.ok(drones >= need, `${id} ${n} ${art}: ${drones} < ${need}`); }
  }
});
