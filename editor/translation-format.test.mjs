// Step 10 acceptance for overlay translations (content format 2): tuple identity without collisions, keyed list
// items surviving a reorder outside the editor, editor changes carrying translations along in one undo step, and a
// migration whose second run is empty.
import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {NativeStore,git} from 'astro-frontend-editor/runtime';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {resolveRuntimeOptions} from './server.mjs';
import {NativeDraft} from 'astro-frontend-editor/web/native-draft.mjs';
import {translationStorage,translationId} from './extensions/flyingstars/web/translations.mjs';
import {translationIdFor} from './extensions/flyingstars/translations.mjs';
import {applyMigrations,planMigrations} from 'astro-frontend-editor/runtime';
import {localize} from '../src/lib/localize.mjs';
import {sha256} from 'astro-frontend-editor/content';

const here=path.dirname(fileURLToPath(import.meta.url));
const req=(state,extra)=>({expectedHead:state.head,requestId:randomUUID(),changes:[],creates:[],deletes:[],...extra});
async function clone(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'afe-translation-format-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await git(here,['clone','--quiet','--no-hardlinks',path.join(here,'..'),dir]);await git(dir,['checkout','-qB','content/draft']);
 await fs.symlink(await fs.realpath(path.join(here,'../node_modules')),path.join(dir,'node_modules'));
 return dir;
}
const storeAt=async dir=>new NativeStore(dir,{remote:false,site:await createFlyingStarsAdapter(dir),runtime:resolveRuntimeOptions({values:{siteRoot:dir}})}).init();

test('identity: owners that format 1 flattened to the same name get different translation records; a wrong name is refused',async t=>{
 assert.notEqual(translationIdFor('project/nfl-berlin-game','en'),translationIdFor('project/nfl/berlin-game','en'));
 assert.equal(translationId('project/nfl/berlin-game','en'),translationIdFor('project/nfl/berlin-game','en'));
 const store=await storeAt(await clone(t)),state=await store.state(),page=state.records.find(r=>r.id==='page/index'),existing=state.records.find(r=>r.id==='translation/page/index/en');
 const data={format:2,sourceId:page.id,locale:'en',sourceHash:page.revision,values:[{path:['title'],text:'Title',reviewed:false}]};
 const removed=await store.save(req(state,{deletes:[{id:existing.id,expectedRevision:existing.revision}]}));
 await assert.rejects(store.save(req(removed,{creates:[{id:'translation/page-index-en',data}]})),error=>error.status===400&&/translation\/page\/index\/en/.test(error.message));
 const saved=await store.save(req(removed,{creates:[{id:'translation/page/index/en',data}]}));
 assert.ok(saved.records.some(r=>r.id==='translation/page/index/en'));
});

test('a save stores list items by key, whatever form the browser sent',async t=>{
 const store=await storeAt(await clone(t)),state=await store.state(),page=state.records.find(r=>r.id==='page/index'),translation=state.records.find(r=>r.id==='translation/page/index/en');
 const index=page.data.sections.findIndex(s=>s.id==='ablauf'),text=page.data.sections[index].headline;
 const values=[...translation.data.values.filter(v=>JSON.stringify(v.path)!==JSON.stringify(['sections',{id:'ablauf'},'headline'])),{path:['sections',index,'headline'],text:'From process to landing',reviewed:true,sourceHash:sha256(text)}];
 const saved=await store.save(req(state,{changes:[{id:translation.id,expectedRevision:translation.revision,reviewedPaths:[['sections',index,'headline']],patches:[{path:['values'],value:values}]}]}));
 const stored=JSON.parse(await fs.readFile(path.join(store.root,'src/content/translations/page/index/en.json'),'utf8'));
 assert.ok(stored.values.some(v=>JSON.stringify(v.path)===JSON.stringify(['sections',{id:'ablauf'},'headline'])&&v.text==='From process to landing'));
 assert.ok(!stored.values.some(v=>JSON.stringify(v.path)===JSON.stringify(['sections',index,'headline'])));
 assert.equal(stored.format,2);
 assert.ok(saved.head);
});

