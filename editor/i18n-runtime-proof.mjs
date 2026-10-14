import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
import {escapeHTML} from '../src/lib/editorial-text.mjs';
import {inlinePlain} from '../src/lib/inline-text.mjs';
import {readRuntime,fillText} from '../src/lib/ui-runtime.mjs';
import {localeFormat} from '../src/lib/localized-routes.mjs';
import {priceFor,recommendPackage,PACKAGE_NAMES} from '../src/content/show-packages.ts';
// Exercise the actual calculator update against the JSON emitted by a real localized Astro build.
// Canvas animation is irrelevant to these state transitions, so its existing API is supplied as a stub.
export async function verifyPricingRuntime(html) {
 const serialized=html.match(/<section[^>]*data-runtime="([^"]+)"[^>]*class="calc-hero"/)?.[1];assert.ok(serialized);
 const json=serialized.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const payload=runInNewContext(`(${readRuntime.toString()})('.fixture')`,{document:{querySelector:()=>({dataset:{runtime:json}})},fillText});
 const {t}=payload;
 const source=await readFile(new URL('../src/scripts/pricing.js',import.meta.url),'utf8');
 const begin=source.indexOf('  function update('),end=source.indexOf('\n  // ----------',begin);assert.ok(begin>0&&end>begin);
 const code=source.slice(begin,end),inquiry=source.match(/^  const inquiryHref = (.*);$/m)[1];
 const node=()=>({innerHTML:'',textContent:'',href:'',classList:{toggle(){}},style:{setProperty(){}},setAttribute(name,value){this[name]=value;}});
 const cards=Object.fromEntries(PACKAGE_NAMES.map(name=>{const nodes={'[data-live]':node(),'.badge':node(),'a.btn':node()};return [name,{classList:{toggle(){}},querySelector:selector=>nodes[selector]}];}));
 const context={PKG:payload.packages,NAMES:PACKAGE_NAMES,cards,pkg:'HORIZON',locked:false,n:250,range:{...node(),value:'250',min:'100',max:'1000'},countEl:node(),totalEl:node(),noteEl:node(),readEl:node(),cta:node(),tierBtns:[],text:{value:'',shown:null},textMin:()=>100,renderTextRead(){},swarm:{info:()=>({size:[120,60,10],d:2}),setTarget(){}},fmt:localeFormat(payload.locale),home:payload.home,URLSearchParams,inlinePlain,escapeHTML,t,h:(key,values)=>escapeHTML(t(key,values)),recommend:n=>recommendPackage(n,payload.packages),priceFor:(name,n)=>priceFor(name,n,payload.packages),eur:value=>value.toLocaleString(localeFormat(payload.locale))+' €',document:{documentElement:{style:{setProperty(){}}}},clearTimeout(){}};
 runInNewContext(`const inquiryHref=${inquiry};\n${code}\nupdate(true);`,context);
 assert.ok(context.countEl.innerHTML.includes('[EN] Drohnen'));assert.ok(context.totalEl.innerHTML.includes('[EN] ab'));
 assert.ok(context.readEl.innerHTML.includes('[EN] Dauer'));assert.ok(context.readEl.innerHTML.includes('[EN] Motive'));
 assert.ok(context.cta.textContent.startsWith('[EN] Mit 250'));assert.ok(context.cta.href.startsWith('/en/?'));
 assert.ok(cards.SPARK.querySelector('[data-live]').innerHTML.includes('[EN] Nur bis 150'));
 assert.ok(cards.HORIZON.querySelector('.badge').textContent.startsWith('[EN]'));
 // Reviewed copy may contain angle brackets; runtime-generated HTML must retain it as text.
 payload.packages.HORIZON.displayName='<img src=x onerror=alert(1)>';
 runInNewContext('update(false);',context);
 assert.ok(context.readEl.innerHTML.includes('&lt;img'));assert.ok(!context.readEl.innerHTML.includes('<img'));
}
