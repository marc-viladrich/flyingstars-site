import {inlinePlain} from '../../../../src/lib/inline-text.mjs';
const normalizedRoute=path=>{const clean=String(path||'/').split(/[?#]/,1)[0];return clean==='/'?'/':'/'+clean.replace(/^\/+|\/+$/g,'')+'/';};
export function navigationChoices(records){const choices=new Map([['/','Startseite'],['/drohnenshow-preise/','Preise & Pakete'],['/show-konfigurator/','Show-Konfigurator']]);for(const item of records){const path=item.route||(item.id.startsWith('page/')?(item.id==='page/index'?'/':'/'+item.id.slice(5)+'/'):null);if(path)choices.set(normalizedRoute(path),item.title);}return [...choices].map(([value,label])=>({value,label}));}

export function pageChoices(items){
  const groups = { "page/": "Seiten", "screen/": "Seiten", "project/": "Projekte", "post/": "Blog" };
  const seen = new Map();
  for (const choice of navigationChoices(items)) seen.set(choice.value, { ...choice, group: "Seiten" });
  for (const item of items) {
    const prefix = item.id.split("/")[0] + "/";
    if (!item.route || !groups[prefix]) continue;
    const value = normalizedRoute(item.route);
    const label = value === "/" ? "Startseite" : String(item.data?.title || item.title).split(" – ")[0];
    seen.set(value, { value, label, group: groups[prefix] });
  }
  if (seen.has("/")) seen.get("/").label = "Startseite";
  return [...seen.values()];
}
export const changeKinds = [
  { test: (id) => /^(page|screen)\//.test(id), title: "Seiten", icon: "file-text" },
  { test: (id) => /^(project|post)\//.test(id), title: "Projekte & Blog", icon: "newspaper" },
  { test: (id) => id.startsWith("faq/"), title: "Häufige Fragen", icon: "circle-help" },
  { test: (id) => id.startsWith("package/"), title: "Pakete & Preise", icon: "package" },
  { test: (id) => /^(client|team)\//.test(id), title: "Kunden & Team", icon: "users" },
  { test: (id) => id.startsWith("site/"), title: "Website-Daten (Kontakt, Formular, Navigation, Texte)", icon: "building-2" },
  { test: (id) => id.startsWith("media/"), title: "Bilder & Medien", icon: "image" },
];
export const translationKinds = [
  ["pages", "Seiten inkl. SEO-Titel und Beschreibung"],
  ["stories", "Projekte & Blog inkl. SEO"],
  ["faq", "Häufige Fragen"],
  ["packages", "Pakete & Preise"],
  ["people", "Kunden & Team"],
  ["site", "Website-Daten (Kontakt, Formular, Navigation, Texte)"],
];
export const translationKindOf = (id) =>
  /^(page|screen)\//.test(id) ? "pages" : /^(project|post)\//.test(id) ? "stories" : id.startsWith("faq/") ? "faq" : id.startsWith("package/") ? "packages" : /^(client|team)\//.test(id) ? "people" : id.startsWith("site/") ? "site" : null;


export const currentPage=(items,slug)=>items.find(r=>r.id==='page/'+slug)||items.find(r=>r.id==='screen/'+slug);
export const navigatorName=item=>item.route&&/^(page|screen)\//.test(item.id)?normalizedRoute(item.route)==='/'?'Startseite':String(inlinePlain(item.data?.title||item.title)).split(' – ')[0]:undefined;
export const canDelete=item=>!['page/','screen/','package/','site/'].some(p=>item.id.startsWith(p));
export const navigateCreated=prefix=>['page/','post/','project/'].includes(prefix);
export const creationForm=prefix=>({label:({'page/':'Titel der Seite','faq/':'Frage','post/':'Titel','project/':'Titel'})[prefix]||'Name',fields:prefix==='team/'?[{key:'role',label:'Rolle'}]:prefix==='client/'?[{key:'quote',label:'Kundenstimme (optional)',aria:'Kundenstimme',multiline:true},{key:'person',label:'Name der zitierten Person',aria:'Name der zitierenden Person'},{key:'role',label:'Rolle'}]:[]});
export function validateCreation({prefix,data,reference,record}){if(prefix==='client/'&&!data.testimonial&&reference&&reference.path.slice(0,-1).reduce((v,k)=>v?.[k],record(reference.id).data)?.type==='testimonials')throw Error('Für die Kundenstimmen bitte ein Zitat eingeben.');}
