// Runde 9, Punkt 3 (Marc 19.11.2026: „beim Spotify-Logo sind die Schallwellen noch nicht ganz straight“). Wächter über alle
// Beispiele: die Glättung quer zur Linie senkt die Wackelkurve, verschiebt keinen Punkt weiter als 0,3 Punktabstände und
// lässt Zahl, Reihenfolge, Farben und Elemente der Punkte, wie sie sind. Aufruf: node --test src/scripts/logo-rows.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePoints } from './logo-v10/prepared.mjs';
import { smoothRows, rowSpacing, rowNeighbours } from './logo-rows.mjs';

const dir = new URL('../../public/media/logo-modus/beispiele/', import.meta.url);
const ids = JSON.parse(fs.readFileSync(new URL('sizes.json', dir))).map((x) => x.id);
/** Wackeln: Sehnenabstand eines Punkts gegen den Mittelwert seiner beiden Nachbarn (Krümmung zählt nicht, nur ihr Sprung). */
function roughness(pts) {
  const sp = rowSpacing(pts), pairs = rowNeighbours(pts, sp), off = new Map(), out = [];
  pairs.forEach((q, i) => { if (!q) return; const a = pts[q[0]], b = pts[q[1]], p = pts[i], cx = b.x - a.x, cy = b.y - a.y; off.set(i, Math.abs(((p.x - a.x) * cy - (p.y - a.y) * cx) / Math.hypot(cx, cy)) / sp); });
  pairs.forEach((q, i) => { if (q && off.has(q[0]) && off.has(q[1])) out.push(Math.abs(off.get(i) - (off.get(q[0]) + off.get(q[1])) / 2)); });
  out.sort((a, b) => a - b); return out.length ? out[Math.floor(0.9 * (out.length - 1))] : 0;
}
const read = (id, n) => { const d = JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir))), f = d.formations[d.steps[n]], p = decodePoints(f.p), pts = []; for (let i = 0; i < p.length; i += 5) pts.push({ x: p[i] / 1000, y: p[i + 1] / 1000, c: d.palette[p[i + 2]], e: p[i + 3], cg: p[i + 4] }); pts.meta = { n }; return pts; };

for (const id of ids) test(`${id}: geglättet, ohne Punkte zu verlieren oder wegzuschieben`, () => {
  for (const n of [100, 150, 200]) {
    const pts = read(id, n), out = smoothRows(pts), sp = rowSpacing(pts);
    assert.equal(out.length, pts.length); assert.deepEqual(out.meta, pts.meta);
    out.forEach((q, i) => { assert.equal(q.c, pts[i].c); assert.equal(q.e, pts[i].e); assert.ok(Math.hypot(q.x - pts[i].x, q.y - pts[i].y) <= 0.3 * sp + 1e-9); });
    const before = roughness(pts), after = roughness(out);
    assert.ok(after <= before + 1e-9, `${id} ${n}: ${before.toFixed(3)} → ${after.toFixed(3)}`);
    assert.ok(after <= 0.13, `${id} ${n}: Wackelkurve p90 ${after.toFixed(3)} Punktabstände`);
  }
});

test('Spotify: die Schallwellen stehen glatt (p90 unter 0,02 Punktabständen, vorher 0,09)', () => {
  for (const n of [100, 150, 200]) assert.ok(roughness(smoothRows(read('spotify', n))) < 0.02);
});
