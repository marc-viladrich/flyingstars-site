/** Static, read-only inventory. Run from repository root with Node 22 after npm ci.
 * Only git-tracked text is read; .env*, lockfiles, historical docs, geometry payloads,
 * vendored/minified assets and binary files are explicitly excluded. No network.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseDocument, LineCounter, isScalar, isMap, isSeq} from 'yaml';
import ts from 'typescript';
import postcss from 'postcss';

const out='docs/dupes-inventory-r20';
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).sort();
const excluded=[], files=new Map();
for(const file of tracked){
 if(file.startsWith(out+'/'))continue;
 let reason;
 if(path.basename(file).startsWith('.env'))reason='env, nicht gelesen';
 else if(file.startsWith('docs/')&&file!=='docs/legacy-url-inventory.json'||file.endsWith('.md')&&!/^(src|editor)\//.test(file))reason='historische/prozedurale Dokumentation und erzeugte Provenienz';
 else if(/(?:package-lock\.json|\.svg|\.min\.[jc]s|LICENSE|\.LICENSE\.)$/.test(file))reason='Lockfile, Vektorasset oder Fremdtext';
 else if(/^src\/data\/(?:inter-inventory|logo-dots|script-allure)\.json$/.test(file)||/^public\/.*\.(json|js|css)$/.test(file))reason='generiertes/vendortes Asset';
 else if(!/\.(?:astro|[cm]?[jt]sx?|json|ya?ml|css|md|py|sh|toml|conf|txt)$/.test(file)&&!/(?:\.htaccess|Dockerfile|\.nvmrc|\.node-version)$/.test(file))reason='kein untersuchter Texttyp';
 else if(fs.lstatSync(file).isSymbolicLink())reason='Symlink, kein zweiter Besitzer';
 if(reason){excluded.push({file,reason});continue;}
 const text=fs.readFileSync(file,'utf8');
 if(text.includes('\0')){excluded.push({file,reason:'binär'});continue;}
 files.set(file,text);
}
const line=(text,offset)=>text.slice(0,offset).split('\n').length;
const ref=(file,offset,extra={})=>({file,line:line(files.get(file),offset),...extra});
const normalize=s=>String(s).replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]+>/g,' ').replace(/[*_`#]/g,'').replace(/\s+/g,' ').trim().normalize('NFC');
const leaves=[], parseErrors=[];
for(const [file,text]of files){
 if(!/\.(?:yaml|yml|json|md)$/.test(file))continue;
 let raw=text,offset=0;
 if(file.endsWith('.md')){const m=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);if(!m)continue;raw=m[1];offset=text.indexOf(m[1]);}
 const lc=new LineCounter(),doc=parseDocument(raw,{lineCounter:lc});
 if(doc.errors.length){parseErrors.push({file,errors:doc.errors.map(e=>e.message)});continue;}
 function walk(node,field=[]){
  if(isScalar(node)){if(node.value!==null)leaves.push({...ref(file,offset+(node.range?.[0]??0)),path:field,value:node.value});}
  else if(isMap(node))for(const pair of node.items)walk(pair.value,[...field,pair.key.value]);
  else if(isSeq(node))node.items.forEach((v,i)=>walk(v,[...field,i]));
 }
 walk(doc.contents);
 if(file.endsWith('.md')){
  const start=offset+raw.length+5;
  for(const m of text.slice(start).matchAll(/[^\n]+/g))if(normalize(m[0]).length>=12)leaves.push({...ref(file,start+m.index),path:['$body',line(text,start+m.index)],value:m[0]});
 }
}
const strings=[...leaves.filter(x=>typeof x.value==='string')],functions=[];
for(const [file,text]of files){
 if(!/\.(?:[cm]?[jt]sx?|astro)$/.test(file))continue;
 if(file.endsWith('.astro')){
  for(const m of text.matchAll(/(?:^|[\s>])([^<>{}\n]+)(?=<)/g))if(normalize(m[1]).length>=4)strings.push({...ref(file,m.index),kind:'markup',value:m[1]});
 }
 const chunks=file.endsWith('.astro')?[...text.matchAll(/(?:^---\r?\n([\s\S]*?)\r?\n---|<script\b[^>]*>([\s\S]*?)<\/script>)/g)].map(m=>({code:m[1]??m[2],offset:m.index+m[0].indexOf(m[1]??m[2])})):[{code:text,offset:0}];
 for(const {code,offset}of chunks){
  const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function walk(node){
   if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))strings.push({...ref(file,offset+node.getStart(ast)),kind:'literal',value:node.text});
   if((ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node)||ts.isMethodDeclaration(node))&&node.body){
    const body=node.body.getText(ast);if(body.length>=80){
     const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,body),tokens=[];
     for(let t=scanner.scan();t!==ts.SyntaxKind.EndOfFileToken;t=scanner.scan())tokens.push(t===ts.SyntaxKind.Identifier?'ID':scanner.getTokenText());
     functions.push({...ref(file,offset+node.getStart(ast)),endLine:line(files.get(file),offset+node.end),name:node.name?.getText(ast)??node.parent?.name?.getText(ast)??'<anonymous>',body,normalized:tokens.join(' ')});
    }
   }
   ts.forEachChild(node,walk);
  }
  walk(ast);
 }
 // Include Astro/HTML attributes and template fragments as lexical candidates.
 for(const m of text.matchAll(/(?:[\w:-]+)\s*=\s*(["'])([^\n]*?)\1/g))if(m[2].length>=4)strings.push({...ref(file,m.index),kind:'attribute',value:m[2]});
}
function cluster(items,key,min=2){const map=new Map();for(const item of items){const k=key(item);if(!k)continue;const values=map.get(k)??[];if(!values.some(x=>x.file===item.file&&x.line===item.line&&JSON.stringify(x.path)===JSON.stringify(item.path)))values.push(item);map.set(k,values);}return [...map].filter(([,a])=>a.length>=min).map(([value,occurrences])=>({value,count:occurrences.length,files:new Set(occurrences.map(x=>x.file)).size,occurrences})).sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value));}
const repeatedStrings=cluster(strings,x=>{const v=normalize(x.value);return v.length>=4&&/[\p{L}]/u.test(v)?v:null;}).filter(x=>x.files>=2);
const textOnly=strings.filter(x=>normalize(x.value).length>=32&&/\s/.test(normalize(x.value))&&!/^(?:https?:|[./#]|data-|\^|@)/.test(normalize(x.value)));
const repeatedCopy=cluster(textOnly,x=>normalize(x.value)).filter(x=>x.files>=2);
// Near-copy comparison: text-bearing leaves/literals, >= 7 tokens, token Jaccard >= .78.
// Exact matches are elsewhere. Reproducible candidates, never automatic merge decisions.
const uniq=new Map();for(const x of textOnly){const s=normalize(x.value),tokens=new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu));if(tokens.size>=7){const a=uniq.get(s)??{text:s,tokens,occurrences:[]};a.occurrences.push(x);uniq.set(s,a);}}
const candidates=[...uniq.values()], nearCopy=[];
for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
 const a=candidates[i],b=candidates[j];if(Math.min(a.tokens.size,b.tokens.size)/Math.max(a.tokens.size,b.tokens.size)<.78)continue;
 const n=[...a.tokens].filter(x=>b.tokens.has(x)).length,score=n/(a.tokens.size+b.tokens.size-n);
 if(score>=.78&&!a.occurrences.every(x=>b.occurrences.every(y=>x.file===y.file)))nearCopy.push({score:Number(score.toFixed(4)),a:{text:a.text,occurrences:a.occurrences},b:{text:b.text,occurrences:b.occurrences}});
}
const patterns={
 contact:/team@flyingstars\.art|(?:mailto|tel):[^\s"'<>)}]+|(?:\+49|0209|0157)[\d ()/-]{5,}|wa\.me\/\d+|calendly\.com\/[^\s"'<>)}]+/gi,
 identity:/FlyingStars(?:\s+GmbH)?|Ronja\s+Donsbach|Florian\s+Becker|Erwin\s+Wilms|Sebastian\s+\p{L}+|Bulmker[^\n<]+|Katernberger[^\n<]+|Triple Z[^\n<]+|HRB\s*\d+|DE\s?\d{9}/gu,
 commercial:/\b(?:SPARK|HORIZON|ODYSSEY)\b|\b(?:7[.,]?900|15[.,]?900|34[.,]?900)\b|\b(?:48\s*(?:h|Stunden|hours|uur)|40\s*%|1[,.]3\s*(?:Mio|Million|million|miljoen)|178|2022|13\s*(?:Minuten|minutes|minuten)|25\s*(?:Minuten|minutes|minuten)|10[–-]25|1[–-]2\s*(?:Wochen|weeks|weken)|3[–-]4\s*(?:Wochen|weeks|weken))\b|\d[\d., ]*\s*(?:€|EUR|Drohnen|drones|drohnen|Minuten|minutes|minuten|Wochen|weeks|weken|Tage|days|dagen|Stunden|hours|uur)/gi,
 social:/https?:\/\/(?:www\.)?(?:instagram\.com|youtube\.com|youtu\.be|tiktok\.com|facebook\.com|linkedin\.com|calendly\.com|wa\.me)\/[^\s"'<>)}]+/g,
 urls:/https?:\/\/[^\s"'<>`)}\\]+/g,
 tracking:/\b(?:G-[A-Z0-9]+|GTM-[A-Z0-9]+|AW-\d+(?:\/[A-Za-z0-9_-]+)?)\b|(?:PUBLIC_)?(?:GA4|GTM|GOOGLE_ADS|TURNSTILE|MATOMO)[A-Z_]*|\b(?:measurementId|trackingId|sitekey)\b/g,
 routes:/["'`(]((?:\/(?:en|nl))?\/(?:[a-z0-9][a-z0-9-]*\/)*(?:[?#][^\s"'`<>)}]*)?)["'`)]/g,
 colors:/#[\da-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g,
 motion:/cubic-bezier\([^)]*\)|(?<![\w.-])(?:\d*\.)?\d+(?:ms|s)\b/g,
 helpers:/\b(?:IntersectionObserver|ResizeObserver|MutationObserver|matchMedia|Intl\.(?:NumberFormat|DateTimeFormat)|toLocaleString|localizedHref|localeFromPath|prefers-reduced-motion|saveData|Symbol\.for\(['"]afe\.source|createHash|sha256)\b/g,
 schemaEditor:/\.describe\(|\.default\(|z\.enum\(|x-afe|data-afe|afeBindings|afe\.source|\b(?:fieldConfig|fieldDefinitions|sectionSchema|templateFor|recordRoute|sourceFor)\b/g,
 brittleTests:/\b(?:toHaveText|toContainText|getByText|getByRole|includes|indexOf|match|equal|deepEqual)\s*\([^\n]*/g,
};
const matches={};
for(const [kind,regex]of Object.entries(patterns)){
 const entries=[];for(const [file,text]of files)for(const m of text.matchAll(regex)){
  const from=text.lastIndexOf('\n',m.index)+1,to=text.indexOf('\n',m.index),full=text.slice(from,to<0?text.length:to),at=m.index-from,start=Math.max(0,at-100);
  entries.push({...ref(file,m.index),value:m[1]&&kind==='routes'?m[1]:m[0],snippet:(start?'…':'')+full.slice(start,start+350)+(full.length>start+350?'…':'')});
 }
 matches[kind]=entries;
}
const byAddress=new Map(leaves.map(x=>[x.file+':'+JSON.stringify(x.path),x]));
const localeCopies=[],localeDifferences=[],localeMissing=[];
for(const x of leaves){
 if(!/^src\/content\/(pages|projects|posts|faq)\//.test(x.file)||/\/(en|nl)\//.test(x.file)||x.path[0]==='translationSourceHash'||x.path[0]==='$body')continue;
 for(const locale of ['en','nl']){
  const file=x.file.replace(/^(src\/content\/[^/]+\/)/,'$1'+locale+'/'),y=byAddress.get(file+':'+JSON.stringify(x.path));
  if(!y){localeMissing.push({source:x,locale});continue;}
  const item={source:x,target:y,locale};
  if(JSON.stringify(x.value)===JSON.stringify(y.value)){
   const field=String(x.path.at(-1));
   const classification=typeof x.value!=='string'?'typed-data':/^https?:|^\/|^(?:tel|mailto):/.test(x.value)?'url':/^(?:id|type|route|video|loop|icon|package|name|email|phone|year|date|layout|color|shape|filter|format|translationSourceHash)$/.test(field)?'identity-or-enum':/^(?:src|file|width|height|loading|decoding|sizes|alt)$/.test(field)?'media-metadata':/^(?:tags|season|projects|filters)$/.test(String(x.path.at(-2)))?'reference-or-filter':'copy-or-proper-name';
   localeCopies.push({...item,classification});
  }else localeDifferences.push(item);
 }
}
const imports=[];
for(const [file,text]of files){
 if(!/\.(?:[cm]?[jt]sx?|astro|css)$/.test(file))continue;
 for(const m of text.matchAll(/(?:\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?|\bimport\s*\(|@import\s*)["']([^"']+)["']/g)){
  const specifier=m[1];let target=null;
  if(specifier.startsWith('.')){const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split('?')[0]));target=[base,...['.ts','.js','.mjs','.astro','.css','/index.ts','/index.js','/index.mjs'].map(e=>base+e)].find(f=>files.has(f))??null;}
  imports.push({...ref(file,m.index),specifier,target});
 }
 for(const m of text.matchAll(/new URL\(["']([^"']+)["'],\s*import\.meta\.url\)/g)){
  const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1]));
  imports.push({...ref(file,m.index),specifier:m[1],target:files.has(base)?base:null,kind:'url-constructor'});
 }
}
function reach(roots){const seen=new Set(roots),queue=[...roots];while(queue.length){const f=queue.shift();for(const i of imports.filter(x=>x.file===f&&x.target))if(!seen.has(i.target)){seen.add(i.target);queue.push(i.target);}}return seen;}
const liveRoots=[...files.keys()].filter(f=>/^src\/pages\//.test(f)&&!f.startsWith('src/pages/poc/'));
const prod=reach(liveRoots),poc=reach([...files.keys()].filter(f=>f.startsWith('src/pages/poc/'))),editor=reach(['editor/server.mjs','editor/browser-site.mjs']);
const graph=[...files.keys()].filter(f=>/^(src\/(?:components|scripts|styles)|editor)\//.test(f)&&!/(?:\.test\.|\/test\/)/.test(f)).map(file=>({file,productionReachable:prod.has(file),pocReachable:poc.has(file),editorReachable:editor.has(file),inbound:imports.filter(x=>x.target===file)}));
const cssDeclarations=[],cssRules=[];
for(const [file,text]of files){
 const chunks=file.endsWith('.css')?[{code:text,offset:0}]:file.endsWith('.astro')?[...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>({code:m[1],offset:m.index+m[0].indexOf(m[1])})):[];
 for(const {code,offset}of chunks){let ast;try{ast=postcss.parse(code);}catch(error){parseErrors.push({file,error:String(error)});continue;}
  const context=node=>{const parts=[];for(let p=node.parent;p;p=p.parent)if(p.type==='atrule')parts.unshift('@'+p.name+' '+p.params);return parts.join(' > ');};
  ast.walkRules(rule=>{const at=offset+(rule.source.start.offset??0),declarations=(rule.nodes??[]).filter(x=>x.type==='decl').map(d=>({property:d.prop,value:d.value,important:d.important??false}));cssRules.push({...ref(file,at),selector:rule.selector,context:context(rule),declarations});});
  ast.walkDecls(d=>cssDeclarations.push({...ref(file,offset+(d.source.start.offset??0)),selector:d.parent.selector??'@'+d.parent.name,context:context(d),property:d.prop,value:d.value,important:d.important??false}));
 }
}
const cssDuplicates=cluster(cssRules,x=>x.declarations.length>=3?JSON.stringify(x.declarations.map(d=>[d.property,d.value,d.important]).sort()):null);
const cssCompetingOwners=cluster(cssDeclarations,x=>x.context+' | '+x.selector+' | '+x.property).filter(x=>new Set(x.occurrences.map(d=>d.value)).size>1||x.files>1);
const breakpoints=[];for(const [file,text]of files)for(const m of text.matchAll(/@media\s*([^{}]+)\{/g))breakpoints.push({...ref(file,m.index),value:m[1].trim()});
const shape=f=>{const t=files.get(f);return [...t.matchAll(/<([a-z][\w-]*)\b/g)].map(m=>m[1]);};
const components=[...files.keys()].filter(f=>f.endsWith('.astro')&&/src\/(components|templates)/.test(f));
const markupSimilarity=[];
for(let i=0;i<components.length;i++)for(let j=i+1;j<components.length;j++){
 const a=shape(components[i]),b=shape(components[j]);if(Math.min(a.length,b.length)<5)continue;
 const grams=t=>new Set(t.slice(0,-2).map((v,n)=>t.slice(n,n+3).join(' '))),aa=grams(a),bb=grams(b),n=[...aa].filter(x=>bb.has(x)).length,score=n/(aa.size+bb.size-n);
 if(score>=.35)markupSimilarity.push({a:components[i],b:components[j],score:Number(score.toFixed(4)),tags:[a.length,b.length]});
}
const functionClones=cluster(functions,x=>x.normalized).filter(x=>x.files>1);
const numericFields=leaves.filter(x=>/^src\/content\//.test(x.file)&&(typeof x.value==='number'||typeof x.value==='string'&&/\d/.test(x.value)));
const digest=createHash('sha256');for(const [file,text]of files)digest.update(file+'\0'+text+'\0');
const uiDuplicateValues=cluster(leaves.filter(x=>x.file==='src/i18n/ui.json'),x=>x.path.at(-1)+' | '+normalize(x.value));
const contactClusters=cluster(matches.contact,x=>{
 if(x.value.toLowerCase().includes('team@flyingstars.art'))return 'email:team@flyingstars.art';
 const digits=x.value.replace(/\D/g,'');
 if(digits.length>=9){const national=digits.startsWith('49')?digits:'49'+digits.replace(/^0/,'');return 'phone:+'+national;}
 if(x.value.includes('calendly.com/'))return x.value.replace(/\/$/,'');
 return null;
});
const urlClusters=cluster(matches.urls,x=>x.value.replace(/\/$/,''));
const result={schemaVersion:1,base:execFileSync('git',['rev-parse','cd1ea13^{commit}'],{encoding:'utf8'}).trim(),inputSha256:digest.digest('hex'),scope:{includedFiles:files.size,excluded,files:[...files.keys()],parseErrors},counts:{files:files.size,leaves:leaves.length,stringClusters:repeatedStrings.length,copyClusters:repeatedCopy.length,nearCopyPairs:nearCopy.length,localeCopies:localeCopies.length,localeDifferences:localeDifferences.length,localeMissing:localeMissing.length,imports:imports.length,cssDeclarations:cssDeclarations.length,cssDuplicateRules:cssDuplicates.length,cssCompetingOwners:cssCompetingOwners.length,markupSimilarityPairs:markupSimilarity.length,functionCloneGroups:functionClones.length,numericFields:numericFields.length,uiDuplicateValueGroups:uiDuplicateValues.length,patterns:Object.fromEntries(Object.entries(matches).map(([k,v])=>[k,{occurrences:v.length,files:new Set(v.map(x=>x.file)).size}]))},matches,repeatedStrings,repeatedCopy,nearCopy,localeCopies,localeDifferences,localeMissing,imports,graph,cssRules,cssDeclarations,cssDuplicates,cssCompetingOwners,breakpoints,markupSimilarity,functionClones,numericFields,uiDuplicateValues};
fs.mkdirSync(out,{recursive:true});
result.contactClusters=contactClusters;result.urlClusters=urlClusters;
fs.writeFileSync(out+'/evidence.json',JSON.stringify(result)+'\n');
console.log(JSON.stringify(result.counts,null,2));
