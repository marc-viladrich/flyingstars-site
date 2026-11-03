import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseVideo } from './video-lab-selection.mjs';
const desktop={preferred:{id:'desktop-av1',codec:'av1',width:1918,height:1080,bytes:3,bitrate:1000000,fps:25,contentType:'video/mp4; codecs="av01.0.08M.08"'},fallback:{id:'desktop-h264',codec:'h264'}};
const mobile={preferred:{...desktop.preferred,id:'mobile-av1',width:640,height:360},fallback:{id:'mobile-h264',codec:'h264',width:640}};
test('Missing, unsupported, unsmooth and software-only reports retain H264 on desktop and mobile',async()=>{
 for(const pair of [desktop,mobile])for(const caps of [undefined,{decodingInfo:async()=>({supported:false})},{decodingInfo:async()=>({supported:true,smooth:false,powerEfficient:true})},{decodingInfo:async()=>({supported:true,smooth:true,powerEfficient:false})},{decodingInfo:async()=>{throw Error('unknown')}}])assert.equal(await chooseVideo(pair,caps),pair.fallback);
});
test('A positive report selects the matching AV1 resolution and passes the actual encode configuration',async()=>{
 for(const pair of [desktop,mobile]){
  let configuration;
  const chosen=await chooseVideo(pair,{decodingInfo:async c=>{configuration=c;return{supported:true,smooth:true,powerEfficient:true};}});
  assert.equal(chosen,pair.preferred);assert.equal(configuration.video.width,pair.preferred.width);assert.equal(configuration.video.contentType,pair.preferred.contentType);
 }
});
test('A hung decoder probe cannot leave the hero waiting forever',async()=>{
 assert.equal(await chooseVideo(mobile,{decodingInfo:()=>new Promise(()=>{})},5),mobile.fallback);
});
