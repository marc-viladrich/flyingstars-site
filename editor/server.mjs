import {editorEntry,isSitePage,loginReturn,topLevelVisit} from './entry.mjs';
import {previewSitePath,savedIsLive} from './web/frontend-url.mjs';
import {withPreviewBar} from './preview-page.mjs';
import http from 'node:http';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeStore,failure} from './native-store.mjs';
import {createExtensionRegistry} from './core/extensions.mjs';
import {NativeBuilder} from './native-builder.mjs';
import {NativePublisher} from './native-publisher.mjs';
import {uploadNativeMedia} from './native-media.mjs';
import {NativeTranslation} from './native-translation.mjs';
import {PreviewService} from './preview/service.mjs';
import {planMigrations} from './migrations/index.mjs';
import {LiveDriver} from './preview/live-driver.mjs';
import {StaticDriver} from './preview/static-driver.mjs';
import {createTranslationCore,executeBatched,loadMemory,saveMemory} from './translation-core.mjs';
import {translationProvider} from './translation-providers.mjs';
import {EditorAuth} from './auth.mjs';
import {isMain,assertStateLocation} from './paths.mjs';
import {resolveRuntimeOptions} from './runtime-options.mjs';
import {createFlyingStarsAdapter as createSiteAdapter} from './flyingstars-adapter.mjs';
// Browser modules the editor itself imports outside editor/web (its core, the vendored product decoder).
// They belong to the editor, so every site gets them without listing them in its adapter.
const editorRoot=fileURLToPath(new URL('./',import.meta.url));
export const EDITOR_BROWSER_MODULES=Object.freeze(['/core/metadata.mjs','/web/sha256.mjs',...['schema/spec','markers/client','markers/protocol','content/index','content/translation-paths'].map(name=>`/vendor/astro-frontend-editor/src/${name}.mjs`)]);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.pdf':'application/pdf','.mp4':'video/mp4'};
// Routes of a built site: every index.html below it, as /path/; redirect stubs are not pages. Cached per build.
const routeCache=new Map();
export async function builtRoutes(site){
 if(!routeCache.has(site))routeCache.set(site,(async()=>{
  const routes=[];
  const walk=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(!entry.name.startsWith('_'))await walk(file);}else if(entry.name==='index.html'&&!/<meta[^>]+http-equiv=["']?refresh/i.test(await fs.readFile(file,'utf8')))routes.push('/'+path.relative(site,dir).split(path.sep).filter(Boolean).map(part=>part+'/').join(''));}};
  await walk(site);
  return routes.sort();
 })());
 return routeCache.get(site);
}
export async function serveFile(res,base,relative,enhance=false){
 const decoded=decodeURIComponent(relative);
 if(decoded.includes('\\')||decoded.split('/').some(part=>part==='..'||part.startsWith('.')))throw failure('Pfad nicht freigegeben.',403);
 let name=path.join(base,decoded);const info=await fs.stat(name).catch(error=>{if(error.code==='ENOENT')throw failure('Nicht gefunden.',404);throw error;});if(info.isDirectory())name=path.join(name,'index.html');
 const actual=await fs.realpath(name),canonical=await fs.realpath(base);if(!actual.startsWith(canonical+path.sep))throw failure('Pfad nicht freigegeben.',403);
 let bytes=await fs.readFile(actual);
 if(typeof enhance==='function'&&name.endsWith('.html'))bytes=Buffer.from(await enhance(bytes.toString()));
 else if(enhance&&name.endsWith('.html'))bytes=Buffer.from(bytes.toString().replace('</body>','<script type="module" src="/editor/frame.js"></script></body>'));
 res.writeHead(200,{'content-type':mime[path.extname(name)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes);
}
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
async function body(req,max=1_000_000){let size=0,parts=[];for await(const piece of req){size+=piece.length;if(size>max)throw failure('Anfrage zu groß.',413);parts.push(piece);}return Buffer.concat(parts);}
async function jsonBody(req,max){if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw failure('JSON erwartet.',415);const bytes=await body(req,max);try{return JSON.parse(bytes.toString());}catch{throw failure('Ungültiges JSON.');}}
function respondError(res,error){const status=error.status||(error.name==='ZodError'||error.name==='SyntaxError'?400:error.code==='ENOENT'?404:500);if(error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));json(res,status,{error:status===500?'Interner Serverfehler.':error.message,...status===409&&typeof error.code==='string'?{code:error.code}:{}});}
/** One composition root for the pilot. `options` is already resolved for CLI callers.
 * The flat arguments remain available to existing host smoke tests and embedders.
 */
export async function startNativeServers({options,site,auth=false,listen=true,initialize=true,remote,preview=false,source:legacySource,runtimeRoot:legacyState,port,publicPort,editorOrigin,publicWebroot}={}){
 const runtime=options||resolveRuntimeOptions({values:{siteRoot:legacySource,stateDir:legacyState,remote,auth:typeof auth==='object'?true:auth,preview,port,publicPort,editorOrigin,publicWebroot}});
 const {siteRoot:sourceDir,stateDir,editorOrigin:origin,canonicalOrigin:publicOrigin}=runtime;
 await assertStateLocation(sourceDir,stateDir,runtime.publicWebroot);
 const canonicalOrigin=new URL(origin);
 const authentication=runtime.auth.enabled?await new EditorAuth({...runtime.auth,sessionDir:path.join(stateDir,'runtime-private'),secure:canonicalOrigin.protocol==='https:',...(typeof auth==='object'?auth:{})}).init({forbiddenRoots:runtime.auth.forbiddenRoots}):null;
 const configuredSite=site||await createSiteAdapter(sourceDir);
 const adapter={...configuredSite,extensions:createExtensionRegistry([...configuredSite.extensions.definitions,...runtime.extensions])};
 // Content in an older format would be read wrongly and written in a mix of formats: migrate first.
 const pending=await planMigrations({root:sourceDir,site:adapter});
 if(pending.length)throw Error(`Inhalte im alten Format (${pending.map(plan=>plan.id).join(', ')}). Erst ausführen: node editor/migrate.mjs --apply, dann committen.`);
 const languages=adapter.extensions.first('languages')??{source:'de',locales:{}};
 const store=await new NativeStore(sourceDir,{site:adapter,runtime}).init();
 const builder=new NativeBuilder(store,stateDir,{origin});if(initialize)await builder.init();
 const previewEnv={...runtime.processEnv,...runtime.buildEnv};
 const driver=runtime.preview.driver==='live'?new LiveDriver(store,stateDir,{...runtime.preview,origin,env:previewEnv}):runtime.preview.driver==='static'?new StaticDriver(store,stateDir,{origin,node:runtime.preview.node,env:previewEnv}):null;
 const previews=driver?new PreviewService(driver,store):null;
 if(previews)previews.init().catch(error=>console.error('Vorschau:',error.message));
 const publicBuilder=new NativeBuilder(store,stateDir,{editor:false,origin:publicOrigin,runtimeName:'runtime-public'});
 const publisher=new NativePublisher(store,publicBuilder),translation=new NativeTranslation({...runtime.translation,...languages});
 const {plan:planTranslation,mergeIntoTranslations}=createTranslationCore(adapter);

 if(initialize)await publisher.init();
 const root=runtime.editorAssets,source=sourceDir,runtimeRoot=stateDir;
 // A save is published only if its site builds (AFE502); otherwise nothing is saved and the person learns why.
 store.verify=async head=>{try{await builder.prepare(head);}catch(error){throw failure('Dieser Stand lässt sich nicht aufbauen, deshalb wurde nichts gespeichert: '+String(error.message||error).split('\n').find(line=>line.trim())?.slice(0,300),422);}};
 const buildSaved=async(saved)=>store.exclusive(async()=>{try{await builder.build(saved.head);return{...saved,activeHead:builder.current?.head};}catch(error){return{...saved,activeHead:builder.current?.head,buildError:error.message};}});
 const editor=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
  try{
  // Local only: localhost is the same machine as 127.0.0.1; one address keeps Origin and cookie consistent.
  if(canonicalOrigin.hostname==='127.0.0.1'&&req.headers.host==='localhost:'+canonicalOrigin.port){res.writeHead(302,{Location:origin+req.url});return res.end();}
  if(req.headers.host!==new URL(origin).host)throw failure('Host nicht erlaubt.',403);
  const url=new URL(req.url,origin),p=url.pathname;
  if(p!=='/editor'&&!p.startsWith('/editor/'))res.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
  if(req.method==='GET'&&p==='/editor'){res.writeHead(302,{location:editorEntry(url)});return res.end();}
  const publicLoginGet=req.method==='GET'&&['/editor/login','/editor/login.js','/editor/editor.css','/editor/ui-tokens.css'].includes(p);
  const publicLoginPost=req.method==='POST'&&p==='/editor/api/login';
  let session=null;
  if(authentication&&!publicLoginGet&&!publicLoginPost){
   session=await authentication.session(req);
   if(!session){
    const page=req.method==='GET'&&!p.startsWith('/editor/api/')&&!p.startsWith('/_')&&!p.startsWith('/@')&&(path.extname(p)==='.html'||!path.extname(p)&&(!p.startsWith('/editor/')||p==='/editor/'));
    if(page){res.writeHead(302,{location:'/editor/login?next='+encodeURIComponent(loginReturn(url))});return res.end();}
    return json(res,401,{error:'Nicht angemeldet.'});
   }
   if(session.cookie)res.setHeader('Set-Cookie',session.cookie);
  }
  if(topLevelVisit(req)&&isSitePage(p)){res.writeHead(302,{location:editorEntry(url)});return res.end();}
  if(req.method==='POST'){
   if(req.headers.origin!==origin)throw failure('Origin nicht erlaubt.',403);
   if(session)authentication.requireCsrf(req,session);
  }
  const actor=session?{name:session.user.displayName,email:session.user.email}:undefined;
  const previewOwner=session?'user:'+session.user.id:'local';
  if(req.method==='GET'&&p==='/editor/login')return await serveFile(res,root,'/login.html');
  if(req.method==='POST'&&p==='/editor/api/login'){
   if(!authentication)throw failure('Anmeldung ist nicht aktiv.',503);
   const loggedIn=await authentication.login(await jsonBody(req,4096),req);res.setHeader('Set-Cookie',loggedIn.cookie);
   return json(res,200,{user:{id:loggedIn.session.user.id,username:loggedIn.session.user.username,displayName:loggedIn.session.user.displayName},csrf:loggedIn.session.csrf});
  }
  if(req.method==='GET'&&p==='/editor/api/session')return json(res,200,session?{user:{id:session.user.id,username:session.user.username,displayName:session.user.displayName},csrf:session.csrf}:{user:null,csrf:null});
  if(req.method==='POST'&&p==='/editor/api/logout'){
   if(authentication)res.setHeader('Set-Cookie',await authentication.destroySession(req));
   return json(res,200,{ok:true});
  }
  if(req.method==='GET'&&p==='/editor/api/state')return json(res,200,{...await store.state(),activeHead:builder.current?.head});
  // Every page of the active editor build, also those without a record of their own (a catalogue, a contact page).
  if(req.method==='GET'&&p==='/editor/api/routes')return json(res,200,{head:builder.current?.head??null,routes:builder.current?await builtRoutes(builder.current.site):[]});
  // Media library of the saved draft: collections by directly using record type + usage per asset.
  // Unsaved draft changes are added in the browser with the same resolver (web/media-usage.mjs).
  if(req.method==='GET'&&p==='/editor/api/media'){const saved=await store.state();return json(res,200,{head:saved.head,basis:'saved-draft',...adapter.extensions.require('mediaLibrary',saved.records)});}
  if(req.method==='GET'&&p==='/editor/api/review')return json(res,200,await publisher.review());
  if(req.method==='GET'&&p==='/editor/api/translation')return json(res,200,translation.status());
  if(req.method==='POST'){
   if(p==='/editor/api/save')return json(res,200,await buildSaved(await store.save(await jsonBody(req,20_000_000),{actor})));
   if(p==='/editor/api/publish')return json(res,200,await publisher.publish(await jsonBody(req),{actor}));
   if(p==='/editor/api/translate')return json(res,200,await translation.suggest(await jsonBody(req)));
        if(p==='/editor/api/translate-missing'){
          // Machine translation of missing/changed texts; results go into the editor draft, not to git.
          // Scope: this page (ids) or the whole site (optionally only some kinds of content), one or more languages.
          // The run streams progress as NDJSON lines so the editor can show a real progress bar.
          const request=await jsonBody(req),locales=[...new Set((Array.isArray(request?.locales)?request.locales:[request?.locale]).filter(l=>Object.hasOwn(languages.locales,l)))];if(!locales.length)throw failure('Ungültige Sprache.');
          const provider=translationProvider(runtime.translation.provider,{...runtime.translation,key:runtime.translation.provider==='deepl'?runtime.translation.deeplKey:runtime.translation.key}),state=await store.state(),memoryFile=path.join(runtimeRoot,'translation-memory.json'),memory=await loadMemory(memoryFile);
          const kindOf=id=>adapter.extensions.first('recordGroup',id);
          let ids;
          if(request.scope==='site'){const kinds=Array.isArray(request.kinds)?new Set(request.kinds):null;ids=state.records.map(r=>r.id).filter(id=>kindOf(id)&&(!kinds||kinds.has(kindOf(id))));}
          else{if(!Array.isArray(request.ids)||!request.ids.length||request.ids.length>400||request.ids.some(id=>typeof id!=='string'))throw failure('Bitte 1 bis 400 Inhalte auswählen.');ids=request.ids;}
          const budget=runtime.translation.budget,plans=locales.map(locale=>planTranslation({records:state.records,locale,memory,ids}));
          const byKind={};for(const planned of plans)for(const job of planned.jobs){const kind=kindOf(job.ownerId);byKind[kind]??={fields:0,chars:0};byKind[kind].fields++;byKind[kind].chars+=job.segments.reduce((n,part)=>n+(part.key&&!memory.entries[part.key]?[...(part.text||'')].length:0),0);}
          const summary={provider:provider?.id||null,providerLabel:provider?.label||null,budget,fields:plans.reduce((n,p)=>n+p.jobs.length,0),chars:plans.reduce((n,p)=>n+p.chars,0),cachedChars:plans.reduce((n,p)=>n+p.cachedChars,0),locales:Object.fromEntries(locales.map((l,i)=>[l,{fields:plans[i].jobs.length,chars:plans[i].chars}])),kinds:byKind};
          if(request.dryRun||!provider||!summary.fields)return json(res,200,summary);
          res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8'});
          const line=data=>res.write(JSON.stringify(data)+'\n');
          const total=summary.chars;let doneBefore=0,billedAll=0,skippedAll=0,failedAll=0,exhausted=false,remaining=0;const errors=[],out=[];
          try{
           for(const [i,locale] of locales.entries()){
            const planned=plans[i];
            line({type:'progress',locale,sent:doneBefore,total});
            const result=await executeBatched(planned,provider,{memory,maxChars:Math.min(provider.batchChars||3000,budget),budgetChars:budget,onBatch:({sent})=>line({type:'progress',locale,sent:doneBefore+sent,total})});
            await saveMemory(memoryFile,memory);
            doneBefore+=planned.chars;billedAll+=result.billed||0;skippedAll+=result.skippedFields||0;failedAll+=result.failedSegments||0;exhausted||=result.budgetExhausted;remaining+=result.remainingSegments||0;errors.push(...(result.errors||[]));
            const merged=mergeIntoTranslations({records:state.records,locale,values:result.values}).map(({id,data})=>({id,data}));
            // Explicit choice in the dialog: take the suggestions as reviewed (they become public on the next publication).
            if(request.accept)adapter.extensions.require('translationStorage').accept(merged,result.values);
            out.push(...merged);
           }
           line({type:'done',...summary,billedCharacters:billedAll,skippedFields:skippedAll,failedSegments:failedAll,budgetExhausted:exhausted,remainingSegments:remaining,errors:errors.slice(0,3),records:out});
          }catch(error){line({type:'error',error:error.status===413||error.status===429?error.message:(error.message||'Übersetzung fehlgeschlagen.')});}
          return res.end();
        }
   // One preview lease per editor tab, bound to the login (see preview/service.mjs).
   if(p==='/editor/api/preview/lease'){if(!previews)throw failure('Die Vorschau ist nicht aktiv.',503);return json(res,200,previews.lease(previewOwner));}
   if(p==='/editor/api/preview'){if(!previews)throw failure('Die Vorschau ist nicht aktiv.',503);return json(res,200,await previews.render(await jsonBody(req,20_000_000),previewOwner));}
   // Builds the saved draft if it is not built yet (a save from another tab, a sync) and waits for it.
   if(p==='/editor/api/build'){const head=await store.head();try{await store.exclusive(()=>builder.build(head));return json(res,200,{head,activeHead:builder.current?.head});}catch(error){return json(res,200,{head,activeHead:builder.current?.head,buildError:error.message});}}
   if(p==='/editor/api/media'){
    if(!adapter.extensions.require('mediaPolicy').mime.test(req.headers['content-type']||''))throw failure('PNG, JPEG oder WebP erwartet.',415);
    const uploaded=await uploadNativeMedia(store,{bytes:await body(req,adapter.extensions.require('mediaPolicy').maxBytes),name:decodeURIComponent(String(req.headers['x-filename']||'')),requestId:req.headers['x-request-id'],expectedHead:req.headers['x-expected-head'],actor});
    return json(res,200,{...uploaded,state:await buildSaved(uploaded.state)});
   }
  }
  if(req.method==='GET'){
   if(p==='/editor/marked.mjs')return await serveFile(res,path.join(source,'node_modules/marked/lib'),'/marked.esm.js');
   if(EDITOR_BROWSER_MODULES.includes(p))return await serveFile(res,editorRoot,p);
   if(Object.hasOwn(adapter.browserFiles,p))return await serveFile(res,source,adapter.browserFiles[p]);
   if(p==='/public/'||p==='/public'){res.writeHead(302,{location:publicOrigin+'/'});return res.end();}
   if(p.startsWith('/editor/shared/'))return await serveFile(res,root,p.slice('/editor/shared'.length));
   if(p.startsWith('/editor/'))return await serveFile(res,root,p==='/editor/'?'/index.html':p.slice('/editor'.length));
   if(previews?.driver.proxy&&previews.handles(p))return await previews.driver.proxy(req,res);
   // The saved draft as plain pages (no editor chrome) with a bar that says so; see preview-page.mjs.
   const previewPath=previewSitePath(p);
   if(previewPath!==null){
    if(p==='/vorschau'){res.writeHead(302,{location:'/vorschau/'+url.search});return res.end();}
    const [draftHead,shown,live]=[await store.head(),builder.current,publicBuilder.current];
    const liveFile=live&&await fs.stat(path.join(live.site,decodeURIComponent(previewPath),previewPath.endsWith('/')?'index.html':'')).then(()=>true,()=>false);
    return await serveFile(res,shown.site,previewPath,html=>withPreviewBar(html,{live:savedIsLive({draftHead,activePublishedHead:live?.head}),draftHead,shownHead:shown.head,liveURL:liveFile?new URL(previewPath,publicOrigin).href:null}));
   }
   // Assets of a draft render (static driver) exist only in its artifact, after the saved build.
   if(previews?.driver.assetRoots&&previews.handles(p))for(const base of [builder.current.site,...previews.driver.assetRoots()]){try{return await serveFile(res,base,p);}catch(error){if(error.status!==404)throw error;}}
   return await serveFile(res,builder.current.site,p,url.searchParams.get('editor')==='1');
  }
  throw failure('Route fehlt.',404);
 }catch(error){respondError(res,error);}});
 const publicServer=http.createServer(async(req,res)=>{try{
  if(req.headers.host!==new URL(publicOrigin).host)throw failure('Host nicht erlaubt.',403);
  if(req.method!=='GET')throw failure('Öffentliche Ausgabe ist schreibgeschützt.',405);
  await serveFile(res,publicBuilder.current.site,new URL(req.url,publicOrigin).pathname);
 }catch(error){respondError(res,error);}});
 if(listen){
  await new Promise((resolve,reject)=>{editor.once('error',reject);editor.listen(runtime.port,'127.0.0.1',resolve);});
  try{if(!runtime.publicWebroot)await new Promise((resolve,reject)=>{publicServer.once('error',reject);publicServer.listen(runtime.publicPort,'127.0.0.1',resolve);});}catch(error){editor.close();throw error;}
 }
 return{store,builder,publisher,editor,publicServer,origin,publicOrigin,auth:authentication,options:runtime,preview:previews};
}
export async function runEditor(args=process.argv.slice(2)){
 try{const started=await startNativeServers({options:resolveRuntimeOptions({args,authDefault:true,previewDefault:true})});console.log('REAL Relaunch editor: '+started.origin+'/editor/ (loopback listener)');console.log('Static public simulation: '+started.publicOrigin+'/');}
 catch(error){console.error(error.message);process.exitCode=1;}
}

if(isMain(import.meta.url)) await runEditor();
