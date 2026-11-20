// Standbild der Chopper-Spielszene für Besucher ohne JavaScript (Chopper.astro, <noscript>): das Bild bei reduzierter
// Bewegung (Fang-Moment), transparent, aus dem echten Renderer aufgenommen. 1200 × 675 (16 : 9, wie die Bühne).
//   node tools/chopper-standbild.mjs <basis-url>   z. B. http://localhost:4811 (gebautes dist/ ausliefern)
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const base = process.argv[2];
if (!base) { console.error('Basis-URL fehlt'); process.exit(1); }
const out = fileURLToPath(new URL('../public/media/chopper/play.webp', import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await page.goto(`${base}/drohnenshow-hochzeit/`, { waitUntil: 'load' });
  const cv = page.locator('canvas[data-chopper-mood="play"]');
  await cv.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  const url = await cv.evaluate((c) => c.toDataURL('image/png'));
  await sharp(Buffer.from(url.split(',')[1], 'base64')).resize(1200, 675, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82, alphaQuality: 90 }).toFile(out);
  console.log(out);
} finally { await browser.close(); }
