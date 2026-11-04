import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSite} from '../editor/flyingstars-adapter.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=dir=>readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
test('Operativer Quellgraph enthält keine fehlenden lokalen Imports oder Dateileser auf entfernten Altbestand',async()=>{
 for(const file of ['src/components/Video.astro','src/components/pricing/Calculator.astro','src/scripts/pricing.js','src/scripts/pricing-heart-capacities.ts','editor/i18n-runtime-proof.mjs'])assert.equal(existsSync(resolve(root,file)),false,file);
 for(const file of ['src','editor','scripts','functions','tests'].flatMap(files).filter(f=>/\.(?:mjs|js|ts|astro)$/.test(f)&&!f.includes('.test.')&&!f.startsWith('tests/'))){
  const source=readFileSync(resolve(root,file),'utf8');
  // Static local imports/exports and import-by-URL cover server roots, tools and browser modules.
  for(const match of source.matchAll(/(?:from\s*|import\s*\(|new URL\s*\()(['"])(\.[^'"\n]+)\1/g)){
   const target=resolve(dirname(resolve(root,file)),match[2].split('?')[0]);
   if(target.startsWith(resolve(root,'dist')+'/')||target===resolve(root,'dist'))continue; // generated build output, not a source import
   assert.ok([target,...['.ts','.js','.mjs','.astro','/index.ts','/index.js','/index.astro'].map(ext=>target+ext)].some(existsSync),`${file}: ${match[2]}`);
  }
 }
 const site=await createSite(root);
 for(const file of Object.values(site.browserFiles))assert.ok(existsSync(resolve(root,file)),file);
 for(const file of ['web/routing.mjs','web/preview.mjs','web/media-usage.mjs','web/record-kinds.mjs','runtime-compatibility.mjs'])assert.ok(existsSync(resolve(root,'editor/extensions/flyingstars',file)),file);
});
