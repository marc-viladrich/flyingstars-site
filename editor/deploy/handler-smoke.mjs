// Candidate check of a deployment: imports the editor package and the FlyingStars adapter of the candidate
// checkout (run as `node <candidate>/editor/deploy/handler-smoke.mjs <candidate> <state>`) and answers one
// state request without a socket.
import {smoke,handlerRequest,isMain} from 'astro-frontend-editor/runtime';
import {site} from '../server.mjs';
export {handlerRequest};
export const smokeSite=(source,state)=>smoke(source,state,{createSite:site.createSite,compatibility:site.compatibility});
if(isMain(import.meta.url))await smokeSite(process.argv[2],process.argv[3]);
