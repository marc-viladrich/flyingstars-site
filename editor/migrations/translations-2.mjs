import {promises as fs} from 'node:fs';
import path from 'node:path';
import {codecs} from '../core/codecs.mjs';
import {listKeyAt} from '../native-schema.mjs';
import {resolvePath,storedPath,translationKey} from '../vendor/astro-frontend-editor/src/content/index.mjs';

// Content format 1 → 2 for overlay translations:
// - identity: translations/<source id>/<locale>.json instead of a name with "/" flattened to "-" (collisions);
// - value paths name list items by key where the list declares one (x-afe.array.key), so a reorder outside the
//   editor keeps them; items without a key keep their position;
// - every file says `"format": 2`.
// Values whose path no longer resolves (stale) are kept unchanged: a migration never drops content.
export const id='translations-2';
export const description='Übersetzungen: eine Datei je Quelle und Sprache, Listeneinträge über ihren Schlüssel';

async function readSource(root,site,sourceId){
 const source=site.sourceFor(sourceId);
 if(!source)return null;
 const text=await fs.readFile(path.join(root,source.file),'utf8').catch(()=>null);
 if(text===null)return null;
 return {source,data:source.schema.parse(codecs[source.format].parse(text))};
}

/** @returns {Promise<{file:string,before:string|null,after:string|null}[]>} every file to write or delete */
export async function plan({root,site}){
 const dir=path.join(root,'src/content/translations');
 const files=(await fs.readdir(dir,{recursive:true}).catch(()=>[])).filter(file=>file.endsWith('.json')).map(file=>file.split(path.sep).join('/')).sort();
 const changes=[],targets=new Map();
 for(const name of files){
  const file='src/content/translations/'+name,before=await fs.readFile(path.join(root,file),'utf8'),data=JSON.parse(before);
  const target='src/content/translations/'+translationKey(data.sourceId,data.locale)+'.json';
  if(targets.has(target))throw Error(`Zwei Übersetzungsdateien für ${data.sourceId} (${data.locale}): ${targets.get(target)} und ${file}.`);
  targets.set(target,file);
  const owner=await readSource(root,site,data.sourceId);
  const keyAt=owner?listKeyAt(owner.source.schema,owner.data):()=>null;
  const values=data.values.map(value=>{const position=owner&&resolvePath(owner.data,value.path);return position?{...value,path:storedPath(owner.data,position,keyAt)}:value;});
  const {format,...rest}=data;
  const after=codecs.json.create({format:2,...rest,values});
  if(target===file){if(after!==before)changes.push({file,before,after});continue;}
  if(files.includes(target.slice('src/content/translations/'.length)))throw Error(`${target} existiert bereits; ${file} kann nicht dorthin verschoben werden.`);
  changes.push({file,before,after:null},{file:target,before:null,after});
 }
 return changes;
}
