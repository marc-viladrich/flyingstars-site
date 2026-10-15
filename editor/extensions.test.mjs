import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {newRecordData,sectionMutation} from './web/native-draft.mjs';
import {mediaLibrary} from './web/media-usage.mjs';
import {codecs} from './core/codecs.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const site=await createFlyingStarsAdapter(root),extensions=site.extensions;

test('server creation factories and unique section lifecycle match existing browser behavior',()=>{
 const template={title:'Original',name:'Original',sourceIssue:20,body:'Facts',role:'CEO',date:'2020-01-01',tags:['tag'],draft:false,sections:[{type:'metrics'}],featured:true,client:'Client',location:'Location',cover:{src:'old'},showcase:{route:'old'},image:{src:'old'}};
 for(const prefix of ['client/','team/','post/','project/','faq/','page/'])assert.deepEqual(extensions.require('createRecord',prefix,template,'Neu',{today:'2026-10-15'}),newRecordData(prefix,template,'Neu',{today:'2026-10-15'}));
 const existing=[{type:'textMedia',id:'intro'},{type:'textMedia',id:'intro-kopie'}];
 assert.deepEqual(extensions.require('uniqueSection',structuredClone(existing[0]),existing),sectionMutation(existing,0,'duplicate')[1]);
 assert.equal(template.sourceIssue,20);
});

test('contact normalization proposes exactly the current browser-linked changes, with no mutation',async()=>{
 const browser=await readFile(new URL('./web/editor.js',import.meta.url),'utf8');
 const fn=browser.slice(browser.indexOf('function linkedHref('),browser.indexOf('\nfunction stage(',browser.indexOf('function linkedHref(')));
 const linked=runInNewContext('('+fn+')',{getPath:(data,path)=>path.reduce((v,k)=>v?.[k],data)});
 for(const [href,value] of [['mailto:old@example.org',' new@example.org '],['tel:+49541','0541 123-45'],['tel:+49','+31 20 123'],['https://example.org','unchanged']]){
  const data={phone:{value:'old',href}},path=['phone','value'],expected=linked({data},path,value);
  const result=extensions.first('normalize',{id:'site/contact',path,value,data});
  assert.deepEqual(result,expected?[{path:Array.from(expected[0]),value:expected[1]}]:undefined);
  assert.equal(data.phone.href,href);
 }
});

test('query-backed FAQs retain tag filters, draft visibility, creation presets and global reorder semantics',()=>{
 const records=[{id:'faq/a',data:{tags:['show'],order:10}},{id:'faq/b',data:{tags:['show'],order:10,draft:true}},{id:'faq/c',data:{tags:['other'],order:30}}];
 const query=extensions.require('query','flyingstars/faq');
 assert.deepEqual(query.list({records,section:{tags:['show']}}),['faq/a','faq/b']);
 assert.deepEqual(query.list({records,section:{tags:['show']},editor:false}),['faq/a']);
 assert.deepEqual(query.create({records,section:{tags:['show']}}),{tags:['show'],order:31});
 assert.deepEqual(query.reorder({records,ids:['faq/b','faq/a']}),[{id:'faq/a',patches:[{path:['order'],value:20}]}]);
 assert.throws(()=>query.reorder({records,ids:['faq/a','faq/a']}),/Reihenfolge/);
 assert.equal(extensions.first('query','unknown/query'),undefined);
 const projects=[{id:'project/old',data:{date:'2020-01-01',showcase:{order:1}}},{id:'project/new',data:{date:'2026-01-01'}}];
 assert.deepEqual(extensions.require('query','flyingstars/projects').list({records:projects,section:{limit:1}}),['project/old']);
});

test('registered inline codec round-trips stored marks and uses the canonical renderer',()=>{
 const codec=extensions.require('codec','flyingstars/inline'),text='**Fett** {o}Kontur{/o} {c}Groß{/c} & Text';
 assert.equal(codec.encode(codec.decode(text)),text);
 assert.equal(codec.plainText(text),'Fett Kontur Groß & Text');
 assert.match(codec.html(text),/class="t-outline"/);
 assert.equal(extensions.first('codec','unknown/codec'),undefined);
});

