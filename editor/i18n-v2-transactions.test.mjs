import './test/register-browser-site.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';import path from 'node:path';
import {NativeStore,git,failure} from 'astro-frontend-editor/runtime';
import {NativeDraft,sectionMutation} from 'astro-frontend-editor/web/native-draft.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import {i18nFixture} from './i18n-test-fixture.mjs';
import {request,reviewedRequest} from './test/requests.mjs';
import {localeProposals,applyLocaleProposals} from './design/locale-review.mjs';
import {auditContracts} from '../src/i18n/read-contracts.mjs';
let fixture,store;
test.before(async()=>{fixture=await i18nFixture();store=fixture.store;});
test.after(async()=>{store?.sync.close();await import('node:fs/promises').then(fs=>fs.rm(fixture.root,{recursive:true,force:true}));});
const draftFor=state=>{const draft=new NativeDraft();draft.reset(state.records);return draft;};
const savedFile=(locale='')=>path.join(store.root,'src/content/pages',locale,'index.yaml');
test('AFE: changing one shared URL produces both projections and writes no review status',async()=>{
 const state=await store.state(),d=draftFor(state),evidence=['en','nl'].map(l=>d.get(`page/${l}/index`).data.translationEvidence);
 d.set('page/index',['sections',0,'cta','href'],'/kontakt/?proof=shared');const proposals=localeProposals(d);assert.ok(proposals.every(p=>p.needed.length===0));applyLocaleProposals(d,proposals);
 const saved=await store.save(d.request(state.head,crypto.randomUUID()));
 for(const[l,i]of ['en','nl'].map((l,i)=>[l,i])){const target=saved.records.find(r=>r.id===`page/${l}/index`);assert.equal(target.data.sections[0].cta.href,'/kontakt/?proof=shared');assert.deepEqual(target.data.translationEvidence,evidence[i]);assert.equal(target.data.translationReview,undefined);}
 assert.equal(auditContracts(store.site,saved.records).length,132);
});
test('AFE: source text needs explicit field review; cancellation and proposals save nothing',async()=>{
 const state=await store.state(),d=draftFor(state),before=await readFile(savedFile());d.set('page/index',['title'],'Titel mit expliziter Prüfung');const p=localeProposals(d),snapshot=structuredClone([...d.local]);p[0].data.title='Unaccepted suggestion';assert.deepEqual([...d.local],snapshot);assert.equal(await store.head(),state.head);assert.deepEqual(await readFile(savedFile()),before);
 await assert.rejects(store.save(request(state,[['page/index',['title'],'Titel ohne Prüfung']])),/beide Sprachfassungen/);
 applyLocaleProposals(d,p);await assert.rejects(store.save(d.request(state.head,crypto.randomUUID())),/Textprüfung/);assert.equal(await store.head(),state.head);
 applyLocaleProposals(d,p,{reviewed:true});const saved=await store.save(d.request(state.head,crypto.randomUUID()));for(const l of ['en','nl'])assert.equal(saved.records.find(r=>r.id===`page/${l}/index`).data.translationEvidence.fields.find(f=>f.address==='/title').status,'reviewed');
});
test('AFE: shared writes and forged hashes/evidence cannot bypass a root patch',async()=>{
 const state=await store.state(),target=state.records.find(r=>r.id==='page/en/index');
 for(const mutate of [d=>d.sections[0].cta.href='/forbidden/',d=>d.translationSourceHash='0'.repeat(64),d=>d.translationEvidence.fields[0].status='unreviewed']){const data=structuredClone(target.data);mutate(data);await assert.rejects(store.save(request(state,[[target.id,[],data]])));assert.equal(await store.head(),state.head);}
});
test('AFE: a new shared value and a forged current source stamp do not approve stale text',async()=>{
 const state=await store.state(),d=draftFor(state);d.set('page/index',['title'],'Neue Quelle ohne Review');d.set('page/index',['sections',0,'cta','href'],'/kontakt/?stale');applyLocaleProposals(d,localeProposals(d));await assert.rejects(store.save(d.request(state.head,crypto.randomUUID())),/Textprüfung/);assert.equal(await store.head(),state.head);
});
test('AFE: direct EN correction preserves DE bytes and updates only the corrected target proof',async()=>{
 const state=await store.state(),de=await readFile(savedFile()),target=state.records.find(r=>r.id==='page/en/index'),saved=await store.save(request(state,[[target.id,['title'],'Direct English correction']])),after=saved.records.find(r=>r.id===target.id);
 assert.deepEqual(await readFile(savedFile()),de);assert.equal(after.data.translationSourceHash,target.data.translationSourceHash);assert.equal(after.data.translationEvidence.fields.find(f=>f.address==='/title').status,'reviewed');assert.deepEqual(after.data.translationEvidence.fields.filter(f=>f.address!=='/title'),target.data.translationEvidence.fields.filter(f=>f.address!=='/title'));
 const reloaded=await store.stateAt(saved.head);assert.equal(reloaded.records.find(r=>r.id===target.id).data.title,'Direct English correction');
});
test('AFE: repeated section type with reorder plus text edit keeps translated ownership after save/reload',async()=>{
 let state=await store.state(),source=state.records.find(r=>r.id==='page/index');const copy=sectionMutation(source.data.sections,0,'duplicate');state=await store.save(reviewedRequest(state,[[source.id,['sections'],copy]]));source=state.records.find(r=>r.id==='page/index');const d=draftFor(state),sections=structuredClone(source.data.sections),key=sections[0]._key;[sections[0],sections[1]]=[sections[1],sections[0]];sections[1].headline+=' Umgestellt';d.set(source.id,['sections'],sections);
 const p=localeProposals(d);for(const proposal of p){assert.equal(proposal.data.sections[1]._key,key);assert.ok(proposal.needed.includes('/sections/@'+key+'/headline'));assert.equal(proposal.data.sections[1].headline,state.records.find(r=>r.id===proposal.id).data.sections[0].headline);}
 applyLocaleProposals(d,p,{reviewed:true});const saved=await store.save(d.request(state.head,crypto.randomUUID()));assert.equal(auditContracts(store.site,saved.records).length,132);
});
test('AFE: an external DE change rejects a target correction without overwriting either file',async()=>{
 const state=await store.state(),de=await readFile(savedFile(),'utf8'),en=await readFile(savedFile('en'),'utf8');await writeFile(savedFile(),de+'\n# simultaneous external source change\n');try{await assert.rejects(store.save(request(state,[['page/en/index',['title'],'Concurrent correction']])),/außerhalb/);assert.equal(await store.head(),state.head);assert.equal(await readFile(savedFile('en'),'utf8'),en);assert.equal(await readFile(savedFile(),'utf8'),de+'\n# simultaneous external source change\n');}finally{await writeFile(savedFile(),de);}
});
test('AFE: candidate build failure leaves DE, targets and proofs at their previous commit',async()=>{
 const state=await store.state(),files=await Promise.all(['','en','nl'].map(l=>readFile(savedFile(l),'utf8')));store.verify=async()=>{throw failure('Candidate build failed',422);};try{await assert.rejects(store.save(reviewedRequest(state,[['page/index',['title'],'Rejected candidate']])),e=>e.status===422);assert.equal(await store.head(),state.head);assert.deepEqual(await Promise.all(['','en','nl'].map(l=>readFile(savedFile(l),'utf8'))),files);assert.equal(await git(store.root,['status','--porcelain']),'');}finally{delete store.verify;}
});
test('AFE: preview projects the same shared values while preserving stale text evidence',async()=>{
 const state=await store.state(),file='src/content/pages/index.yaml',raw=await readFile(savedFile(),'utf8');let next=codecs.yaml.update(raw,['sections',0,'cta','href'],'/kontakt/?preview');next=codecs.yaml.update(next,['title'],'Unreviewed preview title');
 const files=new Map([[file,next]]),extra=store.site.extensions.collect('previewFiles',{head:state.head,files});
 for(const l of ['en','nl']){const name=`src/content/pages/${l}/index.yaml`,entry=extra.find(([f])=>f===name),data=codecs.yaml.parse(entry[1]);assert.equal(data.sections[0].cta.href,'/kontakt/?preview');assert.deepEqual(data.translationEvidence,state.records.find(r=>r.id===`page/${l}/index`).data.translationEvidence);assert.equal(data.translationReview,undefined);}
 assert.equal(await store.head(),state.head);
});
