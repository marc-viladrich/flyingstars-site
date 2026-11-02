import './test/register-browser-site.mjs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,symlink,cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'astro/zod';
import {validateMeta} from 'astro-frontend-editor/schema';
import {assertMetadataWrite} from 'astro-frontend-editor/runtime/extensions';
import {listPolicy,nodeAt,recordTitle,arrayActionAllowed} from 'astro-frontend-editor/runtime/extensions';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {describeSchema,schemaDescription,templateFor,wire} from 'astro-frontend-editor/runtime/extensions';
import {NativeStore,git} from 'astro-frontend-editor/runtime';
import {describe} from 'astro-frontend-editor/web/native-schema.mjs';
import {fieldLabel,choiceLabel,isTechnical} from 'astro-frontend-editor/web/field-labels.mjs';
import {omitRecordField,siteWidgets,referencePrefix,referencedRecords} from 'astro-frontend-editor/web/site-adapter.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import {kindOf} from 'astro-frontend-editor/web/record-kinds.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));

test('vendored vocabulary rejects unknown keys, including nested members',async()=>{
 for(const meta of [{surprise:true},{array:{table:true}},{reference:{collection:'team',encoding:'id',guess:true}}])assert.ok(validateMeta(meta).some(i=>i.code==='unknown-key'));
 const schema=z.string().meta({'x-afe':{surprise:true}});
 assert.throws(()=>schemaDescription(schema),/Unknown x-afe key/);
 assert.throws(()=>describeSchema(schema,'Text'),/Unknown x-afe key/);
});

