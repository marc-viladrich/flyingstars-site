// Guards over every real record's panel description (the same describe() + overview plan the editor draws):
// no visual group with more than ten direct fields, every field labelled by the schema, no label that only
// repeats the stored value. New content types and new fields are covered without listing them here.
import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { overviewPlan, directChildren, chunkByGroup } from 'astro-frontend-editor/web/overview-plan.mjs';
import { describe } from 'astro-frontend-editor/web/native-schema.mjs';
import { isTechnical, fieldLabel } from 'astro-frontend-editor/web/field-labels.mjs';
import { omitRecordField } from 'astro-frontend-editor/web/site-adapter.mjs';
import { createFlyingStarsAdapter } from './flyingstars-adapter.mjs';
import { schemaDescription, wire } from 'astro-frontend-editor/runtime/extensions';
import { codecs } from 'astro-frontend-editor/runtime/extensions';
const root = fileURLToPath(new URL('../', import.meta.url));
const under = (path, prefix) => prefix.every((part, i) => path[i] === part);
const at = (data, path) => path.reduce((v, k) => v?.[k], data);
const MAX_DIRECT = 10;
// Records another worker is restructuring right now. Their findings are printed, not failed, and an entry
// that has become clean fails the test until it is removed here (so the list can only shrink).
const PENDING = {};
function judge(t, findings) {
  const pending = findings.filter((f) => Object.keys(PENDING).some((id) => f.startsWith(id + ' ')));
  for (const id of Object.keys(PENDING)) {
    const mine = pending.filter((f) => f.startsWith(id + ' '));
    if (mine.length) t.diagnostic(`pending ${id} (${PENDING[id]}): ${mine.length}, e.g. ${mine.slice(0, 3).join('; ')}`);
  }
  const cleaned = Object.keys(PENDING).filter((id) => !pending.some((f) => f.startsWith(id + ' ')));
  assert.deepEqual(findings.filter((f) => !pending.includes(f)), []);
  return cleaned;
}

let loaded = null;
export const realPanels = () => (loaded ??= loadPanels());
async function loadPanels() {
  const site = await createFlyingStarsAdapter(root);
  const files = (await readdir(root + 'src/content', { recursive: true })).map((f) => 'src/content/' + f);
  const out = [];
  for (const source of site.sourcesFromFiles(files)) {
    const data = wire(source.schema.parse(codecs[source.format].parse(await readFile(root + source.file))));
    const d = describe(schemaDescription(source.schema), data, { id: source.id, omitPath: (dd, p) => omitRecordField({ id: source.id, data }, dd, p) });
    out.push({ id: source.id, data, ...d, plan: overviewPlan({ fields: d.fields, containers: d.containers, isTechnical, present: (p) => { const v = at(data, p); return Array.isArray(v) ? v.length > 0 : v !== undefined; } }) });
  }
  return out;
}

// The visual groups a record sheet shows: each block, each fold/subgroup (nested object or schema group
// inside an object) and each open list entry, with the controls drawn directly in it.
export function visualGroups({ id, data, fields, containers, plan }) {
  const groups = [];
  const shown = (child) => {
    if (child.field) return !isTechnical(child.field);
    const c = child.container;
    if (isTechnical(c)) return false;
    if (c.kind === 'object' || c.format === 'image') return at(data, c.path) !== undefined;
    return true;
  };
  // An object's children: its own direct controls, schema-group subheadings and nested objects as subgroups.
  const objectGroups = (title, prefix, ownGroup) => {
    const children = directChildren({ fields, containers, prefix }).filter(shown);
    let direct = 0;
    for (const chunk of chunkByGroup(children, (c) => (c.field || c.container).group, { ignore: ownGroup })) {
      if (chunk.title) groups.push({ title: `${title} › ${chunk.title}`, count: chunk.items.length });
      else direct += chunk.items.length;
      for (const child of chunk.items) if (child.container?.kind === 'object' && child.container.format !== 'image') objectGroups(`${title} › ${fieldLabel(child.container)}`, child.container.path, child.container.group);
    }
    groups.push({ title, count: direct });
  };
  for (const block of plan.blocks) {
    const alone = block.members.length === 1 && block.members[0].kind === 'object';
    if (alone) objectGroups(`${id} › ${block.title}`, block.members[0].path, block.members[0].node.group);
    else {
      groups.push({ title: `${id} › ${block.title}`, count: block.members.length });
      for (const m of block.members) if (m.kind === 'object') objectGroups(`${id} › ${block.title} › ${fieldLabel(m.node)}`, m.path, m.node.group);
    }
  }
  // Every list entry opens as its own grid.
  for (const c of containers) {
    if (c.kind !== 'array' || isTechnical(c) || c['x-afe']?.array?.role === 'blocks' || c.path[0] === 'sections') continue;
    const entries = at(data, c.path);
    if (!Array.isArray(entries)) continue;
    entries.forEach((entry, i) => {
      if (entry && typeof entry === 'object') objectGroups(`${id} › ${fieldLabel(c)} ${i + 1}`, [...c.path, i], null);
    });
  }
  return groups;
}

