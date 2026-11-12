import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('../../public/media/logo-modus/beispiele/',import.meta.url);
test('canonical example rasters match their source hashes and RGBA dimensions',()=>{
 const index=JSON.parse(fs.readFileSync(new URL('rasters-index.json',dir)));
 assert.equal(Object.keys(index).length,16);
 for(const [hash,id] of Object.entries(index)){
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL(id+'.svg',dir))).digest('hex'),hash);
  const rasters=JSON.parse(fs.readFileSync(new URL(id+'.raster.json',dir)));assert.ok(rasters[512]);
  for(const r of Object.values(rasters))assert.equal(Buffer.from(r.rgba,'base64').length,r.width*r.height*4);
 }
});
