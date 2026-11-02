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

test('Only provider acceptance confirms a lead UUID; honeypot, preview and failures cannot', async () => {
 const original = globalThis.fetch;
 const env = { BREVO_API_KEY: 'test-key', CONTACT_FROM: 'sender@example.test', CONTACT_TO: 'recipient@example.test' };
 try {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{}', { status: 201 }); };
  const honeypot = await onRequestPost({ request: request({ ...details, website: 'bot' }), env });
  assert.deepEqual(await honeypot.json(), { ok: true, state: 'sent' });
  assert.equal(calls, 0);
  const preview = await onRequestPost({ request: request(details), env: {} });
  assert.equal((await preview.json()).requestId, undefined);
  const sent = await onRequestPost({ request: request(details), env });
  const confirmation = await sent.json();
  assert.equal(confirmation.ok, true); assert.equal(confirmation.state, 'sent');
  assert.match(confirmation.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  globalThis.fetch = async () => new Response('{}', { status: 500 });
  const failed = await onRequestPost({ request: request(details), env });
  assert.equal(failed.status, 502); assert.equal((await failed.json()).requestId, undefined);
  globalThis.fetch = async () => { throw new Error('timeout'); };
  const timeout = await onRequestPost({ request: request(details), env });
  assert.equal(timeout.status, 503); assert.equal((await timeout.json()).requestId, undefined);
 } finally { globalThis.fetch = original; }
});
