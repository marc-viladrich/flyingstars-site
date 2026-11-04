import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {factFixture} from './test/fact-fixture.mjs';
import {money} from '../src/lib/price.mjs';
test('Sonderangebote: gespeicherter Preis ändert Vergleich, Extras, Anlass-Preis und FAQ ohne Änderung der Satzmuster',async t=>{
 const proof=await factFixture(t),data=JSON.parse(await readFile(path.join(proof.dir,'src/content/show-extras.json'),'utf8'));
 const state=await proof.save('site/show-extras',{film:{...data.film,price:{...data.film.price,amount:1200}},schweiz:{...data.schweiz,price:{...data.schweiz.price,amount:2200}},indoor:{...data.indoor,price:{...data.indoor.price,amount:16000},drones:{min:25,max:55},ceilingMin:4}});
 const artifact=await proof.build(state.head);
 for(const locale of ['de','en','nl']){
  const prefix=locale==='de'?'':locale+'/';
  const pricing=await readFile(path.join(artifact.site,prefix,'drohnenshow-preise/index.html'),'utf8');
  for(const amount of [1200,2200,16000])assert.ok(pricing.includes(money(amount,locale)),`${locale} ${amount}`);
  assert.ok(pricing.includes('25'));assert.ok(pricing.includes('55'));
  const indoor=await readFile(path.join(artifact.site,prefix,'drohnenshow-indoor/index.html'),'utf8');
  assert.ok(indoor.includes(money(16000,locale)));assert.ok(indoor.includes('25–55'));assert.ok(!indoor.includes('{{offer.'));
  const faq=await readFile(path.join(artifact.site,prefix,'faq/index.html'),'utf8');assert.ok(faq.includes(money(16000,locale)));assert.ok(!faq.includes('{{offer.'));
  const wedding=await readFile(path.join(artifact.site,prefix,'drohnenshow-hochzeit/index.html'),'utf8');assert.ok(wedding.includes(money(1200,locale,{style:'suffix'})));
 }
});
