import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,mkdir,readFile,readdir,rm,symlink,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {NativeStore,git} from './native-store.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {hashBytes} from './core/source-registry.mjs';
import {compareHtml} from './pr5-compare.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),run=promisify(execFile);
const migrationBase='81caa685216019e118a94acbfafd28010ed55b71';
// Deliberately independent of the implementation's identity table.
const expected={
  extras:['extra',6],packages:['package',3],screens:['screen',2],clients:['client',11],
  team:['team',5],media:['media',45],translations:['translation',88],
  siteContact:['site',1,'contact'],siteInquiry:['site',1,'inquiry'],
  siteNavigation:['site',1,'navigation'],siteUi:['site',1,'ui'],
};

test('NativeStore preserves the PR 3 records and whole-file revisions under Astro addresses',async()=>{
  // Execute the actual pre-migration adapter against the same source revision.
  // Only module locations change; the baseline implementation stays untouched.
  let source=await git(root,['show',migrationBase+':editor/flyingstars-adapter.mjs']);
  for (const file of ['legacy-source-adapter.mjs','native-schema.mjs']) {
    source=source.replace(`'./${file}'`,JSON.stringify(pathToFileURL(path.join(root,'editor',file)).href));
  }
  const {createFlyingStarsAdapter:beforeAdapter}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const before=await new NativeStore(root,{site:{...await createFlyingStarsAdapter(root),...await beforeAdapter(root)},remote:false}).init();
  const after=await new NativeStore(root,{site:await createFlyingStarsAdapter(root),remote:false}).init();
  const revision=await git(root,['rev-parse','HEAD']);
  const baseline=await before.stateAt(revision),current=await after.stateAt(revision);
  const values=state=>state.records.map(({id,data,file,revision})=>({id,data,file,revision}));
  // The six upgrade records were added after PR 3; all pre-existing owners still agree.
  assert.deepEqual(values(current).filter(record=>!record.id.startsWith('extra/')),values(baseline));
  assert.equal(current.records.filter(record=>record.type==='extra').length,6);
  for (const record of current.records) {
    const source=after.sourceFor(record.id);
    const collection=Object.entries(expected).find(([, [prefix,,singleton]])=>
      record.type===prefix&&(!singleton||record.id===`site/${singleton}`))?.[0]
      ?? {page:'pages',post:'posts',project:'projects',faq:'faq'}[record.type];
    assert.deepEqual(source.address,{collection,id:record.id.slice(record.type.length+1)},record.id);
    const read=await after.sourceAdapter.registry.read(source.address,{revision});
    assert.equal(read.fileHash,record.revision,record.id);
    assert.equal(read.fileHash,hashBytes(read.bytes),record.id);
    assert.deepEqual(read.revision,{files:{[record.file]:record.revision}});
    assert.ok(after.site.contentCollections.some(directory=>record.file.startsWith(directory)));
  }
  assert.equal(after.sourceFor('site/unknown'),null);
});

test('Astro sync exports every schema and its public loaders preserve JSON entry IDs and values',async t=>{
  const fixture=await mkdtemp(path.join(os.tmpdir(),'afe-pr5-collections-'));
  t.after(()=>rm(fixture,{recursive:true,force:true}));
  await cp(path.join(root,'src'),path.join(fixture,'src'),{recursive:true});
  await cp(path.join(root,'package.json'),path.join(fixture,'package.json'));
  await symlink(path.join(root,'node_modules'),path.join(fixture,'node_modules'));
  // No project environment files or external media are needed for this probe.
  await writeFile(path.join(fixture,'astro.config.mjs'),"import {defineConfig} from 'astro/config'; export default defineConfig({output:'static',cacheDir:'.astro/cache',vite:{cacheDir:'.astro/vite'}});\n");
  await rm(path.join(fixture,'src/pages'),{recursive:true});
  await mkdir(path.join(fixture,'src/pages'));
  await writeFile(path.join(fixture,'src/pages/collections.json.ts'),`
import {getCollection} from 'astro:content';
export async function GET() {
  const collections=Object.fromEntries(await Promise.all(${JSON.stringify(Object.keys(expected))}.map(async name=>
    [name,(await getCollection(name)).map(({id,data})=>({id,data}))])));
  return new Response(JSON.stringify(collections));
}`);
  const pkg=JSON.parse(await readFile(path.join(root,'node_modules/astro/package.json'),'utf8'));
  const cli=path.join(root,'node_modules/astro',typeof pkg.bin==='string'?pkg.bin:pkg.bin.astro);
  const astro=async(...args)=>run(process.execPath,[cli,...args],
    {cwd:fixture,maxBuffer:5_000_000,env:{...process.env,FLYINGSTARS_OFFLINE_MEDIA:'1'}});
  await astro('sync');
  const schemas=await readdir(path.join(fixture,'.astro/collections'));
  assert.deepEqual(schemas.sort(),[...Object.keys(expected),'pages','posts','projects','faq'].map(name=>name+'.schema.json').sort());
  for (const name of Object.keys(expected)) {
    const schema=JSON.parse(await readFile(path.join(fixture,'.astro/collections',name+'.schema.json'),'utf8'));
    assert.equal(schema.type,'object',name);
    assert.ok(Object.keys(schema.properties).length>0,name);
  }
  await astro('build');
  const actual=JSON.parse(await readFile(path.join(fixture,'dist/collections.json'),'utf8'));
  const store=await new NativeStore(root,{remote:false,site:await createFlyingStarsAdapter(root)}).init();
  const state=await store.stateAt(await git(root,['rev-parse','HEAD']));
  for (const [collection,[prefix,count,singleton]] of Object.entries(expected)) {
    const records=state.records.filter(record=>record.type===prefix&&(!singleton||record.id===`site/${singleton}`));
    assert.equal(actual[collection].length,count,collection);
    const nativeIds=value=>Array.isArray(value)?value.map(nativeIds):value&&typeof value==='object'?value.collection&&value.id&&Object.keys(value).length===2?value.id:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,nativeIds(v)])):value;
    const normalize=entries=>nativeIds(entries).sort((a,b)=>a.id.localeCompare(b.id));
    assert.deepEqual(normalize(actual[collection]),normalize(records.map(record=>
      ({id:record.id.slice(prefix.length+1),data:record.data}))),collection);
  }
  // Schema association is filename-specific, not a permissive site union.
  const contact=path.join(fixture,'src/content/site/contact.json');
  await cp(path.join(fixture,'src/content/site/navigation.json'),contact);
  await assert.rejects(astro('sync','--force'),error=>/siteContact/.test(error.stdout+error.stderr));
});

test('HTML comparison detects byte differences and page-set changes',async t=>{
  const fixture=await mkdtemp(path.join(os.tmpdir(),'afe-pr5-html-'));
  t.after(()=>rm(fixture,{recursive:true,force:true}));
  const before=path.join(fixture,'before'),after=path.join(fixture,'after');
  await mkdir(before);await mkdir(after);
  await writeFile(path.join(before,'index.html'),'Grüße\n');
  await writeFile(path.join(after,'index.html'),'Grüße\n');
  assert.deepEqual(await compareHtml(before,after),{pages:1,identical:1,differences:[]});
  await writeFile(path.join(after,'index.html'),'Grüße\r\n');
  const result=await compareHtml(before,after);
  assert.equal(result.identical,0);
  assert.equal(result.differences[0].offset,7);
  await writeFile(path.join(after,'extra.html'),'extra');
  await assert.rejects(compareHtml(before,after),/page set changed/);
});
