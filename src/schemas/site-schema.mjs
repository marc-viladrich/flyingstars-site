import {editable} from './afe-meta.mjs';
import {z} from 'astro/zod';
import {siteUiSchema} from './ui-schema.mjs';
import {editorialHref} from './page-schema.mjs';
// Website-wide singleton records (src/content/site/<name>.json): one owner per contact value and form text.
// Every component that shows a contact value or a form text reads it from here.
const text=label=>z.string().min(1).describe(label).meta(editable({translatable:true}));
const link=(pattern,message,label)=>z.string().regex(pattern,message).describe(label).meta(editable({format:'url'}));
const channel=(label,href)=>z.object({label:text('Bezeichnung').meta(editable({"translatable":true})),value:text('Angezeigter Text').meta(editable({"translatable":true})),href}).describe(label);
const addressBlock=label=>z.object({label:text('Überschrift').meta(editable({"translatable":true})),name:text('Name').meta(editable({translatable:false})),street:text('Straße und Ort').meta(editable({translatable:false}))}).describe(label);
export const siteContactSchema=z.object({
 email:channel('E-Mail',link(/^mailto:[^\s]+$/i,'Der E-Mail-Link beginnt mit mailto:.','E-Mail-Link (mailto:)')).meta(editable({"translatable":true})),
 phone:channel('Telefon',link(/^tel:\+?[0-9]+$/,'Der Telefon-Link beginnt mit tel: und enthält nur Ziffern.','Telefon-Link (tel:)')).meta(editable({"translatable":true})),
 whatsapp:channel('WhatsApp',link(/^https:\/\/\S+$/i,'Nur https://-Links sind erlaubt.','WhatsApp-Link (https://)')).meta(editable({"translatable":true})),
 videoCall:channel('Videocall',link(/^https:\/\/\S+$/i,'Nur https://-Links sind erlaubt.','Buchungslink (https://)')).meta(editable({"translatable":true})),
 address:z.object({visit:addressBlock('Besuchsadresse'),post:addressBlock('Postanschrift')}).optional().describe('Adresse'),
}).describe('Kontaktdaten').meta(editable({"collection":{"label":"Kontaktdaten","title":[],"icon":"mail","group":"Website-Daten","operations":["update"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership"]}}));
// Technical occasion values are validated by functions/api/contact.ts; only their labels are editable.
export const occasionValues=['firma','stadt','agentur','privat','indoor','sonstiges'];
const occasionLabels={firma:'Firmenevent',stadt:'Stadt & Festival',agentur:'Agentur',privat:'Hochzeit & Privat',indoor:'Indoor',sonstiges:'Sonstiges'};
export const siteInquirySchema=z.object({
 kicker:text('Dachzeile').meta(editable({"translatable":true})),
 progress:z.object({step:text('Schrittanzeige ({current} und {total} werden ersetzt)').meta(editable({"translatable":true})),duration:text('Zeitangabe').meta(editable({"translatable":true}))}).describe('Fortschritt'),
 steps:z.object({show:text('Schritt 1 (für Screenreader)').meta(editable({"translatable":true})),contact:text('Schritt 2 (für Screenreader)').meta(editable({"translatable":true}))}).describe('Schritt-Überschriften'),
 occasion:z.object({label:text('Beschriftung').meta(editable({"translatable":true})),error:text('Fehlermeldung ohne Auswahl').meta(editable({"translatable":true}))}).describe('Anlass'),
 occasions:z.object(Object.fromEntries(occasionValues.map(value=>[value,text(`Anlass „${occasionLabels[value]}“`)]))).describe('Anlass-Auswahl'),
 date:z.object({label:text('Beschriftung').meta(editable({"translatable":true}))}).describe('Datum'),
 place:z.object({label:text('Beschriftung').meta(editable({"translatable":true})),placeholder:text('Platzhalter').meta(editable({"translatable":true}))}).describe('Ort'),
 package:z.object({label:text('Beschriftung').meta(editable({"translatable":true})),unknown:text('Option ohne Paket').meta(editable({"translatable":true})),suffix:text('Einheit hinter der Drohnenzahl').meta(editable({"translatable":true}))}).describe('Paket'),
 hint:text('Hinweis unter Schritt 1').meta(editable({"translatable":true})),
 fullName:z.object({label:text('Beschriftung').meta(editable({"translatable":true})),error:text('Fehlermeldung wenn leer').meta(editable({"translatable":true}))}).describe('Name-Feld'),
 email:z.object({label:text('Beschriftung').meta(editable({"translatable":true})),error:text('Fehlermeldung wenn leer').meta(editable({"translatable":true})),invalid:text('Fehlermeldung bei ungültiger Adresse').meta(editable({"translatable":true}))}).describe('E-Mail-Feld'),
 phone:z.object({label:text('Beschriftung').meta(editable({"translatable":true}))}).describe('Telefon-Feld'),
 message:z.object({label:text('Beschriftung').meta(editable({"translatable":true})),placeholder:text('Platzhalter').meta(editable({"translatable":true})),skyText:text('Vorbelegung aus dem Preisrechner ({text} wird ersetzt)').meta(editable({"translatable":true}))}).describe('Nachricht'),
 privacy:z.object({before:text('Text vor dem Link').meta(editable({"translatable":true})),link:text('Linktext').meta(editable({"translatable":true})),after:z.string().describe('Text nach dem Link').meta(editable({"translatable":true}))}).describe('Datenschutzhinweis'),
 buttons:z.object({next:text('Weiter').meta(editable({"translatable":true})),back:text('Zurück').meta(editable({"translatable":true})),submit:text('Absenden').meta(editable({"translatable":true}))}).describe('Buttons'),
 messages:z.object({
  required:text('Fehlermeldung Pflichtfeld').meta(editable({"translatable":true})),
  spam:text('Fehlermeldung bei abgelehnter Spam-Prüfung').meta(editable({"translatable":true})),
  sending:text('Button während des Versands').meta(editable({"translatable":true})),
  success:text('Erfolgsmeldung').meta(editable({"translatable":true})),
  notConfigured:text('Meldung wenn der Versand nicht eingerichtet ist ({email} wird ersetzt)').meta(editable({"translatable":true})),
  sendFailed:text('Fehler vom Server ohne Details').meta(editable({"translatable":true})),
  failed:text('Fehler ohne Verbindung').meta(editable({"translatable":true})),
  retry:text('Zusatz nach jedem Fehler ({email} wird ersetzt)').meta(editable({"translatable":true})),
 }).describe('Meldungen'),
}).describe('Anfrageformular').meta(editable({"collection":{"label":"Anfrageformular","title":[],"icon":"mail","group":"Website-Daten","operations":["update"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership"]}}));
const navigationLink=z.object({label:text('Linktext').meta(editable({"translatable":true})),href:z.string().min(1).regex(editorialHref,'Nur Web-, E-Mail-, Telefon- oder interne Links sind erlaubt.').describe('Linkziel').meta(editable({"format":"url"}))}).describe('Navigationslink');
export const siteNavigationSchema=z.object({
 header:z.array(navigationLink).describe('Hauptnavigation').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
 cta:navigationLink.describe('Anfrage-Button im Header'),
 mobileExtras:z.array(navigationLink).describe('Zusätzliche Links im mobilen Menü').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
 footer:z.object({
  headings:z.object({contact:text('Überschrift Kontakt').meta(editable({"translatable":true})),pages:text('Überschrift Seiten').meta(editable({"translatable":true})),social:text('Überschrift soziale Netzwerke').meta(editable({"translatable":true}))}).describe('Footer-Überschriften'),
  pages:z.array(navigationLink).describe('Seiten im Footer').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
  social:z.array(navigationLink).describe('Soziale Netzwerke').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
  legal:z.array(navigationLink).describe('Rechtliche Seiten').meta(editable({"array":{"role":"list","reorderable":true,"insertable":true,"removable":true,"itemLabel":["label"]},"widget":"flyingstars/compact-table"})),
 }).describe('Footer'),
}).describe('Navigation und Footer').meta(editable({"collection":{"label":"Navigation und Footer","title":[],"icon":"mail","group":"Website-Daten","operations":["update"],"placement":"frontend","i18n":{"mode":"overlay"},"policies":["flyingstars/media-ownership"]}}));
export const siteSchemas={contact:siteContactSchema,inquiry:siteInquirySchema,navigation:siteNavigationSchema,ui:siteUiSchema};
