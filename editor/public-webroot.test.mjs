import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {activateWebroot} from './public-webroot.mjs';

test('Directory migration and subsequent atomic switches retain previous HTML; failed copies never activate',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'flyingstars-webroot-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const webroot=path.join(root,'public'),one=path.join(root,'one'),two=path.join(root,'two');
  for(const [dir,text] of [[webroot,'Initial'],[one,'Eins'],[two,'Zwei']]){await fs.mkdir(dir);await fs.writeFile(path.join(dir,'index.html'),text);}
  await fs.writeFile(path.join(one,'stale.txt'),'Alter Release');
  await activateWebroot({head:'a'.repeat(40),site:one},webroot);
  assert.equal(await fs.readFile(path.join(webroot+'.previous','index.html'),'utf8'),'Initial');
  await activateWebroot({head:'b'.repeat(40),site:two},webroot);
  assert.equal(await fs.readFile(path.join(webroot,'index.html'),'utf8'),'Zwei');
  assert.equal(await fs.readFile(path.join(webroot+'.previous','index.html'),'utf8'),'Eins');
  await assert.rejects(fs.access(path.join(webroot,'stale.txt')));
  const active=await fs.readlink(webroot);
  await assert.rejects(activateWebroot({head:'c'.repeat(40),site:path.join(root,'missing')},webroot));
  assert.equal(await fs.readlink(webroot),active);
  await activateWebroot({head:'d'.repeat(40),site:one},webroot);
  assert.equal(await fs.readFile(path.join(webroot+'.previous','index.html'),'utf8'),'Zwei');
});