test('keyed reorder outside the editor: a section moved in the source keeps its translation; position-only items fall back',()=>{
 const data={title:'Start',sections:[{type:'hero',headline:'Hallo'},{type:'pricing',id:'pakete',headline:'Preise'},{type:'steps',id:'ablauf',headline:'Ablauf'}]};
 const fields=[{path:['sections',0,'headline'],kind:'text','x-afe':{translatable:true}},{path:['sections',1,'headline'],kind:'text','x-afe':{translatable:true}},{path:['sections',2,'headline'],kind:'text','x-afe':{translatable:true}}];
 const value=(path,source,text)=>({path,text,reviewed:true,sourceHash:sha256(source)});
 const translation={sourceId:'page/x',locale:'en',values:[value(['sections',0,'headline'],'Hallo','Hello'),value(['sections',{id:'pakete'},'headline'],'Preise','Prices'),value(['sections',{id:'ablauf'},'headline'],'Ablauf','Process')]};
 // An agent's pull request swaps the two keyed sections in the YAML.
 const moved=structuredClone(data);[moved.sections[1],moved.sections[2]]=[moved.sections[2],moved.sections[1]];
 const fieldsMoved=fields.map(f=>({...f}));
 const result=localize({id:'page/x',data:moved,fields:fieldsMoved},'en',{translation});
 assert.deepEqual(result.data.sections.map(s=>s.headline),['Hello','Process','Prices']);
 // The unkeyed hero moved to the end: its stored position now names another section, whose text differs (fallback).
 const heroLast=structuredClone(data);heroLast.sections.push(heroLast.sections.shift());
 const fallback=localize({id:'page/x',data:heroLast,fields},'en',{translation});
 assert.deepEqual(fallback.data.sections.map(s=>s.headline),['Prices','Process','Hallo']);
 assert.deepEqual(fallback.localization.fallback,[['sections',2,'headline']]);
});

function draftWith(page,translation){
 const draft=new NativeDraft();
 draft.reset([page,translation]);
 draft.observe((id,before,after)=>translationStorage.follow(id,before,after,{records:()=>draft.records(),draft}));
 return draft;
}
test('editor changes carry translations along in the same undo step: move, insert, remove, nested list move',()=>{
 const page={id:'page/x',revision:'r',data:{sections:[{type:'hero',headline:'Hallo'},{type:'steps',id:'ablauf',headline:'Ablauf',steps:[{title:'Eins'},{title:'Zwei'}]},{type:'cta',headline:'Los'}]}};
 const v=(path,text)=>({path,text,reviewed:true,sourceHash:'x'});
 const translation={id:'translation/page/x/en',revision:'t',data:{format:2,sourceId:'page/x',locale:'en',sourceHash:'r',values:[v(['sections',0,'headline'],'Hello'),v(['sections',{id:'ablauf'},'steps',1,'title'],'Two'),v(['sections',2,'headline'],'Go')]}};
 const paths=draft=>draft.get(translation.id).data.values.map(value=>JSON.stringify(value.path));
 // Move the hero down (shell: sectionMutation 'down').
 let draft=draftWith(page,translation);
 const down=structuredClone(page.data.sections);[down[0],down[1]]=[down[1],down[0]];
 draft.set(page.id,['sections'],down);
 assert.deepEqual(paths(draft),[JSON.stringify(['sections',1,'headline']),JSON.stringify(['sections',{id:'ablauf'},'steps',1,'title']),JSON.stringify(['sections',2,'headline'])]);
 assert.equal(draft.history.length,1,'one undo step');
 draft.undo();
 assert.deepEqual(draft.get(translation.id).data.values,translation.data.values);
 assert.deepEqual(draft.get(page.id).data,page.data);
 // Insert before everything: positions shift, keys stay.
 draft=draftWith(page,translation);
 draft.set(page.id,['sections'],[{type:'text',headline:'Neu'},...structuredClone(page.data.sections)]);
 assert.deepEqual(paths(draft),[JSON.stringify(['sections',1,'headline']),JSON.stringify(['sections',{id:'ablauf'},'steps',1,'title']),JSON.stringify(['sections',3,'headline'])]);
 // Remove the hero: its translation goes with it.
 draft=draftWith(page,translation);
 draft.set(page.id,['sections'],structuredClone(page.data.sections).slice(1));
 assert.deepEqual(paths(draft),[JSON.stringify(['sections',{id:'ablauf'},'steps',1,'title']),JSON.stringify(['sections',1,'headline'])]);
 // Reorder the steps of the keyed section.
 draft=draftWith(page,translation);
 draft.set(page.id,['sections',1,'steps'],[{title:'Zwei'},{title:'Eins'}]);
 assert.deepEqual(paths(draft)[1],JSON.stringify(['sections',{id:'ablauf'},'steps',0,'title']));
 // Typing in a field changes no translation path and adds no extra undo step.
 draft=draftWith(page,translation);
 draft.set(page.id,['sections',0,'headline'],'Hallo!');
 assert.deepEqual(draft.get(translation.id).data.values,translation.data.values);
 assert.equal(draft.local.has(translation.id),false);
});

