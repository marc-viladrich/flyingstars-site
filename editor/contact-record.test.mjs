import {reviewedRequest} from './test/requests.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,symlink,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {NativeStore,NativeBuilder,git} from 'astro-frontend-editor/runtime';
import {createSite} from './flyingstars-adapter.mjs';
import {resolveRuntimeOptions} from './server.mjs';
import {legalDocuments} from '../scripts/check-contact-drift.mjs';
import {projectContact,legalContactDrift} from '../src/content/contact.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('Kontakt: tatsächliches Editor-Speichern ändert Footer, Section, ContactWays, Danke und Marker; Rechtsfassungen bleiben eigenständig',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'fs-contact-proof-'));
 await git(root,['clone','--quiet','--no-hardlinks',root,dir]);
 await git(dir,['checkout','-B','content/draft']);
 await symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'));
 const site=await createSite(dir),runtime=resolveRuntimeOptions({env:{},values:{siteRoot:dir,stateDir:path.join(dir,'state')}});
 const store=await new NativeStore(dir,{remote:false,site,runtime}).init();
 t.after(async()=>{store.sync.close();await rm(dir,{recursive:true,force:true});});
 const state=await store.state(),record=state.records.find(r=>r.id==='site/contact');
 assert.equal(record.title,'Kontakt');
 assert.deepEqual(site.sourcesFromFiles(['src/content/contact.json']).map(s=>s.id),['site/contact']);
 const legal=legalDocuments(dir);
 const changed={phone:'0209 999 12 34',mobile:'01579 999 12 34',email:'probe@example.org',visit:['Testweg 8'],post:['FlyingStars GmbH','Teststraße 7','45888 Gelsenkirchen']};
 const saved=await store.save(reviewedRequest(state,Object.entries(changed).map(([key,value])=>[record.id,[key],value])));
 const disk=JSON.parse(await readFile(path.join(dir,'src/content/contact.json'),'utf8'));
 for(const [key,value]of Object.entries(changed))assert.deepEqual(disk[key],value);
 const builder=new NativeBuilder(store,path.join(dir,'artifacts'),{editor:true,origin:'https://flyingstars.art',env:{...process.env,AFE_STATE_DIR:path.join(dir,'build-state'),FLYINGSTARS_OFFLINE_MEDIA:'1'}});
 const artifact=await builder.prepare(saved.head);
 for(const locale of ['','en/','nl/']){
  const html=await readFile(path.join(artifact.site,locale,'kontakt/index.html'),'utf8');
  const footer=html.split('<footer')[1];
  for(const value of [changed.phone,changed.email,'Testweg 8','Teststraße 7'])assert.ok(footer.includes(value),`Footer ${locale}: ${value}`);
  assert.ok(html.includes('tel:+492099991234'));assert.ok(html.includes('https://wa.me/4915799991234'));
  const section=html.split('class="cd-grid"')[1]?.split('</ul>')[0];
  for(const value of [changed.phone,changed.mobile,changed.email,'Testweg 8','Teststraße 7'])assert.ok(section?.includes(value),`Section ${locale}: ${value}`);
  const ways=html.split('class="ways"')[1]?.split('</ul>')[0];
  assert.ok(ways?.includes(changed.phone));assert.ok(ways?.includes(changed.email));
  const thanks=await readFile(path.join(artifact.site,locale,'danke/index.html'),'utf8');
  assert.ok(thanks.includes(changed.phone));assert.ok(thanks.includes(changed.email));assert.ok(!thanks.includes('{{contact.'));
  const thanksMarkers=[...thanks.matchAll(/data-afe="([^"]+)"/g)].map(match=>JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'))).flatMap(value=>value.markers??[value]);
  assert.ok(thanksMarkers.some(marker=>marker.kind==='field'&&marker.mode==='panel'&&marker.address.path.at(-1)==='body'),'Danke bearbeitet die Vorlage im Panel statt aufgelöste Werte zurückzuschreiben');
  for(const [name,markup]of [['Footer',footer],['ContactWays',ways],['Kontakt-Section',section]]){
   const markers=[...markup.matchAll(/data-afe="([^"]+)"/g)].map(match=>JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'))).flatMap(value=>value.markers??[value]);
   assert.ok(markers.some(marker=>marker.kind==='field'&&marker.mode==='panel'&&marker.address.owner.collection==='contact'&&marker.address.path.length===0),`Direkter Kontakt-Datensatzmarker ${locale} ${name}`);
  }
 }
 assert.deepEqual(legalDocuments(dir),legal);
 assert.equal(legalContactDrift(legal,projectContact(disk)).filter(f=>f.fact==='email').length,6);
});
