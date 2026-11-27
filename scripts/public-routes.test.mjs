import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contentRoute,publicRouteEntries,astroRedirects,projectAliases} from '../src/i18n/public-routes.mjs';
import {LOCALES,localizedHref} from '../src/i18n/routing.mjs';
import {PRODUCTION_ORIGIN,LEGACY_MEDIA_ORIGIN,LEGACY_MEDIA_HOSTS,mediaHosts} from '../src/site-policy.mjs';
import {resolveRedirects,assertRedirectRoutes,deliveryRedirects,htaccessText} from './lib/public-delivery.mjs';
import {readEditorialRecords} from './seo-fallback-report.mjs';
import {createSite} from '../editor/flyingstars-adapter.mjs';
import {splitLocale,localizedPath} from '../editor/extensions/flyingstars/web/routing.mjs';
test('Alle tatsächlichen öffentlichen Inhaltsrouten und AFE-Ziele stammen aus derselben Ableitung',async()=>{
 const records=await readEditorialRecords(process.cwd()),site=await createSite(process.cwd());
 const entries=collection=>records.filter(r=>site.sourceFor(r.id).address.collection===collection).map(r=>({id:site.sourceFor(r.id).address.id,data:r.data}));
 const routes=publicRouteEntries({pages:entries('pages'),projects:entries('projects'),posts:entries('posts')});
 const systemPaths=LOCALES.flatMap(locale=>['/drohnenshow-preise/','/blog/'].map(route=>localizedHref(route,locale)));
 const editorialPaths=records.filter(record=>{
  const {collection}=site.sourceFor(record.id).address;
  return collection==='pages'||(['posts','projects'].includes(collection)&&!record.data.draft);
 }).map(record=>site.recordRoute(record)).filter(Boolean);
 const expected=[...editorialPaths,...systemPaths,'/en/404/','/nl/404/'];
 assert.deepEqual(routes.map(route=>route.path).sort(),expected.sort());
 for(const record of records){const source=site.sourceFor(record.id);assert.equal(site.recordRoute(record),contentRoute(source.address.collection,source.address.id,record.data));}
 for(const route of routes)for(const locale of LOCALES){const localized=localizedHref(route.path,locale);assert.equal(localizedPath(splitLocale(localized).path,locale),localized);}
 assert.equal(Object.keys(astroRedirects()).length,24);
 assert.throws(()=>publicRouteEntries({pages:[{id:'blog',data:{}}],projects:[],posts:[]}),/Doppelte öffentliche Route/);
 const aliases=projectAliases('heiratsantrag-hugenpoet',{showcase:{route:'heiratsantrag-hugenpoet'}});assert.equal(aliases.length,3);assert.equal(aliases[2].to,'/nl/heiratsantrag-hugenpoet/');
});
test('Redirects erkennen widersprüchliche Ziele vor der Map-Projektion und lösen nur eindeutige Ketten auf',async()=>{
 assert.throws(()=>resolveRedirects([{from:'/a',to:'/b/'},{from:'/a/',to:'/c/'}]),/Widersprüchlicher Redirect/);
 assert.throws(()=>resolveRedirects([{from:'/a/',to:'/b/'},{from:'/b/',to:'/a/'}]),/cycle/);
 assert.deepEqual(resolveRedirects([{from:'/a',to:'/b/'},{from:'/a/',to:'/b/'},{from:'/b/',to:'/c/'}]),[{from:'/a/',to:'/c/'},{from:'/b/',to:'/c/'}]);
 assert.throws(()=>assertRedirectRoutes([{from:'/kontakt/',to:'/target/'}],[{path:'/kontakt/'}]),/überschreibt/);
 assert.equal(resolveRedirects([{from:'/umlaute-für',to:'/target/'}])[0].from,'/umlaute-für/');
 const redirects=await deliveryRedirects(process.cwd());assert.equal(htaccessText(redirects),readFileSync('public/.htaccess','utf8'));
});
test('Besucher-Origin, Legacy-Medien und AFE teilen eine Policy mit getrennten Projektionen',async()=>{
 const site=await createSite(process.cwd());assert.equal(PRODUCTION_ORIGIN,'https://flyingstars.art');assert.equal(site.mediaOrigin,LEGACY_MEDIA_ORIGIN);assert.deepEqual(site.mediaHosts,LEGACY_MEDIA_HOSTS);
 const custom=mediaHosts('media.example.org');assert.ok(custom.includes('media.example.org'));assert.equal(new Set(custom).size,custom.length);assert.ok(!site.mediaHosts.includes('media.example.org'));
});

