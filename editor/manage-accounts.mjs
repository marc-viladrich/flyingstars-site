// FlyingStars launcher for the package's account tool: node editor/manage-accounts.mjs add <username> --name … --email …
// Uses this site's state directory defaults and legacy variable names (EDITOR_NEW_PASSWORD, EDITOR_ACCOUNTS, …).
import {manageAccounts as manage,runAccountsCli as run,isMain} from 'astro-frontend-editor/runtime';
import {resolveRuntimeOptions} from './server.mjs';
export const manageAccounts=(args,options={})=>manage(args,{runtime:resolveRuntimeOptions(),...options});
export const runAccountsCli=(args=process.argv.slice(2))=>run(args,{runtime:resolveRuntimeOptions()});
if(isMain(import.meta.url))await runAccountsCli();
