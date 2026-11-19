// Eine einzige Liste der Anlass-Kategorien (src/content/occasions.json, Schema src/schemas/occasions.mjs, docs/anlaesse.md).
// Menü „Anlässe“, Footer, Startseiten-Karten, Referenzfilter, Fallstudien-CTA, Anfrageformular und Formular-Function
// leiten Schlüssel, Bezeichnung und Ziel von hier ab (Marc, 19.11.2026). Keine zweite Liste, keine Labels im Code.
// Bewusst ohne Zod-Import: die Datei läuft auch im Browser (contact.ts) und in der Cloudflare-Function.
import data from './occasions.json' with {type:'json'};
import {localizedHref} from '../i18n/routing.mjs';
export const OCCASIONS=data.occasions;
export const OCCASION_IDS=OCCASIONS.map(o=>o.id);
/** Formular und Referenzen nutzen dieselben Schlüssel, „Sonstiges“ eingeschlossen (Marc, 19.11.2026). */
export const FORM_OCCASION_IDS=OCCASION_IDS;
const byId=new Map(OCCASIONS.map(o=>[o.id,o]));
export function occasion(id){const o=byId.get(id);if(!o)throw Error('Unbekannter Anlass: '+id);return o;}
const pick=(text,locale)=>text[locale]??text.de;
export const occasionLabel=(id,locale='de')=>pick(occasion(id).label,locale);
/** Menü und Footer: abweichende Kurzbezeichnung, sonst die Anlass-Bezeichnung. */
export const menuLabel=(id,locale='de')=>pick(occasion(id).menuLabel??occasion(id).label,locale);
/** Anfrageformular mit vorausgewähltem Anlass; die Locale setzt localizedHref/localHref beim Ausgeben. */
export const inquiryPath=(id,target='/kontakt/')=>{occasion(id);const [path,hash]=target.split('#');return `${path}?anlass=${encodeURIComponent(id)}${hash?'#'+hash:''}`;};
/** Wohin ein Anlass führt: seine Seite, sonst sein Linkziel, sonst die Anfrage mit diesem Anlass. */
export const occasionHref=id=>occasion(id).page??occasion(id).href??inquiryPath(id);
/** Menü: jeder Anlass mit eigener Seite erscheint automatisch, in der Reihenfolge der Liste. */
export const menuOccasions=(locale='de')=>OCCASIONS.flatMap(o=>o.page?[{id:o.id,label:menuLabel(o.id,locale),href:o.page}]:[]);
/** Footer: nur ganze Seiten (kein #Abschnitt), alphabetisch wie bisher. */
export const footerOccasions=(locale='de')=>menuOccasions(locale).filter(o=>!o.href.includes('#')).sort((a,b)=>a.label.localeCompare(b.label,locale));
export const formOccasions=(locale='de')=>FORM_OCCASION_IDS.map(id=>[id,occasionLabel(id,locale)]);
/** Anlass einer Seite, die selbst eine Anlass-Seite ist (Seite ohne #Abschnitt), z. B. /en/drohnenshow-indoor/ → indoor. */
export function occasionForPath(pathname,locale='de'){
 return OCCASIONS.find(o=>o.page&&!o.page.includes('#')&&localizedHref(o.page,locale)===pathname)?.id;
}
/** Haupt- und weitere Anlässe einer Referenz; der erste ist der Hauptanlass. */
export const projectOccasions=data=>[data.occasion,...(data.moreOccasions??[])].filter(Boolean);
// Konfigurator-Abfolgen (show-configurator.js) sind eine andere Taxonomie (Motivfolgen), sie zeigen nur auf einen Anlass.
// Reihenfolge = Reihenfolge der Konfigurator-Anlässe (Moritz' Preistext 17.11.2026: Winter & Silvester zuerst)
export const CONFIGURATOR_FORM_MAP={silvester:'gemeinden',launch:'unternehmen',jubilaeum:'sonstiges',festival:'konzerte-festivals',hochzeit:'privat',kultur:'konzerte-festivals'};
export function formOccasionFor(id){const value=CONFIGURATOR_FORM_MAP[id];if(!value||!FORM_OCCASION_IDS.includes(value))throw Error('Unbekannter Konfiguratoranlass: '+id);return value;}
