// "This page outside the editor": one resolver for the editor menu, the publish dialog and the preview bar.
// Languages are real routes (/en/…, /nl/…); German has no prefix. The editor keeps the German route of a
// page and the language separately, so every address is built here from both.
import {extensions} from './site-adapter.mjs';
const routing=extensions.require('routeTools');
export const previewPrefix=routing.previewPrefix;
export const splitLocale=routing.splitLocale;
export const localizedPath=routing.localizedPath;

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
