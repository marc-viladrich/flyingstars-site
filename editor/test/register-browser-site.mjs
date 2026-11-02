// Node tests of the editor shell (astro-frontend-editor/web/*) need the site's browser registration first;
// in the editor it is served at /browser-site.mjs. Import this module before any shell module.
import definitions from '../browser-site.mjs';
globalThis.afeBrowserSite=definitions;
