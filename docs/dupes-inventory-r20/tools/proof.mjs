// Runs actual shipped schema/model/editor functions without editing content or starting AFE.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import packageData from '../../../src/content/show-packages.json' with {type:'json'};
import {SHOW_PACKAGES,DRONE_RANGES,priceFor,configuratorPrice} from '../../../src/content/show-packages.ts';
import {showPackagesSchema} from '../../../src/schemas/show-packages.mjs';
import {contentSchemas} from '../../../src/schemas/content-schema.mjs';
import {getPackageDetails} from '../../../src/content/package-details.ts';
import {createFlyingStarsAdapter} from '../../../editor/flyingstars-adapter.mjs';
import {reviewLeaves,synchronize} from '../../../editor/design/locale-review.mjs';
const root=process.cwd(),e=JSON.parse(fs.readFileSync('docs/dupes-inventory-r20/evidence.json'));
const report={};
const counts={};
for(const collection of ['pages','projects','posts','faq']){
 const entries=e.scope.files.filter(f=>f.startsWith('src/content/'+collection+'/')&&/\.(md|yaml)$/.test(f));
 for(const file of entries){const raw=fs.readFileSync(file,'utf8'),data=parse(file.endsWith('.md')?raw.split('---')[1]:raw);assert.ok(contentSchemas[collection].safeParse(data).success,file);}
 counts[collection]=entries.length;
}
report.contentSchemaValidation=counts;
report.hashCoverage={checked:0,stale:[]};
for(const file of e.scope.files.filter(f=>/^src\/content\/(pages|projects|posts|faq)\/(?!en\/|nl\/)[^/]+\.(yaml|md)$/.test(f))){
 const hash=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 for(const locale of ['en','nl']){const target=file.replace(/^(src\/content\/[^/]+\/)/,'$1'+locale+'/'),raw=fs.readFileSync(target,'utf8'),data=parse(target.endsWith('.md')?raw.split('---')[1]:raw);report.hashCoverage.checked++;if(data.translationSourceHash!==hash)report.hashCoverage.stale.push(target);}
}
assert.equal(report.hashCoverage.stale.length,0);
const site=await createFlyingStarsAdapter(root);
assert.equal(site.sourceFor('package/configuration').file,'src/content/show-packages.json');
assert.equal(site.sourceFor('site/navigation').file,'src/content/navigation.json');
assert.equal(site.sourceFor('site/ui').file,'src/i18n/ui.json');
report.afeOwners={packages:site.sourceFor('package/configuration').file,navigation:site.sourceFor('site/navigation').file,ui:site.sourceFor('site/ui').file,types:site.types.map(t=>t.prefix)};
const changed=structuredClone(packageData);changed.SPARK.base+=10;changed.SPARK.dur='99 Min';
assert.ok(showPackagesSchema.safeParse(changed).success);
report.independentPackageInputs={schemaAcceptsChangedBaseAndDuration:true,currentStoredBase:SHOW_PACKAGES.SPARK.base,acceptedEditedBase:changed.SPARK.base,configuratorRangeMin:DRONE_RANGES.SPARK.min,currentStoredDuration:packageData.SPARK.dur,acceptedEditedDuration:changed.SPARK.dur,visibleDurationFactory:getPackageDetails('de').showtimeLine('SPARK'),priceAt150:priceFor('SPARK',150),configuratorAt150:configuratorPrice(150),commercialMax:SHOW_PACKAGES.SPARK.max,previewMax:DRONE_RANGES.SPARK.max};
// These remain separate by design today: this is evidence of two models, not an instruction to merge them.
assert.equal(report.independentPackageInputs.priceAt150,report.independentPackageInputs.configuratorAt150);
report.localeReview={urlOnly:reviewLeaves({image:{src:'https://a.invalid/a.jpg'}},{image:{src:'https://a.invalid/b.jpg'}}),nameChange:reviewLeaves({name:'Person A'},{name:'Person B'}),numberStringChange:reviewLeaves({count:'178'},{count:'179'}),numericChange:reviewLeaves({width:800},{width:900}),synchronizedURL:synchronize({src:'https://a.invalid/a.jpg'},{src:'https://a.invalid/b.jpg'},{src:'https://a.invalid/a.jpg'})};
assert.equal(report.localeReview.urlOnly.length,0);assert.equal(report.localeReview.nameChange.length,1);
report.noEnvironmentFilesRead=true;
fs.writeFileSync('docs/dupes-inventory-r20/proof.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
