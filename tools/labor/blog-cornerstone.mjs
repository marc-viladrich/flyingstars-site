// Labor „Cornerstone-Artikel“ (Runde 18, 22.11.2026): rechnet die Bilder für zwei weitere Blogartikel im Format des
// Prototyps „Wie programmiert man eine Drohnenshow?“ (tools/labor/blog-artikel.mjs) vor. Nur für das Labor.
//
//   /labor/cornerstone/wie-funktioniert-eine-drohnenshow/
//   /labor/cornerstone/drohnen-als-alternative-zum-feuerwerk/
//
// Eigene FlyingStars-Fotos aus der Drive-Sichtung (Kundenordner 27-blog-bilder-2026-11-21/foto-auswahl/README.md, Nummer =
// Kontaktbogen-Nummer). Titelbild im Lichtraster nach dem Rezept aus Marcs Bildeffekt-Labor (./lichtraster.mjs), nur
// Nachtformationen (Marc: „nur, wenn es darin klar lesbar ist“); Bilder im Text als normale Fotos. Die Logo-Formation
// am Schluss kommt unverändert aus /media/labor/artikel/ (blog-artikel.mjs).
//
//   node tools/labor/blog-cornerstone.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPoints, gridSize, rasterSvg, DEFAULTS } from './lichtraster.mjs';

const OUT = new URL('../../public/media/labor/cornerstone/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const CACHE = join(tmpdir(), 'fs-blog-artikel-fotos'); // derselbe Zwischenspeicher wie blog-artikel.mjs
mkdirSync(CACHE, { recursive: true });

const PHOTOS = {
  '002': '15V-mPGjAMZdL0esWuJt2FpeKOvfX1AUp', // einzelne Showdrohne, bodennah, Gegenlicht (hochkant)
  '013': '1PdBmCV4cFQ88VocqMK51TegCL_k5C-J3', // Drohnen auf Startunterlagen, Pflaster
  '015': '1kjg_SZxocOtW0FUnq1F69Sf3FDeXTcme', // Startraster im Park
  '030': '1WQr3zoWXZXfXkGI1QvIyQyP0LIVpO0yq', // Schriftzug NIEHEIM
  '034': '1VgjG974Mh0dgrp9Ujfj3d5lHqQZOQ5uS', // Doppelherz über Nieheim
  '044': '1V2EWw2RJK6evpg8O23uUn58Nw7UtHj7N', // Peace-Zeichen über Nieheim
  '048': '1MWT6cpBUU0EWk8G1gk8FetTukdaSuGvG', // „seit 1826“, Jubiläum
  '052': '1XlSULaRKYqo3dwJOUwd7KoX4367mCv64', // rotes Markenzeichen, Jubiläum
  '055': '1PlmZVorzWy2shZrpsxd4t9k6zNzzbksJ', // Schriftzug PKE
  '018': '1XGQ_NPDn4PD2utmT1SDyDZ5unTMbdTCw', // blaue Blüte über Nieheim
  '010': '1OtGopBWVZansZkFnPOjBDNy6asO5DPPG', // grünes Startraster bei Nacht (als Titel geprüft, verworfen)
  '014': '1opGjUGO_0GuDc4x1go9xpPEy_59hwjhP', // Transportkoffer mit Drohnen
};
async function photo(n) {
  const file = join(CACHE, `${n}.jpg`);
  if (!existsSync(file)) {
    const r = await fetch(`https://drive.google.com/uc?export=download&id=${PHOTOS[n]}`);
    if (!r.ok) throw new Error(`Foto ${n}: HTTP ${r.status}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return sharp(readFileSync(file)).rotate().resize(3200, 3200, { fit: 'inside' }).toBuffer();
}

async function lichtraster(n, name, { width = 1600, height = 800, position = 'attention', ...opts } = {}) {
  const values = { ...DEFAULTS, ...opts };
  const { sampleWidth, sampleHeight } = gridSize(values.cellSize, width, height);
  const raw = await sharp(await photo(n)).resize(sampleWidth, sampleHeight, { fit: 'cover', position }).greyscale().raw().toBuffer();
  const svg = rasterSvg(createPoints(raw, { ...values, width, height, channels: 1 }), width, height);
  await sharp(Buffer.from(svg)).webp({ quality: 72 }).toFile(new URL(`${name}.webp`, OUT).pathname);
  console.log('Lichtraster', name, `${width}×${height}`);
}
async function plain(n, name, { width, height, position = 'attention' }) {
  await sharp(await photo(n)).resize(width, height, { fit: 'cover', position }).webp({ quality: 78 }).toFile(new URL(`${name}.webp`, OUT).pathname);
  console.log('Foto', name, `${width}×${height}`);
}

// ---------- Wie funktioniert eine Drohnenshow? ----------
// Titel: das Doppelherz über Nieheim (#034), das Ergebnis der Synchronisation aus dem Einstieg. Geprüft und verworfen: das
// grüne Startraster bei Nacht (#010) zerfällt im Raster zu Strichen ohne erkennbares Motiv. Zuschnitt oben, damit das Herz
// ganz im Bild steht; Gamma und Schwelle höher, damit der verrauschte Vordergrund ruhig bleibt.
await lichtraster('034', 'funktion-titel-034', { gamma: 2.2, threshold: 0.12, position: 'top' });
// Bilder im Text: normale Fotos. Die Jubiläumsmotive (#048 ff.) sind quadratisch (1200 × 1200) und bleiben es, sonst
// schneidet der Zuschnitt die Schrift an. Hochkant 4 : 5 nur für echte Hochformate (#002) und ihr Gegenüber (#013).
await plain('002', 'funktion-002', { width: 960, height: 1200, position: 'south' });
await plain('013', 'funktion-013', { width: 960, height: 1200, position: 'centre' });
await plain('030', 'funktion-030', { width: 1600, height: 1000, position: 'centre' });
await plain('015', 'funktion-015', { width: 1600, height: 1000, position: 'centre' });

// ---------- Drohnen als Alternative zum Feuerwerk ----------
// Titel: das Peace-Zeichen über Nieheim (#044), im Raster die klarste Figur der Sichtung; ein Lichtzeichen ohne Knall.
await lichtraster('044', 'feuerwerk-titel-044', { gamma: 1.8, threshold: 0.08, position: 'centre' });
await plain('018', 'feuerwerk-018', { width: 1600, height: 1000, position: 'centre' });
await plain('014', 'feuerwerk-014', { width: 1600, height: 1000, position: 'centre' });
await plain('052', 'feuerwerk-052', { width: 1000, height: 1000, position: 'centre' });
await plain('055', 'feuerwerk-055', { width: 1000, height: 1000, position: 'centre' });
await plain('048', 'feuerwerk-048', { width: 1000, height: 1000, position: 'centre' });
