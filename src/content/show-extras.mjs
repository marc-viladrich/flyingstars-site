import {projectText,projectValue} from './project-facts.mjs';
import {contactText} from './contact.mjs';
import {businessValue} from './business-facts.mjs';
import {createTranslator} from '../i18n/ui.mjs';
import data from './show-extras.json' with {type:'json'};
import {durationText} from './show-duration.mjs';
import {priceLine} from '../lib/price.mjs';
export const SHOW_EXTRAS=data;
export function extraValues(locale='de',source=data){return {filmPrice:priceLine(source.film.price,locale),filmIncluded:source.film.includedIn.join(', '),swissPrice:priceLine(source.schweiz.price,locale),indoorPrice:priceLine(source.indoor.price,locale),dronesMin:source.indoor.drones.min,dronesMax:source.indoor.drones.max,ceilingMin:source.indoor.ceilingMin};}
export function offerText(text,locale='de',source=data,{markdown=false}={}){
 const output=value=>markdown?String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/[\\`*_[\]{}()!#+|>-]/g,'\\$&'):String(value);
 if(typeof text!=='string')return text;
 return text.replace(/\{\{offer\.([\w.]+)\}\}/g,(_,path)=>{
  const [id,...parts]=path.split('.');
  if(id==='film'&&parts[0]==='included')return output(source.film.includedIn.join(', '));
  if(id==='indoor'&&parts[0]==='ceilingWords'){const n=source.indoor.ceilingMin;return output(Number.isInteger(n)&&n>=0&&n<=12?createTranslator(locale)(`quantity.number${n}`):n);}
  if(parts.length===1&&['price','priceSuffix','priceLine','priceGuide'].includes(parts[0]))return output(priceLine(source[id].price,locale,{style:parts[0]==='priceSuffix'?'suffix':'localized',guide:parts[0]==='priceGuide'}));
  const value=parts.reduce((value,key)=>value?.[key],source[id]);
  if(typeof value!=='number')throw Error(`Unbekannter Angebotsfakt: ${path}`);return output(value);
 });
}
export function factText(text,locale='de',options={}) {
 const projected=projectText(offerText(durationText(businessValue(projectValue(typeof text==='string'?contactText(text):text,locale),locale)),locale,data,options),locale,undefined,options);
 if(typeof projected==='string'&&/\{\{[^}]*\}\}/.test(projected))throw Error('Unbekannter Faktenplatzhalter: '+projected.match(/\{\{[^}]*\}\}/)[0]);
 return projected;
}
export function footageCell(name,locale='de',source=data){return source.film.includedIn.includes(name)?true:(source.film.price.qualifier==='surcharge'?'':'+')+priceLine(source.film.price,locale,{style:'suffix'});}
