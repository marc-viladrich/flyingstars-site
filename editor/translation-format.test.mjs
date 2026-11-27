import './test/register-browser-site.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {site,records} from './test/design-data.mjs';
import {auditContracts} from '../src/i18n/read-contracts.mjs';
test('All required locale files carry current version 2 field evidence',()=>{const pairs=auditContracts(site,records);assert.equal(pairs.length,188);const ids=new Set(pairs.map(pair=>pair.id));for(const r of records.filter(r=>ids.has(r.id))){assert.equal(r.data.translationContractVersion,2);assert.ok(r.data.translationEvidence.fields.every(f=>['adopted-existing','reviewed'].includes(f.status)));}});
test('No overlay record or editable freshness hash exists in the active adapter',()=>{assert.equal(site.sourceFor('translation/page/index/en'),null);for(const r of records)for(const key of ['translationSourceHash','translationContractVersion','translationEvidence'])assert.equal(site.extensions.some('omitField',site.sourceFor(r.id),r.data,[key]),true);assert.deepEqual(site.extensions.first('languages'),{source:'de',locales:{en:'English',nl:'Nederlands'}});});
