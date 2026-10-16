import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createBrowserExtensionRegistry} from './web/extensions.mjs';
import {extensions} from './web/site-adapter.mjs';
import {NativeDraft} from './web/native-draft.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {sha256} from './web/sha256.mjs';
const extension=(name,hooks={},extra={})=>({name,contractVersion:'1.0',hooks,...extra});

test('browser registration rejects bad versions, duplicate identities and undeclared capabilities before dispatch',()=>{
 let called=false;
 const valid=extension('fixture/valid',{navigation:()=>{called=true;}});
 for(const bad of [extension('invalid'),{...extension('fixture/bad'),contractVersion:'2.0'},extension('fixture/bad',{typo:()=>{}}),extension('fixture/bad',{navigation:true}),extension('fixture/bad',{}, {widgets:{plain:{table:true}}}),extension('fixture/bad',{}, {widgets:{'fixture/table':{render:1}}}),extension('fixture/bad',{}, {codecs:{'fixture/text':{decode:()=>''}}})])assert.throws(()=>createBrowserExtensionRegistry([valid,bad]));
 assert.throws(()=>createBrowserExtensionRegistry([valid,valid]),/Duplicate extension/);
 assert.throws(()=>createBrowserExtensionRegistry([extension('fixture/a',{}, {widgets:{'fixture/table':{table:true}}}),extension('fixture/b',{}, {widgets:{'fixture/table':{table:true}}})]),/duplicate/);
 assert.equal(called,false);
 const predicate=createBrowserExtensionRegistry([extension('fixture/a',{siteChange:()=>false}),extension('fixture/z',{siteChange:()=>true})]);assert.equal(predicate.some('siteChange'),true);
});

test('browser registry has server-equivalent resolver defaults, deterministic order, errors and recursion guards',async()=>{
 const calls=[];
 const registry=createBrowserExtensionRegistry([
  extension('fixture/z',{navigation:()=>{calls.push('z');return ['last'];}}),
  extension('fixture/a',{navigation:()=>{calls.push('a');return null;}}),
 ]);
 assert.deepEqual(registry.definitions.map(e=>e.name),['fixture/a','fixture/z']);
 assert.deepEqual(registry.first('navigation'),['last']);assert.deepEqual(calls,['a','z']);
 assert.deepEqual(registry.collect('navigation'),['last']);
 assert.equal(registry.some('isPage'),false);assert.equal(registry.first('query'),undefined);assert.deepEqual(registry.collect('normalize'),[]);
 registry.run('normalize');await registry.runAsync('restoreFrame');
 assert.throws(()=>registry.require('query'),/Required extension/);assert.throws(()=>registry.runRequired('query'),/Required extension/);assert.throws(()=>registry.first('typo'),/Unknown extension/);
 let recursive;recursive=createBrowserExtensionRegistry([extension('fixture/recursive',{navigation:()=>recursive.first('navigation')})]);
 assert.throws(()=>recursive.first('navigation'),/Recursive/);
 const badSnapshot=createBrowserExtensionRegistry([extension('fixture/snapshot',{snapshotFrame:async()=>({})})]);assert.throws(()=>badSnapshot.snapshotFrame({}),/runAsync/);
 const asyncRegistry=createBrowserExtensionRegistry([extension('fixture/async',{restoreFrame:async()=>{throw Error('restore failed');}})]);
 assert.throws(()=>asyncRegistry.first('restoreFrame'),/runAsync/);await assert.rejects(asyncRegistry.runAsync('restoreFrame'),/restore failed/);
 const stopped=createBrowserExtensionRegistry([extension('fixture/a',{normalize:()=>{throw Error('stop');}}),extension('fixture/z',{normalize:()=>assert.fail('must not run')})]);assert.throws(()=>stopped.run('normalize'),/stop/);
});

