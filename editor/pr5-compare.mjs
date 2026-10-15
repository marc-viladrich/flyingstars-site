import assert from 'node:assert/strict';
import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {NativeStore,git} from './native-store.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';

async function htmlFiles(root,directory='') {
  const files=[];
  for (const entry of await readdir(path.join(root,directory),{withFileTypes:true})) {
    const relative=path.join(directory,entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(root,relative));
    else if (entry.name.endsWith('.html')) files.push(relative);
  }
  return files.sort();
}

export async function compareHtml(before,after) {
  const files=await htmlFiles(before);
  assert.deepEqual(await htmlFiles(after),files,'Built page set changed');
  const differences=[];
  for (const file of files) {
    const a=await readFile(path.join(before,file)),b=await readFile(path.join(after,file));
    if (a.equals(b)) continue;
    let offset=0;
    while (offset<Math.min(a.length,b.length)&&a[offset]===b[offset]) offset++;
    differences.push({file,offset,beforeBytes:a.length,afterBytes:b.length,
      before:a.subarray(Math.max(0,offset-60),offset+100).toString(),
      after:b.subarray(Math.max(0,offset-60),offset+100).toString()});
  }
  return {pages:files.length,identical:files.length-differences.length,differences};
}

export async function captureState(root,revision) {
  const store=await new NativeStore(root,{remote:false,site:await createFlyingStarsAdapter(root)}).init();
  return store.stateAt(revision??await git(root,['rev-parse','HEAD']));
}

if (process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
  const [command,before,after]=process.argv.slice(2);
  const root=fileURLToPath(new URL('../',import.meta.url));
  if (command==='html') {
    const result=await compareHtml(before,after);
    console.log(JSON.stringify(result,null,2));
    if (result.differences.length) process.exitCode=1;
  } else if (command==='snapshot-html') {
    for (const file of await htmlFiles(before)) {
      const target=path.join(after,file);
      await mkdir(path.dirname(target),{recursive:true});
      await cp(path.join(before,file),target,{errorOnExist:true,force:false});
    }
  } else if (command==='snapshot-state') {
    await writeFile(before,JSON.stringify(await captureState(root,after)));
  } else if (command==='state') {
    const baseline=JSON.parse(await readFile(before,'utf8'));
    const current=JSON.parse(JSON.stringify(await captureState(root,after)));
    assert.deepEqual(current.records,baseline.records,'NativeStore records changed');
    assert.deepEqual(current.templates,baseline.templates,'NativeStore templates changed');
    console.log(`${current.records.length} records: identical IDs, revisions, values and descriptors; templates identical`);
  } else throw new Error('Usage: node editor/pr5-compare.mjs html|snapshot-html BEFORE AFTER | snapshot-state|state FILE [REVISION]');
}
