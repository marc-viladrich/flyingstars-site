import {chromium,webkit,expect} from '@playwright/test';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';import{promisify}from'node:util';import path from'node:path';import{createHash}from'node:crypto';
import {startNativeServers,resolveRuntimeOptions} from './server.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
const {i18nFixture}=await import('./i18n-test-fixture.mjs');
const run=promisify(execFile),fixture=await i18nFixture(),stateDir=fixture.root+'/state',origin='http://127.0.0.1:4763',evidence=process.env.AFE_EVIDENCE_DIR||'/tmp/fs-editor-browser-proof';await writeFile(evidence+'-fixture.json',JSON.stringify({root:fixture.root,source:fixture.source}));await mkdir(evidence,{recursive:true});
const usernames=Object.fromEntries(['chromium','webkit'].map(engine=>[engine,'proof-'+engine+'-'+Date.now()]));
const password='Temporary browser proof 2026!';
for(const engine of ['chromium','webkit'])await run(process.execPath,[new URL('./manage-accounts.mjs',import.meta.url).pathname,'add',usernames[engine],'--name','Browser proof','--email',usernames[engine]+'@example.invalid','--state-dir',stateDir],{env:{PATH:process.env.PATH,HOME:process.env.HOME,EDITOR_NEW_PASSWORD:password},maxBuffer:1000000});
const options=resolveRuntimeOptions({env:{PATH:process.env.PATH},values:{siteRoot:fixture.source,stateDir,port:4763,publicPort:4764,preview:'static',auth:'on',remote:false,offlineMedia:'1'}});
const app=await startNativeServers({options,initialize:false});await app.builder.init();console.log('READY',fixture.source);
const reports=[];
try{for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/editor/');console.log(engine,'login',await page.locator('body').innerText());
  await page.getByLabel('Benutzername',{exact:true}).fill(usernames[engine]);await page.getByLabel('Passwort',{exact:true}).fill(password);const loginResponse=page.waitForResponse(r=>r.url().endsWith('/editor/api/login'));await page.getByRole('button',{name:'Anmelden',exact:true}).click();expect((await loginResponse).status()).toBe(200);
  await page.waitForURL(url=>url.pathname!=='/editor/login');console.log(engine,'after login',await page.locator('body').innerText());
  const cookies=(await context.cookies()).filter(c=>c.name==='fs_editor').map(({name,httpOnly,sameSite,secure})=>({name,httpOnly,sameSite,secure}));expect(cookies).toHaveLength(1);expect(cookies[0].httpOnly).toBe(true);
  const frame=page.frameLocator('iframe');const heading=frame.getByRole('textbox',{name:/^headline ·/i}).first();await expect(heading).toBeVisible({timeout:90000});
  const value='Browser '+engine+' Nachweis';await heading.click();await heading.press('ControlOrMeta+A');await heading.pressSequentially(value);await heading.press('Tab');
  await page.getByRole('button',{name:/Änderung speichern/}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'EN und NL gemeinsam prüfen'})).toBeVisible();const fields=dialog.getByRole('textbox');await expect(fields).toHaveCount(2);
  for(const [index,text]of ['English '+engine+' proof','Nederlands '+engine+' bewijs'].entries()){await fields.nth(index).click();await fields.nth(index).press('ControlOrMeta+A');await fields.nth(index).pressSequentially(text);}
  const response=page.waitForResponse(r=>r.url().endsWith('/editor/api/save')&&r.request().method()==='POST',{timeout:120000});await dialog.getByRole('button',{name:'Geprüft speichern',exact:true}).click();const saved=await response;const savedResult=await saved.json();console.log(engine,'save status',saved.status());expect(saved.status()).toBe(200);
  const file=path.join(fixture.source,'src/content/pages/index.yaml'),bytes=await readFile(file),data=codecs.yaml.parse(bytes);expect(data.sections[0].headline).toBe(value);const hash=createHash('sha256').update(bytes).digest('hex');
  for(const locale of ['en','nl']){const target=codecs.yaml.parse(await readFile(path.join(fixture.source,'src/content/pages',locale,'index.yaml')));expect(target.translationSourceHash).toBe(hash);expect(target.sections[0].headline).toBe(locale==='en'?'English '+engine+' proof':'Nederlands '+engine+' bewijs');}
  const provenance=JSON.parse(await readFile(path.join(fixture.source,'docs/i18n/content-provenance.json'),'utf8'));for(const locale of ['en','nl'])expect(provenance.some(p=>p.source==='src/content/pages/index.yaml'&&p.locale===locale&&p.path.join('.')==='sections.0.headline'&&p.editorReviewed)).toBe(true);
  await expect.poll(()=>app.builder.current?.head,{timeout:120000}).toBe(savedResult.head);expect(await readFile(path.join(app.builder.current.site,'index.html'),'utf8')).toContain(value);
  await expect(page.getByRole('button',{name:'Speichert',exact:true})).toHaveCount(0,{timeout:120000});await page.reload();await expect(frame.getByRole('textbox',{name:/^headline ·/i}).first()).toHaveText(value,{timeout:120000});
  
  const image=frame.locator('img[data-afe*=\"media\"]').filter({visible:true}).first();
  expect(await image.count(),'rendered image has a canonical source marker').toBeGreaterThan(0);
  const marker=JSON.parse(await image.getAttribute('data-afe'));expect(marker.kind).toBe('media');
  await image.click();await page.getByRole('button',{name:'Bild ersetzen',exact:true}).click();
  const sharp=(await import('sharp')).default,buffer=await sharp({create:{width:32,height:18,channels:3,background:engine==='chromium'?'#3344aa':'#aa4433'}}).png().toBuffer();
  const uploadResponse=page.waitForResponse(r=>r.url().endsWith('/editor/api/media')&&r.request().method()==='POST',{timeout:120000});
  await page.getByLabel('Bild hochladen',{exact:true}).setInputFiles({name:engine+'-proof.png',mimeType:'image/png',buffer});
  const upload=await uploadResponse;expect(upload.status()).toBe(200);const uploaded=await upload.json();
  await page.locator('[data-asset="'+uploaded.assetId+'"]').click();await expect(page.getByLabel('Bild hochladen',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/Änderung speichern/}).click();await page.getByRole('dialog').getByRole('button',{name:'Geprüft speichern',exact:true}).click();
  await expect.poll(async()=>{const source=codecs.yaml.parse(await readFile(file));return source.sections[0].headline;},{timeout:120000}).toBe(value);
  const owner=uploaded.state.records.find(r=>r.address?.collection===marker.address.owner.collection&&r.address.id===marker.address.owner.id);expect(owner).toBeTruthy();
  const ownerFile=path.join(fixture.source,owner.file),codec=owner.file.endsWith('.yaml')?codecs.yaml:codecs.markdown;
  await expect.poll(async()=>{const parsed=codec.parse(await readFile(ownerFile)),object=marker.address.path.reduce((v,k)=>v[k],parsed);return object.src;},{timeout:120000}).toMatch(/^\/assets\/[a-f0-9]{64}\.png$/);
  const asset=uploaded.state.records.find(r=>r.id===uploaded.assetId);expect(asset.data.width).toBe(32);expect(asset.data.height).toBe(18);
  expect((await sharp(await readFile(path.join(fixture.source,'public',asset.data.src))).metadata()).width).toBe(32);
  await expect.poll(()=>app.builder.current?.head,{timeout:120000}).toBe(await app.store.head());
  await page.screenshot({path:evidence+'/'+engine+'-saved.png'});reports.push({engine,cookies,sourceHash:hash,savedHeadline:data.sections[0].headline,uploaded:asset.data.src,imageOwner:marker.address,errors});

 }finally{await browser.close();}
}}
finally{await writeFile(evidence+'/browser-report.json',JSON.stringify(reports,null,2));app.store.sync.close();await new Promise(r=>app.editor.close(r));await new Promise(r=>app.publicServer.close(r));}
