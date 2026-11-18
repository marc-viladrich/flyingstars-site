// Every image list in every real record names its items (caption, alt, library title or file name) and
// shows a thumbnail; none falls back to "Eintrag N". Enumerated from live content, not from a list.
import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { itemSummary } from 'astro-frontend-editor/web/view-state.mjs';
import { i18nFixture } from './i18n-test-fixture.mjs';

test('every image list item in every collection has a name and a thumbnail', async (t) => {
  const {store}=await i18nFixture(t);
  t.after(()=>store.sync.close());
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
