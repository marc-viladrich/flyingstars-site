// Shared canvas-2D loading cloud and final-only flight. No intermediate logo is accepted here.
const hash = i => {const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function createCloud(canvas, redraw) {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0, mode='', n=0, started=0, targets=[], from=[], current=[];
  const size=()=>{const d=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.round(canvas.clientWidth*d));canvas.height=Math.max(1,Math.round(canvas.clientHeight*d));};
  function cloudPoint(i,t){const a=hash(i+1)*Math.PI*2,r=Math.sqrt(hash(i+900));return {x:canvas.width*(.5+.37*r*Math.cos(a)+.018*Math.sin(t*.45+i)),y:canvas.height*(.5+.31*r*Math.sin(a)+.018*Math.cos(t*.38+i)),r:170,g:202,b:255};}
  function tick(now){size(); const g=canvas.getContext('2d'),t=motion.matches?0:now/1000;g.fillStyle='#05070d';g.fillRect(0,0,canvas.width,canvas.height);current=[];
    for(let i=0;i<n;i++){let p;
      if(mode==='cloud')p=cloudPoint(i,t);
      else {const a=from[i]||cloudPoint(i,t),b=targets[i],u=Math.max(0,Math.min(1,(now-started-(mode==='flight'?hash(i)*350:0))/650)),v=u*u*(3-2*u);p={...b,x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v};}
      current.push(p);g.fillStyle=`rgba(${p.r},${p.g},${p.b},${mode==='cloud'?.65+.25*Math.sin(t*.6+i):1})`;g.beginPath();g.arc(p.x,p.y,Math.max(1.5,canvas.width*.002),0,Math.PI*2);g.fill();
    }
    if(mode!=='cloud'&&now-started>1050){mode='';frame=0;canvas.dataset.motion='';redraw();return;}
    if(!motion.matches)frame=requestAnimationFrame(tick);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;mode='';canvas.dataset.motion='';}
  motion.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;if(mode==='cloud')tick(performance.now());else if(mode){stop();redraw();}});
  return { get active(){return !!mode;}, start(count){stop();n=count;mode='cloud';canvas.dataset.motion='cloud';tick(performance.now());}, settle(points,{direct=false}={}){const wasCloud=mode==='cloud';from=current.slice();stop();if(motion.matches){redraw();return;}targets=points;n=points.length;mode=wasCloud&&!direct?'flight':'morph';canvas.dataset.motion=mode;started=performance.now();tick(started);},stop };
}
