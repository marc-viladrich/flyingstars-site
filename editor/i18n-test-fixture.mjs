import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {resolveRuntimeOptions} from './server.mjs';
// Isolated, fully offline Astro fixture. Never changes source media or production image behavior.
import {constants, promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {NativeStore,git} from 'astro-frontend-editor/runtime';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url));
// The editor starts the private and public Astro builds in series. Each build has its own 180 s limit.
export const BUILD_PAIR_TIMEOUT = 7 * 60_000;
export async function i18nFixture(t,{sourceRoot=path.join(here,'..'),forCI=false,offlineMedia=true}={}) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'flyingstars-i18n-')),source=path.join(root,'source');
  if(t)t.after(()=>fs.rm(root,{recursive:true,force:true}));
  if(forCI){
    // Nested CI also exercises tests pinned to historical revisions.
    await git(root,['clone','--quiet','--shared','--no-checkout',sourceRoot,source]);
    await git(source,['update-ref','refs/heads/content/draft','HEAD']);
    await git(source,['symbolic-ref','HEAD','refs/heads/content/draft']);
    await git(source,['remote','remove','origin']);
  }
  // The video payload guard in nested CI reads the lab archive. Ordinary editor fixtures build only public media.
  const videoArchive = path.resolve(sourceRoot, 'archive/video-lab/files');
  await fs.cp(sourceRoot, source, {
    recursive: true,
    mode: constants.COPYFILE_FICLONE,
    filter: (file) => {
      const name = path.basename(file);
      return !['.git', 'node_modules', '.astro', 'dist'].includes(name)
        && !name.startsWith('.env')
        && (forCI || path.resolve(file) !== videoArchive);
    },
  });
  await fs.symlink(await fs.realpath(path.join(here,'../node_modules')),path.join(source,'node_modules'));
  let config=await fs.readFile(path.join(source,'astro.config.mjs'),'utf8');
  const envDir = JSON.stringify(path.join(root,'unused-env'));
  config=config.replace(/vite:\s*\{(?:envDir:"(?:[^"\\]|\\.)*",)?/,`vite: {envDir:${envDir},`);
  assert.ok(config.includes(`envDir:${envDir}`),'Die Fixture konnte das Laden von .env nicht abschalten.');
  if(offlineMedia){
    // Some real CLI candidate builders intentionally pass only PATH to Astro.
    const offlineSwitch = "process.env.FLYINGSTARS_OFFLINE_MEDIA === '1'";
    const fixtureSwitch = 'true /* fixture image service */';
    assert.ok(config.includes(offlineSwitch)||config.includes(fixtureSwitch),'Der Offline-Bilddienst fehlt in der Astro-Konfiguration.');
    config=config.replace(offlineSwitch,fixtureSwitch);
  }
  await fs.writeFile(path.join(source,'astro.config.mjs'),config);
  // Explicit offline fixture images. The public site's media resolver is never changed by this test.
  if(offlineMedia)await fs.writeFile(path.join(source,'src/lib/media.ts'),`
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
    const installedRoot=fileURLToPath(new URL('./',import.meta.resolve('astro-frontend-editor/package.json'))),packageRoot=path.join(root,'private-product');
    // Unique temporary package path avoids npm reusing a cached folder package.
    // Only the declared package files are copied, outside the fixture's Git repository.
    const product=JSON.parse(await fs.readFile(path.join(installedRoot,'package.json'),'utf8'));await fs.mkdir(packageRoot);
    for(const file of ['package.json',...product.files])await fs.cp(path.join(installedRoot,file),path.join(packageRoot,file),{recursive:true});
    const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');
    // npm ci caches tarballs, not the registry metadata needed by npm install's peer resolver.
    // Reuse the verified locked graph and replace only this installed package's transport.
    const lock=JSON.parse(await fs.readFile(path.join(source,'package-lock.json'),'utf8')),entry=lock.packages['node_modules/astro-frontend-editor'];
    assert.equal(entry.name,product.name);assert.equal(entry.version,product.version);
    assert.deepEqual(entry.dependencies,product.dependencies);assert.deepEqual(entry.peerDependencies,product.peerDependencies);
    const packed=await promisify(execFile)('npm',['pack','--ignore-scripts','--offline','--json'],{cwd:packageRoot,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},maxBuffer:2000000});
    const [archive]=JSON.parse(packed.stdout),spec='file:'+path.join(packageRoot,archive.filename);
    const manifest=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));manifest.dependencies['astro-frontend-editor']=spec;
    lock.packages[''].dependencies['astro-frontend-editor']=spec;entry.resolved=spec;entry.integrity=archive.integrity;
    await fs.writeFile(path.join(source,'package.json'),JSON.stringify(manifest,null,2)+'\n');
    await fs.writeFile(path.join(source,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
  }
  if(!forCI)await git(source,['init','--quiet','--initial-branch=content/draft']);
  await git(source,['add','.']);
  await git(source,['rm','--cached','--ignore-unmatch','node_modules']);
  await git(source,['-c','user.name=Fixture','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-qm','Isolierte Offline-Fixture']);
  await git(source,['branch','-f','main']);
  return {root,source,store:await new NativeStore(source,{remote:false,site:await createFlyingStarsAdapter(source),runtime:resolveRuntimeOptions({values:{siteRoot:source,stateDir:path.join(root,'state')}})}).init()};
}
