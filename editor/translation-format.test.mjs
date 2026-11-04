import './test/register-browser-site.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {site,records} from './test/design-data.mjs';
import {auditContracts} from '../src/i18n/read-contracts.mjs';
test('All 132 full locale files carry current version 2 field evidence',()=>{assert.equal(auditContracts(site,records).length,132);for(const r of records.filter(r=>/^(page|post|project|faq)\/(en|nl)\//.test(r.id))){assert.equal(r.data.translationContractVersion,2);assert.ok(r.data.translationEvidence.fields.every(f=>f.status==='adopted-existing'));}});
test('No overlay record or editable freshness hash exists in the active adapter',()=>{assert.equal(site.sourceFor('translation/page/index/en'),null);for(const r of records)for(const key of ['translationSourceHash','translationContractVersion','translationEvidence'])assert.equal(site.extensions.some('omitField',site.sourceFor(r.id),r.data,[key]),true);assert.deepEqual(site.extensions.first('languages'),{source:'de',locales:{en:'English',nl:'Nederlands'}});});
