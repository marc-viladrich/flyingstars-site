import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {LegacySourceAdapter} from '../legacy-source-adapter.mjs';
import {git} from '../native-store.mjs';
import {hashBytes} from './source-registry.mjs';

async function fixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'afe-legacy-sources-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await git(root,['init','-q','-b','content/draft']);
  await fs.writeFile(path.join(root,'one.yaml'),'# leading\ntitle: Original # inline\nitems:\n  - label: First\n    body: Keep\n  - label: Last\n    body: Other\n');
  await fs.writeFile(path.join(root,'two.json'),'{ "title": "Second" }\n');
  await git(root,['add','.']);await git(root,['-c','commit.gpgsign=false','commit','-qm','fixture']);
  const parent=await git(root,['rev-parse','HEAD']);
  const descriptors=['one','two'].map((id,index)=>({id,address:{collection:'records',id},file:id+(index?'.json':'.yaml'),format:index?'json':'yaml',locator:{kind:'document'}}));
  const site={contentRoot:'.',sourceFor:id=>descriptors.find(source=>source.id===id),sourcesFromFiles:files=>descriptors.filter(source=>files.includes(source.file))};
  const adapter=new LegacySourceAdapter({root,site,git,draftBranch:'content/draft'});descriptors.forEach(source=>adapter.register(source));
  return {root,parent,adapter,descriptors,context:()=>({parent,requestId:randomUUID(),payload:'test-payload'})};
}
test('legacy bridge commits exactly the codec bytes, preserving hashes and a clean index',async t=>{
  const f=await fixture(t),source=f.descriptors[0],text=await f.adapter.readFile(f.parent,source.file),decoded=f.adapter.decode(source,text),patch={path:['items',0,'label'],value:'Grüße'};
  const bytes=Buffer.from(f.adapter.encode(source,decoded.raw,decoded.doc,[patch]));
  assert.equal(bytes.toString(),text.replace('label: First','label: Grüße'));
  const {head}=await f.adapter.commit([{file:source.file,before:Buffer.from(text),bytes}],f.context());
  assert.equal(hashBytes(await f.adapter.bytes(source.file)),hashBytes(bytes));assert.equal(await f.adapter.readFile(head,source.file),bytes.toString());assert.equal(await git(f.root,['status','--porcelain']),'');
});
test('a failed second atomic write restores content, Git revision and index',async t=>{
  const f=await fixture(t),updates=await Promise.all(f.descriptors.map(async source=>{const before=await f.adapter.bytes(source.file);return {file:source.file,before,bytes:Buffer.from(f.adapter.encode(source,{title:'Changed'},f.adapter.decode(source,before.toString()).doc,[{path:['title'],value:'Changed'}]))};}));
  const storage=f.adapter.registry.storage,install=storage.install.bind(storage);let writes=0;
  storage.install=async entry=>{if(++writes===2)throw Error('injected second write failure');return install(entry);};
  await assert.rejects(f.adapter.commit(updates,f.context()),/injected/);
  for(const update of updates)assert.deepEqual(await f.adapter.bytes(update.file),update.before);
  assert.equal(await git(f.root,['rev-parse','HEAD']),f.parent);assert.equal(await git(f.root,['status','--porcelain']),'');
});
test('an index update failure also rolls back every content file and the branch',async t=>{
  const f=await fixture(t),source=f.descriptors[0],before=await f.adapter.bytes(source.file),storage=f.adapter.registry.storage,run=storage.git;
  storage.git=(root,args,options)=>args.includes('--index-info')?Promise.reject(Error('injected index failure')):run(root,args,options);
  await assert.rejects(f.adapter.commit([{file:source.file,before,bytes:Buffer.from('title: Changed\n')}],f.context()),/injected index/);
  assert.deepEqual(await f.adapter.bytes(source.file),before);assert.equal(await git(f.root,['rev-parse','HEAD']),f.parent);assert.equal(await git(f.root,['status','--porcelain']),'');
});

test('NativeStore delegates content writes to its source transaction adapter',async()=>{
  const store=await fs.readFile(new URL('../native-store.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(store,/fs\.(?:writeFile|rename|rm|unlink)|\[['"]checkout['"]/);
  assert.match(store,/sourceAdapter\.commit\(updated/);
});

test('records sharing one YAML map: two edits, a new entry and a removal are one exact commit of that file',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'afe-shared-sources-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await git(root,['init','-q','-b','content/draft']);
  const original='# Kategorien\nbread:\n  name: Brote # Grundsortiment\n  order: 1\npastry:\n  name: Gebäck\n  order: 2\nsavory:\n  name: Herzhaftes\n  order: 3\n';
  await fs.writeFile(path.join(root,'categories.yaml'),original);
  await git(root,['add','.']);await git(root,['-c','commit.gpgsign=false','commit','-qm','fixture']);
  const parent=await git(root,['rev-parse','HEAD']);
  const descriptors=['bread','pastry','savory','sweet'].map(id=>({id,address:{collection:'categories',id},file:'categories.yaml',format:'yaml',locator:{kind:'object-entry',key:id}}));
  const adapter=new LegacySourceAdapter({root,site:{contentRoot:'.',sourceFor:id=>descriptors.find(s=>s.id===id),sourcesFromFiles:()=>descriptors},git,draftBranch:'content/draft'});descriptors.forEach(s=>adapter.register(s));
  const [bread,pastry,savory,sweet]=descriptors,text=await adapter.readFile(parent,'categories.yaml');
  const one=adapter.decode(bread,text);assert.deepEqual(one.raw,{name:'Brote',order:1},'a record reads only its entry');
  const edit=(source,path,value)=>{const decoded=adapter.decode(source,text),raw=structuredClone(decoded.raw);raw[path[0]]=value;return {file:source.file,before:Buffer.from(text),bytes:Buffer.from(adapter.encode(source,raw,decoded.doc,[{path,value}])),address:source.address,raw};};
  assert.equal(edit(bread,['name'],'Brot').bytes.toString(),original.replace('name: Brote','name: Brot'),'an edit stays inside its entry, the comment stays');
  const updates=[edit(bread,['name'],'Brot'),edit(pastry,['order'],5),{file:sweet.file,before:Buffer.from(text),bytes:Buffer.from(adapter.encodeCreate(sweet,{name:'Süßes',order:4},text)),address:sweet.address,raw:{name:'Süßes',order:4},kind:'create'},{file:savory.file,before:Buffer.from(text),bytes:null,address:savory.address,kind:'delete'}];
  const {head}=await adapter.commit(updates,{parent,requestId:randomUUID(),payload:'shared'});
  const saved=await adapter.readFile(head,'categories.yaml');
  assert.match(saved,/^# Kategorien\nbread:\n  name: Brot # Grundsortiment\n  order: 1\npastry:\n  name: Gebäck\n  order: 5\n/);
  assert.doesNotMatch(saved,/savory/);assert.match(saved,/sweet:\n  name: Süßes\n  order: 4\n/);
  assert.equal(await git(root,['show','--name-only','--format=',head]),'categories.yaml','one file, one commit');
  assert.equal(adapter.encodeDelete(pastry,saved),saved.replace(/pastry:\n  name: Gebäck\n  order: 5\n/,''),'removing an entry keeps the others');
});
