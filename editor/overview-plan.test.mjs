// Record overviews are chunked by the schema alone (x-afe `group`), never by per-type code in the editor.
import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import { overviewPlan, entryCounts } from 'astro-frontend-editor/web/overview-plan.mjs';
import { describe } from 'astro-frontend-editor/web/native-schema.mjs';
import { isTechnical } from 'astro-frontend-editor/web/field-labels.mjs';
import { omitRecordField } from 'astro-frontend-editor/web/site-adapter.mjs';
import { createFlyingStarsAdapter } from './flyingstars-adapter.mjs';
import { schemaDescription, wire } from 'astro-frontend-editor/runtime/extensions';
import { codecs } from 'astro-frontend-editor/runtime/extensions';
import { editable, inGroup } from '../src/schemas/afe-meta.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const titles = (plan) => plan.blocks.map((b) => b.title);
const members = (plan) => Object.fromEntries(plan.blocks.map((b) => [b.title, b.members.map((m) => m.path.join('.'))]));

test('groups come from x-afe group; ungrouped fields form Allgemein, ungrouped lists and objects their own block', () => {
  const image = z.object({ src: z.string() }).meta({ format: 'image', ...editable({ media: { policy: 'p', shape: { kind: 'path' } } }) });
  const schema = z.object({
    title: z.string().describe('Titel'),
    price: inGroup('Preis', z.number().describe('Preis')),
    tags: z.array(z.string()).describe('Schlagwörter'),
    step: inGroup('Preis', z.number().describe('Stufe')),
    cover: inGroup('Karte', image.optional().describe('Titelbild')),
    links: inGroup('Karte', z.array(z.object({ label: z.string() })).describe('Links')),
    meta: z.object({ a: z.string().describe('A') }).describe('Meta'),
    sections: z.array(z.object({ type: z.string(), headline: z.string().describe('Überschrift') })).describe('Abschnitte').meta(editable({ array: { role: 'blocks' } })),
  });
  const data = { title: 'T', price: 1, tags: ['x'], step: 2, cover: { src: 'a' }, links: [{ label: 'l' }], meta: { a: 'b' }, sections: [{ type: 'hero', headline: 'H' }] };
  const { fields, containers } = describe(schemaDescription(schema), data);
  const plan = overviewPlan({ fields, containers, isTechnical });
  assert.deepEqual(titles(plan), ['Allgemein', 'Preis', 'Schlagwörter', 'Karte', 'Meta', 'Abschnitte'], 'blocks in order of their first member');
  assert.deepEqual(members(plan), { Allgemein: ['title'], Preis: ['price', 'step'], Schlagwörter: ['tags'], Karte: ['cover', 'links'], Meta: ['meta'], Abschnitte: ['sections'] });
  assert.deepEqual(plan.blocks.map((b) => b.members.map((m) => m.kind)), [['field'], ['field', 'field'], ['list'], ['media', 'list'], ['object'], ['blocks']]);
  // inGroup keeps the media policy of an optional image (a chained .meta() replaces the whole x-afe object).
  assert.equal(containers.find((c) => c.path[0] === 'cover')['x-afe'].media.policy, 'p');
  assert.equal(plan.blocks[0].general, true);
});

test('a collapsed entry is summarised by its nested lists', () => {
  const containers = [{ path: ['featureGroups'], kind: 'array' }, { path: ['featureGroups', 0, 'items'], kind: 'array', label: 'Leistungen' }, { path: ['featureGroups', 0, 'meta'], kind: 'object' }];
  const data = { featureGroups: [{ title: 'Musik', items: [{}, {}, {}], meta: {} }] };
  assert.equal(entryCounts(containers, data, ['featureGroups', 0]), 'Leistungen: 3');
  assert.equal(entryCounts(containers, data, ['featureGroups']), '');
});

// Every real record: the package reads as Marc's five blocks; a page never spills its sections' fields into
// the sheet; no block grows past ten members (a new ungrouped field shows up here first).
test('real FlyingStars records are chunked by their schema', async () => {
  const site = await createFlyingStarsAdapter(root);
  const files = (await readdir(root + 'src/content', { recursive: true })).map((f) => 'src/content/' + f);
  const plans = new Map();
  for (const source of site.sourcesFromFiles(files)) {
    const data = wire(source.schema.parse(codecs[source.format].parse(await readFile(root + source.file))));
    const d = describe(schemaDescription(source.schema), data, { id: source.id, omitPath: (dd, p) => omitRecordField({ id: source.id, data }, dd, p) });
    const plan = overviewPlan({ fields: d.fields, containers: d.containers, isTechnical });
    plans.set(source.id, plan);
    for (const block of plan.blocks) assert.ok(block.members.length <= 10, `${source.id} › ${block.title}: ${block.members.length} members`);
    for (const block of plan.blocks) for (const m of block.members) assert.ok(m.kind === 'blocks' || m.path[0] !== 'sections', `${source.id}: ${m.path.join('.')} belongs to a section`);
  }
  assert.deepEqual(titles(plans.get('package/horizon')), ['Name & Darstellung', 'Drohnen & Dauer', 'Preis', 'Leistungen', 'Show-Konfigurator']);
  assert.deepEqual(members(plans.get('package/horizon')).Preis, ['price', 'step', 'add']);
  assert.deepEqual(members(plans.get('package/horizon')).Leistungen, ['inheritsText', 'featureGroups']);
  assert.deepEqual(titles(plans.get('page/index')), ['Allgemein', 'Abschnitte']);
  assert.deepEqual(titles(plans.get('site/inquiry')), ['Ablauf', 'Angaben zur Show', 'Kontaktdaten', 'Meldungen']);
  assert.ok(titles(plans.get('project/nfl-berlin-game')).includes('Projektkarte'));
});
