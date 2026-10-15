import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {mediaUsage, mediaLibrary, mediaUsers, collectionOf, ALL, UNUSED} from './web/media-usage.mjs';
import {recordKinds} from './web/record-kinds.mjs';
import {startNativeServers} from './server.mjs';
import {NativeStore, git} from './native-store.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {mediaTitle} from './media-upload.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const asset = (slug, src = `/assets/${slug}.png`, title = slug) => ({id: 'media/' + slug, data: {title, src, defaultAlt: title, width: 10, height: 10, mime: 'image/png'}});
const img = (extra) => ({alt: '', width: 10, height: 10, decorative: false, ...extra});
const usageOf = (records, id) => mediaUsage(records).get(id);

test('assetId matches full and short ids; src is the fallback; one image object is one usage', () => {
  const a = asset('a'), b = asset('b'), c = asset('c');
  const records = [a, b, c,
    {id: 'client/x', data: {name: 'X', logo: img({src: a.data.src, assetId: 'media/a'})}},
    {id: 'team/y', data: {name: 'Y', image: img({src: b.data.src, assetId: 'b'})}},
    {id: 'page/z', data: {sections: [{type: 'hero', image: img({src: c.data.src})}]}},
  ];
  assert.deepEqual(usageOf(records, 'media/a'), [{recordId: 'client/x', path: ['logo'], matchedBy: 'assetId'}]);
  assert.deepEqual(usageOf(records, 'media/b'), [{recordId: 'team/y', path: ['image'], matchedBy: 'assetId'}]);
  assert.deepEqual(usageOf(records, 'media/c'), [{recordId: 'page/z', path: ['sections', 0, 'image'], matchedBy: 'src'}]);
});

test('assetId wins over a src that points at a different asset', () => {
  const a = asset('a'), b = asset('b');
  const records = [a, b, {id: 'project/p', data: {cover: img({src: b.data.src, assetId: 'media/a'})}}];
  assert.equal(usageOf(records, 'media/a').length, 1);
  assert.deepEqual(usageOf(records, 'media/b'), []);
});

test('Markdown image tokens in text fields count as usage of the matching src, once per field', () => {
  const a = asset('a', 'https://flyingstars.art/wp-content/uploads/a.jpg');
  const body = `Intro\n\n![Ein Bild](${a.data.src} "Titel")\n\nNoch einmal: ![x](<${a.data.src}>)`;
  const records = [a, {id: 'post/p', data: {title: 'P', body}}];
  assert.deepEqual(usageOf(records, 'media/a'), [{recordId: 'post/p', path: ['body'], matchedBy: 'src', markdown: true}]);
  // A plain link to the same file is not an image.
  assert.deepEqual(usageOf([a, {id: 'post/q', data: {body: `[Datei](${a.data.src})`}}], 'media/a'), []);
});

test('media records never count as users, not even a second record with the same file', () => {
  const a = asset('a'), twin = {...asset('twin'), data: {...asset('twin').data, src: a.data.src}};
  const usage = mediaUsage([a, twin]);
  assert.deepEqual(usage.get('media/a'), []);
  assert.deepEqual(usage.get('media/twin'), []);
});

test('a .src that matches no media record (formation JSON, video) is not media', () => {
  const a = asset('a');
  const records = [a, {id: 'project/nfl', data: {showcase: {formation: {src: '/media/projekte/nfl/formation.json'}, heroVideo: {src: '/media/x.mp4'}}}}];
  const library = mediaLibrary(records);
  assert.deepEqual(library.assets.map(x => x.id), ['media/a']);
  assert.deepEqual(library.assets[0].usage, []);
});

