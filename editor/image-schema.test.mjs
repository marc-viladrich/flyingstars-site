import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {z} from 'astro/zod';
import {fileURLToPath} from 'node:url';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {describeSchema,schemaDescription,selectedSchema} from './native-schema.mjs';
import {describe} from './web/native-schema.mjs';
import {codecs,atPath} from './core/codecs.mjs';
import {sourceMediaSources} from './web/view-state.mjs';

const root = fileURLToPath(new URL('../',import.meta.url));
const key = path => JSON.stringify(path);
const editorSource = await fs.readFile(new URL('./web/editor.js',import.meta.url),'utf8');
const classifier = editorSource.slice(editorSource.indexOf('function isMediaContainer('),editorSource.indexOf('// Builds the "Inhalt"'));
const isImage = runInNewContext(classifier+';isMediaContainer',{});

function declaredImages(schema,data,path=[],out=[]) {
  const node=selectedSchema(schema,data);
  if ((schema.meta?.()?.format ?? node.meta?.()?.format)==='image') out.push(key(path));
  if(node._def.type==='object') for(const [name,child]of Object.entries(node.shape)) declaredImages(child,data?.[name],[...path,name],out);
  if(node._def.type==='array') for(const [i,value]of (data||[]).entries()) declaredImages(node.element,value,[...path,i],out);
  return out;
}

test('image controls match schema declarations in both directions across every real content record',async t=>{
  const adapter=await createFlyingStarsAdapter(root);
  const files=(await fs.readdir(new URL('../src/content/',import.meta.url),{recursive:true})).map(file=>'src/content/'+file);
  let records=0,images=0;
  for(const source of adapter.sourcesFromFiles(files)) {
    const bytes=await fs.readFile(root+source.file),data=source.schema.parse(codecs[source.format].parse(bytes));
    const expected=declaredImages(source.schema,data).sort();
    const server=describeSchema(source.schema,data),browser=describe(schemaDescription(source.schema),data);
    for(const description of [server,browser]) {
      const actual=description.containers.filter(container=>isImage({data},container)).map(c=>key(c.path)).sort();
      assert.deepEqual(actual,expected,source.id);
    }
    const tracked=Object.keys(sourceMediaSources([{id:source.id,data,schema:schemaDescription(source.schema)}])).map(key=>key.slice(source.id.length+1)).sort();
    assert.deepEqual(tracked,expected.filter(key=>atPath(data,JSON.parse(key))),source.id+' source media snapshot');
    records++;images+=expected.length;
  }
  assert.ok(records>30);assert.ok(images>30);
  t.diagnostic(`${records} records; ${images} declared image locations, including absent optional images.`);
});

test('image metadata works without src, dimensions or assets; src-shaped objects stay ordinary groups',()=>{
  for(const present of [true,false]) {
    const schema=z.object({photo:z.object({alt:z.string()}).meta({format:'image'}).optional(),formation:z.object({src:z.string(),width:z.number(),height:z.number()})});
    const data={...(present?{photo:{alt:'Bild'}}:{}),formation:{src:'/media/projekte/nfl/formation.json',width:10,height:20}};
    for(const description of [describeSchema(schema,data),describe(schemaDescription(schema),data)]) {
      const photo=description.containers.find(c=>c.path[0]==='photo');
      if(photo)assert.equal(isImage({},photo),true);
      assert.equal(isImage({},description.containers.find(c=>c.path[0]==='formation')),false);
      if(!present)assert.equal(description.optionalFields.find(c=>c.path[0]==='photo').format,'image');
    }
  }
  const checks=[...editorSource.matchAll(/const isImage = ([^;]+);/g)];
  // Every image decision in the editor reads the schema's format, wherever it is made (no src guessing).
  assert.ok(checks.length>=2);
  for(const [,expression]of checks) {
    const classify=runInNewContext('(optional,c)=>'+expression);
    assert.equal(classify({format:'image'}),true);
    assert.equal(classify({template:{src:'not-an-image'}}),false);
  }
});

test('formation is a named ordinary group with protected JSON source and editable copy',async()=>{
  const {projectShowcaseSchema}=await import('../src/schemas/project-showcase.mjs');
  const {readOnlyPaths}=await import('./native-store.mjs');
  const schema=z.object({formation:projectShowcaseSchema.shape.formation});
  const data={formation:{src:'/media/projekte/nfl/formation.json',title:'Das Hufeisen',text:'Vorbereitete Formation'}};
  const serialized=schemaDescription(schema),group=serialized.properties.formation;
  assert.equal(group.label,'Interaktive Drohnenformation');
  assert.equal(group.help,'Animation aus vorbereiteten Drohnenpositionen.');
  assert.match(group.hint,/ein Bild-Upload erzeugt keine Formation/);
  assert.equal(group.format,undefined);
  assert.equal(group.properties.src.readOnly,true);
  assert.equal(group.properties.src.advanced,true);
  assert.deepEqual(readOnlyPaths({schema,prefix:'project'},data),[['formation','src']]);
  const browser=describe(serialized,data);
  assert.deepEqual(browser.fields.map(field=>field.path.at(-1)),['src','title','text']);
  assert.equal(browser.fields[0].readOnly,true);
  assert.equal(browser.fields[0].advanced,true);
  assert.ok(describe(serialized,data,{readOnlyPaths:[['formation','src']]}).fields.some(field=>field.readOnly));
});
