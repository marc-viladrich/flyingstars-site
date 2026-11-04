#!/usr/bin/env node
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {chromium,webkit,expect} from '@playwright/test';
const [before,after]=process.argv.slice(2);if(!before||!after)throw Error('before and after build directories required');
const serve=async root=>{const server=createServer(async(req,res)=>{try{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if((await stat(file)).isDirectory())file=path.join(file,'index.html');const type=path.extname(file),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'}[type]??'application/octet-stream';res.setHeader('Content-Type',mime);res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));return{server,origin:'http://127.0.0.1:'+server.address().port};};
const servers=await Promise.all([serve(path.resolve(before)),serve(path.resolve(after))]),report=[];
try{for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{for(const locale of ['de','en','nl']){
  const results=[];
  for(const {origin}of servers){
   const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>sessionStorage.setItem('flyingstars:motion','paused'));
   await page.route('**/api/contact',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,state:'not-configured'})}));
   const prefix=locale==='de'?'':`/${locale}`,snap={};
   await page.goto(origin+prefix+'/drohnenshow-preise/?anlass=hochzeit&paket=HORIZON&drohnen=250#konfigurator');
   await page.locator('#konfigurator').scrollIntoViewIfNeeded();await expect(page.locator('#cfg-cta')).toHaveAttribute('href',/show=/);
   await page.locator('#cfg-occasion').selectOption('launch');await page.locator('label:has([name=pkg][value="2"])').click();
   await expect(page.locator('#cfg-pkg')).toHaveText('ODYSSEY');
   snap.configurator=await page.locator('#konfigurator').ariaSnapshot();
   await page.locator('#x-express').check();await expect(page.locator('[data-extras-bar]')).toContainText(/1.*Express/s);snap.extras=await page.locator('[data-extras-bar]').evaluate(node=>({text:node.textContent.trim().replace(/\s+/g,' '),links:[...node.querySelectorAll('a')].map(a=>({text:a.textContent,href:a.getAttribute('href')})),status:node.querySelector('[role=status]')?.textContent}));
   snap.languageLinks=await page.locator('.nav .language-switch a').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,href:n.getAttribute('href'),lang:n.hreflang})));
   const nextLocale={de:'en',en:'nl',nl:'de'}[locale];await page.locator('.nav .lang-btn').focus();await page.keyboard.press('Enter');await page.locator('.nav .language-switch a[hreflang='+nextLocale+']').click();await expect(page.locator('html')).toHaveAttribute('lang',nextLocale);snap.languageSwitch={locale:await page.locator('html').getAttribute('lang'),url:page.url().replace(origin,''),headline:await page.locator('h1').innerText()};
   await page.goto(origin+prefix+'/kontakt/?paket=offen#anfrage');
   await page.locator('[data-next]').click();snap.formErrors=await page.locator('#inquiry-form').ariaSnapshot();
   await page.locator('label:has(input[name=anlass][value=firma])').click();await page.locator('#f-ort').fill('Osnabrück');await page.locator('[data-date-open]').check();await page.locator('[data-next]').click();
   await page.locator('#f-name').fill('Integration Test');await page.locator('#f-mail').fill('test@example.test');await page.locator('button[type=submit]').click();await expect(page.locator('[data-form-status]')).not.toBeEmpty();snap.formStatus=await page.locator('[data-form-status]').ariaSnapshot();
   await page.setViewportSize({width:390,height:900});await page.goto(origin+prefix+'/');await page.locator('[data-menu-open]').click();snap.dialog=await page.getByRole('dialog').ariaSnapshot();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeHidden();
   assert.deepEqual(errors,[]);results.push(JSON.parse(JSON.stringify(snap).replace(/http:\/\/127\.0\.0\.1:\d+/g,'http://fixture.invalid')));await context.close();
  }
  assert.deepEqual(results[1],results[0],engine+' '+locale);report.push({engine,locale,checkpoints:Object.keys(results[0]),equal:true});
 }}finally{await browser.close();}
}}finally{await Promise.all(servers.map(({server})=>new Promise(r=>server.close(r))));}
console.log(JSON.stringify({scenarios:report.length,report},null,2));
