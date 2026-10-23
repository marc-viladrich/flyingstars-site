// "Verknüpft mit": incoming references are derived from schema reference metadata over all records.
import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { incomingReferences } from 'astro-frontend-editor/web/linked-records.mjs';
import { createFlyingStarsAdapter } from './flyingstars-adapter.mjs';
import { schemaDescription, wire } from 'astro-frontend-editor/runtime/extensions';
import { codecs } from 'astro-frontend-editor/runtime/extensions';
import { referenceFields } from 'astro-frontend-editor/runtime/extensions';
import { resolveReference } from 'astro-frontend-editor/web/site-adapter.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));

async function realRecords() {
  const site = await createFlyingStarsAdapter(root);
  const files = (await readdir(root + 'src/content', { recursive: true })).map((f) => 'src/content/' + f);
  const records = [];
  for (const source of site.sourcesFromFiles(files)) {
    const data = wire(source.schema.parse(codecs[source.format].parse(await readFile(root + source.file))));
    records.push({ id: source.id, address: source.address, data, schema: schemaDescription(source.schema) });
  }
  return records;
}

test('every resolvable reference in the real content appears as an incoming link of its target', async () => {
  const records = await realRecords();
  let count = 0;
  for (const owner of records) {
    if (owner.id.startsWith('translation/')) continue;
    for (const field of referenceFields(owner.schema, owner.data)) {
      const target = resolveReference(records, field.value, field.reference);
      if (!target) continue;
      const links = incomingReferences(records, target);
      assert.ok(links.some((l) => l.owner.id === owner.id && l.paths.some((p) => JSON.stringify(p) === JSON.stringify(field.path))), `${owner.id} ${field.path.join('.')} → ${target.id}`);
      count++;
    }
  }
  assert.ok(count > 0, 'the real content has references to check');
  // Today's cases: a page section lists clients and team members and shows packages.
  const byTarget = (id) => incomingReferences(records, records.find((r) => r.id === id)).map((l) => l.owner.id);
  const client = records.find((r) => r.id.startsWith('client/') && byTarget(r.id).length);
  assert.ok(client, 'some client is referenced by a page');
  assert.ok(byTarget(client.id).every((id) => !id.startsWith('translation/')), 'translations are not relationships of their own');
  assert.ok(byTarget('package/horizon').includes('page/index'), 'the homepage pricing section shows HORIZON');
});

test('references declared later in a schema are found without extra code', () => {
  const schema = { kind: 'object', properties: { title: { kind: 'text' }, clientId: { kind: 'text', 'x-afe': { reference: { collection: 'clients', encoding: 'id' } } } } };
  const client = { id: 'client/nfl', address: { collection: 'clients', id: 'nfl' }, data: {}, schema: { kind: 'object', properties: {} } };
  const project = { id: 'project/nfl-berlin-game', data: { title: 'NFL Berlin Game', clientId: 'nfl' }, schema };
  const other = { id: 'project/x', data: { title: 'X', clientId: 'puma' }, schema };
  assert.deepEqual(incomingReferences([client, project, other], client).map((l) => [l.owner.id, l.paths]), [['project/nfl-berlin-game', [['clientId']]]]);
});
