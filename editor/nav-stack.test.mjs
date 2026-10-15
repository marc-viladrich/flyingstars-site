// One back stack for every surface: what a view opened, Back returns from, with the state it was left in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NavStack } from './web/nav-stack.mjs';

test('push stores the leaving view state; back returns the previous view with exactly that state', () => {
  const nav = new NavStack();
  nav.reset({ surface: 'dialog', kind: 'navigator' });
  assert.equal(nav.canGoBack(), false);
  nav.push({ surface: 'dialog', kind: 'library' }, { query: 'nfl', open: ['media', 'project'], scroll: 351, target: 'library' });
  nav.push({ surface: 'panel', context: { id: 'media/a', path: [] }, scope: 'record' }, { collection: 'projects', search: '', scroll: 1774, focusId: 'media/a' });
  nav.push({ surface: 'panel', context: { id: 'project/nfl', path: [] }, scope: 'record' }, { scroll: 120 });
  assert.equal(nav.depth, 4);
  assert.equal(nav.run('panel'), 2);
  assert.deepEqual(nav.back().state, { scroll: 120 });
  const library = nav.back();
  assert.equal(library.kind, 'library');
  assert.deepEqual(library.state, { collection: 'projects', search: '', scroll: 1774, focusId: 'media/a' });
  assert.deepEqual(nav.back().state, { query: 'nfl', open: ['media', 'project'], scroll: 351, target: 'library' });
  assert.equal(nav.back(), null, 'the first view has nothing behind it');
  assert.equal(nav.depth, 1);
});

test('replaceTop keeps the depth, retain drops views of deleted records, clear and reset start over', () => {
  const nav = new NavStack();
  nav.reset({ surface: 'dialog', kind: 'navigator' });
  nav.push({ surface: 'panel', context: { id: 'faq/a' }, scope: 'record' }, { scroll: 5 });
  nav.replaceTop({ surface: 'panel', context: { id: 'faq/a', path: ['tags'] }, scope: 'entry' });
  assert.equal(nav.depth, 2);
  assert.equal(nav.previous.kind, 'navigator');
  const top = nav.retain((entry) => entry.surface !== 'panel' || entry.context.id !== 'faq/a');
  assert.equal(top.kind, 'navigator', 'deleting the record returns to where it was opened from');
  assert.deepEqual(top.state, { scroll: 5 });
  nav.clear();
  assert.equal(nav.top, null);
  assert.equal(nav.replaceTop({ surface: 'panel' }).surface, 'panel');
  assert.equal(nav.depth, 1);
  nav.push({ surface: 'panel' });
  assert.equal(nav.top.state, undefined, 'a push without leaving state does not invent one');
});

// The surfaces are wired to the one stack: no second panel stack, every stacked view has a way back.
test('editor surfaces share the one stack and dialog views show Back left of their title', async () => {
  const source = await readFile(new URL('./web/editor.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bpanelStack\b/);
  assert.doesNotMatch(source, /navigatorOpen/, 'open navigator groups belong to one opening, not to the session');
  for (const view of ['navigator', 'library', 'create']) assert.match(source, new RegExp(`\\b${view}:`), view);
  assert.match(source, /function stackHead\(d, entry, title, search = null\) \{[\s\S]*?nav\.canGoBack\(\) \? button\(backLabel\(\), goBack/);
  // A record or image opened from a dialog view always goes through openFromDialog (Back returns there).
  const navigator = source.slice(source.indexOf('function navigatorView('), source.indexOf('function libraryView('));
  assert.doesNotMatch(navigator, /openInspector\(|d\.close\(\)/);
  assert.match(source, /const openAsset = \(asset\) => \{\s*focusId = asset\.id;\s*openFromDialog\(/);
  const library = source.slice(source.indexOf('function rovingFocus('), source.indexOf('// Media record panel'));
  assert.doesNotMatch(library, /scrollIntoView\(/, 'library scrolling stays inside the tile grid');
});
