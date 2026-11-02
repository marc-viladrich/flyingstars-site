const getPath=(data,path)=>path.reduce((value,key)=>value?.[key],data);
/** Query results have record ownership, never fabricated array membership. */
export function queryFor(name) {
 const kind={'flyingstars/faq':'faq/','flyingstars/projects':'project/','flyingstars/posts':'post/'}[name];
 if(!kind)return undefined;
 return {
  list({records,section={},editor=true}){
   let result=records.filter(record=>record.id.startsWith(kind)&&(editor||!record.data.draft));
   if(kind==='faq/')result=result.filter(record=>!section.tags?.length||record.data.tags?.some(tag=>section.tags.includes(tag))).sort((a,b)=>a.data.order-b.data.order);
   else result.sort((a,b)=>(kind==='project/'?((a.data.showcase?.order??999)-(b.data.showcase?.order??999)||Number(!!b.data.featured)-Number(!!a.data.featured)):0)||new Date(b.data.date).valueOf()-new Date(a.data.date).valueOf());
   return (section.limit?result.slice(0,section.limit):result).map(record=>record.id);
  },
  create({records,section={}}){return kind==='faq/'?{...section.tags?.length?{tags:[...section.tags]}:{},order:Math.max(0,...records.filter(r=>r.id.startsWith(kind)).map(r=>Number(r.data.order)||0))+1}:{};},
  ...(kind==='faq/'?{reorder({records,ids}){
   const items=ids.map(id=>records.find(r=>r.id===id));
   if(items.some(r=>!r||!r.id.startsWith(kind))||new Set(ids).size!==ids.length)throw Error('Ungültige Reihenfolge.');
   const values=items.map(r=>Number(r.data.order)).sort((a,b)=>a-b);
   if(values.some(v=>!Number.isFinite(v)))throw Error('Ungültige Reihenfolge.');
   let ordered=items,numbers=values;
   if(new Set(values).size!==values.length){
    const all=records.filter(r=>r.id.startsWith(kind)).sort((a,b)=>(Number(a.data.order)||0)-(Number(b.data.order)||0)||a.id.localeCompare(b.id)),moved=new Set(ids);let next=0;
    ordered=all.map(r=>moved.has(r.id)?items[next++]:r);numbers=ordered.map((_,i)=>(i+1)*10);
   }
   return ordered.flatMap((record,i)=>getPath(record.data,['order'])===numbers[i]?[]:[{id:record.id,patches:[{path:['order'],value:numbers[i]}]}]);
  }}:{}),
 };
}
