import test from 'node:test';
import assert from 'node:assert/strict';
import { factColumns, processEntries, processColor } from '../src/lib/lists.ts';
test('Fakten und Prozesse funktionieren mit 1 bis 6 Einträgen ohne feste Item-Annahme', () => {
  for(let n=1;n<=6;n++) {
    assert.equal(factColumns(n),n===4?4:Math.min(n,3));
    const source=Array.from({length:n},(_,i)=>({title:`Eintrag ${i}`,value:i?String(i):'unbekannt',when:i<2?'2022':'2023'}));
    const entries=processEntries(source);assert.equal(entries.length,n);assert.equal(entries[0].value,'unbekannt');
    assert.deepEqual(entries.map(e=>e.ordinal),source.map((_,i)=>String(i+1).padStart(2,'0')));
    assert.equal(entries.filter(e=>e.last).length,1);assert.equal(entries[0].repeat,false);
    if(n>1){assert.equal(entries[1].repeat,true);assert.equal(entries.at(-1).color,'#33edf2');}
    for(const e of entries)assert.match(e.color,/^#[\da-f]{6}$/);
  }
  assert.equal(processColor(0),'#ff9e29');assert.equal(processColor(1),'#33edf2');
  const entries=processEntries([{gate:true,title:'Freigabe'},{title:'Express'}]);
  assert.equal(entries[0].gate,true);assert.equal(entries[1].duration,undefined);
});
