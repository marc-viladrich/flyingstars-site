import {simulate} from '../../../scripts/show-sim.mjs';
import {CATALOG} from './catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
for(const key of ['smiley','handschlag','konfetti','anstossen']) test(`${key}: actual flight engine, three packages, every variant`, async()=>{
 let speed=0,accel=0;
 for(const v of CATALOG[key].variants)for(const pkg of ['SPARK','HORIZON','ODYSSEY']) {
  const m={label:key,tiers:{[pkg]:{build:`catalog:${key}:${pkg}`,caption:key}}};
  let prev,vel,prevT;
  await simulate({motifs:[m],occasion:'jubilaeum',pkg,n:v.points+3,fps:60,seconds:22,onFrame(t,pos){
   if(prev){const dt=t-prevT;const next=pos.map((x,k)=>(x-prev[k])/dt);
    for(let k=0;k<pos.length;k+=3){speed=Math.max(speed,Math.hypot(...next.slice(k,k+3)));if(vel)accel=Math.max(accel,Math.hypot(...next.slice(k,k+3).map((x,q)=>(x-vel[k+q])/dt)));}vel=next;}
   prev=[...pos];prevT=t;
  }});
 }
 assert.ok(speed<=2.6,`speed ${speed}`);assert.ok(accel<=5.5,`acceleration ${accel}`);
 console.log(`${key}: speed ${speed.toFixed(3)}, acceleration ${accel.toFixed(3)}`);
});
test('reduced motion: real engine renders a still instead of running an action',async()=>{
 const normal=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:true,addEventListener(){}});
 try {
  for(const key of ['smiley','handschlag','konfetti','anstossen']) {
   const pkg='SPARK',n=CATALOG[key].variants[0].points;
   const result=await simulate({motifs:[{label:key,tiers:{[pkg]:{build:`catalog:${key}:${pkg}`,caption:key}}}],occasion:'jubilaeum',pkg,n,seconds:5});
   assert.ok(result.frames<=1,`${key}: no animation frame loop with reduced motion`);
  }
 } finally {globalThis.matchMedia=normal;}
});
