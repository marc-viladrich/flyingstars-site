import {decodePoints} from './logo-v10/prepared.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
const root=new URL('../../',import.meta.url);
const policy=JSON.parse(fs.readFileSync(new URL('src/content/preview-policy.json',root)));
const ids=['mastercard','ikea','dhl','firefox','spotify','nike','apple','mcdonalds','adidas','puma','cupra','duolingo','energizer','lamborghini','shell','target'];
for(const id of ids) test(`prepared logo ${id}: all slider steps, bounded payload, valid editable points`,()=>{
 const text=fs.readFileSync(new URL(`public/media/logo-modus/beispiele/${id}.json`,root),'utf8'),data=JSON.parse(text);
 assert.equal(data.version,2);
 assert.ok(gzipSync(text).length<=110000,`${id}: gzip exceeds 110 KB`);
 for(let n=policy.ranges.SPARK.min;n<=policy.ranges.ODYSSEY.max;n+=policy.step){
  const raw=data.steps[n];assert.ok(raw,`missing ${n}`);const s={...raw,p:decodePoints(raw.p)};assert.equal(s.p.length%5,0);assert.ok(s.p.length>0);
  for(let i=0;i<s.p.length;i+=5){assert.ok(Number.isInteger(s.p[i])&&Number.isInteger(s.p[i+1]));assert.ok(data.palette[s.p[i+2]]);}
  assert.ok(s.frame&&s.elements&&s.colourGroups);
 }
});
