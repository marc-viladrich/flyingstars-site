export const previewPrefix = "/vorschau";
const localePrefix = /^\/(en|nl)(?=\/|$)/;

export function splitLocale(pathname) {
  const match = localePrefix.exec(pathname);
  return match ? { locale: match[1], path: pathname.slice(match[0].length) || "/" } : { locale: "de", path: pathname };
}
export const localizedPath = (path, locale) => (locale === "de" ? path : "/" + locale + (path.startsWith("/") ? path : "/" + path));

export const routeTools={previewPrefix,splitLocale,localizedPath,source:'de'};
