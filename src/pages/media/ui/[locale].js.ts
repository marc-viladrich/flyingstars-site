import { LOCALES } from '../../../i18n/routing.mjs';
import { messagesForLocale } from '../../../i18n/ui.mjs';
export const prerender = true;
export function getStaticPaths() { return LOCALES.map(locale => ({ params: { locale } })); }
export function GET({ params }: { params: { locale: string } }) {
  return new Response(`export default ${JSON.stringify(messagesForLocale(params.locale))};`, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
}
