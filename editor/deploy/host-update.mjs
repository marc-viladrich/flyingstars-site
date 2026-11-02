// FlyingStars deploy hook (run on the host after CI): the package's host update with this site's adapter,
// legacy names and candidate checks (its own launcher and smoke script inside the candidate checkout).
import {hostUpdate as update,isMain} from 'astro-frontend-editor/runtime';
import {site} from '../server.mjs';
export const candidate=Object.freeze({check:['editor/server.mjs'],smoke:'editor/deploy/handler-smoke.mjs'});
export const hostUpdate=(input={})=>update({...site,candidate,...input});
if (isMain(import.meta.url)) {
  try {const result = await hostUpdate(); console.log('Deployment aktiviert: ' + result.activated);}
  catch (error) {console.error(error.message); process.exitCode = 1;}
}
