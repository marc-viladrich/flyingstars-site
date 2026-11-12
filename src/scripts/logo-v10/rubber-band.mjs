// Pointer capture keeps a drag intact outside the canvas; touch scrolling is disabled only on the stage.
export function bindRubberBand(canvas, {hit,overlay,candidates,select}) {
 let drag=null,skip=false;
 const cancel=()=>{if(drag&&canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);drag=null;overlay.hidden=true;};
 canvas.addEventListener('pointerdown',e=>{
   if(e.button!==0||!e.isPrimary||hit(e))return;
   skip=false;drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY,add:e.shiftKey,moved:false};
   canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   drag.x1=e.clientX;drag.y1=e.clientY;drag.moved ||= Math.hypot(drag.x1-drag.x0,drag.y1-drag.y0)>=5;
   if(!drag.moved)return;
   const b=overlay.parentElement.getBoundingClientRect();overlay.hidden=false;
   Object.assign(overlay.style,{left:Math.min(drag.x0,drag.x1)-b.left+'px',top:Math.min(drag.y0,drag.y1)-b.top+'px',width:Math.abs(drag.x1-drag.x0)+'px',height:Math.abs(drag.y1-drag.y0)+'px'});
 });
 canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;cancel();if(d.moved){skip=true;select(d,d.add);}});
 canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',()=>{if(drag)cancel();});
 return {get active(){return !!drag?.moved;},candidates,cancel,suppressClick(){const v=skip;skip=false;return v;}};
}
