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
 const routes=publicRouteEntries({pages:entries('pages'),projects:entries('projects'),posts:entries('posts')});assert.equal(routes.length,71);
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
 const redirects=await deliveryRedirects(process.cwd());assert.equal(redirects.length,74);assert.equal(htaccessText(redirects),readFileSync('public/.htaccess','utf8'));
});
test('Besucher-Origin, Legacy-Medien und AFE teilen eine Policy mit getrennten Projektionen',async()=>{
 const site=await createSite(process.cwd());assert.equal(PRODUCTION_ORIGIN,'https://flyingstars.art');assert.equal(site.mediaOrigin,LEGACY_MEDIA_ORIGIN);assert.deepEqual(site.mediaHosts,LEGACY_MEDIA_HOSTS);
 const custom=mediaHosts('media.example.org');assert.ok(custom.includes('media.example.org'));assert.equal(new Set(custom).size,custom.length);assert.ok(!site.mediaHosts.includes('media.example.org'));
});
