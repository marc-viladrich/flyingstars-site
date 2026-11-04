import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {navigatorGroups,matchesQuery,localeVersion} from 'astro-frontend-editor/web/content-navigator.mjs';
import {extensions} from 'astro-frontend-editor/web/site-adapter.mjs';
test('Every actual file owner including complete language files appears exactly once',()=>{const groups=navigatorGroups(records,{name:extensions.first.bind(extensions,'navigatorName')}),rows=groups.flatMap(g=>g.items);assert.deepEqual(rows.map(r=>r.id).sort(),records.map(r=>r.id).sort());for(const locale of ['EN','NL','DE'])assert.ok(rows.some(r=>r.title.endsWith(' · '+locale)));assert.deepEqual(groups.map(g=>g.type).sort(),[...new Set(records.map(r=>r.type))].sort());});
test('Search matches umlauts, type labels and actual locale addresses',()=>{assert.equal(matchesQuery(['Über uns'],'UBER'),true);assert.equal(matchesQuery(['Berlin Game'],'game berlin'),true);assert.deepEqual(navigatorGroups(records,{query:'does-not-exist'}),[]);const results=navigatorGroups(records,{query:'en/index'}).flatMap(g=>g.items);assert.equal(results.length,1);assert.equal(results[0].id,'page/en/index');});
test('Language names identify the actual file being opened',()=>{assert.equal(localeVersion('en'),'Englische Fassung');assert.equal(localeVersion('nl'),'Niederländische Fassung');});
