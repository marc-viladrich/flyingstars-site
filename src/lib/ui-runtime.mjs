// Browser boundary: only server-rendered localized values, no editorial imports.
export const fillText = (text, values={}) => text.replace(/\{(\w+)\}/g,(match,key)=>key in values?String(values[key]):match);
export function readRuntime(selector) {
  const element=document.querySelector(selector);
  if(!element)return null;
  const data=JSON.parse(element.dataset.runtime);
  if(data.packages)for(const pkg of Object.values(data.packages))if(pkg.max===null)pkg.max=Infinity;
  return {...data,t:(key,values)=>fillText(key.split('.').reduce((value,part)=>value?.[part],data.ui),values)};
}
