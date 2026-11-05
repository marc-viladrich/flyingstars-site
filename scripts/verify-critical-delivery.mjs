import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';

const baseline=process.argv[2]??'http://localhost:4478',candidate=process.argv[3]??'http://localhost:4479';
const engine=process.env.CRITICAL_BROWSER==='webkit'?webkit:chromium;
let browser;
async function freshContext(options){
  // Isolate each probe, including browser/GPU memory, on constrained developer machines.
  if(browser)await browser.close();
  browser=await engine.launch({headless:true});
  return browser.newContext(options);
}
const results=[];
function snapshot(){
  // On mobile, window.innerHeight can include off-screen horizontal overflow.
  // The visual viewport is the actual painted screen, including in mobile emulation.
  const screenWidth=visualViewport?.width??document.documentElement.clientWidth;
  const screenHeight=visualViewport?.height??document.documentElement.clientHeight;
  // Auto flex margins can serialize differently across stylesheet activation while
  // painted boxes stay identical. Actual x/y/width/height below are the spacing contract.
  const properties=['color','background-color','background-image','box-shadow','font-family','font-size','font-weight','line-height','letter-spacing','width','height','padding','border','border-radius','display','position','top','right','bottom','left','gap','grid-template-columns','align-items','justify-content','opacity','clip-path','transform','filter','fill','stroke','object-fit','object-position'];
  document.querySelectorAll('video').forEach(v=>v.pause());
  document.getAnimations().forEach(a=>{if(a instanceof CSSTransition)a.finish();else{a.pause();a.currentTime=0;}});
  const elements=[...document.querySelectorAll('body *')].filter(e=>{
    if(['STYLE','LINK','SCRIPT','NOSCRIPT','MAIN'].includes(e.tagName))return false;
    const r=e.getBoundingClientRect();if(!r.width||!r.height||r.top>=screenHeight||r.bottom<=0||r.left>=screenWidth||r.right<=0)return false;
    for(let a=e;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);if(s.opacity==='0'||s.display==='none'||s.visibility==='hidden')return false;}
    return true;
  });
  return elements.map(e=>{
    const r=e.getBoundingClientRect();
    // Compare the painted intersection. A section continuing below the screen may
    // change its off-screen height when its cards load without changing first paint.
    const box=[Math.max(0,r.x),Math.max(0,r.y),Math.min(screenWidth,r.right)-Math.max(0,r.x),Math.min(screenHeight,r.bottom)-Math.max(0,r.y)];
    const path=[];for(let n=e;n&&n!==document.body;n=n.parentElement)path.unshift(n.tagName+':'+[...n.parentElement.children].indexOf(n));
    return {path:path.join('/'),element:e.tagName+'.'+e.getAttribute('class'),text:e.textContent.slice(0,28),values:{...Object.fromEntries(properties.map(p=>[p,getComputedStyle(e).getPropertyValue(p)])),width:String(box[2]),height:String(box[3]),box:JSON.stringify(box)}};
  });
}
try{
  // These are the supported first-viewport layouts, not a claim about arbitrary page templates.
  for(const [width,height]of [[390,844],[412,823],[700,844],[390,899],[700,899],[768,1024],[900,1099],[1440,900]]){
    const context=await freshContext({viewport:{width,height},isMobile:width<768,hasTouch:width<768,deviceScaleFactor:width>=768?1:1.75});
    await context.addInitScript(()=>sessionStorage.setItem('flyingstars:motion','paused'));
    const page=await context.newPage(),held=[];
    await page.route('**/*.css',route=>{
      if(route.request().url().includes('consent-bundle'))return route.continue();
      held.push(route);
    });
    await page.goto(candidate,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('main .hero[data-reel-host]').count(),1,'Expected the actual FlyingStars hero');
    console.error('holding styles',width,height);
    let fontTimer;
    await Promise.race([
      page.evaluate(()=>Promise.all([document.fonts.load('16px Inter'),document.fonts.load('16px "Space Grotesk"')])),
      new Promise((_,reject)=>{fontTimer=setTimeout(()=>reject(Error('Critical font loading timed out')),10000)})
    ]).finally(()=>clearTimeout(fontTimer));
    await page.waitForFunction(()=>!document.querySelector('#consent-config')||document.querySelector('#cc-main .cm'));
    await page.waitForTimeout(400);
    const canvasPositions=await page.locator('canvas.dot-cv').evaluateAll(canvases=>canvases.map(c=>getComputedStyle(c).position));
    if(width===1440)assert.ok(canvasPositions.length>0,'Desktop probe must exercise a real enhancement canvas');
    assert.ok(canvasPositions.every(p=>p==='absolute'),'Enhancement canvases must stay out of flow before full CSS, preventing resize feedback');
    const early=await page.evaluate(snapshot);
    assert.ok(early.length>20,'The real first viewport must be rendered while CSS requests are held');
    assert.ok(held.length>0,'The network probe must actually hold deferred CSS');
    await Promise.all(held.map(route=>route.continue()));
    await page.unroute('**/*.css');
    await page.waitForLoadState('load');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const complete=await page.evaluate(snapshot);
    if(early.length!==complete.length){
      const key=e=>e.path;
      console.error(JSON.stringify({removed:early.filter(e=>!complete.some(c=>key(c)===key(e))).map(e=>({element:e.element,text:e.text,box:e.values.box})),added:complete.filter(e=>!early.some(c=>key(c)===key(e))).map(e=>({element:e.element,text:e.text,box:e.values.box}))}));
    }
    assert.equal(early.length,complete.length,`Visible element count changed: ${width}x${height}`);
    const differences=early.flatMap((entry,i)=>Object.keys(entry.values).filter(p=>entry.values[p]!==complete[i].values[p]).map(p=>({element:entry.element,text:entry.text,property:p,early:entry.values[p],complete:complete[i].values[p]})));
    assert.deepEqual(differences,[],`First viewport changed when deferred CSS arrived: ${width}x${height}`);
    results.push({test:'delayed-css',width,height,elements:early.length,heldRequests:held.length});
    // A new route must reuse the hashed global stylesheet.
    await page.goto(candidate+'/kontakt/',{waitUntil:'load'});
    const reused=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/\/_astro\/global\..*\.css$/.test(e.name)).map(e=>e.transferSize));
    assert.deepEqual(reused,[0],'Shared CSS must be reused across pages');
    await context.close();
  }
  // A tall viewport may expose further sections: native media matching must block
  // their stylesheet-dependent first paint instead of exposing unstyled content.
  {
    const context=await freshContext({viewport:{width:390,height:1099}}),page=await context.newPage(),held=[];
    await page.route('**/*.css',route=>{if(route.request().url().includes('consent-bundle'))return route.continue();held.push(route);});
    await page.goto(candidate,{waitUntil:'commit'});await page.waitForTimeout(400);
    const state=await page.evaluate(()=>({matching:[...document.querySelectorAll('link[data-style-owner]')].every(l=>l.media&&matchMedia(l.media).matches),paintSupported:PerformanceObserver.supportedEntryTypes.includes('paint'),painted:performance.getEntriesByName('first-contentful-paint').length>0}));
    assert.ok(held.length>0);assert.ok(state.matching,'Tall viewport requires matching stylesheet media');
    if(state.paintSupported)assert.equal(state.painted,false,'Tall viewport must not paint before full CSS');
    await Promise.all(held.map(route=>route.continue()));await page.unroute('**/*.css');await page.waitForLoadState('load');
    results.push({test:'tall-viewport-blocking',...state});await context.close();
  }
  // Deep links can start below the critical hero and require full CSS before first paint.
  {
    const context=await freshContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),held=[];
    await page.route('**/*.css',route=>{if(route.request().url().includes('consent-bundle'))return route.continue();held.push(route);});
    await page.goto(candidate+'/#anlaesse',{waitUntil:'commit'});await page.waitForTimeout(400);
    const state=await page.evaluate(()=>({matching:[...document.querySelectorAll('link[data-style-owner]')].every(l=>l.media==='all'&&l.blocking.contains('render')),paintSupported:PerformanceObserver.supportedEntryTypes.includes('paint'),painted:performance.getEntriesByName('first-contentful-paint').length>0}));
    assert.ok(held.length>0);assert.ok(state.matching,'Fragment navigation requires full CSS');
    if(state.paintSupported)assert.equal(state.painted,false,'Deep link must not paint before full CSS');
    await Promise.all(held.map(route=>route.continue()));await page.unroute('**/*.css');await page.waitForLoadState('load');
    await page.waitForFunction(()=>scrollY>0);
    results.push({test:'deep-link-blocking',...state});await context.close();
  }
  for(const path of ['/','/drohnenshow-hochzeit/','/kontakt/']){
    const snapshots=[];
    for(const origin of [baseline,candidate]){
      const context=await freshContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await context.newPage();
      await page.goto(origin+path,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
      snapshots.push(await page.evaluate(snapshot));await context.close();
    }
    assert.deepEqual(snapshots[0],snapshots[1],`No-JavaScript rendering differs: ${path}`);
    results.push({test:'no-javascript',path,elements:snapshots[0].length});
  }
}finally{console.log(JSON.stringify(results,null,2));await browser?.close();}
