import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import data from '../src/content/show-packages.json' with {type:'json'};
import policy from '../src/content/preview-policy.json' with {type:'json'};
import {STEPS} from '../src/content/show-configurator.js';
import {PACKAGE_NAMES,packageLabel} from '../src/content/package-identity.mjs';
import {previewPolicySchema} from '../src/schemas/preview-policy.mjs';
import {showPackagesSchema} from '../src/schemas/show-packages.mjs';
import {createTranslator} from '../src/i18n/ui.mjs';
import {priceFor,configuratorPrice,DRONE_RANGES,SHOW_PACKAGES,assertPreviewPricing} from '../src/content/show-packages.ts';
test('Paketidentität wird aus JSON abgeleitet; Vorschaugrenzen sind eigenständig validiert und bleiben ausdrücklich vorläufig',()=>{
 assert.deepEqual(PACKAGE_NAMES,Object.keys(data).filter(key=>key!=='services'));
 assert.deepEqual(STEPS.map(step=>step.pkg),PACKAGE_NAMES);
 assert.ok(previewPolicySchema.safeParse(policy).success);
 for(const name of PACKAGE_NAMES)assert.equal(SHOW_PACKAGES[name].orb,data[name].orb);
 assert.doesNotThrow(assertPreviewPricing);
 const max=SHOW_PACKAGES.SPARK.max,price=SHOW_PACKAGES.HORIZON.price;
 try{
  SHOW_PACKAGES.SPARK.max=140;
  assert.throws(assertPreviewPricing,/außerhalb der kommerziellen Paketgrenze/);
  SHOW_PACKAGES.SPARK.max=max;
  SHOW_PACKAGES.HORIZON.price=10000;
  assert.throws(assertPreviewPricing,/fällt unter die vorige Stufe/);
 }finally{SHOW_PACKAGES.SPARK.max=max;SHOW_PACKAGES.HORIZON.price=price;}

 assert.equal(data.SPARK.max,150);assert.equal(DRONE_RANGES.SPARK.max,190);
 assert.equal(priceFor('SPARK',190),null);assert.equal(configuratorPrice(190),15200);
 assert.ok(!previewPolicySchema.safeParse({...policy,placeholder:false}).success);
 assert.ok(!previewPolicySchema.safeParse({...policy,ranges:{...policy.ranges,HORIZON:{min:210,max:290}}}).success);
 assert.ok(showPackagesSchema.safeParse({...data,SPARK:{...data.SPARK,base:110,orb:'torus'}}).success);
 for(const locale of ['de','en','nl']){
  const t=createTranslator(locale);
  assert.equal(packageLabel('SPARK',t,{form:true}),packageLabel('SPARK',t)[0].toLowerCase()+packageLabel('SPARK',t).slice(1));
 }
});
test('Aktive Renderer und Validierer besitzen keine zweite Paketliste oder Orb-Zuordnung',()=>{
 for(const file of ['src/content/show-configurator.js','src/components/PackageCard.astro','src/templates/PricingPage.astro','src/components/landing/LandingPrice.astro','src/components/sections/ContactForm.astro','src/schemas/content-schema.mjs','src/schemas/show-packages.mjs','functions/api/contact.ts']){
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(source,/\[\s*['"]SPARK['"],\s*['"]HORIZON['"],\s*['"]ODYSSEY['"]/);
  assert.doesNotMatch(source,/SPARK:\s*['"]ring['"]/);
 }
});
