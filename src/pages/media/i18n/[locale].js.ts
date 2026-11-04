import { LOCALES } from '../../../i18n/routing.mjs';
import { messagesForLocale } from '../../../i18n/ui.mjs';
export const prerender = true;
export function getStaticPaths() { return LOCALES.map(locale => ({ params: { locale } })); }
export function GET({ params }: { params: { locale: string } }) {
  // Klassisches Skript statt ES-Modul (Runde 23): Base.astro lädt es mit defer vor allen Modul-Skripten, ui.mjs liest das
  // Wörterbuch synchron. Ein ES-Modul mit Top-Level-await brach in Safari bis 26.6 parallele Importe (WebKit-Bug 242740).
  return new Response(`globalThis.__FS_UI__=Object.freeze(${JSON.stringify(messagesForLocale(params.locale))});`, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
}
