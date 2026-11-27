import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve('src/assets/wordpress');
const names = /^[a-f0-9]{64}\.(jpg|png|webp)$/;
const types = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export function bundledImageName(url) {
  const prefix = '/media/wordpress/';
  if (!url.startsWith(prefix)) return;
  const name = url.slice(prefix.length);
  if (!names.test(name)) throw new Error(`Ungültiger Pfad für mitgeliefertes Bild: ${url}`);
  return name;
}

export async function bundledImages() {
  return (await readdir(directory)).filter(name => names.test(name)).sort();
}

export async function readBundledImage(name) {
  if (!names.test(name)) throw new Error('Ungültiger Dateiname für mitgeliefertes Bild');
  const file = path.join(directory, name);
  const bytes = await readFile(file);
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': types[path.extname(name).slice(1)], 'Content-Length': String(bytes.length) },
  });
}
