import {legacyEnvironmentOptions,legacyBuildEnvironment} from './flyingstars-adapter.mjs';
export {legacyRuntimePaths,legacyRuntimeMessages} from './flyingstars-adapter.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Host settings, never site-contract metadata. All paths are absolute after resolution.
 * @typedef {object} RuntimeOptions
 * @property {readonly import('./core/extensions.mjs').Extension[]} extensions
 * @property {string} siteRoot
 * @property {string} stateDir
 * @property {string|null} publicWebroot
 * @property {string} editorAssets
 * @property {string} editorOrigin
 * @property {string} canonicalOrigin
 * @property {number} port
 * @property {number} publicPort
 * @property {{remote:string|false|null,draftBranch:string,publishedBranch:string}} git
 * @property {{enabled:boolean,port:number,node:string}} preview
 * @property {{enabled:boolean,file:string,secret:string|undefined,forbiddenRoots:string[]}} auth
 * @property {{provider:string|undefined,url:string|undefined,key:string|undefined,deeplKey:string|undefined,email:string|undefined,budget:number}} translation
 * @property {string|undefined} mediaHost
 * @property {Record<string,string>} buildEnv
 * @property {Record<string,string>} processEnv
 */

// Generic names win over deprecated aliases, including an explicitly empty value.
export const environmentOptions = Object.freeze({
 siteRoot:['AFE_SITE_ROOT'],stateDir:['AFE_STATE_DIR',...legacyEnvironmentOptions.stateDir],
 publicWebroot:['AFE_PUBLIC_WEBROOT',...legacyEnvironmentOptions.publicWebroot],
 editorOrigin:['AFE_EDITOR_ORIGIN','EDITOR_ORIGIN'],canonicalOrigin:['AFE_CANONICAL_ORIGIN','SITE_URL'],
 port:['AFE_PORT','PORT','RELAUNCH_PORT'],publicPort:['AFE_PUBLIC_PORT','RELAUNCH_PUBLIC_PORT'],
 preview:['AFE_PREVIEW','RELAUNCH_PREVIEW'],previewPort:['AFE_PREVIEW_PORT','RELAUNCH_PREVIEW_PORT'],
 remote:['AFE_GIT_REMOTE',...legacyEnvironmentOptions.remote],draftBranch:['AFE_DRAFT_BRANCH'],publishedBranch:['AFE_PUBLISHED_BRANCH'],
 auth:['AFE_AUTH','EDITOR_AUTH'],accounts:['AFE_ACCOUNTS','EDITOR_ACCOUNTS'],sessionSecret:['AFE_SESSION_SECRET','EDITOR_SESSION_SECRET'],
 translationProvider:['AFE_TRANSLATION_PROVIDER','EDITOR_TRANSLATION_PROVIDER'],translationUrl:['AFE_TRANSLATION_URL','EDITOR_TRANSLATION_URL'],
 translationKey:['AFE_TRANSLATION_KEY','EDITOR_TRANSLATION_KEY'],translationBudget:['AFE_TRANSLATION_BUDGET','EDITOR_TRANSLATION_BUDGET'],
 deeplKey:['AFE_DEEPL_API_KEY','DEEPL_API_KEY'],translationEmail:['AFE_MYMEMORY_EMAIL','MYMEMORY_EMAIL'],
 offlineMedia:['AFE_OFFLINE_MEDIA',...legacyEnvironmentOptions.offlineMedia],mediaHost:['MEDIA_HOST'],
});
/** @type {Readonly<Record<string,string>>} */
const flags=Object.freeze({
 'site-root':'siteRoot','source':'siteRoot','state-dir':'stateDir','public-webroot':'publicWebroot',
 'editor-origin':'editorOrigin','canonical-origin':'canonicalOrigin','port':'port','public-port':'publicPort',
 'preview':'preview','preview-port':'previewPort','git-remote':'remote','draft-branch':'draftBranch','published-branch':'publishedBranch',
 'auth':'auth','accounts':'accounts','session-secret':'sessionSecret','translation-provider':'translationProvider',
 'translation-url':'translationUrl','translation-key':'translationKey','translation-budget':'translationBudget',
 'deepl-api-key':'deeplKey','mymemory-email':'translationEmail','offline-media':'offlineMedia',
});
/** @param {string[]} args @returns {Record<string,any>} */
export function parseRuntimeArgs(args) {
 /** @type {Record<string,any>} */
 const values={};
 for(let i=0;i<args.length;i++){
  const match=/^--([^=]+)(?:=(.*))?$/.exec(args[i]),key=match&&flags[match[1]];
  if(!key)throw Error('Unbekannte Runtime-Option: '+args[i]);
  const value=match[2]??args[++i];
  if(value===undefined||value.startsWith('--'))throw Error('Wert fehlt für --'+match[1]+'.');
  values[key]=value;
 }
 return values;
}
/** @param {string|number} value @param {string} name */
const number=(value,name,min=1)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>65535)throw Error(name+' ist ungültig.');return n;};
/** @param {unknown} value @param {boolean} fallback */
const enabled=(value,fallback)=>value===undefined?fallback:![false,'off','0','false'].some(item=>item===value);
/** @param {string} value */
const branch=value=>{if(typeof value!=='string'||!value||value.startsWith('-')||/[\s~^:?*\[\\\x00-\x1f]/.test(value)||value.includes('..')||value.includes('@{')||value.split('/').some(p=>!p||p.startsWith('.')||p.endsWith('.')||p.endsWith('.lock')))throw Error('Ungültiger Git-Branch.');return value;};
/** @param {string} value @param {string} name */
const origin=(value,name)=>{let url;try{url=new URL(value);}catch{throw Error(name+' muss eine vollständige Origin ohne Pfad sein.');}if(url.origin!==value||!['http:','https:'].includes(url.protocol))throw Error(name+' muss eine vollständige Origin ohne Pfad sein.');return value;};

/** Resolve at a CLI/API boundary. Does not read .env files or mutate process.env.
 * @param {{args?:string[],env?:NodeJS.ProcessEnv,cwd?:string,values?:Record<string,any>,authDefault?:boolean,previewDefault?:boolean}} [input]
 * @returns {RuntimeOptions}
 */
const installedSiteRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function resolveRuntimeOptions({args=[],env=process.env,cwd=process.cwd(),values={},authDefault=false,previewDefault=false}={}) {
 /** @type {Record<string,any>} */
 const configured={};
 for(const[key,names]of Object.entries(environmentOptions)){const name=names.find(name=>env[name]!==undefined);if(name)configured[key]=env[name];}
 const v={...configured,...parseRuntimeArgs(args),...Object.fromEntries(Object.entries(values).filter(([,value])=>value!==undefined))};
 // Without an explicit root the pilot edits the site it is installed in (legacy default, independent of cwd).
 // When the editor ships as a package (PR 11) this default must move to the site's working directory.
 const siteRoot=v.siteRoot?path.resolve(cwd,v.siteRoot):installedSiteRoot,stateDir=path.resolve(cwd,v.stateDir||path.dirname(siteRoot));
 const publicWebroot=v.publicWebroot?path.resolve(cwd,v.publicWebroot):null;
 const port=number(v.port??4542,'AFE_PORT'),publicPort=number(v.publicPort??4543,'AFE_PUBLIC_PORT');
 const editorOrigin=origin(v.editorOrigin||'http://127.0.0.1:'+port,'AFE_EDITOR_ORIGIN');
 const canonicalOrigin=origin(v.canonicalOrigin||'http://127.0.0.1:'+publicPort,'AFE_CANONICAL_ORIGIN');
 const authEnabled=enabled(v.auth,authDefault),url=new URL(editorOrigin);
 if(authEnabled&&url.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Anmeldung benötigt eine HTTPS-Origin.');
 const budget=Number(v.translationBudget??5000);if(!Number.isSafeInteger(budget)||budget<1)throw Error('AFE_TRANSLATION_BUDGET ist ungültig.');
 /** @type {Record<string,string>} */
 const snapshot={};for(const[key,value]of Object.entries(env))if(value!==undefined)snapshot[key]=value;
 const processEnv=Object.freeze(snapshot);
 /** @type {Record<string,string>} */
 const buildEnv={};for(const key of ['PATH','HOME','TMPDIR','LANG','MEDIA_HOST','PUBLIC_FORM_ENDPOINT']){const value=env[key];if(value!==undefined)buildEnv[key]=value;}
 Object.assign(buildEnv,legacyBuildEnvironment(v.offlineMedia));
 return Object.freeze({siteRoot,stateDir,publicWebroot,extensions:Object.freeze([...(v.extensions||[])]),
  // Runtime assets belong to this pilot installation, not to the site's source services.
  editorAssets:fileURLToPath(new URL('./web/',import.meta.url)),
  editorOrigin,canonicalOrigin,port,publicPort,
  git:Object.freeze({remote:v.remote??null,draftBranch:branch(v.draftBranch||'content/draft'),publishedBranch:branch(v.publishedBranch||'main')}),
  preview:Object.freeze({enabled:enabled(v.preview,previewDefault),port:number(v.previewPort??port+2,'AFE_PREVIEW_PORT'),node:process.execPath}),
  auth:Object.freeze({enabled:authEnabled,file:path.resolve(cwd,v.accounts||path.join(stateDir,'runtime-private/editor-accounts.json')),secret:v.sessionSecret,
   forbiddenRoots:[siteRoot,fileURLToPath(new URL('./web/',import.meta.url)),...['runtime','runtime-public','preview'].map(dir=>path.join(stateDir,dir)),...publicWebroot?[publicWebroot]:[]]}),
  translation:Object.freeze({provider:v.translationProvider,url:v.translationUrl,key:v.translationKey,deeplKey:v.deeplKey,email:v.translationEmail,budget}),
  mediaHost:v.mediaHost,buildEnv:Object.freeze(buildEnv),processEnv,
 });
}
