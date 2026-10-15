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
import {validateMeta} from './core/afe-meta-spec.mjs';
import {assertMetadataWrite} from './core/write-policy.mjs';
import {listPolicy,nodeAt,recordTitle,arrayActionAllowed} from './core/metadata.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {describeSchema,schemaDescription,templateFor,wire} from './native-schema.mjs';
import {NativeStore,git} from './native-store.mjs';
import {describe} from './web/native-schema.mjs';
import {fieldLabel,choiceLabel,isTechnical} from './web/field-labels.mjs';
import {omitRecordField,siteWidgets,referencePrefix,referencedRecords} from './web/site-adapter.mjs';
import {codecs} from './core/codecs.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));

test('vendored vocabulary is unchanged and rejects unknown keys, including nested members',async()=>{
 const source=await readFile(new URL('./core/afe-meta-spec.mjs',import.meta.url),'utf8');
 const original=source.split('\n').slice(2).join('\n');
 assert.equal(createHash('sha256').update(original).digest('hex'),'f61891b2e32a6d8e3ba6475d2b4793fd242e6e67d779b8fadf3d094098deaaed');
 for(const meta of [{surprise:true},{array:{table:true}},{reference:{collection:'team',encoding:'id',guess:true}}])assert.ok(validateMeta(meta).some(i=>i.code==='unknown-key'));
 const schema=z.string().meta({'x-afe':{surprise:true}});
 assert.throws(()=>schemaDescription(schema),/Unknown x-afe key/);
 assert.throws(()=>describeSchema(schema,'Text'),/Unknown x-afe key/);
});

