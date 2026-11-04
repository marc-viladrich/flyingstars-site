// Node-22-Wächter: node --test scripts/no-px.test.mjs, auch aus einem anderen Arbeitsverzeichnis.
// Absichtlich strenger als nur font-size: alle sicheren CSS-Längen sowie
// unbekannte CSS/JS-Einheiten werden gemeldet. Keine pauschale Datei-Ausnahme.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('../', import.meta.url));
export const PX = /(?<![\w.])[-+]?(?:\d*\.\d+|\d+)px\b/gi;
export function files(root) {
  const out=[];
  function visit(dir) { for(const e of readdirSync(dir,{withFileTypes:true})) { const p=join(dir,e.name); if(e.isSymbolicLink()) continue; if(e.isDirectory()) visit(p); else if(e.isFile()) out.push(p); } }
  visit(join(root,'src')); return out.sort();
}
export function maskComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' ')); }
export function cssRegions(source, file) {
  if(file.endsWith('.css')) return [{start:0,end:source.length,kind:'css'}];
  if(!file.endsWith('.astro')) return [];
  const regions=[];
  for(const m of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) { const start=m.index+m[0].indexOf('>')+1; regions.push({start,end:start+m[1].length,kind:'style'}); }
  // Quoted HTML values and direct template literals only. Any other expression is reported by the raw scan.
  for(const m of source.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`((?:\\.|[^`])*)`\})/g)) {
    if(regions.some(r=>m.index>=r.start&&m.index<r.end)) continue;
    // Do not interpret style-looking text inside scripts/frontmatter as an HTML attribute.
    const front=source.startsWith('---') ? source.indexOf('\n---',3)+4 : 0;
    if(m.index<front) continue;
    const scripts=[...source.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)];
    if(scripts.some(x=>m.index>=x.index&&m.index<x.index+x[0].length)) continue;
    const value=m[1]??m[2]??m[3], offset=m[1]!==undefined?m[0].indexOf('"')+1:m[2]!==undefined?m[0].indexOf("'")+1:m[0].indexOf('`')+1;
    regions.push({start:m.index+offset,end:m.index+offset+value.length,kind:m[3]!==undefined?'inline-template':'inline'});
  }
  return regions.sort((a,b)=>a.start-b.start);
}
export function declarations(text, offset=0, kind='css') {
  const clean=maskComments(text), out=[];
  // Declaration prefixes only. Quotes/functions are consumed as part of the value, never scanned for declarations.
  let i=0, boundary=true;
  while(i<clean.length) {
    if(boundary) {
      const m=clean.slice(i).match(/^\s*(--[\w-]+|[a-zA-Z-][\w-]*)\s*:/);
      if(m) {
        const start=i+m[0].length; let j=start, depth=0, quote='';
        for(;j<clean.length;j++) { const c=clean[j]; if(quote) { if(c==='\\')j++; else if(c===quote)quote=''; continue; } if(c==='"'||c==="'"){quote=c;continue;} if(c==='(')depth++; if(c===')')depth--; if(!depth&&(c===';'||c==='}'))break; if(!depth&&c==='{')break; }
        const value=text.slice(start,j), prop=m[1].toLowerCase();
        out.push({prop,value,start:offset+start,end:offset+j,kind}); i=j; boundary=false; continue;
      }
    }
    const c=clean[i];
    if(c==='"'||c==="'") {const q=c; for(i++;i<clean.length;i++){if(clean[i]==='\\')i++;else if(clean[i]===q)break;} boundary=false;}
    else boundary=';{}'.includes(c);
    i++;
  }
  return out;
}
export function queryRegions(text,offset=0) {
  const clean=maskComments(text), out=[];
  for(const m of clean.matchAll(/@(media|container)\b[^{};]*\{/gi)) out.push({prop:'@'+m[1].toLowerCase(),value:text.slice(m.index,m.index+m[0].length-1),start:offset+m.index,end:offset+m.index+m[0].length-1,kind:'query'});
  return out;
}
export function category(p) {
  if(p==='font'||p==='font-size')return 'font-size / font';
  if(p==='line-height')return 'line-height';
  if(p==='letter-spacing'||p==='word-spacing')return 'letter-spacing / word-spacing';
  if(p.startsWith('--'))return 'Custom Properties';
  if(p.startsWith('@'))return 'Media- / Container-Queries';
  if(/^(margin|padding|gap|row-gap|column-gap|inset|top$|right$|bottom$|left$|scroll-margin|scroll-padding|border-spacing|text-indent|outline-offset)/.test(p))return 'Abstände';
  if(/radius/.test(p))return 'border-radius';
  if(/^(border|outline|stroke-width|text-decoration-thickness|-webkit-text-stroke)/.test(p))return 'border-width / outline / Hairlines';
  if(/shadow|filter/.test(p))return 'box-shadow / filter / blur';
  if(/^(width|height|min-|max-|inline-size|block-size|grid-template|grid-auto|flex-basis|columns|column-width|perspective)/.test(p))return 'Größen / Layout';
  return 'Sonstige CSS-Werte';
}
export function fontSize(value, prop) {
  const s=value.trim(); if(prop==='font-size')return s.replace(/\s*!important\s*$/,'');
  if(prop!=='font')return null;
  let depth=0, quote='', from=0; const parts=[];
  for(let i=0;i<=s.length;i++){const c=s[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='(')depth++;if(c===')')depth--;if(!depth&&(i===s.length||/\s|\//.test(c))){if(i>from)parts.push(s.slice(from,i));from=i+1;}}
  return parts.find(x=>/^(?:[-+\d.]*(?:px|rem|em|vw)\b|(?:clamp|min|max|calc|var)\()/.test(x))??null;
}
export function compact(s){return s.replace(/\s+/g,'').toLowerCase();}
export function rem(s) { return s.replace(PX, v=>{const n=Number(v.slice(0,-2))/16;return `${Number(n.toFixed(8))}rem`;}); }
export function lineAt(s,i){return s.slice(0,i).split('\n').length;}
export function scan(root) {
  const result=[];
  for(const path of files(root)) { if(!/\.(?:css|astro|[cm]?[jt]sx?|svg|md|ya?ml|json)$/.test(path))continue; const source=readFileSync(path,'utf8'), file=relative(root,path).split('\\').join('/');
    const regions=cssRegions(source,file), decls=[];
    for(const r of regions) {const text=source.slice(r.start,r.end);decls.push(...declarations(text,r.start,r.kind),...queryRegions(text,r.start));}
    result.push({path,file,source,regions,decls});
  }
  return result;
}
export function selectorAt(source,index) { const clean=maskComments(source), open=clean.lastIndexOf('{',index); const style=[...clean.slice(0,open).matchAll(/<style\b[^>]*>/gi)].at(-1); const begin=Math.max(clean.lastIndexOf('}',open-1),clean.lastIndexOf('{',open-1),style?style.index+style[0].length-1:-1); return clean.slice(begin+1,open).trim(); }
export function svgTextRule(file, d, source) { const selector=selectorAt(source,d.start); return file==='src/components/landing/LandingSite.astro' && ((selector==='.lbl' && d.prop==='font' && compact(d.value)==='40017pxvar(--display)') || (selector==='.pill text' && d.prop==='font' && compact(d.value)==='50011pxvar(--mono)') || (selector==='.marker text' && d.prop==='font' && compact(d.value)==='60013pxvar(--display)')); }
export function disposition(d, raw, source='') {
  const p=d.prop,n=Number(raw.slice(0,-2));
  if(p==='--nav-h' && compact(d.value)==='calc(4.25rem+1px+env(safe-area-inset-top,0px))')return {action:'keep',reason:'Exakte Header-Hairline plus Safe-Area-Fallback; die Layout-Höhe selbst ist rem.'};
  if(/\$\{|[{}]/.test(d.value))return {action:'review',reason:'Dynamischer CSS-Ausdruck; Einheit und Eingabekoordinaten manuell prüfen.'};
  if(/url\(|["']/.test(d.value.replace(/var\([^)]*\)/g,''))&&!['font','font-size'].includes(p))return {action:'review',reason:'String/URL im Wert: keine blinde Ersetzung.'};
  if((p==='width'||p==='height')&&Math.abs(n)===1 && (/(?:sr-only|chips|input|mtabs|radio)/.test(selectorAt(source,d.start)) || /overflow:\s*hidden/.test(source.slice(source.lastIndexOf('{',d.start),source.indexOf('}',d.end))) && /clip(?:-path)?:/.test(source.slice(source.lastIndexOf('{',d.start),source.indexOf('}',d.end)))))return {action:'keep',reason:'1px-Verstecktechnik für zugängliche Eingaben/Text; keine Schrift- oder Layoutgröße.'};
  const lineSelectors=new Set(['.ms-line','.lf-steps::before, .lf-steps::after','.cfg-toast::after','thead th.us::after','.form .bar','.eco-steps li::before, .eco-steps li::after','.ask .ask-steps i','.ruler::before, .ruler::after','.nav-sentinel','.honeypot']);
  if((p==='width'||p==='height')&&Math.abs(n)<=2&&n!==0&&lineSelectors.has(selectorAt(source,d.start)))return {action:'keep',reason:'Bekannte Zierlinie oder unsichtbares Mess-/Honeypot-Element; konstante dünne Geometrie erhalten.'};
  if(/^(?:border(?:-(?:top|bottom|left|right|inline|block)(?:-(?:start|end))?)?(?:-width)?|outline(?:-width)?|-webkit-text-stroke(?:-width)?|stroke-width|text-decoration-thickness)$/.test(p)&&Math.abs(n)<=2&&n!==0)return {action:'keep',reason:'Haarlinie / Kontur ≤ 2px; konstanten visuellen Strich erhalten.'};
  if(/shadow|filter/.test(p)&&Math.abs(n)<=2&&n!==0)return {action:'keep',reason:'Schatten-/Filterkomponente ≤ 2px: feine Optik erhalten.'};
  return {action:'convert',reason:p.startsWith('@')?'em, geteilt durch 16; initiale Browser-Schriftgröße.':'rem, geteilt durch 16; Geometrie bei Root 16px unverändert.'};
}
export function boundaryReason(file, context) {
 if(file==='src/scripts/video-controller.ts'&&context==='autoMediaQuery = `(min-width: ${minAutoWidth}px)`,')return 'Dokumentierter Pixelvertrag minAutoWidth; responsive Aufrufer verwenden autoMediaQuery in em.';
 if(/\brootMargin\s*:|^export const REVEAL_MARGIN\s*=/.test(context))return 'IntersectionObserver-API: px-Grenze beibehalten; rem bei Bedarf vorher auflösen.';
 if(file==='src/components/Chopper404.astro'&&/formation\(\{.*font: '700 220px /.test(context))return 'Canvas-Formationsschrift in festen Rasterkoordinaten.';
 if(file==='src/scripts/effects/shapes.js'&&/moin:.*font: '700 180px /.test(context))return 'Canvas-Formationsschrift in festen Rasterkoordinaten.';
 if(file==='src/scripts/formation/index.js'&&/const font = source\.font|g\.letterSpacing\s*=/.test(context))return 'Canvas-Font/-Sperrung, bestehender Parser erwartet px.';
 if(file==='src/scripts/show-configurator.js'&&/\.style\.setProperty\("--(?:x|tip-left|tip-arrow|tip-top)"/.test(context))return 'DOMRect-/Zeigerkoordinaten sind CSS-px; numerische Geometrie nicht durch 16 teilen.';
 return null;
}
export function commentRanges(source, lineComments=true) {
 const out=[];let quote='';
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c==='/'&&source[i+1]==='*'){const end=source.indexOf('*/',i+2),to=end<0?source.length:end+2;out.push([i,to]);i=to-1;continue;}
  if(lineComments&&c==='/'&&source[i+1]==='/'){const end=source.indexOf('\n',i+2),to=end<0?source.length:end;out.push([i,to]);i=to-1;}
 }
 return out;
}

function geometryAttribute(source,index){
 const open=source.lastIndexOf('<',index),close=source.indexOf('>',open);
 if(open<0||index>close)return false;
 const tag=source.slice(open,close+1);
 if(!/^<(?:svg|rect|circle|ellipse|line|polyline|polygon|path|text|g|use)\b/.test(tag))return false;
 const prefix=source.slice(open,index);
 return /\b(?:x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height|stroke-width|font-size)=["'][^"']*$/.test(prefix);
}
export function violations(source,file){
 const out=[],covered=[];
 for(const r of cssRegions(source,file))for(const d of [...declarations(source.slice(r.start,r.end),r.start,r.kind),...queryRegions(source.slice(r.start,r.end),r.start)]){
  covered.push([d.start,d.end]);
  if(svgTextRule(file,d,source))continue;
  for(const m of maskComments(d.value).matchAll(PX)){
   if(disposition(d,m[0],source).action==='keep')continue;
   out.push(file+':'+lineAt(source,d.start+m.index)+' '+d.prop+': '+m[0]);
  }
  if(/\}px\b/.test(d.value))out.push(file+':'+lineAt(source,d.start)+' dynamische CSS-px: '+d.prop);
 }
 const comments=commentRanges(source,!file.endsWith('.css'));
 for(const m of source.matchAll(/(?<![\w.])[-+]?(?:\d*\.\d+|\d+)px\b|\}px\b/g)){
  if(covered.some(([a,b])=>m.index>=a&&m.index<b)||comments.some(([a,b])=>m.index>=a&&m.index<b))continue;
  const line=lineAt(source,m.index),context=source.split('\n')[line-1].trim();
  if(boundaryReason(file,context)||geometryAttribute(source,m.index))continue;
  out.push(file+':'+line+' unbekannter px-Kontext: '+m[0]);
 }
 return [...new Set(out)];
}
test('CSS/Inline/JS verbieten neue Pixel in Text und Layout',()=>{
 for(const [file,source]of [
  ['src/test.css','.a{font-size:16px;padding:4px;gap:2px}'],
  ['src/test.astro','<div style="margin:12px"></div><style>.a{font:500 17px/1.4 sans-serif}</style>'],
  ['src/test.astro','<div style={`height:${h}px`}></div>'],
  ['src/test.js','const css = "padding: 20px; font-size: 16px";'],
  ['src/test.css',':root{--future-gap:12px} @container (width > 700px){.a{gap:1rem}}']
 ])assert.ok(violations(source,file).length,file);
});
test('rem/em, einheitenlose line-height, Hairlines und Kommentare bleiben erlaubt',()=>{
 const s='/* font-size:16px */ .a{font-size:1rem;line-height:1.4;letter-spacing:.02em;padding:1rem;border:1px solid red;outline:2px solid cyan;box-shadow:0 1px .5rem #000;clip-path:inset(-1rem -100vmax)} @media(max-width:43.75em){.a{gap:1rem}}';
 assert.deepEqual(violations(s,'src/test.css'),[]);
 assert.ok(violations('.a{border:4px solid red}','src/test.css').length);
});
test('API-px erlauben keine neuen CSS-px im selben Modul',()=>{
 assert.deepEqual(violations('new IntersectionObserver(fn, {rootMargin:"100px"});','src/test.js'),[]);
 assert.ok(violations('const url="https://example.org";const css="font-size:18px";','src/test.js').length);
 assert.ok(violations('const css="font-size:18px";','src/scripts/effects/shapes.js').length);
 assert.ok(violations('.a{font-size:16px}','src/scripts/effects/shapes.css').length);
});
test('SVG-Benutzerkoordinaten bleiben erlaubt; HTML-Typografie bleibt geschützt',()=>{
 assert.deepEqual(violations('<svg viewBox="0 0 24 24"><text x="2px" font-size="12px">A</text></svg>','src/test.astro'),[]);
 assert.ok(violations('<svg><text style="font-size:12px">A</text></svg>','src/test.astro').length);
});
test('src enthält nach Migration keine unerlaubten px-Werte',()=>{
 const root=REPO;
 const errors=[];for(const f of scan(root)){if(!/\.(?:css|astro|[cm]?[jt]sx?)$/.test(f.file))continue;errors.push(...violations(f.source,f.file));}
 assert.deepEqual(errors,[],errors.length+' unerlaubte px-Stellen:\n'+errors.slice(0,40).join('\n'));
});

test('Ausnahmen bleiben auf Header-Hairline, SVG-Text und Pixel-API begrenzt',()=>{
 const header=':root{--nav-h:calc(4.25rem + 1px + env(safe-area-inset-top, 0px))}';
 assert.deepEqual(violations(header,'src/styles/global.css'),[]);
 assert.ok(violations(header.replace('4.25rem','68px'),'src/styles/global.css').length);
 assert.ok(violations(header.replace('1px','2px'),'src/styles/global.css').length);
 const svg='<style>.pill text{font:500 11px var(--mono)}.marker text{font:600 13px var(--display)}</style>';
 assert.deepEqual(violations(svg,'src/components/landing/LandingSite.astro'),[]);
 assert.ok(violations(svg.replace('11px','12px'),'src/components/landing/LandingSite.astro').length);
 assert.ok(violations('<style>.st-row{font:500 11px var(--mono)}</style>','src/components/landing/LandingSite.astro').length);
 assert.ok(violations('const css="padding:20px";','src/scripts/video-controller.ts').length);
});

test('Typo-Skala hat keine Zwischenstufe und lässt die Browser-Grundschrift frei',()=>{
 const css=readFileSync(join(REPO,'src/styles/global.css'),'utf8');
 const definitions=Object.fromEntries(declarations(css).filter(d=>d.prop.startsWith('--text-')).map(d=>[d.prop,d.value.trim()]));
 assert.equal(Object.keys(definitions).length,15);
 assert.deepEqual(Object.fromEntries(['xs','label','sm','control','base','copy','md'].map(k=>[k,definitions['--text-'+k]])),{
  xs:'0.75rem',label:'0.8125rem',sm:'0.875rem',control:'0.9375rem',base:'1rem',copy:'1.0625rem',md:'1.125rem',
 });
 assert.doesNotMatch(css,/--text-sm-plus/);
 for(const f of scan(REPO))for(const d of f.decls){
  const size=fontSize(d.value,d.prop);
  if(size)assert.ok(!['0.90625rem','0.84375rem','0.78125rem','0.71875rem','0.6875rem'].includes(size),f.file+': '+size);
  if(selectorAt(f.source,d.start)==='html')assert.notEqual(d.prop,'font-size','Keine feste html-font-size.');
 }
});

test('Aktiver Konfigurator: Regler und Skala verwenden bei jeder Root-Größe dieselben Thumb-Ränder',()=>{
 const css=readFileSync(join(REPO,'src/styles/show-configurator.css'),'utf8');
 const thumb=Number(css.match(/\.cfg-range::-webkit-slider-thumb\s*\{[^}]*width:\s*([\d.]+)rem/)[1]);
 const inset=Number(css.match(/\.cfg-ticks\s*\{[^}]*margin: -?[\d.]+rem ([\d.]+)rem 0/)[1]);
 assert.equal(inset,thumb/2);
 assert.match(css,/left: calc\(var\(--p\) \* 100%\)/);
 for(const root of [16,20,32])for(const width of [240,600])for(const share of [0,0.5,1]){
  const tick=inset*root+share*(width-2*inset*root);
  assert.equal(tick,thumb*root/2+share*(width-thumb*root));
 }
});

test('Video folgt der mobilen em-Grenze bei größerer Grundschrift; minAutoWidth bleibt Pixel-API',async()=>{
 const {createVideoController,VIDEO_MOBILE_QUERY}=await import('../src/scripts/video-controller.ts');
 const css=readFileSync(join(REPO,'src/styles/global.css'),'utf8');
 assert.ok(css.includes('@media '+VIDEO_MOBILE_QUERY), 'CSS und Video-Quelle müssen dieselbe Grenze verwenden.');
 assert.match(readFileSync(join(REPO,'src/components/landing/LandingHero.astro'),'utf8'),/autoMediaQuery: `not all and \$\{VIDEO_MOBILE_QUERY\}`/);
 const names=['document','navigator','matchMedia','MutationObserver','window'];
 const saved=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const doc=new EventTarget();doc.hidden=false;doc.documentElement={classList:{contains:()=>false}};
 let initialFont=16, viewport=700;const queries=[];
 const matches=query=>query.startsWith('not all and ')?!matches(query.slice(12)):
  query===VIDEO_MOBILE_QUERY?viewport<=43.75*initialFont:
  query.startsWith('(min-width: ')?viewport>=Number(query.match(/[\d.]+/)[0]):false;
 const queryFor=media=>{const q=new EventTarget();q.media=media;Object.defineProperty(q,'matches',{get:()=>matches(media)});queries.push(q);return q;};
 class Video extends EventTarget{src='';dataset={src:'/large.mp4',srcSmall:'/small.mp4'};plays=0;pauses=0;pause(){this.pauses++;}play(){this.plays++;return Promise.resolve();}}
 Object.defineProperties(globalThis,{
  document:{configurable:true,value:doc},navigator:{configurable:true,value:{}},window:{configurable:true,value:{}},
  matchMedia:{configurable:true,value:queryFor},MutationObserver:{configurable:true,value:class{observe(){}disconnect(){}}},
 });
 const controllers=[];
 try{
  for(const font of [16,20,32]){
   initialFont=font;viewport=43.75*font;
   const video=new Video(), controller=createVideoController(video,{host:new EventTarget(),trigger:'manual',autoMediaQuery:`not all and ${VIDEO_MOBILE_QUERY}`});controllers.push(controller);
   await new Promise(resolve=>setImmediate(resolve));assert.equal(video.plays,0);
   controller.setChoice(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(video.src,'/small.mp4');
   controller.dispose();controllers.pop();
   viewport+=0.5;
   const wide=new Video(), desktop=createVideoController(wide,{host:new EventTarget(),trigger:'manual',autoMediaQuery:`not all and ${VIDEO_MOBILE_QUERY}`});controllers.push(desktop);
   await new Promise(resolve=>setImmediate(resolve));assert.equal(wide.plays,1);assert.equal(wide.src,'/large.mp4');
   const pauses=wide.pauses;viewport-=1;queries.forEach(q=>q.dispatchEvent(new Event('change')));await new Promise(resolve=>setImmediate(resolve));assert.ok(wide.pauses>pauses);
   desktop.dispose();controllers.pop();
  }
  initialFont=32;viewport=701;
  const video=new Video(), controller=createVideoController(video,{host:new EventTarget(),trigger:'ambient',minAutoWidth:701});controllers.push(controller);
  await new Promise(resolve=>setImmediate(resolve));assert.ok(queries.some(q=>q.media==='(min-width: 701px)'));assert.equal(video.plays,1);
 }finally{
  controllers.forEach(c=>c.dispose());
  for(const [k,d]of Object.entries(saved))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];
 }
});
