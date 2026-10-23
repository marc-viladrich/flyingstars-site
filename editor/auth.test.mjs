// Better Auth itself (passwords, sessions, MFA, cookies, limits) is tested in the astro-frontend-editor package.
// These tests cover what FlyingStars adds: its launchers, its legacy variable and cookie names, the move of its
// existing JSON accounts into the account database, and its sign-in page.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {randomBytes,scrypt as scryptCallback} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {resolveRuntimeOptions} from './server.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';

const run=promisify(execFile),scrypt=promisify(scryptCallback),here=path.dirname(fileURLToPath(import.meta.url)),siteRoot=path.resolve(here,'..');
const password='FlyingStars Testpasswort äöü 123';
// Only what the tools need; deliberately no inherited AFE_*, EDITOR_* or FLYINGSTARS_* settings.
const baseEnv=Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
async function temporary(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fs-auth-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
const accounts=(args,env={})=>run(process.execPath,[path.join(here,'manage-accounts.mjs'),...args],{cwd:os.tmpdir(),env:{...baseEnv,...env}});

test('FlyingStars keeps its session cookie name (fs_editor) and its account command through the launcher',()=>{
  const options=resolveRuntimeOptions({env:{}});
  assert.equal(options.auth.cookieName,'fs_editor');assert.equal(options.auth.accountsCommand,'node editor/manage-accounts.mjs');
  assert.equal(resolveRuntimeOptions({env:{EDITOR_ACCOUNTS:'/tmp/old.json'}}).auth.file,'/tmp/old.json','EDITOR_ACCOUNTS still names the file to import');
});

test('Account launcher: EDITOR_NEW_PASSWORD, private database next to the state, list and disable',async t=>{
  const state=await temporary(t);
  await accounts(['add','marc','--name','Marc Viladrich','--email','marc@example.invalid','--state-dir',state],{EDITOR_NEW_PASSWORD:password});
  const database=path.join(state,'runtime-private/editor-auth.sqlite');
  assert.equal((await fs.stat(database)).mode&0o777,0o600);assert.equal((await fs.stat(path.join(state,'runtime-private/editor-auth-secret'))).mode&0o777,0o600);
  assert.match((await accounts(['list','--state-dir',state])).stdout,/marc/);
  await accounts(['disable','marc','--state-dir',state]);
  const db=new DatabaseSync(database);t.after(()=>db.close());
  assert.equal(db.prepare('SELECT editorEnabled FROM user WHERE username = ?').get('marc').editorEnabled,0);
  await assert.rejects(accounts(['add','kurz','--name','Kurz','--email','k@example.invalid','--state-dir',state],{EDITOR_NEW_PASSWORD:'zu kurz'}),error=>/15 Zeichen/.test(error.stderr));
});

test('The editor refuses to start with login but without accounts, and says which FlyingStars command creates one',async t=>{
  const state=await temporary(t);
  await assert.rejects(run(process.execPath,[path.join(here,'server.mjs'),'--state-dir',state,'--auth','on','--preview','off','--git-remote','off'],{cwd:os.tmpdir(),env:baseEnv}),
    error=>error.code===1&&/node editor\/manage-accounts\.mjs add/.test(error.stderr));
  assert.equal(await fs.stat(path.join(state,'runtime')).then(()=>true,()=>false),false,'nothing was built before the refusal');
});

test('An existing FlyingStars accounts file moves into the account database once; the old file stays as the way back',async t=>{
  const state=await temporary(t),file=path.join(state,'runtime-private/editor-accounts.json');
  const salt=randomBytes(16).toString('hex'),params={N:2**15,r:8,p:1,keylen:64};
  const hash=(await scrypt('altes Passwort',Buffer.from(salt,'hex'),64,{...params,maxmem:64*1024*1024})).toString('hex');
  const legacy=JSON.stringify({version:1,users:[{id:'stable-marc',username:'marc',displayName:'Marc',email:'marc@example.invalid',disabled:false,passwordVersion:1,salt,hash,params}]});
  await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});await fs.writeFile(file,legacy,{mode:0o600});
  await assert.rejects(run(process.execPath,[path.join(here,'server.mjs'),'--state-dir',state,'--auth','on','--preview','off','--git-remote','off'],{cwd:os.tmpdir(),env:baseEnv}),
    error=>/node editor\/manage-accounts\.mjs migrate/.test(error.stderr),'the start names the migration instead of guessing');
  assert.match((await accounts(['migrate','--state-dir',state])).stdout,/1 Konten migriert/);
  const db=new DatabaseSync(path.join(state,'runtime-private/editor-auth.sqlite'));t.after(()=>db.close());
  assert.deepEqual({...db.prepare('SELECT id,editorEnabled,mustChangePassword FROM user').get()},{id:'stable-marc',editorEnabled:1,mustChangePassword:1});
  assert.equal(await fs.readFile(file,'utf8'),legacy);
});

test('The FlyingStars sign-in page: two columns with the site logo and a show photo; files exist and stay out of the public site',async()=>{
  const site=await createFlyingStarsAdapter(siteRoot);
  assert.equal(site.login.layout,'split');assert.equal(site.login.caption,undefined,'no caption on the photo');
  for(const asset of [site.login.logo.src,site.login.image.src]){
    assert.ok(!asset.startsWith('public/'),'not copied into the public build: '+asset);
    assert.ok((await fs.stat(path.join(siteRoot,asset))).size>0,asset);
  }
  assert.ok((await fs.stat(path.join(siteRoot,site.login.image.src))).size<400_000,'the photo stays small enough for a sign-in page');
});
