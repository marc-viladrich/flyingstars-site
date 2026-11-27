import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { brandedShowSection, renderPostLinks } from '../components/blog/post-links.mjs';

test('the formation belongs to the last branded closing section', () => {
  const first = '<h2 id="first">Drone Shows by Flying Stars</h2><p>First</p>';
  const lastHeading = '<h2 id="shows">FlyingStars – Experts in Drone Light Shows</h2>';
  const lastBody = '<p>Learn about our shows.</p><h3>Pricing</h3><p>See our packages.</p>';
  const following = '<h2 id="faq">FAQ</h2><p>Answer.</p>';
  const html = first + lastHeading + lastBody + following;
  const section = brandedShowSection(html);
  assert.equal(section.id, 'shows');
  assert.equal(html.slice(section.start, section.content), lastHeading);
  assert.equal(html.slice(section.content, section.end), lastBody);
  assert.equal(html.slice(section.end), following);
  assert.equal(brandedShowSection(following), undefined);
});

test('price actions look like buttons while contextual links remain in the text', () => {
  const inline = '<p>The <a href="/en/drohnenshow-preise/">cost of a drone show</a> varies.</p>';
  const price = '<p><a href="/en/drohnenshow-preise/">View pricing</a></p>';
  const rendered = renderPostLinks(inline + price, () => false);
  assert.ok(rendered.startsWith(inline));
  assert.ok(rendered.endsWith('<p><a href="/en/drohnenshow-preise/" class="btn">View pricing</a></p>'));
});

test('migrated posts use the shared enquiry and omit legacy artwork and emoji', () => {
  const posts = new URL('../content/posts/', import.meta.url);
  for (const file of globSync('**/*.md', { cwd: posts })) {
    const contents = readFileSync(new URL(file, posts), 'utf8');
    if (!/^legacyPath:/m.test(contents)) continue;
    const body = contents.split(/^---\s*$/m).at(-1);
    assert.doesNotMatch(body, /350a8cc09aa9f85f1626c8c5e166eaac33cc2e79a4cd8041453ac8536b470ff0/, file);
    assert.doesNotMatch(body, /^\[[^\]]+\]\(\/(?:en\/|nl\/)?kontakt\/\)\s*$/m, file);
    assert.doesNotMatch(body, /\p{Extended_Pictographic}/u, file);
  }
});

test('the superseded English fireworks article points directly to its canonical article', async () => {
  const { astroRedirects } = await import('../i18n/public-routes.mjs');
  const root = new URL('../../', import.meta.url);
  const slug = 'netherlands-fireworks-ban-impact-on-new-years-celebrations-2026-new';
  const article = `/en/blog/2025-08-05-${slug}`;
  const alternate = `/en/${slug}`;
  const canonical = '/en/blog/2025-07-14-niederlande-feuerwerk-verbot/';
  assert.match(readFileSync(new URL(`src/content/posts/en/2025-08-05-${slug}.md`, root), 'utf8'), /^draft: true$/m);
  const pagesRedirects = readFileSync(new URL('public/_redirects', root), 'utf8').split('\n');
  const apacheRedirects = readFileSync(new URL('public/.htaccess', root), 'utf8').split('\n');
  const astro = astroRedirects();
  for (const source of [article, alternate]) {
    assert.equal(astro[source], canonical);
    assert.ok(pagesRedirects.includes(`${source} ${canonical} 301`));
    assert.ok(pagesRedirects.includes(`${source}/ ${canonical} 301`));
    assert.ok(apacheRedirects.includes(`RewriteRule ^${source.slice(1)}/?$ ${canonical} [R=301,L]`));
  }
});
