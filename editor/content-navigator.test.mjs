// "Inhalte verwalten" is one grouped navigator over every real record: every record is reachable exactly
// once, translations only at their source. Enumerated from live content, not from a list.
import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createFlyingStarsAdapter } from './flyingstars-adapter.mjs';
import { resolveRuntimeOptions } from './server.mjs';
import { NativeStore, git } from 'astro-frontend-editor/runtime';
import { navigatorGroups, navigatorTypes, matchesQuery, localeVersion } from 'astro-frontend-editor/web/content-navigator.mjs';
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

test('one search rule for navigator and Mediathek: a carried search finds the same images', () => {
  const media = [
    { id: 'media/nfl-shield', type: 'media', title: 'Shield über dem Stadion', data: { defaultAlt: 'NFL-Logo aus Drohnen' } },
    { id: 'media/puma', type: 'media', title: 'Der springende Puma', data: { defaultAlt: 'Puma' } },
    { id: 'media/stadion', type: 'media', title: 'Das Olympiastadion', data: { defaultAlt: 'Stadion beim NFL Berlin Game' } },
  ];
  const navigator = navigatorGroups(media, { query: 'nfl', searchText: (r) => r.data.defaultAlt })[0].items.map((i) => i.id);
  const library = media.filter((a) => matchesQuery([a.title, a.data.defaultAlt, a.id.split('/').slice(1).join('/')], 'nfl')).map((a) => a.id);
  assert.deepEqual(navigator.sort(), library.sort());
  assert.deepEqual(library.sort(), ['media/nfl-shield', 'media/stadion']);
  assert.equal(matchesQuery(['Über uns'], 'UBER'), true);
  assert.equal(matchesQuery(['Berlin Game'], 'game berlin'), true, 'word order does not matter');
  assert.equal(matchesQuery(['Berlin'], ''), true);
  assert.equal(matchesQuery(['Berlin'], 'hamburg'), false);
  assert.ok(!('text' in navigatorGroups(media, { searchText: () => 'x' })[0].items[0]), 'search text is not part of the row model');
});

test('language chips say what they open', () => {
  assert.equal(localeVersion('en'), 'Englische Fassung');
  assert.equal(localeVersion('nl'), 'Niederländische Fassung');
  assert.equal(localeVersion('fr'), 'Fassung FR');
});
