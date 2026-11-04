import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {schemaDescription} from 'astro-frontend-editor/runtime/extensions';
import {fieldPolicy} from '../src/i18n/field-policy.mjs';
import {project, checkParallel, adoptionEvidence, reviewRequired, fingerprint} from '../src/i18n/contract.mjs';
import {imageMetadata} from '../src/schemas/media.mjs';
import {contractFixtures} from './test/i18n-contract-fixtures.mjs';
const {pairs, dependencies} = await contractFixtures();
const t = schema => fieldPolicy(schema, 'translatable'), s = schema => fieldPolicy(schema, 'shared');
const schema = z.object({label: t(z.string()), href: s(z.string()), width: s(z.number()), note: t(z.string().optional()),
  image: z.object({src: s(z.string()), alt: t(z.string())}).meta(imageMetadata).optional()});
const de = {label: 'PUMA', href: '/kontakt/', width: 400}, en = {...de};
const run = (source = de, target = en, deps = dependencies) => project(schema, source, target, 'en', deps);
const baseline = run(), evidence = adoptionEvidence(baseline, {editorReviewed: true, origin: 'machine-new'});

const knownShadowBlockers = {};

test('all 132 raw hashes remain current; shadow checks expose exactly the documented existing blockers', () => {
  assert.equal(pairs.length, 132);
  const blockers = {};
  for (const pair of pairs) {
    assert.equal(pair.target.translationSourceHash, createHash('sha256').update(pair.sourceRaw).digest('hex'), pair.id);
    let result;
    try { result = checkParallel(pair); } catch (error) { blockers[pair.id] = error.message; continue; }
    assert.deepEqual(reviewRequired(result, adoptionEvidence(result)), [], pair.id);
    const {translationSourceHash, ...target} = pair.target;
    assert.deepEqual(result.projection, target, pair.id);
    assert.deepEqual(result.sharedDifferences.filter(field => field.address !== '/translationSourceHash'), [], pair.id);
  }
  // An inventory assertion, NOT an exemption in the contract. Every blocker still throws.
  assert.deepEqual(blockers, knownShadowBlockers);
});

test('server Zod and serialized browser schema agree on every real file, including rejection', () => {
  for (const pair of pairs) {
    const browser = schemaDescription(pair.schema);
    if (knownShadowBlockers[pair.id]) {
      for (const definition of [pair.schema, browser]) assert.throws(() => project(definition, pair.source, pair.target, pair.locale, dependencies), {message: knownShadowBlockers[pair.id]});
    } else assert.deepEqual(project(pair.schema, pair.source, pair.target, pair.locale, dependencies), project(browser, pair.source, pair.target, pair.locale, dependencies), pair.id);
  }
});

test('CTA URL and dimensions project from DE without text review; equal brand names remain explicit translations', () => {
  const after = run({...de, href: '/anfrage/', width: 800});
  assert.equal(after.sourceFingerprint, baseline.sourceFingerprint);
  assert.deepEqual(after.projection, {...en, href: '/anfrage/', width: 800});
  assert.equal(after.sharedDifferences.length, 2);
  assert.deepEqual(reviewRequired(after, evidence), []);
  assert.throws(() => run(de, {href: en.href, width: 400}), /Missing.*label/);
  assert.deepEqual(reviewRequired(run({...de, label: 'Neue Marke'}), evidence), ['/label']);
});

test('image content changes invalidate its alt, dimensions do not', () => {
  const source = {...de, image: {src: 'before.jpg', alt: 'PUMA'}}, target = {...en, image: {src: 'before.jpg', alt: 'PUMA'}};
  const first = run(source, target), saved = adoptionEvidence(first);
  const changed = run({...source, image: {...source.image, src: 'after.jpg'}}, target);
  assert.deepEqual(reviewRequired(changed, saved), ['/image/alt']);
});

test('whitespace, optional presence and required/optional status belong to the fingerprint', () => {
  assert.notEqual(run({...de, label: 'PUMA '}).sourceFingerprint, baseline.sourceFingerprint);
  assert.notEqual(run({...de, note: ''}, {...en, note: ''}).sourceFingerprint, baseline.sourceFingerprint);
  const required = schema.extend({label: t(z.string().optional())});
  assert.notEqual(project(required, de, en, 'en', dependencies).sourceFingerprint, baseline.sourceFingerprint);
  assert.throws(() => run(de, {...en, note: 'orphan'}), /Orphan translation/);
});

test('object key order is canonical, direct EN corrections invalidate only their target evidence', () => {
  assert.equal(run({width: 400, href: de.href, label: 'PUMA'}).sourceFingerprint, baseline.sourceFingerprint);
  const direct = run(de, {...en, label: 'English correction'});
  assert.equal(direct.sourceFingerprint, baseline.sourceFingerprint);
  assert.deepEqual(reviewRequired(direct, evidence), ['/label']);
});

test('fact changes in prose are conservative dependencies; only the proven price amount is parametric', () => {
  const source = {...de, label: 'Dauer {{duration.outdoor.min}}, Preis {{offer.film.priceLine}}'}, target = {...en, label: 'Duration {{duration.outdoor.min}}, price {{offer.film.priceLine}}'};
  const first = run(source, target), saved = adoptionEvidence(first);
  const numeric = structuredClone(dependencies);numeric.showDuration.outdoor.min++;
  assert.deepEqual(reviewRequired(run(source, target, numeric), saved), ['/label']);
  const price = structuredClone(dependencies);price.showExtras.film.price.amount++;
  assert.equal(run(source, target, price).sourceFingerprint, first.sourceFingerprint);
  price.showExtras.film.price.qualifier = price.showExtras.film.price.qualifier === 'exact' ? 'from' : 'exact';
  assert.deepEqual(reviewRequired(run(source, target, price), saved), ['/label']);
  const unit = structuredClone(dependencies);unit.showExtras.film.price.currency = 'USD';
  assert.deepEqual(reviewRequired(run(source, target, unit), saved), ['/label']);
});

