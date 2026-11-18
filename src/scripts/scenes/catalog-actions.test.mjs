import '../../../scripts/show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogScene,CATALOG} from './catalog.js';
import {glassGroups} from './catalog-actions.js';
const pose=(b,t)=>b.pts.map((p,j)=>{const o=[...p.slice(0,3),1];b.live(p,j,t,o);return o;});
for(const key of ['smiley','handschlag','konfetti','anstossen']) {
 test(`${key}: all variants/packages retain drones, reserve stays dark, continuous bounded flights`,async()=>{
  for(const v of CATALOG[key].variants) for(const tier of ['SPARK','HORIZON','ODYSSEY']) {
   const b=(await catalogScene(key,tier,v.points+3,key)).beats.at(-1);
   assert.equal(b.pts.length,v.points+3);
   const dt=.01; let prev=pose(b,0),vel=null;
   assert.ok(prev.every((p,j)=>Math.hypot(...p.slice(0,3).map((x,k)=>x-b.pts[j][k]))<1e-9),'starts at own formation');
   for(let t=dt;t<6;t+=dt) {
    const now=pose(b,t),vs=now.map((p,j)=>p.slice(0,3).map((x,k)=>(x-prev[j][k])/dt));
    // Runde 5: zusätzliche Drohnen zeichnen die Linien nach (scenes/catalog-resample.js); dunkel bleibt nur die graue Reserve
    now.forEach((p,j)=>{assert.ok(p.every(Number.isFinite));if(b.pts[j].slice(3).every(c=>c===60))assert.equal(p[3],0);});
    for(let j=0;j<vs.length;j++) {
     assert.ok(Math.hypot(...vs[j])<2.6,`${key}/${v.id} speed`);
     if(vel) assert.ok(Math.hypot(...vs[j].map((x,k)=>(x-vel[j][k])/dt))<5.5,`${key}/${v.id} acceleration`);
    }
    prev=now;vel=vs;
   }
  }
 });
}
test('wink closes only right eye into a line and returns to the identical open pose',async()=>{
 const b=(await catalogScene('smiley','SPARK',105,'')).beats[0]; const closed=pose(b,1.5),end=pose(b,3);
 const moved=closed.flatMap((p,j)=>Math.abs(p[1]-b.pts[j][1])>1e-8?[j]:[]);
 assert.ok(moved.length>5);for(const j of moved){assert.ok(b.pts[j][0]>.12);assert.ok(closed[j][1]>=.169&&closed[j][1]<=.206,'Lid als flacher Bogen');}
 // the lid is not denser than the open eye: only every second eye drone forms it, the others are dark meanwhile
 const lid=moved.map(j=>closed[j][0]).sort((a,c)=>a-c), gaps=lid.slice(1).map((x,i)=>x-lid[i]);
 assert.ok(Math.min(...gaps)>.02,`Abstand im Lid ${Math.min(...gaps)}`);
 const dark=closed.flatMap((p,j)=>p[3]<.05?[j]:[]);
 assert.ok(dark.length>=moved.length-1&&dark.every(j=>b.pts[j][0]>.12&&!moved.includes(j)));
 assert.deepEqual(end,b.pts.map(p=>[...p.slice(0,3),1]));
});
test('glasses clink: both stay lit, swing apart and back to touching rims, never merge into one glass',async()=>{
 for(const v of CATALOG.anstossen.variants) {
  const f=JSON.parse(await readFile(new URL(`../../../public/media/katalog/${v.id}.json`,import.meta.url)));
  const {left,right,sparks}=glassGroups(f);
  assert.equal(left.size+right.size+sparks.size,f.points.length);
  if(v.points===88) {assert.ok(left.has(79)&&left.has(9));assert.ok(right.has(32));}
  if(v.points===108) {assert.ok(left.has(54));assert.ok(right.has(67));}
  const b=(await catalogScene('anstossen','SPARK',v.points,'')).beats[0];
  const cx=(o,idx)=>[...idx].reduce((s,j)=>s+o[j][0],0)/idx.size, gap=(o)=>cx(o,right)-cx(o,left), rest=gap(pose(b,0));
  // Runde 5: vorher schob sich das rechte Glas auf das linke (Abstand → 0), das linke erlosch
  for(let t=0;t<5;t+=.05){const o=pose(b,t); assert.ok(gap(o)>rest*.97,`${v.id} t=${t.toFixed(2)}: Gläser rücken ineinander`); for(const j of [...left,...right]) assert.ok(o[j][3]>.99,'Glas bleibt hell');}
  assert.ok(gap(pose(b,1.2))>rest*1.08,'vor dem Anstoßen auseinander');
  const end=pose(b,5); for(const j of [...left,...right]) for(let k=0;k<3;k++) assert.ok(Math.abs(end[j][k]-b.pts[j][k])<1e-9,'endet im Katalogbild');
  const lit=(t)=>[...sparks].reduce((s,j)=>s+pose(b,t)[j][3],0); assert.ok(lit(2.05)>lit(1.2)*2,'Funken leuchten beim Anstoßen auf');
 }
});
test('pull precedes confetti, barrel stays still and all hidden drones move continuously',async()=>{
 for(const v of CATALOG.konfetti.variants){const b=(await catalogScene('konfetti','SPARK',v.points,'')).beats[0];
 const start=pose(b,0),pulled=pose(b,1.5),fired=pose(b,4.5);
 const hidden=start.flatMap((p,j)=>p[3]===0?[j]:[]);assert.ok(hidden.length>10);
 for(const j of hidden){assert.equal(pulled[j][3],0);assert.equal(fired[j][3],1);}
 assert.ok(pulled.some((p,j)=>p[3]>0&&Math.abs(p[1]-start[j][1])>.1),'trigger pulled');
 assert.ok(start.filter((p,j)=>p[3]>0&&p.slice(0,3).every((x,k)=>x===fired[j][k])).length>20,'barrel stable');
 }
});

test('ODYSSEY light drawing never exposes parked confetti before the trigger',async()=>{
 for(const v of CATALOG.konfetti.variants){const {beats}=await catalogScene('konfetti','ODYSSEY',v.points,'');
 const initial=pose(beats[1],0),drawing=pose(beats[0],1.5);
 for(let j=0;j<initial.length;j++)if(initial[j][3]===0)assert.equal(drawing[j][3],0);}
});
