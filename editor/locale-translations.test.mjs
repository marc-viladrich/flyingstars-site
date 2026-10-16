// Step 10: the two translation modes that live in the site's own content (language records, language containers),
// through the same planning, machine translation and merge as overlays.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocaleTranslations} from './core/locale-translations.mjs';
import {plan,executeBatched} from './translation-core.mjs';
import {translationProvider} from './translation-providers.mjs';
import {NativeDraft} from './web/native-draft.mjs';
import {contentTranslations} from './web/content-translations.mjs';

const records={i18n:{mode:'records',key:['key'],locale:['locale']}},fields={i18n:{mode:'fields',containers:[['name'],['description']]}};
const schema=i18n=>({'x-afe':{collection:{label:'x',i18n}}});
const text=(path,translatable=true)=>({path,kind:'text','x-afe':translatable?{translatable:true}:{}});
const product=(id,locale,data)=>({id,revision:id+'-r',schema:schema(records.i18n),fields:[text(['name']),text(['description']),text(['key'],false)],data:{key:id.split('/')[1].split('.')[0],locale,...data}});
const category=(id,data)=>({id,revision:id+'-r',schema:schema(fields.i18n),fields:[],data});
const site=()=>[
 product('products/roggen.de','de',{name:'Roggenbrot',description:'Kräftig'}),
 product('products/roggen.en','en',{name:'Rye bread',description:''}),
 product('products/zopf.de','de',{name:'Hefezopf',description:'Süß'}),
 category('categories/bread',{name:{de:'Brote',en:'Bread'},description:{de:'Lange Teigruhe',en:''}}),
];
const storage=createLocaleTranslations({source:'de'});
const memory=()=>({entries:{}});
const options={translatableFields:()=>[],translationStorage:storage};

test('language records: the empty field of an existing English record is planned; a present one counts as current; a missing record is reported',()=>{
 const planned=plan({records:site(),locale:'en',memory:memory(),source:'de'},options);
 assert.deepEqual(planned.jobs.map(job=>[job.ownerId,JSON.stringify(job.path)]).sort(),[['categories/bread','["description","de"]'],['products/roggen.de','["description"]']]);
 assert.deepEqual(planned.missingRecords,['products/zopf.de']);
 assert.equal(storage.isOwner(site()[1]),false,'the English record is a target, not a source');
});

test('machine results become field patches of the English record and of the language container; the draft takes them as edits',async()=>{
 const all=site(),planned=plan({records:all,locale:'en',memory:memory(),source:'de'},options);
 const result=await executeBatched(planned,translationProvider('fake',{}),{memory:memory(),maxChars:3000,budgetChars:100000});
 const items=storage.merge({records:all,locale:'en',values:result.values});
 const byId=Object.fromEntries(items.map(item=>[item.id,item]));
 assert.deepEqual(byId['products/roggen.en'].patches.map(patch=>JSON.stringify(patch.path)),['["description"]']);
 assert.equal(byId['products/roggen.en'].expectedRevision,'products/roggen.en-r');
 assert.deepEqual(byId['categories/bread'].patches.map(patch=>JSON.stringify(patch.path)),['["description","en"]']);
 assert.ok(byId['products/roggen.en'].patches[0].value.length>0);
 // Browser: the patches are ordinary draft edits (one undo step), saved like any field.
 const draft=new NativeDraft();draft.reset(all);
 contentTranslations.merge(items,null,{draft});
 assert.equal(draft.get('products/roggen.en').data.description,byId['products/roggen.en'].patches[0].value);
 assert.equal(draft.get('categories/bread').data.description.en,byId['categories/bread'].patches[0].value);
 assert.equal(draft.get('categories/bread').data.description.de,'Lange Teigruhe');
 assert.deepEqual(draft.request('a'.repeat(40),'x').changes.map(change=>[change.id,change.patches.map(patch=>JSON.stringify(patch.path))]).sort(),[['categories/bread',['["description","en"]']],['products/roggen.en',['["description"]']]]);
 assert.equal(draft.history.length,1);
 // Once filled, nothing is left to translate.
 const again=plan({records:draft.records(),locale:'en',memory:memory(),source:'de'},options);
 assert.equal(again.jobs.length,0);
});

test('the default browser storage has no translation records and refuses overlay writes with a hint',()=>{
 assert.equal(contentTranslations.isRecord({id:'translation/x'}),false);
 assert.deepEqual(contentTranslations.overlay([],'en'),[]);
 assert.throws(()=>contentTranslations.write({}),/direkt auf der Seite dieser Sprache/);
});
