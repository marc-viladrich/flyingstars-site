import {createTranslator} from '../i18n/ui.mjs';
import * as core from './price-core.mjs';
export const money=core.money;
export const priceParts=(price,locale='de',options={})=>core.priceParts(price,locale,{...options,t:createTranslator(locale)});
export const priceLine=(price,locale='de',options={})=>core.priceLine(price,locale,{...options,t:createTranslator(locale)});
export function startingPrice(amount,locale='de'){const parts=priceParts({amount,currency:'EUR',qualifier:'from',net:true,travel:'excluded'},locale);return parts.prefix+' '+parts.amount;}
