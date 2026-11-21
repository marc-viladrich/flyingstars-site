// Runde 11 (Marc 21.11.2026: „auf der Startseite nicht übertreiben und maximal 400 Drohnen, um performance nicht zu sehr zu
// belasten“): kein Stück der Show-Folge in „Feuerwerk? War gestern“ nutzt mehr als 400 Drohnen, und jedes Stück aus FIRST
// steht im Repertoire. Liest den Quelltext (folge.js braucht einen Browser). Aufruf: node --test scripts/himmel-folge-drohnen.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/scripts/himmel/folge.js', 'utf8');
const MAX = 400;

test('Startseite: höchstens 400 Drohnen je Stück', () => {
  const n = Number(src.match(/export const N = (\d+);/)[1]);
  assert.ok(n <= MAX, `N = ${n}`);
  const pieces = src.slice(src.indexOf('const PIECES = {'), src.indexOf('const OPENING'));
  for (const m of pieces.matchAll(/\bn: (\d+)/g)) assert.ok(Number(m[1]) <= MAX, `Stück mit ${m[1]} Drohnen`);
  for (const m of pieces.matchAll(/\b[SH]\("[^"]+", (\d+)/g)) assert.ok(Number(m[1]) <= MAX, `Schritt mit ${m[1]} Drohnen`);
});

test('jedes Stück der ersten Runde steht im Repertoire', () => {
  const first = JSON.parse(src.match(/const FIRST = (\[[^\]]+\]);/)[1]);
  const pieces = src.slice(src.indexOf('const PIECES = {'), src.indexOf('const OPENING'));
  for (const id of first) assert.match(pieces, new RegExp(`\\n\\s*${id}: \\{`), `${id} fehlt in PIECES`);
});
