import type { APIRoute } from 'astro';
import { bundledImages, readBundledImage } from '../../../lib/bundled-media.mjs';

export const getStaticPaths = async () => (await bundledImages()).map(name => ({ params: { name } }));

export const GET: APIRoute = ({ params }) => readBundledImage(params.name!);
