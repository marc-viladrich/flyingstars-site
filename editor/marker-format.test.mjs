// The editor and the site speak only the astro-frontend-editor marker format (one data-afe attribute).
// The earlier FlyingStars data-native-* format must not come back, neither as output nor as a selector.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(entry=>entry.isDirectory()?(['node_modules','vendor','.astro','dist'].includes(entry.name)?[]:walk(path.join(dir,entry.name))):[path.join(dir,entry.name)]))).flat();
const code=file=>/\.(mjs|js|ts|astro)$/.test(file);
// Guards that assert the absence of the old format in public output may name it.
const allowed=new Set(['scripts/check-production-delivery.mjs','editor/marker-format.test.mjs','editor/i18n-e2e.test.mjs']);

test('no data-native-* marker, dataset.native* access or FLYINGSTARS_EDITOR switch remains in editor, site or scripts',async()=>{
 const offenders=[];
 for(const dir of ['editor','src','scripts'])for(const file of (await walk(path.join(root,dir))).filter(code)){
  const relative=path.relative(root,file).split(path.sep).join('/');
  if(allowed.has(relative))continue;
  const source=await readFile(file,'utf8');
  for(const [index,line] of source.split('\n').entries())if(/data-native-|dataset\.native[A-Z]|FLYINGSTARS_EDITOR|native-editor['"]/.test(line))offenders.push(`${relative}:${index+1}`);
 }
 assert.deepEqual(offenders,[]);
});
