import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';

test('Root writes parse only changed leaves, independent of evidence count',async()=>{
 const site=await createFlyingStarsAdapter(process.cwd());
 const adapter=site.createSourceAdapter({root:process.cwd(),site});
 const source=site.sourceFor('page/en/index');
 const text=readFileSync(source.file,'utf8'),decoded=adapter.decode(source,text);
 const originalTitle=decoded.raw.title;decoded.raw.title='temporary caller mutation';
 assert.equal(adapter.decode(source,text).raw.title,originalTitle);decoded.raw.title=originalTitle;
 assert.throws(()=>adapter.decode(source,text+'\nunknownContractField: true\n'),/Unknown i18n field/);
 const raw=structuredClone(decoded.raw);raw.title+=' proof';
 for(const field of raw.translationEvidence.fields)field.targetFingerprint='a'.repeat(64);
 const parse=codecs.yaml.parse;let reads=0;
 codecs.yaml.parse=function(...args){reads++;return parse.apply(this,args);};
 let output;
 try{output=adapter.encode(source,raw,decoded.doc,[{path:[],value:raw}]);}finally{codecs.yaml.parse=parse;}
 assert.ok(reads<=7,`Root write parsed ${reads} times for a title and the whole evidence block`);
 assert.deepEqual(adapter.decode(source,output).raw,raw);
 assert.ok(output.includes('translationEvidence:'));
 const staged=[];adapter.registry.begin=()=>({stage:async operation=>staged.push(operation),commit:async()=>({head:'proof'})});
 await adapter.commit([{address:source.address,file:source.file,before:Buffer.from(text),bytes:Buffer.from(output),raw}],{parent:'proof'});
 assert.equal(staged.length,3);
 assert.ok(staged.every(operation=>operation.path.length>0),'Commit must not stage a whole existing record');
 assert.equal(adapter.encode(source,decoded.raw,decoded.doc,[{path:[],value:decoded.raw}]),text);
});

test('Successful contract cache invalidates for changed text, evidence and dependency owners',async()=>{
 const {readContractRecords}=await import('../src/i18n/read-contracts.mjs');
 const {localeTransactions}=await import('./design/locale-transactions.mjs');
 const site=await createFlyingStarsAdapter(process.cwd()),records=readContractRecords(process.cwd(),site);
 const hooks=localeTransactions(process.cwd(),site.sourceFor);
 hooks.validateTransaction({nextRecords:records});hooks.validateTransaction({nextRecords:structuredClone(records)});
 for(const mutate of [
  rows=>{rows.find(r=>r.id==='site/contact').data.phone='01234 987654';},
  rows=>{rows.find(r=>r.id==='page/index').data.title+=' stale';},
  rows=>{rows.find(r=>r.id==='page/en/index').data.translationEvidence.fields[0].status='unreviewed';},
 ]){
  const changed=structuredClone(records);mutate(changed);
  assert.throws(()=>hooks.validateTransaction({nextRecords:changed}));
 }
 hooks.validateTransaction({nextRecords:records});
});
