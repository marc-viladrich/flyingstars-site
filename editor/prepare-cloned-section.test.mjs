import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {uniqueSection,synchronize} from './design/locale-review.mjs';
import {sectionMutation,NativeDraft} from 'astro-frontend-editor/web/native-draft.mjs';
test('Duplicate sections receive an unused anchor from the actual existing list',()=>{const sections=[{type:'hero',id:'intro',headline:'Hallo'},{type:'hero',id:'intro-kopie',headline:'Kopie'}];const result=sectionMutation(sections,0,'duplicate');assert.equal(result[1].id,'intro-kopie-2');assert.deepEqual(sections[0],{type:'hero',id:'intro',headline:'Hallo'});});
test('A clone without an anchor retains all data and introduces no parallel package or media owner',()=>{const data=record('page/index').data.sections[0],clone=uniqueSection(structuredClone(data),[data]);assert.deepEqual(clone,data);assert.equal(Object.hasOwn(clone,'packageId'),false);});
