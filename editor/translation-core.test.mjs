import './test/register-browser-site.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {site,records,record,root} from './test/design-data.mjs';
import {localeTransactions} from './design/locale-transactions.mjs';
import {dependenciesFromRecords,prepareLocale,approvalFor,verifyCurrent} from '../src/i18n/transaction.mjs';
import {project} from '../src/i18n/contract.mjs';
const candidate=()=>({state:{records},nextRecords:structuredClone(records),seen:new Set(['page/index','page/en/index','page/nl/index'])});
test('German-only changes and executable URLs are rejected',()=>{const policy=localeTransactions(root,site.sourceFor),c=candidate();c.seen=new Set(['page/index']);assert.throws(()=>policy.prepareTransaction(c),/page\/en\/index, page\/nl\/index/);assert.throws(()=>policy.validateWrite({}, {},{href:'javascript:alert(1)'}),/Ausführbare/);});
test('Byte revisions still guard concurrency; translation freshness ignores byte-only revisions',()=>{
 const c=candidate();c.nextRecords.find(r=>r.id==='page/index').revision='a'.repeat(64);
 const out=localeTransactions(root,site.sourceFor).prepareTransaction(c);assert.equal(out.length,2);
 for(const p of out)assert.equal(p.data.translationSourceHash,record(p.id).data.translationSourceHash);
});
test('New shared values cannot conceal stale text through a current fingerprint',()=>{
 const c=candidate(),de=c.nextRecords.find(r=>r.id==='page/index');de.data.title+=' Neu';de.data.sections[0].cta.href='/kontakt/';
 for(const locale of ['en','nl']){const target=c.nextRecords.find(r=>r.id===`page/${locale}/index`);target.data.sections[0].cta.href='/kontakt/';}
 assert.throws(()=>localeTransactions(root,site.sourceFor).prepareTransaction(c),/Explizite Textprüfung/);
});
test('Explicit review carries exact source and target field fingerprints',()=>{
 const c=candidate(),de=c.nextRecords.find(r=>r.id==='page/index');de.data.title+=' Neu';
 for(const locale of ['en','nl']){const target=c.nextRecords.find(r=>r.id===`page/${locale}/index`),{result,needed}=prepareLocale(de.schema,de.data,target.data,locale,dependenciesFromRecords(c.nextRecords));target.data.translationReview=approvalFor(result,needed);}
 const out=localeTransactions(root,site.sourceFor).prepareTransaction(c);for(const p of out){assert.equal(p.data.translationEvidence.fields.find(f=>f.address==='/title').status,'reviewed');assert.equal(p.data.translationReview,undefined);verifyCurrent(de.schema,de.data,p.data,p.id.split('/')[1],dependenciesFromRecords(c.nextRecords));}
});

test('Build readers reject target-only structural reorder even with unchanged text fingerprints',()=>{
 const source=record('page/index'),target=structuredClone(record('page/en/index'));
 [target.data.sections[0],target.data.sections[1]]=[target.data.sections[1],target.data.sections[0]];
 assert.throws(()=>verifyCurrent(source.schema,source.data,target.data,'en',dependenciesFromRecords(records)),/stale/);
});

test('The raw-file boundary rejects unknown nested fields before schema stripping',async()=>{
 const {assertKnownFields}=await import('../src/i18n/contract.mjs');const source=record('page/index'),data=structuredClone(source.data);data.sections[0].unknown='must not disappear';assert.throws(()=>assertKnownFields(site.sourceFor(source.id).schema,data),/Unknown i18n field/);
});
test('Only the existing contact href token is accepted as a Markdown link template',()=>{
 assert.equal(site.editorialHref.test('{{contact.phone.href}}'),true);assert.equal(site.editorialHref.test('{{contact.unknown.href}}'),false);assert.equal(site.editorialHref.test('javascript:alert(1)'),false);
});

test('Derived total-drone markers resolve their existing project-fact object',async()=>{
 const {projectFactPath}=await import('../src/content/project-facts.mjs');const owner=record('site/project-facts').data;
 const total={project:'bokkenrijders-musical-2026',field:'totalDrones'},ordinary={...total,field:'drones'};
 assert.equal(projectFactPath(total).reduce((v,k)=>v[k],owner),owner[total.project]);assert.equal(typeof projectFactPath(ordinary).reduce((v,k)=>v[k],owner),'number');
});

test('The installed source adapter rejects unknown raw fields and duplicate list keys on decode',async()=>{
 const {readFile}=await import('node:fs/promises'),{codecs}=await import('astro-frontend-editor/runtime/extensions'),source=site.sourceFor('page/index'),adapter=site.createSourceAdapter({root,site,git:()=>{}}),raw=await readFile(root+source.file,'utf8');
 assert.throws(()=>adapter.decode(source,raw+'\nunknownForContract: true\n'),/Unknown i18n field/);const data=codecs.yaml.parse(raw);data.sections[1]._key=data.sections[0]._key;assert.throws(()=>adapter.decode(source,codecs.yaml.create(data)),/Duplicate _key/);
});
