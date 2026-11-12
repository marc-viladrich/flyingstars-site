// Semantic masks traced against the catalogue point renders, not x<0: tilted bowls cross the centre.
// Indices refer to immutable catalogue variants. Spark points above the rims belong to neither glass.
import { smooth } from '../show-motion.js';
import { sampleOutline } from '../show-geometry.js';
import { assign } from '../show-flight.js';
const LEFT = {
  'm-a819a681c8cee7a2': [0,1,2,4,5,6,8,9,10,11,12,14,15,16,18,19,20,21,24,25,26,27,28,30,33,41,42,45,46,53,54,56,62,63,64,66],
  'm-c0934127db49df2e': [0,7,8,9,10,14,15,18,20,21,22,23,25,29,38,40,43,44,45,47,48,51,53,54,55,56,57,58,59,60,61,63,65,69,73,77,78,79,80,82,83,86,87],
  'm-d4538cee3c87fc1b': [0,1,2,3,4,6,9,11,13,14,15,18,20,21,22,24,26,27,33,35,38,41,49,52,53,54,55,60,62,63,64,65,66,68,69,74,75,77,80,83,85,86,87,88,92,93,94,96,97,99,106],
  'm-de8bd2e761a7d1ed': [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,30,31,32,33,34,35,36,37,38,41,43,44,45,48,55,58,59,60,61,62,63,64,65,66,67,68,70,78,88,90,91,92,93,94,95,96,97,99,101,102,118,119,120,121,122,123,124,125,126,130,133,134,135,142],
};
export function glassGroups(f) {
  const left = new Set(LEFT[f.id]);
  if (!LEFT[f.id]) throw new Error(`Unreviewed glass variant ${f.id}`);
  const sparks = new Set();
  // Explicit sparks also cover the different vertical crop of each source.
  const extra = { 'm-a819a681c8cee7a2':[38,39], 'm-c0934127db49df2e':[16,62], 'm-d4538cee3c87fc1b':[34,42,47,70,73,107], 'm-de8bd2e761a7d1ed':[17,40,46,49,52,54,73,75,85,89] };
  extra[f.id].forEach(j=>sparks.add(j));
  return { left, right: new Set(f.points.flatMap((_,j)=>!left.has(j)&&!sparks.has(j)?[j]:[])), sparks };
}
const progress = (t, start, duration) => smooth((t-start)/duration);
const interpolate = (p,q,u,o) => { for(let k=0;k<3;k++) o[k]=p[k]+(q[k]-p[k])*u; };
/** Dedicated actions share the catalogue's stable point identity and the engine's reduced-motion path. */
export function catalogAction(key,f,pts) {
  if(key==='smiley') {
    const eye=pts.flatMap((p,j)=>p[0]>.12&&p[0]<.55&&p[1]>.02&&p[1]<.36?[j]:[]).sort((a,b)=>pts[a][0]-pts[b][0]);
    const targets=new Map(eye.map((j,i)=>[j,[.18+.32*i/(eye.length-1),.18,pts[j][2]]]));
    return { live:(b,j,t,o)=>{const q=targets.get(j); if(q) {const u=progress(t,.5,.9)*(1-progress(t,1.65,.9)); interpolate(b,q,u,o);} }, duration:3 };
  }
  if(key==='handschlag') {
    // The source is the OPEN pose (clip 24, 0.63 s). Separate hands first; fold fingers into the clasp, then hold.
    const start=pts.map(p=>[p[0]+(p[0]<0?-.22:.22),p[1],p[2],...p.slice(3)]);
    const targets=new Map();
    const contours=[
      [[-1,.53],[-.65,.48],[-.30,.47],[-.15,.39],[.02,.25],[.23,.08],[.43,-.11],[.40,-.21],[.30,-.23],[.10,-.08],[.34,-.28],[.29,-.38],[.19,-.38],[-.02,-.22],[.19,-.42],[.11,-.50],[.02,-.48],[-.19,-.30],[-.04,-.49],[-.14,-.55],[-.31,-.46],[-.62,-.23],[-1,-.13]],
      [[1,.53],[.64,.49],[.33,.50],[.10,.47],[-.05,.38],[-.11,.20],[-.06,.09],[.05,.07],[.14,.20],[.25,.18],[.42,.01],[.55,-.08],[.35,-.34],[.08,-.57],[-.12,-.56],[-.31,-.46],[-.37,-.35],[-.28,-.29],[-.13,-.39],[-.26,-.26],[-.19,-.18],[-.04,-.27],[-.16,-.15],[-.07,-.08],[.11,-.20],[.42,-.28],[.68,-.15],[1,.03]],
    ];
    for(let side=0;side<2;side++) {
      const idx=pts.flatMap((p,j)=>(p[0]<0?0:1)===side?[j]:[]);
      const q=sampleOutline([{pts:contours[side],closed:false}],idx.length).map(([x,y])=>[x,y,0]);
      const order=assign(Float64Array.from(idx.flatMap(j=>start[j].slice(0,3))),Float64Array.from(q.flat()));
      idx.forEach((j,i)=>targets.set(j,q[order[i]]));
    }
    return {pts:start, duration:4.5, live:(b,j,t,o)=>interpolate(b,targets.get(j),progress(t,.5,3.5),o)};
  }
  if(key==='anstossen') {
    const {left,right}=glassGroups(f);
    const centroid=(idx)=>[0,1].map(k=>[...idx].reduce((s,j)=>s+pts[j][k],0)/idx.size);
    const l=centroid(left),r=centroid(right),delta=[l[0]-r[0],l[1]-r[1]];
    return { duration:4.5, live:(b,j,t,o)=>{
      const u=progress(t,.5,3.3);
      if(right.has(j)) { o[0]+=delta[0]*u; o[1]+=delta[1]*u; o[2]+=.16*u; }
      // Rear drones hold position and dim as the front glass covers them; no flight through the front glass.
      if(left.has(j)) o[3]=1-progress(t,1.4,2.4);
    }};
  }
  if(key==='konfetti') {
    const confetti=new Set(f.id.startsWith('bild-')
      ? [...Array.from({length:22},(_,j)=>j),24]
      : [0,26,48,55,64,71,80,84,96,97,105,127,129,132,137,140,147,148]);
    // The blue pull-cord and the white ring below it are pulled away from the barrel together.
    const trigger=new Set(pts.flatMap((p,j)=>!confetti.has(j)&&p[1]<-.42?[j]:[]));
    const muzzle=f.id.startsWith('bild-')?[.05,.16]:[.18,.58];
    const start=pts.map((p,j)=>confetti.has(j)?[muzzle[0]+(p[0]-muzzle[0])*.32,muzzle[1]+(p[1]-muzzle[1])*.12,p[2],...p.slice(3)]:p);
    return {pts:start,duration:5,live:(b,j,t,o)=>{
      if(trigger.has(j)){const u=progress(t,.3,1.2);o[0]-=.08*u;o[1]-=.12*u;}
      if(confetti.has(j)){const u=progress(t,1.6,2.8);interpolate(b,pts[j],u,o);o[3]=progress(t,1.6,.5);}
    }};
  }
  return null;
}
