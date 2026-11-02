import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {inlineHtml,inlinePlain} from './design/inline.mjs';
test('Current accent strings render the supported gradient spans in every actual language file',()=>{let count=0;for(const r of pages)for(const f of r.fields.filter(f=>typeof f.value==='string'&&f.path.at(-1)==='headline')){const html=inlineHtml(f.value);if(/\*[^*]+\*/.test(f.value)){count++;assert.match(html,/class="grad"/);}assert.equal(inlinePlain(f.value),f.value.replace(/\*([^*]+)\*/g,'$1'));}assert.ok(count>10);});
test('The active codec does not reinterpret historical contour and capitals delimiters',()=>{assert.equal(inlineHtml('{o}Alt{/o}'),'{o}Alt{/o}');assert.equal(inlinePlain('{c}ALT{/c}'),'{c}ALT{/c}');});
