// FlyingStars launcher for the astro-frontend-editor runtime. `npm run editor`, `node editor/server.mjs` and the
// project-level `node relaunch/server.mjs` start here. The site supplies its adapter, its legacy names
// (compatibility) and, unless --site-root/AFE_SITE_ROOT says otherwise, its own checkout as the site root.
import {fileURLToPath} from 'node:url';
import {startNativeServers as start,runEditor as run,resolveRuntimeOptions as resolve,isMain} from 'astro-frontend-editor/runtime';
import {createFlyingStarsAdapter,compatibility} from './flyingstars-adapter.mjs';
export {builtRoutes} from 'astro-frontend-editor/runtime';

export const siteRoot=fileURLToPath(new URL('../',import.meta.url));
export const site=Object.freeze({createSite:createFlyingStarsAdapter,compatibility,defaults:{siteRoot}});
/** Runtime options with this site's defaults and legacy names. */
export const resolveRuntimeOptions=(input={})=>resolve({...input,compatibility,defaults:{siteRoot,...input.defaults}});
/** startNativeServers with the FlyingStars adapter unless the caller passes another one. */
export const startNativeServers=(input={})=>start({...site,...input});
export const runEditor=(args=process.argv.slice(2))=>run(args,site);

if(isMain(import.meta.url))await runEditor();
