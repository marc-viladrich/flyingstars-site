// Wächter: eine zentrale Anlass-Liste (src/content/occasions.json) für Menü, Footer, Startseiten-Karten, Referenzfilter,
// Fallstudien-CTA, Anfrageformular und Formular-Function (Marc, 19.11.2026: „Wir sollten überall die gleichen Kategorien
// wählen … centrally defined“). Jede Instanz wird aus den echten Dateien aufgezählt, nicht aus einer Hand-Liste.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parse} from 'yaml';
import data from '../src/content/occasions.json' with {type:'json'};
import {occasionsSchema} from '../src/schemas/occasions.mjs';
import {OCCASIONS,OCCASION_IDS,FORM_OCCASION_IDS,CONFIGURATOR_FORM_MAP,formOccasionFor,formOccasions,menuOccasions,footerOccasions,menuLabel,occasionHref,occasionLabel,occasionForPath,inquiryPath,projectOccasions} from '../src/content/occasions.mjs';
import {parseInquiry} from '../src/content/inquiry.mjs';
import {getConfiguratorContent} from '../src/content/show-configurator.js';
import {LOCALES,localizedHref} from '../src/i18n/routing.mjs';
import {onRequestPost} from '../functions/api/contact.ts';
const read=file=>readFileSync(file,'utf8');
const pick=(o,locale)=>(o.menuLabel??o.label)[locale];
const walk=dir=>readdirSync(dir,{recursive:true}).map(f=>`${dir}/${f}`);
const front=file=>{const raw=read(file).split(/^---$/m)[1];return raw.trim().startsWith('{')?JSON.parse(raw):parse(raw);};
const projects=walk('src/content/projects').filter(f=>f.endsWith('.md')).map(file=>({file,data:front(file)}));

test('Die zentrale Liste ist gültig: eindeutige Schlüssel, alle drei Sprachen, „Sonstiges“ ist ein echter Anlass',()=>{
 occasionsSchema.parse(data);
 assert.deepEqual(OCCASION_IDS,['unternehmen','agenturen','gemeinden','konzerte-festivals','privat','indoor','sonstiges']);
 assert.deepEqual(FORM_OCCASION_IDS,OCCASION_IDS,'Formular und Referenzen haben dieselben Schlüssel');
 for(const id of FORM_OCCASION_IDS)for(const locale of LOCALES)assert.ok(occasionLabel(id,locale).trim(),`${id}:${locale}`);
 assert.throws(()=>occasionLabel('firma'),/Unbekannter Anlass/);
});

test('Jede Referenz hat genau einen gültigen Hauptanlass, weitere Anlässe nur zusätzlich, in DE/EN/NL gleich',()=>{
 assert.ok(projects.length>=60,'Projektdateien nicht gefunden');
 // Marc, 19.11.2026: Protest-/Aktivismus-Shows unter Sonstiges, AirPower24 unter Unternehmen
 for(const [slug,want] of [['boellerciao','sonstiges'],['airpower24','unternehmen'],['movie-park-germany','unternehmen']])for(const {file,data} of projects.filter(p=>p.file.endsWith('/'+slug+'.md')))assert.equal(data.occasion,want,file);
 const bySlug=new Map();
 for(const {file,data} of projects){
  assert.ok(OCCASION_IDS.includes(data.occasion),`${file}: Hauptanlass fehlt oder ungültig (${data.occasion})`);
  const more=data.moreOccasions??[];
  assert.ok(more.every(id=>OCCASION_IDS.includes(id)),`${file}: weiterer Anlass ungültig`);
  assert.equal(new Set(projectOccasions(data)).size,projectOccasions(data).length,`${file}: Anlass doppelt`);
  const slug=file.replace(/^src\/content\/projects\/(?:(?:en|nl)\/)?/,'');
  const seen=bySlug.get(slug);if(seen)assert.deepEqual(projectOccasions(data),seen,`${file}: Anlass weicht von der deutschen Fassung ab`);else bySlug.set(slug,projectOccasions(data));
 }
});