test('media library server results match the unchanged browser resolver for actual site content',async()=>{
 const files=(await import('node:fs/promises')).readdir;
 const sources=site.sourcesFromFiles((await files(root+'src/content',{recursive:true})).map(file=>'src/content/'+file));
 const records=[];
 for(const source of sources){const text=await readFile(root+source.file,'utf8');records.push({id:source.id,data:source.schema.parse(codecs[source.format].parse(text))});}
 assert.deepEqual(extensions.require('mediaLibrary',records),mediaLibrary(records));
 // Shape invariants remain authoritative in the site's Zod definitions.
 const page=sources.find(s=>s.id==='page/index'),data=records.find(r=>r.id===page.id).data;
 const comparison={type:'comparison',headline:'Vergleich',columns:['A','B'],rows:[{label:'Mismatch',values:['one','two']}]};
 assert.equal(page.schema.safeParse({...data,sections:[...data.sections,comparison]}).success,true);
 comparison.rows[0].values.pop();
 const invalid=page.schema.safeParse({...data,sections:[...data.sections,comparison]});
 assert.equal(invalid.success,false);assert.match(JSON.stringify(invalid.error.issues),/eine je Spalte/);
});

test('extension policy errors, duplicate proposals and invalid proposed identities leave the real Git revision unchanged',async t=>{
 const {mkdtemp,symlink,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),path=await import('node:path');
 const {NativeStore,git}=await import('./native-store.mjs'),{randomUUID}=await import('node:crypto'),{createExtensionRegistry}=await import('./core/extensions.mjs');
 const directory=await mkdtemp(path.join(tmpdir(),'afe-extension-policy-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 await git(root,['clone','--quiet','--no-hardlinks',root,directory]);await git(directory,['checkout','-B','content/draft']);
 await symlink(root+'node_modules',path.join(directory,'node_modules'));
 const adapter=await createFlyingStarsAdapter(directory),store=await new NativeStore(directory,{site:adapter,remote:false}).init(),state=await store.state(),record=state.records.find(r=>r.id==='package/spark');
 const request=()=>({expectedHead:state.head,requestId:randomUUID(),changes:[{id:record.id,expectedRevision:record.revision,patches:[{path:['price'],value:record.data.price+1}]}]});
 const invalidIdentity={id:record.id,data:{...record.data,name:'HORIZON'}};
 const validProposal={id:record.id,data:{...record.data,price:record.data.price+2}};
 for(const [hooks,reason] of [
  [{validateRecords:()=>{throw Error('test policy rejected');}},/test policy rejected/],
  [{prepareTransaction:()=>[invalidIdentity]},/schreibgeschützt: name/],
  [{prepareTransaction:()=>[validProposal,validProposal]},/Widersprüchliche Extension/],
  [{prepareTransaction:()=>[{id:'page/index',data:{}}]},/Widersprüchliche Extension/],
 ]){
  adapter.extensions=createExtensionRegistry([...site.extensions.definitions,{name:'test/rejection',contractVersion:'1.0',hooks}]);
  await assert.rejects(store.save(request()),reason);assert.equal(await store.head(),state.head);
  assert.equal(await git(directory,['status','--porcelain','--untracked-files=no']),'');
 }
});

test('server composition combines runtime and site registration without changing the injected site registry',async()=>{
 const {resolveRuntimeOptions}=await import('./runtime-options.mjs'),{startNativeServers}=await import('./server.mjs');
 const options=resolveRuntimeOptions({env:{},values:{siteRoot:root,stateDir:'/tmp/cx13/p7/runtime-composition',remote:false,extensions:[{name:'example/route',contractVersion:'1.0',hooks:{route:()=>'/custom/'}}]}});
 const started=await startNativeServers({options,site,listen:false,initialize:false});
 try{
  assert.equal(started.store.site.extensions.first('route',{id:'page/index',data:{}}),'/custom/');
  assert.equal(site.extensions.first('route',{id:'page/index',data:{}}),'/');
  assert.ok(started.store.site.extensions.definitions.some(e=>e.name==='example/route'));
 }finally{started.store.sync.close();}
});
