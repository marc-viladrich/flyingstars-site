// "Inhalte verwalten" is one grouped navigator over every real record: every record is reachable exactly
// once, translations only at their source. Enumerated from live content, not from a list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createFlyingStarsAdapter } from './flyingstars-adapter.mjs';
import { resolveRuntimeOptions } from './runtime-options.mjs';
import { NativeStore, git } from './native-store.mjs';
import { navigatorGroups, navigatorTypes } from './web/content-navigator.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));

test('every real record appears once in its type group; translations sit at their source record', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flyingstars-navigator-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await git(root, ['clone', '--quiet', '--no-hardlinks', path.join(root, '..'), dir]);
  await git(dir, ['checkout', '-B', 'content/draft']);
  await fs.symlink(await fs.realpath(path.join(root, '../node_modules')), path.join(dir, 'node_modules'));
  const store = await new NativeStore(dir, { remote: false, site: await createFlyingStarsAdapter(dir), runtime: resolveRuntimeOptions({ values: { siteRoot: dir } }) }).init();
  const { records } = await store.state();
  const groups = navigatorGroups(records);
  const rows = groups.flatMap((g) => g.items.map((item) => ({ ...item, type: g.type })));
  const own = records.filter((r) => r.type !== 'translation');
  assert.deepEqual(rows.map((r) => r.id).sort(), own.map((r) => r.id).sort(), 'each non-translation record exactly once');
  for (const row of rows) assert.equal(row.type, records.find((r) => r.id === row.id).type, row.id);
  // Every type in the content has a German label of its own (a new collection would show up here first).
  for (const group of groups) assert.ok(navigatorTypes[group.type], `type ${group.type} has a label`);
  for (const type of ['page', 'screen', 'site']) assert.ok(groups.some((g) => g.type === type), `${type} is part of the navigator`);
  const translations = records.filter((r) => r.type === 'translation');
  assert.ok(translations.length > 0);
  for (const tr of translations) {
    const source = rows.find((r) => r.id === tr.data.sourceId);
    assert.ok(source, `${tr.id} reachable at ${tr.data.sourceId}`);
    assert.ok(source.locales.includes(tr.data.locale), tr.id);
  }
});

test('search folds case and umlauts, matches title, address and type; empty groups drop out while searching', () => {
  const records = [
    { id: 'page/index', type: 'page', route: '/', title: 'Startseite' },
    { id: 'page/ueber-uns', type: 'page', route: '/ueber-uns/', title: 'Über uns' },
    { id: 'client/bmw', type: 'client', title: 'BMW' },
    { id: 'translation/client-bmw-en', type: 'translation', title: 'x', data: { sourceId: 'client/bmw', locale: 'en' } },
    { id: 'translation/gone-nl', type: 'translation', title: 'Alt', data: { sourceId: 'client/gone', locale: 'nl' } },
  ];
  const all = navigatorGroups(records, { canCreate: (type) => type === 'faq' || type === 'client' });
  assert.deepEqual(all.map((g) => [g.type, g.items.length, g.create]), [['page', 2, false], ['client', 1, true], ['faq', 0, true], ['translation', 1, false]]);
  assert.deepEqual(all[0].items.map((i) => i.route), ['/', '/ueber-uns/']);
  assert.deepEqual(all[1].items[0].locales, ['en']);
  assert.equal(all[3].label, 'Sprachfassungen ohne Ursprung');
  assert.deepEqual(navigatorGroups(records, { query: 'uber' }).map((g) => g.items.map((i) => i.id)), [['page/ueber-uns']]);
  assert.deepEqual(navigatorGroups(records, { query: 'KUNDEN' }).map((g) => g.type), ['client']);
  assert.deepEqual(navigatorGroups(records, { query: 'ueber-uns' }).map((g) => g.items.length), [1]);
  assert.deepEqual(navigatorGroups(records, { query: 'nichts' }), []);
});
