import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {test,expect} from '@playwright/test';
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10H90V90H10Z" fill="none" stroke="#ff0000" stroke-width="5"/></svg>';
test.use({reducedMotion:'reduce'});
test('upload → use → visible removable attachments → real multipart on final submit',async({page})=>{
 test.setTimeout(150000);
 const posts:Buffer[]=[]; const contentTypes:string[]=[];
 // A real local mock receives bytes. WebKit's routing API omits file parts
 // from postDataBuffer(), so inspecting intercepted bodies cannot prove upload.
 const server=createServer(async(req,res)=>{
   res.setHeader('Access-Control-Allow-Origin','*');
   const chunks:Buffer[]=[];for await(const chunk of req) chunks.push(Buffer.from(chunk));
   contentTypes.push(req.headers['content-type']!);posts.push(Buffer.concat(chunks));res.setHeader('content-type','application/json');res.statusCode=posts.length===1?503:200;res.end(JSON.stringify(posts.length===1?{ok:false,detail:'mock failure'}:{ok:true,state:'sent',requestId:'test-id'}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/contact`;
 try {
 await page.goto('/drohnenshow-preise/?drohnen=200#konfigurator');
 await expect(page.locator('#cfg-field')).toHaveAttribute('data-points',/[0-9]+/);
 await page.locator('#cfg-file').setInputFiles({name:'our-logo.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
 await expect(page.locator('#cfg-logo-count')).toBeVisible({timeout:90000});
 await expect(page.locator('#cfg-logo-n')).toHaveText(/[1-9][0-9]+/,{timeout:90000});
 await page.locator('#cfg-use-logo').click();
 await expect(page.locator('#cfg-logo-tools')).toBeHidden();
 const selectedDrones=await page.locator('#cfg-drones').inputValue();
 expect(posts).toHaveLength(0);
 await page.locator('#cfg-cta').click();
 const form=page.locator('#inquiry-form');
 await form.evaluate((el,url)=>(el as HTMLFormElement).action=url,endpoint);
 await expect(form.locator('[data-logo-item=original]')).toContainText('our-logo.svg');
 await expect(form.locator('[data-logo-item=preview] img')).toBeVisible();
 await expect(form.locator('[data-logo-item=drones]')).toContainText(selectedDrones);
 await form.locator('[data-logo-item=drones] button').click();
 await expect(form.locator('[data-logo-item=drones]')).toHaveCount(0);
 expect(posts).toHaveLength(0);
 await form.locator('label:has([name=anlass][value=firma])').click();
 await form.locator('[name=ort]').fill('Osnabrück');await form.locator('[data-date-open]').check();
 await form.locator('[data-next]').click();await form.locator('[name=name]').fill('Logo Test');await form.locator('[name=email]').fill('test@example.test');
 await form.locator('button[type=submit]').click();
 await expect.poll(()=>posts.length).toBe(1);
 const body=posts[0].toString();expect(body).toContain('name="logo-original"; filename="our-logo.svg"');expect(body).toContain(svg);expect(body).toContain('name="logo-preview"; filename="logo-preview.png"');expect(body).not.toContain('name="drohnen"');
 const received = await new Response(new Uint8Array(posts[0]),{headers:{'content-type':contentTypes[0]}}).formData();
 expect(await (received.get('logo-original') as File).text()).toBe(svg);
 const preview=received.get('logo-preview') as File;expect(preview.type).toBe('image/png');expect(preview.size).toBeGreaterThan(100);
 expect(Buffer.from(await preview.arrayBuffer()).subarray(1,4).toString()).toBe('PNG');
 await expect(form.locator('[data-form-status]')).toContainText('mock failure');
 await expect(form.locator('[data-logo-item=original]')).toContainText('our-logo.svg');
 await form.locator('button[type=submit]').click();
 await expect.poll(()=>posts.length).toBe(2);
 expect(posts[1].toString()).toContain(svg);
 await expect(form.locator('[data-logo-inquiry]')).toBeHidden();
 expect(await page.evaluate(()=>sessionStorage.getItem('flyingstars:logo-inquiry'))).toBeNull();
 } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('curated example remains usable without attaching someone else’s logo',async({page})=>{
 await page.goto('/drohnenshow-preise/?drohnen=200#konfigurator');
 await expect(page.locator('#cfg-field')).toHaveAttribute('data-points',/[0-9]+/);
 await page.locator('[data-occasion="logo"]').click();
 await page.locator('[data-example="adidas"]').click();
 await expect(page.locator('#cfg')).toHaveAttribute('data-logo-state','ready',{timeout:90000});
 await page.locator('#cfg-use-logo').click();
 await expect(page.locator('#cfg-logo-tools')).toBeHidden();
 await expect(page.locator('#cfg-logo-status')).toHaveText('');
 expect(await page.evaluate(()=>sessionStorage.getItem('flyingstars:logo-inquiry'))).toBeNull();
});
