import policy from './show-duration.json' with {type:'json'};
export const SHOW_DURATION=policy;
export const durationValues=(source=policy)=>({...source.outdoor,indoorMin:source.indoor.min,indoorMax:source.indoor.max});
export function durationText(text,source=policy){
 if(typeof text!=='string')return text;
 return text.replace(/\{\{duration\.(outdoor|indoor)\.(min|max|typical)\}\}/g,(_,kind,key)=>{
  const value=source[kind][key];if(value===undefined)throw Error(`Unbekannter Dauerfakt: ${kind}.${key}`);return String(value);
 });
}
