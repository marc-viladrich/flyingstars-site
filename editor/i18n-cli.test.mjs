import test from 'node:test';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
const run=promisify(execFile),cli=fileURLToPath(new URL('./translate-missing.mjs',import.meta.url));
for(const locale of ['en','nl'])test('Actual full-file CLI checks '+locale+' without reading private translation memory',async()=>{const {stdout}=await run(process.execPath,[cli,'--locale',locale,'--dry-run','--state-dir','/tmp/afe-cli-audit']);const result=JSON.parse(stdout);assert.equal(result.sourceRecords,66);assert.deepEqual(result.findings,[]);});
test('The CLI rejects the obsolete unchecked overlay-writing path with the current review command',async()=>{await assert.rejects(run(process.execPath,[cli,'--locale','en','--state-dir','/tmp/afe-cli-audit']),e=>/vollständige Sprachdateien/.test(e.stderr));});

test('The real CLI synchronizes both shared projections atomically without changing text evidence',{timeout:180000},async t=>{
 const {i18nFixture}=await import('./i18n-test-fixture.mjs'),{git}=await import('astro-frontend-editor/runtime'),{codecs}=await import('astro-frontend-editor/runtime/extensions'),fs=await import('node:fs/promises'),path=await import('node:path');
 const fixture=await i18nFixture(t);t.after(()=>fixture.store.sync.close());const state=await fixture.store.state(),before=state.records.find(r=>r.id==='page/en/index').data.translationEvidence,file=path.join(fixture.source,'src/content/pages/index.yaml');
 await fs.writeFile(file,codecs.yaml.update(await fs.readFile(file,'utf8'),['sections',0,'cta','href'],'/kontakt/?proof=cli'));
 await git(fixture.source,['add','src/content/pages/index.yaml']);await git(fixture.source,['-c','commit.gpgsign=false','commit','-qm','Shared source fixture']);const parent=await fixture.store.head();
 const {stdout}=await run(process.execPath,[cli,'--locale','en','--sync-shared','--site-root',fixture.source,'--state-dir',path.join(fixture.root,'cli-state')],{maxBuffer:2_000_000});const result=JSON.parse(stdout);assert.equal(result.synchronized,2);
 const saved=await fixture.store.state();assert.equal(await git(fixture.source,['rev-parse',saved.head+'^']),parent);
 for(const locale of ['en','nl']){const target=saved.records.find(r=>r.id===`page/${locale}/index`);assert.equal(target.data.sections[0].cta.href,'/kontakt/?proof=cli');assert.deepEqual(target.data.translationEvidence,locale==='en'?before:state.records.find(r=>r.id===target.id).data.translationEvidence);}
});
