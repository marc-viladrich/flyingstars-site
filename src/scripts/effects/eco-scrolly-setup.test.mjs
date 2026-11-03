import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareEcoScrolly, resetEcoScrolly } from './eco-scrolly-setup.mjs';

function classes() {
  const values = new Set();
  return { add: (value) => values.add(value), remove: (value) => values.delete(value), contains: (value) => values.has(value) };
}
test('lazy eco engine reserves the real fact count and keeps its first fact readable', () => {
  const facts = Array.from({ length: 5 }, () => ({ classList: classes() }));
  const styles = new Map();
  const el = { classList: classes(), querySelectorAll: () => facts, style: { setProperty: (key, value) => styles.set(key, value), removeProperty: (key) => styles.delete(key) } };
  prepareEcoScrolly(el);
  assert.equal(styles.get('--steps'), '5');
  assert.ok(el.classList.contains('is-scrolly'));
  assert.ok(facts[0].classList.contains('on'));
  // Repeated preparation must not reset a running story to its first fact.
  facts[0].classList.remove('on');
  facts[2].classList.add('on');
  prepareEcoScrolly(el);
  assert.equal(facts[0].classList.contains('on'), false);
  assert.equal(facts[2].classList.contains('on'), true);
  resetEcoScrolly(el);
  assert.equal(el.classList.contains('is-scrolly'), false);
  assert.equal(styles.has('--steps'), false);
});
