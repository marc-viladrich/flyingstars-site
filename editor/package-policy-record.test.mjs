import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {factFixture} from './test/fact-fixture.mjs';
test('Paketänderung projiziert Form, Farbe, Bezeichnung und Basis; separater Vorschaupreis ändert kein Angebot',async t=>{
 const proof=await factFixture(t),data=JSON.parse(await readFile(path.join(proof.dir,'src/content/show-packages.json'),'utf8'));
 await proof.save('package/configuration',{SPARK:{...data.SPARK,base:110,orb:'torus',color:[10,20,30]}});
 await proof.save('site/ui',{[data.SPARK.labelKey]:{de:'Prüfbezeichnung',en:'Proof label',nl:'Proeflabel'}});
 const policy=JSON.parse(await readFile(path.join(proof.dir,'src/content/preview-policy.json'),'utf8'));
 const state=await proof.save('site/preview-policy',{extension:{...policy.extension,add:600}});
 const artifact=await proof.build(state.head);
 for(const locale of ['','en/','nl/']){
  const pricing=await readFile(path.join(artifact.site,locale,'drohnenshow-preise/index.html'),'utf8');
  assert.match(pricing,/data-orb="torus" data-color="10,20,30" data-n="110"/);
  assert.ok(pricing.includes(locale===''?'Prüfbezeichnung':locale==='en/'?'Proof label':'Proeflabel'));
  // The preview policy does not rewrite the commercial package or its price.
  const stored=JSON.parse(await readFile(path.join(proof.dir,'src/content/show-packages.json'),'utf8'));
  assert.equal(stored.SPARK.price,data.SPARK.price);assert.equal(stored.SPARK.max,150);
  const contact=await readFile(path.join(artifact.site,locale,'kontakt/index.html'),'utf8');assert.ok(contact.includes(locale===''?'prüfbezeichnung':locale==='en/'?'proof label':'proeflabel'));
 }
});
