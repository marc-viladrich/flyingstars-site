// Ein Showfoto aus public/media/galerie/manifest.json für die aktuelle Sprache: Quellen (AVIF/WebP), Maße, Alt-Text,
// Zeile Kunde · Ort · Drohnen und Link zur Referenzseite. Gemeinsam für Galerie (Gallery.astro) und Einzelbilder
// (ShowPhoto.astro), damit Alt-Texte, Zuschnitt-Regeln und Links an einer Stelle stehen.
import { getEntry } from 'astro:content';
import manifest from '../../../public/media/galerie/manifest.json';
import { GALLERY_TEXT, DRONES } from './layouts.mjs';
import { forPath } from '../../i18n/server';
import { contentRoute } from '../../i18n/public-routes.mjs';
type Entry = (typeof manifest.entries)[number];
const bySlug = new Map(manifest.entries.map((e) => [e.slug, e as Entry]));
export const ratio = (ar: string) => { const [a, b = '1'] = ar.split('/').map((x) => parseFloat(x)); return a / Number(b); };

export async function manifestPhoto(slug: string, path: string) {
  const { locale, localHref, formatLocale } = forPath(path);
  const e = bySlug.get(slug);
  if (!e) throw new Error(`Showfoto ${slug} fehlt im Manifest`);
  if (e.kind !== 'image') throw new Error(`Showfoto ${slug} ist kein Standbild`);
  const text = GALLERY_TEXT[slug];
  // hochskalierte 1600er bringen keine Details, nur Bytes: dann bleibt es bei 800
  const srcset = (format: string) => e.files.filter((f) => f.format === format && !(f.upscaled && f.width > 800)).map((f) => `/media/galerie/${f.file} ${f.width}w`).join(', ');
  const base = e.files.find((f) => f.format === 'webp' && /-800\./.test(f.file))!;
  const big = e.files.filter((f) => f.format === 'webp').sort((a, b) => b.width - a.width)[0];
  // Referenzseite nur, wenn das Projekt eine öffentliche Fallseite hat (showcase)
  let href: string | undefined;
  if (e.reference) {
    const id = e.reference.replace(/^src\/content\/projects\/|\.md$/g, '');
    const project = await getEntry('projects', id);
    const route = project && contentRoute('projects', id, project.data);
    if (route) href = localHref(route);
  }
  const name = text?.name?.[locale] ?? (e.client && e.client !== 'Privat' ? e.client : undefined);
  const place = text?.place?.[locale];
  const drones = e.drones ? `${e.drones.toLocaleString(formatLocale)} ${DRONES[locale as keyof typeof DRONES]}` : undefined;
  const caption = [name, place, drones].filter(Boolean).join(' · ');
  const alt = locale === 'de' ? e.alt : text?.alt?.[locale as 'en' | 'nl'] ?? e.alt;
  return { slug, href, caption, alt, avif: srcset('avif'), webp: srcset('webp'), src: `/media/galerie/${base.file}`, width: big.width, height: big.height };
}
