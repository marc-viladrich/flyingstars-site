import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,symlink,rm,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {NativeStore,git} from 'astro-frontend-editor/runtime';
import {createBrowserExtensionRegistry} from 'astro-frontend-editor/web/extensions.mjs';
import {createSite} from './flyingstars-adapter.mjs';
import browser from './design/browser-site.mjs';
import {resolveRuntimeOptions} from './server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
async function fixture(t){const dir=await mkdtemp(path.join(os.tmpdir(),'fs-design-editor-'));await git(root,['clone','--quiet','--no-hardlinks',root,dir]);await git(dir,['checkout','-B','content/draft']);await symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'));const site=await createSite(dir),store=await new NativeStore(dir,{remote:false,site,runtime:resolveRuntimeOptions({values:{siteRoot:dir}})}).init();t.after(async()=>{store.sync.close();await rm(dir,{recursive:true,force:true});});return store;}
const request=(state,values)=>({expectedHead:state.head,requestId:randomUUID(),changes:values.map(([id,path,value])=>({id,expectedRevision:state.records.find(r=>r.id===id).revision,patches:[{path,value}]}))});

test('the real source schema supplies every new section, all 198 records, and no obsolete records',async t=>{
 const store=await fixture(t),state=await store.state(),site=store.site;
 assert.deepEqual(site.types.map(t=>t.directory),['pages','posts','projects','faq']);assert.equal(state.records.length,198);
 assert.deepEqual(state.templates.sections.map(s=>s.type),site.sectionSchema.options.map(s=>s.shape.type.value));assert.equal(state.templates.sections.length,31);
 for(const record of state.records){assert.ok(record.fields.length,record.id);assert.ok(!record.fields.some(f=>f.path[0]==='translationSourceHash'));}
 for(const id of ['package/spark','site/ui','translation/en--page-index','screen/show-konfigurator'])assert.equal(site.sourceFor(id),null);
 assert.equal(state.records.find(r=>r.id==='page/en/index').route,'/en/');
 assert.equal(state.records.find(r=>r.id==='project/nl/puma-bundesliga').route,'/nl/puma-bundesliga/');
 assert.equal(state.templates.collections.length,0);
});
test('German-only save fails atomically with actionable locale names',async t=>{
 const store=await fixture(t),state=await store.state(),file=path.join(store.root,'src/content/pages/index.yaml'),before=await readFile(file,'utf8');
 await assert.rejects(store.save(request(state,[['page/index',['title'],'Geprüfte deutsche Überschrift']])),error=>error.status===409&&/page\/en\/index, page\/nl\/index/.test(error.message));
 assert.equal(await store.head(),state.head);assert.equal(await readFile(file,'utf8'),before);
});
test('a coordinated DE/EN/NL save commits real files and source hashes; a retry is idempotent',async t=>{
 const store=await fixture(t),state=await store.state(),req=request(state,[['page/index',['title'],'Deutsche Testüberschrift'],['page/en/index',['title'],'English test heading'],['page/nl/index',['title'],'Nederlandse testtitel']]);
 const saved=await store.save(req);assert.notEqual(saved.head,state.head);
 const bytes=await readFile(path.join(store.root,'src/content/pages/index.yaml')),hash=createHash('sha256').update(bytes).digest('hex');
 for(const locale of ['en','nl'])assert.equal(saved.records.find(r=>r.id===`page/${locale}/index`).data.translationSourceHash,hash);
 assert.equal((await store.save(req)).head,saved.head);assert.equal(await git(store.root,['status','--porcelain']),'');
});
test('EN text edits keep DE bytes; unknown/hash fields and executable URLs are rejected',async t=>{
 const store=await fixture(t),state=await store.state(),source=await readFile(path.join(store.root,'src/content/pages/index.yaml'),'utf8');
 const saved=await store.save(request(state,[['page/en/index',['title'],'Corrected English heading']]));
 assert.equal(await readFile(path.join(store.root,'src/content/pages/index.yaml'),'utf8'),source);
 for(const [field,value]of [[['translationSourceHash'],'0'.repeat(64)],[['oldDesignField'],'value'],[['sections',0,'cta','href'],'javascript:alert(1)']])await assert.rejects(store.save(request(saved,[['page/en/index',field,value]])));
 assert.equal(await store.head(),saved.head);
});
test('browser registry loads without obsolete source modules; locale and codec contracts are explicit',()=>{
 const registry=createBrowserExtensionRegistry(browser);assert.deepEqual(registry.first('languages'),{source:'de',locales:{}});assert.equal(registry.inlineCodec.supportsDOM({}),false);assert.equal(registry.inlineCodec.html('<script>'),'&lt;script&gt;');
 assert.ok(Array.isArray(registry.first('changeKinds')));
});
