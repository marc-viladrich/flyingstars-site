import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import videos from '../data/video-lab.json' with { type:'json' };
import messages from '../i18n/ui.json' with { type:'json' };
import { messagesForLocale } from '../i18n/ui.mjs';
const root=new URL('../../',import.meta.url);
function* walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())yield*walk(name);else yield name;}}
test('Developer comments remain in Astro source form and never as emitted HTML comments',()=>{
 for(const file of walk(fileURLToPath(new URL('src/',root))))if(file.endsWith('.astro'))assert.ok(!fs.readFileSync(file,'utf8').includes('<!--'),file);
});
test('Each browser dictionary is an exact single-language projection of the canonical editor source',()=>{
 for(const locale of ['de','en','nl']){const part=messagesForLocale(locale);assert.deepEqual(Object.keys(part),Object.keys(messages));for(const [key,value]of Object.entries(part)){assert.deepEqual(Object.keys(value),[locale]);assert.equal(value[locale],messages[key][locale]);}}
 assert.throws(()=>messagesForLocale('xx'),/Unknown UI locale/);
});
test('Review labels, hashes and explicit response lengths refer to the real video bytes',()=>{
 const headers=fs.readFileSync(new URL('public/_headers',root),'utf8');
 for(const video of videos){const bytes=fs.readFileSync(new URL(`public${video.src}`,root));assert.equal(bytes.length,video.bytes,video.id);assert.equal(createHash('sha256').update(bytes).digest('hex'),video.sha256,video.id);assert.ok(headers.includes(`${video.src}\n  Content-Type: ${video.codec==='vp9'?'video/webm':'video/mp4'}\n  Content-Length: ${bytes.length}`),video.id);}
});

test('Node consumers with DOM mocks keep canonical dictionaries and geometry instead of browser endpoints',()=>{
 const result=spawnSync(process.execPath,['--input-type=module','-e',`
  globalThis.window=globalThis;
  globalThis.document={documentElement:{lang:'de'}};
  globalThis.fetch=()=>{throw Error('Browser endpoint requested in Node')};
  const {createTranslator}=await import('./src/i18n/ui.mjs');
  if(!createTranslator('de')('references.drones',{count:7}).includes('7'))throw Error('Translation missing');
  const {loadHeartData}=await import('./src/scripts/heart-data.js');
  if(!(await loadHeartData()).steps[290])throw Error('Geometry missing');
 `],{cwd:fileURLToPath(root),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

test('Published preview aliases are explicit URL slugs, not slash-separated Git refs',()=>{
 const workflow=parseYaml(fs.readFileSync(new URL('.github/workflows/deploy-cloudflare-preview.yml',root),'utf8'));
 const input=workflow.on.workflow_dispatch.inputs.preview_branch;
 assert.equal(input.default,'manual-preview');
 assert.ok(input.options.includes('feat-designsprache-poc'));
 for(const option of input.options)assert.match(option,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});
