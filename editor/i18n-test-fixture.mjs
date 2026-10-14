// Isolated, fully offline Astro fixture. Never changes source media or production image behavior.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {NativeStore,git} from './native-store.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function i18nFixture(t,{sourceRoot=path.join(here,'..')}={}) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'flyingstars-i18n-')),source=path.join(root,'..');
  if(t)t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.cp(sourceRoot,source,{recursive:true,filter:file=>!['.git','node_modules','.astro','dist'].includes(path.basename(file))&&!path.basename(file).startsWith('.env')});
  await fs.symlink(await fs.realpath(path.join(here,'../node_modules')),path.join(source,'node_modules'));
  // The fixture starts without translations: real ones saved in the working copy must not decide the test.
  const translations=path.join(source,'src/content/translations');
  for(const file of await fs.readdir(translations).catch(()=>[]))if(file.endsWith('.json'))await fs.rm(path.join(translations,file));
  let config=await fs.readFile(path.join(source,'astro.config.mjs'),'utf8');
  config=config.replace("output: 'static',","output: 'static',\n  cacheDir: './.astro/cache',\n  vite: {cacheDir:'.astro/vite',envDir:'/tmp/flyingstars-no-env'},");
  config=config.replace('image: {',"image: {service:{entrypoint:'astro/assets/services/noop'},");
  await fs.writeFile(path.join(source,'astro.config.mjs'),config);
  // Image URLs stay visible in HTML; only build-time optimization/probes are bypassed in this fixture.
  await fs.writeFile(path.join(source,'src/lib/media.ts'),`
import {mediaForSource} from './editorial-records';
export async function optimizedImage(src:string,width=960,height?:number) {
 let size;try{size=mediaForSource(src);}catch{size={width:960,height:540};}
 const w=Math.min(width,960,size.width),h=height??Math.round(w*size.height/size.width);
 return {src,width:w,height:h,attributes:{width:w,height:h}};
}
export async function optimizedLogo(src:string,height:number) {return optimizedImage(src,height*3,height);}
`);
  await git(source,['init','--quiet','--initial-branch=content/draft']);
  await git(source,['add','.']);
  await git(source,['rm','--cached','--ignore-unmatch','node_modules']);
  await git(source,['-c','user.name=Fixture','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-qm','Isolierte Offline-Fixture']);
  await git(source,['branch','main']);
  return {root,source,store:await new NativeStore(source,{remote:false}).init()};
}
