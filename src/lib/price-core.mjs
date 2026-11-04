import {localeFormat} from '../i18n/routing.mjs';
export function money(amount,locale='de',{style='localized'}={}){
 const number=amount.toLocaleString(localeFormat(locale));
 return style==='suffix'||locale==='de'?`${number} €`:locale==='en'?`€${number}`:`€ ${number}`;
}
export function priceParts(price,locale='de',{style='localized',t}={}){
 const prefix=price.qualifier==='from-approx'?t('price.fromApprox'):price.qualifier==='from'?t('price.from'):'';
 return {prefix,amount:(price.qualifier==='surcharge'?'+':'')+money(price.amount,locale,{style})};
}


export function priceLine(price,locale='de',{style='localized',guide=false,t}={}){const parts=priceParts(price,locale,{style,t});const prefix=guide&&price.qualifier==='from-approx'?t('price.fromApproxGuide'):parts.prefix;return prefix?prefix+' '+parts.amount:parts.amount;}
