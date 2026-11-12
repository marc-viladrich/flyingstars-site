// All persistent anchors use pass-one coordinates. Each pass owns an explicit affine transform.
export function pointBox(points,w,h,margin=.08) {
 if(!points.length)return null;
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const p of points){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
 const dx=Math.max(1,x1-x0)*margin,dy=Math.max(1,y1-y0)*margin;
 return [Math.max(0,x0-dx),Math.max(0,y0-dy),Math.min(w,x1+dx),Math.min(h,y1+dy)];
}
export function transform(box,width,height){return {x:box[0],y:box[1],sx:width/(box[2]-box[0]),sy:height/(box[3]-box[1])};}
export function mapPoint(p,t,inverse=false){return inverse?{x:p.x/t.sx+t.x,y:p.y/t.sy+t.y}:{x:(p.x-t.x)*t.sx,y:(p.y-t.y)*t.sy};}
export function mapBox(b,t,inverse=false){const a=mapPoint({x:b[0],y:b[1]},t,inverse),z=mapPoint({x:b[2],y:b[3]},t,inverse);return [a.x,a.y,z.x,z.y];}
export function planFit(image,points,sourceLong=Infinity){
 const box=pointBox(points,image.width,image.height);if(!box)return null;
 const w=box[2]-box[0],h=box[3]-box[1],long=Math.max(w,h),short=Math.min(w,h);
 if(long>=.6*Math.max(image.width,image.height)&&Math.min(image.width,image.height)>=200)return null;
 let scale=Math.max(512/long,220/short);
 // (v8, perf C: the crop pass is capped at 640 px on its long side and 0.6 MP; v7 went up to 1.2 MP, which costs
 // proportionally and showed no gain on the proxy: bench perfC-cap640)
 scale=Math.min(scale,Math.sqrt(600000/(w*h)),640/long,sourceLong*2/Math.max(image.width,image.height));
 const width=Math.max(1,Math.floor(w*scale)),height=Math.max(1,Math.floor(h*scale));
 return {box,width,height,size:Math.min(sourceLong*2,Math.ceil(Math.max(image.width,image.height)*scale)),transform:transform(box,width,height)};
}
// Probe and crop passes remain private. Only the returned final result may be displayed.
export async function contentPipeline(raster,convert,opts,{single=false,sourceLong=Infinity}={}){
 const image=await raster(512),identity=transform([0,0,image.width,image.height],image.width,image.height);
 // v8: the first pass is a probe (no density retries, no schematic trials); it only decides the crop. When no crop
 // follows and the probe is not clean within the budget, the same raster is converted once more with everything on.
 const first=await convert(image,{...opts,probe:true});const plan=single?null:planFit(image,first.points,sourceLong);
 if(!plan){
  const full=first.meta?.probeWouldChange!==false;
  return {result:full?await convert(image,opts):first,passes:[identity],image};
 }
 const high=await raster(plan.size);
 const box=mapBox(plan.box,transform([0,0,image.width,image.height],high.width,high.height));
 const left=Math.max(0,Math.floor(box[0])),top=Math.max(0,Math.floor(box[1]));
 const width=Math.max(1,Math.min(high.width-left,Math.ceil(box[2])-left)),height=Math.max(1,Math.min(high.height-top,Math.ceil(box[3])-top));
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)data.set(high.data.subarray(((y+top)*high.width+left)*4,((y+top)*high.width+left+width)*4),y*width*4);
 const t={x:left*image.width/high.width,y:top*image.height/high.height,sx:high.width/image.width,sy:high.height/image.height};
 const cropped={width,height,data};
 const result=await convert(cropped,{...opts,exclude:(opts.exclude||[]).map(p=>mapPoint(p,t)),erase:(opts.erase||[]).map(p=>mapPoint(p,t))});
 // Preserve the selected content semantics when the crop itself is now a full logo.
 result.meta ||= {};
 if(first.meta?.part==='mark'){result.meta.part='mark';result.meta.partRequested=opts.part;}
 if(first.meta?.container?.found && !result.meta.container?.found) result.meta.container={...first.meta.container,box:first.meta.container.box?mapBox(first.meta.container.box,t):undefined};
 return {result,passes:[identity,t],image:cropped};
}