// Fields an editor reads by their label (not picker rows of a reference list, not technical data).
function labelledFields({ fields, containers }) {
  const pickers = containers.filter((c) => c.kind === 'array' && (c['x-afe']?.widget || fields.some((f) => f.path.length === c.path.length + 1 && under(f.path, c.path) && f['x-afe']?.reference)));
  return fields.filter((f) => !isTechnical(f) && !f['x-afe']?.reference && !pickers.some((c) => under(f.path, c.path)));
}

const cleanedUp = new Map();
test('no visual group of a real record holds more than ten direct controls', async (t) => {
  const offenders = [];
  for (const panel of await realPanels()) for (const g of visualGroups(panel)) if (g.count > MAX_DIRECT) offenders.push(`${g.title}: ${g.count}`);
  cleanedUp.set('groups', judge(t, offenders));
});

test('every editable field of a real record has a schema label', async (t) => {
  const missing = [];
  for (const panel of await realPanels())
    for (const f of labelledFields(panel)) {
      const key = [...f.path].reverse().find((p) => typeof p !== 'number');
      if (!f.label || f.label === String(key) || f.label === 'Inhalt') missing.push(`${panel.id} › ${f.path.join('.')}`);
    }
  cleanedUp.set('labels', judge(t, missing));
});

test('no field label merely repeats the stored value', async (t) => {
  const echoes = [];
  for (const panel of await realPanels())
    for (const f of labelledFields(panel)) {
      if (typeof f.value !== 'string' || !f.value.trim()) continue;
      if (fieldLabel(f).trim().toLocaleLowerCase('de') === f.value.trim().toLocaleLowerCase('de')) echoes.push(`${panel.id} › ${f.path.join('.')}: „${f.value}“`);
    }
  cleanedUp.set('echoes', judge(t, echoes));
});

test('a record listed as pending is removed from the list once all three guards pass for it', () => {
  const clean = Object.keys(PENDING).filter((id) => [...cleanedUp.values()].every((list) => list.includes(id)));
  assert.deepEqual(clean, [], 'remove from PENDING: ' + clean.join(', '));
});

test('schema groups inside an object become subheadings in order of their first member', () => {
  const items = [{ g: 'B' }, { g: null }, { g: 'A' }, { g: 'B' }, { g: null }, { g: 'Own' }];
  const chunks = chunkByGroup(items, (i) => i.g, { ignore: 'Own' });
  assert.deepEqual(chunks.map((c) => [c.title, c.items.length]), [['B', 2], [null, 1], ['A', 1], [null, 2]]);
});

test('the inquiry form messages read as Fehlermeldungen and Versand', async () => {
  const inquiry = (await realPanels()).find((p) => p.id === 'site/inquiry');
  const groups = visualGroups(inquiry).filter((g) => g.title.includes('Meldungen'));
  assert.deepEqual(groups.map((g) => [g.title.replace('site/inquiry › ', ''), g.count]), [['Meldungen › Fehlermeldungen', 6], ['Meldungen › Versand', 2], ['Meldungen', 0]]);
});
