import {decodePoints} from './logo-v10/prepared.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
const root=new URL('../../',import.meta.url);
const policy=JSON.parse(fs.readFileSync(new URL('src/content/preview-policy.json',root)));
import {LOGO_EXAMPLES,CUSTOMER_EXAMPLES} from './logo-examples.mjs';
// Runde 10b: die Liste kommt aus logo-examples.mjs (dieselbe wie die Knöpfe); jedes Beispiel hat SVG, Daten und Raster
const ids=LOGO_EXAMPLES.map(([id])=>id);
test('Beispielliste: Daten vollständig, keine Reste, Kund*innen echt',()=>{
 const dir=new URL('public/media/logo-modus/beispiele/',root),sizes=JSON.parse(fs.readFileSync(new URL('sizes.json',dir))).map(x=>x.id);
 assert.deepEqual([...sizes].sort(),[...ids].sort(),'sizes.json und logo-examples.mjs nennen dieselben Beispiele');
 const index=Object.values(JSON.parse(fs.readFileSync(new URL('rasters-index.json',dir))));
 assert.deepEqual([...index].sort(),[...ids].sort(),'rasters-index.json kennt genau die Beispiele');
 for(const id of ids)for(const ext of ['svg','json','raster.json'])assert.ok(fs.existsSync(new URL(`${id}.${ext}`,dir)),`${id}.${ext} fehlt`);
 for(const id of ['shell','target'])assert.ok(!fs.existsSync(new URL(`${id}.json`,dir)),`${id} ist raus (Marc 20.11.)`);
 for(const id of CUSTOMER_EXAMPLES)assert.ok(fs.existsSync(new URL(`public/brand/logos/kunde-${id}-weiss.svg`,root)),`${id}: kein FlyingStars-Kundenlogo`);
});
for(const id of ids) test(`prepared logo ${id}: all slider steps, bounded payload, valid editable points`,()=>{
 const text=fs.readFileSync(new URL(`public/media/logo-modus/beispiele/${id}.json`,root),'utf8'),data=JSON.parse(text);
 assert.equal(data.version,3);
 assert.ok(gzipSync(text).length<=110000,`${id}: gzip exceeds 110 KB`);
 for(let n=policy.ranges.SPARK.min;n<=200;n+=policy.step){
  const raw=data.formations[data.steps[n]];assert.ok(raw,`missing ${n}`);const s={...raw,p:decodePoints(raw.p)};assert.equal(s.p.length%5,0);assert.ok(s.p.length>0);
  for(let i=0;i<s.p.length;i+=5){assert.ok(Number.isInteger(s.p[i])&&Number.isInteger(s.p[i+1]));assert.ok(data.palette[s.p[i+2]]);}
  assert.ok(s.frame&&s.elements&&s.colourGroups);
 }
});

test('prepared example removals are persisted for live recalculation',()=>{
 const read=id=>JSON.parse(fs.readFileSync(new URL(`public/media/logo-modus/beispiele/${id}.json`,root)));
 const adidas=read('adidas'),ikea=read('ikea');
 assert.deepEqual(adidas.options.erase,[{box:[0,230,512,366]}]);
 assert.equal(ikea.options.erase.length,3);
 assert.equal(ikea.options.removalRim,0);
 const points=decodePoints(ikea.formations[ikea.steps[200]].p);
 let oval=0;for(let i=0;i<points.length;i+=5){const [r,g,b]=ikea.palette[points[i+2]];if(r>200&&g>150&&b<100)oval++;}
 assert.ok(oval>=30,`oval contour lost: ${oval} yellow points`);
 for(const step of Object.values(adidas.formations)){
  const values=decodePoints(step.p),f=step.frame;
  for(let i=0;i<values.length;i+=5)assert.ok((values[i+1]/1000-f.oy)/f.sy<230,'lettering attachment survived erasure');
 }
});
