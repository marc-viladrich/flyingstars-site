import type { APIRoute } from 'astro';
import { robotsText } from '../lib/robots.mjs';

export const GET: APIRoute = ({ site }) => new Response(
  robotsText(site, process.env.FLYINGSTARS_EDITOR === '1'),
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
