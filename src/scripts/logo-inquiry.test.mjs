import {test} from 'node:test';
import assert from 'node:assert/strict';
const svg='<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>';
test('blocked storage does not break ordinary enquiries',async()=>{
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw Error('blocked');}});
 globalThis.window=new EventTarget();
 const module=await import('./logo-inquiry.mjs?blocked');
 await module.logoInquiryReady;
 assert.equal(module.getLogoInquiry(),null);
 module.clearLogoInquiry();
});
test('tab restoration preserves exact bytes, removals and expiry',async()=>{
 let saved=JSON.stringify({at:Date.now(),original:{name:'own.svg',type:'image/svg+xml',data:btoa(svg)},preview:null,drones:200});
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:()=>saved,setItem:(k,v)=>{saved=v;},removeItem:()=>{saved=null;}}});
 const module=await import('./logo-inquiry.mjs?restore');await module.logoInquiryReady;
 assert.equal(await module.getLogoInquiry().original.text(),svg);
 module.removeLogoInquiry('original');assert.equal(JSON.parse(saved).original,null);
 module.removeLogoInquiry('drones');assert.equal(module.getLogoInquiry().drones,null);
 module.clearLogoInquiry();assert.equal(saved,null);
 saved=JSON.stringify({at:Date.now()-31*60*1000,original:{name:'own.svg',type:'image/svg+xml',data:btoa(svg)},drones:200});
 const expired=await import('./logo-inquiry.mjs?expired');await expired.logoInquiryReady;assert.equal(expired.getLogoInquiry(),null);assert.equal(saved,null);
});
