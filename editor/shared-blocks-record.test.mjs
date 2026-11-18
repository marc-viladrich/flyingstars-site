import {reviewedRequest} from './test/requests.mjs';
import {contentData} from '../src/i18n/transaction.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {i18nFixture} from './i18n-test-fixture.mjs';
import {NativeBuilder} from 'astro-frontend-editor/runtime';
test('T02: AFE-Speichern erreicht die DE/EN/NL-Verbraucher und erhält die seitenlokalen Teamtexte',async t=>{
 const {source:dir,store}=await i18nFixture(t);
 t.after(()=>store.sync.close());
 const state=await store.state(),ids=['person/florian-becker','site/safety-concept','site/sustainability-pillars'];
 const before={};for(const l of ['','en/','nl/'])for(const n of ['index','ueber-uns','drohnenshow-hochzeit','drohnenshow-werbung']){const file=`src/content/pages/${l}${n}.yaml`;before[file]=await readFile(path.join(dir,file),'utf8');}
 const changes=ids.map(id=>{const record=state.records.find(r=>r.id===id);assert.ok(record,id);return {id,expectedRevision:record.revision,patches:['de','en','nl'].flatMap(locale=>id.startsWith('person/')?[{path:['bio',locale],value:'Beweisbiografie '+locale},{path:['role',locale],value:'Beweisrolle '+locale}]:id==='site/safety-concept'?[{path:[locale,'items',0,'text'],value:'Beweissicherheit '+locale},{path:[locale,'diagram','description'],value:'Beweisdiagramm '+locale}]:[{path:[locale,'pillars',0,'text'],value:'Beweisnachhaltigkeit '+locale}])};});
 const saved=await store.save(reviewedRequest(state,changes.flatMap(change=>change.patches.map(patch=>[change.id,patch.path,patch.value]))));
 for(const [file,raw]of Object.entries(before))assert.deepEqual(contentData(codecs.yaml.parse(await readFile(path.join(dir,file),'utf8'))),contentData(codecs.yaml.parse(raw)),'Seiten bleiben Referenzen; nur betroffene Nachweise werden bestätigt');
 const persisted=JSON.parse(await readFile(path.join(dir,'src/content/people/florian-becker.json'),'utf8'));assert.equal(persisted.bio.de,'Beweisbiografie de');
 const builder=new NativeBuilder(store,path.join(dir,'artifacts'),{editor:true,origin:'https://flyingstars.art',env:{...process.env,AFE_STATE_DIR:path.join(dir,'build-state'),FLYINGSTARS_OFFLINE_MEDIA:'1'}}),artifact=await builder.prepare(saved.head);
 const markers=html=>[...html.matchAll(/data-afe="([^"]+)"/g)].flatMap(m=>{const p=JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));return p.markers??[p];});
 const evidence=path.join(process.env.AFE_STATE_DIR??dir,'t02-proof');await mkdir(evidence,{recursive:true});
 for(const locale of ['de','en','nl'])for(const name of ['index','ueber-uns','drohnenshow-hochzeit','drohnenshow-werbung']){
  const html=await readFile(path.join(artifact.site,locale==='de'?'':locale,name==='index'?'index.html':`${name}/index.html`),'utf8');await writeFile(path.join(evidence,`${locale}-${name}.html`),html);
  const actual=markers(html),visible=html.replaceAll('&nbsp;',' ').replaceAll('\u00a0',' ');
  const has=(collection,id,p)=>actual.some(m=>m.address?.owner?.collection===collection&&m.address.owner.id===id&&JSON.stringify(m.address.path)===JSON.stringify(p));
  const where=`${locale}/${name}`;
  if(name==='ueber-uns'){
   const prefix=locale==='de'?'':locale+'/';
   const page=codecs.yaml.parse(before[`src/content/pages/${prefix}${name}.yaml`]);
   const member=page.sections.find(section=>section.type==='team').memberTexts.find(entry=>entry.personId==='florian-becker');
   assert.ok(visible.includes(member.bio),`${where}: seitenlokale Bio`);
   assert.ok(visible.includes(member.role),`${where}: seitenlokale Rolle`);
   for(const field of ['bio','role'])assert.ok(!has('people','florian-becker',[field,locale]),`${where}: seitenlokales Feld ${field}`);
  }else{
   assert.ok(visible.includes('Beweisbiografie '+locale),`${where}: Bio`);
   assert.ok(visible.includes('Beweisrolle '+locale),`${where}: Rolle`);
   for(const field of ['bio','role'])assert.ok(has('people','florian-becker',[field,locale]),`${where}: Personendatensatz ${field}`);
   assert.ok(visible.includes('Beweissicherheit '+locale),`${where}: Kartenlegende`);
   assert.ok(visible.includes('Beweisdiagramm '+locale),`${where}: Kartenbeschreibung`);
   for(const field of ['items','diagram'])assert.ok(has('safetyConcept','configuration',[locale,field]),`${where}: Sicherheitsdatensatz ${field}`);
  }
  if(name==='index'){
   assert.ok(visible.includes('Beweisnachhaltigkeit '+locale),`${where}: Nachhaltigkeitspfeiler`);
   assert.ok(has('sustainabilityPillars','configuration',[locale,'pillars']),`${where}: Nachhaltigkeitsdatensatz`);
  }
 }
});
