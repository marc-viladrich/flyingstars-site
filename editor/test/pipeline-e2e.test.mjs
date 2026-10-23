import {createFlyingStarsAdapter} from '../flyingstars-adapter.mjs';
import {resolveRuntimeOptions} from '../server.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {i18nFixture} from '../i18n-test-fixture.mjs';
import {NativeStore,git} from 'astro-frontend-editor/runtime';
import {NativeBuilder} from 'astro-frontend-editor/runtime';
import {NativePublisher} from 'astro-frontend-editor/runtime';
import {hostUpdate} from '../deploy/host-update.mjs';
import {startNativeServers} from '../server.mjs';
import {handlerRequest} from '../deploy/handler-smoke.mjs';
const run = promisify(execFile);
const shellQuote = s => "'" + s.replaceAll("'", "'\\''") + "'";
const commit = (dir, message) => git(dir, ['-c','commit.gpgsign=false','add','.']).then(() => git(dir,['-c','commit.gpgsign=false','commit','-qm',message]));

test('Offline-Pipeline: CI, Code-Deploy, Inhalts-Push/Freigabe, Rebase, Buildfehler und Konflikt', {skip: process.env.FLYINGSTARS_PIPELINE_CHILD === '1', timeout: 600_000}, async t => {
  const prior = process.env.FLYINGSTARS_OFFLINE_MEDIA;
  process.env.FLYINGSTARS_OFFLINE_MEDIA = '1';
  t.after(() => {if (prior === undefined) delete process.env.FLYINGSTARS_OFFLINE_MEDIA; else process.env.FLYINGSTARS_OFFLINE_MEDIA = prior;});
  const {root, source: seed, store: seedStore} = await i18nFixture(t,{forCI:true}); seedStore.sync.close();
  const github = path.join(root,'github.git'), dev = path.join(root,'developer'), host = path.join(root,'host');
  const state = path.join(root,'private-state'), webroot = path.join(root,'public-domain'), marker = path.join(root,'restart.txt');
  await git(seed,['clone','--bare','--quiet',seed,github]);
  await git(github,['symbolic-ref','HEAD','refs/heads/main']);
  const modules = await fs.realpath(path.join(seed,'node_modules'));
  for (const dir of [dev,host]) {
    await git(seed,['clone','--quiet',github,dir]);
    await fs.symlink(modules,path.join(dir,'node_modules'));
  }
  await git(host,['checkout','-b','content/draft','origin/content/draft']);
  const restart = shellQuote(process.execPath) + ' -e ' + shellQuote("require('node:fs').appendFileSync("+JSON.stringify(marker)+",'restart\\n')");
  const update = () => hostUpdate({source:host,state,webroot,restart,remote:'origin'});
  let store;
  t.after(() => store?.sync.close());
  const freshStore = async () => {store?.sync.close();store = await new NativeStore(host,{remote:'origin',site:await createFlyingStarsAdapter(host),runtime:resolveRuntimeOptions({values:{siteRoot:host}})}).init();return store;};
  const saveTitle = async title => {
    const current = await store.state(), page = current.records.find(r=>r.id==='page/index');
    return store.save({expectedHead:current.head,requestId:randomUUID(),changes:[{id:page.id,expectedRevision:page.revision,patches:[{path:['title'],value:title}]}]});
  };

  await t.test('Code auf GitHub → dieselbe CI-Prüfung → Host, öffentlicher Release und Neustart', async () => {
    await fs.writeFile(path.join(dev,'src/pages/pipeline-release.astro'),'<html><body>Code-Release eins</body></html>');
    // A lockfile change exercises the actual production installation, entirely from npm's local cache.
    for (const name of ['package.json','package-lock.json']) {
      const file = path.join(dev,name), data = JSON.parse(await fs.readFile(file));data.version='0.0.2';
      if (data.packages) data.packages[''].version='0.0.2';
      await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
    }
    await commit(dev,'Code-Release eins');await git(dev,['push','origin','main']);
    await fs.rm(path.join(dev,'node_modules'));
    await run('npm',['ci','--offline'],{cwd:dev,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},timeout:180_000,maxBuffer:5_000_000});
    const ci = await run(process.execPath,[path.join(dev,'editor/ci/check.mjs')],{cwd:dev,env:{...process.env,FLYINGSTARS_PIPELINE_CHILD:'1'},timeout:500_000,maxBuffer:15_000_000});
    assert.match(ci.stdout,/Astro check/);assert.match(ci.stdout,/Offline-Astro-Build/);
    const oldOffline = process.env.npm_config_offline;process.env.npm_config_offline='true';
    let result;try {result=await update();} finally {if(oldOffline===undefined)delete process.env.npm_config_offline;else process.env.npm_config_offline=oldOffline;}
    assert.equal(result.installed,true);
    assert.equal(await git(host,['rev-parse','main']),await git(github,['rev-parse','main']));
    assert.match(await fs.readFile(path.join(host,'src/pages/pipeline-release.astro'),'utf8'),/Code-Release eins/);
    assert.match(await fs.readFile(path.join(webroot,'pipeline-release/index.html'),'utf8'),/Code-Release eins/);
    assert.equal(await fs.readFile(marker,'utf8'),'restart\n');
  });

  await t.test('Speichern sichert content/draft asynchron; Freigeben schiebt main und aktiviert die echte Seite', async () => {
    await freshStore();await store.sync.flush();
    const saved=await saveTitle('Redaktioneller Pipeline-Nachweis');
    assert.equal(saved.sync.pending,true);await store.sync.flush();
    assert.equal(store.sync.status.pending,false);assert.ok(store.sync.status.lastPushedAt);
    assert.equal(await git(github,['rev-parse','content/draft']),saved.head);
    // Publication must also integrate a code release that has not reached the host hook yet.
    await fs.writeFile(path.join(dev,'src/pages/pipeline-publish.astro'),'<html><body>Code beim Freigeben übernommen</body></html>');
    await commit(dev,'Code vor redaktioneller Freigabe');await git(dev,['push','origin','main']);
    const builder=new NativeBuilder(store,state,{editor:false,runtimeName:'runtime-public',webroot});
    const publisher=await new NativePublisher(store,builder).init(),review=await publisher.review();
    const published=await publisher.publish({expectedHead:review.draftHead,expectedPublishedHead:review.publishedHead,requestId:randomUUID()});
    assert.equal(await git(github,['rev-parse','main']),published.publishedHead);
    assert.match(await fs.readFile(path.join(webroot,'index.html'),'utf8'),/Redaktioneller Pipeline-Nachweis/);
    assert.match(await fs.readFile(path.join(webroot,'pipeline-publish/index.html'),'utf8'),/Code beim Freigeben übernommen/);
    await store.sync.flush();
  });

  await t.test('Weiterer Code-Release erhält noch nicht freigegebene Inhaltscommits', async () => {
    await saveTitle('Unveröffentlichter Entwurf bleibt erhalten');await store.sync.flush();store.sync.close();
    await git(dev,['pull','--ff-only','origin','main']);
    await fs.writeFile(path.join(dev,'src/pages/pipeline-release.astro'),'<html><body>Code-Release zwei</body></html>');
    await commit(dev,'Code-Release zwei');await git(dev,['push','origin','main']);
    const result=await update();assert.equal(result.installed,false);
    assert.notEqual(result.draft,result.main);
    await freshStore();assert.equal((await store.state()).records.find(r=>r.id==='page/index').data.title,'Unveröffentlichter Entwurf bleibt erhalten');
    assert.match(await fs.readFile(path.join(webroot,'index.html'),'utf8'),/Redaktioneller Pipeline-Nachweis/);
    assert.doesNotMatch(await fs.readFile(path.join(webroot,'index.html'),'utf8'),/Unveröffentlichter Entwurf bleibt erhalten/);
    await store.sync.flush();assert.equal(store.sync.status.pending,false);
    assert.equal(await git(github,['rev-parse','content/draft']),result.draft);
  });

  await t.test('Fehlgeschlagener Build aktiviert nichts und verändert den laufenden Klon nicht', async () => {
    store.sync.close();
    const oldHead=await git(host,['rev-parse','HEAD']),oldPublic=await fs.readlink(webroot),oldRestart=await fs.readFile(marker,'utf8');
    await fs.writeFile(path.join(dev,'src/pages/broken-pipeline.astro'),'---\nconst broken = ;\n---\n');
    await commit(dev,'Absichtlich fehlerhafter Build');await git(dev,['push','origin','main']);
    await assert.rejects(update(),/Aufbau fehlgeschlagen/);
    assert.equal(await fs.readlink(webroot),oldPublic);assert.equal(await git(host,['rev-parse','HEAD']),oldHead);
    assert.equal(await fs.readFile(marker,'utf8'),oldRestart);
    await git(dev,['revert','--no-edit','HEAD']);await git(dev,['push','origin','main']);
  });

  await t.test('Konflikt liefert deutschen Fehler und CLI-Exitcode; unveränderter Editor beantwortet Requests', async () => {
    const before=await git(host,['rev-parse','HEAD']),status=await git(host,['status','--porcelain']);
    const yaml=path.join(dev,'src/content/pages/index.yaml');
    await fs.writeFile(yaml,(await fs.readFile(yaml,'utf8')).replace('Redaktioneller Pipeline-Nachweis','Konkurrierender Titel aus main'));
    assert.match(await fs.readFile(yaml,'utf8'),/Konkurrierender Titel aus main/);
    assert.match(await fs.readFile(path.join(host,'src/content/pages/index.yaml'),'utf8'),/Unveröffentlichter Entwurf bleibt erhalten/);
    await commit(dev,'Konkurrierender Inhalt');await git(dev,['push','origin','main']);
    const bytes=await fs.readFile(path.join(host,'src/content/pages/index.yaml'));
    await assert.rejects(update(),/Git-Konflikt.*unverändert/);
    await assert.rejects(run(process.execPath,[path.join(host,'editor/deploy/host-update.mjs')],{cwd:host,env:{...process.env,FLYINGSTARS_STATE_DIR:state,FLYINGSTARS_PUBLIC_WEBROOT:webroot,DEPLOY_RESTART_CMD:restart}}),e=>e.code===1&&/Git-Konflikt/.test(e.stderr));
    assert.equal(await git(host,['rev-parse','HEAD']),before);assert.equal(await git(host,['status','--porcelain']),status);
    assert.deepEqual(await fs.readFile(path.join(host,'src/content/pages/index.yaml')),bytes);
    const publisher=await new NativePublisher(store,new NativeBuilder(store,state,{editor:false,runtimeName:'runtime-public',webroot})).init(),review=await publisher.review();
    await assert.rejects(publisher.publish({expectedHead:review.draftHead,expectedPublishedHead:review.publishedHead,requestId:randomUUID()}),e=>e.status===409&&/Git-Konflikt/.test(e.message));
    const app=await startNativeServers({source:host,runtimeRoot:state,listen:false,initialize:false,remote:false});
    try {const response=await handlerRequest(app.editor,app.origin);assert.equal(response.status,200);assert.equal(JSON.parse(response.body).head,before);}
    finally {app.store.sync.close();app.editor.close();app.publicServer.close();}
  });
});
