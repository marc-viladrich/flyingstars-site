import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/contact.ts';
function request(fields) {
  const data = new FormData();
  for (const [key,value] of Object.entries(fields)) data.set(key,value);
  return new Request('https://example.test/api/contact',{method:'POST',headers:{Accept:'application/json'},body:data});
}
const details = {name:'Marc',email:'marc@example.test',anlass:'firma',datum:'2026-12-01',ort:'Osnabrück',paket:'HORIZON',drohnen:'220',telefon:'01234'};
test('Unconfigured inquiry accepts reference fields and reports that nothing was sent',async()=>{
 const result=await onRequestPost({request:request(details),env:{}});
 assert.equal(result.status,200);assert.deepEqual(await result.json(),{ok:true,state:'not-configured'});
});
test('Every show detail reaches the transactional mail without changing the visitor reply-to',async()=>{
 const original=globalThis.fetch;let mail;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');mail=JSON.parse(options.body);return new Response('{}');};
 try {
  const result=await onRequestPost({request:request({...details,message:'Unser Produktlaunch'}),env:{BREVO_API_KEY:'test-key',CONTACT_FROM:'sender@example.test',CONTACT_TO:'recipient@example.test'}});
  assert.equal(result.status,200);assert.deepEqual(mail.replyTo,{email:details.email,name:details.name});
  for (const [key,value] of Object.entries(details)) assert.ok(mail.textContent.includes(value),`${key} missing from actual mail`);
  assert.ok(mail.textContent.includes('Unser Produktlaunch'));
 } finally {globalThis.fetch=original;}
});
test('Unsupported occasions and injected extra headers are rejected at the endpoint',async()=>{
 for(const invalid of [{anlass:'unknown'},{telefon:'123\r\nBcc: attacker@example.test'},{drohnen:'999999'}]){
  const result=await onRequestPost({request:request({...details,...invalid}),env:{}});assert.equal(result.status,400);
 }
});
