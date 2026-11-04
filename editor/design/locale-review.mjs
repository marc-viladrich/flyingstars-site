import {project} from '../../src/i18n/contract.mjs';
import {seedTranslation,dependenciesFromRecords,isSource,prepareLocale,contentData,stamp,approvalFor} from '../../src/i18n/transaction.mjs';
import {renewKeys} from '../../src/i18n/keys.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const locales=['en','nl'];
export const sourceId=id=>id.replace(/^(page|post|project|faq)\/(?:en|nl)\//,'$1/');
export function uniqueSection(section,existing){
 renewKeys(section);
 if(section.id){const stem=section.id.replace(/-kopie(?:-\d+)?$/,'');let id=stem+'-kopie',n=2;while(existing.some(s=>s.id===id))id=stem+'-kopie-'+n++;section.id=id;}return section;
}
// Localized entries match exclusively by their persisted internal key.
export function matchEntries(before,after){
 const old=Array.isArray(before)?before:[];
 const keyed=after.some(v=>v&&typeof v==='object'&&'_key' in v)||old.some(v=>v&&typeof v==='object'&&'_key' in v);
 if(keyed){
  for(const list of [old,after]){const keys=new Set();for(const value of list){if(!value?._key||keys.has(value._key))throw Error('Missing or duplicate _key');keys.add(value._key);}}
  return after.map(value=>old.findIndex(v=>v._key===value._key));
 }
 // Shared-only primitive lists carry no localized identity.
 return after.map(value=>old.findIndex(v=>same(v,value)));
}
export const synchronize=(before,after,target,schema)=>seedTranslation(schema,after,target);
const set=(object,path,value)=>{let node=object;for(const key of path.slice(0,-1))node=node[key];node[path.at(-1)]=value;};
/** Review planning has no side effects. Cancel, suggestions and preview cannot approve fields. */
export function localeProposals(draft){
 const records=draft.records(),dependencies=dependenciesFromRecords(records),proposals=[];
 for(const source of records.filter(r=>isSource(r.id))){
  for(const locale of locales){
   const id=source.id.replace('/',`/${locale}/`),target=draft.get(id);if(!target)throw Error('Sprachfassung fehlt: '+id);
   const {result,needed}=prepareLocale(source.schema,source.data,target.data,locale,dependencies);
   const projected={...stamp(result),translationSourceHash:target.data.translationSourceHash,translationContractVersion:target.data.translationContractVersion,translationEvidence:target.data.translationEvidence};
   // Stamps remain server-owned; only content and an explicit approval command enter the request.
   if(draft.local.has(source.id)||draft.local.has(id)||needed.length||!same(contentData(target.data),result.projection))proposals.push({id,data:projected,result,needed,source,schema:source.schema,locale});
  }
 }
 return proposals;
}
export function applyLocaleProposals(draft,proposals,{reviewed=false}={}){
 const dependencies=dependenciesFromRecords(draft.records());
 draft.group(()=>{for(const proposal of proposals){
  const result=project(proposal.schema,proposal.source.data,proposal.data,proposal.locale,dependencies),data={...proposal.data};
  if(reviewed&&proposal.needed.length)data.translationReview=approvalFor(result,proposal.needed);
  if(draft.local.has(proposal.source.id)&&same(draft.base.get(proposal.id).data,data)){
   // A source text may be confirmed without changing the target words. The explicit command touches it.
   data.translationReview=[];
  }
  draft.set(proposal.id,[],data);
 }});
}
export async function reviewLocales({draft,api}){
 const proposals=localeProposals(draft);
 if(!proposals.length)return;
 if(!proposals.some(p=>p.needed.length)){applyLocaleProposals(draft,proposals);return;}
 const status=api?await api('/editor/api/translation').catch(()=>({available:false,message:'Übersetzungsdienst nicht erreichbar. Manuelle Prüfung bleibt möglich.'})):{available:false,message:'Kein Übersetzungsdienst konfiguriert.'};
 const {translationSuggestion}=await import('/editor/translation-suggestion.mjs');
 await new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog'),form=document.createElement('form');form.method='dialog';
  const title=document.createElement('h2');title.textContent='EN und NL gemeinsam prüfen';form.append(title);
  const help=document.createElement('p');help.textContent='Prüfe die betroffenen Texte. Erst „Geprüft speichern“ bestätigt genau diese Quell- und Zielstände.';form.append(help);
  for(const proposal of proposals){const heading=document.createElement('h3');heading.textContent=proposal.id;form.append(heading);
   for(const leaf of proposal.result.fields.filter(field=>proposal.needed.includes(field.address)&&field.present&&typeof field.value==='string')){const label=document.createElement('label');label.style.display='block';label.textContent=leaf.path.join('.')+' · DE: '+leaf.value;
    const input=document.createElement('textarea');input.value=leaf.path.reduce((v,k)=>v?.[k],proposal.data)??'';input.style.cssText='display:block;width:100%;min-height:5em;margin:.5em 0 1em';input.addEventListener('input',()=>set(proposal.data,leaf.path,input.value));label.append(input);form.append(label);form.append(translationSuggestion({api,text:leaf.value,locale:proposal.id.split('/')[1],markdown:true,input,onAdopt:value=>set(proposal.data,leaf.path,value),...status}));}
  }
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Zurück zum Bearbeiten';cancel.onclick=()=>{dialog.close();};
  const save=document.createElement('button');save.type='submit';save.textContent='Geprüft speichern';form.append(cancel,save);dialog.append(form);dialog.style.cssText='max-width:52rem;width:90vw;max-height:85vh;overflow:auto;padding:2rem;color:var(--ui-text,#111);background:var(--ui-panel,#fff)';
  let accepted=false;form.onsubmit=()=>{accepted=true;};dialog.onclose=()=>{dialog.remove();accepted?resolve():reject(Error('Sprachprüfung abgebrochen. Deine Eingaben bleiben erhalten.'));};document.body.append(dialog);dialog.showModal();
 });
 applyLocaleProposals(draft,proposals,{reviewed:true});
}

/** The package routes inspector list insertion/duplication through siteChange. */
export function keyedListChange(id,path,value,{draft}){
 if(!isSource(id)||!Array.isArray(value)||!value.some(v=>v&&typeof v==='object'&&'_key' in v))return false;
 const current=path.reduce((v,k)=>v?.[k],draft.get(id).data)??[],old=new Set(current.map(v=>v?._key)),seen=new Set(),next=structuredClone(value);
 for(const item of next){if(!item._key||!old.has(item._key)||seen.has(item._key))renewKeys(item);seen.add(item._key);}
 draft.set(id,path,next);return true;
}
