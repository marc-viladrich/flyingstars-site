import {legacyRuntimeMessages} from './runtime-options.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpathSync,promises as fs} from 'node:fs';

export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try{return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));}
  catch(error){if(error.code==='ENOENT')return false;throw error;}
}
async function canonical(file) {
  try {return await fs.realpath(file);}
  catch(error) {if(error.code!=='ENOENT')throw error;return path.join(await canonical(path.dirname(file)),path.basename(file));}
}
export async function assertStateLocation(source, state, publicRoot) {
  const inside=(file,root)=>file===root||file.startsWith(root+path.sep);
  // Check both configured paths and resolved symlink targets, including missing descendants.
  const configured=[source,state,publicRoot].map(file=>file?path.resolve(file):null);
  const resolved=await Promise.all(configured.map(file=>file?canonical(file):null));
  for(const [repo,privateDir,webroot] of [configured,resolved]) {
    if(inside(privateDir,repo))throw Error(legacyRuntimeMessages.state);
    if(webroot&&(inside(privateDir,webroot)||inside(webroot,privateDir)||inside(repo,webroot)||inside(webroot,repo)))throw Error('Klon, privater Zustand und öffentlicher Webroot müssen getrennt liegen.');
  }
}
