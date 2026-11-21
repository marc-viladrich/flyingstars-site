// Einfarbige Logos (.png), beim Build aus public/brand/logos/ abgeleitet (Begründung: src/lib/mono-logo.mjs). Die Endung
// steht im Routennamen, damit trailingSlash 'always' die Datei nicht als Seite behandelt.
import type { APIRoute, GetStaticPaths } from 'astro';
import { monoLogoFiles, renderMonoLogo } from '../../../../lib/mono-logo.mjs';

export const getStaticPaths = (async () => (await monoLogoFiles()).filter((f) => f.endsWith('.png')).map((f) => ({ params: { name: f.slice(0, -4) } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const out = await renderMonoLogo(`${params.name}.png`);
  if (!out) return new Response(null, { status: 404 });
  return new Response(out.body, { headers: { 'Content-Type': out.type } });
};
