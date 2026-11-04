import {policyTree} from './field-policy.mjs';
import {project,reviewRequired,canonical,selected,CONTRACT_VERSION,ADDRESSING} from './contract.mjs';
export const metadataKeys=new Set(['translationSourceHash','translationContractVersion','translationEvidence','translationReview']);
export const contentData=data=>Object.fromEntries(Object.entries(data).filter(([key])=>!metadataKeys.has(key)));
export const baseId=id=>id.replace(/\/(en|nl)\//,'/');
export const localeOf=id=>/\/(en|nl)\//.exec(id)?.[1];
export const isSource=id=>/^(page|post|project|faq)\/[^/]+$/.test(id);
export function dependenciesFromRecords(records){
 const get=id=>records.find(r=>r.id===id)?.data;
 const owners=(prefix)=>Object.fromEntries(records.filter(r=>r.id.startsWith(prefix+'/')&&!localeOf(r.id)).map(r=>[r.id.slice(prefix.length+1),{file:r.file??`src/content/${prefix==='person'?'people':'projects'}/${r.id.slice(prefix.length+1)}.${prefix==='person'?'json':'md'}`,data:contentData(r.data)}]));
 return {contact:get('site/contact'),showExtras:get('site/show-extras'),showDuration:get('site/show-duration'),projectFacts:get('site/project-facts'),businessFacts:get('site/business-facts'),ui:get('site/ui'),people:owners('person'),projects:owners('project')};
}
const hasText=node=>node.mode==='translatable'||Object.values(node.properties??{}).some(hasText)||node.options?.some(hasText)||(node.element&&hasText(node.element));
const branch=(node,value)=>selected(node,value);
/** A proposal may seed NEW text with DE, but only explicit approval can commit it.
 * Existing translations are matched exclusively by key. The strict project() validates the result. */
export function seedTranslation(schema,source,target){
 const walk=(n,de,tr)=>{
  if(de==null)return de;n=branch(n,de);
  if(n.kind==='object')return Object.fromEntries(Object.entries(n.properties).filter(([k])=>Object.hasOwn(de,k)).map(([k,c])=>[k,walk(c,de[k],tr?.[k])]));
  if(n.kind==='array')return de.map((v,i)=>walk(n.element,v,hasText(n.element)?tr?.find(item=>item._key===v._key):tr?.[i]));
  if(n.kind==='tuple')return de.map((v,i)=>walk(n.items[i],v,tr?.[i]));
  return n.mode==='translatable'&&tr!==undefined?structuredClone(tr):structuredClone(de);
 };
 return walk(policyTree(schema),contentData(source),contentData(target));
}
export const stamp=result=>({...result.projection,translationContractVersion:CONTRACT_VERSION,translationSourceHash:result.sourceFingerprint});
export const approvalFor=(result,addresses)=>result.fields.filter(f=>addresses.includes(f.address)).map(f=>({address:f.address,sourceFingerprint:f.sourceFingerprint,targetFingerprint:f.targetFingerprint}));
/** Deleted fields are removed only during an explicit coordinated structural transaction. */
export const survivingEvidence=(result,evidence)=>({...evidence,fields:evidence.fields.filter(f=>result.fields.some(now=>now.address===f.address))});
export function prepareLocale(schema,source,target,locale,dependencies){
 const result=project(schema,source,seedTranslation(schema,source,target),locale,dependencies),evidence=survivingEvidence(result,target.translationEvidence);
 return {result,needed:reviewRequired(result,evidence)};
}
export function verifyCurrent(schema,source,target,locale,dependencies,{allowUnreviewed=false}={}){
 const result=project(schema,source,target,locale,dependencies);
 if(target.translationContractVersion!==CONTRACT_VERSION||target.translationSourceHash!==result.sourceFingerprint||result.sharedDifferences.length||!same(contentData(target),result.projection)||(!allowUnreviewed&&(target.translationEvidence?.sourceFingerprint!==result.sourceFingerprint||reviewRequired(result,target.translationEvidence).length)))throw Error('Missing or stale '+locale+' translation contract');
 return result;
}
export const same=(a,b)=>canonical(a)===canonical(b);

/** Browser read-only controls are derived from policy. Server authority still verifies the entire candidate. */
export function sharedPaths(schema,data){
 const result=[];
 const walk=(n,v,path=[])=>{if(!hasText(n)){if(path.length&&!metadataKeys.has(path[0]))result.push(path);return;}if(v==null)return;n=branch(n,v);if(n.kind==='object')for(const[k,c]of Object.entries(n.properties))walk(c,v?.[k],[...path,k]);if(n.kind==='array')for(const[item,i]of(v??[]).map((v,i)=>[v,i]))walk(n.element,item,[...path,i]);};walk(policyTree(schema),data);return result;
}
