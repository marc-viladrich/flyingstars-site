// Standbilder der Chopper-Stimmungen für Besucher ohne JavaScript (Chopper.astro, <noscript>): das Bild bei reduzierter
// Bewegung, transparent, aus dem echten Renderer aufgenommen. play (Hochzeit, Fang-Moment) 1200 × 675 wie die 16 : 9-Bühne,
// happy (Danke-Seite, auch Team) 720 × 540 wie die 4 : 3-Bühne. Runde 10b: beide als Umriss-Chopper.
//   node tools/chopper-standbild.mjs <basis-url>   z. B. http://localhost:4811 (gebautes dist/ ausliefern)
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const base = process.argv[2];
if (!base) { console.error('Basis-URL fehlt'); process.exit(1); }
const MOODS = [
  { mood: 'play', page: '/drohnenshow-hochzeit/', size: [1200, 675] },
  { mood: 'happy', page: '/danke/', size: [720, 540] },
];
const browser = await chromium.launch();
try {
  for (const { mood, page: path, size: [w, h] } of MOODS) {
    const out = fileURLToPath(new URL(`../public/media/chopper/${mood}.webp`, import.meta.url));
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await page.goto(`${base}${path}`, { waitUntil: 'load' });
    const cv = page.locator(`canvas[data-chopper-mood="${mood}"]`).first();
    await cv.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
    const url = await cv.evaluate((c) => c.toDataURL('image/png'));
    await sharp(Buffer.from(url.split(',')[1], 'base64')).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82, alphaQuality: 90 }).toFile(out);
    await page.close();
    console.log(out);
  }
} finally { await browser.close(); }
