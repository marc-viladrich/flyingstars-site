// Runde 10b: Empfehlung, Karte und Übernahme aus einer Quelle (logo-advice.mjs). Aufruf: node --test src/scripts/logo-advice.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pkg from '../content/show-packages.ts';
import { logoAdvice } from './logo-advice.mjs';
const { SHOW_ARTS, artMin, droneStops, TWO_D_LIMIT } = pkg;

test('Marcs Fall: 152 Drohnen bei eingestellter 3D-Show → 2D mit 160 (nicht 3D mit 200)', () => {
  assert.deepEqual(logoAdvice(152, '3d', pkg), { art: '2d', drones: 160 });
});

test('jede Kombination: buchbare Stufe der empfohlenen Art, nie unter dem Bedarf, Art nie höher als eingestellt (außer 2D ab 400)', () => {
  for (const art of SHOW_ARTS) for (let need = 1; need <= 1100; need++) {
    const a = logoAdvice(need, art, pkg);
    assert.ok(droneStops(a.art).includes(a.drones), `${art} ${need}: ${a.drones} ist keine Stufe von ${a.art}`);
    assert.ok(a.drones >= Math.min(need, droneStops(a.art).at(-1)), `${art} ${need}: ${a.drones} unter dem Bedarf`);
    const rank = (x) => SHOW_ARTS.indexOf(x);
    if (rank(a.art) > rank(art)) assert.ok(art === '2d' && a.drones >= TWO_D_LIMIT, `${art} ${need}: Art steigt auf ${a.art}`);
    // braucht das Logo die Mindestzahl der eingestellten Art, bleibt sie
    if (need >= artMin(art) && !(art === '2d' && a.drones >= TWO_D_LIMIT)) assert.equal(a.art, art, `${art} ${need}`);
    // die empfohlene Art ist die größte, die das Logo ohne Aufrunden über ihre Mindestzahl erreicht
    if (need < artMin(art)) assert.ok(artMin(a.art) <= Math.max(need, artMin('2d')), `${art} ${need}: ${a.art} verlangt ${artMin(a.art)}`);
  }
});
