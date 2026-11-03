import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { localImageSize } from '../lib/local-image-size.mjs';

const root = path.resolve(process.env.FLYINGSTARS_AUDIT_DIST || 'dist');
function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else yield file;
  }
}

test('local logo dimensions come from the real SVG/PNG files', async () => {
  // Enumerate the actual logo directories, including future additions.
  for (const dir of ['public/brand/logos', 'public/poc/logos']) {
    for (const file of files(dir)) {
      if (!/\.(svg|png|jpe?g|webp)$/.test(file)) continue;
      const src = '/' + path.relative('public', file);
      const actual = await sharp(file).metadata();
      assert.deepEqual(await localImageSize(src), { width: actual.width, height: actual.height }, src);
    }
  }
  for (const src of ['https://example.test/a.png', '//example.test/a.png', '/../package.json']) {
    assert.throws(() => localImageSize(src), /local public image/);
  }
});

test('every generated image reserves both dimensions', { skip: !process.env.FLYINGSTARS_AUDIT_DIST }, () => {
  const missing = [];
  let pages = 0;
  for (const file of files(root)) {
    if (!file.endsWith('.html')) continue;
    pages++;
    for (const tag of fs.readFileSync(file, 'utf8').matchAll(/<img\b[^>]*>/g)) {
      if (!/\bwidth=["']\d+(?:\.\d+)?["']/.test(tag[0]) || !/\bheight=["']\d+(?:\.\d+)?["']/.test(tag[0])) {
        missing.push(`${path.relative(root, file)}: ${tag[0]}`);
      }
    }
  }
  assert.ok(pages > 100, `Unexpectedly incomplete build: ${pages} HTML files`);
  assert.deepEqual(missing, []);
});

test('pages without a configurator never request its stylesheet', { skip: !process.env.FLYINGSTARS_AUDIT_DIST }, () => {
  for (const file of files(root)) {
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(file, 'utf8');
    const hasConfigurator = /<section\b[^>]*class="cfg"/.test(html);
    const hasStyles = /<link\b[^>]*href="[^" ]*show-configurator[^" ]*\.css"/.test(html);
    assert.equal(hasStyles, hasConfigurator, path.relative(root, file));
  }
});
