import http from 'node:http';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeStore,failure} from './native-store.mjs';
import {NativeBuilder} from './native-builder.mjs';
import {NativePublisher} from './native-publisher.mjs';
import {uploadNativeMedia} from './native-media.mjs';
import {NativeTranslation} from './native-translation.mjs';
import {NativePreview} from './native-preview.mjs';
import {plan as planTranslation,executeBatched,loadMemory,saveMemory,mergeIntoTranslations} from './translation-core.mjs';
import {translationProvider} from './translation-providers.mjs';
import {EditorAuth} from './auth.mjs';
import {editorRoot as root,sourceRoot,stateRoot,isMain,assertStateLocation} from './paths.mjs';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.pdf':'application/pdf','.mp4':'video/mp4'};
export async function serveFile(res,base,relative,enhance=false){
 const decoded=decodeURIComponent(relative);
 if(decoded.includes('\\')||decoded.split('/').some(part=>part==='..'||part.startsWith('.')))throw failure('Pfad nicht freigegeben.',403);
 let name=path.join(base,decoded);const info=await fs.stat(name).catch(error=>{if(error.code==='ENOENT')throw failure('Nicht gefunden.',404);throw error;});if(info.isDirectory())name=path.join(name,'index.html');
 const actual=await fs.realpath(name),canonical=await fs.realpath(base);if(!actual.startsWith(canonical+path.sep))throw failure('Pfad nicht freigegeben.',403);
 let bytes=await fs.readFile(actual);
 if(enhance&&name.endsWith('.html'))bytes=Buffer.from(bytes.toString().replace('</body>','<script type="module" src="/editor/frame.js"></script></body>'));
 res.writeHead(200,{'content-type':mime[path.extname(name)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes);
}
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
async function body(req,max=1_000_000){let size=0,parts=[];for await(const piece of req){size+=piece.length;if(size>max)throw failure('Anfrage zu groß.',413);parts.push(piece);}return Buffer.concat(parts);}
async function jsonBody(req,max){if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw failure('JSON erwartet.',415);const bytes=await body(req,max);try{return JSON.parse(bytes.toString());}catch{throw failure('Ungültiges JSON.');}}
function respondError(res,error){const status=error.status||(error.name==='ZodError'||error.name==='SyntaxError'?400:error.code==='ENOENT'?404:500);if(error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));json(res,status,{error:status===500?'Interner Serverfehler.':error.message});}
export async function startNativeServers({auth=false,listen=true,initialize=true,remote,preview:livePreview=false,source=sourceRoot,runtimeRoot=stateRoot(),port=Number(process.env.PORT||process.env.RELAUNCH_PORT||4542),publicPort=Number(process.env.RELAUNCH_PUBLIC_PORT||4543),editorOrigin=process.env.EDITOR_ORIGIN}={}){
 await assertStateLocation(source,runtimeRoot,process.env.FLYINGSTARS_PUBLIC_WEBROOT);
 const origin=editorOrigin||'http://127.0.0.1:'+port,publicOrigin=process.env.SITE_URL||'http://127.0.0.1:'+publicPort;
 const canonicalOrigin=new URL(origin);if(canonicalOrigin.origin!==origin||!['http:','https:'].includes(canonicalOrigin.protocol))throw failure('EDITOR_ORIGIN muss eine vollständige Origin ohne Pfad sein.');
 if(auth&&canonicalOrigin.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(canonicalOrigin.hostname))throw failure('Anmeldung benötigt eine HTTPS-Origin.');
 const authentication=auth?await new EditorAuth({secure:canonicalOrigin.protocol==='https:',...(auth===true?{}:auth)}).init({forbiddenRoots:[source,path.join(runtimeRoot,'runtime'),path.join(runtimeRoot,'runtime-public'),path.join(runtimeRoot,'preview')]}):null;
 const store=await new NativeStore(source,{remote}).init();
 const builder=new NativeBuilder(store,runtimeRoot,{origin});if(initialize)await builder.init();
 // Live preview of unsaved drafts (warm astro dev on a worktree); started in the background, optional.
 const preview=livePreview?new NativePreview(store,runtimeRoot,{port:Number(process.env.RELAUNCH_PREVIEW_PORT||port+2),origin}):null;
 if(preview)preview.init().catch(error=>console.error('Live-Vorschau:',error.message));
 const publicBuilder=new NativeBuilder(store,runtimeRoot,{editor:false,origin:publicOrigin,runtimeName:'runtime-public'});
 const publisher=new NativePublisher(store,publicBuilder),translation=new NativeTranslation();if(initialize)await publisher.init();
 const buildSaved=async(saved)=>store.exclusive(async()=>{try{await builder.build(saved.head);return{...saved,activeHead:builder.current?.head};}catch(error){return{...saved,activeHead:builder.current?.head,buildError:error.message};}});
 const editor=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
  try{
  // Local only: localhost is the same machine as 127.0.0.1; one address keeps Origin and cookie consistent.
  if(canonicalOrigin.hostname==='127.0.0.1'&&req.headers.host==='localhost:'+canonicalOrigin.port){res.writeHead(302,{Location:origin+req.url});return res.end();}
  if(req.headers.host!==new URL(origin).host)throw failure('Host nicht erlaubt.',403);
  const url=new URL(req.url,origin),p=url.pathname;
  if(p!=='/editor'&&!p.startsWith('/editor/'))res.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
  const publicLoginGet=req.method==='GET'&&['/editor/login','/editor/login.js','/editor/editor.css'].includes(p);
  const publicLoginPost=req.method==='POST'&&p==='/editor/api/login';
  let session=null;
  if(authentication&&!publicLoginGet&&!publicLoginPost){
   session=await authentication.session(req);
   if(!session){
    const page=req.method==='GET'&&!p.startsWith('/editor/api/')&&!p.startsWith('/_')&&!p.startsWith('/@')&&(path.extname(p)==='.html'||!path.extname(p)&&(!p.startsWith('/editor/')||p==='/editor/'));
    if(page){res.writeHead(302,{location:'/editor/login?next='+encodeURIComponent(p+url.search)});return res.end();}
    return json(res,401,{error:'Nicht angemeldet.'});
   }
  }
  if(req.method==='POST'){
   if(req.headers.origin!==origin)throw failure('Origin nicht erlaubt.',403);
   if(session)authentication.requireCsrf(req,session);
  }
  const actor=session?{name:session.user.displayName,email:session.user.email}:undefined;
  if(req.method==='GET'&&p==='/editor/login')return await serveFile(res,path.join(root,'web'),'/login.html');
  if(req.method==='POST'&&p==='/editor/api/login'){
   if(!authentication)throw failure('Anmeldung ist nicht aktiv.',503);
   const loggedIn=await authentication.login(await jsonBody(req,4096),req);res.setHeader('Set-Cookie',loggedIn.cookie);
   return json(res,200,{user:{id:loggedIn.session.user.id,username:loggedIn.session.user.username,displayName:loggedIn.session.user.displayName},csrf:loggedIn.session.csrf});
  }
  if(req.method==='GET'&&p==='/editor/api/session')return json(res,200,session?{user:{id:session.user.id,username:session.user.username,displayName:session.user.displayName},csrf:session.csrf}:{user:null,csrf:null});
  if(req.method==='POST'&&p==='/editor/api/logout'){
   if(authentication)res.setHeader('Set-Cookie',authentication.destroySession(req));
   return json(res,200,{ok:true});
  }
  if(req.method==='GET'&&p==='/editor/api/state')return json(res,200,{...await store.state(),activeHead:builder.current?.head});
  if(req.method==='GET'&&p==='/editor/api/media')return json(res,200,{assets:(await store.state()).records.filter(r=>r.id.startsWith('media/'))});
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
          const request=await jsonBody(req),locales=[...new Set((Array.isArray(request?.locales)?request.locales:[request?.locale]).filter(l=>['en','nl'].includes(l)))];if(!locales.length)throw failure('Ungültige Sprache.');
          const provider=translationProvider(),state=await store.state(),memoryFile=path.join(runtimeRoot,'translation-memory.json'),memory=await loadMemory(memoryFile);
          const kindOf=id=>/^(page|screen)\//.test(id)?'pages':/^(project|post)\//.test(id)?'stories':id.startsWith('faq/')?'faq':id.startsWith('package/')?'packages':/^(client|team)\//.test(id)?'people':id.startsWith('site/')?'site':null;
          let ids;
          if(request.scope==='site'){const kinds=Array.isArray(request.kinds)?new Set(request.kinds):null;ids=state.records.map(r=>r.id).filter(id=>kindOf(id)&&(!kinds||kinds.has(kindOf(id))));}
          else{if(!Array.isArray(request.ids)||!request.ids.length||request.ids.length>400||request.ids.some(id=>typeof id!=='string'))throw failure('Bitte 1 bis 400 Inhalte auswählen.');ids=request.ids;}
          const budget=Number(process.env.EDITOR_TRANSLATION_BUDGET||5000),plans=locales.map(locale=>planTranslation({records:state.records,locale,memory,ids}));
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
            if(request.accept)for(const r of merged){const fresh=new Set([...result.values.get(r.data.sourceId)?.entries||[]].map(e=>JSON.stringify(e.path)));for(const v of r.data.values)if(fresh.has(JSON.stringify(v.path)))v.reviewed=true;}
            out.push(...merged);
           }
           line({type:'done',...summary,billedCharacters:billedAll,skippedFields:skippedAll,failedSegments:failedAll,budgetExhausted:exhausted,remainingSegments:remaining,errors:errors.slice(0,3),records:out});
          }catch(error){line({type:'error',error:error.status===413||error.status===429?error.message:(error.message||'Übersetzung fehlgeschlagen.')});}
          return res.end();
        }
        if(p==='/editor/api/preview'){if(!preview)throw failure('Live-Vorschau ist nicht aktiv.',503);return json(res,200,await preview.render(await jsonBody(req,20_000_000)));}
   if(p==='/editor/api/media'){
    if(!/^image\/(png|jpeg|webp)$/.test(req.headers['content-type']||''))throw failure('PNG, JPEG oder WebP erwartet.',415);
    const uploaded=await uploadNativeMedia(store,{bytes:await body(req,5*1024*1024),name:decodeURIComponent(String(req.headers['x-filename']||'')),requestId:req.headers['x-request-id'],expectedHead:req.headers['x-expected-head'],actor});
    return json(res,200,{...uploaded,state:await buildSaved(uploaded.state)});
   }
  }
  if(req.method==='GET'){
   if(p==='/editor/marked.mjs')return await serveFile(res,path.join(source,'node_modules/marked/lib'),'/marked.esm.js');
   if(p==='/editor/site-lib/inline-text.mjs'||p==='/editor/site-lib/editorial-text.mjs')return await serveFile(res,path.join(source,'src/lib'),p.slice('/editor/site-lib'.length));
   if(p==='/editor/package-ids.mjs')return await serveFile(res,path.join(source,'src/content'),'/package-ids.mjs');
   if(p==='/editor/package-ownership.mjs')return await serveFile(res,path.join(source,'src/content'),'/package-ownership.mjs');
   if(p==='/public/'||p==='/public'){res.writeHead(302,{location:publicOrigin+'/'});return res.end();}
   if(p.startsWith('/editor/shared/'))return await serveFile(res,path.join(root,'web'),p.slice('/editor/shared'.length));
   if(p.startsWith('/editor/'))return await serveFile(res,path.join(root,'web'),p==='/editor/'?'/index.html':p.slice('/editor'.length));
   if(preview&&(p.startsWith('/_image')||p.startsWith('/@fs/')))return await preview.proxy(req,res,p);
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
  await new Promise((resolve,reject)=>{editor.once('error',reject);editor.listen(port,'127.0.0.1',resolve);});
  try{if(!process.env.FLYINGSTARS_PUBLIC_WEBROOT)await new Promise((resolve,reject)=>{publicServer.once('error',reject);publicServer.listen(publicPort,'127.0.0.1',resolve);});}catch(error){editor.close();throw error;}
 }
 return{store,builder,publisher,editor,publicServer,origin,publicOrigin,auth:authentication};
}
export async function runEditor(){
 try{const started=await startNativeServers({auth:process.env.EDITOR_AUTH!=='off',preview:process.env.RELAUNCH_PREVIEW!=='0'});console.log('REAL Relaunch editor: '+started.origin+'/editor/ (loopback listener)');console.log('Static public simulation: '+started.publicOrigin+'/');}
 catch(error){console.error(error.message);process.exitCode=1;}
}

if(isMain(import.meta.url)) await runEditor();
