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

const listSchema = z.object({items: z.array(z.object({_key:s(z.string()),type:s(z.literal('same')),text:t(z.string()),children:z.array(z.object({_key:s(z.string()),value:t(z.string())}))}))});
const row=(key,text)=>({_key:key,type:'same',text,children:[{_key:key+'_child',value:text+' child'}]});
const listDE={items:[row('key_first','Erster'),row('key_second','Zweiter')]},listEN={items:[row('key_first','First'),row('key_second','Second')]};
const listRun=(a=listDE,b=listEN)=>project(listSchema,a,b,'en');
const listBaseline=listRun(),listEvidence=adoptionEvidence(listBaseline);
test('stable keys: reorder plus text change with repeated section types',()=>{
 const after={items:[{...listDE.items[1],text:'Neu'},listDE.items[0]]},out=listRun(after);
 assert.deepEqual(out.projection.items.map(v=>v.text),['Second','First']);
 assert.deepEqual(reviewRequired(out,listEvidence),['/items/@key_second/text']);
 assert.deepEqual(out.fields.find(f=>f.address==='/items/@key_second/text').path,['items',0,'text']);
});
test('stable keys: nested primitive text reorder retains source and target association',()=>{
 const de=structuredClone(listDE),en=structuredClone(listEN);de.items[0].children.push({_key:'another_child',value:'Noch einer'});en.items[0].children.push({_key:'another_child',value:'Another'});
 const before=listRun(de,en);de.items[0].children.reverse();const out=listRun(de,en);
 assert.equal(out.sourceFingerprint,before.sourceFingerprint);
 assert.deepEqual(out.projection.items[0].children.map(v=>v.value),['Another','Erster child'.replace('Erster','First')]);
});
test('stable keys: insert/delete requires evidence only for inserted elements',()=>{
 const de={items:[listDE.items[1],row('key_third','Dritter')]},en={items:[listEN.items[1],row('key_third','Third')]};
 const out=listRun(de,en),surviving={...listEvidence,fields:listEvidence.fields.filter(f=>!f.address.includes('@key_first/'))};
 assert.deepEqual(reviewRequired(out,surviving),['/items/@key_third/children/@key_third_child/value','/items/@key_third/text']);
 assert.throws(()=>reviewRequired(out,listEvidence),/Orphan/);
});
test('stable keys: copies get fresh nested identities; missing/duplicate keys stop',async()=>{
 const {renewKeys}=await import('../src/i18n/keys.mjs'),copy=renewKeys(structuredClone(listDE.items[0]));
 assert.notEqual(copy._key,listDE.items[0]._key);assert.notEqual(copy.children[0]._key,listDE.items[0].children[0]._key);
 for(const data of [{items:[listDE.items[0],listDE.items[0]]},{items:[{...listDE.items[0],_key:undefined}]}])assert.throws(()=>listRun(data),/_key/);
 assert.throws(()=>listRun(listDE,{items:[listEN.items[0],listEN.items[0]]}),/Duplicate/);
});
test('stable keys: pure reorder preserves every translated address and review',()=>{
 const out=listRun({items:[...listDE.items].reverse()});assert.equal(out.sourceFingerprint,listBaseline.sourceFingerprint);
 assert.deepEqual(reviewRequired(out,listEvidence),[]);assert.deepEqual(out.fields.map(f=>f.address),listBaseline.fields.map(f=>f.address));
});
test('portable SHA-256 agrees with Node for Unicode, empty and multiblock input',async()=>{
 const {sha256}=await import('../src/i18n/sha256.mjs');for(const text of ['', 'abc', 'ä🎉'.repeat(1000)])assert.equal(sha256(text),createHash('sha256').update(text).digest('hex'));
});
