import test from 'node:test';
import assert from 'node:assert/strict';
import data from './pricing-formations.js';
import { selectFormationStep } from '../lib/formation-data.mjs';
import { heartPicture } from './heart-formation.js';
test('Projected 290-heart retains every coordinate, slot and reference without the other 90 steps', () => {
  const small = selectFormationStep(data, 290);
  assert.deepEqual(heartPicture(small, 290), heartPicture(data, 290));
  assert.deepEqual(Object.keys(small.steps), ['290']);
  assert.equal(Object.keys(small.parts).length, new Set(data.steps[290].refs.map(r => r[0])).size);
  assert.ok(JSON.stringify(small).length < JSON.stringify(data).length / 50);
  assert.throws(() => selectFormationStep(data, 299), /step missing/);
});
test('Missing geometry is reported instead of silently producing an incomplete formation', () => {
  assert.throws(() => selectFormationStep({steps:data.steps, parts:{}},290), /part missing/);
});
