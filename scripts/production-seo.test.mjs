import {readContractRecords,auditContracts} from '../src/i18n/read-contracts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {contentSchemas} from '../src/schemas/content-schema.mjs';
import {robotsText} from '../src/lib/robots.mjs';
import {createFlyingStarsAdapter} from '../editor/flyingstars-adapter.mjs';
import {codecs,describeSchema} from 'astro-frontend-editor/runtime/extensions';
const root=fileURLToPath(new URL('../',import.meta.url));

test('robots uses the actual public origin and blocks private editor previews',()=>{
 for(const origin of ['https://flyingstars.art','https://preview.example.org/']){
  assert.equal(robotsText(origin),`User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml',origin)}\n`);
  assert.equal(robotsText(origin,true),'User-agent: *\nDisallow: /\n');
 }
});
test('every actual locale file exposes its SEO fields through the shared editor schema; source hashes are current',async()=>{
 const site=await createFlyingStarsAdapter(root);assert.equal(auditContracts(site,readContractRecords(root,site)).length,132);const files=await readdir(path.join(root,'src/content'),{recursive:true});
 const sources=site.sourcesFromFiles(files.map(f=>'src/content/'+f)).filter(source=>Object.hasOwn(contentSchemas,source.address.collection));let localized=0,seo=0;
 for(const source of sources){
  const bytes=await readFile(path.join(root,source.file),'utf8'),data=source.schema.parse(codecs[source.format].parse(bytes));
  const fields=describeSchema(source.schema,data).fields;
  for(const field of ['title','description','summary','question'])if(typeof data[field]==='string'){seo++;assert.ok(fields.some(f=>f.path.length===1&&f.path[0]===field),source.id+': '+field);}
  if(data.showcase?.meta)for(const field of ['title','description'])assert.ok(fields.some(f=>JSON.stringify(f.path)===JSON.stringify(['showcase','meta',field])));
  if(/\/(en|nl)\//.test(source.id)){
   localized++;
   assert.equal(data.translationContractVersion,2,source.file);
  }
 }
 assert.equal(localized,sources.length*2/3);assert.ok(seo>100);
});
