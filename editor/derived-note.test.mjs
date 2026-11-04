import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
const root=new URL('../',import.meta.url).pathname;
test('Shared owners declare site-authored derived notes, package price has a field override',async()=>{
 const site=await createFlyingStarsAdapter(root);
 for(const id of ['site/contact','site/show-duration','site/show-extras','site/project-facts','site/business-facts','site/ui','package/configuration']){
  const schema=site.sourceFor(id).schema;
  assert.ok(schema.meta()['x-afe'].derivedNote,id);
  if(id==='package/configuration')assert.equal(schema.shape.SPARK.shape.price.meta()['x-afe'].derivedNote,'Gilt für alle Preisangaben dieses Pakets.');
 }
});
test('Every contact rendering binds its actual source field instead of the root workaround',async()=>{
 for(const file of ['src/layouts/Base.astro','src/components/ContactWays.astro','src/components/sections/ContactDetails.astro']){
  const text=await readFile(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(!/field\(CONTACT_OWNER,\s*\[\s*\]/.test(text),file);
 }
});
