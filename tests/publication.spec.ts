import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { contentSchemas } from '../src/schemas/content-schema.mjs';

// Publication follows the current content files, including intentionally retained drafts.
const directory = new URL('../src/content/posts/', import.meta.url);
const posts = readdirSync(directory).filter(file => file.endsWith('.md')).map(file => {
  const source = readFileSync(new URL(file, directory), 'utf8');
  const parts = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(source);
  if (!parts) throw Error('Frontmatter fehlt: ' + file);
  return { slug: file.slice(0, -3), data: contentSchemas.posts.parse(parse(parts[1])), body: parts[2] };
});
if (!posts.some(post => !post.data.draft)) throw Error('Keine veröffentlichten Beiträge für die Publikationsprüfung.');
for (const post of posts) test(`${post.data.draft ? 'Entwurf bleibt verborgen' : 'Veröffentlichter Beitrag ist verlinkt und lesbar'}: ${post.slug}`, async ({ page, request }) => {
  const href = `/blog/${post.slug}/`;
  await page.goto('/blog/');
  const link = page.locator(`a[href="${href}"]`).first();
  if (post.data.draft) {
    await expect(link).toHaveCount(0);
    expect((await request.get(href)).status()).toBe(404);
    return;
  }
  await expect(link).toBeVisible();
  await expect(link).toContainText(post.data.title);
  await link.click();
  await expect(page).toHaveURL(url => url.pathname === href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(post.data.title);
  const paragraph = post.body.split(/\n\s*\n/).find(text => text.trim())!.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();
  await expect(page.locator('main')).toContainText(paragraph);
});
