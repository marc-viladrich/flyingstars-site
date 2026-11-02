import {chromium,webkit,expect} from '@playwright/test';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';import{promisify}from'node:util';import path from'node:path';import{createHash}from'node:crypto';
import {startNativeServers,resolveRuntimeOptions} from './server.mjs';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
const selectedEngines=process.env.AFE_PROOF_ENGINES?.split(',')??['chromium','webkit'];
if(!selectedEngines.length||selectedEngines.some(name=>!['chromium','webkit'].includes(name)))throw Error('AFE_PROOF_ENGINES erwartet chromium und/oder webkit.');
const engines=[['chromium',chromium],['webkit',webkit]].filter(([name])=>selectedEngines.includes(name));
const {i18nFixture}=await import('./i18n-test-fixture.mjs');
const run=promisify(execFile),fixture=await i18nFixture(),stateDir=fixture.root+'/state',origin='http://127.0.0.1:4763',evidence=process.env.AFE_EVIDENCE_DIR||'/tmp/fs-editor-browser-proof';await writeFile(evidence+'-fixture.json',JSON.stringify({root:fixture.root,source:fixture.source}));await mkdir(evidence,{recursive:true});
const usernames=Object.fromEntries(['chromium','webkit'].map(engine=>[engine,'proof-'+engine+'-'+Date.now()]));
const password='Temporary browser proof 2026!';
for(const [engine]of engines)await run(process.execPath,[new URL('./manage-accounts.mjs',import.meta.url).pathname,'add',usernames[engine],'--name','Browser proof','--email',usernames[engine]+'@example.invalid','--state-dir',stateDir],{env:{PATH:process.env.PATH,HOME:process.env.HOME,EDITOR_NEW_PASSWORD:password},maxBuffer:1000000});
const options=resolveRuntimeOptions({env:{PATH:process.env.PATH},values:{siteRoot:fixture.source,stateDir,port:4763,publicPort:4764,preview:'static',auth:'on',remote:false,offlineMedia:'1',translationProvider:'fake'}});
const app=await startNativeServers({options,initialize:false});await app.builder.init();console.log('READY',fixture.source);
fixture.store.sync.close();
const reports=[];
try{for(const [engine,type]of engines){
 const browser=await type.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/editor/');console.log(engine,'login',await page.locator('body').innerText());
  await page.getByLabel('Benutzername',{exact:true}).fill(usernames[engine]);await page.getByLabel('Passwort',{exact:true}).fill(password);const loginResponse=page.waitForResponse(r=>r.url().endsWith('/editor/api/login'));await page.getByRole('button',{name:'Anmelden',exact:true}).click();expect((await loginResponse).status()).toBe(200);
  await page.waitForURL(url=>url.pathname!=='/editor/login');console.log(engine,'after login',await page.locator('body').innerText());
  const cookies=(await context.cookies()).filter(c=>c.name==='fs_editor').map(({name,httpOnly,sameSite,secure})=>({name,httpOnly,sameSite,secure}));expect(cookies).toHaveLength(1);expect(cookies[0].httpOnly).toBe(true);
  const frame=page.frameLocator('iframe');const heading=frame.getByRole('textbox',{name:/^headline ·/i}).first();await expect(heading).toBeVisible({timeout:90000});
  const value='Browser '+engine+' Nachweis';await heading.click();await heading.press('ControlOrMeta+A');await heading.pressSequentially(value);await heading.press('Tab');
  await page.getByRole('button',{name:/Änderung speichern/}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'EN und NL gemeinsam prüfen'})).toBeVisible();const fields=dialog.getByRole('textbox');await expect(fields).toHaveCount(2);
  for(const [index,locale]of ['en','nl'].entries()){
   const previous=await fields.nth(index).inputValue();await dialog.getByRole('button',{name:'Übersetzung vorschlagen',exact:true}).nth(index).click();
   const adopt=dialog.getByRole('button',{name:'Vorschlag übernehmen',exact:true});await expect(adopt).toHaveCount(1);await expect(fields.nth(index)).toHaveValue(previous);
   await adopt.click();await expect(fields.nth(index)).toHaveValue('['+locale.toUpperCase()+'] '+value);
  }
  const response=page.waitForResponse(r=>r.url().endsWith('/editor/api/save')&&r.request().method()==='POST',{timeout:120000});await dialog.getByRole('button',{name:'Geprüft speichern',exact:true}).click();const saved=await response;const savedResult=await app.store.state();console.log(engine,'save status',saved.status());expect(saved.status()).toBe(200);
  const file=path.join(fixture.source,'src/content/pages/index.yaml'),bytes=await readFile(file),data=codecs.yaml.parse(bytes);expect(data.sections[0].headline).toBe(value);const hash=createHash('sha256').update(bytes).digest('hex');
  for(const locale of ['en','nl']){const target=codecs.yaml.parse(await readFile(path.join(fixture.source,'src/content/pages',locale,'index.yaml')));expect(target.translationSourceHash).toBe(hash);expect(target.sections[0].headline).toBe('['+locale.toUpperCase()+'] '+value);}
  const provenance=JSON.parse(await readFile(path.join(fixture.source,'docs/i18n/content-provenance.json'),'utf8'));for(const locale of ['en','nl'])expect(provenance.some(p=>p.source==='src/content/pages/index.yaml'&&p.locale===locale&&p.path.join('.')==='sections.0.headline'&&p.editorReviewed)).toBe(true);
  await expect.poll(()=>app.builder.current?.head,{timeout:120000}).toBe(savedResult.head);expect(await readFile(path.join(app.builder.current.site,'index.html'),'utf8')).toContain(value);
  await expect(page.getByRole('button',{name:'Speichert',exact:true})).toHaveCount(0,{timeout:120000});await page.reload();await expect(frame.getByRole('textbox',{name:/^headline ·/i}).first()).toHaveText(value,{timeout:120000});
  
  const image=frame.locator('img[data-afe*=\"media\"]').filter({visible:true}).first();
  expect(await image.count(),'rendered image has a canonical source marker').toBeGreaterThan(0);
  const marker=JSON.parse(await image.getAttribute('data-afe'));expect(marker.kind).toBe('media');
  await image.click();await frame.getByRole('button',{name:'Optionen (⇧F10 oder Rechtsklick)',exact:true}).click();await page.getByRole('button',{name:'Bild ersetzen',exact:true}).click();console.log(engine,'media picker open');
  const sharp=(await import('sharp')).default,buffer=await sharp({create:{width:32,height:18,channels:3,background:engine==='chromium'?'#3344aa':'#aa4433'}}).png().toBuffer();
  const previousAssets=new Set((await app.store.state()).records.filter(r=>r.type==='media').map(r=>r.id));
  const uploadResponse=page.waitForResponse(r=>r.url().endsWith('/editor/api/media')&&r.request().method()==='POST',{timeout:120000});
  await page.getByLabel('Bild hochladen',{exact:true}).setInputFiles({name:engine+'-proof.png',mimeType:'image/png',buffer});
  const upload=await uploadResponse;console.log(engine,'upload received',upload.status());expect(upload.status()).toBe(200);const uploadedState=await app.store.state(),newAsset=uploadedState.records.find(r=>r.type==='media'&&!previousAssets.has(r.id));expect(newAsset).toBeTruthy();const uploaded={assetId:newAsset.id,state:uploadedState};
  await page.locator('[data-asset="'+uploaded.assetId+'"]').click();await expect(page.getByLabel('Bild hochladen',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/Änderung speichern/}).click();const mediaSaveResponse=page.waitForResponse(r=>r.url().endsWith('/editor/api/save')&&r.request().method()==='POST',{timeout:120000});await page.getByRole('dialog').getByRole('button',{name:'Geprüft speichern',exact:true}).click();const mediaSavedResponse=await mediaSaveResponse;expect(mediaSavedResponse.status()).toBe(200);const mediaSaved=await app.store.state();
  await expect.poll(async()=>{const source=codecs.yaml.parse(await readFile(file));return source.sections[0].headline;},{timeout:120000}).toBe(value);
  const owner=uploaded.state.records.find(r=>r.address?.collection===marker.address.owner.collection&&r.address.id===marker.address.owner.id);expect(owner).toBeTruthy();
  const ownerFile=path.join(fixture.source,owner.file),codec=owner.file.endsWith('.yaml')?codecs.yaml:codecs.markdown;
  await expect.poll(async()=>{const parsed=codec.parse(await readFile(ownerFile)),object=marker.address.path.reduce((v,k)=>v[k],parsed);return object.src;},{timeout:120000}).toMatch(/^\/assets\/[a-f0-9]{64}\.png$/);
  const asset=uploaded.state.records.find(r=>r.id===uploaded.assetId);expect(asset.data.width).toBe(32);expect(asset.data.height).toBe(18);
  expect((await sharp(await readFile(path.join(fixture.source,'public',asset.data.src))).metadata()).width).toBe(32);
  await expect.poll(()=>app.builder.current?.head,{timeout:120000}).toBe(mediaSaved.head);expect(await readFile(path.join(app.builder.current.site,'index.html'),'utf8')).toContain(asset.data.src);await expect(image).toHaveAttribute('src',asset.data.src,{timeout:120000});
  for(const [locale,label]of [['en','English'],['nl','Nederlands'],['de','Deutsch']]){
   await page.locator('#language').click();await page.getByRole('menuitem',{name:label,exact:true}).click();
   await expect(frame.locator('html')).toHaveAttribute('lang',locale,{timeout:90000});
   const localized=codecs.yaml.parse(await readFile(path.join(fixture.source,'src/content/pages',locale==='de'?'':locale,'index.yaml')));
   await expect(frame.getByRole('textbox',{name:/^headline ·/i}).first()).toHaveText(localized.sections[0].headline,{timeout:90000});
  }
  await page.screenshot({path:evidence+'/'+engine+'-saved.png'});
  await page.getByRole('button',{name:'Weitere Aktionen',exact:true}).click();await page.getByRole('menuitem',{name:'Inhalte verwalten',exact:true}).click();
  await page.getByRole('searchbox',{name:'Inhalte durchsuchen',exact:true}).fill('Show-Pakete');await page.getByRole('button',{name:'Show-Pakete · DE',exact:true}).click();
  const price=page.getByLabel('Startpreis netto',{exact:true}).first();await expect(price).toBeVisible();for(const channel of ['Rot','Grün','Blau'])await expect(page.getByLabel(channel,{exact:true})).toHaveCount(3);await page.screenshot({path:evidence+'/'+engine+'-packages.png'});
  await page.getByRole('button',{name:'Leistungen',exact:true}).click();
  const serviceToggle=page.getByRole('button',{name:'safety-plan',exact:true});if(await serviceToggle.getAttribute('aria-expanded')!=='true')await serviceToggle.click();const service=page.getByRole('group',{name:'safety-plan',exact:true});
  const status=service.getByLabel('SPARK-Status',{exact:true});await expect(status).toBeChecked();await status.uncheck();await page.screenshot({path:evidence+'/'+engine+'-services.png'});
  await page.getByRole('button',{name:'SPARK',exact:true}).click();
  const packagePrice=engine==='chromium'?8001:8002;await price.click();await price.press('ControlOrMeta+A');await price.pressSequentially(String(packagePrice));await price.press('Tab');
  const packageSave=page.waitForResponse(r=>r.url().endsWith('/editor/api/save')&&r.request().method()==='POST',{timeout:120000});await page.getByRole('button',{name:/Änderung speichern/}).click();expect((await packageSave).status()).toBe(200);
  const savedPackages=JSON.parse(await readFile(path.join(fixture.source,'src/content/show-packages.json')));expect(savedPackages.SPARK.price).toBe(packagePrice);expect(savedPackages.services.find(service=>service.id==='safety-plan').cells).toEqual([false,true,true]);
  // Restore the fixture's membership through the UI before the next engine exercises the same scenario.
  await page.getByRole('button',{name:'Weitere Aktionen',exact:true}).click();await page.getByRole('menuitem',{name:'Inhalte verwalten',exact:true}).click();await page.getByRole('searchbox',{name:'Inhalte durchsuchen',exact:true}).fill('Show-Pakete');await page.getByRole('button',{name:'Show-Pakete · DE',exact:true}).click();await page.getByRole('button',{name:'Leistungen',exact:true}).click();
  const restoreToggle=page.getByRole('button',{name:'safety-plan',exact:true});if(await restoreToggle.getAttribute('aria-expanded')!=='true')await restoreToggle.click();const restore=page.getByRole('group',{name:'safety-plan',exact:true});await restore.getByLabel('SPARK-Status',{exact:true}).check();const restored=page.waitForResponse(r=>r.url().endsWith('/editor/api/save')&&r.request().method()==='POST',{timeout:120000});await page.getByRole('button',{name:/Änderung speichern/}).click();expect((await restored).status()).toBe(200);const restoredHead=(await app.store.state()).head;await expect.poll(()=>app.builder.current?.head,{timeout:120000}).toBe(restoredHead);await page.waitForLoadState('networkidle');
  expect(Object.keys(JSON.parse(await readFile(path.join(stateDir,'translation-memory.json'))).entries).some(key=>key.startsWith('en:'))).toBe(true);
  expect(errors).toEqual([]);reports.push({engine,cookies,sourceHash:hash,savedHeadline:data.sections[0].headline,uploaded:asset.data.src,imageOwner:marker.address,errors:[...errors]});

 }catch(error){await page.screenshot({path:evidence+'/'+engine+'-failure.png'});console.error((await page.locator('body').innerText()).slice(-3500));throw error;}finally{await browser.close();}
}}
finally{await writeFile(evidence+'/browser-report.json',JSON.stringify(reports,null,2));app.store.sync.close();await new Promise(r=>app.editor.close(r));await new Promise(r=>app.publicServer.close(r));}
