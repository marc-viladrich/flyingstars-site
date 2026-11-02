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
  // Explicit offline fixture images. The public site's media resolver is never changed by this test.
  await fs.writeFile(path.join(source,'src/lib/media.ts'),`
import sharp from 'sharp';
import path from 'node:path';
export async function optimizedImage(src:string,width=960,height?:number,_format?:string){
 const size=src.startsWith('/assets/')?await sharp(path.join(process.cwd(),'public',src)).metadata():{width:1600,height:900};
 const w=Math.min(width,960,size.width!),h=height??Math.round(w*size.height!/size.width!);
 return {src,width:w,height:h,attributes:{width:w,height:h}};
}
export async function optimizedLogo(src:string,height:number){return optimizedImage(src,height*3,height);}
optimizedImage.afeBindings=([source]:unknown[])=>({src:source});optimizedLogo.afeBindings=optimizedImage.afeBindings;
`);
  if(forCI){
    const packageRoot=fileURLToPath(new URL('./',import.meta.resolve('astro-frontend-editor/package.json')));
    const manifest=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));manifest.dependencies['astro-frontend-editor']='file:'+packageRoot;
    await fs.writeFile(path.join(source,'package.json'),JSON.stringify(manifest,null,2)+'\n');
    const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');
    await promisify(execFile)('npm',['install','--package-lock-only','--ignore-scripts','--offline','--install-links=true'],{cwd:source,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},maxBuffer:2000000});
    // npm otherwise records a relative external link, invalid after the deploy hook creates a deeper worktree.
    const lock=JSON.parse(await fs.readFile(path.join(source,'package-lock.json'),'utf8'));lock.packages['node_modules/astro-frontend-editor'].resolved='file:'+packageRoot;
    await fs.writeFile(path.join(source,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
    await fs.appendFile(path.join(source,'.npmrc'),'\ninstall-links=true\n');
  }
  await git(source,['init','--quiet','--initial-branch=content/draft']);
  await git(source,['add','.']);
  await git(source,['rm','--cached','--ignore-unmatch','node_modules']);
  await git(source,['-c','user.name=Fixture','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-qm','Isolierte Offline-Fixture']);
  await git(source,['branch','main']);
  return {root,source,store:await new NativeStore(source,{remote:false,site:await createFlyingStarsAdapter(source),runtime:resolveRuntimeOptions({values:{siteRoot:source,stateDir:path.join(root,'state')}})}).init()};
}
