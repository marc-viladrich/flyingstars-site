import {localeFromPath,sourcePath,localizedHref} from '../../../../src/i18n/routing.mjs';
export const previewPrefix = "/vorschau";
export const splitLocale=pathname=>({locale:localeFromPath(pathname),path:sourcePath(pathname)});
export const localizedPath=(path,locale)=>localizedHref(path.startsWith('/')?path:'/'+path,locale);
export const routeTools={previewPrefix,splitLocale,localizedPath,source:'de'};
