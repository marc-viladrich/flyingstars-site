import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {deliveryRedirects,htaccessText} from './lib/public-delivery.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));

test('versioned Apache rules exactly match the GA4 inventory and current published project aliases',async()=>{
  const redirects=await deliveryRedirects(root);
  assert.equal(await readFile(path.join(root,'public/.htaccess'),'utf8'),htaccessText(redirects));
  assert.equal(new Set(redirects.map(r=>r.from)).size,redirects.length,'Duplicate redirect sources');
  for(const {from,to} of redirects) {
    assert.ok(from.startsWith('/')&&to.startsWith('/')&&!to.startsWith('//'));
    assert.notEqual(from,to);
    assert.ok(!redirects.some(r=>r.from===to),`Redirect chain at ${from}`);
  }
});

test('Apache 2.4 parses the public rules with optional compression enabled and disabled',async t=>{
  const httpd=process.env.HTTPD_BIN||'/usr/sbin/httpd', modules=process.env.APACHE_MODULE_DIR||'/usr/libexec/apache2';
  try {await access(httpd);await access(path.join(modules,'mod_mpm_event.so'));}
  catch {t.skip('Local Apache not available. Verify on the hosting account.');return;}
  const folder=await mkdtemp(path.join(os.tmpdir(),'flyingstars-apache-syntax-'));
  try {
    for(const compression of [false,true]) {
      const required=['mpm_event','unixd','authz_core','dir','headers','rewrite',...compression?['filter','deflate']:[]];
      const config=[`ServerRoot "${folder}"`,'ServerName flyingstars.art','Listen 127.0.0.1:48591',`ErrorLog "${folder}/error.log"`,
        ...required.map(name=>`LoadModule ${name}_module "${modules}/mod_${name}.so"`),
        `<Directory "${root}/public">`,'Require all granted',`Include "${root}/public/.htaccess"`,'</Directory>'].join('\n');
      const file=path.join(folder,'httpd.conf');await writeFile(file,config);
      const result=spawnSync(httpd,['-t','-f',file],{encoding:'utf8'});
      assert.equal(result.status,0,result.stdout+result.stderr);
    }
  } finally {await rm(folder,{recursive:true,force:true});}
});
