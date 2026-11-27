// Run after adding stand-alone video links to a blog article.
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import sharp from 'sharp';
import { youtubeId } from '../../src/components/blog/post-links.mjs';

const posts = new URL('../../src/content/posts/', import.meta.url);
const output = new URL('../../public/media/blog/youtube/', import.meta.url);
await mkdir(output, { recursive: true });

const ids = new Set();
for await (const file of glob('**/*.md', { cwd: posts })) {
  const body = await readFile(new URL(file, posts), 'utf8');
  for (const [, href] of body.matchAll(/^\[[^\]\n]+\]\((https?:\/\/[^\s)]+)\)\s*$/gm)) {
    const id = youtubeId(href);
    if (id) ids.add(id);
  }
}

for (const id of ids) {
  const path = new URL(`${id}.webp`, output);
  if (existsSync(path)) continue;

  let saved = false;
  for (const quality of ['mqdefault', 'hqdefault']) {
    try {
      const response = await fetch(`https://i.ytimg.com/vi/${id}/${quality}.jpg`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const image = sharp(Buffer.from(await response.arrayBuffer()));
      const { width, height } = await image.metadata();
      if (!width || !height || width < 320 || height < 180) continue;
      await image.resize(480, 270, { fit: 'cover' }).webp({ quality: 76 }).toFile(path.pathname);
      console.log(id);
      saved = true;
      break;
    } catch (error) {
      console.warn(id, error.message);
    }
  }
  if (!saved) {
    console.warn(`No YouTube thumbnail for ${id}`);
    process.exitCode = 1;
  }
}
