import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {resolveRuntimeOptions,environmentOptions} from './runtime-options.mjs';
import {assertStateLocation} from './paths.mjs';
import {startNativeServers} from './server.mjs';
import {hashPassword} from './auth.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {NativeStore,git} from './native-store.mjs';
import {NativePublisher} from './native-publisher.mjs';
import {createTranslationCore} from './translation-core.mjs';
import {translationProvider} from './translation-providers.mjs';

const run=promisify(execFile),siteRoot=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
// The editor reads its draft branch; in a worktree on another branch that is the checked-out one, not the shared content/draft.
const draftBranch=(await promisify(execFile)('git',['-C',siteRoot,'rev-parse','--abbrev-ref','HEAD'])).stdout.trim();
async function temporary(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'afe-options-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}

test('Runtime paths use the supplied root and cwd; host options stay outside the site adapter',()=>{
 const options=resolveRuntimeOptions({cwd:'/tmp',env:{},args:['--site-root',siteRoot,'--state-dir','private-state','--auth','on','--preview','off']});
 assert.equal(options.siteRoot,siteRoot);assert.equal(options.stateDir,'/tmp/private-state');
 assert.equal(options.auth.file,'/tmp/private-state/runtime-private/editor-accounts.json');
 assert.equal(options.auth.enabled,true);assert.equal(options.preview.enabled,false);
 // The default root is the installed site, not the caller's cwd (legacy `node relaunch/server.mjs` from the project folder).
 const installed=path.dirname(path.dirname(fileURLToPath(new URL('./runtime-options.mjs',import.meta.url))));
 assert.equal(resolveRuntimeOptions({cwd:'/tmp/site',env:{}}).siteRoot,installed);
 assert.equal(resolveRuntimeOptions({cwd:'/tmp/site',env:{}}).stateDir,path.dirname(installed));
 assert.equal(options.git.remote,null);assert.ok(Object.isFrozen(options));
});

test('Every deprecated environment alias resolves identically; AFE names and CLI take precedence',()=>{
 const samples={siteRoot:'/tmp/site',stateDir:'/tmp/state',publicWebroot:'/tmp/www',editorOrigin:'https://editor.example.org',canonicalOrigin:'https://example.org',port:'6123',publicPort:'6124',preview:'0',previewPort:'6125',remote:'origin',draftBranch:'editor/draft',publishedBranch:'release',auth:'on',accounts:'/tmp/accounts.json',sessionSecret:'x'.repeat(32),translationProvider:'fake',translationUrl:'https://translate.example.org',translationKey:'test-key',translationBudget:'42',deeplKey:'test:fx',translationEmail:'test@example.invalid',offlineMedia:'1',mediaHost:'media.example.invalid'};
 for(const[key,names]of Object.entries(environmentOptions))for(const name of names){
  const canonical=resolveRuntimeOptions({cwd:'/tmp',env:{[names[0]]:samples[key]}});
  const {processEnv:actualEnv,...actual}=resolveRuntimeOptions({cwd:'/tmp',env:{[name]:samples[key]}});
  const {processEnv:expectedEnv,...expected}=canonical;assert.deepEqual(actual,expected,name);
 }
 const options=resolveRuntimeOptions({env:{AFE_STATE_DIR:'/tmp/generic',FLYINGSTARS_STATE_DIR:'/tmp/legacy',AFE_PORT:'6200',PORT:'6201',RELAUNCH_PORT:'6202'},args:['--state-dir=/tmp/cli','--port','6203']});
 assert.equal(options.stateDir,'/tmp/cli');assert.equal(options.port,6203);
 assert.equal(resolveRuntimeOptions({env:{AFE_GIT_REMOTE:'',FLYINGSTARS_GIT_REMOTE:'origin'}}).git.remote,'');
});

test('Resolved settings are snapshots; malformed CLI, origins, ports and branches fail clearly',()=>{
 const env={EDITOR_TRANSLATION_PROVIDER:'fake',FLYINGSTARS_OFFLINE_MEDIA:'1'};
 const options=resolveRuntimeOptions({env});env.EDITOR_TRANSLATION_PROVIDER='none';env.FLYINGSTARS_OFFLINE_MEDIA='0';
 assert.equal(options.translation.provider,'fake');assert.equal(options.buildEnv.FLYINGSTARS_OFFLINE_MEDIA,'1');
 for(const args of [['--unknown','x'],['--state-dir'],['--port','NaN'],['--port','0'],['--auth','on','--editor-origin','http://example.org'],['--editor-origin','https://example.org/path'],['--draft-branch','bad..branch'],['--translation-budget','-1']])assert.throws(()=>resolveRuntimeOptions({args,env:{}}));
});

test('Startup rejects source/public overlaps before auth, adapter loading, writes or listening',async t=>{
 const root=await temporary(t),source=path.join(root,'source'),state=path.join(root,'private'),webroot=path.join(root,'www');
 const cases=[
  ['state equals source',source,source,webroot],
  ['state below source',source,path.join(source,'private'),webroot],
  ['state equals public',source,webroot,webroot],
  ['state below public',source,path.join(webroot,'private'),webroot],
  ['public below state',source,state,path.join(state,'www')],
  ['public equals source',source,state,source],
  ['public below source',source,state,path.join(source,'public')],
  ['source below public',path.join(webroot,'source'),state,webroot],
 ];
 for(const[name,siteRoot,stateDir,publicWebroot]of cases)await t.test(name,async()=>{
  const options=resolveRuntimeOptions({env:{},values:{siteRoot,stateDir,publicWebroot,auth:true}});
  await assert.rejects(startNativeServers({options}),/außerhalb|getrennt/);
 });
 await assert.rejects(fs.access(root+'/private'));
 await assertStateLocation(source,state,webroot);
 await assertStateLocation(source,path.dirname(source),root+'-www'); // Legacy sibling layout remains supported.
});

test('State checks resolve symlinks and missing descendants, and also protect lexical webroot locations',async t=>{
 const root=await temporary(t),source=path.join(root,'source'),state=path.join(root,'private'),webroot=path.join(root,'www');
 await fs.mkdir(source);await fs.mkdir(state);await fs.mkdir(webroot);
 await fs.symlink(source,path.join(root,'source-link'));await fs.symlink(webroot,path.join(root,'web-link'));
 await assert.rejects(assertStateLocation(source,path.join(root,'source-link/missing/state'),webroot),/außerhalb/);
 await assert.rejects(assertStateLocation(source,path.join(root,'web-link/missing/state'),webroot),/getrennt/);
 await fs.symlink(state,path.join(root,'public-link'));
 await assert.rejects(assertStateLocation(source,state,path.join(root,'public-link')),/getrennt/);
 await fs.symlink(webroot,path.join(state,'public-link'));
 await assert.rejects(assertStateLocation(source,state,path.join(state,'public-link')),/getrennt/);
});

test('Generic services contain no direct or dynamic site schema/lib imports',async()=>{
 const modules=['native-store','native-builder','native-publisher','native-preview','git-sync','auth','native-media','media-upload','native-translation','translation-core','translation-providers'];
 for(const name of modules){const text=await fs.readFile(new URL('./'+name+'.mjs',import.meta.url),'utf8');assert.doesNotMatch(text,/src\/(?:schemas|lib)(?:\/|['"])/,name);}
 const adapter=await fs.readFile(new URL('./flyingstars-adapter.mjs',import.meta.url),'utf8');
 assert.match(adapter,/src\/schemas\//);assert.match(adapter,/src\/lib\//);
});

test('Injected adapter controls routes and translation fields; custom branches reach store, publisher and sync',async t=>{
 const root=await temporary(t),source=path.join(root,'site');
 await git(siteRoot,['clone','--quiet','--no-hardlinks',siteRoot,source]);
 await git(source,['checkout','-B','editor/proposal']);await git(source,['branch','-f','release/live','HEAD']);
 await fs.symlink(await fs.realpath(path.join(siteRoot,'node_modules')),path.join(source,'node_modules'));
 const runtime=resolveRuntimeOptions({env:{PATH:process.env.PATH},values:{siteRoot:source,stateDir:path.join(root,'state'),draftBranch:'editor/proposal',publishedBranch:'release/live',remote:false}});
 const site={...await createFlyingStarsAdapter(source),recordRoute:()=>'/injected/',translatableFields:()=>[]};
 const store=await new NativeStore(source,{runtime,site}).init();t.after(()=>store.sync.close());
 assert.equal(store.sync.draftBranch,'editor/proposal');
 const state=await store.state();assert.ok(state.records.every(record=>record.route==='/injected/'));
 assert.equal(createTranslationCore(site).plan({records:state.records,locale:'en',memory:{entries:{}}}).jobs.length,0);
 const publisher=new NativePublisher(store,{origin:'https://example.org'});
 assert.equal((await publisher.review()).publishedHead,await git(source,['rev-parse','release/live']));
 const pushes=[];store.sync.remote='test-remote';store.sync.git=async(_root,args)=>pushes.push(args);
 await store.sync.flush();assert.equal(pushes[0].at(-1),(await store.head())+':refs/heads/editor/proposal');
 const provider=translationProvider('deepl',{key:'test:fx',fetcher:async(url,request)=>{assert.equal(url,'https://api-free.deepl.com/v2/translate');assert.equal(request.headers.Authorization,'DeepL-Auth-Key test:fx');return{ok:true,json:async()=>({translations:[{text:'Hello'}]})};}});
 assert.deepEqual((await provider.translate({source:'de',target:'en',texts:['Hallo']})).texts,['Hello']);
});

async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}

test('Real CLI from /tmp builds WORKTREE and serves authenticated /editor/ with isolated private state', {timeout:120000},async t=>{
 const root=await temporary(t),state=path.join(root,'state'),file=path.join(state,'runtime-private/editor-accounts.json');
 await fs.mkdir(path.dirname(file),{recursive:true});
 const password='Listener-Test äöü';
 await fs.writeFile(file,JSON.stringify({version:1,users:[{id:'listener-test',username:'tester',displayName:'Listener Test',email:'listener@example.invalid',disabled:false,passwordVersion:1,...await hashPassword(password)}]}));
 let port;try{port=await freePort();}catch(error){if(error.code==='EPERM'||error.code==='EACCES'){t.skip('Sandbox verweigert Loopback-Listener mit '+error.code+'; realer Socket-Nachweis ausstehend.');return;}throw error;}let publicPort=await freePort();while(publicPort===port)publicPort=await freePort();
 const origin='http://127.0.0.1:'+port;
 // Deliberately no inherited AFE_*, EDITOR_* or FLYINGSTARS_* settings.
 const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
 const child=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url)),
  '--site-root',siteRoot,'--state-dir',state,'--port',String(port),'--public-port',String(publicPort),
  '--auth','on','--preview','off','--git-remote','off','--draft-branch',draftBranch,'--offline-media','1'],{cwd:os.tmpdir(),env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',bytes=>output+=bytes);child.stderr.on('data',bytes=>output+=bytes);
 t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await once(child,'exit');}});
 const exited=once(child,'exit').then(([code])=>{throw Error('CLI exited '+code+': '+output);});
 await Promise.race([exited,(async()=>{for(let i=0;i<1000;i++){if(output.includes('(loopback listener)'))return;await new Promise(resolve=>setTimeout(resolve,80));}throw Error('Listener timeout: '+output);})()]);
 const denied=await fetch(origin+'/editor/',{redirect:'manual'});assert.equal(denied.status,302);assert.match(denied.headers.get('location'),/^\/editor\/login/);
 const login=await fetch(origin+'/editor/api/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username:'tester',password})});
 assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const page=await fetch(origin+'/editor/',{headers:{cookie}});assert.equal(page.status,200);assert.match(await page.text(),/editor\.js/);
 for(const route of ['/editor/site-lib/inline-text.mjs','/editor/site-lib/color-tokens.mjs','/editor/package-ids.mjs'])assert.equal((await fetch(origin+route,{headers:{cookie}})).status,200);
 const response=await fetch(origin+'/editor/api/state',{headers:{cookie}});assert.equal(response.status,200);assert.ok((await response.json()).records.length>0);
 assert.ok(JSON.parse(await fs.readFile(path.join(state,'runtime/active.json'),'utf8')).head);
 assert.ok(JSON.parse(await fs.readFile(path.join(state,'runtime-public/active.json'),'utf8')).head);
 assert.equal((await fetch('http://127.0.0.1:'+publicPort+'/')).status,200);
 child.kill('SIGTERM');await once(child,'exit');
 const bad=path.join(siteRoot,'src/private-must-not-exist');
 await assert.rejects(run(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url)),'--site-root',siteRoot,'--state-dir',bad,'--port',String(port)],{cwd:os.tmpdir(),env}),error=>error.code===1&&/außerhalb des Repository-Klons/.test(error.stderr));
 await assert.rejects(fs.access(bad));
});

