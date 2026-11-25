import data from './project-facts.json' with {type:'json'};
export const PROJECT_FACTS=data;
export const PROJECT_FIELDS=['date','endDate','client','location','drones','shows','totalDrones'];
export const PROJECT_DISPLAYS=['text','iso','numeric','year','long','monthYear','monthYearCapital','dayMonth'];
/** A project fact always identifies one historical event, never the current fleet. */
export function projectValue(ref,locale='de',source=data){
 if(!ref||typeof ref!=='object'||!('project'in ref))return ref;
 if(!PROJECT_FIELDS.includes(ref.field)||ref.display&&(!PROJECT_DISPLAYS.includes(ref.display)||!['date','endDate'].includes(ref.field)&&ref.display!=='text'))throw Error('Unbekanntes Projektfaktenformat: '+ref.field+'.'+ref.display);
 const event=source[ref.project];if(!Object.hasOwn(source,ref.project))throw Error('Unbekannter Projektfakt: '+ref.project);
 let value=ref.field==='totalDrones'?event.drones*event.shows:event[ref.field];
 if(value===undefined||typeof value==='number'&&!Number.isFinite(value))throw Error(`Unbekannter Projektfakt: ${ref.project}.${ref.field}`);
 if(value&&typeof value==='object'){value=value[locale];if(typeof value!=='string')throw Error(`Fehlende Faktensprache: ${ref.project}.${ref.field}.${locale}`);}
 if(['date','endDate'].includes(ref.field)){
  const [year,month,day]=value.split('-');
  if(ref.display==='year')return year;
  if(ref.display==='iso'||ref.display==='text')return value;
  if(!day&&['long','dayMonth'].includes(ref.display))throw Error('Tag unbekannt: '+ref.project);
  if(['long','monthYear','monthYearCapital','dayMonth'].includes(ref.display)){const options=ref.display==='long'?{dateStyle:'long'}:ref.display==='dayMonth'?{day:'numeric',month:'long'}:{month:'long',year:'numeric'};let formatted=new Intl.DateTimeFormat({de:'de-DE',en:'en-GB',nl:'nl-NL'}[locale],{...options,timeZone:'UTC'}).format(new Date(value+(value.length===7?'-01':'')+'T00:00:00Z'));return ref.display==='monthYearCapital'?formatted[0].toUpperCase()+formatted.slice(1):formatted;}
  if(ref.display==='numeric'){if(!day)throw Error('Tag unbekannt: '+ref.project);return `${day}.${month}.${year}`;}
  return new Date(value+(value.length===7?'-01':'')+'T00:00:00Z');
 }
 return ref.display==='text'?String(value):value;
}
export function projectText(text,locale='de',source=data,{markdown=false}={}){
 if(typeof text!=='string')return text;
 return text.replace(/\{\{project\.([a-z0-9-]+)\.([a-zA-Z]+)(?:\.([a-zA-Z]+))?\}\}/g,(_,project,field,display)=>{
  const value=String(projectValue({project,field,display:display??(['date','endDate'].includes(field)?'iso':undefined)},locale,source));
  return markdown?value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/[\\`*_[\]{}()!#+|>-]/g,'\\$&'):value;
 });
}
/** Eckdaten zeigen ein Datum für Menschen: tagesgenaue Daten ausgeschrieben und lokalisiert (long: „29. Juni 2024“,
 * „29 June 2024“, „29 juni 2024“), nur monatsgenaue als Monat. ISO- und Zifferndaten (iso, numeric, text) werden umgesetzt,
 * bewusst gewählte Formate (long, monthYear, year …) bleiben. Gilt für Faktenreferenzen und für {{project.…date…}} in Text. */
export function readableDate(value,source=data){
 const pick=(project,display)=>{
  if(display&&!['iso','numeric','text'].includes(display))return display;
  const date=source[project]?.date;
  return typeof date==='string'&&date.length===10?'long':'monthYear';
 };
 if(value&&typeof value==='object'&&'project'in value)return value.field==='date'?{...value,display:pick(value.project,value.display)}:value;
 if(typeof value==='string')return value.replace(/\{\{project\.([a-z0-9-]+)\.date(?:\.([a-zA-Z]+))?\}\}/g,(_,project,display)=>`{{project.${project}.date.${pick(project,display)}}}`);
 return value;
}
/** Resolve only explicit references. Story text, roles and unrelated historical measurements stay independent. */
export function projectValues(value,locale='de',source=data){
 if(typeof value==='string')return projectText(value,locale,source);
 if(value instanceof Date)return value;
 if(Array.isArray(value))return value.map(v=>projectValues(v,locale,source));
 if(value&&typeof value==='object')return 'project'in value?projectValue(value,locale,source):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,projectValues(v,locale,source)]));
 return value;
}
/** @returns {any} */
export function projectView(entry){return {...entry,data:projectValues(entry.data,/^(en|nl)\//.exec(entry.id)?.[1]??'de')};}

/** A derived total opens its existing fact owner; no editable totalDrones property exists. */
export const projectFactPath=ref=>ref.field==='totalDrones'?[String(ref.project)]:[String(ref.project),String(ref.field)];
