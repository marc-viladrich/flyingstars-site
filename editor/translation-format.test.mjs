import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
test('Full EN NL files carry SHA-256 of the actual German source bytes',async()=>{let count=0;for(const r of records.filter(r=>/^(page|post|project|faq)\/(en|nl)\//.test(r.id))){const base=site.sourceFor(r.id.replace(/\/(en|nl)\//,'/'));const raw=await readFile(root+base.file);assert.equal(r.data.translationSourceHash,createHash('sha256').update(raw).digest('hex'),r.id);count++;}assert.equal(count,132);});
test('There is no overlay record or editable freshness hash in the active adapter',()=>{assert.equal(site.sourceFor('translation/page/index/en'),null);for(const r of records)assert.equal(site.extensions.some('omitField',site.sourceFor(r.id),r.data,['translationSourceHash']),true);assert.deepEqual(site.extensions.first('languages'),{source:'de',locales:{en:'English',nl:'Nederlands'}});});