test('Composition from /tmp initializes both builds and authenticated editor handlers without sockets', {timeout:120000},async t=>{
 const root=await temporary(t),state=path.join(root,'state'),file=path.join(state,'runtime-private/editor-accounts.json');
 await fs.mkdir(path.dirname(file),{recursive:true});
 const password='Handler-Test äöü';
 await fs.writeFile(file,JSON.stringify({version:1,users:[{id:'handler-test',username:'tester',displayName:'Handler Test',email:'handler@example.invalid',disabled:false,passwordVersion:1,...await hashPassword(password)}]}));
 const script=`
 import assert from 'node:assert/strict';
 import {startNativeServers} from ${JSON.stringify(new URL('./server.mjs',import.meta.url).href)};
 import {resolveRuntimeOptions} from ${JSON.stringify(new URL('./runtime-options.mjs',import.meta.url).href)};
 import {handlerRequest} from ${JSON.stringify(new URL('./deploy/handler-smoke.mjs',import.meta.url).href)};
 const options=resolveRuntimeOptions({args:process.argv.slice(1),authDefault:true});
 const app=await startNativeServers({options,listen:false});
 try {
  const denied=await handlerRequest(app.editor,app.origin,'/editor/');assert.equal(denied.status,302);
  const login=await app.auth.login({username:'tester',password:${JSON.stringify(password)}},{headers:{},socket:{remoteAddress:'127.0.0.1'}});
  const headers={cookie:login.cookie.split(';')[0]};
  const page=await handlerRequest(app.editor,app.origin,'/editor/',headers);assert.equal(page.status,200);assert.match(page.body,/editor\\.js/);
  for(const route of ['/editor/api/state','/editor/site-lib/inline-text.mjs','/editor/site-lib/color-tokens.mjs','/editor/package-ids.mjs'])assert.equal((await handlerRequest(app.editor,app.origin,route,headers)).status,200);
  assert.ok(app.builder.current.head);assert.ok(app.publisher.builder.current.head);
  console.log('Authenticated /editor/ and source services from '+process.cwd()+'; both builds active.');
 } finally {app.store.sync.close();app.editor.close();app.publicServer.close();}
 `;
 const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
 const result=await run(process.execPath,['--input-type=module','--eval',script,'--',
  '--site-root',siteRoot,'--state-dir',state,'--auth','on','--preview','off','--git-remote','off','--draft-branch',draftBranch,'--offline-media','1'],{cwd:os.tmpdir(),env,timeout:110000,maxBuffer:1000000});
 assert.match(result.stdout,/Authenticated \/editor\//);
});
