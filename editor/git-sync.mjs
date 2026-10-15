import {legacyRuntimePaths,legacyRuntimeMessages} from './runtime-options.mjs';
import {promises as fs} from 'node:fs';
import path from 'node:path';

export async function configuredRemote(root, git, selected) {
  if (selected === false || selected === 'off') return null;
  const names = (await git(root, ['remote'])).split('\n');
  if (selected && !names.includes(selected)) throw Error(legacyRuntimeMessages.remote);
  // Opt-in: only an explicitly named remote is pushed to (the host sets AFE_GIT_REMOTE=origin).
  // A developer clone with an unrelated origin must never receive content pushes by accident.
  return selected || null;
}

/** A failed push never changes a save response. Pending commits survive process restarts in Git. */
export class GitSync {
  constructor(store, git, remote, {draftBranch=store.draftBranch||'content/draft'}={}) {
    this.draftBranch=draftBranch;this.store = store; this.git = git; this.remote = remote;
    this.status = {enabled: !!remote, pending: false, lastError: null, lastPushedAt: null};
    this.retry = 0; this.running = null; this.timer = null; this.closed = false;
  }
  enqueue() {
    if (!this.remote || this.closed) return;
    this.status.pending = true;
    if (!this.timer && !this.running) {
      this.timer = setTimeout(() => { this.timer = null; this.flush().catch(() => {}); }, 20);
      this.timer.unref();
    }
  }
  async flush() {
    if (!this.remote || this.closed) return;
    if (this.running) return this.running;
    clearTimeout(this.timer); this.timer = null;
    this.running = (async () => {
      // Snapshot quickly under the store lock; network I/O must never hold up another save.
      const snapshot = await this.store.exclusive(async () => {
      const head = await this.store.head(), leaseFile = path.join(this.store.root, '.git', legacyRuntimePaths.draftLease);
      const lease = await fs.readFile(leaseFile, 'utf8').catch(e => {if (e.code !== 'ENOENT') throw e; return '';});
      return {head,leaseFile,lease};
      });
      const {head,leaseFile,lease}=snapshot;
      const args = ['push'];
      if (/^[a-f0-9]{40}$/.test(lease)) args.push('--force-with-lease=refs/heads/'+this.draftBranch+':' + lease);
      args.push(this.remote, head + ':refs/heads/'+this.draftBranch);
      await this.git(this.store.root, args, {timeout: 30_000});
      await this.store.exclusive(async () => {
        const currentLease = await fs.readFile(leaseFile, 'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return '';});
        if (currentLease === lease) await fs.rm(leaseFile, {force: true});
        this.status.pending = await this.store.head() !== head;
      });
      this.status.lastError = null;
      this.status.lastPushedAt = new Date().toISOString(); this.retry = 0;
    })().catch(() => {
      this.status.pending = true;
      this.status.lastError = 'Git-Sicherung fehlgeschlagen. Der Entwurf ist lokal gespeichert; der Push wird erneut versucht.';
      if (!this.closed) {
        this.timer = setTimeout(() => {this.timer = null; this.flush().catch(() => {});}, Math.min(60_000, 1000 * 2 ** this.retry++));
        this.timer.unref();
      }
    }).finally(() => {this.running = null;if(this.status.pending&&!this.timer)this.enqueue();});
    return this.running;
  }
  close() {this.closed = true; clearTimeout(this.timer);}
}
