import {createFlyingStarsAdapter as translationSite} from './flyingstars-adapter.mjs';
import {fileURLToPath as translationRoot} from 'node:url';
import test from 'node:test';import assert from 'node:assert/strict';import {promisify} from 'node:util';import {execFile} from 'node:child_process';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {i18nFixture} from './i18n-test-fixture.mjs';import {loadMemory, createTranslationCore} from './translation-core.mjs';
const {plan,mergeIntoTranslations}=createTranslationCore(await translationSite(translationRoot(new URL('../',import.meta.url))));
const run=promisify(execFile),cli=fileURLToPath(new URL('./translate-missing.mjs',import.meta.url));
test('Actual offline CLI: --all respects per-batch/run limits, persists suggestions and resumes until the whole locale is fresh',{timeout:60000},async t=>{
 const {root,source,store}=await i18nFixture(t),memoryFile=path.join(root,'memory.json');
 const base=['--locale','en','--all','--provider','fake','--source',source,'--memory-file',memoryFile,'--max-chars','1000'];
 const first=await run(process.execPath,[cli,...base,'--budget-chars','1000'],{maxBuffer:1000000});
 const limited=JSON.parse(first.stdout.slice(first.stdout.indexOf('\n{')+1));
 assert.ok(limited.budgetExhausted);assert.ok(limited.billedCharacters<=1000);
 const second=await run(process.execPath,[cli,...base,'--budget-chars','100000'],{maxBuffer:1000000});
 const complete=JSON.parse(second.stdout.slice(second.stdout.indexOf('\n{')+1));
 assert.equal(complete.remainingSegments,0);assert.equal(complete.budgetExhausted,false);assert.ok(complete.batches>1);
 const state=await store.state(),memory=await loadMemory(memoryFile);assert.equal(plan({records:state.records,locale:'en',memory}).jobs.length,0);
 for(const record of state.records.filter(record=>record.id.startsWith('translation/')))for(const value of record.data.values){assert.equal(value.reviewed,false);assert.match(value.sourceHash,/^[a-f0-9]{64}$/);}
 const third=await run(process.execPath,[cli,...base],{maxBuffer:1000000});assert.equal(JSON.parse(third.stdout).fields,0);
 t.diagnostic(`Complete locale generated across ${complete.batches} provider batches; repeat run costs zero.`);
});
