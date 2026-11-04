// Read-only browser proof against an explicitly supplied disposable editor instance.
import {chromium,webkit,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const target=new URL(process.argv[2]),out=path.resolve(process.argv[3]);
if(!['127.0.0.1','localhost'].includes(target.hostname))throw Error('Nur ausdrücklich gestartete lokale Prüf-Editoren verwenden.');
await mkdir(out,{recursive:true});
const results=[];
for(const [name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const frame=page.frameLocator('iframe[title="FlyingStars · Designsprache-Seite im Bearbeitungsmodus"]');
  const goto=async route=>{const url=new URL('/editor/',target);url.searchParams.set('page',route);await page.goto(url.href);await expect(page.getByRole('button',{name:/^Seite wechseln, aktuell/})).toBeVisible();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.afeExtensions?.frame?.recordsOnPage?.().includes('site/contact'));};
  const close=()=>page.getByRole('button',{name:'Schließen',exact:true}).click();
  const contact=async(location,selector,keyboard=false)=>{
   const link=selector.getByRole('link',{name:'0209 883 065 62',exact:true});
   if(keyboard)await link.press('Enter');else await link.click();
   const panel=page.getByRole('complementary',{name:'Kontakt',exact:true});await expect(panel).toBeVisible();
   await expect(panel.getByRole('textbox',{name:'Festnetz',exact:true})).toHaveValue('0209 883 065 62');
   await expect(panel.getByRole('textbox',{name:'E-Mail',exact:true})).toHaveValue('team@flyingstars.art');
   await expect(panel.getByRole('textbox',{name:'Mobil und WhatsApp',exact:true})).toHaveValue('01579 260 86 72');
   await page.screenshot({path:path.join(out,`${name}-${location}.png`)});
   results.push({engine:name,check:location,result:'pass',input:keyboard?'keyboard':'pointer'});await close();
  };
  await goto('/');await contact('footer-contact',frame.getByRole('contentinfo'),name==='webkit');
  await goto('/kontakt/');await contact('contact-section',frame.locator('.cd-grid'));
  await contact('contact-ways',frame.locator('.ways'));
  for(const [id,title,minimum]of [['duration','Showzeiten',5],['preview','Vorschaupolicy · nicht freigegebene Preise',9],['extras','Extras und Sonderangebote',6],['packages','Show-Pakete',1]]){
   await page.getByRole('button',{name:'Weitere Aktionen',exact:true}).click();
   await page.getByRole('menuitem',{name:'Inhalte verwalten',exact:true}).click();
   await page.getByRole('searchbox',{name:'Inhalte durchsuchen',exact:true}).fill(title);
   await page.getByRole('button',{name:title+' · DE',exact:true}).click();
   const panel=page.getByRole('complementary',{name:title,exact:true});await expect(panel).toBeVisible();
   const numeric=await panel.getByRole('spinbutton').count();expect(numeric).toBeGreaterThanOrEqual(minimum);
   if(id==='preview'){const label=panel.getByText('Paket der Erweiterung',{exact:true}),box=await label.boundingBox();expect(box.height).toBeLessThan(40);expect(box.width).toBeGreaterThan(100);}
   await page.screenshot({path:path.join(out,`${name}-${id}.png`)});
   results.push({engine:name,check:id,result:'pass',numericFields:numeric});await close();
  }
  expect(errors).toEqual([]);results.push({engine:name,javascriptErrors:errors});
 }finally{await browser.close();}
}
await writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
