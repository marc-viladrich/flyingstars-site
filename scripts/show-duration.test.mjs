import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {showDurationSchema} from '../src/schemas/show-duration.mjs';
import {SHOW_DURATION,durationText} from '../src/content/show-duration.mjs';
import {getPackageDetails} from '../src/content/package-details.ts';
import {showPackagesSchema} from '../src/schemas/show-packages.mjs';
import packageData from '../src/content/show-packages.json' with {type:'json'};
test('Dauerfelder sind wirksam, Typical bleibt innerhalb der Outdoor-Spanne; kein totes Paket-dur',()=>{
 const changed=showDurationSchema.parse({outdoor:{min:11,max:24,typical:14},indoor:{min:6,max:9}});
 assert.ok(!showDurationSchema.safeParse({...SHOW_DURATION,outdoor:{min:15,max:25,typical:13}}).success);
 assert.ok(!showPackagesSchema.safeParse({...packageData,SPARK:{...packageData.SPARK,dur:'99 Min'}}).success);
 for(const locale of ['de','en','nl']){
  const details=getPackageDetails(locale,changed);
  assert.match(details.showtimeLine(),/11–24/);
  assert.match(details.COMPARISON.find(s=>s.id==='duration').all,/14.*24/);
  assert.match(details.EXTRAS.find(s=>s.id==='indoor').text,/6.*9/);
 }
 assert.equal(durationText('{{duration.outdoor.typical}}/{{duration.indoor.min}}–{{duration.indoor.max}}',changed),'14/6–9');
});
test('Operative Dauertexte führen ihre Werte als Referenz und nicht als zweite Zahlenquelle',()=>{
 for(const locale of ['','en/','nl/'])for(const file of [`src/content/faq/${locale}dauer.md`,`src/content/faq/${locale}indoor-moeglich.md`,`src/content/pages/${locale}index.yaml`,`src/content/pages/${locale}drohnenshow-indoor.yaml`]){
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8').split('\n').filter(line=>!line.startsWith('#')).join('\n');
  assert.doesNotMatch(source,/(?:5[– ](?:bis |to |tot )?8|13 [Mm]in|25 [Mm]in)/,file);
 }
});
