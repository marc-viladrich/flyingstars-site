// v10: final formations only. One retained worker answers retarget while another converts.
import { contentPipeline, mapPoint } from './content-fit.mjs';
import { rasterizeFile } from './raster.js';
import { fitToShow } from './formation-core.mjs';
export function logoFormations(file,{opts={},raster=rasterizeFile}={}) {
 opts={...opts};
 const spawn=()=>{const w=new Worker(new URL('./logo-worker.js',import.meta.url),{type:'module'}),waiting=new Map();let seq=0;
  w.onmessage=e=>{const x=waiting.get(e.data.id);waiting.delete(e.data.id);e.data.error?x?.reject(new Error(e.data.error)):x?.resolve(e.data);};
  w.onerror=e=>{for(const x of waiting.values())x.reject(new Error(e.message));waiting.clear();};
  return {ask:msg=>new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject});w.postMessage({...msg,id});}),kill(){w.terminate();for(const x of waiting.values())x.reject(new Error('stopped'));waiting.clear();}};
 };
 let server=null,job=null,passes=null,disposed=false,version=0,removal={exclude:(opts.exclude||[]).map(p=>({...p})),erase:(opts.erase||[]).map(p=>({...p}))};
 const cache=new Map(),fast=new Set(),completed=new Set();let sourceLong=Infinity;
 const ready=(async()=>{if(!/\.svg$/i.test(file.name||'')&&file.type!=='image/svg+xml'){const b=await createImageBitmap(file);sourceLong=Math.max(b.width,b.height);b.close();}return raster(file,512);})();
 function cancel(){if(job){job.worker?.kill();cache.delete(job.key);job=null;}}
 const keyOf=n=>JSON.stringify([n,...[removal.exclude,removal.erase].map(a=>a.map(p=>p.box||[p.x,p.y]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]))]);
 async function pack(result,n,t){const pts=await fitToShow(result,n);const f=pts.frame; if(f)pts.meta.frame=t?{sx:f.sx*t.sx,sy:f.sy*t.sy,ox:f.ox-t.x*t.sx*f.sx,oy:f.oy-t.y*t.sy*f.sy}:f;if(t){pts.meta.elements=(result.meta?.elements||[]).map(e=>({...e,anchor:e.anchor?mapPoint(e.anchor,t,true):null}));pts.meta.colourGroups=(result.meta?.colourGroups||[]).map(g=>({...g,anchor:g.anchor?mapPoint(g.anchor,t,true):null}));}return pts;}
 function formation(n,{onCompute,debounceMs=0}={}) {
  if(!Number.isFinite(Number(n))||Number(n)<1)return Promise.reject(new RangeError('Bitte eine positive Drohnenzahl angeben.'));
  n=Math.max(1,Math.round(n));if(disposed)return Promise.reject(new Error('disposed'));
  const key=keyOf(n);if(job?.key!==key)cancel();if(cache.has(key)){if(completed.has(key))fast.add(key);return cache.get(key);}
  const mine={key,worker:null},v=version;job=mine;
  const p=(async()=>{
   if(server){const q=await server.ask({retarget:n});if(disposed||version!==v||job!==mine)throw new Error('stopped');if(q.final){fast.add(key);return pack(q.result,n,passes?.at(-1));}}
   onCompute?.(n);
   const first=await ready;
   if(debounceMs)await new Promise(resolve=>setTimeout(resolve,debounceMs));
   if(disposed||version!==v||job!==mine)throw new Error('stopped');
   const W=mine.worker=spawn();
   const out=await contentPipeline(size=>size===512?first:raster(file,size),async(image,o)=>(await W.ask({image,opts:o})).result,{...opts,...removal,drones:n},{sourceLong});
   if(disposed||version!==v||job!==mine){W.kill();throw new Error('stopped');}
   server?.kill();server=W;passes=out.passes;mine.worker=null;
   return pack(out.result,n,passes.at(-1));
  })().then(x=>{if(disposed||version!==v||job!==mine)throw new Error('stopped');completed.add(key);if(job===mine)job=null;return x;}).catch(e=>{if(cache.get(key)===p)cache.delete(key);if(job===mine)job=null;mine.worker?.kill();throw e;});
  cache.set(key,p);return p;
 }
 function setRemovals({exclude=[],erase=[]}={}){cancel();version++;server?.kill();server=null;passes=null;removal={exclude:exclude.map(p=>({...p})),erase:erase.map(p=>({...p}))};fast.clear();}
 return {formation,isFinalFast:n=>fast.has(keyOf(Math.max(1,Math.round(n)))),setRemovals,dispose(){disposed=true;version++;cancel();server?.kill();server=null;cache.clear();completed.clear();}};
}
