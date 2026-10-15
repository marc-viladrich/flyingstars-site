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
  assert.equal(bytes.toString(),text.replace('label: First','label: "Grüße"'));
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
