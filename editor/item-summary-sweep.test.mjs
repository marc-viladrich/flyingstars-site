// Every image list in every real record names its items (caption, alt, library title or file name) and
// shows a thumbnail; none falls back to "Eintrag N". Enumerated from live content, not from a list.
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
import { itemSummary } from 'astro-frontend-editor/web/view-state.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
test('every image list item in every collection has a name and a thumbnail', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flyingstars-summary-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await git(root, ['clone', '--quiet', '--no-hardlinks', path.join(root, '..'), dir]);
  await git(dir, ['checkout', '-B', 'content/draft']);
  await fs.symlink(await fs.realpath(path.join(root, '../node_modules')), path.join(dir, 'node_modules'));
  const store = await new NativeStore(dir, { remote: false, site: await createFlyingStarsAdapter(dir), runtime: resolveRuntimeOptions({ values: { siteRoot: dir } }) }).init();
  const { records } = await store.state();
  const lists = [];
  const walk = (id, value, at) => {
    if (Array.isArray(value)) {
      if (value.length && value.every((v) => v && typeof v === 'object' && typeof v.src === 'string')) lists.push({ id, at, items: value });
      value.forEach((v, i) => walk(id, v, [...at, i]));
    } else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(id, v, [...at, k]);
  };
  for (const r of records) if (!r.id.startsWith('media/')) walk(r.id, r.data, []);
  assert.ok(lists.some((l) => l.id === 'project/nfl-berlin-game'), 'the NFL gallery is among the enumerated lists');
  const unnamed = [];
  for (const list of lists)
    list.items.forEach((item, i) => {
      const summary = itemSummary(item, i, { records, image: true });
      if (summary.label === `Eintrag ${i + 1}` || !summary.thumb) unnamed.push(`${list.id} ${JSON.stringify([...list.at, i])}`);
    });
  assert.deepEqual(unnamed, []);
});