test('collections follow the directly using record type; several types give several collections', () => {
  const logo = asset('logo'), shared = asset('shared'), loose = asset('loose');
  const records = [logo, shared, loose,
    {id: 'client/x', data: {name: 'X', logo: img({src: logo.data.src, assetId: 'media/logo'})}},
    // The page renders client/x, but only references it by id: the logo stays in "Kunden".
    {id: 'page/index', data: {sections: [{type: 'logoBar', clientIds: ['x']}, {type: 'hero', image: img({src: shared.data.src, assetId: 'shared'})}]}},
    {id: 'project/p', data: {cover: img({src: shared.data.src, assetId: 'media/shared'})}},
    {id: 'screen/404', data: {image: img({src: shared.data.src, assetId: 'media/shared'})}},
  ];
  const {collections, assets} = mediaLibrary(records), byId = Object.fromEntries(assets.map(a => [a.id, a]));
  assert.deepEqual(byId['media/logo'].collections, ['client']);
  assert.deepEqual(byId['media/shared'].collections.sort(), ['page', 'project']);
  assert.equal(byId['media/shared'].usage.length, 3);
  assert.deepEqual(byId['media/loose'].collections, [UNUSED]);
  assert.deepEqual(collections, [
    {id: ALL, label: 'Alle', count: 3},
    {id: 'client', label: 'Kunden', count: 1},
    {id: 'project', label: 'Projekte', count: 1},
    {id: 'page', label: 'Seiten', count: 1},
    {id: UNUSED, label: 'Nicht verwendet', count: 1},
  ]);
});

test('only collections with content are listed; "Alle" always; labels come from the shared record kinds', () => {
  const {collections} = mediaLibrary([asset('a'), {id: 'team/t', data: {image: img({src: '/assets/a.png', assetId: 'a'})}}]);
  assert.deepEqual(collections.map(c => c.id), [ALL, 'team']);
  assert.equal(collections[1].label, recordKinds['team/'][2]);
  assert.deepEqual(mediaLibrary([]).collections, [{id: ALL, label: 'Alle', count: 0}]);
});

test('a translation files its images under the type of its source record', () => {
  const a = asset('a', 'https://flyingstars.art/a.jpg');
  const records = [a, {id: 'post/p', data: {title: 'P', body: 'Text'}},
    {id: 'translation/post-p-en', data: {sourceId: 'post/p', values: [{path: ['body'], text: `![A](${a.data.src})`}]}}];
  assert.equal(collectionOf('translation/post-p-en', records), 'post');
  assert.deepEqual(mediaLibrary(records).assets[0].collections, ['post']);
});

test('delete guard: NativeStore.references uses the resolver, also when the asset is already gone from the list', () => {
  const a = asset('a', 'https://flyingstars.art/a.jpg');
  const others = [{id: 'post/p', data: {body: `![A](${a.data.src})`}}, {id: 'client/c', data: {logo: img({src: a.data.src, assetId: 'a'})}}, asset('twin', a.data.src)];
  assert.deepEqual(mediaUsers(others, a), ['post/p', 'client/c']);
  assert.deepEqual(NativeStore.prototype.references.call({}, others, a), ['post/p', 'client/c']);
  assert.deepEqual(NativeStore.prototype.references.call({}, [a, asset('b')], a), []);
});

test('an uploaded image gets a readable title instead of its file name', () => {
  assert.equal(mediaTitle('testbild-violett_2.png'), 'Testbild violett 2');
  assert.equal(mediaTitle('ÜBERSICHT.final.JPG'), 'ÜBERSICHT final');
  assert.equal(mediaTitle('  .png'), 'Bild');
  assert.equal(mediaTitle(''), 'Bild');
});

async function clone(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-media-')), source = path.join(dir, 'source');
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  await git(here, ['clone', '--quiet', '--no-hardlinks', path.join(here, '..'), source]);
  await git(source, ['checkout', '-B', 'content/draft']);
  await fs.symlink(await fs.realpath(path.join(here, '../node_modules')), path.join(source, 'node_modules'));
  return {dir, source};
}

