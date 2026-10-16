import {legacyRuntimePaths} from './runtime-options.mjs';
import {gitDirs} from './git-dirs.mjs';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/** Shared by the running editor, push queue and the SSH deploy process. */
export async function withRepositoryLock(root, work, {timeout = 240_000} = {}) {
  // Shared by all checkouts of the repository: they move the same branch refs.
  const file = path.join((await gitDirs(root)).commonDir, legacyRuntimePaths.operationLock);
  const started = Date.now();
  let handle;
  while (!handle) {
    try { handle = await fs.open(file, 'wx', 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - started >= timeout) throw Error('Der Editor ist durch Speichern, Freigeben oder Deployment belegt. Bitte später erneut versuchen.');
      await delay(50);
    }
  }
  try {
    await handle.writeFile(JSON.stringify({pid: process.pid, started: new Date().toISOString()}));
    return await work();
  } finally { await handle.close(); await fs.rm(file, {force: true}); }
}