test('core has no field-name tables, reference guesses or positional-list name rules',async()=>{
 // The installed editor package (astro-frontend-editor) must not know FlyingStars.
 const pkg=new URL('./',import.meta.resolve('astro-frontend-editor/package.json'));
 const files=['web/editor.js','web/view-state.mjs','web/field-labels.mjs','src/runtime/native-schema.mjs','web/native-schema.mjs','src/runtime/native-store.mjs','web/native-draft.mjs'];
 const forbidden=[/\b(?:keyLabels|choiceLabels|technicalKeys|ownNames|positionalList)\b/,/['"](?:packageId|memberIds|clientIds|assetId|featureIds)['"]/,/\.(?:packageId|memberIds|clientIds|assetId|featureIds)\b/,/endsWith\(\s*['"]Ids?['"]\s*\)/,/slice\(\s*0,\s*-2\s*\)/,/['"]cells['"]\s*,\s*['"]values['"]\s*,\s*['"]columns['"]/];
 for(const file of files){const source=await readFile(new URL(file,pkg),'utf8');for(const pattern of forbidden)assert.doesNotMatch(source,pattern,file);}
 // Scan every runtime server module of the package, including core/deploy/preview modules.
 const runtime=new URL('src/runtime/',pkg);
 const serverFiles=(await readdir(runtime,{recursive:true})).filter(file=>file.endsWith('.mjs'));
 assert.ok(serverFiles.length>30,'package runtime found');
 const domain=[/FlyingStars|flyingstars/i,/\b(?:SPARK|HORIZON|ODYSSEY)\b/,/\b(?:packageId|featureIds|memberIds|clientIds|assetId)\b/,/["'](?:page|package|screen|post|project|faq|client|team|media|site|translation)\//,/\^\((?:page|package|screen|post|project|faq|client|team)\|/,/t-outline|t-caps|data-card|cfg-field/,/['"](?:packages|clients|team|screens|siteContact|siteInquiry|siteNavigation|siteUi|pricing|logoBar|projectGrid|postList)['"]/ ,/\b(?:packageOwnership|sourceId)\b/];
 for(const file of serverFiles){
  const source=await readFile(new URL(file,runtime),'utf8');
  for(const pattern of domain)assert.doesNotMatch(source,pattern,file);
 }
});

test('unfamiliar field names carry validated references, choice labels, title, visibility and inherited read-only state',()=>{
 const schema=z.object({opaque:z.object({foreign:z.string().describe('Verknüpfung').meta({'x-afe':{reference:{collection:'arbitrary',encoding:'id'},visibility:'advanced'}})}).describe('Geschützt').meta({'x-afe':{readOnly:true}}),heading:z.string().describe('Überschrift'),choice:z.enum(['x','y']).describe('Auswahl').meta({'x-afe':{choices:{x:{label:'Erste'},y:{label:'Zweite'}}}})}).meta({'x-afe':{collection:{label:'Beispiele',title:['heading']}}});
 const data={opaque:{foreign:'one'},heading:'Titel aus dem Schema',choice:'x'},serial=schemaDescription(schema),server=describeSchema(schema,data),browser=describe(serial,data);
 for(const result of [server,browser]){const field=result.fields.find(f=>f.path.at(-1)==='foreign');assert.equal(isTechnical(field),true);assert.equal(field.readOnly,true);assert.equal(field['x-afe'].reference.collection,'arbitrary');assert.equal(choiceLabel('x',result.fields.find(f=>f.path[0]==='choice')),'Erste');}
 assert.equal(recordTitle({schema:serial,data}),'Titel aus dem Schema');
 assert.deepEqual(listPolicy({}),{reorderable:false,insertable:false,removable:false});
});

test('metadata rejects forbidden structural changes, whole-root replacements and protected descendants',()=>{
 const schema=schemaDescription(z.object({opaque:z.array(z.object({key:z.string(),copy:z.string()})).meta({'x-afe':{array:{key:['key'],reorderable:false,insertable:false,removable:false}}}),locked:z.object({copy:z.string()}).meta({'x-afe':{readOnly:true}})}));
 const before={opaque:[{key:'a',copy:'A'},{key:'b',copy:'B'}],locked:{copy:'fest'}};
 for(const after of [{...before,opaque:[...before.opaque].reverse()},{...before,opaque:[...before.opaque,{key:'c',copy:'C'}]},{...before,opaque:before.opaque.slice(1)},{...before,opaque:[{key:'b',copy:'Edited'},before.opaque[0]]},{...before,locked:{copy:'verändert'}}])assert.throws(()=>assertMetadataWrite(schema,before,after));
 assert.doesNotThrow(()=>assertMetadataWrite(schema,before,{...before,opaque:[{key:'a',copy:'Edited'},before.opaque[1]]}));
});

async function recordFixtures(){
 const site=await createFlyingStarsAdapter(root),files=(await readdir(root+'src/content',{recursive:true})).map(f=>'src/content/'+f),records=[];
 for(const source of site.sourcesFromFiles(files))records.push({id:source.id,type:source.prefix,address:source.address,data:wire(source.schema.parse(codecs[source.format].parse(await readFile(root+source.file)))),schema:schemaDescription(source.schema)});
 const pool=[];const collect=value=>{pool.push(value);if(value&&typeof value==='object')Object.values(value).forEach(collect);};records.forEach(r=>collect(r.data));
 for(const schema of site.sectionSchema.options){const type=schema.shape.type._def.values[0],sample=records.flatMap(r=>r.data.sections||[]).find(s=>s.type===type);records.push({id:'variant/'+type,data:templateFor(schema,sample,pool),schema:schemaDescription(schema,pool)});}
 return {site,records};
}
function panelSnapshot(records){
 const out={};
 for(const record of records){const model=/^(site|variant)\//.test(record.id)?record.id:record.type;const panels=out[model]||=(Object.fromEntries(['fields','containers','optionalFields'].map(k=>[k,new Map()])));
  const description=describe(record.schema,record.data,{id:record.id,omitPath:(data,p)=>omitRecordField(record,data,p)});
  for(const [kind,nodes]of Object.entries(description))for(const f of nodes){const descriptor={path:f.path.map(p=>typeof p==='number'?'*':p),label:fieldLabel(f),kind:f.kind,advanced:isTechnical(f),...(f.choices?{choices:f.choices.map(c=>choiceLabel(c,f))}:{}),...(f.kind==='array'?{array:Object.fromEntries(['reorderable','insertable','removable'].map(k=>[k,listPolicy(f)[k]]))}:{})};panels[kind].set(JSON.stringify(descriptor),descriptor);}
 }
 // Stable canonical ordering independent of file enumeration or concrete list lengths.
 const canonical=value=>JSON.stringify(value,Object.keys(value).sort());
 for(const panels of Object.values(out))for(const [kind,nodes]of Object.entries(panels))panels[kind]=[...nodes.values()].sort((a,b)=>canonical(a).localeCompare(canonical(b),'en'));
 return out;
}

test('pure panel parity covers every current file model and all schema variants',async()=>{
 const {site,records}=await recordFixtures();for(const record of records){const server=describeSchema(siteFor(record).schema,record.data).fields.filter(f=>f.value!==undefined&&f.path.at(-1)!=='type'&&f.path[0]!=='translationSourceHash');const browser=describe(record.schema,record.data,{omitPath:(data,p)=>omitRecordField(record,data,p)}).fields;assert.deepEqual(browser.map(f=>f.path),server.map(f=>f.path),record.id);}
 function siteFor(record){return record.id.startsWith('variant/')?{schema:site.sectionSchema.options.find(s=>s.shape.type.value===record.data.type)}:site.sourceFor(record.id);}
});
test('all actual schema widgets are registered and every actual collection declares its ownership',async()=>{const {site}=await recordFixtures();const walk=node=>{if(node['x-afe']?.widget)assert.ok(siteWidgets[node['x-afe'].widget]);Object.values(node.properties||{}).forEach(walk);node.options?.forEach(walk);if(node.element)walk(node.element);node.items?.forEach(walk);};for(const type of site.types){const schema=schemaDescription(type.schema);assert.ok(schema['x-afe']?.collection,type.prefix);walk(schema);}});
test('record titles follow the current schema and adapter rather than removed singleton records',async()=>{const {site,records}=await recordFixtures();for(const record of records.filter(r=>!r.id.startsWith('variant/'))){const source=site.sourceFor(record.id),title=site.extensions.first('title',source,record.data);assert.equal(recordTitle({schema:record.schema,data:record.data,title,id:record.id}),title,record.id);}});

test('block action controls and handlers honor the same metadata, including inherited read-only',async()=>{
 const source=await readFile(new URL('./web/editor.js',import.meta.resolve('astro-frontend-editor/package.json')),'utf8');
 const item={data:{sections:[{type:'a'},{type:'a'},{type:'a'}]},schema:{kind:'object',properties:{sections:{kind:'array',min:1,'x-afe':{array:{reorderable:false,insertable:false,removable:false}}}}}};
 const actions=runInNewContext(source.slice(source.indexOf('function sectionActions('),source.lastIndexOf('// ---------------------------------------------------------------------------',source.indexOf('// Panel views')))+';sectionActions',{state:{templates:{sections:[{type:'a'}]}},nodeAt,listPolicy,actionGroup:(_,actions)=>actions.filter(Boolean),actionRow:label=>label});
 assert.equal(actions(item,1).length,0);
 Object.assign(item.schema.properties.sections['x-afe'].array,{reorderable:true,insertable:true,removable:true});assert.equal(actions(item,1).length,5);
 item.schema.properties.sections.readOnly=true;assert.equal(actions(item,1).length,0);
 for(const kind of ['insert','duplicate','remove','up','down'])assert.equal(arrayActionAllowed(item.schema.properties.sections,kind),false);
 const mutate=runInNewContext(source.slice(source.indexOf('function mutateSections('),source.indexOf('function dialog('))+';mutateSections',{busy:false,ready:true,stageInputs:()=>{},record:()=>item,nodeAt,arrayActionAllowed,sectionMutation:()=>assert.fail('locked array must not mutate')});
 for(const kind of ['duplicate','remove','up','down'])mutate('any',1,kind);
});

test('complete browser modules parse, beyond isolated panel-function probes',async()=>{
 for(const file of await readdir(new URL('./web/',import.meta.resolve('astro-frontend-editor/package.json'))))if(/\.m?js$/.test(file))execFileSync(process.execPath,['--check',fileURLToPath(new URL('./web/'+file,import.meta.resolve('astro-frontend-editor/package.json')))],{stdio:'pipe'});
});
