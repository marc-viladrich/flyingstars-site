// Run from the checkout being measured. Fixture excludes .env and owns its state.
import {pathToFileURL} from 'node:url';
import {rm} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const root=process.cwd(),load=p=>import(pathToFileURL(root+'/'+p));
const {i18nFixture}=await load('editor/i18n-test-fixture.mjs');
const {root:temporary,store}=await i18nFixture(null,{sourceRoot:root});
if(process.argv.includes('--trace')){
 const measure=(object,key)=>{const original=object[key].bind(object);object[key]=async(...args)=>{const start=performance.now();try{return await original(...args);}finally{console.error(key,performance.now()-start);}};};
 measure(store,'computeState');measure(store.sourceAdapter,'commit');
}
try {
 let start=performance.now(),state=await store.state();
 console.log(JSON.stringify({phase:'cold-state',ms:performance.now()-start}));
 for(const kind of ['text','shared']) {
  const path=kind==='text'?['title']:['sections',0,'cta','href'];
  const value=kind==='text'?'Benchmark text':'/kontakt/?benchmark=shared';
  let payload;
  start=performance.now();
  if(state.records.find(r=>r.id==='page/en/index').data.translationContractVersion===2){
   const {reviewedRequest}=await load('editor/test/requests.mjs');payload=reviewedRequest(state,[['page/index',path,value]]);
  }else payload={expectedHead:state.head,requestId:randomUUID(),changes:['page/index','page/en/index','page/nl/index'].map(id=>({id,expectedRevision:state.records.find(r=>r.id===id).revision,patches:[{path,value}]}))};
  const prepareMs=performance.now()-start;start=performance.now();state=await store.save(payload);
  const saveMs=performance.now()-start;
  assert.equal(state.records.find(r=>r.id==='page/index').data.title,'Benchmark text');
  if(kind==='shared')for(const id of ['page/index','page/en/index','page/nl/index'])assert.equal(state.records.find(r=>r.id===id).data.sections[0].cta.href,value);
  console.log(JSON.stringify({phase:kind,prepareMs,saveMs}));
 }
}finally{store.sync.close();await rm(temporary,{recursive:true,force:true});}
