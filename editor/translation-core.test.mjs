import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {localeTransactions} from './design/locale-transactions.mjs';
import {synchronize} from './design/locale-review.mjs';
test('Locale write policy rejects German-only changes and direct executable URLs',()=>{const policy=localeTransactions(root,site.sourceFor);assert.throws(()=>policy.prepareTransaction({seen:new Set(['page/index']),nextRecords:records,changes:[]}),/page\/en\/index, page\/nl\/index/);assert.throws(()=>policy.validateWrite({}, {},{href:'javascript:alert(1)'}),/Ausführbare/);});
test('Numbers, booleans and list structure use the source while translated prose remains editable',()=>{const before={text:'Alt',enabled:true,n:1,items:['A','B']},after={text:'Neu',enabled:false,n:2,items:['B']};assert.deepEqual(synchronize(before,after,{text:'English',enabled:true,n:1,items:['EN A','EN B']}),{text:'English',enabled:false,n:2,items:['EN B']});});
test('Review freshness uses codec output bytes including comments, not a JSON digest of field values',()=>{const base=record('page/index'),targets=['en','nl'].map(l=>record('page/'+l+'/index'));const out=localeTransactions(root,site.sourceFor).prepareTransaction({seen:new Set([base.id,...targets.map(r=>r.id)]),nextRecords:records,changes:[]});assert.equal(out.length,2);for(const p of out)assert.equal(p.data.translationSourceHash,targets[0].data.translationSourceHash);});