test('core has no field-name tables, reference guesses or positional-list name rules',async()=>{
 const files=['web/editor.js','web/view-state.mjs','web/field-labels.mjs','native-schema.mjs','web/native-schema.mjs','native-store.mjs','web/native-draft.mjs'];
 const forbidden=[/\b(?:keyLabels|choiceLabels|technicalKeys|ownNames|positionalList)\b/,/['"](?:packageId|memberIds|clientIds|assetId|featureIds)['"]/,/\.(?:packageId|memberIds|clientIds|assetId|featureIds)\b/,/endsWith\(\s*['"]Ids?['"]\s*\)/,/slice\(\s*0,\s*-2\s*\)/,/['"]cells['"]\s*,\s*['"]values['"]\s*,\s*['"]columns['"]/];
 for(const file of files){const source=await readFile(new URL(file,import.meta.url),'utf8');for(const pattern of forbidden)assert.doesNotMatch(source,pattern,file);}
 // Scan every runtime server module, including newly added core/deploy modules. Browser modules
 // and site proof/fixture/CI tools have separate ownership and retain their existing checks above.
 const serverFiles=(await readdir(new URL('./',import.meta.url),{recursive:true})).filter(file=>file.endsWith('.mjs')&&!/(?:^|\/)(?:web|extensions|test|ci)\//.test(file)&&!/(?:\.test|\.browser|-fixture|-proof)\.mjs$/.test(file)&&!['flyingstars-adapter.mjs','pr5-compare.mjs'].includes(file));
 const domain=[/FlyingStars|flyingstars/i,/\b(?:SPARK|HORIZON|ODYSSEY)\b/,/\b(?:packageId|featureIds|memberIds|clientIds|assetId)\b/,/["'](?:page|package|screen|post|project|faq|client|team|media|site|translation)\//,/\^\((?:page|package|screen|post|project|faq|client|team)\|/,/t-outline|t-caps|data-card|cfg-field/,/['"](?:packages|clients|team|screens|siteContact|siteInquiry|siteNavigation|siteUi|pricing|logoBar|projectGrid|postList)['"]/ ,/\b(?:packageOwnership|sourceId)\b/];
 for(const file of serverFiles){
  let source=await readFile(new URL(file,import.meta.url),'utf8');
  // Only these composition roots may import the pilot adapter or its host compatibility constants. No body is exempt.
  if(['server.mjs','runtime-options.mjs','translate-missing.mjs','deploy/host-update.mjs'].includes(file))source=source.replace(/^(?:import|export).*from ['"][^'"]*(?:flyingstars-adapter|extensions\/flyingstars\/runtime-compatibility)\.mjs['"];?$/gm,'');
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

test('pure panel parity covers every real record type and every section branch',async t=>{
 const {records}=await recordFixtures(),before=JSON.parse(await readFile(new URL('./test/p6-panels-before.json',import.meta.url),'utf8'));
 // Intentional: overlay documents are internally managed lists, not comparison columns.
 for(const descriptor of before.translation.containers)if(descriptor.path.length===1&&descriptor.path[0]==='values')descriptor.array={reorderable:true,insertable:true,removable:true};
 const after=panelSnapshot(records);
 // Compare unordered sets; concrete paths and full dumps are captured separately in /tmp/cx12/p6.
 const canonical=value=>JSON.stringify(value,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort()):v);
 for(const model of Object.keys(before))for(const kind of Object.keys(before[model]))assert.deepEqual(after[model][kind].map(canonical).sort(),before[model][kind].map(canonical).sort(),model+'/'+kind);
 assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());
 t.diagnostic(`${records.length} records and variant fixtures; ${Object.keys(after).length} models; zero unexpected panel differences.`);
});

test('all site widget declarations are registered and every collection metadata tree validates',async()=>{
 const {site}=await recordFixtures();
 const walk=node=>{if(node['x-afe']?.widget)assert.ok(siteWidgets[node['x-afe'].widget],node['x-afe'].widget);if(node.properties)Object.values(node.properties).forEach(walk);if(node.element)walk(node.element);node.options?.forEach(walk);node.items?.forEach(walk);};
 for(const type of site.types)for(const schema of [type.schema,...Object.values(type.schemas||{})].filter(Boolean)){const description=schemaDescription(schema);assert.ok(description['x-afe']?.collection,type.prefix+' collection metadata, including extended Markdown schemas');walk(description);}
});

test('real saves reject metadata-forbidden array mutations and read-only fields without a commit',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'afe-meta-write-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await git(root,['clone','--quiet','--no-hardlinks',root,dir]);await git(dir,['checkout','-B','content/draft']);await symlink(await (await import('node:fs/promises')).realpath(root+'node_modules'),dir+'/node_modules');
 for(const folder of ['schemas','content','lib'])await cp(root+'src/'+folder,dir+'/src/'+folder,{recursive:true});
 await git(dir,['add','src']);await git(dir,['-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','metadata fixture']);
 const store=await new NativeStore(dir,{site:await createFlyingStarsAdapter(dir),remote:false}).init(),state=await store.state();
 const candidate=state.records.find(r=>r.data.sections?.some(s=>s.type==='comparison')),index=candidate.data.sections.findIndex(s=>s.type==='comparison'),section=candidate.data.sections[index];
 const edits=[{id:candidate.id,path:['sections',index,'columns'],value:[...section.columns].reverse()},{id:candidate.id,path:['sections',index,'rows',0,'values'],value:section.rows[0].values.slice(1)}];
 const formation=state.records.find(r=>r.data.showcase?.formation);edits.push({id:formation.id,path:[],value:{...formation.data,showcase:{...formation.data.showcase,formation:{...formation.data.showcase.formation,src:'/media/projekte/test/formation.json'}}}});
 for(const {id,path,value}of edits){const record=state.records.find(r=>r.id===id);await assert.rejects(store.save({expectedHead:state.head,requestId:randomUUID(),changes:[{id,expectedRevision:record.revision,patches:[{path,value}]}]}));assert.equal(await store.head(),state.head);}
});

// Exercise the browser's actual dispatch functions without a web server or DOM dependency.
test('browser dispatch resolves declared references and widgets, including compact tables',async()=>{
 const {records}=await recordFixtures(),source=await readFile(new URL('./web/editor.js',import.meta.url),'utf8');
 const describeRecord=item=>describe(item.schema,item.data,{omitPath:(data,path)=>omitRecordField(item,data,path)});
 const context={nodeAt,referencePrefix,referencedRecords,siteWidgets,records:()=>records,record:id=>records.find(r=>r.id===id),recordName:recordTitle,recordTemplate:()=>null,pushView:()=>{},inlinePlain:v=>v,getPath:(data,path)=>path.reduce((v,k)=>v?.[k],data)};
 const choices=runInNewContext(source.slice(source.indexOf('function choiceSource('),source.indexOf('// part: "all"'))+';choiceSource',context);
 let size='overview';
 const columns=runInNewContext(source.slice(source.indexOf('function tableColumns('),source.indexOf('// Complex entries'))+';tableColumns',{...context,value:(item,path)=>path.reduce((v,k)=>v?.[k],item.data),containersFor:item=>describeRecord(item).containers,fieldsFor:item=>describeRecord(item).fields,under:(path,prefix)=>prefix.every((part,i)=>path[i]===part),isTechnical,fieldLabel,$:()=>({dataset:{size}})});
 const expectedTables=JSON.parse(await readFile(new URL('./test/p6-tables-before.json',import.meta.url),'utf8'));
 let refs=0,features=0,tables=0,decisions=0;
 for(const record of records)for(const container of describeRecord(record).containers.filter(c=>c.kind==='array')){
  const result=choices(record,container);
  if(nodeAt(record.schema,record.data,[...container.path,0])?.['x-afe']?.reference){assert.ok(result?.options.length,record.id);refs++;}
  if(container['x-afe']?.widget==='flyingstars/package-features'){assert.ok(result?.options.length,record.id);features++;}
  if(columns(record,container))tables++;
  if(!record.id.startsWith('variant/')&&record.type!=='translation')for(size of ['overview','compact']){const key=record.id+'/'+JSON.stringify(container.path)+'/'+size;assert.equal(JSON.stringify(columns(record,container)),JSON.stringify(expectedTables[key]),key);decisions++;}
  size='overview';
 }
 assert.equal(decisions,Object.keys(expectedTables).length);
 assert.ok(refs>=3);assert.ok(features>=3);assert.ok(tables>=10);
 const staged={id:'client/new-client',schema:{'x-afe':{collection:{label:'Kunde',title:['name']}}},data:{name:'Neuer Kunde'}};
 assert.ok(referencedRecords([...records,staged],{collection:'clients',encoding:'id'}).includes(staged));
});

test('record titles retain the pilot presentation, including optional package names and singleton labels',async()=>{
 const site=await createFlyingStarsAdapter(root),files=(await readdir(root+'src/content',{recursive:true})).map(f=>'src/content/'+f);
 for(const source of site.sourcesFromFiles(files)){
  const data=wire(source.schema.parse(codecs[source.format].parse(await readFile(root+source.file))));
  const oldTitle=source.schemas&&source.schema.description||data.name||data.title||data.question||source.id;
  const expected=data.displayName||data.name||data.title||data.question||oldTitle;
  const schema=schemaDescription(source.schema),title=site.recordTitle(source,data)||recordTitle({schema,data,id:source.id});
  assert.equal(recordTitle({schema,data,title,id:source.id}),expected,source.id);
 }
});

test('block action controls and handlers honor the same metadata, including inherited read-only',async()=>{
 const source=await readFile(new URL('./web/editor.js',import.meta.url),'utf8');
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
 for(const file of await readdir(new URL('./web/',import.meta.url)))if(/\.m?js$/.test(file))execFileSync(process.execPath,['--check',fileURLToPath(new URL('./web/'+file,import.meta.url))],{stdio:'pipe'});
});
