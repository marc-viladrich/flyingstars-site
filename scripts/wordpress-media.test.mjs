import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { bundledImageName } from '../src/lib/bundled-media.mjs';

test('active site sources are independent of WordPress uploads', () => {
  const sourceFiles = globSync('src/**/*.{astro,css,js,json,md,mjs,ts,yaml}');
  sourceFiles.push('public/media/galerie/manifest.json');
  const remote = /https?:\/\/(?:www\.)?flyingstars\.art\/wp-content\/uploads\//i;
  for (const file of sourceFiles) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), remote, file);
  }
});

test('archived media retain their original bytes at deployable addresses', () => {
  const records = JSON.parse(readFileSync('docs/wordpress-media-migration.json', 'utf8'));
  const checked = new Set();
  for (const record of records) {
    if (checked.has(record.delivered)) continue;
    checked.add(record.delivered);
    const name = bundledImageName(record.delivered);
    const file = name ? path.join('src/assets/wordpress', name) : 'public' + record.delivered;
    const bytes = readFileSync(file);
    assert.equal(bytes.length, record.bytes, file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, file);
  }
  assert.ok(checked.size > 0);
});
