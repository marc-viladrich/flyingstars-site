import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
const root=new URL('../../',import.meta.url);
export const read=(file)=>readFileSync(new URL(file,root),'utf8');
export function readEntry(file){
 const raw=typeof file==='string'?read(file):readFileSync(file,'utf8');
 const match=/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
 return {raw,data:parse(match?match[1]:raw),body:match?.[2]};
}
