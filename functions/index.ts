import { LOCALES, LOCALE_SWITCHED_COOKIE, localizedHref } from '../src/i18n/routing.mjs';

function preferredLocale(header: string) {
  const candidates = header.split(',').flatMap((entry, index) => {
    const [tag, ...params] = entry.trim().toLowerCase().split(';');
    const locale = tag.split('-')[0];
    const q = params.find(param => param.trim().startsWith('q='));
    const weight = q === undefined ? 1 : Number(q.trim().slice(2));
    return LOCALES.includes(locale) && weight > 0 && weight <= 1 ? [{ locale, weight, index }] : [];
  });
  candidates.sort((a, b) => b.weight - a.weight || a.index - b.index);
  return candidates[0]?.locale ?? 'de';
}

export function onRequestGet({ request, next }: { request: Request; next: () => Promise<Response> }) {
  const url = new URL(request.url);
  const referrer = URL.parse(request.headers.get('referer') ?? '');
  const hasExplicitChoice = (request.headers.get('cookie') ?? '').split(';')
    .some(entry => entry.trim() === `${LOCALE_SWITCHED_COOKIE}=1`);
  // The explicit choice lives in tab-local sessionStorage. Let the original browser
  // path decide for site navigation and browsers that have used the language switch.
  if (url.pathname !== '/' || request.headers.get('sec-fetch-site') === 'same-origin' ||
      referrer?.origin === url.origin || hasExplicitChoice) return next();

  const locale = preferredLocale(request.headers.get('accept-language') ?? '');
  if (locale === 'de') return next();
  return new Response(null, {
    status: 302,
    headers: {
      Location: localizedHref('/', locale) + url.search,
      'Cache-Control': 'private, no-store',
      Vary: 'Accept-Language, Cookie, Referer, Sec-Fetch-Site',
    },
  });
}
