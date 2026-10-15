import {atPath,listPolicy,nodeAt} from './metadata.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Check the complete candidate, including ancestor/root replacement patches. */
export function assertMetadataWrite(schema,before,after,path=[]) {
  if(same(before,after))return;
  const node=nodeAt(schema,before??after,[]);if(!node)return;
  const fail=message=>{throw new Error(`${message}: ${path.join('.')||'Inhalt'}`);};
  if(node['x-afe']?.readOnly||node.readOnly)fail('Dieses Feld ist schreibgeschützt');
  if(node.kind==='object')for(const [key,child]of Object.entries(node.properties||{}))assertMetadataWrite(child,before?.[key],after?.[key],[...path,key]);
  if(node.kind==='tuple')node.items.forEach((child,i)=>assertMetadataWrite(child,before?.[i],after?.[i],[...path,i]));
  if(node.kind!=='array')return;
  const old=before||[],next=after||[],policy=listPolicy(node);
  // Match stable keys when declared; otherwise preserve exact surviving entries first.
  const identity=value=>policy.key?atPath(value,policy.key):value;
  const used=new Set();const matched=next.map(item=>{const index=old.findIndex((value,i)=>!used.has(i)&&same(identity(value),identity(item)));if(index>=0)used.add(index);return index;});
  // Unmatched entries at a surviving position are ordinary edits, not insert+remove.
  const available=old.map((_,i)=>i).filter(i=>!used.has(i));
  const missing=matched.map((v,i)=>v<0?i:-1).filter(i=>i>=0);
  if(!policy.key)for(let i=0;i<Math.min(available.length,missing.length);i++)matched[missing[i]]=available[i];
  const survivors=matched.filter(i=>i>=0);
  const inserted=next.length-survivors.length,removed=old.length-survivors.length;
  if(inserted&&!policy.insertable)fail('Einfügen ist für diese Liste nicht freigegeben');
  if(removed&&!policy.removable)fail('Entfernen ist für diese Liste nicht freigegeben');
  if(!policy.reorderable&&survivors.some((v,i)=>i&&v<survivors[i-1]))fail('Umsortieren ist für diese Liste nicht freigegeben');
  next.forEach((value,i)=>{if(matched[i]>=0)assertMetadataWrite(node.element,old[matched[i]],value,[...path,i]);});
}
