// Reproduzierbarer Literal→Token-Nachweis, keine Snapshot-Baseline im Repository.
// node scripts/css-style-compare.mjs <baseline-url> <candidate-url> <baseline-dist> [report.json]
import {chromium, webkit} from 'playwright';
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
const [baseline, candidate, directory, output = '/tmp/css-style-compare.json'] = process.argv.slice(2);
if (!baseline || !candidate || !directory) throw new Error('Baseline-URL, Kandidat-URL und Baseline-dist angeben.');
function htmlFiles(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? htmlFiles(join(dir,e.name)) : e.name.endsWith('.html') ? [join(dir,e.name)] : []);
}
const paths = htmlFiles(directory).map(file => '/'+relative(directory,file).replace(/index\.html$/, '')).sort();
const redirects = new Map(htmlFiles(directory).flatMap(file => { const m=readFileSync(file,'utf8').match(/<meta[^>]*http-equiv="refresh"[^>]*content="([^"]*)"/i); return m ? [['/'+relative(directory,file).replace(/index\.html$/, ''),m[1]]] : []; }));
const properties = ['color','background-color','background-image','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow','text-shadow','transition','animation','opacity','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','gap','row-gap','column-gap','border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius','font-size','font-family','line-height','letter-spacing','width','height','max-width','min-width','top','right','bottom','left','transform','clip-path','filter','outline','fill','stroke','mask-image','-webkit-mask-image','display','position'];
const report = {baseline, candidate, pages: paths.length, widths: [390,1440], properties, engines: {}};
for (const [name,engine] of Object.entries({chromium,webkit})) {
  const browser = await engine.launch();
  const result = {version: browser.version(), comparisons: 0, elements: 0, values: 0, differences: [], redirects: []};
  report.engines[name]=result;
  // JS aus: kein asynchroner Medien-/Canvas-Zustand, voller Vergleich der normalen Übergangswerte.
  // CSS-Animationen werden auf denselben Zeitpunkt gestellt; reduced motion wird zusätzlich geprüft.
  for (const motion of ['no-preference','reduce']) {
    const context = await browser.newContext({javaScriptEnabled:false, reducedMotion:motion});
    const pages = await Promise.all([context.newPage(),context.newPage()]);
    for (const width of report.widths) {
      await Promise.all(pages.map(page => page.setViewportSize({width,height:900})));
      for (const path of paths) {
        if (redirects.has(path)) {
          const html = await fetch(candidate+path).then(r=>r.text());
          const target = html.match(/<meta[^>]*http-equiv="refresh"[^>]*content="([^"]*)"/i)?.[1];
          result.comparisons++; result.redirects.push(path);
          if (target !== redirects.get(path)) result.differences.push({path,width,motion,property:'redirect',before:redirects.get(path),after:target});
          continue;
        }
        async function capture(page, base) {
          await page.goto(base+path, {waitUntil:'load'});
          await page.evaluate(() => document.fonts.ready);
          await page.mouse.move(-1,-1);
          await page.evaluate(() => {
            document.documentElement.getBoundingClientRect();
            for (const a of document.getAnimations()) { if (a instanceof CSSTransition) a.finish(); else { a.pause(); a.currentTime=0; } }
            document.body.getBoundingClientRect();
            document.documentElement.getBoundingClientRect();
          });
          return page.evaluate(props => {
            const refresh = document.querySelector('meta[http-equiv="refresh"]');
            if (refresh) return {redirect:refresh.content};
            for (const a of document.getAnimations()) { if (a instanceof CSSTransition) a.finish(); else { a.pause(); a.currentTime=0; } }
            return {elements:[...document.querySelectorAll('*')].flatMap((el,index) => ['', '::before','::after'].map(pseudo => {
              const style=getComputedStyle(el,pseudo || null);
              return {id:index+':'+el.tagName.toLowerCase()+pseudo, values:props.map(prop => style.getPropertyValue(prop))};
            }))};
          }, properties);
        }
        const [before,after] = await Promise.all(pages.map((page,i) => capture(page,i ? candidate : baseline)));
        result.comparisons++;
        if (before.redirect || after.redirect) {
          if (before.redirect !== after.redirect) result.differences.push({path,width,motion,property:'redirect',before:before.redirect,after:after.redirect});
          result.redirects.push(path); continue;
        }
        if (before.elements.length !== after.elements.length) result.differences.push({path,width,motion,property:'element-count',before:before.elements.length,after:after.elements.length});
        for (let i=0;i<Math.min(before.elements.length,after.elements.length);i++) {
          const a=before.elements[i],b=after.elements[i]; result.elements++;result.values+=properties.length;
          if (a.id!==b.id) result.differences.push({path,width,motion,element:i,property:'identity',before:a.id,after:b.id});
          for (let k=0;k<properties.length;k++) if (a.values[k]!==b.values[k]) result.differences.push({path,width,motion,element:a.id,property:properties[k],before:a.values[k],after:b.values[k]});
        }
      }
      console.log(name,motion,width,'pages',paths.length,'differences',result.differences.length);
      writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    }
    await context.close();
  }
  result.redirects=[...new Set(result.redirects)];
  report.engines[name]=result;
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.engines).map(([k,v]) => [k,{comparisons:v.comparisons,elements:v.elements,values:v.values,differences:v.differences.length,redirects:v.redirects.length}]))));
process.exitCode=Object.values(report.engines).some(r=>r.differences.length) ? 1 : 0;
