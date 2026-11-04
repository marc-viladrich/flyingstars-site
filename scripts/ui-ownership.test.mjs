import test from 'node:test';
import assert from 'node:assert/strict';
import messages from '../src/i18n/ui.json' with {type:'json'};
import {LOCALES} from '../src/i18n/routing.mjs';
import {translatorFor} from '../src/i18n/ui-core.mjs';
test('Navigation hat je Ziel einen UI-Besitzer; Aktion und Kontaktlabel bleiben getrennt',()=>{
 for(const key of ['chopper404.viewOurWork','chopper404.pricesAndPreview','blogpost.theTeam']) assert.ok(!(key in messages),key);
 for(const locale of LOCALES){const t=translatorFor(messages,locale);
  for(const key of ['casestudy.ourWork','site.prices','contactDetails.team']){
   assert.ok(t(key).length);assert.deepEqual(t.afeAddress(key).path,[key,locale]);
  }
  assert.ok(t('contactform.addPhone'));assert.ok(t('contactDetails.phone'));
 }
});
