#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';import path from 'node:path';
import {createSite} from './flyingstars-adapter.mjs';
import {readContractRecords} from '../src/i18n/read-contracts.mjs';
import {dependenciesFromRecords,isSource,verifyCurrent,prepareLocale,stamp,same,contentData} from '../src/i18n/transaction.mjs';
const {values}=parseArgs({options:{locale:{type:'string'},source:{type:'string'},'site-root':{type:'string'},'state-dir':{type:'string'},'dry-run':{type:'boolean'},'sync-shared':{type:'boolean'},print:{type:'boolean'}}});
if(!['en','nl'].includes(values.locale))throw Error('--locale en oder --locale nl angeben.');
if(!values['dry-run']&&!values['sync-shared'])throw Error('Die Site verwendet vollständige Sprachdateien. --dry-run prüft den Vertrag; --sync-shared synchronisiert ausschließlich gemeinsame Werte ohne Textfreigabe.');
const root=path.resolve(values['site-root']||values.source||fileURLToPath(new URL('../',import.meta.url))),site=await createSite(root),records=readContractRecords(root,site),dependencies=dependenciesFromRecords(records),sources=records.filter(r=>isSource(r.id)),findings=[],proposals=[];
for(const source of sources)for(const locale of values['sync-shared']?['en','nl']:[values.locale]){const id=source.id.replace('/',`/${locale}/`),target=records.find(r=>r.id===id);if(!target){findings.push({id,state:'missing'});continue;}
 try{verifyCurrent(site.sourceFor(source.id).schema,source.data,target.data,locale,dependencies);}catch(error){findings.push({id,state:'stale',reason:error.message});}
 if(values['sync-shared']){const {result,needed}=prepareLocale(site.sourceFor(source.id).schema,source.data,target.data,locale,dependencies);if(needed.length)throw Error('Textprüfung nötig: '+id+' '+needed.join(', '));if(!same(result.projection,contentData(target.data)))proposals.push({id,data:{...stamp(result),translationSourceHash:target.data.translationSourceHash,translationContractVersion:target.data.translationContractVersion,translationEvidence:target.data.translationEvidence}});}
}
if(values['sync-shared']&&proposals.length){
 if(!values['state-dir'])throw Error('--sync-shared benötigt einen ausdrücklich gesetzten --state-dir.');
 const {NativeStore,NativeBuilder}=await import('astro-frontend-editor/runtime'),{resolveRuntimeOptions}=await import('./server.mjs'),{randomUUID}=await import('node:crypto');
 const store=await new NativeStore(root,{remote:false,site,runtime:resolveRuntimeOptions({env:{},values:{siteRoot:root,stateDir:values['state-dir']}})}).init();
 try{const builder=new NativeBuilder(store,path.join(values['state-dir'],'i18n-build'),{editor:false,origin:'https://flyingstars.art',env:{PATH:process.env.PATH}});store.verify=head=>builder.prepare(head);const state=await store.state();await store.save({expectedHead:state.head,requestId:randomUUID(),changes:proposals.map(p=>({id:p.id,expectedRevision:state.records.find(r=>r.id===p.id).revision,patches:[{path:[],value:p.data}]}))});}finally{store.sync.close();}
}
console.log(JSON.stringify({locale:values.locale,sourceRecords:sources.length,findings,synchronized:proposals.length},null,2));