test('Startseiten-Karten: jede Kategorie genau einmal, Kicker und Ziel nur aus der zentralen Liste',()=>{
 for(const locale of LOCALES){
  const page=parse(read(`src/content/pages/${locale==='de'?'':locale+'/'}index.yaml`));
  const cards=page.sections.find(s=>s.type==='occasions').cards;
  // „Sonstiges“ ist der Sammelanlass für Referenzen und Formular, keine Startseiten-Karte (Marc, 19.11.2026)
  assert.deepEqual([...cards.map(c=>c.occasion)].sort(),OCCASION_IDS.filter(id=>id!=='sonstiges').sort(),`${locale}: Karten ≠ Anlässe`);
  for(const card of cards){assert.equal(card.category,undefined,`${locale}: eigener Kicker neben Anlass ${card.occasion}`);assert.equal(card.cta.href,undefined,`${locale}: eigenes Ziel neben Anlass ${card.occasion}`);}
 }
 const source=read('src/components/sections/Occasions.astro');
 assert.match(source,/occasionLabel\(card\.occasion/);assert.match(source,/occasionHref\(card\.occasion/);
});

test('Menü und Footer zeigen die Anlässe mit eigener Seite, in Reihenfolge und Bezeichnung der zentralen Liste',async()=>{
 const nav=JSON.parse(read('src/content/navigation.json')).nav;
 assert.deepEqual(nav.filter(item=>item.occasions).map(item=>item.label),['base.occasions']);
 assert.ok(nav.every(item=>!(item.occasions&&item.children)),'zweite Anlass-Liste im Menü');
 for(const locale of LOCALES){
  // Jeder Anlass mit eigener Seite erscheint automatisch; menuLabel hat Vorrang vor der Anlass-Bezeichnung
  const menu=menuOccasions(locale);
  assert.deepEqual(menu.map(o=>o.id),OCCASIONS.filter(o=>o.page).map(o=>o.id));
  assert.ok(menu.every(o=>o.label===pick(OCCASIONS.find(x=>x.id===o.id),locale)&&o.href===occasionHref(o.id)));
  assert.deepEqual(footerOccasions(locale).map(o=>o.href).sort(),menu.filter(o=>!o.href.includes('#')).map(o=>o.href).sort());
 }
 // Marc, 19.11.2026: im Menü wieder die alten Bezeichnungen und Einträge
 assert.deepEqual(menuOccasions('de').map(o=>o.label),['Marken & Werbung','Agenturen','Hochzeit','Indoor']);
 assert.deepEqual(menuOccasions('en').map(o=>o.label),['Brands & advertising','Agencies','Wedding','Indoor']);
 assert.deepEqual(footerOccasions('de').map(o=>o.label),['Hochzeit','Indoor','Marken & Werbung']);
 assert.equal(menuLabel('gemeinden'),occasionLabel('gemeinden'));
 // Bekommt ein Anlass eine Seite, steht er ohne weitere Änderung im Menü
 const saved=OCCASIONS.find(o=>o.id==='gemeinden');saved.page='/drohnenshow-gemeinden/';
 try{assert.ok(menuOccasions('de').some(o=>o.id==='gemeinden'&&o.href==='/drohnenshow-gemeinden/'));}finally{delete saved.page;}
 assert.match(read('src/site.config.ts'),/item\.occasions\)\{\s*item\.children=menuOccasions\(locale\)/);
 assert.match(read('src/layouts/Base.astro'),/const occasionPages = footerOccasions\(locale\);/);
});

test('Anfrageformular und Function nutzen dieselben Schlüssel; alte Schlüssel werden abgewiesen',async()=>{
 for(const locale of LOCALES)assert.deepEqual(formOccasions(locale),FORM_OCCASION_IDS.map(id=>[id,occasionLabel(id,locale)]));
 assert.match(read('src/components/sections/ContactForm.astro'),/formOccasions\(forPath\(Astro\.url\.pathname\)\.locale\)/);
 const post=async(anlass,locale='de')=>{const form=new FormData();for(const [k,v] of Object.entries({name:'Test',email:'test@example.test',anlass,locale}))form.set(k,v);return onRequestPost({request:new Request('https://example.test/api/contact',{method:'POST',headers:{accept:'application/json'},body:form}),env:{}});};
 for(const locale of LOCALES)for(const id of FORM_OCCASION_IDS){const r=await post(id,locale);assert.equal(r.status,200,`${locale}:${id}`);assert.equal((await r.json()).state,'not-configured');}
 for(const old of ['firma','stadt','agentur','kultur'])assert.equal((await post(old)).status,400,old);
 for(const id of FORM_OCCASION_IDS)assert.equal(parseInquiry(new URLSearchParams({anlass:id})).anlass,id);
 assert.equal(parseInquiry(new URLSearchParams({anlass:'firma'})).anlass,undefined);
});

test('Keine zweite Liste: alte Kategorie-Schlüssel und Labels kommen im Code nicht mehr vor',()=>{
 const files=['src/components','src/layouts','src/scripts','src/pages','functions'].flatMap(walk).filter(f=>/\.(astro|ts|js|mjs)$/.test(f));
 const forbidden=/REFERENCE_OCCASIONS|REFERENCE_FORM_MAP|contactform\.(corporateEvent|cityFestival|agency|weddingPrivate|other)|references\.(brands|cities|culture|indoor)\b|site\.(brandsAdvertising|agencies)\b|'(Firmenevent|Stadt & Festival|Marken & Unternehmen|Städte & Festivals|Kultur & Bühne|Hochzeit & Privat|Konzerte & Festivals|Gemeinden|Marken & Werbung)'/;
 for(const file of files)assert.doesNotMatch(read(file),forbidden,file);
 const ui=JSON.parse(read('src/i18n/ui.json'));
 for(const key of Object.keys(ui))assert.doesNotMatch(key,/^(contactform\.(corporateEvent|cityFestival|agency|weddingPrivate|other)|references\.(brands|cities|culture|indoor)|site\.(brandsAdvertising|agencies))$/,key);
});

test('Jeder ?anlass=… in Inhalten ist ein gültiger Schlüssel (Konfigurator-Links: Konfigurator-Abfolge)',()=>{
 const configurator=Object.keys(CONFIGURATOR_FORM_MAP);
 const files=[...walk('src/content/pages'),...walk('src/content/projects'),...walk('src/content/posts'),'src/content/navigation.json'].filter(f=>/\.(ya?ml|md|json)$/.test(f));
 let n=0;
 for(const file of files)for(const m of read(file).matchAll(/(\/[\w-]*\/)?\?(?:[^"\s]*&)?anlass=([\w-]+)/g)){n++;
  const valid=m[1]==='/drohnenshow-preise/'?configurator:FORM_OCCASION_IDS;assert.ok(valid.includes(m[2]),`${file}: anlass=${m[2]} (${m[1]})`);}
 assert.ok(n>=4,'keine Anlass-Links gefunden');
});

test('Fallstudien-CTA und Anlass-Seiten wählen den Anlass im Formular vor',()=>{
 assert.match(read('src/components/projects/CaseStudy.astro'),/href: inquiryPath\(project\.data\.occasion, '\/#anfrage'\)/);
 const showcases=projects.filter(p=>p.data.showcase);
 assert.ok(showcases.length>=21,'Fallstudien nicht gefunden');
 for(const {file,data} of showcases)for(const locale of LOCALES){
  const href=localizedHref(inquiryPath(data.occasion,'/#anfrage'),locale),url=new URL(href,'https://example.test');
  assert.equal(url.hash,'#anfrage');assert.equal(parseInquiry(url.searchParams).anlass,data.occasion,`${file}:${locale}`);
 }
 // Seite → Anlass, nur für Ziele ohne #Abschnitt; die Werbeseite gehört Unternehmen, nicht Agenturen
 for(const locale of LOCALES){
  assert.equal(occasionForPath(localizedHref('/drohnenshow-werbung/',locale),locale),'unternehmen');
  assert.equal(occasionForPath(localizedHref('/drohnenshow-hochzeit/',locale),locale),'privat');
  assert.equal(occasionForPath(localizedHref('/drohnenshow-indoor/',locale),locale),'indoor');
  assert.equal(occasionForPath(localizedHref('/kontakt/',locale),locale),undefined);
 }
 assert.match(read('src/scripts/contact.ts'),/if \(occasionInput\) occasionInput\.checked = true;/,'Adresse muss die Seitenvorauswahl schlagen');
});

test('Konfigurator-Abfolgen zeigen auf einen Formular-Anlass, in allen Sprachen',()=>{
 for(const target of Object.values(CONFIGURATOR_FORM_MAP))assert.ok(FORM_OCCASION_IDS.includes(target),target);
 for(const locale of LOCALES){const occasions=getConfiguratorContent(locale).OCCASIONS;assert.deepEqual(occasions.map(o=>o.id),Object.keys(CONFIGURATOR_FORM_MAP));for(const o of occasions)assert.equal(o.anlass,formOccasionFor(o.id));}
 assert.throws(()=>formOccasionFor('unbekannt'),/Unbekannter Konfiguratoranlass/);
});
