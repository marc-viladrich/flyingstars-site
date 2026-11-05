import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join,relative} from 'node:path';
import postcss from 'postcss';

export function inspectCssDelivery(directory){
  const root=resolve(directory),pages=[],globals=new Set();
  function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.name.endsWith('.html')?[join(dir,e.name)]:[]);}
  const attr=(tag,name)=>new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
  for(const file of walk(root)){
    const html=readFileSync(file,'utf8');
    if(!html.includes('id="main"'))continue;
    const path='/'+relative(root,file).replace(/index\.html$/,'');
    if(html.split('</head>')[1]?.includes('data-style-owner='))throw Error(`Owner CSS leaked into body structure: ${path}`);
    const links=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>m[0]).filter(t=>attr(t,'rel')==='stylesheet');
    const urls=links.map(t=>attr(t,'href'));
    if(urls.length!==new Set(urls).size)throw Error(`Duplicate CSS asset on ${path}`);
    const global=links.find(t=>attr(t,'data-style-owner')==='global');
    if(!global)throw Error(`Missing shared CSS on ${path}`);
    globals.add(attr(global,'href'));
    const owners=[...html.matchAll(/data-style-owner="([^"]+)"/g)].map(m=>m[1]);
    const sheets=urls.map(href=>{
      if(!href?.startsWith('/_astro/'))throw Error(`CSS must be a native fingerprinted asset: ${path}: ${href}`);
      const file=join(root,href);if(!existsSync(file))throw Error(`Missing built CSS: ${href}`);
      return readFileSync(file,'utf8');
    });
    let criticalBytes=0;
    for(const m of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)){
      if(attr(m[1],'data-style-owner')){const size=Buffer.byteLength(m[2]);if(size>6*1024)throw Error(`Critical CSS budget exceeded: ${path}`);criticalBytes+=size;}
      sheets.push(m[2]);
    }
    for(const sheet of sheets){if(/@media\s*\(\s*--/.test(sheet))throw Error(`Unresolved custom media: ${path}`);}
    if(path==='/'){
      for(const sheet of sheets)postcss.parse(sheet).walkRules(rule=>{if(/\.(?:chopper|page-404|st-fig|post-body)(?:\b|-)/.test(rule.selector))throw Error(`Unrelated route styles on home: ${rule.selector}`);});
    }
    pages.push({path,owners,urls,criticalBytes,externalBytes:urls.reduce((n,url)=>n+statSync(join(root,url)).size,0)});
  }
  if(!pages.length)throw Error('No rendered site pages audited');
  if(globals.size!==1)throw Error('Shared CSS URL differs between site pages');
  return {pages,sharedUrl:[...globals][0]};
}
export function cssDeliveryAudit(){return {name:'flyingstars-css-delivery-audit',hooks:{'astro:build:done':({dir,logger})=>{
  const report=inspectCssDelivery(fileURLToPath(dir));logger.info(`CSS delivery: ${report.pages.length} pages, shared cache URL stable, critical budgets and owner exclusions passed.`);
}}};}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=inspectCssDelivery(process.argv[2]??'dist');console.log(JSON.stringify(result,null,2));}
