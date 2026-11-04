import {reviewedRequest} from './test/requests.mjs';
import {contentData} from '../src/i18n/transaction.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,symlink,rm,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {randomUUID} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {NativeStore,NativeBuilder,git} from 'astro-frontend-editor/runtime';
import {createSite} from './flyingstars-adapter.mjs';import {resolveRuntimeOptions} from './server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('T02: natives AFE-Speichern von Bio/Rolle und beiden Bausteinen erreicht alle DE/EN/NL-Verbraucher und Besitzer-Marker',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'fs-t02-proof-'));
 await git(root,['clone','--quiet','--no-hardlinks',root,dir]);await git(dir,['checkout','-B','content/draft']);await symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'));
 const site=await createSite(dir),runtime=resolveRuntimeOptions({env:{},values:{siteRoot:dir,stateDir:path.join(dir,'state')}}),store=await new NativeStore(dir,{remote:false,site,runtime}).init();
 t.after(async()=>{store.sync.close();await rm(dir,{recursive:true,force:true});});
 const state=await store.state(),ids=['person/florian-becker','site/safety-concept','site/sustainability-pillars'];
 const before={};for(const l of ['','en/','nl/'])for(const n of ['index','ueber-uns','drohnenshow-hochzeit','drohnenshow-werbung']){const file=`src/content/pages/${l}${n}.yaml`;before[file]=await readFile(path.join(dir,file),'utf8');}
 const changes=ids.map(id=>{const record=state.records.find(r=>r.id===id);assert.ok(record,id);return {id,expectedRevision:record.revision,patches:['de','en','nl'].flatMap(locale=>id.startsWith('person/')?[{path:['bio',locale],value:'Beweisbiografie '+locale},{path:['role',locale],value:'Beweisrolle '+locale}]:id==='site/safety-concept'?[{path:[locale,'items',0,'text'],value:'Beweissicherheit '+locale},{path:[locale,'responsibilities',0,'task'],value:'Beweisaufgabe '+locale}]:[{path:[locale,'pillars',0,'text'],value:'Beweisnachhaltigkeit '+locale}])};});
 const saved=await store.save(reviewedRequest(state,changes.flatMap(change=>change.patches.map(patch=>[change.id,patch.path,patch.value]))));
 for(const [file,raw]of Object.entries(before))assert.deepEqual(contentData(codecs.yaml.parse(await readFile(path.join(dir,file),'utf8'))),contentData(codecs.yaml.parse(raw)),'Seiten bleiben Referenzen; nur betroffene Nachweise werden bestätigt');
 const persisted=JSON.parse(await readFile(path.join(dir,'src/content/people/florian-becker.json'),'utf8'));assert.equal(persisted.bio.de,'Beweisbiografie de');
 const builder=new NativeBuilder(store,path.join(dir,'artifacts'),{editor:true,origin:'https://flyingstars.art',env:{...process.env,AFE_STATE_DIR:path.join(dir,'build-state'),FLYINGSTARS_OFFLINE_MEDIA:'1'}}),artifact=await builder.prepare(saved.head);
 const markers=html=>[...html.matchAll(/data-afe="([^"]+)"/g)].flatMap(m=>{const p=JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));return p.markers??[p];});
 const evidence=path.join(process.env.AFE_STATE_DIR??dir,'t02-proof');await mkdir(evidence,{recursive:true});
 for(const locale of ['de','en','nl'])for(const name of ['index','ueber-uns','drohnenshow-hochzeit','drohnenshow-werbung']){
  const html=await readFile(path.join(artifact.site,locale==='de'?'':locale,name==='index'?'index.html':`${name}/index.html`),'utf8');await writeFile(path.join(evidence,`${locale}-${name}.html`),html);
  const actual=markers(html),visible=html.replaceAll('&nbsp;',' ').replaceAll('\u00a0',' '),has=(collection,p)=>actual.some(m=>m.address?.owner?.collection===collection&&JSON.stringify(m.address.path)===JSON.stringify(p));
  if(['index','ueber-uns'].includes(name)){assert.ok(visible.includes('Beweisbiografie '+locale));assert.ok(visible.includes('Beweisrolle '+locale));assert.ok(visible.includes('Beweisnachhaltigkeit '+locale));assert.ok(has('people',['bio',locale]));assert.ok(has('people',['role',locale]));assert.ok(has('sustainabilityPillars',[locale,'pillars']));}
  if(name!=='index'){assert.ok(visible.includes('Beweissicherheit '+locale));assert.ok(visible.includes('Beweisaufgabe '+locale));assert.ok(has('safetyConcept',[locale,'items']));assert.ok(has('safetyConcept',[locale,'responsibilities']));}
 }
});
