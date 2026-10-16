import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile),cache=new Map();
/**
 * The Git directories of a checkout, as absolute paths. In a normal checkout both are <root>/.git; in a linked
 * worktree (.git is a file) `gitDir` is the worktree's own administrative directory and `commonDir` the
 * repository's shared one. State that coordinates processes on shared refs (operation lock, draft lease) lives in
 * `commonDir`; scratch state of one checkout (a temporary index, a temporary checkout) lives in `gitDir`.
 */
export function gitDirs(root){
 if(!cache.has(root))cache.set(root,run('git',['-C',root,'rev-parse','--path-format=absolute','--git-dir','--git-common-dir'],{encoding:'utf8'}).then(({stdout})=>{const [gitDir,commonDir]=stdout.trim().split('\n');return {gitDir,commonDir};},error=>{cache.delete(root);throw error;}));
 return cache.get(root);
}
