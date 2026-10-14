import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

/** Rebase in an isolated worktree. Conflict leaves the editor checkout and branch untouched. */
export async function prepareDraftRebase(root, main, git, remote) {
  if (await git(root, ['status', '--porcelain', '--untracked-files=normal'])) throw Error('Der Host-Klon enthält ungespeicherte Dateien. Deployment/Freigabe abgebrochen.');
  const before = await git(root, ['rev-parse', 'content/draft']);
  let remoteDraft = '';
  if (remote) {
    try {remoteDraft = await git(root, ['rev-parse', 'refs/remotes/' + remote + '/content/draft']);} catch {}
    if (remoteDraft) try {await git(root, ['merge-base', '--is-ancestor', remoteDraft, before]);}
    catch {
      const lease=await fs.readFile(path.join(root,'.git','flyingstars-draft-lease'),'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return '';});
      if(lease!==remoteDraft)throw Error('Der entfernte Entwurf enthält fremde Änderungen. Bitte die Git-Stände manuell zusammenführen.');
    }
  }
  const folder = path.join(root, '.git', 'flyingstars-rebase-' + randomUUID());
  await git(root, ['worktree', 'add', '--quiet', '--detach', folder, before]);
  try {
    try {await git(folder, ['-c', 'commit.gpgsign=false', 'rebase', main]);}
    catch {await git(folder, ['rebase', '--abort']).catch(() => {}); throw Error('Git-Konflikt beim Übernehmen von main. Entwurf und Editor bleiben unverändert. Bitte den betroffenen Inhalt manuell zusammenführen.');}
    return {before, head: await git(folder, ['rev-parse', 'HEAD']), remoteDraft};
  } finally {await git(root, ['worktree', 'remove', '--force', folder]);}
}

export async function applyDraftRebase(root, prepared, git) {
  if (await git(root, ['branch', '--show-current']) !== 'content/draft') throw Error('Der Host-Klon muss auf content/draft stehen.');
  if (await git(root, ['rev-parse', 'content/draft']) !== prepared.before) throw Error('Der Entwurf wurde gleichzeitig geändert.');
  if (prepared.head !== prepared.before) {
    await git(root, ['reset', '--hard', prepared.head]);
    // The explicit lease allows replacing only the remote draft we actually rebased.
    if (prepared.remoteDraft) await fs.writeFile(path.join(root, '.git', 'flyingstars-draft-lease'), prepared.remoteDraft);
  }
}
