// Visueller Guard für K02/K03/K07/K08. Dynamische Medien werden für beide Builds identisch stillgelegt.
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit} from '@playwright/test';
import sharp from 'sharp';
const [before,after,out='/tmp/fs-rest-pixels']=process.argv.slice(2);
if(!before||!after)throw Error('before after [output directory] required');
await mkdir(out,{recursive:true});
const serve=async root=>{
 const server=createServer(async(req,res)=>{try{
  let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return{server,origin:`http://127.0.0.1:${server.address().port}`};
};
const servers=await Promise.all([before,after].map(p=>serve(path.resolve(p)))),report=[];
try{for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{for(const width of [390,1440,2560])for(const route of ['/','/drohnenshow-preise/','/referenzen/','/ueber-uns/','/kontakt/','/faq/']){
  const shots=[],geometry=[];
  for(let i=0;i<servers.length;i++){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const page=await context.newPage();
   await page.addInitScript(()=>{sessionStorage.setItem('flyingstars:motion','paused');let seed=123;Math.random=()=>((seed=(seed*16807)%2147483647)/2147483647);});
   await page.route(/\.(mp4|webm)(\?|$)/,r=>r.abort());
   const response=await page.goto(servers[i].origin+route,{waitUntil:'networkidle'});if(response.status()!==200)throw Error(route+' '+response.status());
   await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.images){img.loading='eager';}await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
   await page.addStyleTag({content:'canvas { visibility: hidden !important; } *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; } [data-reveal] { opacity: 1 !important; transform: none !important; }'});
   await page.evaluate(()=>{for(const video of document.querySelectorAll('video')){video.pause();video.removeAttribute('autoplay');}});
   geometry.push(await page.locator('main').evaluate(el=>({height:el.scrollHeight,width:el.scrollWidth})));
   const name=`${engine}-${width}-${route.replaceAll('/','')||'home'}-${i}.png`;
   const png=await page.screenshot({path:path.join(out,name),fullPage:true,animations:'disabled'});
   shots.push(await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true}));await context.close();
  }
  const sameSize=JSON.stringify(shots[0].info)===JSON.stringify(shots[1].info);let maxDelta=0,channelsOver2=0;
  if(sameSize)for(let j=0;j<shots[0].data.length;j++){const d=Math.abs(shots[0].data[j]-shots[1].data[j]);maxDelta=Math.max(maxDelta,d);if(d>2)channelsOver2++;}
  const row={engine,width,route,sameSize,maxDelta,channelsOver2,geometry};report.push(row);console.log(JSON.stringify(row));
 }}finally{await browser.close();}
}}finally{for(const {server}of servers)server.close();await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
process.exitCode=report.some(r=>!r.sameSize||r.channelsOver2)?1:0;
