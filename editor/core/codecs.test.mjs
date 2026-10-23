import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {codecs,json,yaml,markdown} from 'astro-frontend-editor/runtime/extensions';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const lab=path.resolve(site,'../../../../../editor-lab');
async function files(root){return (await readdir(root,{recursive:true})).filter(file=>/\.(json|ya?ml|md)$/.test(file)).sort();}
const codecFor=file=>codecs[/\.json$/.test(file)?'json':/\.md$/.test(file)?'markdown':'yaml'];
for(const [name,root,inventory]of [
  ['worktree',path.join(site,'src/content'),null],
  ['bakery',path.join(lab,'site-a-baeckerei/src/content'),['categories.yaml']],
  ['physio',path.join(lab,'site-b-physio/src/content'),null],
])test(name+': every real source has a byte-identical no-op roundtrip',async t=>{
  const entries=(inventory??await files(root)).filter(file=>name!=='physio'||/\.(ya?ml|md)$/.test(file));
  assert.ok(entries.length);
  for(const file of entries)await t.test(file,async()=>{
    const full=path.join(root,file),before=await readFile(full),codec=codecFor(file),data=codec.parse(before);
    assert.deepEqual(codec.update(before,[],data),before);
    assert.deepEqual(await readFile(full),before);
  });
});

for(const [name,source,path,value,expected]of [
  ['json','{\r\n "alpha": { "title" : "Alt", "n": 1 },\r\n "beta": {"title":"Keep"}\r\n}\r\n',['alpha','title'],'Grüße','{\r\n "alpha": { "title" : "Grüße", "n": 1 },\r\n "beta": {"title":"Keep"}\r\n}\r\n'],
  ['yaml','# file\r\nalpha:\r\n  title: Alt # inline\r\n  n: 1\r\n# sibling\r\nbeta:\r\n  title: Keep\r\n',['alpha','title'],'Grüße','# file\r\nalpha:\r\n  title: Grüße # inline\r\n  n: 1\r\n# sibling\r\nbeta:\r\n  title: Keep\r\n'],
  ['yaml','bread:\n  name: { de: Brote, en: Bread } # unchanged\nother: ok\n',['bread','name','de'],'Brot','bread:\n  name: { de: Brot, en: Bread } # unchanged\nother: ok\n'],
  ['markdown','---\r\n# metadata\r\ntitle: Alt # inline\r\ndate: 2026-10-12\r\n---\r\n\nBody  \r\n\r\n',['title'],'Neu','---\r\n# metadata\r\ntitle: Neu # inline\r\ndate: 2026-10-12\r\n---\r\n\nBody  \r\n\r\n'],
  ['markdown','---\ntitle: Same\n---\n\nOld\n',['body'],'\nNew  \n\n','---\ntitle: Same\n---\n\nNew  \n\n'],
])test(name+': single field changes exactly its lexical span '+JSON.stringify(path),()=>{
  assert.equal(codecs[name].update(source,path,value),expected);
});

