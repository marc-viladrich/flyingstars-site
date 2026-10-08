import { videos } from '../../src/lib/videos.ts';

export async function onRequestGet({ request }: { request: Request }): Promise<Response> {
  const key = new URL(request.url).searchParams.get('asset') ?? '';
  if (!Object.hasOwn(videos, key)) return new Response('Nicht gefunden', { status: 404 });
  const headers = new Headers();
  const range = request.headers.get('range');
  if (range) headers.set('range', range);
  let upstream: Response;
  try { upstream = await fetch(videos[key], { headers, redirect: 'manual' }); }
  catch { return new Response('Video derzeit nicht verfügbar', { status: 502 }); }
  if (![200, 206, 416].includes(upstream.status)) return new Response('Video derzeit nicht verfügbar', { status: 502 });
  const result = new Headers({ 'content-type': 'video/mp4', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' });
  for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag']) {
    const value = upstream.headers.get(name);
    if (value) result.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: result });
}
