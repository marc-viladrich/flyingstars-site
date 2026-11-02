import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {inlineCodec} from './design/inline.mjs';
test('Current accent markup roundtrips exactly through the browser tree',()=>{const text='Eine *eigene Show* & mehr';assert.equal(inlineCodec.encode(inlineCodec.decode(text)),text);assert.equal(inlineCodec.plainText(text),'Eine eigene Show & mehr');assert.equal(inlineCodec.fromDOM({tag:'h1',children:[{text:'Eine '},{tag:'span',attributes:{class:'grad'},children:[{text:'eigene Show'}]},{text:' & mehr'}]}),text);});
test('Inline output escapes executable HTML and supports only the current accent spans',()=>{assert.equal(inlineCodec.html('<script>'),'&lt;script&gt;');assert.equal(inlineCodec.supportsDOM({tag:'span',children:[{text:'A'}]}),true);assert.equal(inlineCodec.supportsDOM({tag:'script',children:[]}),false);assert.match(inlineCodec.html('*Akzent*'),/class="grad"/);});
test('Every current headline is accepted by the codec without changing its stored bytes',()=>{for(const r of pages)for(const f of r.fields.filter(f=>f.path.at(-1)==='headline'&&typeof f.value==='string'))assert.equal(inlineCodec.encode(inlineCodec.decode(f.value)),f.value);});
