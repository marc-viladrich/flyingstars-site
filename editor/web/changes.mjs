export function queuedFieldCount(entries,pendingKeys=[]){const keys=new Set(pendingKeys);for(const [id,entry]of entries)for(const key of entry.changes.keys())keys.add(id+'/'+key);return keys.size;}
