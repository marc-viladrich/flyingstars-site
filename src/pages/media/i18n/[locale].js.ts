import { LOCALES } from '../../../i18n/routing.mjs';
import { browserDictionaryScript } from '../../../i18n/browser-dictionary.mjs';

export function GET({ params }: { params: { locale: string } }) {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  return new Response(browserDictionaryScript(params.locale), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
}

// Im statischen Build entstehen die Wörterbücher erst nach dem Client-Build.
export function getStaticPaths() {
  return import.meta.env.DEV ? LOCALES.map(locale => ({ params: { locale } })) : [];
}
