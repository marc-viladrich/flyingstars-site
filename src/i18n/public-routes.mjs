import {LOCALES,entryPath,localizedHref,localeOfId,sourceId} from './routing.mjs';
/** File identity and rendering kind determine the same route in Astro, AFE and delivery. */
export function contentRoute(collection,id,data={}){
 if(collection==='pages')return entryPath(id);
 if(collection==='posts')return localizedHref(`/blog/${sourceId(id)}/`,localeOfId(id));
 if(collection==='projects'&&data.showcase)return localizedHref(`/${data.showcase.route}/`,localeOfId(id));
 return null;
}
export const SYSTEM_ROUTES=[{kind:'pricing',path:'/drohnenshow-preise/'},{kind:'blog',path:'/blog/'}];
export function publicRouteEntries({pages,projects,posts}){
 const routes=[
  ...pages.map(page=>({path:contentRoute('pages',page.id,page.data),kind:'page',page})),
  ...projects.filter(p=>!p.data.draft&&p.data.showcase).map(project=>({path:contentRoute('projects',project.id,project.data),kind:'case',project})),
  ...posts.filter(p=>!p.data.draft).map(post=>({path:contentRoute('posts',post.id,post.data),kind:'post',post})),
  ...LOCALES.flatMap(locale=>SYSTEM_ROUTES.map(({kind,path})=>({path:localizedHref(path,locale),kind}))),
  ...LOCALES.filter(locale=>locale!=='de').map(locale=>({path:localizedHref('/404/',locale),kind:'404'})),
 ];
 const seen=new Set();for(const route of routes){if(seen.has(route.path))throw Error('Doppelte öffentliche Route: '+route.path);seen.add(route.path);}
 return routes;
}
/** Historical static aliases stay exactly as published; Apache additionally covers all current case aliases. */
const legacyAstroAliases={
 '/projekte':'/referenzen/',
 '/projekte/musikalischer-teaser-bokkenrijders':'/musikalischer-teaser-bokkenrijders/',
 '/projekte/nfl-berlin-game':'/nfl-berlin-game/',
 '/projekte/exploring-reinvented-der-neue-ford-explorer':'/exploring-reinvented-der-neue-ford-explorer/',
 '/projekte/puma-bundesliga':'/puma-bundesliga/',
 '/leistungen':'/drohnenshow-preise/',
 '/warum-wir':'/ueber-uns/',
 '/show-konfigurator':'/drohnenshow-preise/#konfigurator',
};
export const astroRedirects=()=>Object.fromEntries(LOCALES.flatMap(locale=>Object.entries(legacyAstroAliases).map(([from,to])=>[localizedHref(from,locale),localizedHref(to,locale)])));
export const projectAliases=(id,data)=>data.showcase?LOCALES.map(locale=>({from:localizedHref(`/projekte/${sourceId(id)}/`,locale),to:contentRoute('projects',locale==='de'?sourceId(id):`${locale}/${sourceId(id)}`,data)})):[];
