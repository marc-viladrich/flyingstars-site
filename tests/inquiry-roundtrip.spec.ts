import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {test,expect} from '@playwright/test';
import {onRequestPost} from '../functions/api/contact';
for(const locale of ['de','en','nl']){
 const prefix=locale==='de'?'':`/${locale}`;
 test(`${locale}: Extras und Konfigurator klicken bis ins Formular mit Sonderzeichen`,async({page})=>{
  await page.goto(`${prefix}/drohnenshow-preise/?anlass=hochzeit&paket=HORIZON&drohnen=250#konfigurator`);
  await page.locator('#konfigurator').scrollIntoViewIfNeeded();await expect(page.locator('#cfg-cta')).toHaveAttribute('href',/show=/);
  await page.locator('#x-film').check();await page.locator('#x-express').check();
  const cta=page.locator('#cfg-cta');await expect(cta).toHaveAttribute('href',/show=/);
  const href=await cta.getAttribute('href');expect(new URL(href!,'https://example.test').pathname).toBe(prefix+'/');
  // The actual link keeps the selected motifs and extras. A visitor's sky text is arbitrary plain text.
  const url=new URL(href!,'https://example.test');url.searchParams.set('text','Müller & Söhne + 50% <3 #? é');
  await cta.evaluate((el,href)=>(el as HTMLAnchorElement).href=href,url.pathname+url.search+url.hash);
  await cta.click();const form=page.locator('#inquiry-form');
  await expect(form.locator('[name=paket][value=HORIZON]')).toBeChecked();await expect(form.locator('[name=anlass][value=privat]')).toBeChecked();await expect(form.locator('[name=extras][value=film]')).toBeChecked();await expect(form.locator('[name=extras][value=express]')).toBeChecked();
  await expect(form.locator('[name=message]')).toHaveValue(/Müller & Söhne \+ 50% <3 #\? é/);
  expect(new URL(page.url()).searchParams.has('show')).toBe(false);expect(new URL(page.url()).searchParams.has('text')).toBe(false);
 });
 test(`${locale}: Paketlink und native Formularabgabe ohne JavaScript`,async({browser,baseURL})=>{
  let submitted:URLSearchParams|undefined;
  // Real HTTP is required here: Playwright's route.fulfill rejects redirect status 303.
  const server=createServer(async(req,res)=>{
   if(req.url==='/api/contact'){
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks).toString('utf8');submitted=new URLSearchParams(body);
    const headers=Object.fromEntries(Object.entries(req.headers).filter(([,v])=>v!==undefined).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):String(v)]));
    const response=await onRequestPost({request:new Request(`http://${req.headers.host}${req.url}`,{method:'POST',headers,body}),env:{}});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
   }else{
    const response=await fetch(new URL(req.url!,baseURL));const headers=Object.fromEntries([...response.headers].filter(([k])=>!['content-encoding','content-length','transfer-encoding','connection'].includes(k)));
    res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
   }
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}`,context=await browser.newContext({javaScriptEnabled:false,baseURL:origin}),page=await context.newPage();
  try {

  await page.goto(prefix+'/');await page.locator('[data-pick-paket=SPARK]').click();await expect(page).toHaveURL(new RegExp(prefix+'/kontakt/\\?paket=SPARK$'));
  const form=page.locator('#inquiry-form');await form.locator('label:has(input[name=anlass][value=firma])').click();await form.locator('label:has(input[name=paket][value=SPARK])').click();await form.locator('[name=ort]').fill('Köln & Düsseldorf');await form.locator('[name=name]').fill('Müller & Söhne');await form.locator('[name=email]').fill('test@example.test');await form.locator('[name=message]').fill('Eine Show + Musik, 50% Herzen <3');
  await form.locator('[type=submit]').press('Enter');await expect(page).toHaveURL(origin+prefix+'/danke/?state=not-configured');
  expect(submitted?.get('locale')).toBe(locale);expect(submitted?.get('name')).toBe('Müller & Söhne');expect(submitted?.get('ort')).toBe('Köln & Düsseldorf');expect(submitted?.get('message')).toBe('Eine Show + Musik, 50% Herzen <3');expect(submitted?.get('paket')).toBe('SPARK');expect(submitted?.has('form-duration')).toBe(false);
  } finally {await context.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
}
