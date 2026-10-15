// "This page outside the editor": one resolver for the editor menu, the publish dialog and the preview bar.
// Languages are real routes (/en/…, /nl/…); German has no prefix. The editor keeps the German route of a
// page and the language separately, so every address is built here from both.
export const previewPrefix = "/vorschau";
const localePrefix = /^\/(en|nl)(?=\/|$)/;

export function splitLocale(pathname) {
  const match = localePrefix.exec(pathname);
  return match ? { locale: match[1], path: pathname.slice(match[0].length) || "/" } : { locale: "de", path: pathname };
}
export const localizedPath = (path, locale) => (locale === "de" ? path : "/" + locale + (path.startsWith("/") ? path : "/" + path));

// Live means: what is saved is also what the public site serves. Per page this cannot be decided (packages,
// media, translations and navigation render into many pages), so the whole saved draft is compared.
export const savedIsLive = (publication) => !!publication?.draftHead && publication.draftHead === publication.activePublishedHead;

export const liveURL = (route, locale, origin) => new URL(localizedPath(route, locale), origin).href;
export const previewURL = (route, locale) => previewPrefix + localizedPath(route, locale);

// publication: { draftHead, activePublishedHead, url (public origin) } from /editor/api/review.
// Without it (review failed) the preview is the safe answer: it always shows what is saved, and says so.
export function frontendTarget({ route, locale = "de", publication }) {
  const live = publication?.url ? liveURL(route, locale, publication.url) : null;
  return savedIsLive(publication) && live ? { kind: "live", url: live, live } : { kind: "preview", url: previewURL(route, locale), live };
}

// The site path a preview address shows (/vorschau/en/shows/ → /en/shows/), or null for anything else.
export function previewSitePath(pathname) {
  if (pathname === previewPrefix || pathname === previewPrefix + "/") return "/";
  return pathname.startsWith(previewPrefix + "/") ? pathname.slice(previewPrefix.length) : null;
}
