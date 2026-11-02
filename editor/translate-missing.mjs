#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import path from 'node:path';import {createHash} from 'node:crypto';
import {createSite} from './flyingstars-adapter.mjs';
const {values}=parseArgs({options:{locale:{type:'string'},source:{type:'string'},'site-root':{type:'string'},'state-dir':{type:'string'},'dry-run':{type:'boolean'},print:{type:'boolean'}}});
if(!['en','nl'].includes(values.locale))throw Error('--locale en oder --locale nl angeben.');
if(!values['dry-run'])throw Error('Die Site verwendet vollständige Sprachdateien. Öffne die EN/NL-Datei im Editor und prüfe Änderungen vor dem Speichern. Dieser Prüfbefehl schreibt keine ungeprüften Maschinenübersetzungen; --dry-run zeigt fehlende/veraltete Dateien.');
const root=path.resolve(values['site-root']||values.source||fileURLToPath(new URL('../',import.meta.url))),site=await createSite(root),sources=site.sourcesFromFiles((await readdir(root+'/src/content',{recursive:true})).map(f=>'src/content/'+f)).filter(s=>['page','post','project','faq'].includes(s.prefix)&&!/^\w+\/(en|nl)\//.test(s.id));
const findings=[];
for(const source of sources){const bytes=await readFile(path.join(root,source.file)),hash=createHash('sha256').update(bytes).digest('hex'),[kind,slug]=source.id.split('/'),target=site.sourceFor(`${kind}/${values.locale}/${slug}`);let data;try{const {codecs}=await import('astro-frontend-editor/runtime/extensions');data=codecs[target.format].parse(await readFile(path.join(root,target.file),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;findings.push({id:target.id,state:'missing'});continue;}if(data.translationSourceHash!==hash)findings.push({id:target.id,state:'stale',sourceHash:hash});}
console.log(JSON.stringify({locale:values.locale,sourceRecords:sources.length,findings},null,2));
