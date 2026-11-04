import {priceLine} from '../lib/price-core.mjs';
export function offerTextCore(text,locale,source,{markdown=false,t}={}){
 const output=value=>markdown?String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/[\\`*_[\]{}()!#+|>-]/g,'\\$&'):String(value);
 if(typeof text!=='string')return text;
 return text.replace(/\{\{offer\.([\w.]+)\}\}/g,(_,path)=>{
  const [id,...parts]=path.split('.');
  if(id==='film'&&parts[0]==='included')return output(source.film.includedIn.join(', '));
  if(id==='indoor'&&parts[0]==='ceilingWords'){const n=source.indoor.ceilingMin;return output(Number.isInteger(n)&&n>=0&&n<=12?t(`quantity.number${n}`):n);}
  if(parts.length===1&&['price','priceSuffix','priceLine','priceGuide'].includes(parts[0]))return output(priceLine(source[id].price,locale,{t,style:parts[0]==='priceSuffix'?'suffix':'localized',guide:parts[0]==='priceGuide'}));
  const value=parts.reduce((value,key)=>value?.[key],source[id]);
  if(typeof value!=='number')throw Error(`Unbekannter Angebotsfakt: ${path}`);return output(value);
 });
}
