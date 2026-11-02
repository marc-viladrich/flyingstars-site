// Seitenweite Nachbearbeitung des ausgelieferten HTML. Läuft beim statischen Build für jede Seite und im Dev-Server je Aufruf.
import { defineMiddleware } from 'astro:middleware';
import { noOrphans } from './lib/no-orphans';

export const onRequest = defineMiddleware(async (_context, next) => {
  const res = await next();
  if (!res.headers.get('content-type')?.includes('text/html')) return res;
  const html = await res.text();
  return new Response(noOrphans(html), { status: res.status, statusText: res.statusText, headers: res.headers });
});
