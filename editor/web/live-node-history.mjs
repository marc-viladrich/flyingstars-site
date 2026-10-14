// Ephemeral DOM history retains node identity and its native listeners/controllers.
export class LiveNodeHistory {
 constructor(limit=100){this.limit=limit;this.entries=[];}
 capture(id,nodes){this.entries.push({id,nodes:[...nodes]});if(this.entries.length>this.limit)this.entries.shift();}
 restore(id){const index=this.entries.findLastIndex(entry=>entry.id===id);if(index<0)return null;return this.entries.splice(index,1)[0].nodes;}
}
export function remappedReference(value,ids,{tokens=false}={}){if(tokens)return value.split(/\s+/).map(id=>ids.get(id)||id).join(' ');if(value.startsWith('#'))return '#'+(ids.get(value.slice(1))||value.slice(1));return ids.get(value)||value;}