test('registered widgets/codecs are copied and frozen, and unrelated sites register without pilot imports',()=>{
 const codec={decode:s=>s,encode:s=>s,plainText:s=>s,marks:{custom:'fixture-mark'}};
 const definition=extension('bakery/cards',{createRecord:(_prefix,template,name)=>({...template,caption:name}),query:name=>name==='bakery/bakes'?{list:({records})=>records.map(r=>r.id)}:undefined},{widgets:{'bakery/grid':{choices:()=>({options:[]})}},codecs:{'bakery/short':codec}});
 const registry=createBrowserExtensionRegistry([definition]);
 codec.marks.custom='changed';definition.hooks.createRecord=()=>assert.fail('registration mutated');
 assert.equal(registry.codecs['bakery/short'].marks.custom,'fixture-mark');
 assert.throws(()=>{registry.widgets['bakery/grid'].choices=null;},TypeError);
 assert.deepEqual(registry.require('createRecord','bake/',{oven:3},'Brot'),{oven:3,caption:'Brot'});
 assert.deepEqual(registry.require('query','bakery/bakes').list({records:[{id:'bake/rye'}]}),['bake/rye']);
 assert.equal(registry.first('query','unknown'),undefined);
});

test('all frame lifecycles snapshot/restore their own state in deterministic order, with only a registry bridge',async()=>{
 const calls=[];
 const registry=createBrowserExtensionRegistry(['z','a'].map(name=>extension('fixture/'+name,{snapshotFrame:context=>({value:context[name]}),async restoreFrame(state){await Promise.resolve();calls.push([name,state.value]);},ownsTransientInput:(node,state)=>node===name&&state.value>0})));
 const snapshot=registry.snapshotFrame({a:1,z:2});assert.deepEqual(Object.keys(snapshot),['fixture/a','fixture/z']);
 await registry.restoreFrame(snapshot,{});assert.deepEqual(calls,[['a',1],['z',2]]);
 assert.equal(registry.ownsTransientInput('z',snapshot),true);assert.equal(registry.ownsTransientInput('missing',snapshot),false);
 const frame={flush:()=>[]};registry.connect({frame});assert.equal(registry.frame,frame);
 assert.throws(()=>registry.connect({frame}),/duplicate bridge/);assert.throws(()=>registry.connect({other:{}}),/Invalid/);
});

test('generic browser modules contain no pilot identities, record IDs, selectors or content-field semantics',async()=>{
 const files=(await readdir(new URL('./web/',import.meta.url))).filter(file=>/\.(?:mjs|js)$/.test(file));
 const forbidden=[/flyingstars/i,/\b(?:SPARK|HORIZON|ODYSSEY)\b/,/\b(?:packageId|featureIds|memberIds|clientIds|featureGroups|assetId|defaultAlt|altOverride|showOrb|sourceId|sourceHash)\b/,/["'](?:page|package|extra|screen|post|project|faq|client|team|media|site|translation)\//,/\^\((?:page|package|screen|post|project|faq|client|team)\|/,/["']tone["']|data-tone|t-outline|t-caps|\.packs|\.crew|\.portrait|\.member\b|#cfg|data-card|cfg-field/,/["'](?:pricing|logoBar|projectGrid|postList|showreelHero|sustainability|contactForm|testimonials)["']/];
 for(const file of files){const source=await readFile(new URL('./web/'+file,import.meta.url),'utf8');for(const pattern of forbidden)assert.doesNotMatch(source,pattern,file);}
});

test('actual browser graphs link under editor- and adapter-served URLs and startup registers exactly one instance',async()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const site=await createFlyingStarsAdapter(root);
 // Link the real HTTP module graph in a browser-like realm. This detects missing served modules,
 // relative URL mistakes, Node imports and missing exports without requiring a TCP listener.
 const script=`
 import {SourceTextModule,createContext} from 'node:vm';
 import {readFile} from 'node:fs/promises';
 import {serveFile,EDITOR_BROWSER_MODULES} from ${JSON.stringify(new URL('./server.mjs',import.meta.url).href)};
 import assert from 'node:assert/strict';
 const root=${JSON.stringify(root)},files=${JSON.stringify(site.browserFiles)};
 for(const entry of ['/editor/editor.js','/editor/frame.js','/editor/site-adapter.mjs']){
  const window={},context=createContext({window,TextEncoder,structuredClone}),cache=new Map();
  async function load(url){
   if(cache.has(url))return cache.get(url);
   const pathname=new URL(url).pathname;
   let bytes,status;
   const own=EDITOR_BROWSER_MODULES.includes(pathname);
   const base=pathname==='/editor/marked.mjs'?root+'node_modules/marked/lib/':own?root+'editor/':files[pathname]?root:root+'editor/web/';
   const relative=pathname==='/editor/marked.mjs'?'/marked.esm.js':own?pathname:files[pathname]||pathname.slice('/editor/'.length);
   try{await serveFile({writeHead(code){status=code;},end(body){bytes=body;}},base,relative);}catch(error){throw Error(url+': '+error.message);}
   assert.equal(status,200,url);
   const module=new SourceTextModule(bytes.toString(),{context,identifier:url});cache.set(url,module);return module;
  }
  const module=await load('http://fixture.invalid'+entry);
  await module.link((specifier,parent)=>{assert.ok(!specifier.startsWith('node:'),specifier);return load(new URL(specifier,parent.identifier).href);});
  const registration=cache.get('http://fixture.invalid/editor/site-adapter.mjs');
  await registration.evaluate();
  assert.equal(window.afeExtensions,registration.namespace.extensions);
  assert.deepEqual(Object.keys(window),['afeExtensions']);
  assert.ok(window.afeExtensions.widgets['flyingstars/package-features']);
  assert.ok(window.afeExtensions.codecs['flyingstars/inline']);
 }
 `;
 execFileSync(process.execPath,['--experimental-vm-modules','--input-type=module'],{input:script,stdio:['pipe','pipe','pipe']});
});

