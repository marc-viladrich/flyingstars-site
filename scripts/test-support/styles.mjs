import {readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function styleFiles(){
  const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.name.endsWith('.css')?[relative(root,join(dir,e.name))]:[]);
  return walk(join(root,'src')).sort();
}
export const readStyles=()=>styleFiles().map(file=>readFileSync(join(root,file),'utf8')).join('\n');
