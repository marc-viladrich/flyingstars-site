// While a panel stays open nothing the user just clicked moves to another zone; reopening re-derives it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stablePartition, pinnedChoices, reorderVisible, partitionUnits } from './web/view-state.mjs';

const pkg = 'page/index', tier = ['sections', 3, 'tiers', 1];
const units = (candidates) => [
  { kind: 'field', path: [...tier, 'packageId'], rank: 0 },
  { kind: 'array', path: [...tier, 'featureIds'], reference: true, candidates, rank: 1 },
  { kind: 'field', path: [...tier, 'cta', 'label'], rank: 2 },
];
const marker = (path) => ({ id: pkg, path, kind: 'field' });

test('a list ticked on while the card panel is open stays in "Weitere Felder"', () => {
  const memo = {};
  // First draw: nothing of the list is on the card yet → the whole list is in "Weitere Felder".
  const first = stablePartition(partitionUnits(units(7), [marker([...tier, 'packageId'])], { id: pkg, path: tier }), memo);
  assert.deepEqual(first.more.map((u) => u.path.at(-1)), ['featureIds', 'label']);
  // A Leistung is ticked: the card renders the list now, a fresh split would move it up and add candidates.
  const fresh = partitionUnits(units(6), [marker([...tier, 'packageId']), marker([...tier, 'featureIds', 0])], { id: pkg, path: tier });
  assert.deepEqual(fresh.shown.map((u) => u.path.at(-1)), ['packageId', 'featureIds']);
  const kept = stablePartition(fresh, memo);
  assert.deepEqual(kept.shown.map((u) => u.path.at(-1)), ['packageId']);
  assert.deepEqual(kept.more.map((u) => u.kind + ':' + u.path.at(-1)), ['array:featureIds', 'field:label'], 'no extra candidates entry beside the whole list');
  assert.equal(kept.count, 2, '"Weitere Felder (N)" keeps its number');
  // Next opening (new memo): the list belongs to the card.
  assert.deepEqual(stablePartition(fresh, {}).shown.map((u) => u.path.at(-1)), ['packageId', 'featureIds']);
});

test('candidates stay in place when all are ticked; a removed field drops out; a new unit takes its fresh zone', () => {
  const memo = {};
  const markers = [marker([...tier, 'packageId']), marker([...tier, 'featureIds', 0])];
  stablePartition(partitionUnits(units(2), markers, { id: pkg, path: tier }), memo);
  const allTicked = stablePartition(partitionUnits(units(0), markers, { id: pkg, path: tier }), memo);
  assert.deepEqual(allTicked.more.map((u) => u.kind), ['candidates', 'field']);
  const withImage = [...units(0).filter((u) => u.path.at(-1) !== 'label'), { kind: 'media', path: [...tier, 'image'], rank: 3 }];
  const next = stablePartition(partitionUnits(withImage, [...markers, marker([...tier, 'image'])], { id: pkg, path: tier }), memo);
  assert.deepEqual(next.shown.map((u) => u.path.at(-1)), ['packageId', 'featureIds', 'image']);
  assert.deepEqual(next.more.map((u) => u.kind), ['candidates']);
});

const options = ['a', 'b', 'c', 'd'].map((key) => ({ key, alias: 'feature/' + key }));
const matches = (o, id) => o.key === id || o.alias === id;
const keys = (rows) => rows.map((r) => r.option.key + (r.checked ? '✓' : ''));

test('choices keep their rows: ticked candidates stay candidates, unticked chosen keep their place', () => {
  const memo = {};
  assert.deepEqual(keys(pinnedChoices(options, ['b', 'd'], matches, memo).chosen), ['b✓', 'd✓']);
  const ticked = pinnedChoices(options, ['b', 'd', 'a'], matches, memo);
  assert.deepEqual(keys(ticked.chosen), ['b✓', 'd✓']);
  assert.deepEqual(keys(ticked.others), ['a✓', 'c']);
  const unticked = pinnedChoices(options, ['d', 'a'], matches, memo);
  assert.deepEqual(keys(unticked.chosen), ['b', 'd✓'], 'b stays first, unchecked');
  assert.deepEqual(keys(pinnedChoices(options, ['feature/d'], matches, memo).chosen), ['b', 'd✓'], 'stored aliases match too');
  const created = pinnedChoices([...options, { key: 'e' }], ['d', 'e'], matches, memo);
  assert.deepEqual(keys(created.chosen), ['b', 'd✓', 'e✓'], 'a new record created from the panel goes by its state');
  assert.deepEqual(keys(pinnedChoices(options, ['d', 'a'], matches, {}).chosen), ['d✓', 'a✓'], 'reopening re-derives');
});

test('moving the visible chosen rows keeps hidden ticked ids at their index', () => {
  assert.deepEqual(reorderVisible(['b', 'a', 'd'], ['d', 'b']), ['d', 'a', 'b']);
  assert.deepEqual(reorderVisible(['b', 'd'], ['d', 'b']), ['d', 'b']);
  assert.deepEqual(reorderVisible(['b', 'd'], ['b', 'd']), ['b', 'd']);
});
