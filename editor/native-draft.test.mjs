import test from 'node:test';import assert from 'node:assert/strict';import {NativeDraft,sectionMutation} from './web/native-draft.mjs';
const records=[{id:'page/index',revision:'a',data:{sections:[{type:'text',headline:'A'},{type:'text',headline:'B'}],title:'Home'}}];
test('nested staged values survive structural mutation and produce one authoritative root patch',()=>{const d=new NativeDraft();d.reset(records);d.set('page/index',['sections',0,'headline'],'Edited');d.set('page/index',['sections'],sectionMutation(d.get('page/index').data.sections,0,'down'));const request=d.request('head','uuid');assert.equal(request.changes.length,1);assert.deepEqual(request.changes[0].patches[0].path,[]);assert.equal(request.changes[0].patches[0].value.sections[1].headline,'Edited');assert.equal(records[0].data.sections[0].headline,'A');d.undo();assert.equal(d.get('page/index').data.sections[0].headline,'Edited');});
test('create, references and deletion stay in one batch; discard and undo restore actual snapshot',()=>{const d=new NativeDraft();d.reset(records);d.create({id:'client/new',data:{name:'New'}});d.set('page/index',['sections',0,'clientIds'],['new']);assert.equal(d.request('head','id').creates.length,1);d.remove('client/new');assert.equal(d.request('head','id').creates.length,0);assert.equal(d.request('head','id').deletes.length,0);d.undo();assert.equal(d.get('client/new').data.name,'New');d.discard();assert.equal(d.size,0);assert.deepEqual(d.get('page/index'),records[0]);});

test('insert and duplicate never duplicate native section anchor ids',()=>{const sections=[{type:'cta',id:'kontakt'}];const duplicated=sectionMutation(sections,0,'duplicate');assert.equal(duplicated[1].id,'kontakt-kopie');const inserted=sectionMutation(duplicated,1,'insert',sections[0]);assert.equal(inserted[1].id,'kontakt-kopie-2');assert.equal(new Set(inserted.map(s=>s.id)).size,3);});

import {newRecordData} from './web/native-draft.mjs';
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
