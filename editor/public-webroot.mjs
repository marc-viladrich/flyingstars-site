import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

/** Copy completely beside the Apache root, then atomically replace its symlink. */
export async function activateWebroot(artifact, webroot) {
  const target = path.resolve(webroot), parent = path.dirname(target);
  const release = target + '.release-' + artifact.head + '-' + randomUUID();
  const next = target + '.next-' + randomUUID(), previous = target + '.previous';
  await fs.mkdir(parent, {recursive: true});
  await fs.cp(artifact.site, release, {recursive: true, errorOnExist: true});
  let movedDirectory = false;
  try {
    await fs.access(path.join(release, 'index.html'));
    await fs.symlink(release, next, 'dir');
    const old = await fs.lstat(target).catch(e => {if(e.code !== 'ENOENT')throw e; return null;});
    // Subsequent deploys have one atomic rename. Initial migration from a directory has a short gap.
    if (old?.isDirectory()) {await fs.rename(target, previous); movedDirectory = true;}
    if (old?.isSymbolicLink()) {
      const oldRelease = await fs.readlink(target);
      const backup = previous + '-' + randomUUID();
      await fs.symlink(oldRelease, backup); await fs.rename(backup, previous);
    }
    await fs.rename(next, target);
  } catch (error) {
    if (movedDirectory) await fs.rename(previous, target);
    await fs.rm(release, {recursive: true, force: true}); throw error;
  } finally {await fs.rm(next, {force: true});}
}
