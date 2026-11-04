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