test('Das WordPress-Inventar führt jeden Showbericht auf eine vorhandene sprachgleiche Fallstudie',async()=>{
 const csv=readFileSync(new URL('../docs/inventar.csv',import.meta.url),'utf8');
 // CSV fields can contain commas and doubled quotes, including in article titles.
 const records=csv.trimEnd().split(/\r?\n/).map(line=>
  [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)]
   .map(match=>match[1]?.replaceAll('""','"')??match[2]));
 const [header,...rows]=records;
 const reports=rows.map(row=>{
  assert.equal(row.length,header.length,'Ungültige Inventarzeile: '+row[0]);
  return Object.fromEntries(header.map((name,index)=>[name,row[index]]));
 }).filter(row=>row.Typ==='Referenz/Showbericht');
 assert.equal(reports.length,36);

 const root=process.cwd(), content=await readEditorialRecords(root);
 const projects=content.filter(record=>record.id.startsWith('project/')).map(record=>({
  id:record.id.slice('project/'.length),data:record.data,
 }));
 const cases=new Set(publicRouteEntries({pages:[],projects,posts:[]}).filter(route=>route.kind==='case').map(route=>route.path));
 const htaccess=readFileSync(new URL('../public/.htaccess',import.meta.url),'utf8');
 const rules=[...htaccess.matchAll(/^RewriteRule (\^\S+) (\S+) \[R=301,L\]$/gm)]
  .map(([,pattern,target])=>({pattern:new RegExp(pattern),target}));
 const assertDirect=(source,target)=>{
  for(const variant of [source.replace(/\/$/,''),source]){
   const rule=rules.find(({pattern})=>pattern.test(variant.slice(1)));
   assert.equal(rule?.target,target,'Direkte 301 für '+variant);
  }
 };
 for(const report of reports){
  const from=new URL(report['Alte URL']).pathname.replace(/\/?$/,'/');
  const to=new URL(report['Neue URL (tatsächlich oder geplant)']).pathname;
  const locale=report.Sprache;
  assert.ok(cases.has(to),'Fehlende Fallstudie '+to);
  assert.equal(to.startsWith('/en/'),locale==='en');
  if(from===to){
   // Apache's DirectorySlash handles the slashless form of retained static directories.
   assert.ok(!rules.some(({pattern})=>pattern.test(from.slice(1))),'Selbstweiterleitung '+from);
  }else assertDirect(from,to);
 }
 for(const [from,to] of [
  ['/100-drohnen-fur-puma-zum-anstoss-eines-bundesliga-derbys/','/puma-bundesliga/'],
  ['/en/100-drones-for-puma-at-the-start-of-a-bundesliga-derby/','/en/puma-bundesliga/'],
  ['/ford-drohnenshow/','/exploring-reinvented-der-neue-ford-explorer/'],
  ['/en/ford-droneshow/','/en/exploring-reinvented-der-neue-ford-explorer/'],
 ]){
  assert.ok(cases.has(to),'Fehlende Fallstudie '+to);
  assertDirect(from,to);
 }
});

test('WordPress-Artikel haben eindeutige sprachgleiche Ziele auf beiden Hosts', async () => {
  const content = await readEditorialRecords(process.cwd());
  const posts = content.filter(record => record.id.startsWith('post/') && record.data.legacyPath);
  const expected = readFileSync(new URL('../docs/inventar.csv', import.meta.url), 'utf8').trimEnd().split(/\r?\n/)
    .slice(1).filter(row => !row.includes(',Referenz/Showbericht,')).map(row => new URL(row.split(',')[0]).pathname);
  assert.deepEqual(posts.map(record => record.data.legacyPath).sort(), expected.sort());
  const delivery = new Map((await deliveryRedirects(process.cwd())).map(rule => [rule.from, rule.to]));
  const preview = new Map(readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8').trimEnd().split('\n')
    .map(line => {
      const [from, to, status] = line.split(' ');
      assert.equal(status, '301');
      return [from, to];
    }));
  const targets = new Set();
  for (const post of posts) {
    assert.equal(post.data.draft, false);
    const { legacyPath } = post.data;
    const target = contentRoute('posts', post.id.slice('post/'.length), post.data);
    assert.equal(target.startsWith('/en/'), legacyPath.startsWith('/en/'));
    assert.equal(delivery.get(legacyPath + '/'), target);
    assert.equal(preview.get(legacyPath), target);
    assert.equal(preview.get(legacyPath + '/'), target);
    assert.ok(!targets.has(target), 'Doppeltes WordPress-Ziel: ' + target);
    targets.add(target);
  }
});
