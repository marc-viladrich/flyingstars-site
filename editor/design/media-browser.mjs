import {mediaLibrary as catalogue,mediaUsage,mediaUsers,collectionOf} from '../extensions/flyingstars/web/media-usage.mjs';
export {mediaUsage,mediaUsers,collectionOf};
export function library(records){
 const assets=new Map(records.filter(r=>r.type==='media').map(r=>[r.data.src,r]));
 const walk=value=>{if(!value||typeof value!=='object')return;if(typeof value.src==='string'&&'alt'in value&&value.width&&value.height&&!assets.has(value.src))assets.set(value.src,{id:'media/source-'+encodeURIComponent(value.src),type:'media',data:{src:value.src,width:value.width,height:value.height,title:value.alt||value.src.split('/').at(-1),defaultAlt:value.alt,mime:'image/jpeg'}});Object.values(value).forEach(walk);};
 records.filter(r=>r.type!=='media').forEach(r=>walk(r.data));return catalogue([...records.filter(r=>r.type!=='media'),...assets.values()]);
}

export function selectImage(existing,asset){const data={...existing,src:asset.data.src,alt:existing?.alt||asset.data.defaultAlt||''};for(const key of ['width','height'])if(key in existing){if(!asset.data[key])throw Error('Für dieses Bild fehlen bestätigte Maße. Bitte zuerst hochladen.');data[key]=asset.data[key];}return data;}
export function imageControl(item,path,{title,untitled=false}={},api){
 const {el,value,button,openMedia,fieldsFor,fieldControl}=api,image=value(item,path)||{};
 return el('div',{class:'media-field'},untitled?null:el('span',{class:'row-label',text:title||'Bild'}),image.src?el('img',{src:image.src,alt:'',style:'max-width:100%;max-height:180px;object-fit:contain'}):null,button('Bild ersetzen',()=>openMedia({id:item.id,path}),{icon:'image',cls:'inline-button'}),...fieldsFor(item).filter(f=>f.path.length===path.length+1&&path.every((p,i)=>p===f.path[i])&&f.path.at(-1)==='alt').map(f=>fieldControl(item,f,{label:'Alternativtext'})));
}
