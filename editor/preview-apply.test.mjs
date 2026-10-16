import test from 'node:test';
import assert from 'node:assert/strict';
import { patchInPlace, sameStructure } from './web/preview-apply.mjs';

// Only the DOM operations used by the three-way patcher; browser geometry is tested
// separately in canvas-preview.browser.mjs.
function element(tagName, attributes = {}, children = [], textContent = '') {
  const attrs = new Map(Object.entries(attributes)), tokens = new Set((attrs.get('class') || '').split(/\s+/));
  const node = { tagName, children, childNodes: children, textContent, ownerDocument: { activeElement: null },
    getAttributeNames: () => [...attrs.keys()], getAttribute: name => attrs.get(name) ?? null,
    hasAttribute: name => attrs.has(name), setAttribute: (name, value) => attrs.set(name, value), removeAttribute: name => attrs.delete(name),
    contains: () => false, classList: { add: token => tokens.add(token), remove: token => tokens.delete(token) } };
  children.forEach((child, index) => child.previousElementSibling = children[index - 1] || null);
  return node;
}
const section = (settings = {}, live = false) => element('SECTION', {}, [element('CANVAS', { 'data-orb': 'sphere', 'data-n': '200', 'data-color': 'neon-violet', ...settings, ...(live ? { 'data-canvas-live': 'true' } : {}) }), element('DIV', {}, [], 'Spark')]);

test('registered canvas data attributes patch in place for all settings, keeping runtime dimensions and card text', () => {
  const before = section(), after = section({ 'data-orb': 'torus', 'data-n': '230', 'data-color': 'neon-orange' }), live = section({ width: '512' }, true), canvas = live.children[0];
  assert.equal(sameStructure(before, after), true);
  assert.deepEqual(patchInPlace(live, before, after), { unsafe: false, changed: 3 });
  assert.equal(live.children[0], canvas);
  for (const name of ['data-orb', 'data-n', 'data-color']) assert.equal(canvas.getAttribute(name), after.children[0].getAttribute(name));
  assert.equal(canvas.getAttribute('width'), '512'); assert.equal(live.children[1].textContent, 'Spark');
});
test('unregistered canvas data changes remain unsafe', () => {
  assert.equal(patchInPlace(section(), section(), section({ 'data-orb': 'torus' })).unsafe, true);
});
test('structural edits require replacement and never partially patch or empty the card', () => {
  const live = section({}, true), before = section(), after = section({ 'data-orb': 'torus' }); after.children.push(element('P'));
  assert.equal(sameStructure(before, after), false);
  assert.deepEqual(patchInPlace(live, before, after), { unsafe: true, changed: 0 });
  assert.equal(live.children[0].getAttribute('data-orb'), 'sphere'); assert.equal(live.children[1].textContent, 'Spark');
});
test('runtime-owned canvas dimensions and styles survive server changes', () => {
  const live = section({ width: '512', style: 'width:96px' }, true), before = section({ width: '100', style: 'width:80px' }), after = section({ width: '200', style: 'width:120px' });
  assert.deepEqual(patchInPlace(live, before, after), { unsafe: false, changed: 0 });
  assert.equal(live.children[0].getAttribute('width'), '512'); assert.equal(live.children[0].getAttribute('style'), 'width:96px');
});
