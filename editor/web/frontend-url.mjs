// "This page outside the editor": one resolver for the editor menu, the publish dialog and the preview bar.
// Languages are real routes (/en/…, /nl/…); German has no prefix. The editor keeps the German route of a
// page and the language separately, so every address is built here from both.
import {extensions} from './site-adapter.mjs';
const routing=extensions.require('routeTools');
export const previewPrefix=routing.previewPrefix;

// Language records (x-afe.collection.i18n mode "records") have their own route per language: the English page
// of a German record is its English counterpart's route, not a prefixed German one. The shell registers the
// current records; addresses of other pages follow the site's route tools.
let currentRecords=()=>[];
export const useLocaleRecords=records=>{currentRecords=records;};
const i18nOf=record=>record?.schema?.['x-afe']?.collection?.i18n;
const at=(value,path)=>path.reduce((item,key)=>item?.[key],value);
const collectionOf=id=>id.slice(0,id.indexOf('/'));
function languageRecords(route){
 const records=currentRecords(),page=records.find(record=>record.route===route&&i18nOf(record)?.mode==='records');
 if(!page)return null;
 const {key,locale}=i18nOf(page),group=records.filter(record=>collectionOf(record.id)===collectionOf(page.id)&&at(record.data,key)===at(page.data,key));
 return {page,locale:at(page.data,locale),of:language=>group.find(record=>at(record.data,locale)===language)};
}
/** The record-backed page has no version in `locale` (null when the page is no language record). */
export const missingLanguage=(route,locale)=>{const found=languageRecords(route);return found?!found.of(locale)?.route:null;};
export const splitLocale=pathname=>{const found=languageRecords(pathname);if(found&&found.locale!==routing.source){const source=found.of(routing.source);if(source?.route)return {locale:found.locale,path:source.route};}return routing.splitLocale(pathname);};
export const localizedPath=(path,locale)=>{if(locale!==routing.source){const route=languageRecords(path)?.of(locale)?.route;if(route)return route;}return routing.localizedPath(path,locale);};

// Compare the whole saved draft because shared records render into many pages.
export const savedIsLive = (publication) => !!publication?.draftHead && publication.draftHead === publication.activePublishedHead;

export const liveURL = (route, locale, origin) => new URL(localizedPath(route, locale), origin).href;
export const previewURL = (route, locale) => previewPrefix + localizedPath(route, locale);

// publication: { draftHead, activePublishedHead, url (public origin) } from /editor/api/review.
// Without it (review failed) the preview is the safe answer: it always shows what is saved, and says so.
export function frontendTarget({ route, locale = routing.source, publication }) {
  const live = publication?.url ? liveURL(route, locale, publication.url) : null;
  return savedIsLive(publication) && live ? { kind: "live", url: live, live } : { kind: "preview", url: previewURL(route, locale), live };
}

// The site path a preview address shows (/vorschau/en/shows/ → /en/shows/), or null for anything else.
export function previewSitePath(pathname) {
  if (pathname === previewPrefix || pathname === previewPrefix + "/") return "/";
  return pathname.startsWith(previewPrefix + "/") ? pathname.slice(previewPrefix.length) : null;
}
