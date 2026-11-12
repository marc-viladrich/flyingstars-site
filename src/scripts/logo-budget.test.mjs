import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetFormation } from './logo-v10/budget-formation.mjs';
const points = (n, density) => Object.assign(Array.from({length:n}, (_,x)=>({x,y:x,c:[255,255,255]})), {meta:{density}});
test('Show-Budget akzeptiert nur passende automatische Fassungen unter der Empfehlungsdichte', async()=>{
 const calls=[];
 const pts=await budgetFormation(async d=>{calls.push(d);return calls.length===1?points(150,.6):points(98,.4);},100,.6);
 assert.equal(pts.length,98);assert.equal(calls[0],undefined);assert.ok(calls[1]<.6);
});
test('Nicht passendes Logo liefert die kleinste vollständige Fassung ohne Fehler', async()=>{
 const calls=[];
 const pts=await budgetFormation(async d=>{calls.push(d);return points(d===.03?107:150,d??.6);},100,.6);
 assert.equal(pts.length,107);assert.equal(calls.at(-1),.03);assert.ok(calls.length<=9);
 assert.deepEqual(pts[106],{x:106,y:106,c:[255,255,255]});
});
test('Zu hohe automatische Dichte wird auch bei passender Punktzahl abgesenkt', async()=>{
 let calls=0;
 const pts=await budgetFormation(async d=>{calls++;return points(90,d??1);},100,.6);
 assert.equal(calls,2);assert.ok(pts.meta.density<=.6);
});

test('Alle Beispiele enthalten Empfehlungen für jeden Anker und strenge Fassungen für jedes kleinere Show-Budget', async()=>{
 const {readFile}=await import('node:fs/promises');
 const {decodePoints}=await import('./logo-v10/prepared.mjs');
 const root=new URL('../../public/media/logo-modus/beispiele/',import.meta.url);
 const sizes=JSON.parse(await readFile(new URL('sizes.json',root),'utf8'));
 for(const {id} of sizes){
  const data=JSON.parse(await readFile(new URL(`${id}.json`,root),'utf8'));
  assert.equal(data.version,3,id);assert.match(data.sourceHash,/^[a-f0-9]{64}$/);assert.match(data.converterHash,/^[a-f0-9]{64}$/);
  assert.equal(Object.keys(data.steps).length,11,id);
  for(let n=100;n<=200;n+=10){
   const rec=data.formations[data.steps[n]];
   assert.ok(Number.isFinite(rec.density),`${id} ${n}: Dichte`);assert.ok(rec.part,`${id} ${n}: Teilwahl`);
   const count=decodePoints(rec.p).length/5;
   for(let d=100;d<count;d+=10){
    const strict=data.formations[data.strict[n][d]];
    assert.ok(strict,`${id} ${n} ${d}`);assert.ok(strict.density<=rec.density,`${id}: Dichte steigt nicht`);
    assert.ok(decodePoints(strict.p).length>0);
   }
  }
 }
});

test('Mindestfassung überschreitet die Dichte der Empfehlung nicht',async()=>{
 const pts=await budgetFormation(async d=>points(d==null?107:120,d??1),100,.6);
 assert.equal(pts.length,120);assert.ok(pts.meta.density<=.6);
});
