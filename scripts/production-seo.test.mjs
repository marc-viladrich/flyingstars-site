import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {robotsText} from '../src/lib/robots.mjs';
import {getPath,seoFields,textFields,translatableFields} from '../src/lib/translatable-fields.mjs';
import {localize,sha256} from '../src/lib/localize.mjs';
import {createFlyingStarsAdapter} from '../editor/flyingstars-adapter.mjs';
import {createTranslationCore} from 'astro-frontend-editor/runtime';
import {describeSchema} from 'astro-frontend-editor/runtime/extensions';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
const root=fileURLToPath(new URL('../',import.meta.url)), site=await createFlyingStarsAdapter(root);

test('robots follows the configured origin; editor/preview blocks all crawling',()=>{
  for(const origin of ['https://flyingstars.art','https://preview.example.org/']) {
    assert.equal(robotsText(origin),`User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml',origin)}\n`);
    assert.equal(robotsText(origin,true),'User-agent: *\nDisallow: /\n');
  }
});

test('every SEO source field enters editor planning and public localization with identical paths',async()=>{
  const {plan}=createTranslationCore(site);
  for(const id of ['page/index','screen/drohnenshow-preise','project/puma-bundesliga','project/beispielprojekt','post/2026-10-06-beispielbeitrag','site/ui']) {
    const source=site.sourceFor(id), data=source.schema.parse(codecs[source.format].parse(await readFile(path.join(root,source.file),'utf8')));
    const record={id,data,revision:'fixture',fields:describeSchema(source.schema,data).fields};
    const publicFields=translatableFields({...record,fields:textFields(source.schema,data)});
    const planned=plan({records:[record],locale:'en',ids:[id],memory:{entries:{}}});
    for(const fieldPath of Object.values(seoFields(record))) {
      assert.ok(publicFields.some(f=>JSON.stringify(f.path)===JSON.stringify(fieldPath)),`${id}: public SEO field`);
      assert.ok(planned.jobs.some(f=>JSON.stringify(f.path)===JSON.stringify(fieldPath)),`${id}: missing translation job`);
      const original=getPath(data,fieldPath);
      // Synthetic fixture only. No editorial translation is written or reviewed.
      const translation={sourceId:id,locale:'en',values:[{path:fieldPath,text:'Synthetic SEO fixture',reviewed:false,sourceHash:sha256(original)}]};
      assert.equal(getPath(localize(record,'en',{translation}).data,fieldPath),original);
      assert.equal(getPath(localize(record,'en',{translation,editor:true}).data,fieldPath),'Synthetic SEO fixture');
      translation.values[0].reviewed=true;
      assert.equal(getPath(localize(record,'en',{translation}).data,fieldPath),'Synthetic SEO fixture');
      translation.values[0].sourceHash=sha256('older source');
      assert.equal(getPath(localize(record,'en',{translation}).data,fieldPath),original);
    }
  }
});
