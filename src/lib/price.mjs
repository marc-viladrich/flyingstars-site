import {localeFormat} from '../i18n/routing.mjs';
import {createTranslator} from '../i18n/ui.mjs';
export function money(amount,locale='de',{style='localized'}={}){
 const number=amount.toLocaleString(localeFormat(locale));
 return style==='suffix'||locale==='de'?`${number} €`:locale==='en'?`€${number}`:`€ ${number}`;
}
export function priceParts(price,locale='de',{style='localized'}={}){
 const t=createTranslator(locale);
 const prefix=price.qualifier==='from-approx'?t('price.fromApprox'):price.qualifier==='from'?t('price.from'):'';
 return {prefix,amount:(price.qualifier==='surcharge'?'+':'')+money(price.amount,locale,{style})};
}

export function startingPrice(amount,locale='de'){const parts=priceParts({amount,currency:'EUR',qualifier:'from',net:true,travel:'excluded'},locale);return parts.prefix+' '+parts.amount;}

export function priceLine(price,locale='de',{style='localized',guide=false}={}){const parts=priceParts(price,locale,{style});const prefix=guide&&price.qualifier==='from-approx'?createTranslator(locale)('price.fromApproxGuide'):parts.prefix;return prefix?prefix+' '+parts.amount:parts.amount;}
