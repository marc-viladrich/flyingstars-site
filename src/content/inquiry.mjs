import {PACKAGE_NAMES} from './package-identity.mjs';
import {FORM_OCCASION_IDS} from './occasions.mjs';
import {localizedHref} from '../i18n/routing.mjs';
export const INQUIRY_PACKAGES=[...PACKAGE_NAMES,'offen'];
export const EXTRA_IDS=['express','film','behoerden','kontrollzone','schweiz','indoor'];
export const INQUIRY_LIMITS={name:120,email:200,message:5000,extra:200,body:64*1024,fields:40,extras:10,extraId:30,dronesMin:100,dronesMax:1000,skyText:60,summary:600};
/** URL input is untrusted. Only actual form identities and bounded plain text reach the DOM. */
export function parseInquiry(input){
 const params=input instanceof URLSearchParams?input:new URLSearchParams(input);
 const selected=(key,ids)=>ids.includes(params.get(key))?params.get(key):undefined;
 const drones=Number(params.get('drohnen'));
 return {
  paket:selected('paket',INQUIRY_PACKAGES),
  drohnen:Number.isInteger(drones)&&drones>=INQUIRY_LIMITS.dronesMin&&drones<=INQUIRY_LIMITS.dronesMax?drones:undefined,
  anlass:selected('anlass',FORM_OCCASION_IDS),
  extras:[...new Set((params.get('extras')??'').split(',').filter(id=>EXTRA_IDS.includes(id)))],
  text:params.get('text')?.replace(/\s+/g,' ').trim().slice(0,INQUIRY_LIMITS.skyText),
  show:params.get('show')?.replace(/\r/g,'').trim().slice(0,INQUIRY_LIMITS.summary),
 };
}
/** Same-page form handoff and dedicated contact links use the same codec. Existing query/hash survive. */
export function inquiryHref(selection,locale='de',href='/kontakt/',origin='https://inquiry.invalid'){
 const target=new URL(href,origin);
 if(href.startsWith('//')||target.origin!==new URL(origin).origin||!['http:','https:'].includes(target.protocol))throw Error('Anfrageziel muss ein lokaler Pfad derselben Origin sein.');
 const url=new URL(localizedHref(target.pathname+target.search+target.hash,locale),origin);
 for(const key of ['paket','drohnen','anlass','text','show','extras'])if(Object.hasOwn(selection,key)){
  const value=key==='extras'?selection.extras.join(','):selection[key];
  if(value===undefined||value==='')url.searchParams.delete(key);else url.searchParams.set(key,String(value));
 }
 return url.pathname+url.search+url.hash;
}
