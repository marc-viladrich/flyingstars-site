import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseVideo } from './video-lab-selection.mjs';
const original={id:'original',codec:'h264'}, av1={id:'av1',group:'desktop',width:1918,bytes:3,codec:'av1',contentType:'video/mp4; codecs="av01.0.08M.08"'},vp9={...av1,id:'vp9',bytes:4,codec:'vp9'};
test('Unsupported, software-only and unavailable capability reports keep H264 available',async()=>{
 for (const caps of [undefined,{decodingInfo:async()=>({supported:false})},{decodingInfo:async()=>({supported:true,smooth:true,powerEfficient:false})},{decodingInfo:async()=>{throw Error('unknown')}}])
  assert.equal((await chooseVideo([original,av1],caps)).id,'original');
});
test('Choose the smallest confirmed efficient full-resolution candidate without user-agent sniffing',async()=>{
 assert.equal((await chooseVideo([vp9,original,av1],{decodingInfo:async()=>({supported:true,smooth:true,powerEfficient:true})})).id,'av1');
 let calls=0;
 assert.equal((await chooseVideo([vp9,original,av1],{decodingInfo:async()=>({supported:true,smooth:true,powerEfficient:++calls>1})})).id,'vp9');
});
