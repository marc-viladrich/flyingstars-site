import type { APIRoute } from 'astro';
import { robotsText } from '../lib/robots.mjs';
import { editorBuild } from '../lib/editor-markers';

export const GET: APIRoute = ({ site }) => new Response(
  robotsText(site, editorBuild()),
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
