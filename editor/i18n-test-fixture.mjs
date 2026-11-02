import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {resolveRuntimeOptions} from './server.mjs';
// Isolated, fully offline Astro fixture. Never changes source media or production image behavior.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {NativeStore,git} from 'astro-frontend-editor/runtime';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function i18nFixture(t,{sourceRoot=path.join(here,'..'),forCI=false}={}) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'flyingstars-i18n-')),source=path.join(root,'source');
  if(t)t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.cp(sourceRoot,source,{recursive:true,filter:file=>!['.git','node_modules','.astro','dist'].includes(path.basename(file))&&!path.basename(file).startsWith('.env')});
  await fs.symlink(await fs.realpath(path.join(here,'../node_modules')),path.join(source,'node_modules'));
  let config=await fs.readFile(path.join(source,'astro.config.mjs'),'utf8');
  config=config.replace(/vite:\s*\{/,"vite: {envDir:'/tmp/flyingstars-no-env',");
  if(!config.includes("envDir:'/tmp/flyingstars-no-env'"))throw Error('Die Fixture konnte das Laden von .env nicht abschalten.');
  await fs.writeFile(path.join(source,'astro.config.mjs'),config);
  await git(source,['init','--quiet','--initial-branch=content/draft']);
  await git(source,['add','.']);
  await git(source,['rm','--cached','--ignore-unmatch','node_modules']);
  await git(source,['-c','user.name=Fixture','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-qm','Isolierte Offline-Fixture']);
  await git(source,['branch','main']);
  return {root,source,store:await new NativeStore(source,{remote:false,site:await createFlyingStarsAdapter(source),runtime:resolveRuntimeOptions({values:{siteRoot:source,stateDir:path.join(root,'state')}})}).init()};
}
