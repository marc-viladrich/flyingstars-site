import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { videos, videoPath, videoPreviews, videoMobile } from '../lib/videos.ts';
import { readdirSync } from 'node:fs';

// Inspect the actual MP4 track handlers, not filenames or the muted HTML attribute.
function boxes(bytes) {
  const result = [];
  for (let offset = 0; offset < bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    assert.ok(size >= 8 && offset + size <= bytes.length, 'valid MP4 atom');
    result.push({ type: bytes.toString('ascii', offset + 4, offset + 8), data: bytes.subarray(offset + 8, offset + size) });
    offset += size;
  }
  return result;
}
const child = (box, type) => boxes(box.data).find((entry) => entry.type === type);

test('jede registrierte Quelle hat eine lokale Vorschau; Originale bleiben im festen Proxy', () => {
  assert.deepEqual(Object.keys(videoPreviews).sort(), Object.keys(videos).sort());
  for (const [key, src] of Object.entries(videos)) {
    assert.equal(videoPath(src), `/api/media?asset=${key}`);
    assert.equal(videoPath(src, 'preview'), videoPreviews[key]);
  }
  for (const src of ['https://attacker.test/video.mp4', '__proto__', videos.nfl.replace('.mp4', '.webm')]) {
    for (const variant of ['full', 'preview']) assert.throws(() => videoPath(src, variant), /nicht registriert/);
  }
});

test('alle ausgelieferten Vorschauen sind kleine Faststart-MP4s mit genau einer stummen H.264-Videospur', () => {
  let total = 0;
  for (const path of [...Object.values(videoPreviews), ...Object.values(videoMobile)]) {
    assert.match(path, /^\/media\/video\/[\w-]+\.mp4$/);
    const bytes = readFileSync(new URL(`../../public${path}`, import.meta.url));
    if (Object.values(videoPreviews).includes(path)) total += bytes.length; // Summe: Vorschauen; Handyfassungen ersetzen sie dort
    assert.ok(bytes.length < 2_000_000, `${path}: unter 2 MB`);
    const atoms = boxes(bytes);
    assert.ok(atoms.findIndex((b) => b.type === 'moov') < atoms.findIndex((b) => b.type === 'mdat'), `${path}: Faststart`);
    const tracks = boxes(atoms.find((b) => b.type === 'moov').data).filter((b) => b.type === 'trak');
    assert.equal(tracks.length, 1, path);
    const media = child(tracks[0], 'mdia');
    assert.equal(child(media, 'hdlr').data.toString('ascii', 8, 12), 'vide', `${path}: keine Audiospur`);
    const descriptions = child(child(child(media, 'minf'), 'stbl'), 'stsd');
    assert.equal(descriptions.data.toString('ascii', 12, 16), 'avc1', `${path}: H.264`);
  }
  assert.ok(total < 5_000_000, 'alle Vorschauen zusammen unter 5 MB');
});

test('Pages liefert für jede feste MP4-Vorschau die korrekte Länge und schützt sie vor Transformation', () => {
  // WebKit rejects Wrangler/Pages-style chunked MP4 responses without a known length.
  // Pin the length to the actual asset so a future re-encode cannot leave a stale header.
  const headers = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8');
  for (const path of [...Object.values(videoPreviews), ...Object.values(videoMobile)]) {
    const block = headers.split('\n\n').find((block) => block.split('\n')[0] === path);
    assert.ok(block, `${path}: eigene Header-Regel`);
    assert.ok(block.includes(`Content-Length: ${readFileSync(new URL(`../../public${path}`, import.meta.url)).length}\n`), `${path}: tatsächliche Bytelänge`);
    assert.match(block, /Cache-Control: public, max-age=31536000, immutable, no-transform/);
  }
});

// Marc, 21.11.2026: Seitenköpfe der Anlass-Seiten laufen auch auf dem Handy von selbst, dort in 480p
test('jedes Video eines Anlass-Seitenkopfs hat eine 480p-Handyfassung unter 1 MB', () => {
  const dir = new URL('../content/pages/', import.meta.url);
  const keys = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
    const text = readFileSync(new URL(file, dir), 'utf8');
    for (const m of text.matchAll(/type: landingHero[\s\S]*?\n    video: (\w+)/g)) keys.add(m[1]);
  }
  assert.ok(keys.size >= 3, [...keys].join());
  for (const key of keys) {
    assert.ok(videoMobile[key], `${key}: 480p-Fassung fehlt`);
    assert.equal(videoPath(videos[key], 'mobile'), videoMobile[key]);
    assert.ok(readFileSync(new URL(`../../public${videoMobile[key]}`, import.meta.url)).length < 1_000_000, `${key}: unter 1 MB`);
  }
});
