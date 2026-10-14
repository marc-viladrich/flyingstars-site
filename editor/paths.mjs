import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpathSync,promises as fs} from 'node:fs';

export const editorRoot = path.dirname(fileURLToPath(import.meta.url));
export const sourceRoot = path.dirname(editorRoot);
// The legacy local folder remains the default; a host sets an absolute private directory.
export const stateRoot = () => path.resolve(process.env.FLYINGSTARS_STATE_DIR || path.join(sourceRoot, '..'));
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
}
async function canonical(file) {
  try {return await fs.realpath(file);}
  catch(error) {if(error.code!=='ENOENT')throw error;return path.join(await canonical(path.dirname(file)),path.basename(file));}
}
export async function assertStateLocation(source, state, publicRoot) {
  const repo=await canonical(path.resolve(source)),privateDir=await canonical(path.resolve(state));
  const inside=(file,root)=>file===root||file.startsWith(root+path.sep);
  if(inside(privateDir,repo))throw Error('FLYINGSTARS_STATE_DIR muss außerhalb des Repository-Klons liegen.');
  if(publicRoot) {
    const webroot=await canonical(path.resolve(publicRoot));
    if(inside(privateDir,webroot)||inside(repo,webroot)||inside(webroot,repo)||inside(webroot,privateDir))throw Error('Klon, privater Zustand und öffentlicher Webroot müssen getrennt liegen.');
  }
}