test('migration 1 → 2 on the real format-1 files: dry run, apply, second run empty; nothing dropped',async t=>{
 const dir=await clone(t);
 // The translations as they were before the migration commit.
 await fs.rm(path.join(dir,'src/content/translations'),{recursive:true});
 await git(dir,['checkout','3d6bbf7','--','src/content/translations']);
 const site=await createFlyingStarsAdapter(dir),before=await fs.readdir(path.join(dir,'src/content/translations'));
 const plans=await planMigrations({root:dir,site});
 assert.deepEqual(plans.map(plan=>plan.id),['translations-2']);
 assert.equal(plans[0].changes.filter(change=>change.after===null).length,before.length);
 assert.equal(await fs.readdir(path.join(dir,'src/content/translations')).then(files=>files.length),before.length,'a dry run writes nothing');
 const valuesBefore=(await Promise.all(before.map(file=>fs.readFile(path.join(dir,'src/content/translations',file),'utf8').then(JSON.parse)))).reduce((n,data)=>n+data.values.length,0);
 await applyMigrations({root:dir,plans});
 assert.deepEqual(await planMigrations({root:dir,site}),[],'second run is empty');
 const after=(await fs.readdir(path.join(dir,'src/content/translations'),{recursive:true})).filter(file=>file.endsWith('.json'));
 assert.equal(after.length,before.length);
 const migrated=await Promise.all(after.map(file=>fs.readFile(path.join(dir,'src/content/translations',file),'utf8').then(JSON.parse)));
 assert.equal(migrated.reduce((n,data)=>n+data.values.length,0),valuesBefore,'no value dropped');
 assert.ok(migrated.every(data=>data.format===2));
 // Same bytes as the migration committed in this repository.
 for(const file of after)assert.equal(await fs.readFile(path.join(dir,'src/content/translations',file),'utf8'),await fs.readFile(path.join(here,'../src/content/translations',file),'utf8'),file);
});

test('migration refuses two format-1 files for the same source and language',async t=>{
 const dir=await clone(t);
 await fs.rm(path.join(dir,'src/content/translations'),{recursive:true});
 await git(dir,['checkout','3d6bbf7','--','src/content/translations']);
 const original=path.join(dir,'src/content/translations/page-index-en.json');
 await fs.copyFile(original,path.join(dir,'src/content/translations/page-index-en-copy.json'));
 await assert.rejects(planMigrations({root:dir,site:await createFlyingStarsAdapter(dir)}),/Zwei Übersetzungsdateien für page\/index \(en\)/);
});
