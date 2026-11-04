// Auflösung roher Computed-Style-Differenzen: stabile Wiederholung + exakter Pixelvergleich von Verlaufsnotationen.
// node scripts/css-style-equivalence.mjs <raw-report.json> <reviewed-report.json>
import {chromium, webkit} from 'playwright';
import sharp from 'sharp';
import {readFileSync,writeFileSync} from 'node:fs';
const [input,output] = process.argv.slice(2);
if (!input || !output) throw new Error('Rohen Vergleich und Zieldatei angeben.');
const report=JSON.parse(readFileSync(input,'utf8'));
const focusUnexplained=process.argv.includes('--recheck-unexplained');
for (const [name,result] of Object.entries(report.engines)) {
  const browser=await ({chromium,webkit})[name].launch();
  const focus=focusUnexplained ? result.unexplained : result.differences;
  const unique=new Map();
  for (const d of focus) unique.set(JSON.stringify([d.property,d.before,d.after]),d);
  if(!focusUnexplained){result.equivalences=[];result.rechecks=[];}
  result.unexplained=[];
  for (const [key,d] of unique) {
    if (!['background-image','mask-image','-webkit-mask-image'].includes(d.property)) continue;
    console.log(name,'pixel pair',d.property);
    const page=await browser.newPage({viewport:{width:600,height:400},javaScriptEnabled:false});
    const sizes=[[600,400],[237,131],[390,900],[1440,900]];
    let equal=true;
    for (const [width,height] of sizes) {
      await page.setViewportSize({width,height});
      const shots=[];
      for (const value of [d.before,d.after]) {
        await page.setContent('<html><head><style>html,body{margin:0}#tile{width:100vw;height:100vh;background:#dc8428}</style></head><body><div id="tile"></div></body></html>');
        await page.locator('#tile').evaluate((el,{property,value})=>el.style.setProperty(property,value),{property:d.property,value});
        shots.push(await sharp(await page.screenshot({omitBackground:true})).raw().toBuffer());
      }
      if (!shots[0].equals(shots[1])) {equal=false;break;}
    }
    await page.close();
    if (equal) result.equivalences.push({key,property:d.property,before:d.before,after:d.after,sizes,reason:'Wertgleiche Verlaufsnotation des Minifiers (Richtung/Stop-Reihenfolge bzw. Nullposition); RGBA-Pixel in vier Geometrien exakt identisch.'});
  }
  const remaining=focus.filter(d=>!result.equivalences.some(e=>e.key===JSON.stringify([d.property,d.before,d.after])));
  const groups=new Map();
  for (const d of remaining) {const key=JSON.stringify([d.path,d.width,d.motion]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);}
  for (const [key,diffs] of groups) {
    const [path,width,motion]=JSON.parse(key);
    console.log(name,'stable recheck',path,width,motion);
    const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:motion,viewport:{width,height:900}});
    const pages=await Promise.all([context.newPage(),context.newPage()]);
    const values=await Promise.all(pages.map(async(page,i)=>{
      await page.goto((i?report.candidate:report.baseline)+path,{waitUntil:'load'});
      await page.evaluate(()=>document.fonts.ready);await page.mouse.move(-1,-1);
      await page.evaluate(()=>document.documentElement.style.setProperty('pointer-events','none','important'));
      await page.evaluate(()=>{document.documentElement.getBoundingClientRect();for(const a of document.getAnimations()){if(a instanceof CSSTransition)a.finish();else{a.pause();a.currentTime=0;}}document.body.getBoundingClientRect();});
      await page.screenshot();
      await page.evaluate(()=>{for(const e of document.querySelectorAll('*')){getComputedStyle(e).marginLeft;e.getBoundingClientRect();}});
      return page.evaluate(diffs=>diffs.map(d=>{const index=Number(d.element.split(':')[0]);const pseudo=d.element.includes('::')?'::'+d.element.split('::')[1]:null;const el=document.querySelectorAll('*')[index];if(!el || el.tagName.toLowerCase()!==d.element.split(':')[1])throw new Error('Abweichende Elementidentität: '+d.element);return getComputedStyle(el,pseudo).getPropertyValue(d.property);}),diffs);
    }));
    for(let i=0;i<diffs.length;i++) {
      if(values[0][i]===values[1][i])result.rechecks.push({...diffs[i],confirmed:values[0][i],reason:['background-image','mask-image','-webkit-mask-image'].includes(diffs[i].property)?'Token-Verlauf in die bereits auf main kompilierte Richtung geschrieben; jetzt exakt dieselbe Serialisierung.':'Wiederholung nach Layout-Flush, erzwungenem Rendern und neutralem Zeiger ist exakt gleich.'});
      else result.unexplained.push({...diffs[i],recheckedBefore:values[0][i],recheckedAfter:values[1][i]});
    }
    await context.close();
  }
  await browser.close();
  console.log(name,'raw',result.differences.length,'equivalent pairs',result.equivalences.length,'stable rechecks',result.rechecks.length,'unexplained',result.unexplained.length);
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
}
process.exitCode=Object.values(report.engines).some(r=>r.unexplained.length) ? 1 : 0;
