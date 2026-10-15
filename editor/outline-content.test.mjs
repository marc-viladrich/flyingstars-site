import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {codecs} from './core/codecs.mjs';
import {sha256,localize} from '../src/lib/localize.mjs';
import {inlineHtml} from '../src/lib/inline-text.mjs';

test('outlined project titles and sustainability heading retain fresh EN/NL marks without promoting review',async()=>{
  const root=new URL('../src/content/',import.meta.url);
  const sources=[];
  for(const file of await fs.readdir(new URL('projects/',root))) {
    if(!file.endsWith('.md'))continue;
    const data=codecs.markdown.parse(await fs.readFile(new URL('projects/'+file,root)));
    if(data.showcase)sources.push({id:'project/'+file.slice(0,-3),data,path:['showcase','titleLines',1]});
  }
  const data=codecs.yaml.parse(await fs.readFile(new URL('pages/index.yaml',root)));
  sources.push({id:'page/index',data,path:['sections',data.sections.findIndex(s=>s.type==='sustainability'),'lines',1]});
  assert.equal(sources.length,5);
  for(const {id,data,path}of sources){
    const source=path.reduce((v,k)=>v[k],data);
    assert.match(inlineHtml(source),/^<span class="t-outline">[^]*<\/span>$/);
    for(const locale of ['en','nl']){
      const translation=JSON.parse(await fs.readFile(new URL('translations/'+id.replace('/','-')+'-'+locale+'.json',root)));
      const entry=translation.values.find(value=>JSON.stringify(value.path)===JSON.stringify(path));
      assert.ok(entry,id+' '+locale);
      assert.equal(entry.sourceHash,sha256(source));
      assert.match(entry.text,/^\{o\}[^]*\{\/o\}$/);
      const record={id,data,fields:[{path,kind:'text', 'x-afe': {translatable:true},format:'inline'}]};
      const edited=localize(record,locale,{editor:true,translation});
      assert.equal(path.reduce((v,k)=>v[k],edited.data),entry.text);
      if(!entry.reviewed){
        const published=localize(record,locale,{translation});
        assert.equal(path.reduce((v,k)=>v[k],published.data),source);
      }
    }
  }
  // The fact's separate value-and-unit presentation is intentionally not migrated.
  assert.ok(data.sections.find(s=>s.type==='sustainability').facts.some(f=>f.tone==='o'));
});
