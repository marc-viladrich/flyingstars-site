import test from 'node:test';
import assert from 'node:assert/strict';
import {globSync,readdirSync,readFileSync} from 'node:fs';
import {UNIT_ARGS} from './unit-contract.mjs';
test('Jeder Unit-Test unter editor, scripts und src/scripts ist im gemeinsamen Gate',()=>{
 const found=['editor','scripts','src/scripts'].flatMap(root=>readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.test.mjs')).map(f=>`${root}/${f}`));
 const discovered=globSync(UNIT_ARGS.slice(2));
 assert.deepEqual(discovered.sort(),found.sort());
 assert.ok(discovered.includes('src/scripts/scenes/catalog-actions-physics.test.mjs'));
 assert.ok(discovered.includes('src/scripts/scenes/catalog-actions.test.mjs'));
 const pkg=JSON.parse(readFileSync('package.json')),lock=JSON.parse(readFileSync('package-lock.json'));
 assert.equal(pkg.engines.node,'>=24.15.0');assert.equal(lock.packages[''].engines.node,pkg.engines.node);
 const afe=JSON.parse(readFileSync('node_modules/astro-frontend-editor/package.json'));
 assert.equal(afe.engines.node,pkg.engines.node);
 assert.equal(readFileSync('.nvmrc','utf8').trim(),'26');
});