test('registered browser queries and factories preserve matched lists, presets and one-step undo for canvas reorder',()=>{
 const draft=new NativeDraft();draft.reset([{id:'faq/a',data:{tags:['show'],order:10}},{id:'faq/b',data:{tags:['show'],order:10}},{id:'faq/c',data:{tags:['other'],order:30}}]);
 const query=extensions.require('sectionQuery',{type:'faq',tags:['show']});
 assert.deepEqual(query.list({records:draft.records(),section:{tags:['show']}}),['faq/a','faq/b']);assert.deepEqual(query.create({records:draft.records(),section:{tags:['show']}}),{tags:['show'],order:31});
 const canvas=extensions.require('orderedQuery',{ids:['faq/b','faq/a'],field:'order'});
 draft.group(()=>{for(const change of canvas.reorder({records:draft.records(),ids:['faq/b','faq/a']}))for(const patch of change.patches)draft.set(change.id,patch.path,patch.value);});
 assert.deepEqual(query.list({records:draft.records(),section:{tags:['show']}}),['faq/b','faq/a']);draft.undo();assert.equal(draft.size,0);
 assert.equal(extensions.first('sectionQuery',{type:'unrelated'}),undefined);
 assert.deepEqual(extensions.require('creationForm','client/').fields.map(f=>f.key),['quote','person','role']);
});

test('browser translation storage preserves review freshness, independent edits, overlays and undo through the real draft',()=>{
 const storage=extensions.require('translationStorage'),draft=new NativeDraft();draft.reset([{id:'page/test',revision:'saved',title:'Test',data:{heading:'Hallo',other:'Welt'}}]);
 const api={record:id=>draft.get(id),draft,recordTemplate:()=>null};
 storage.write({...api,owner:api.record('page/test'),path:['heading'],locale:'en',text:'Hello'});
 const id=storage.id('page/test','en');assert.equal(storage.value(api.record('page/test'),['heading'],'en',api.record).text,'Hello');
 assert.equal(storage.overlay(draft.records(),'en')[0].sourceId,'page/test');
 const suggestion={id,data:{sourceId:'page/test',locale:'en',sourceHash:'saved',values:[{path:['heading'],text:'Replace?',sourceHash:sha256('Hallo'),reviewed:false},{path:['other'],text:'World',sourceHash:sha256('Welt'),reviewed:false}]}};
 storage.merge([suggestion],null,api);assert.equal(storage.value(api.record('page/test'),['heading'],'en',api.record).text,'Hello');assert.equal(storage.pending(api.record('page/test'),api.record(id)).length,1);
 storage.accept(['page/test'],['en'],api);assert.equal(storage.pending(api.record('page/test'),api.record(id)).length,0);
 draft.set('page/test',['other'],'Geändert');assert.equal(storage.value(api.record('page/test'),['other'],'en',api.record),undefined);
 draft.undo();assert.equal(storage.value(api.record('page/test'),['other'],'en',api.record).text,'World');
});
