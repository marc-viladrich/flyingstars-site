import './test/register-browser-site.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {NativeDraft,sectionMutation} from 'astro-frontend-editor/web/native-draft.mjs';
const records=[{id:'page/index',revision:'a',data:{sections:[{type:'text',headline:'A'},{type:'text',headline:'B'}],title:'Home'}}];
test('nested staged values survive structural mutation; the list write covers the edited entry',()=>{const d=new NativeDraft();d.reset(records);d.set('page/index',['sections',0,'headline'],'Edited');d.set('page/index',['sections'],sectionMutation(d.get('page/index').data.sections,0,'down'));const request=d.request('head','uuid');assert.equal(request.changes.length,1);assert.deepEqual(request.changes[0].patches.map(p=>p.path),[['sections']]);assert.equal(request.changes[0].patches[0].value[1].headline,'Edited');assert.equal(records[0].data.sections[0].headline,'A');d.undo();assert.equal(d.get('page/index').data.sections[0].headline,'Edited');});
test('create, references and deletion stay in one batch; discard and undo restore actual snapshot',()=>{const d=new NativeDraft();d.reset(records);d.create({id:'client/new',data:{name:'New'}});d.set('page/index',['sections',0,'clientIds'],['new']);assert.equal(d.request('head','id').creates.length,1);d.remove('client/new');assert.equal(d.request('head','id').creates.length,0);assert.equal(d.request('head','id').deletes.length,0);d.undo();assert.equal(d.get('client/new').data.name,'New');d.discard();assert.equal(d.size,0);assert.deepEqual(d.get('page/index'),records[0]);});

test('insert and duplicate never duplicate native section anchor ids',()=>{const sections=[{type:'cta',id:'kontakt'}];const duplicated=sectionMutation(sections,0,'duplicate');assert.equal(duplicated[1].id,'kontakt-kopie');const inserted=sectionMutation(duplicated,1,'insert',sections[0]);assert.equal(inserted[1].id,'kontakt-kopie-2');assert.equal(new Set(inserted.map(s=>s.id)).size,3);});

import {newRecordData} from 'astro-frontend-editor/web/native-draft.mjs';
test('new records never inherit real customer identities, provenance or published project facts',()=>{const original={title:'Old',name:'Old',role:'Chief',sourceIssue:99,body:'Real facts',date:'2020-01-01',draft:false,client:'Actual customer',location:'Actual place',cover:{src:'photo'},showcase:{facts:'real'},featured:true};const project=newRecordData('project/',original,'New',{today:'2026-10-13'});assert.equal(project.draft,true);assert.equal(project.date,'2026-10-13');for(const key of ['sourceIssue','client','location','cover','showcase'])assert.ok(!(key in project));assert.equal(project.featured,false);const team=newRecordData('team/',original,'Person');assert.equal(team.role,'Rolle ergänzen');const page=newRecordData('page/',{...original,sections:[{type:'metrics',facts:'real'}]},'New');assert.deepEqual(page.sections.map(s=>s.type),['hero','textMedia']);assert.equal(original.sourceIssue,99);});

test('a grouped change is one undo step and leaves no changed record behind', () => {
  const draft = new NativeDraft();
  draft.reset([{ id: 'site/contact', revision: 'r', data: { phone: { value: '0209 1', href: 'tel:+492091' } } }]);
  draft.group(() => {
    draft.set('site/contact', ['phone', 'value'], '0209 2');
    draft.set('site/contact', ['phone', 'href'], 'tel:+492092');
  });
  assert.equal(draft.history.length, 1);
  assert.equal(draft.size, 1);
  draft.undo();
  assert.equal(draft.size, 0);
  assert.equal(draft.get('site/contact').data.phone.href, 'tel:+492091');
});

test('a save writes only the edited fields, never schema defaults the browser record carries',()=>{
 const d=new NativeDraft();
 // The browser holds schema-parsed data: mediaSide and noindex are defaults absent from the source file.
 d.reset([{id:'pages/kurse',revision:'r',data:{title:'Kurse',noindex:false,sections:[{type:'schedule',days:[{sessions:[{room:'A',start:'09:00'}]}]},{type:'textMedia',mediaSide:'right'}]}}]);
 d.set('pages/kurse',['sections',0,'days',0,'sessions',0,'room'],'B');
 d.set('pages/kurse',['title'],'Kurse neu');d.set('pages/kurse',['title'],'Kurse');
 const [change]=d.request('head','id').changes;
 assert.deepEqual(change.patches,[{path:['sections',0,'days',0,'sessions',0,'room'],value:'B'}],'one leaf patch; a value set back is no change');
 d.set('pages/kurse',['sections',0,'days'],[{sessions:[]}]);
 assert.deepEqual(d.request('head','id').changes[0].patches.map(p=>p.path),[['sections',0,'days']],'an ancestor write covers its edited descendants');
 d.undo();assert.deepEqual(d.request('head','id').changes[0].patches.map(p=>p.path),[['sections',0,'days',0,'sessions',0,'room']],'undo restores the edited paths');
 d.set('pages/kurse',['sections',0,'days',0,'sessions',0,'room'],'A');assert.equal(d.request('head','id').changes.length,0);
 d.set('pages/kurse',['sections',0,'days',0,'sessions',0,'start'],undefined);
 const [removal]=d.request('head','id').changes[0].patches;assert.deepEqual(removal.path,['sections',0,'days',0,'sessions',0,'start']);assert.equal(removal.value,undefined);
});
