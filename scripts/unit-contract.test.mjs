import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {UNIT_DIRECTORIES,UNIT_ARGS} from './unit-contract.mjs';
test('Jeder Unit-Test unter editor, scripts und src/scripts ist im gemeinsamen Gate',()=>{
 const found=['editor','scripts','src/scripts'].flatMap(root=>readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.test.mjs')).map(f=>`${root}/${f}`));
 for(const file of found)assert.ok(UNIT_DIRECTORIES.some(dir=>file.slice(0,file.lastIndexOf('/'))===dir),file);
 assert.equal(UNIT_ARGS[1],'--test-concurrency=2');
 const pkg=JSON.parse(readFileSync('package.json')),lock=JSON.parse(readFileSync('package-lock.json'));
 assert.equal(pkg.engines.node,'>=24.15.0');assert.equal(lock.packages[''].engines.node,pkg.engines.node);
 const afe=JSON.parse(readFileSync('node_modules/astro-frontend-editor/package.json'));
 assert.equal(afe.engines.node,pkg.engines.node);
 assert.equal(readFileSync('.nvmrc','utf8').trim(),'26');
});
