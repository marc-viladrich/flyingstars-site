import {reviewedRequest} from './test/requests.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {i18nFixture} from './i18n-test-fixture.mjs';
import {NativeBuilder} from 'astro-frontend-editor/runtime';
import {legalDocuments} from '../scripts/check-contact-drift.mjs';
import {projectContact,legalContactDrift} from '../src/content/contact.mjs';
test('Kontakt: tatsächliches Editor-Speichern ändert Footer, Section, ContactWays, Danke und Marker; Rechtsfassungen bleiben eigenständig',async t=>{
 const {source:dir,store}=await i18nFixture(t);
 t.after(()=>store.sync.close());
 const site=store.site;
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
  // Danke trägt seit Moritz' Text (18.11.2026) keinen eigenen Kontaktabsatz mehr; Kontakt steht dort im Footer.
  const thanks=await readFile(path.join(artifact.site,locale,'danke/index.html'),'utf8');
  const thanksFooter=thanks.split('<footer')[1];
  assert.ok(thanksFooter.includes(changed.phone));assert.ok(thanksFooter.includes(changed.email));assert.ok(!thanks.includes('{{contact.'));
  // Telefonknopf und Beschreibung der Startseite folgen derselben Nummer ({{contact.phone.international}}/href)
  const home=await readFile(path.join(artifact.site,locale,'index.html'),'utf8');
  assert.ok(home.includes('href="tel:+492099991234"'));assert.ok(home.includes('☎︎ +49 209 9991234'));assert.ok(!home.includes('88306562'));assert.ok(!home.includes('{{contact.'));
  for(const [name,markup]of [['Footer',footer],['ContactWays',ways],['Kontakt-Section',section]]){
   const markers=[...markup.matchAll(/data-afe="([^"]+)"/g)].map(match=>JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'))).flatMap(value=>value.markers??[value]);
   assert.ok(markers.some(marker=>marker.kind==='field'&&marker.mode==='panel'&&marker.address.owner.collection==='contact'&&marker.address.path.length>0),`Konkreter Kontakt-Feldmarker ${locale} ${name}`);
  }
 }
 assert.deepEqual(legalDocuments(dir),legal);
 assert.equal(legalContactDrift(legal,projectContact(disk)).filter(f=>f.fact==='email').length,6);
});
