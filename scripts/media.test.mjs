import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/media.ts';

test('Video proxy uses a fixed source, preserves ranges and does not follow redirects',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://flyingstars-relaunch.vercel.app/media/projekte/nfl.mp4');
  assert.equal(options.redirect,'manual');
  assert.equal(options.headers.get('range'),'bytes=0-31');
  return new Response(new Uint8Array(32),{status:206,headers:{'content-range':'bytes 0-31/804593','content-length':'32','accept-ranges':'bytes'}});
 };
 try {
  const response=await onRequestGet({request:new Request('https://site.test/api/media?asset=nfl',{headers:{range:'bytes=0-31'}})});
  assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),'video/mp4');
  assert.equal(response.headers.get('content-range'),'bytes 0-31/804593');assert.equal((await response.arrayBuffer()).byteLength,32);
 }finally{globalThis.fetch=original;}
});
test('Unknown media keys cannot trigger a remote request',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('Unknown source was fetched');};
 try {
  for(const asset of ['https://attacker.test/file','__proto__','missing']) assert.equal((await onRequestGet({request:new Request('https://site.test/api/media?asset='+encodeURIComponent(asset))})).status,404);
 }finally{globalThis.fetch=original;}
});
test('Redirects and upstream failures produce a controlled unavailable response',async()=>{
 const original=globalThis.fetch;
 try {
  for(const fail of [async()=>new Response(null,{status:302,headers:{location:'https://attacker.test'}}),async()=>{throw new Error('Network unavailable');}]){
   globalThis.fetch=fail;
   assert.equal((await onRequestGet({request:new Request('https://site.test/api/media?asset=nfl')})).status,502);
  }
 }finally{globalThis.fetch=original;}
});
