import {omitOwnedField} from './web/site-adapter.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {describe} from './web/native-schema.mjs';
test('schema walking covers new nested array entries and optional groups instead of source snapshot paths',()=>{const schema={kind:'object',properties:{sections:{kind:'array',element:{kind:'union',discriminator:'type',options:[{kind:'object',properties:{type:{kind:'literal',value:'testimonials'},clientIds:{kind:'array',element:{kind:'text'}},headline:{kind:'text'}}}]}},testimonial:{kind:'object',optional:true,properties:{quote:{kind:'text'},person:{kind:'text'}}}}};const actual={sections:[{type:'testimonials',headline:'New',clientIds:['a','b']}],testimonial:{quote:'Own quote',person:'Name'}};const result=describe(schema,actual);assert.ok(result.fields.some(f=>JSON.stringify(f.path)==='["sections",0,"clientIds",1]'));assert.ok(result.fields.some(f=>JSON.stringify(f.path)==='["testimonial","quote"]'));assert.ok(!result.fields.some(f=>f.path.at(-1)==='type'));});
test('global media ownership suppresses cached source values but keeps per-use controls',()=>{const text={kind:'text'};const schema={kind:'object',properties:{image:{kind:'object',properties:{src:text,alt:text,assetId:text,altOverride:{kind:'text',nullable:true},decorative:{kind:'boolean'}}}}};const result=describe(schema,{image:{src:'x',alt:'old',assetId:'media/a',altOverride:null,decorative:false}},{omitPath:omitOwnedField});assert.deepEqual(result.fields.map(f=>f.path.at(-1)),['assetId','altOverride','decorative']);});

test('a written list keeps each entry in its source form and states no default the source left out',async()=>{
 const {z}=await import('astro/zod'),{sourceShaped}=await import('./native-schema.mjs');
 const section=z.discriminatedUnion('type',[z.object({type:z.literal('text'),headline:z.string(),mediaSide:z.enum(['left','right']).default('right'),body:z.string().optional()}),z.object({type:z.literal('hours'),days:z.array(z.object({day:z.string(),note:z.string().default('')})).default([])})]);
 const list=z.array(section),raw=[{type:'hours',days:[{day:'Mo'}]},{type:'text',headline:'A'},{type:'text',headline:'B',mediaSide:'right'}];
 const parsed=list.parse(structuredClone(raw)),moved=[parsed[1],parsed[0],parsed[2]];
 assert.deepEqual(sourceShaped(list,raw,moved),[raw[1],raw[0],raw[2]],'a move writes the source entries, no mediaSide or note added');
 const edited=structuredClone(moved);edited[0].headline='A neu';edited[2].headline='B neu';
 assert.deepEqual(sourceShaped(list,raw,edited),[{type:'text',headline:'A neu'},raw[0],{type:'text',headline:'B neu',mediaSide:'right'}],'an edited entry keeps what its source stated, and no more');
 const added=[...parsed,{type:'text',headline:'C',mediaSide:'left'}];
 assert.deepEqual(sourceShaped(list,raw,added).at(-1),{type:'text',headline:'C',mediaSide:'left'},'a new entry keeps values that differ from the default');
 assert.equal(sourceShaped(z.string(),'x','y'),'y');
});
