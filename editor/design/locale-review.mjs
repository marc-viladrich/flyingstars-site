const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const locales=['en','nl'];
export const sourceId=id=>id.replace(/^(page|post|project|faq)\/(?:en|nl)\//,'$1/');
export function uniqueSection(section,existing){
 if(section.id){const stem=section.id.replace(/-kopie(?:-\d+)?$/,'');let id=stem+'-kopie',n=2;while(existing.some(s=>s.id===id))id=stem+'-kopie-'+n++;section.id=id;}return section;
}
// Preserve the translation that belongs to an array entry when entries move. A changed entry
// with a stable id stays matched; positional fallback is used only after exact matches are reserved.
export function matchEntries(before,after){
 const old=Array.isArray(before)?before:[],used=new Set(),matches=after.map(value=>{const i=old.findIndex((v,i)=>!used.has(i)&&same(v,value));if(i>=0)used.add(i);return i;});
 return after.map((value,i)=>{if(matches[i]>=0)return matches[i];let at=old.findIndex((v,j)=>!used.has(j)&&value?.id&&v?.id===value.id);const available=old.map((v,j)=>({v,j})).filter(({v,j})=>!used.has(j)&&v?.type===value?.type);if(at<0&&available.length===1)at=available[0].j;if(at<0&&old[i]!==undefined&&!used.has(i)&&old[i]?.type===value?.type)at=i;if(at>=0)used.add(at);return at;});
}
export function synchronize(before,after,target,path=[]){
 if(typeof after==='string'&&(['id','type'].includes(path.at(-1))||/^(?:https?:|\/|#)/.test(after)))return after;
 if(same(before,after))return structuredClone(target??after);
 if(after&&typeof after==='object'&&!Array.isArray(after)&&after.type&&before?.type!==after.type)return structuredClone(after);
 if(Array.isArray(after))return matchEntries(before,after).map((at,i)=>synchronize(at>=0?before[at]:undefined,after[i],at>=0?target?.[at]:undefined,[...path,i]));
 if(after&&typeof after==='object')return Object.fromEntries(Object.entries(after).filter(([key])=>key!=='translationSourceHash').map(([key,value])=>[key,synchronize(before?.[key],value,target?.[key],[...path,key])]));
 if(typeof after==='string'&&typeof target==='string')return target;
 return structuredClone(after);
}
export function changedLeaves(before,after,path=[]){
 if(same(before,after))return [];
 if(Array.isArray(after))return matchEntries(before,after).flatMap((at,i)=>changedLeaves(at>=0?before[at]:undefined,after[i],[...path,i]));
 if(after&&typeof after==='object')return Object.entries(after).flatMap(([key,value])=>changedLeaves(before?.[key],value,[...path,key]));
 return typeof after==='string'?[{path,value:after}]:[];
}
export const reviewLeaves=(before,after)=>changedLeaves(before,after).filter(f=>!f.path.includes('todo')&&!['type','id','translationSourceHash'].includes(f.path.at(-1))&&!/^(?:https?:|\/|#)/.test(f.value));
const set=(object,path,value)=>{let node=object;for(const key of path.slice(0,-1))node=node[key];node[path.at(-1)]=value;};
export async function reviewLocales({draft,api}){
 const sources=[...draft.local].filter(([id])=>/^(page|post|project|faq)\/[a-z0-9-]+$/.test(id));
 if(!sources.length)return;
 const proposals=[];
 for(const [id,record]of sources){const before=draft.base.get(id).data,[kind,slug]=id.split('/');
  for(const locale of locales){const targetId=`${kind}/${locale}/${slug}`,target=draft.get(targetId);if(!target)throw Error('Sprachfassung fehlt: '+targetId);
   const data=synchronize(before,record.data,target.data);data.translationSourceHash=target.data.translationSourceHash;
   proposals.push({id:targetId,data,leaves:reviewLeaves(before,record.data)});
  }
 }
 const status=api?await api('/editor/api/translation').catch(()=>({available:false,message:'Übersetzungsdienst nicht erreichbar. Manuelle Prüfung bleibt möglich.'})):{available:false,message:'Kein Übersetzungsdienst konfiguriert.'};
 const {translationSuggestion}=await import('/editor/translation-suggestion.mjs');
 await new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog'),form=document.createElement('form');form.method='dialog';
  const title=document.createElement('h2');title.textContent='EN und NL gemeinsam prüfen';form.append(title);
  const help=document.createElement('p');help.textContent='Prüfe die Sprachfassungen der geänderten deutschen Felder. Erst „Geprüft speichern“ aktualisiert den Quellhash.';form.append(help);
  for(const proposal of proposals){const heading=document.createElement('h3');heading.textContent=proposal.id;form.append(heading);
   for(const leaf of proposal.leaves){const label=document.createElement('label');label.style.display='block';label.textContent=leaf.path.join('.')+' · DE: '+leaf.value;
    const input=document.createElement('textarea');input.value=leaf.path.reduce((v,k)=>v?.[k],proposal.data)??'';input.style.cssText='display:block;width:100%;min-height:5em;margin:.5em 0 1em';input.addEventListener('input',()=>set(proposal.data,leaf.path,input.value));label.append(input);form.append(label);form.append(translationSuggestion({api,text:leaf.value,locale:proposal.id.split('/')[1],markdown:true,input,onAdopt:value=>set(proposal.data,leaf.path,value),...status}));}
  }
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Zurück zum Bearbeiten';cancel.onclick=()=>{dialog.close();};
  const save=document.createElement('button');save.type='submit';save.textContent='Geprüft speichern';form.append(cancel,save);dialog.append(form);dialog.style.cssText='max-width:52rem;width:90vw;max-height:85vh;overflow:auto;padding:2rem;color:var(--ui-text,#111);background:var(--ui-panel,#fff)';
  let accepted=false;form.onsubmit=()=>{accepted=true;};dialog.onclose=()=>{dialog.remove();accepted?resolve():reject(Error('Sprachprüfung abgebrochen. Deine Eingaben bleiben erhalten.'));};document.body.append(dialog);dialog.showModal();
 });
 draft.group(()=>{for(const proposal of proposals)draft.set(proposal.id,[],proposal.data);});
}
