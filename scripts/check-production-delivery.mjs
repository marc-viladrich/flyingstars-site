// Run with Node 22. Builds in an isolated copy without .env files or media requests.
import assert from 'node:assert/strict';
import {cp,mkdtemp,symlink,readFile,writeFile,readdir,rm,mkdir,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {deliveryRedirects,htaccessText} from './lib/public-delivery.mjs';
import {readEditorialRecords,seoFallbackReport} from './seo-fallback-report.mjs';
import {localizedHref} from '../src/lib/localized-routes.mjs';

assert.equal(Number(process.versions.node.split('.')[0]),22,'Use Node 22 in PATH');
const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=await mkdtemp(path.join(os.tmpdir(),'flyingstars-delivery-'));
const source=path.join(temporary,'source'),dist=path.join(root,'dist'),preview=path.join(temporary,'preview');
const env={...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH,ASTRO_TELEMETRY_DISABLED:'1',FLYINGSTARS_OFFLINE_MEDIA:'1',SITE_URL:'https://flyingstars.art',FLYINGSTARS_EDITOR:''};
async function astro(args,extra={}) {
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(source,'node_modules/astro/bin/astro.mjs'),...args],{cwd:source,env:{...env,...extra},stdio:'inherit'});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`Astro ${args[0]} exited ${code}`)));
  });
}
const htmlFiles=async directory=>(await readdir(directory,{recursive:true})).filter(file=>file.endsWith('.html'));
const routeFile=(directory,route)=>path.join(directory,route,'index.html');
try {
  await cp(root,source,{recursive:true,filter:file=>!['.git','node_modules','.astro','dist','test-results','playwright-report'].includes(path.basename(file))&&!path.basename(file).startsWith('.env')});
  await symlink(path.join(root,'node_modules'),path.join(source,'node_modules'));
  const emptyEnv=path.join(temporary,'empty-env');await mkdir(emptyEnv);
  const config=path.join(source,'astro.config.mjs');
  await writeFile(config,(await readFile(config,'utf8')).replace("vite: {cacheDir:'.astro/vite'}",`vite: {cacheDir:'.astro/vite',envDir:${JSON.stringify(emptyEnv)}}`));
  await astro(['check']);
  await astro(['build','--outDir',dist]);
  assert.equal(await readFile(path.join(dist,'robots.txt'),'utf8'),'User-agent: *\nAllow: /\nSitemap: https://flyingstars.art/sitemap-index.xml\n');
  const redirects=await deliveryRedirects(source),htaccess=await readFile(path.join(dist,'.htaccess'),'utf8');
  assert.equal(htaccess,htaccessText(redirects),'Regenerate public/.htaccess after route changes');
  const sitemap=(await Promise.all((await readdir(dist)).filter(f=>/^sitemap.*\.xml$/.test(f)).map(f=>readFile(path.join(dist,f),'utf8')))).join('\n');
  for(const {from,to} of redirects) {
    assert.notEqual(from,to,'No redirect loops');
    assert.ok(!redirects.some(r=>r.from===to),`No redirect chain: ${from}`);
    await access(routeFile(dist,to));
    assert.ok(!sitemap.includes(`https://flyingstars.art${from}<`),`Redirect source in sitemap: ${from}`);
  }
  const records=await readEditorialRecords(source);
  for(const project of records.filter(r=>r.id.startsWith('project/')&&!r.data.draft)) {
    for(const locale of ['de','en','nl']) {
      const short=project.data.showcase&&localizedHref(`/${project.data.showcase.route}/`,locale);
      const nested=localizedHref(`/projekte/${project.id.slice(8)}/`,locale);
      const canonicalRoute=short||nested;
      const projectHtml=await readFile(routeFile(dist,canonicalRoute),'utf8');
      assert.ok(projectHtml.includes(`<link rel="canonical" href="https://flyingstars.art${canonicalRoute}"`),`Wrong project canonical: ${canonicalRoute}`);
      if(!/<meta name="robots" content="[^"]*noindex/.test(projectHtml)) assert.ok(sitemap.includes(`https://flyingstars.art${canonicalRoute}<`),`Project missing from sitemap: ${canonicalRoute}`);
      if(short) {
        await assert.rejects(access(routeFile(dist,nested)),`Duplicate project HTML: ${nested}`);
        assert.ok(redirects.some(r=>r.from===nested&&r.to===short));
      }
    }
  }
  let count=0;
  for(const file of await htmlFiles(dist)) {
    const html=await readFile(path.join(dist,file),'utf8');count++;
    assert.doesNotMatch(html,/data-native-|data-editor-|\/editor\/(?:web|api|bridge)|native-editor-bridge/,file);
    for(const {from} of redirects) assert.ok(!html.includes(`href="${from}"`),`Internal link to redirect in ${file}: ${from}`);
  }
  await access(path.join(dist,'404.html'));
  const report=await seoFallbackReport(source,dist);
  await mkdir(path.join(root,'.astro'),{recursive:true});
  await writeFile(path.join(root,'.astro/seo-fallbacks.json'),JSON.stringify(report,null,2)+'\n');
  // A second real build verifies preview output and crawler protection, with a different origin.
  await astro(['build','--outDir',preview],{FLYINGSTARS_EDITOR:'1',SITE_URL:'https://preview.example.org'});
  assert.equal(await readFile(path.join(preview,'robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
  for(const file of await htmlFiles(preview)) assert.match(await readFile(path.join(preview,file),'utf8'),/<meta name="robots" content="[^"]*noindex/,file);
  const previewSitemap=await readFile(path.join(preview,'sitemap-0.xml'),'utf8').catch(()=> '');
  assert.doesNotMatch(previewSitemap,/<loc>/,'Preview sitemap must contain no pages');
  console.log(`Delivery checks passed: ${count} production HTML files, ${redirects.length} exact 301 mappings, ${report.length} SEO fallback pages. Preview is non-indexable.`);
} finally {
  await rm(temporary,{recursive:true,force:true});
}
