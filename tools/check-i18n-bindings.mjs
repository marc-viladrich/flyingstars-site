#!/usr/bin/env node
import {readFile,readdir} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createSite} from '../editor/flyingstars-adapter.mjs';
import {readContractRecords,auditContracts} from '../src/i18n/read-contracts.mjs';
import {policyTree} from '../src/i18n/field-policy.mjs';
import {selected} from '../src/i18n/contract.mjs';
import {localeOf,baseId,same} from '../src/i18n/transaction.mjs';
const root=process.cwd(),dist=process.argv[2],site=await createSite(root),records=readContractRecords(root,site);auditContracts(site,records);
const owners=new Map(records.map(record=>{const source=site.sourceFor(record.id);return[source.address.collection+'/'+source.address.id,{...record,schema:source.schema}];}));
const stats={html:0,markers:0,addresses:0,inline:0,sharedLocaleOwners:0,localized:0,optionalPanels:0};
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const resolve=(address,inline=false)=>{
 const record=owners.get(address.owner.collection+'/'+address.owner.id);assert.ok(record,'Unknown owner '+JSON.stringify(address));
 let value=record.data,node=policyTree(record.schema);
 if(address.part==='body'){value=record.data.body;assert.equal(address.path.length,0);}else for(const key of address.path){node=selected(node,value);node=node.kind==='array'?node.element:node.kind==='tuple'?node.items[key]:node.properties?.[key];assert.ok(node,'Unknown schema path '+JSON.stringify(address));value=value?.[key];}
 if(value===undefined&&!inline&&node.optional){stats.optionalPanels++;stats.addresses++;return;}
 assert.notEqual(value,undefined,'Missing bound value '+JSON.stringify(address));stats.addresses++;
 if(inline){stats.inline++;assert.notEqual(typeof value,'object','Inline object '+JSON.stringify(address));}
 if(node.mode==='translatable')stats.localized++;
 if(node.mode==='shared'&&localeOf(record.id)){
  const source=records.find(r=>r.id===baseId(record.id));let original=source.data;for(const key of address.path)original=original?.[key];assert.ok(same(original,value),'Shared marker does not resolve its DE owner');stats.sharedLocaleOwners++;
 }
};
for(const file of (await readdir(dist,{recursive:true})).filter(f=>f.endsWith('.html'))){stats.html++;const html=await readFile(path.join(dist,file),'utf8');for(const match of html.matchAll(/data-afe="([^"]+)"/g)){
 const parsed=JSON.parse(decode(match[1]));for(const marker of parsed.markers??[parsed]){stats.markers++;if(marker.address)resolve(marker.address,marker.kind==='field'&&marker.mode==='inline');for(const address of marker.addresses??[])resolve(address);if(marker.membership)resolve(marker.membership);if(marker.rendered)assert.ok(owners.has(marker.rendered.collection+'/'+marker.rendered.id));}
}}
assert.ok(stats.html===96&&stats.inline>0);console.log(JSON.stringify(stats,null,2));
