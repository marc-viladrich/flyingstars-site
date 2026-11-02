import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {incomingReferences} from 'astro-frontend-editor/web/linked-records.mjs';
import {referenceFields} from 'astro-frontend-editor/runtime/extensions';
import {resolveReference} from 'astro-frontend-editor/web/site-adapter.mjs';
test('Actual landing-page project references come from the shared Zod metadata',()=>{let count=0;for(const owner of pages)for(const f of referenceFields(owner.schema,owner.data)){const target=resolveReference(records,f.value,f.reference);assert.ok(target,owner.id+f.value);assert.ok(incomingReferences(records,target).some(link=>link.owner.id===owner.id&&link.paths.some(p=>JSON.stringify(p)===JSON.stringify(f.path))));count++;}assert.ok(count>5);});
test('New schema-declared references resolve without an adapter field-name list',()=>{const target={id:'project/demo',address:{collection:'projects',id:'demo'},data:{},schema:{kind:'object',properties:{}}},owner={id:'page/demo',data:{anyName:'demo'},schema:{kind:'object',properties:{anyName:{kind:'text','x-afe':{reference:{collection:'projects',encoding:'id'}}}}}};assert.deepEqual(incomingReferences([owner,target],target).map(l=>l.paths),[[['anyName']]]);});