test('GET /editor/api/media: saved-draft basis, collections and per-asset usage; every real media record is filed', {timeout: 120_000}, async t => {
  const {dir, source} = await clone(t);
  const servers = await startNativeServers({remote: false, source, runtimeRoot: dir, port: 45990, publicPort: 45991, listen: false, initialize: false});
  await new Promise(resolve => servers.editor.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => servers.editor.close(resolve)));
  const response = await new Promise((resolve, reject) => {
    http.get({host: '127.0.0.1', port: servers.editor.address().port, path: '/editor/api/media', headers: {host: new URL(servers.origin).host}}, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({status: res.statusCode, body: JSON.parse(Buffer.concat(chunks))}));
    }).on('error', reject);
  });
  assert.equal(response.status, 200);
  const body = response.body, state = await servers.store.state();
  assert.deepEqual(Object.keys(body).sort(), ['assets', 'basis', 'collections', 'head']);
  assert.equal(body.head, state.head); assert.equal(body.basis, 'saved-draft');
  const media = state.records.filter(r => r.id.startsWith('media/'));
  assert.ok(media.length > 0);
  assert.deepEqual(body.assets.map(a => a.id).sort(), media.map(r => r.id).sort());
  for (const a of body.assets) {
    assert.deepEqual(Object.keys(a).sort(), ['collections', 'data', 'id', 'usage']);
    assert.deepEqual(Object.keys(a.data).sort(), ['defaultAlt', 'height', 'mime', 'src', 'title', 'width']);
    // Sweep: every real media record lands in at least one listed collection (or "Nicht verwendet").
    assert.ok(a.collections.length >= 1, a.id);
    for (const id of a.collections) assert.ok(body.collections.some(c => c.id === id), `${a.id} → ${id}`);
    assert.equal(a.collections.includes(UNUSED), a.usage.length === 0, a.id);
    for (const u of a.usage) {
      assert.ok(['assetId', 'src'].includes(u.matchedBy));
      const user = state.records.find(r => r.id === u.recordId);
      assert.ok(user && !user.id.startsWith('media/'), u.recordId);
      const target = u.path.reduce((v, k) => v?.[k], user.data);
      assert.ok(u.markdown ? typeof target === 'string' : typeof target?.src === 'string', `${u.recordId} ${u.path.join('.')}`);
    }
  }
  for (const c of body.collections) assert.equal(c.count, c.id === ALL ? body.assets.length : body.assets.filter(a => a.collections.includes(c.id)).length, c.id);
  assert.equal(body.collections[0].id, ALL);
  for (const c of body.collections) assert.ok(c.id === ALL || c.count > 0, c.id);
  // Every assetId reference in the real content is found, exactly once per image object.
  let references = 0;
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (typeof v.assetId === 'string') references++; Object.values(v).forEach(walk); } };
  state.records.filter(r => !r.id.startsWith('media/')).forEach(r => walk(r.data));
  assert.equal(body.assets.flatMap(a => a.usage).filter(u => u.matchedBy === 'assetId').length, references);
});

test('real store: deleting a used media record is refused with the using records', {timeout: 120_000}, async t => {
  const {source} = await clone(t);
  const store = await new NativeStore(source, {remote: false, site: await createFlyingStarsAdapter(source)}).init();
  const state = await store.state(), used = mediaLibrary(state.records).assets.find(a => a.usage.length);
  const target = state.records.find(r => r.id === used.id);
  await assert.rejects(store.save({expectedHead: state.head, requestId: crypto.randomUUID(), deletes: [{id: target.id, expectedRevision: target.revision}]}), error => {
    assert.equal(error.status, 409);
    for (const u of used.usage) assert.match(error.message, new RegExp(u.recordId.replace('/', '\\/')));
    return true;
  });
});

test('uploading the same image again reuses its media record instead of creating a duplicate', async () => {
  const { uploadNativeMedia } = await import('./native-media.mjs');
  const existing = { id: 'media/abc', data: { src: '/assets/' + 'f'.repeat(64) + '.png' } };
  let saved = false;
  const store = {
    site: { mediaWrite: (asset, requestId) => ({ id: 'media/' + requestId, data: { src: existing.data.src }, file: 'public' + existing.data.src }) },
    state: async () => ({ head: 'a'.repeat(40), records: [existing] }),
    save: async () => { saved = true; return {}; },
  };
  const sharp = (await import('sharp')).default;
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#808080' } }).png().toBuffer();
  const result = await uploadNativeMedia(store, { bytes: png, name: 'x.png', requestId: '11111111-1111-4111-8111-111111111111', expectedHead: 'a'.repeat(40) });
  assert.equal(result.assetId, 'media/abc');
  assert.equal(result.reused, true);
  assert.equal(saved, false);
});
