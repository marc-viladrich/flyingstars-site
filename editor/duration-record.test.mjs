import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {factFixture} from './test/fact-fixture.mjs';
test('Editor-Showzeiten ändern gebaute Paketkarten, Konfigurator, FAQ und Indoor-Fakten in allen drei Sprachen',async t=>{
 const proof=await factFixture(t);
 const state=await proof.save('site/show-duration',{outdoor:{min:11,max:24,typical:14},indoor:{min:6,max:9}});
 const artifact=await proof.build(state.head);
 for(const locale of ['','en/','nl/']){
  const home=await readFile(path.join(artifact.site,locale,'index.html'),'utf8');
  assert.match(home,/6 (?:bis|to|tot) 9/);
  const pricing=await readFile(path.join(artifact.site,locale,'drohnenshow-preise/index.html'),'utf8');
  assert.ok(pricing.includes('11–24'));assert.match(pricing,/14 (?:Minuten|minutes|minuten)/);
  const faq=await readFile(path.join(artifact.site,locale,'faq/index.html'),'utf8');
  assert.match(faq,/14 (?:Minuten|minutes|minuten)/);assert.match(faq,/6 (?:bis|to|tot) 9/);
  const indoor=await readFile(path.join(artifact.site,locale,'drohnenshow-indoor/index.html'),'utf8');
  assert.ok(indoor.includes('6–9'));assert.match(indoor,/6 (?:bis|to|tot) 9/);
  assert.ok(!indoor.includes('{{duration.'));assert.ok(!faq.includes('{{duration.'));
  const markers=[...faq.matchAll(/data-afe="([^"]+)"/g)].map(match=>JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'))).flatMap(value=>value.markers??[value]);
  assert.ok(markers.some(marker=>marker.kind==='field'&&marker.mode==='panel'&&marker.address.part==='body'),'FAQ bearbeitet ihre Vorlage im Panel statt aufgelöste Dauerwerte zurückzuschreiben');
 }
});
