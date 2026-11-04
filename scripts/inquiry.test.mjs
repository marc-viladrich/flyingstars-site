import test from 'node:test';import assert from 'node:assert/strict';
import {inquiryHref,parseInquiry,INQUIRY_LIMITS,EXTRA_IDS,INQUIRY_PACKAGES} from '../src/content/inquiry.mjs';
import {getPackageDetails} from '../src/content/package-details.ts';
import {onRequestPost} from '../functions/api/contact.ts';
test('Anfrage-Codec erhält Sonderzeichen, Extras, Locale und Fragment durch einen echten URL-Roundtrip',()=>{
 const input={paket:'HORIZON',drohnen:250,anlass:'agentur',extras:['express','film'],text:'Müller & Söhne + 50% <3 #? é',show:'Eigene Show\nKöln & Düsseldorf: "Ja!"'};
 for(const locale of ['de','en','nl']){
  const href=inquiryHref(input,locale,'/?quelle=Empfehlung#anfrage'),url=new URL(href,'https://example.test');
  assert.equal(url.pathname,locale==='de'?'/':`/${locale}/`);assert.equal(url.hash,'#anfrage');assert.equal(url.searchParams.get('quelle'),'Empfehlung');assert.deepEqual(parseInquiry(url.searchParams),input);
  const withIndoor=inquiryHref({extras:['indoor'],anlass:'indoor'},locale,href),parsed=parseInquiry(new URL(withIndoor,'https://example.test').search);assert.equal(parsed.paket,'HORIZON');assert.equal(parsed.show,input.show);assert.equal(parsed.anlass,'indoor');assert.deepEqual(parsed.extras,['indoor']);
  assert.deepEqual(getPackageDetails(locale).EXTRAS.map(e=>e.id),EXTRA_IDS);
 }
 assert.equal(inquiryHref({extras:['film']},'en','https://example.test/en/?paket=SPARK#anfrage','https://example.test'),'/en/?paket=SPARK&extras=film#anfrage');
 assert.throws(()=>inquiryHref({},'de','https://external.test'),/lokaler Pfad/);
 assert.throws(()=>inquiryHref({},'de','https://external.test/','https://example.test'),/derselben Origin/);
});
test('Parser begrenzt nur am Eingangsrand und lässt unbekannte IDs nicht ins Formular',()=>{
 const parsed=parseInquiry(new URLSearchParams({paket:'UNKNOWN',anlass:'kultur',drohnen:'1001',extras:'film,unknown,film',text:'x'.repeat(100),show:'y'.repeat(800)}));
 assert.equal(parsed.paket,undefined);assert.equal(parsed.anlass,undefined);assert.equal(parsed.drohnen,undefined);assert.deepEqual(parsed.extras,['film']);assert.equal(parsed.text.length,INQUIRY_LIMITS.skyText);assert.equal(parsed.show.length,INQUIRY_LIMITS.summary);
 for(const n of [100,1000])assert.equal(parseInquiry(`drohnen=${n}`).drohnen,n);
 assert.deepEqual(INQUIRY_PACKAGES,['SPARK','HORIZON','ODYSSEY','offen']);
});
test('No-JS Formulardaten erreichen den unveränderten API-Sicherheitsrand und sprachgleichen 303-Rückweg',async()=>{
 for(const locale of ['de','en','nl']){
  const href=inquiryHref({paket:'ODYSSEY',drohnen:600,anlass:'firma',extras:['express','film'],text:'Ä & +',show:'Entwurf'},locale),selection=parseInquiry(new URL(href,'https://example.test').search);
  const form=new URLSearchParams({name:'Müller & Söhne',email:'test@example.test',ort:'Köln',locale,paket:selection.paket,drohnen:String(selection.drohnen),anlass:selection.anlass,message:selection.text+'\n'+selection.show});for(const id of selection.extras)form.append('extras',id);
  const response=await onRequestPost({request:new Request('https://example.test/api/contact',{method:'POST',headers:{accept:'text/html'},body:form}),env:{}});assert.equal(response.status,303);const back=new URL(response.headers.get('location'));assert.equal(back.pathname,locale==='de'?'/danke/':`/${locale}/danke/`);assert.equal(back.searchParams.get('state'),'not-configured');assert.equal(response.headers.get('cache-control'),'no-store');
 }
});
