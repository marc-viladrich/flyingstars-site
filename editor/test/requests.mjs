import {dependenciesFromRecords,isSource,prepareLocale,approvalFor} from '../../src/i18n/transaction.mjs';
import {randomUUID} from 'node:crypto';
export function request(state,values){const changes=new Map();for(const[id,path,value]of values){if(!changes.has(id))changes.set(id,{id,expectedRevision:state.records.find(r=>r.id===id).revision,patches:[]});changes.get(id).patches.push({path,value});}return {expectedHead:state.head,requestId:randomUUID(),changes:[...changes.values()]};}
export const triplet=(slug,path,values)=>['de','en','nl'].map((locale,i)=>['page/'+(locale==='de'?'':locale+'/')+slug,path,values[i]]);

/** Explicit test/operator review action, using the same projection and proof payload as the browser. */
export function reviewedRequest(state,values){
 const records=structuredClone(state.records),set=(data,path,value)=>{if(!path.length)return structuredClone(value);let at=data;for(const key of path.slice(0,-1))at=at[key];at[path.at(-1)]=structuredClone(value);return data;};
 for(const [id,path,value]of values){const r=records.find(r=>r.id===id);r.data=set(r.data,path,value);}
 const dependencies=dependenciesFromRecords(records),out=[...values],changed=new Set(values.map(v=>v[0]));
 for(const source of records.filter(r=>isSource(r.id)))for(const locale of ['en','nl']){
  const id=source.id.replace('/',`/${locale}/`),target=records.find(r=>r.id===id);
  const {result,needed}=prepareLocale(source.schema,source.data,target.data,locale,dependencies);
  if(!changed.has(source.id)&&!changed.has(id)&&!needed.length)continue;
  const data={...result.projection,translationContractVersion:target.data.translationContractVersion,translationSourceHash:target.data.translationSourceHash,translationEvidence:target.data.translationEvidence,...needed.length?{translationReview:approvalFor(result,needed)}:{}};
  for(let i=out.length-1;i>=0;i--)if(out[i][0]===id)out.splice(i,1);
  out.push([id,[],data]);
 }
 return request(state,out);
}
