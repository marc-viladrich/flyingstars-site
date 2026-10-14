import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {git} from '../native-store.mjs';
import {NativeBuilder} from '../native-builder.mjs';
import {configuredRemote} from '../git-sync.mjs';
import {withRepositoryLock} from '../repository-lock.mjs';
import {prepareDraftRebase,applyDraftRebase} from '../rebase-draft.mjs';
import {sourceRoot,stateRoot,isMain,assertStateLocation} from '../paths.mjs';
const run = promisify(execFile);

export async function hostUpdate({source = sourceRoot, state = stateRoot(), remote, webroot = process.env.FLYINGSTARS_PUBLIC_WEBROOT, restart = process.env.DEPLOY_RESTART_CMD, expectedMain = process.env.DEPLOY_EXPECTED_MAIN, install = true} = {}) {
  source = path.resolve(source); state = path.resolve(state);
  await assertStateLocation(source,state,webroot);
  if (!restart) throw Error('DEPLOY_RESTART_CMD fehlt. Den Neustartmechanismus zuerst auf dem Hetzner-Konto prüfen.');
  // The deploy hook always pulls the release from a remote (origin unless named); pushing from the editor stays opt-in.
  const selected = await configuredRemote(source, git, remote ?? process.env.FLYINGSTARS_GIT_REMOTE ?? 'origin');
  if (!selected) throw Error('Kein Git-Remote für das Deployment konfiguriert.');
  return withRepositoryLock(source, async () => {
    try{await git(source, ['fetch', selected], {timeout: 30_000});}
    catch{throw Error('GitHub konnte nicht erreicht werden. Deployment abgebrochen.');}
    const main = await git(source, ['rev-parse', 'refs/remotes/' + selected + '/main']);
    if (expectedMain && main !== expectedMain) throw Error('main ist inzwischen weitergelaufen. Bitte CI für den aktuellen Stand abwarten und erneut deployen.');
    const prepared = await prepareDraftRebase(source, main, git, selected);
    const staging = path.join(source, '.git', 'flyingstars-deploy-' + randomUUID());
    await git(source, ['worktree', 'add', '--quiet', '--detach', staging, prepared.head]);
    let installed = false;
    try {
      const oldLock = await git(source, ['show', prepared.before + ':package-lock.json']);
      const newLock = await git(source, ['show', main + ':package-lock.json']);
      if (oldLock !== newLock && install) {
        try{await run('npm', ['ci', '--omit=dev'], {cwd: staging, env: {...process.env, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH}, timeout: 180_000, maxBuffer: 5_000_000});}
        catch{throw Error('Installation mit npm ci --omit=dev fehlgeschlagen. Der laufende Editor bleibt unverändert.');}
        installed = true;
      } else {await fs.symlink(await fs.realpath(path.join(source, 'node_modules')), path.join(staging, 'node_modules'));}
      await run(process.execPath, ['--check', path.join(staging, 'editor/server.mjs')]);
      // Import the NEW handler in a fresh process, without opening any socket or reading .env.
      await run(process.execPath, [path.join(staging, 'editor/deploy/handler-smoke.mjs'), staging, state], {env: process.env, timeout: 30_000, maxBuffer: 1_000_000});
      const builder = new NativeBuilder({root: staging}, state, {editor: false, origin: process.env.SITE_URL || 'http://127.0.0.1:4543', runtimeName: 'runtime-public', webroot});
      const artifact = await builder.prepare(main);
      // Only a successful smoke/build changes the live checkout or the Apache artifact.
      await applyDraftRebase(source, prepared, git);
      await git(source, ['update-ref', 'refs/heads/main', main]);
      if (installed) {
        const previous = path.join(state, 'previous-node_modules-' + randomUUID());
        await fs.mkdir(state, {recursive: true});
        await fs.rename(path.join(source, 'node_modules'), previous);
        await fs.rename(path.join(staging, 'node_modules'), path.join(source, 'node_modules'));
      }
      await builder.activate(artifact);
      try{await run('/bin/sh', ['-c', restart], {cwd: source, env: {...process.env, FLYINGSTARS_STATE_DIR: state}, timeout: 30_000, maxBuffer: 1_000_000});}
      catch{throw Error('Öffentliche Ausgabe aktiviert, Editor-Neustart fehlgeschlagen. Bitte den konsoleH-Prozess prüfen und den Hook erneut ausführen.');}
      return {main, draft: prepared.head, installed, activated: artifact.head};
    } finally {await git(source, ['worktree', 'remove', '--force', staging]);}
  });
}

if (isMain(import.meta.url)) {
  try {const result = await hostUpdate(); console.log('Deployment aktiviert: ' + result.activated);}
  catch (error) {console.error(error.message); process.exitCode = 1;}
}
