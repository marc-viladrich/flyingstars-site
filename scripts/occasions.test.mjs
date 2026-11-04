import test from 'node:test';import assert from 'node:assert/strict';
import {FORM_OCCASION_IDS,REFERENCE_OCCASION_IDS,REFERENCE_FORM_MAP,CONFIGURATOR_FORM_MAP,formOccasionFor,formOccasions} from '../src/content/occasions.mjs';
import {getConfiguratorContent} from '../src/content/show-configurator.js';
import {createTranslator} from '../src/i18n/ui.mjs';
import {onRequestPost} from '../functions/api/contact.ts';
test('Getrennte Taxonomien behalten Identität, Reihenfolge und ausdrückliche Beziehungen',()=>{
 assert.deepEqual(FORM_OCCASION_IDS,['firma','stadt','agentur','privat','indoor','sonstiges']);assert.deepEqual(REFERENCE_OCCASION_IDS,['firma','stadt','kultur','privat','indoor','sonstiges']);
 assert.deepEqual(Object.keys(REFERENCE_FORM_MAP),REFERENCE_OCCASION_IDS);
 for(const target of [...Object.values(CONFIGURATOR_FORM_MAP),...Object.values(REFERENCE_FORM_MAP)])assert.ok(FORM_OCCASION_IDS.includes(target));
 for(const locale of ['de','en','nl']){const occasions=getConfiguratorContent(locale).OCCASIONS;assert.deepEqual(occasions.map(o=>o.id),Object.keys(CONFIGURATOR_FORM_MAP));assert.deepEqual(formOccasions(createTranslator(locale)).map(([id])=>id),FORM_OCCASION_IDS);for(const o of occasions)assert.equal(o.anlass,formOccasionFor(o.id));}
 assert.throws(()=>formOccasionFor('unbekannt'),/Unbekannter Konfiguratoranlass/);
});
test('Jeder abgebildete Anlass erreicht den tatsächlichen API-Validator in allen Sprachen',async()=>{
 for(const locale of ['de','en','nl'])for(const anlass of FORM_OCCASION_IDS){const form=new FormData();for(const [k,v]of Object.entries({name:'Test',email:'test@example.test',anlass,locale}))form.set(k,v);const response=await onRequestPost({request:new Request('https://example.test/api/contact',{method:'POST',headers:{accept:'application/json'},body:form}),env:{}});assert.equal(response.status,200,locale+':'+anlass);assert.equal((await response.json()).state,'not-configured');}
});
