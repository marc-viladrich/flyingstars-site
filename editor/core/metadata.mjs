import {readMeta} from './afe-meta-spec.mjs';
export function checkedMeta(value={}) {
  const {value:metadata,issues}=readMeta(value);
  if(issues.length)throw new Error(issues.map(issue=>issue.message).join('; '));
  return metadata;
}
export const atPath=(value,path=[])=>path.reduce((item,key)=>item?.[key],value);
export function recordTitle(record) {
  const collection=record?.schema?.['x-afe']?.collection;
  return (collection?.title.length ? atPath(record.data,collection.title) : record?.title||collection?.label)||record?.title||record?.id||'Inhalt';
}
export function referenceRecord(records,value,reference) {
  if(!reference||value==null)return null;
  return records.find(record=>record.address?.collection===reference.collection&&record.address.id===(reference.encoding==='astro-reference'?value.id:value))||null;
}
export function nodeAt(node,data,path) {
  for(const part of path){
    if(node?.kind==='union')node=node.options.find(option=>option.properties?.[node.discriminator]?.value===data?.[node.discriminator]);
    node=node?.kind==='array'?node.element:node?.kind==='tuple'?node.items[part]:node?.properties?.[part];
    data=data?.[part];
  }
  if(node?.kind==='union')node=node.options.find(option=>option.properties?.[node.discriminator]?.value===data?.[node.discriminator]);
  return node;
}
export const listPolicy=node=>({reorderable:false,insertable:false,removable:false,...node?.['x-afe']?.array});
export function referenceFields(schema,data,path=[],out=[]) {
  const node=nodeAt(schema,data,[]);if(!node)return out;
  if(node['x-afe']?.reference&&data!==undefined&&data!==null)out.push({path,value:data,reference:node['x-afe'].reference});
  if(node.kind==='object')for(const [key,child]of Object.entries(node.properties||{}))referenceFields(child,data?.[key],[...path,key],out);
  else if(node.kind==='array')for(const [i,item]of (data||[]).entries())referenceFields(node.element,item,[...path,i],out);
  else if(node.kind==='tuple')for(const [i,child]of node.items.entries())referenceFields(child,data?.[i],[...path,i],out);
  return out;
}

export const canOperate=(schema,operation)=>(schema?.['x-afe']?.collection?.operations??['update']).includes(operation);
