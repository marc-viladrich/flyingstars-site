import {describe} from './native-schema.mjs';
export function normalizedRoute(path){const clean=String(path||'/').split(/[?#]/,1)[0];return clean==='/'?'/':'/'+clean.replace(/^\/+|\/+$/g,'')+'/';}
export function navigationChoices(records){const choices=new Map([['/','Startseite'],['/drohnenshow-preise/','Preise & Pakete'],['/show-konfigurator/','Show-Konfigurator']]);for(const item of records){const path=item.route||(item.id.startsWith('page/')?(item.id==='page/index'?'/':'/'+item.id.slice(5)+'/'):null);if(path)choices.set(normalizedRoute(path),item.title);}return [...choices].map(([value,label])=>({value,label}));}
export function savedRecordRoute(records,id){return records.find(item=>item.id===id)?.route||'/';}
export function publishNeedsActivation(review){return !!review.publishedHead&&review.activePublishedHead!==review.publishedHead;}
export function mediaSourceChanged(originalSource,currentSource){return originalSource!==currentSource;}
export function fieldsInScope(fields,path,scope){const prefix=scope==='media'?path:path[0]==='sections'?path.slice(0,2):path.slice(0,-1);return fields.filter(field=>prefix.every((part,index)=>field.path[index]===part)&&(scope!=='context'||path[0]!=='sections'||['enum','boolean'].includes(field.kind)));}
export function sourceMediaSources(records){
 const sources={};
 for(const record of records){
  const containers=record.schema?describe(record.schema,record.data).containers:record.containers||[];
  for(const container of containers.filter(c=>c.format==='image')){
   const value=container.path.reduce((value,key)=>value?.[key],record.data);if(!value)continue;
   const asset=value.assetId&&records.find(r=>r.id===value.assetId||r.id==='media/'+value.assetId)?.data;
   sources[record.id+'/'+JSON.stringify(container.path)]=asset?.src||value.src;
  }
 }
 return sources;
}
export function floatingInspectorAllowed(selection,{preview=false,busy=false}={}){return !!selection&&!selection.rich&&!preview&&!busy;}
export function richFormattingAllowed({preview=false,busy=false,locale='de'}={}){return !preview&&!busy&&locale==='de';}
const pathValue=(data,path)=>path.reduce((value,key)=>value?.[key],data);
const ancestor=(parent,path)=>parent.length<path.length&&parent.every((part,index)=>part===path[index]);
export function disclosedContainers(containers,data){return containers.filter(container=>!containers.some(parent=>['object','array'].includes(parent.kind)&&ancestor(parent.path,container.path)&&pathValue(data,parent.path)===undefined));}
export function disclosedOptionalFields(fields,containers,data){return fields.filter(field=>!containers.some(parent=>parent.path.every((part,index)=>field.path[index]===part)&&(parent.path.length===field.path.length||pathValue(data,parent.path)===undefined)));}
export function inspectionTarget(binding,section){if(section&&section.id!==binding.id)return {id:section.id,path:['sections',section.index],linkedId:binding.id};return {id:binding.id,path:binding.path,derived:binding.derived};}
export function restoredInspector(inspector,records,operation){if(!inspector||inspector.scope==='library'||operation?.kind==='set'&&operation.path?.length===1&&operation.path[0]==='sections')return null;return records.some(record=>record.id===inspector.context?.id)?inspector:null;}
