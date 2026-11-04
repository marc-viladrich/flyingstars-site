import './test/register-browser-site.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {pages,record,records} from './test/design-data.mjs';
import {NativeDraft,sectionMutation} from 'astro-frontend-editor/web/native-draft.mjs';
import {localeProposals,applyLocaleProposals,keyedListChange} from './design/locale-review.mjs';
import {contentData,seedTranslation,sharedPaths} from '../src/i18n/transaction.mjs';
const draft=()=>{const d=new NativeDraft();d.reset(records);return d;};
test('Every real page projects shared fields without losing translated values',()=>{for(const source of pages.filter(r=>!/^page\/(en|nl)\//.test(r.id)))for(const locale of ['en','nl']){const target=record(source.id.replace('page/','page/'+locale+'/'));assert.deepEqual(seedTranslation(source.schema,source.data,target.data),contentData(target.data));}});
test('Shared URL change follows DE without any review command or evidence mutation',()=>{
 const d=draft(),before=structuredClone(d.get('page/en/index').data.translationEvidence);d.set('page/index',['sections',0,'cta','href'],'/kontakt/');const p=localeProposals(d);assert.equal(p.length,2);assert.ok(p.every(p=>!p.needed.length));applyLocaleProposals(d,p);assert.equal(d.get('page/en/index').data.sections[0].cta.href,'/kontakt/');assert.deepEqual(d.get('page/en/index').data.translationEvidence,before);assert.equal(d.get('page/en/index').data.translationReview,undefined);
});
test('Text review planning and suggestion edits leave the actual draft unchanged until acceptance',()=>{
 const d=draft();d.set('page/index',['title'],'Neuer Titel');const before=structuredClone([...d.local]),p=localeProposals(d);assert.ok(p.every(p=>p.needed.includes('/title')));p[0].data.title='Suggested English';assert.deepEqual([...d.local],before);applyLocaleProposals(d,p,{reviewed:true});assert.equal(d.get('page/en/index').data.title,'Suggested English');assert.equal(d.get('page/en/index').data.translationReview.length,1);
});
test('Repeated section types with reorder plus text change retain keyed target association',()=>{
 const d=draft(),source=d.get('page/index'),sections=structuredClone(source.data.sections),chosen=sections[0];sections.splice(0,1);sections.push(chosen);chosen.headline+=' Neu';d.set('page/index',['sections'],sections);const p=localeProposals(d);for(const item of p){assert.equal(item.data.sections.at(-1)._key,chosen._key);assert.equal(item.data.sections.at(-1).headline,record(item.id).data.sections[0].headline);assert.ok(item.needed.includes('/sections/@'+chosen._key+'/headline'));}
});
test('Source-only internal notes and structural IDs never request text review',()=>{const d=draft();d.set('page/index',['sections',0,'todo'],'Interne Notiz');assert.ok(localeProposals(d).every(p=>p.needed.length===0));});
test('List insertion/duplication renews identities recursively through the real site hook',()=>{const d=draft(),p=['sections',0,'words'],list=structuredClone(d.get('page/index').data.sections[0].words),key=list[0]._key;list.push(structuredClone(list[0]));assert.equal(keyedListChange('page/index',p,list,{draft:d}),true);assert.equal(d.get('page/index').data.sections[0].words[0]._key,key);assert.notEqual(d.get('page/index').data.sections[0].words.at(-1)._key,key);});
test('EN/NL shared controls are derived from field policy including nested media',()=>{const source=record('page/en/index'),paths=sharedPaths(source.schema,source.data).map(p=>p.join('.'));assert.ok(paths.includes('sections.0.cta.href'));assert.ok(paths.includes('sections.0.poster.src'));assert.ok(!paths.includes('sections.0.headline'));assert.ok(!paths.includes('sections.0.poster.alt'));});

test('Enabling an optional object renews keys in every newly created descendant list',()=>{
 const d=draft(),sample=structuredClone(d.get('page/index').data.sections[0].stats[0]),path=['sections',0,'stats'];d.set('page/index',path,undefined);keyedListChange('page/index',path,[sample,structuredClone(sample)],{draft:d});const next=d.get('page/index').data.sections[0].stats;assert.equal(new Set(next.map(v=>v._key)).size,2);assert.ok(next.every(v=>v._key!==sample._key));
});
