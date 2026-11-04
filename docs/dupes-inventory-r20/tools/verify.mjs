import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='docs/dupes-inventory-r20',e=JSON.parse(fs.readFileSync(dir+'/evidence.json')),i=JSON.parse(fs.readFileSync(dir+'/inventory.json'));
assert.equal(e.base,execFileSync('git',['rev-parse','cd1ea13^{commit}'],{encoding:'utf8'}).trim());
assert.equal(i.sourceCommit,e.base);assert.equal(i.inputSha256,e.inputSha256);
assert.equal(e.scope.parseErrors.length,0);
const texts=new Map(),hash=createHash('sha256');
for(const file of e.scope.files){assert.ok(!path.basename(file).startsWith('.env'));const text=fs.readFileSync(file,'utf8');texts.set(file,text);hash.update(file+'\0'+text+'\0');}
assert.equal(hash.digest('hex'),e.inputSha256,'Eingaben haben sich seit dem Scan verändert');
let references=0;
const cache=new Map();
function walk(value){
 if(!value||typeof value!=='object')return;
 if(typeof value.file==='string'&&Number.isInteger(value.line)){
  assert.ok(texts.has(value.file),'Unbekannte Quelle '+value.file);
  const lines=cache.get(value.file)??texts.get(value.file).split('\n');cache.set(value.file,lines);
  assert.ok(value.line>0&&value.line<=lines.length,value.file+':'+value.line);
  if(value.excerpt!==undefined)assert.equal(value.excerpt,lines[value.line-1].trim().slice(0,400));
  references++;
 }
 for(const x of Object.values(value))walk(x);
}
walk(e);walk(i);
assert.equal(i.groups.length,45);assert.ok(i.groups.every(g=>g.occurrences.length&&g.owner&&g.editor&&g.i18n&&g.guard&&g.visibility));
const dirty=execFileSync('git',['status','--porcelain','-uall'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
assert.ok(dirty.every(line=>line.includes(dir+'/')),'Fremde Änderungen im Worktree: '+dirty.join('\n'));
console.log(JSON.stringify({files:texts.size,validatedReferenceObjects:references,groups:i.groups.length,inputSha256:e.inputSha256,onlyReportChanged:true},null,2));
