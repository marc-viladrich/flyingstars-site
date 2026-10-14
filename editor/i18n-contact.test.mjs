import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
import {onRequestPost} from '../functions/api/contact.ts';
test('Non-JavaScript contact submissions redirect to the matching language without allowing an arbitrary redirect',async()=>{
 for(const [locale,expected]of [['de','/danke/'],['en','/en/danke/'],['nl','/nl/danke/'],['//evil.example','/danke/']]){
  const form=new FormData();for(const [key,value]of Object.entries({name:'Test',email:'test@example.invalid',anlass:'firma',locale}))form.set(key,value);
  const response=await onRequestPost({request:new Request('https://fixture.example/api/contact',{method:'POST',body:form}),env:{}});
  assert.equal(response.status,303);const url=new URL(response.headers.get('location'));assert.equal(url.hostname,'fixture.example');assert.equal(url.pathname,expected);
 }
 const form=new FormData();form.set('name','Test');form.set('email','invalid');form.set('anlass','firma');
 const response=await onRequestPost({request:new Request('https://fixture.example/api/contact',{method:'POST',body:form}),env:{}});assert.equal((await response.json()).code,'email');
});
test('Actual contact browser script uses localized data messages for backend codes and network errors',async()=>{
 const source=stripTypeScriptTypes(await readFile(new URL('../src/scripts/contact.ts',import.meta.url),'utf8'));
 for(const [fetcher,expected]of [
  [async()=>({ok:false,json:async()=>({ok:false,code:'email',detail:'Deutscher Servertext darf nicht angezeigt werden.'})}),'EN invalid email EN retry'],
  [async()=>{throw new Error('Deutscher Netzwerkfehler');},'EN connection failed EN retry'],
  [async()=>({ok:true,json:async()=>({ok:true,state:'not-configured'})}),'EN not configured'],
 ]){
  const events={},status={textContent:'',focus(){this.focused=true;}},button={disabled:false,textContent:''},label={},bar={style:{}};
  const steps=[0,1].map(()=>({querySelectorAll:()=>[],querySelector:()=>null,hidden:false}));
  const text={step:'Step {current} of {total}',submit:'EN submit',sending:'EN sending',invalidEmail:'EN invalid email',retry:'EN retry',failed:'EN connection failed',sendFailed:'EN send failed',required:'EN required',notConfigured:'EN not configured',success:'EN success',spam:'EN spam'};
  const select={addEventListener(){}};
  const form={action:'/api/contact',dataset:{messages:JSON.stringify(text)},querySelectorAll:selector=>selector==='[data-step]'?steps:[],querySelector:selector=>({'[data-form-status]':status,'[data-step-label]':label,'.bar i':bar,'[name=paket]':select,'button[type=submit]':button}[selector]??null),addEventListener:(event,listener)=>events[event]=listener,reset(){}};
  runInNewContext(source,{document:{querySelector:()=>form},location:{search:''},URLSearchParams,FormData:class{},fetch:fetcher});
  await events.submit({preventDefault(){}});assert.equal(status.textContent,expected);assert.equal(status.focused,true);assert.equal(button.disabled,false);assert.equal(button.textContent,'EN submit');
 }
});
