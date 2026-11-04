import facts from './business-facts.json' with {type:'json'};
export const BUSINESS_FACTS=facts;
/** @typedef {{fact:string,display?:string}} BusinessRef */
/** @param {string|number|BusinessRef} value */
export function businessValue(value,locale='de',source=facts){
 if(!value||typeof value!=='object')return value;
 const n=source[value.fact]?.value;if(n===undefined)throw Error(`Unbekannter Geschäftsfakt: ${value.fact}`);
 return value.display==='hours'?`${n} h`:value.display==='shows'?`${n} ${locale==='de'?'Shows':'shows'}`:value.display==='discount'?`−${n} %`:String(n);
}
export const roundedShowsAllowed=(floor,source=facts)=>floor<source.showsTotal.value;
