import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {FILES,VENDOR,sha256} from './vendor/sync-astro-frontend-editor.mjs';

const provenance=JSON.parse(await readFile(path.join(VENDOR,'PROVENANCE.json'),'utf8'));
const walk=async dir=>(await readdir(dir,{withFileTypes:true})).flatMap(e=>e.isDirectory()?[]:[path.join(dir,e.name)]).concat(...await Promise.all((await readdir(dir,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>walk(path.join(dir,e.name)))));

test('vendored astro-frontend-editor files are byte-identical to the recorded product commit',async()=>{
 assert.match(provenance.commit,/^[0-9a-f]{40}$/);
 assert.deepEqual(Object.keys(provenance.files),FILES);
 for(const file of FILES)assert.equal(sha256(await readFile(path.join(VENDOR,file))),provenance.files[file],file+' wurde lokal verändert; Änderungen gehören ins Produkt-Repo, dann sync-astro-frontend-editor.mjs ausführen.');
 const present=(await walk(VENDOR)).map(file=>path.relative(VENDOR,file).split(path.sep).join('/')).filter(file=>file!=='PROVENANCE.json').sort();
 assert.deepEqual(present,[...FILES].sort(),'Nur die in FILES gelisteten Produktdateien liegen im Vendor-Ordner.');
});

test('a product checkout, if given, still matches the vendored files',{skip:!process.env.AFE_PRODUCT_DIR&&'AFE_PRODUCT_DIR nicht gesetzt'},async()=>{
 for(const file of FILES)assert.equal(sha256(await readFile(path.join(process.env.AFE_PRODUCT_DIR,file))),provenance.files[file],file+' weicht vom Produkt-Checkout ab; sync ausführen.');
});
