import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getPackageDetails} from '../src/content/package-details.ts';
import packageData from '../src/content/show-packages.json' with {type:'json'};
import {showPackagesSchema} from '../src/schemas/show-packages.mjs';
// Captured from 24675f4 before moving the existing service model into the editable JSON.
const approved=JSON.parse(readFileSync(new URL('../editor/test/fixtures/package-projections-main.json',import.meta.url)));
test('Editable package model retains all main projections, stable service IDs and multilingual copy',()=>{
 assert.ok(showPackagesSchema.safeParse(packageData).success);
 for(const locale of ['de','en','nl'])assert.deepEqual(JSON.parse(JSON.stringify(getPackageDetails(locale))),approved[locale]);
 assert.equal(new Set(packageData.services.map(service=>service.id)).size,18);
 assert.ok(!showPackagesSchema.safeParse({...packageData,SPARK:{...packageData.SPARK,max:50}}).success);
});