test('referenced project names and numbers invalidate prose; unreferenced owners do not', () => {
  const id = Object.keys(dependencies.projectFacts).find(id => dependencies.projectFacts[id].drones);
  const source = {...de, label: `{{project.${id}.client}} {{project.${id}.drones}}`};
  const first = run(source, source), saved = adoptionEvidence(first);
  const changed = structuredClone(dependencies);changed.projectFacts[id].drones++;
  assert.deepEqual(reviewRequired(run(source, source, changed), saved), ['/label']);
  const name = structuredClone(dependencies);name.projectFacts[id].client = 'New client';
  assert.deepEqual(reviewRequired(run(source, source, name), saved), ['/label']);
  const unrelated = structuredClone(dependencies);unrelated.contact.email = 'other@example.test';
  assert.equal(run(source, source, unrelated).sourceFingerprint, first.sourceFingerprint);
});

test('structured references resolve their real owner file; semantic owner changes require review', () => {
  const ids = Object.keys(dependencies.people).slice(0, 2);
  const person = s(z.string().meta({'x-afe': {reference: {collection: 'people', encoding: 'id'}}}));
  const model = z.object({copy: t(z.string()), people: z.array(person)});
  const source = {copy: 'Team', people: ids}, target = {...source, copy: 'Our team'};
  const initial = project(model, source, target, 'en', dependencies), saved = adoptionEvidence(initial);
  const reordered = project(model, {...source, people: [...ids].reverse()}, target, 'en', dependencies);
  assert.equal(reordered.sourceFingerprint, initial.sourceFingerprint);
  const changed = structuredClone(dependencies);changed.people[ids[0]].data.name += ' changed';
  assert.deepEqual(reviewRequired(project(model, source, target, 'en', changed), saved), ['/copy']);
  assert.throws(() => project(model, {...source, people: ['foreign']}, target, 'en', dependencies), /Missing i18n dependency/);
  assert.ok(initial.fields.find(field => field.address === '/copy').dependencies.some(dependency => dependency.meaning.file.startsWith('src/content/people/')));
});

test('local date formatting can differ while referencing the same source fact', () => {
  const source = {...de, label: '{{project.puma-bundesliga.date.numeric}}'};
  const target = {...en, label: '{{project.puma-bundesliga.date.long}}'};
  assert.doesNotThrow(() => run(source, target));
  assert.throws(() => run(source, {...target, label: '{{project.puma-bundesliga.date.invalid}}'}), /Unbekanntes Projektfaktenformat/);
});

test('missing token, unknown token, foreign reference and unknown fields stop', () => {
  assert.throws(() => run({...de, label: '{{duration.outdoor.min}}'}, en), /token mismatch/);
  assert.throws(() => run({...de, label: '{{missing.foo}}'}, {...en, label: '{{missing.foo}}'}), /Unknown fact token/);
  assert.throws(() => run({...de, label: '{{project.foreign.client}}'}, {...en, label: '{{project.foreign.client}}'}), /Unbekannter Projektfakt/);
  assert.throws(() => run({...de, unknown: 'no'}), /Unknown i18n field/);
  assert.throws(() => run(de, {...en, unknown: 'no'}), /Unknown i18n field/);
  assert.throws(() => run({...de, label: '{{duration.outdoor.min}}'}, {...en, label: '{{duration.outdoor.min}}'}, {}), /Missing i18n dependency/);
});

test('adoption preserves provenance without reinterpreting historical editorReviewed as human review', () => {
  assert.deepEqual(evidence.legacy, {editorReviewed: true, origin: 'machine-new'});
  assert.ok(evidence.fields.every(field => field.status === 'adopted-existing'));
  assert.equal(JSON.stringify(evidence).includes('"status":"reviewed"'), false);
  assert.deepEqual(reviewRequired(baseline, evidence), []);
  const pending = structuredClone(evidence);pending.fields[0].status = 'unreviewed';
  assert.equal(reviewRequired(baseline, pending).length, 1);
  assert.throws(() => reviewRequired(baseline, {...evidence, version: 1}), /Incompatible/);
  assert.throws(() => reviewRequired(baseline, {...evidence, fields: [...evidence.fields, evidence.fields[0]]}), /Duplicate/);
  assert.throws(() => reviewRequired(baseline, {...evidence, fields: [...evidence.fields, {address: '/orphan', status: 'reviewed'}]}), /Orphan/);
});

test('new fingerprints never bypass a stale legacy raw hash, including comment-only changes', () => {
  const pair = pairs[0], before = checkParallel(pair);
  const sourceRaw = '# contract comment\n' + pair.sourceRaw;
  assert.throws(() => checkParallel({...pair, sourceRaw, evidence: adoptionEvidence(before)}), /Stale legacy/);
  assert.equal(project(pair.schema, pair.source, pair.target, pair.locale, dependencies).sourceFingerprint, before.sourceFingerprint);
  assert.notEqual(fingerprint('x'), createHash('sha256').update('x').digest('hex'));
  assert.notEqual(fingerprint(undefined), fingerprint(['undefined']));
});

for (const scenario of ['reorder plus text change with repeated section types', 'nested and primitive translated list reorder', 'insert/delete retains evidence of surviving items', 'duplicate gets a fresh key; duplicate/missing keys stop', 'pure shared reorder preserves all translation addresses']) {
  test.todo(`Step 2 stable keys required: ${scenario}`);
}
