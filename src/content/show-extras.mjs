import {offerTextCore} from './offer-core.mjs';
import {projectText,projectValue} from './project-facts.mjs';
import {contactText} from './contact.mjs';
import {businessValue} from './business-facts.mjs';
import {createTranslator} from '../i18n/ui.mjs';
import data from './show-extras.json' with {type:'json'};
import {durationText} from './show-duration.mjs';
import {priceLine} from '../lib/price.mjs';
export const SHOW_EXTRAS=data;
export function extraValues(locale='de',source=data){return {filmPrice:priceLine(source.film.price,locale),filmIncluded:source.film.includedIn.join(', '),swissPrice:priceLine(source.schweiz.price,locale),indoorPrice:priceLine(source.indoor.price,locale),dronesMin:source.indoor.drones.min,dronesMax:source.indoor.drones.max,ceilingMin:source.indoor.ceilingMin};}
export const offerText=(text,locale='de',source=data,options={})=>offerTextCore(text,locale,source,{...options,t:createTranslator(locale)});

export function factText(text,locale='de',options={}) {
 const projected=projectText(offerText(durationText(businessValue(projectValue(typeof text==='string'?contactText(text):text,locale),locale)),locale,data,options),locale,undefined,options);
 if(typeof projected==='string'&&/\{\{[^}]*\}\}/.test(projected))throw Error('Unbekannter Faktenplatzhalter: '+projected.match(/\{\{[^}]*\}\}/)[0]);
 return projected;
}
export function footageCell(name,locale='de',source=data){return source.film.includedIn.includes(name)?true:(source.film.price.qualifier==='surcharge'?'':'+')+priceLine(source.film.price,locale,{style:'suffix'});}
