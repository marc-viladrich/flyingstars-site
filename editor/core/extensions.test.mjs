import test from 'node:test';
import assert from 'node:assert/strict';
import {createExtensionRegistry} from './extensions.mjs';
const extension=(name,hooks={})=>({name,contractVersion:'1.0',hooks});

test('registration is per runtime, immutable and rejects duplicate names, invalid hooks and incompatible contracts before execution',()=>{
 let calls=0;
 const definitions=[extension('site/one',{route:()=>{calls++;return '/one/';}})];
 const registry=createExtensionRegistry(definitions);definitions.length=0;
 assert.equal(registry.first('route',{}),'/one/');
 assert.equal(createExtensionRegistry().first('route',{}),undefined);
 assert.throws(()=>createExtensionRegistry([extension('site/one'),extension('site/one')]),/Duplicate/);
 assert.throws(()=>createExtensionRegistry([{...extension('site/old',{route:()=>calls++}),contractVersion:'2.0'}]),/version mismatch/);
 assert.equal(calls,1);
 assert.throws(()=>createExtensionRegistry([extension('unnamespaced')]),/namespaced/);
 assert.throws(()=>createExtensionRegistry([extension('site/bad',{afterSave:()=>{}})]),/Invalid.*hook/);
 assert.throws(()=>{registry.definitions[0].hooks.route=()=>'/mutated/';},TypeError);
});

test('all policies and collected proposals run once in deterministic name order; resolver skips missing/null results',()=>{
 const calls=[];
 const registry=createExtensionRegistry([
  extension('site/z',{validateRecords:()=>calls.push('z'),references:()=>['z'],route:()=>'/z/'}),
  extension('site/a',{validateRecords:()=>calls.push('a'),references:()=>['a'],route:()=>null}),
  extension('site/m'),
 ]);
 registry.run('validateRecords',[]);
 assert.deepEqual(calls,['a','z']);
 assert.deepEqual(registry.collect('references',[],{}),['a','z']);
 assert.equal(registry.first('route',{}),'/z/');
 const empty=createExtensionRegistry();
 assert.equal(empty.first('route',{}),undefined);assert.equal(empty.some('preventDelete','x'),false);
 assert.deepEqual(empty.collect('references',[],{}),[]);assert.equal(empty.run('validateRecords',[]),undefined);
 assert.throws(()=>empty.require('mediaPolicy'),/missing/);
 assert.throws(()=>empty.runRequired('validateBinaryWrite',{}),/missing/);
 const writes=[];
 const mandatory=createExtensionRegistry([extension('site/a',{validateBinaryWrite:()=>{writes.push('a');return true;}}),extension('site/z',{validateBinaryWrite:()=>{writes.push('z');throw Error('binary policy');}})]);
 assert.throws(()=>mandatory.runRequired('validateBinaryWrite',{}),/binary policy/);assert.deepEqual(writes,['a','z']);
 assert.throws(()=>empty.first('typo'),/Unknown/);
});

test('policy failure stops dispatch, recursive invocation is refused, independent async requests do not share dispatch state',async()=>{
 const calls=[];
 const registry=createExtensionRegistry([extension('site/a',{validateRecords:()=>{throw Error('policy');}}),extension('site/z',{validateRecords:()=>calls.push('z')})]);
 assert.throws(()=>registry.run('validateRecords',[]),/policy/);assert.deepEqual(calls,[]);
 let recursive;
 recursive=createExtensionRegistry([extension('site/a',{route:()=>recursive.first('route',{})})]);
 assert.throws(()=>recursive.first('route',{}),/Recursive/);
 const asyncRegistry=createExtensionRegistry([extension('site/a',{validateCreation:async({value})=>{await Promise.resolve();calls.push(value);}})]);
 await Promise.all([1,2].map(value=>asyncRegistry.runAsync('validateCreation',{value})));
 assert.deepEqual(calls,[1,2]);
 assert.throws(()=>asyncRegistry.run('validateCreation',{value:3}),/requires runAsync/);
});
