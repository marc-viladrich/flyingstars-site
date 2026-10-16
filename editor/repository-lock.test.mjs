import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {withRepositoryLock} from './repository-lock.mjs';
import {legacyRuntimePaths} from './runtime-options.mjs';

test('the operation lock lives in the shared Git directory and serialises all worktrees of a repository',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'repository-lock-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const main=path.join(dir,'main'),tree=path.join(dir,'tree'),git=(cwd,...args)=>execFileSync('git',['-C',cwd,...args],{stdio:'pipe'});
 await fs.mkdir(main);git(main,'init','-q','-b','main');git(main,'-c','user.name=t','-c','user.email=t@example.invalid','commit','-q','--allow-empty','-m','init');git(main,'worktree','add','-q','-b','draft',tree);
 const lock=path.join(main,'.git',legacyRuntimePaths.operationLock);
 for(const root of [main,tree])assert.equal(await withRepositoryLock(root,async()=>{await fs.access(lock);return 'done';}),'done');
 await assert.rejects(fs.access(lock),'released after the work');
 const order=[];await Promise.all([withRepositoryLock(main,async()=>{order.push('a');await new Promise(r=>setTimeout(r,120));order.push('a');}),new Promise(r=>setTimeout(r,20)).then(()=>withRepositoryLock(tree,async()=>{order.push('b');}))]);
 assert.deepEqual(order,['a','a','b']);
});