for(const source of ['a: &anchor 1\nb: *anchor\n','a: *missing\n','a:\n  <<: {b: 2}\n','{ a: 1 }\n','[a,b]\n','a: 1\na: 2\n','a:\n  b: 1\n  b: 2\n','a: !custom x\n','? [a,b]\n: value\n'])test('AFE105 rejects unsupported YAML '+JSON.stringify(source),()=>{
  assert.throws(()=>yaml.parse(source),error=>error.code==='AFE105'&&error.message.startsWith('AFE105:'));
});
test('quoted YAML syntax is data, not an anchor/alias/merge',()=>assert.deepEqual(yaml.parse('text: "&anchor *alias <<: literal"\n'),{text:'&anchor *alias <<: literal'}));
for(const source of ['{"a":1,"a":2}','{"a":{"x":1,"x":2}}','[{"id":"a","id":"b"}]'])test('duplicate JSON keys are rejected '+source,()=>assert.throws(()=>json.parse(source),/Doppelter JSON-Schlüssel/));
test('Markdown flow frontmatter remains writable without reformatting adjacent fields',()=>{
  const source='---\n{ "title": "Alt", "date": "2026-10-12" }\n---\nBody\n';
  assert.equal(markdown.update(source,['title'],'Neu'),source.replace('"Alt"','"Neu"'));
});
test('root replacement reconciles only changed members',()=>{
  const source='# leading\na: old # inline\nb: keep\n';
  assert.equal(yaml.update(source,[],{a:'new',b:'keep'}),source.replace('old','new'));
});
test('block scalar update preserves unrelated trailing bytes and reparses the exact value',()=>{
  const source='a: |-\n  old\n  lines\nb: keep # comment\n',value='new\nwith\nlines\n';
  const updated=yaml.update(source,['a'],value);
  assert.equal(updated,'a: '+JSON.stringify(value)+'\nb: keep # comment\n');
  assert.equal(yaml.parse(updated).a,value);
});
test('unsafe paths and invalid UTF-8 fail before editing',()=>{
  for(const codec of Object.values(codecs))assert.throws(()=>codec.update('a: 1\n',['__proto__','x'],1),/Feldpfad/);
  assert.throws(()=>yaml.parse(Buffer.from([0xff])),/UTF-8/);
});
for(const codec of [json,yaml])test((codec===json?'JSON':'YAML')+' optional fields and nested absent objects roundtrip',()=>{
  const source=codec===json?'{"keep":1}\n':'# keep\nkeep: 1\n';
  const added=codec.update(source,['optional'],{quote:'Hallo',person:'Özlem'});
  assert.equal(codec.parse(added).optional.person,'Özlem');
  assert.deepEqual(codec.parse(codec.update(added,['optional'],undefined)),{keep:1});
  assert.deepEqual(codec.parse(codec.update(source,['a','b','c'],42)),{keep:1,a:{b:{c:42}}});
});
test('YAML empty scalars and scalar-to-collection replacements keep separators',()=>{
  for(const [source,expected]of [['a:\nb: keep\n','a: new\nb: keep\n'],['a: # null\nb: keep\n','a: new # null\nb: keep\n']])assert.equal(yaml.update(source,['a'],'new'),expected);
  assert.deepEqual(yaml.parse(yaml.update('a: old\nb: keep\n',['a'],['new','list'])),{a:['new','list'],b:'keep'});
});
test('removing the last nested member retains an empty object or array',()=>{
  assert.deepEqual(yaml.parse(yaml.update('a:\n  only: value\nb: keep\n',['a','only'],undefined)),{a:{},b:'keep'});
  assert.deepEqual(yaml.parse(yaml.update('a:\n  - value\nb: keep\n',['a',0],undefined)),{a:[],b:'keep'});
});
test('replacing arrays of differently shaped records remains semantically exact',()=>{
  const source='sections:\n  - type: alpha\n    columns: 2\n  - type: beta\n    columns:\n      - A\n      - B\nkeep: original # comment\n';
  const raw=yaml.parse(source);raw.sections.reverse();const updated=yaml.update(source,['sections'],raw.sections);
  assert.deepEqual(yaml.parse(updated),raw);assert.ok(updated.endsWith('keep: original # comment\n'));
});
test('block scalar header comments survive a field edit byte for byte',()=>{
  const source='a: |-   # keep this comment\n  old\nb: keep\n';
  assert.equal(yaml.update(source,['a'],'new'),'a: "new"   # keep this comment\nb: keep\n');
});
test('YAML moves keep leading item comments with their entry, including a missing final newline',()=>{
  const source='# file\n- id: a\n  title: A\n# second\n- id: b\n  title: B';
  assert.equal(yaml.move(source,[],1,0),'# file\n# second\n- id: b\n  title: B\n- id: a\n  title: A');
  assert.deepEqual(yaml.parse(yaml.update('a:\n  - -1\n  - -2\nb: keep\n',['a',0],undefined)),{a:[-2],b:'keep'});
});
for(const [name,codec,source]of [['json',json,'{"keep":1}\n'],['yaml',yaml,'keep: 1\n']])test(name+': missing unsets are no-ops and absent arrays are constructed from numeric paths',()=>{
  assert.equal(codec.update(source,['absent','child'],undefined),source);
  assert.deepEqual(codec.parse(codec.update(source,['a',0,'b'],'new')),{keep:1,a:[{b:'new'}]});
  assert.throws(()=>codec.update(source,['a',1,'b'],'new'),/Lücken/);
});

test('YAML: a replaced unquoted string stays unquoted only when it reads back as the same string',()=>{
  const at=(source,value)=>yaml.update(source,['a'],value);
  assert.equal(at('a: Alt # c\n','Neu'),'a: Neu # c\n');
  for(const [value,written] of [['true','"true"'],['12','"12"'],['a: b','"a: b"'],['x # y','"x # y"'],['eins, zwei','"eins, zwei"'],['- dash','"- dash"'],['',  '""']])assert.equal(at('a: Alt\n',value),'a: '+written+'\n',value);
  assert.equal(at('a: "Alt"\n','Neu'),'a: "Neu"\n','a quoted original keeps its quotes');
  for(const value of ['Neu','true','eins, zwei','x # y','- dash',''])assert.equal(yaml.parse(at('a: Alt\n',value)).a,value);
});
