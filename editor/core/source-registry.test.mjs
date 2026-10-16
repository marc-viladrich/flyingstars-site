import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {SourceRegistry,FileStorage,hashBytes} from './source-registry.mjs';
import {codecs} from './codecs.mjs';

const address=id=>({collection:'records',id});
async function fixture(t,{format='json',source,locators={a:{kind:'object-entry',key:'a'},b:{kind:'object-entry',key:'b'}}}={}){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'afe-sources-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const file='content.'+format;await fs.writeFile(path.join(root,file),source??'{ "a": {"title":"A"}, "b": {"title":"B"} }\n');
  const storage=new FileStorage(root),batches=[];const commit=storage.commit.bind(storage);storage.commit=async(files,context)=>{batches.push(files);return commit(files,context);};
  const registry=new SourceRegistry({storage,sources:Object.entries(locators).map(([id,locator])=>({key:address(id),file,codec:format,locator}))});
  return {root,file,registry,batches,read:()=>fs.readFile(path.join(root,file),'utf8')};
}
for(const format of ['json','yaml'])test(format+': different shared entries from one baseline conflict on the complete file',async t=>{
  const f=await fixture(t,{format,source:format==='yaml'?'# file\na:\n  title: A\nb:\n  title: B\n':undefined}),base=await f.registry.snapshot();
  const one=f.registry.begin(base),two=f.registry.begin(base);
  await one.stage({kind:'set',address:address('a'),path:['title'],value:'Changed A'});
  await two.stage({kind:'set',address:address('b'),path:['title'],value:'Changed B'});
  await one.commit();const first=await f.read();
  await assert.rejects(two.commit(),error=>error.status===409&&/Datei wurde inzwischen geändert.*Eingaben bleiben erhalten/.test(error.message));
  assert.equal(await f.read(),first);assert.equal((await f.registry.read(address('b'))).raw.title,'B');
});
test('multiple operations on shared entries produce one file write and keep unrelated entry bytes',async t=>{
  const f=await fixture(t),tx=f.registry.begin(await f.registry.snapshot());
  await tx.stage({kind:'set',address:address('a'),path:['title'],value:'New A'});
  await tx.stage({kind:'set',address:address('b'),path:['title'],value:'New B'});
  assert.equal(await f.read(),'{ "a": {"title":"A"}, "b": {"title":"B"} }\n');
  await tx.commit();assert.equal(f.batches.length,1);assert.equal(f.batches[0].length,1);
  assert.equal(await f.read(),'{ "a": {"title":"New A"}, "b": {"title":"New B"} }\n');
});
test('file comments and unselected sibling edits also invalidate a revision',async t=>{
  const f=await fixture(t,{format:'yaml',source:'# provenance\na:\n  title: A\nb:\n  title: B\n'}),read=await f.registry.read(address('a')),tx=f.registry.begin(read.revision);
  await tx.stage({kind:'set',address:address('a'),path:['title'],value:'new'});
  const external=(await f.read()).replace('# provenance','# external comment');await fs.writeFile(path.join(f.root,f.file),external);
  await assert.rejects(tx.commit(),{code:'SOURCE_CONFLICT'});assert.equal(await f.read(),external);
});
test('the baseline is checked when staging too, rather than adopting a newer file',async t=>{
  const f=await fixture(t),base=await f.registry.snapshot();await fs.writeFile(path.join(f.root,f.file),'{}');const tx=f.registry.begin(base);
  await assert.rejects(tx.stage({kind:'set',address:address('a'),path:['title'],value:'new'}),{code:'SOURCE_CONFLICT'});
  await assert.rejects(tx.commit(),/abgeschlossen/);
});
for(const format of ['json','yaml'])test(format+': shared map create/delete preserves every pre-existing byte',async t=>{
  const original=format==='json'?'{ "a": {"title":"A"}, "b": {"title":"B"} }\n':'# leading\na:\n  title: A # keep a\n# keep b\nb:\n  title: B\n';
  const f=await fixture(t,{format,source:original}),third=address('c');f.registry.register(third,{file:f.file,codec:format,locator:{kind:'object-entry',key:'c'}});
  let tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'create',address:third,value:{title:'C'}});await tx.commit();
  assert.ok((await f.read()).includes(original.trimEnd().replace(/ }$/,'')));
  assert.equal((await f.registry.read(third)).raw.title,'C');
  tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'delete',owner:third});await tx.commit();assert.equal(await f.read(),original);
});
for(const format of ['json','yaml'])test(format+': keyed array selectors retain number/string identity and sibling bytes',async t=>{
  const source=format==='json'?'[ {"id":1,"title":"A"}, {"id":"1","title":"B"} ]\n':'# entries\n- id: 1\n  title: A\n- id: "1"\n  title: B\n';
  const locators={a:{kind:'array-entry',idField:['id'],idValue:1},b:{kind:'array-entry',idField:['id'],idValue:'1'}};
  const f=await fixture(t,{format,source,locators});let tx=f.registry.begin(await f.registry.snapshot());
  await tx.stage({kind:'set',address:address('b'),path:['title'],value:'Bee'});await tx.commit();
  assert.equal((await f.registry.read(address('a'))).raw.title,'A');
  assert.equal(await f.read(),source.replace(format==='json'?'"B"':'title: B',format==='json'?'"Bee"':'title: Bee'));
  f.registry.register(address('c'),{file:f.file,codec:format,locator:{kind:'array-entry',idField:['id'],idValue:'c'}});
  tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'create',address:address('c'),value:{id:'c',title:'C'}});await tx.commit();
  tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'delete',owner:address('c')});await tx.commit();assert.equal((await f.registry.read(address('b'))).raw.title,'Bee');
});
for(const format of ['json','yaml'])test(format+': reorder moves source slices, including item comments',async t=>{
  const source=format==='json'?'[ { "id": "a", "v":1 },\n  {"id":"b","v":2} ]\n':'# list\n- id: a # item a\n  title: A\n- id: b # item b\n  title: B\n';
  const f=await fixture(t,{format,source,locators:{a:{kind:'document'}}}),tx=f.registry.begin(await f.registry.snapshot());
  await tx.stage({kind:'move',address:address('a'),path:[],from:0,to:1});await tx.commit();
  assert.deepEqual(codecs[format].parse(await f.read()).map(item=>item.id),['b','a']);
  if(format==='yaml')assert.equal(await f.read(),'# list\n- id: b # item b\n  title: B\n- id: a # item a\n  title: A\n');
  else assert.equal(await f.read(),'[ {"id":"b","v":2},\n  { "id": "a", "v":1 } ]\n');
});
test('no-op updates result in no content write',async t=>{
  const f=await fixture(t),before=await f.read(),tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'set',address:address('a'),path:['title'],value:'A'});assert.deepEqual(tx.updates(),[]);await tx.commit();assert.deepEqual(f.batches[0],[]);assert.equal(await f.read(),before);
});
test('all files are checked before any file is written',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.root,'other.json'),'{"title":"Old"}\n');f.registry.register(address('other'),{file:'other.json',codec:'json'});
  const tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'set',address:address('a'),path:['title'],value:'New'});await tx.stage({kind:'set',address:address('other'),path:['title'],value:'New'});
  const before=await f.read();await fs.writeFile(path.join(f.root,'other.json'),'external');await assert.rejects(tx.commit(),{code:'SOURCE_CONFLICT'});assert.equal(await f.read(),before);assert.equal(await fs.readFile(path.join(f.root,'other.json'),'utf8'),'external');
});
test('document create/delete and field insert/unset/list operations use the same transaction path',async t=>{
  const f=await fixture(t);f.registry.register(address('new'),{file:'new.json',codec:'json'});
  let tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'create',address:address('new'),value:{items:['a','c'],optional:1}});await tx.commit();
  tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'insert',address:address('new'),path:['items'],index:1,value:'b'});await tx.stage({kind:'remove',address:address('new'),path:['items'],index:0});await tx.stage({kind:'unset',address:address('new'),path:['optional']});await tx.commit();
  assert.deepEqual((await f.registry.read(address('new'))).raw,{items:['b','c']});
  tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'delete',owner:address('new')});await tx.commit();await assert.rejects(fs.readFile(path.join(f.root,'new.json')),{code:'ENOENT'});
});
test('failed selectors, duplicate selectors, readonly sources, path escapes and symlinks cannot write',async t=>{
  const f=await fixture(t),before=await f.read();
  f.registry.register(address('readonly'),{file:'readonly.json',codec:'json',writable:false});
  const tx=f.registry.begin(await f.registry.snapshot());await assert.rejects(tx.stage({kind:'set',address:address('readonly'),path:[],value:{}}),/schreibgeschützt/);await assert.rejects(tx.commit(),/abgeschlossen/);
  for(const file of ['../escape.json','/tmp/escape.json','.git/config'])await assert.rejects(f.registry.storage.read(file),/Quellpfad/);
  const external=await fs.mkdtemp(path.join(os.tmpdir(),'afe-external-'));t.after(()=>fs.rm(external,{recursive:true,force:true}));await fs.writeFile(path.join(external,'secret.json'),'{}');await fs.symlink(external,path.join(f.root,'link'));await assert.rejects(f.registry.storage.read('link/secret.json'),/Symlink/);
  assert.equal(await f.read(),before);
  const a=await fixture(t,{source:'[{"id":"a"},{"id":"a"}]',locators:{a:{kind:'array-entry',idField:['id'],idValue:'a'}}});await assert.rejects(a.registry.read(address('a')),/nicht eindeutig/);
});
test('changing an array selector fails the transaction instead of persisting an unaddressable entry',async t=>{
  const f=await fixture(t,{source:'[{"id":"a","title":"A"}]',locators:{a:{kind:'array-entry',idField:['id'],idValue:'a'}}}),before=await f.read(),tx=f.registry.begin(await f.registry.snapshot());
  await assert.rejects(tx.stage({kind:'set',address:address('a'),path:['id'],value:'changed'}),/fehlt/);await assert.rejects(tx.commit(),/abgeschlossen/);assert.equal(await f.read(),before);
});
test('source boundary remains site-agnostic',async()=>{
  const core=await fs.readdir(new URL('./',import.meta.url));for(const file of core.filter(file=>file.endsWith('.mjs')&&!file.endsWith('.test.mjs'))){const source=await fs.readFile(new URL(file,import.meta.url),'utf8');assert.doesNotMatch(source,/from\s*['"](?![^'"]*vendor\/astro-frontend-editor\/)[^'"]*src\/|FlyingStars|flyingstars/);}

});
test('shared array reorder resolves the same stable IDs after moving source entries',async t=>{
  const f=await fixture(t,{format:'yaml',source:'- id: a\n  title: A\n- id: b\n  title: B\n',locators:{a:{kind:'array-entry',idField:['id'],idValue:'a'},b:{kind:'array-entry',idField:['id'],idValue:'b'}}});
  const tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'reorder',address:address('a'),scope:'source',from:0,to:1});await tx.stage({kind:'set',address:address('a'),path:['title'],value:'Moved A'});await tx.commit();
  assert.equal((await f.registry.read(address('a'))).raw.title,'Moved A');assert.equal(codecs.yaml.parse(await f.read())[1].id,'a');
});
test('deleting the last block-YAML entry removes the file; a new entry can recreate it',async t=>{
  const f=await fixture(t,{format:'yaml',source:'a:\n  title: A\n',locators:{a:{kind:'object-entry',key:'a'}}});
  let tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'delete',owner:address('a')});await tx.commit();assert.equal(await f.registry.storage.read(f.file),null);
  tx=f.registry.begin(await f.registry.snapshot());await tx.stage({kind:'create',address:address('a'),value:{title:'New'}});await tx.commit();assert.equal((await f.registry.read(address('a'))).raw.title,'New');
});
test('independent registry instances share the file lock, and snapshots cannot observe a partial commit',async t=>{
  const f=await fixture(t),second=new SourceRegistry({root:f.root,sources:[{key:address('a'),file:f.file,codec:'json',locator:{kind:'object-entry',key:'a'}}]}),base=await f.registry.snapshot();
  const one=f.registry.begin(base),two=second.begin(base);
  await one.stage({kind:'set',address:address('a'),path:['title'],value:'First'});await two.stage({kind:'set',address:address('a'),path:['title'],value:'Second'});
  const install=f.registry.storage.install.bind(f.registry.storage);let release,started;const held=new Promise(resolve=>release=resolve),ready=new Promise(resolve=>started=resolve);
  f.registry.storage.install=async entry=>{started();await held;return install(entry);};
  const commit=one.commit();await ready;
  try{await assert.rejects(second.snapshot(),error=>error.status===409&&/Quelltransaktion/.test(error.message));await assert.rejects(two.commit(),error=>error.status===409);}finally{release();await commit;}
  assert.equal((await second.read(address('a'))).raw.title,'First');assert.equal(await fs.stat(path.join(f.root,'.afe-source.lock')).then(()=>true,()=>false),false);
});
