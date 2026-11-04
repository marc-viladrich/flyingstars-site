import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SHOW_EXTRAS,offerText,footageCell} from '../src/content/show-extras.mjs';
import {SHOW_DURATION} from '../src/content/show-duration.mjs';
import {showExtrasSchema} from '../src/schemas/show-extras.mjs';
import {getPackageDetails} from '../src/content/package-details.ts';
import {money,priceParts} from '../src/lib/price.mjs';
import packages from '../src/content/show-packages.json' with {type:'json'};
test('Film, Schweiz und Indoor besitzen wirksame numerische Preise; Formatierung und Qualifikator bleiben getrennt',()=>{
 const extras=structuredClone(SHOW_EXTRAS);extras.film.price.amount=1200;extras.schweiz.price.amount=2200;extras.indoor.price.amount=16000;extras.indoor.drones={min:25,max:55};
 assert.ok(showExtrasSchema.safeParse(extras).success);
 for(const locale of ['de','en','nl']){
  const details=getPackageDetails(locale,SHOW_DURATION,extras);
  assert.equal(details.COMPARISON.find(s=>s.id==='footage').cells[0],footageCell('SPARK',locale,extras));
  assert.equal(details.COMPARISON.find(s=>s.id==='footage').cells[2],true);
  assert.ok(details.EXTRAS.find(s=>s.id==='film').price.includes(money(1200,locale)));
  assert.ok(details.EXTRAS.find(s=>s.id==='schweiz').price.includes(money(2200,locale)));
  assert.ok(details.EXTRAS.find(s=>s.id==='indoor').price.includes(money(16000,locale)));
  assert.match(details.EXTRAS.find(s=>s.id==='indoor').text,/25.*55/);
 }
 extras.indoor.price.qualifier='exact';
 for(const locale of ['de','en','nl'])assert.ok(getPackageDetails(locale,SHOW_DURATION,extras).EXTRAS.find(x=>x.id==='indoor').price.startsWith(money(16000,locale)));
 extras.film.includedIn=['HORIZON'];
 assert.equal(offerText('{{offer.film.included}}','de',extras),'HORIZON');
 assert.ok(!getPackageDetails('de',SHOW_DURATION,extras).PACKAGE_DETAILS.ODYSSEY.care.includes('Rohmaterial-Video'));
 const details=getPackageDetails('de',SHOW_DURATION,extras);
 assert.equal(details.COMPARISON.find(s=>s.id==='footage').cells[1],true);
 assert.ok(details.PACKAGE_FEATURES.HORIZON.groups.some(g=>g.items.includes('Video der Show (Rohaufnahmen)')));
 assert.ok(!details.PACKAGE_FEATURES.ODYSSEY.groups.some(g=>g.items.includes('Video der Show (Rohaufnahmen)')));
 assert.deepEqual(priceParts(SHOW_EXTRAS.indoor.price,'en'),{prefix:'from approx.',amount:'€15,000'});
 assert.equal(offerText('{{offer.film.priceSuffix}}','en'),'900 €');
 const source=readFileSync(new URL('../src/components/landing/LandingPrice.astro',import.meta.url),'utf8');
 assert.doesNotMatch(source,/shown\.match|(?:ab\|bis\|from)/);
 const footage=packages.services.find(s=>s.id==='footage');assert.equal(footage.extra,'film');assert.ok(!('cards'in footage));
 assert.ok(footage.cells.every(cell=>cell.computed==='extra'));
});
