import test from 'node:test';
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
