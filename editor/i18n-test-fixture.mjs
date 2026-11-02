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
  // The fixture starts without translations: real ones saved in the working copy must not decide the test.
  const translations=path.join(source,'src/content/translations');
  // One file per [source, locale] in nested folders (content format 2).
  await fs.rm(translations,{recursive:true,force:true});await fs.mkdir(translations,{recursive:true});
  let config=await fs.readFile(path.join(source,'astro.config.mjs'),'utf8');
  // Both replacements must take effect (a silent no-op once let the fixture read the project's .env).
  const replaced=config.replace("vite: {cacheDir:'.astro/vite'","vite: {cacheDir:'.astro/vite',envDir:'/tmp/flyingstars-no-env'").replace('image: {',"image: {service:{entrypoint:'astro/assets/services/noop'},");
  if(!replaced.includes("envDir:'/tmp/flyingstars-no-env'")||!replaced.includes('astro/assets/services/noop'))throw Error('astro.config.mjs hat eine unerwartete Form; die Fixture kann .env und Bilddienst nicht abschalten.');
  config=replaced;
  await fs.writeFile(path.join(source,'astro.config.mjs'),config);
  // Image URLs stay visible in HTML; only build-time optimization/probes are bypassed in this fixture.
  if(!forCI)await fs.writeFile(path.join(source,'src/lib/media.ts'),`
import {mediaForSource} from './editorial-records';
export async function optimizedImage(src:string,width=960,height?:number,_format?:'webp'|'jpg') {
 let size;try{size=await mediaForSource(src);}catch{size={width:960,height:540};}
 const w=Math.min(width,960,size.width),h=height??Math.round(w*size.height/size.width);
 return {src,width:w,height:h,attributes:{width:w,height:h}};
}
export async function responsiveImage(src:string,sizes:string,width=1600,height?:number) {const image=await optimizedImage(src,width,height);return {...image,attributes:{...image.attributes,srcset:src+' '+image.width+'w',sizes}};}
export async function optimizedLogo(src:string,height:number) {return optimizedImage(src,height*3,height);}
`);
  await git(source,['init','--quiet','--initial-branch=content/draft']);
  await git(source,['add','.']);
  await git(source,['rm','--cached','--ignore-unmatch','node_modules']);
  await git(source,['-c','user.name=Fixture','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-qm','Isolierte Offline-Fixture']);
  await git(source,['branch','main']);
  return {root,source,store:await new NativeStore(source,{remote:false,site:await createFlyingStarsAdapter(source),runtime:resolveRuntimeOptions({values:{siteRoot:source}})}).init()};
}
