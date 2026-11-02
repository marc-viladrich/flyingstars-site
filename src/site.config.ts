import navigationData from './content/navigation.json';
import messages from './i18n/ui.json';
import { createTranslator } from './i18n/ui.mjs';
// Navigation nach Moritz' Sitemap-Entwurf (31.10.2026, noch nicht von FlyingStars abgenommen): Anlässe, Preise,
// Referenzen, Über uns, FAQ, Blog; Kontakt über den Button „Show anfragen“. „Anlässe“ ist nur ein Menüpunkt ohne eigene
// Seite. „Unternehmen“ führt auf die Startseite (Moritz' Option b: die Startseite ist auf „Drohnenshow“ optimiert, eine
// eigene Unternehmensseite würde mit ihr konkurrieren). Im Menü stehen nur Anlass-Seiten, die es schon gibt; Städte,
// Festivals, Privat, Heiratsantrag, Silvester usw. kommen nach Moritz' Prioritäten dazu.
export function getSite(locale = 'de') {
const t = createTranslator(locale);
const address=(path:(string|number)[])=>({owner:{collection:'siteNavigation',id:'configuration'},part:'data',path});
const stamp=(value:Record<string,unknown>,path:(string|number)[],fields:Record<string,unknown>={})=>{Object.defineProperty(value,Symbol.for('afe.source'),{value:{...address(path),strict:true,fields:{...Object.fromEntries(Object.keys(value).map(key=>[key,address([...path,key])])),...fields}}});return value;};
const localized=(value:unknown,path:(string|number)[]=[]):any=>{
 if(Array.isArray(value)){const result=value.map((item,i)=>localized(item,[...path,i]));Object.defineProperty(result,Symbol.for('afe.source'),{value:address(path)});return result;}
 if(value&&typeof value==='object'){const source=value as Record<string,unknown>,result=Object.fromEntries(Object.entries(source).map(([key,item])=>[key,key==='label'&&typeof item==='string'&&item in messages?t(item):localized(item,[...path,key])]));return stamp(result,path,typeof source.label==='string'&&source.label in messages?{label:t.afeAddress(source.label)}:{});}
 return value;
};
const navigation=localized(navigationData) as {nav:{label:string;href:string;children?:{label:string;href:string}[]}[];cta:{label:string;href:string};footer:{legal:{label:string;href:string}[]}};
const result = {
  name: 'FlyingStars', locale,
  description: t('site.droneShowsForBusinessesCitiesFestivalsAndWeddingsDesignPermits'),
  ...navigation,
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '/api/contact',
} as const;
Object.defineProperty(result,Symbol.for('afe.source'),{value:{...address([]),strict:true,fields:Object.fromEntries(Object.keys(navigationData).map(key=>[key,address([key])]))}});
return result;
}
export const site = getSite();
