import {randomUUID} from 'node:crypto';
export function request(state,values){const changes=new Map();for(const[id,path,value]of values){if(!changes.has(id))changes.set(id,{id,expectedRevision:state.records.find(r=>r.id===id).revision,patches:[]});changes.get(id).patches.push({path,value});}return {expectedHead:state.head,requestId:randomUUID(),changes:[...changes.values()]};}
export const triplet=(slug,path,values)=>['de','en','nl'].map((locale,i)=>['page/'+(locale==='de'?'':locale+'/')+slug,path,values[i]]);
