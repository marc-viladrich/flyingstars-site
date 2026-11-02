import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {readFile} from 'node:fs/promises';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import {contentSchemas} from '../src/schemas/content-schema.mjs';
test('Every actual content file has exactly one editor owner and the same authoritative schema',async()=>{
 const owners=new Set();for(const r of records){const source=site.sourceFor(r.id);assert.ok(!owners.has(r.id));owners.add(r.id);assert.equal(source.address.collection,r.address.collection);assert.deepEqual(source.schema.parse(codecs[source.format].parse(await readFile(root+r.file,'utf8'))),r.data);}
 for(const [directory,schema]of Object.entries(contentSchemas)){const type=site.types.find(t=>t.directory===directory);assert.ok(type);if(directory==='pages')assert.equal(type.schema,schema);}
});
test('Locales keep their file identity and render route; removed data stores cannot be addressed',()=>{
 for(const r of pages){const locale=/^page\/(en|nl)\//.exec(r.id)?.[1];if(locale)assert.ok(r.route.startsWith('/'+locale+'/'));assert.ok(r.fields.length);}
 for(const id of ['package/spark','screen/show-konfigurator','translation/en--page-index','team/marc','site/contact'])assert.equal(site.sourceFor(id),null);
});
