import {z} from 'astro/zod';
import {editorialHref} from './page-schema.mjs';
// Website-wide singleton records (src/content/site/<name>.json): one owner per contact value and form text.
// Every component that shows a contact value or a form text reads it from here.
const text=label=>z.string().min(1).describe(label);
const link=(pattern,message,label)=>z.string().regex(pattern,message).describe(label);
const channel=(label,href)=>z.object({label:text('Bezeichnung'),value:text('Angezeigter Text'),href}).describe(label);
const addressBlock=label=>z.object({label:text('Überschrift'),name:text('Name'),street:text('Straße und Ort')}).describe(label);
export const siteContactSchema=z.object({
 email:channel('E-Mail',link(/^mailto:[^\s]+$/i,'Der E-Mail-Link beginnt mit mailto:.','E-Mail-Link (mailto:)')),
 phone:channel('Telefon',link(/^tel:\+?[0-9]+$/,'Der Telefon-Link beginnt mit tel: und enthält nur Ziffern.','Telefon-Link (tel:)')),
 whatsapp:channel('WhatsApp',link(/^https:\/\/\S+$/i,'Nur https://-Links sind erlaubt.','WhatsApp-Link (https://)')),
 videoCall:channel('Videocall',link(/^https:\/\/\S+$/i,'Nur https://-Links sind erlaubt.','Buchungslink (https://)')),
 address:z.object({visit:addressBlock('Besuchsadresse'),post:addressBlock('Postanschrift')}).optional().describe('Adresse'),
}).describe('Kontaktdaten');
// Technical occasion values are validated by functions/api/contact.ts; only their labels are editable.
export const occasionValues=['firma','stadt','agentur','privat','indoor','sonstiges'];
const occasionLabels={firma:'Firmenevent',stadt:'Stadt & Festival',agentur:'Agentur',privat:'Hochzeit & Privat',indoor:'Indoor',sonstiges:'Sonstiges'};
export const siteInquirySchema=z.object({
 kicker:text('Dachzeile'),
 progress:z.object({step:text('Schrittanzeige ({current} und {total} werden ersetzt)'),duration:text('Zeitangabe')}).describe('Fortschritt'),
 steps:z.object({show:text('Schritt 1 (für Screenreader)'),contact:text('Schritt 2 (für Screenreader)')}).describe('Schritt-Überschriften'),
 occasion:z.object({label:text('Beschriftung'),error:text('Fehlermeldung ohne Auswahl')}).describe('Anlass'),
 occasions:z.object(Object.fromEntries(occasionValues.map(value=>[value,text(`Anlass „${occasionLabels[value]}“`)]))).describe('Anlass-Auswahl'),
 date:z.object({label:text('Beschriftung')}).describe('Datum'),
 place:z.object({label:text('Beschriftung'),placeholder:text('Platzhalter')}).describe('Ort'),
 package:z.object({label:text('Beschriftung'),unknown:text('Option ohne Paket'),suffix:text('Einheit hinter der Drohnenzahl')}).describe('Paket'),
 hint:text('Hinweis unter Schritt 1'),
 fullName:z.object({label:text('Beschriftung'),error:text('Fehlermeldung wenn leer')}).describe('Name-Feld'),
 email:z.object({label:text('Beschriftung'),error:text('Fehlermeldung wenn leer'),invalid:text('Fehlermeldung bei ungültiger Adresse')}).describe('E-Mail-Feld'),
 phone:z.object({label:text('Beschriftung')}).describe('Telefon-Feld'),
 message:z.object({label:text('Beschriftung'),placeholder:text('Platzhalter'),skyText:text('Vorbelegung aus dem Preisrechner ({text} wird ersetzt)')}).describe('Nachricht'),
 privacy:z.object({before:text('Text vor dem Link'),link:text('Linktext'),after:z.string().describe('Text nach dem Link')}).describe('Datenschutzhinweis'),
 buttons:z.object({next:text('Weiter'),back:text('Zurück'),submit:text('Absenden')}).describe('Buttons'),
 messages:z.object({
  required:text('Fehlermeldung Pflichtfeld'),
  sending:text('Button während des Versands'),
  success:text('Erfolgsmeldung'),
  notConfigured:text('Meldung wenn der Versand nicht eingerichtet ist ({email} wird ersetzt)'),
  sendFailed:text('Fehler vom Server ohne Details'),
  failed:text('Fehler ohne Verbindung'),
  retry:text('Zusatz nach jedem Fehler ({email} wird ersetzt)'),
 }).describe('Meldungen'),
}).describe('Anfrageformular');
const navigationLink=z.object({label:text('Linktext'),href:z.string().min(1).regex(editorialHref,'Nur Web-, E-Mail-, Telefon- oder interne Links sind erlaubt.').describe('Linkziel')}).describe('Navigationslink');
export const siteNavigationSchema=z.object({
 header:z.array(navigationLink).describe('Hauptnavigation'),
 cta:navigationLink.describe('Anfrage-Button im Header'),
 mobileExtras:z.array(navigationLink).describe('Zusätzliche Links im mobilen Menü'),
 footer:z.object({
  headings:z.object({contact:text('Überschrift Kontakt'),pages:text('Überschrift Seiten'),social:text('Überschrift soziale Netzwerke')}).describe('Footer-Überschriften'),
  pages:z.array(navigationLink).describe('Seiten im Footer'),
  social:z.array(navigationLink).describe('Soziale Netzwerke'),
  legal:z.array(navigationLink).describe('Rechtliche Seiten'),
 }).describe('Footer'),
}).describe('Navigation und Footer');
export const siteSchemas={contact:siteContactSchema,inquiry:siteInquirySchema,navigation:siteNavigationSchema};
