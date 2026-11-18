import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {factFixture} from './test/fact-fixture.mjs';
import {money} from '../src/lib/price.mjs';
test('Paketänderung projiziert Form, Farbe, Bezeichnung und Basis; separater Vorschaupreis ändert kein Angebot',async t=>{
 const proof=await factFixture(t),data=JSON.parse(await readFile(path.join(proof.dir,'src/content/show-packages.json'),'utf8'));
 await proof.save('package/configuration',{SPARK:{...data.SPARK,base:110,orb:'torus',color:[10,20,30]}});
 await proof.save('site/ui',{[data.SPARK.labelKey]:{de:'Prüfbezeichnung',en:'Proof label',nl:'Proeflabel'}});
 const policy=JSON.parse(await readFile(path.join(proof.dir,'src/content/preview-policy.json'),'utf8'));
 const state=await proof.save('site/preview-policy',{extension:{...policy.extension,add:600}});
 const artifact=await proof.build(state.head);
 const labels={de:'prüfbezeichnung',en:'proof label',nl:'proeflabel'};
 for(const [locale,label]of Object.entries(labels)){
  const prefix=locale==='de'?'':locale+'/';
  const pricing=await readFile(path.join(artifact.site,prefix,'drohnenshow-preise/index.html'),'utf8');
  assert.match(pricing,/data-orb="torus" data-color="10,20,30" data-n="110"/);
  const packages=pricing.split('id="pakete"')[1]?.split('</section>')[0];
  assert.ok(packages?.includes(money(data.SPARK.price,locale)),`${locale}: Festpreis der Paketkarte`);
  const form=html=>html.split('id="inquiry-form"')[1]?.split('</form>')[0];
  assert.ok(form(pricing)?.includes(`title="${label}"`),`${locale}: Paketbezeichnung im Preisformular`);
  // The preview policy does not rewrite the commercial package or its price.
  const stored=JSON.parse(await readFile(path.join(proof.dir,'src/content/show-packages.json'),'utf8'));
  assert.equal(stored.SPARK.price,data.SPARK.price);assert.equal(stored.SPARK.max,150);
  const contact=await readFile(path.join(artifact.site,prefix,'kontakt/index.html'),'utf8');
  assert.ok(form(contact)?.includes(`title="${label}"`),`${locale}: Paketbezeichnung im Kontaktformular`);
 }
});
