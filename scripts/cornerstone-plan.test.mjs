// Cornerstone-Artikel (src/components/blog/cornerstone/types.ts): die Anordnung gilt nur, solange sie zum Text passt; sonst
// zeigt BlogPost.astro das normale Format. Prüft die Teilung des Texts und den Rückfall ohne Build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { marked } from 'marked';
import { basicBlocks, withoutStaticLogo, splitSections, stepsOf, splitAfter, checkPlan } from '../src/components/blog/cornerstone/types.ts';

const html = '<p>Einleitung</p><p>&nbsp;</p><h2>Eins</h2><p>a</p><p>b</p><h2>Zwei</h2><p>Kopf</p><h3>Schritte</h3><ul><li><strong>Start:</strong> x</li><li><p><strong>Ende:</strong> y</p></li></ul><h2>Drei</h2><h3>1. A</h3><p>s1</p><h3>2. B</h3><p>s2</p>';
const sections = splitSections(html);
const story = (steps) => ({ steps });

test('Abschnitte, Aufzählungs- und Unterabschnitt-Schritte, Teilung nach Absatz', () => {
  assert.equal(sections.length, 4);
  assert.deepEqual(sections.map((s) => s.title), ['', 'Eins', 'Zwei', 'Drei']);
  assert.deepEqual(stepsOf(sections[2], 'list').steps.map((s) => s.title), ['Start', 'Ende']);
  assert.match(stepsOf(sections[2], 'list').head, /<h3>Schritte<\/h3>$/);
  assert.deepEqual(stepsOf(sections[3]).steps.map((s) => s.title), ['A', 'B']);
  assert.deepEqual(splitAfter(sections[1].html, 1)[1], '<p>b</p>');
  assert.equal(splitAfter(sections[1].html, 5), undefined);
});

test('Passende Anordnung gilt, jede Abweichung fällt ins normale Format zurück', () => {
  const s1 = { kind: 'story', sections: [2], steps: 'list', groups: ['g'], scene: () => story(2) };
  const s2 = { kind: 'story', sections: [3], groups: ['g'], scene: () => story(2) };
  const ok = { blocks: [{ kind: 'text', section: 0 }, { kind: 'text', section: 1, split: { after: 1, part: 0 } }, { kind: 'compare' }, { kind: 'text', section: 1, split: { after: 1, part: 1 } }, s1, s2] };
  const run = (article, steps = [2, 2]) => checkPlan(article, sections, new Map(article.blocks.filter((b) => b.kind === 'story').map((b, i) => [b, story(steps[i])])));
  assert.equal(run(ok), undefined);
  assert.match(run(ok, [3, 2]), /Schritte/, 'Szene mit anderer Schrittzahl');
  assert.match(run({ blocks: ok.blocks.filter((b) => b !== s2) }), /kommen in der Anordnung nicht vor/, 'Abschnitt fehlt');
  assert.match(run({ blocks: [...ok.blocks, { kind: 'finale', section: 9 }] }), /fehlt im Text/, 'neuer Zwischentitel fehlt im Text');
  assert.match(run({ blocks: ok.blocks.filter((b) => !(b.split?.part === 1)) }), /geteilt/, 'nur eine Hälfte der Teilung');
  assert.match(run({ blocks: [...ok.blocks.filter((b) => b !== s1), { ...s1, steps: 'h3' }] }), /Schritte/, 'Schritte aus ### statt Aufzählung');
});

test('Basisformat erhält Textreihenfolge und Originalbilder und übernimmt nur zugeordnete Fotos', () => {
  const image = '<p><img src="/original.jpg" alt="Originalfoto"></p>';
  const logo = '<p><img src="/was-kostet-eine-drohne-flyingstars-logo-1024x499.jpg" alt="Logo"></p>';
  const sections = splitSections(withoutStaticLogo(`<p>Intro</p>${image}<h2>Zwei</h2><p>Ende</p>${logo}`));
  const photo = { kind: 'photos', afterSection: 0, photos: [] };
  const blocks = [photo, { kind: 'photos', photos: [] }, { kind: 'story' }, { kind: 'compare' }, { kind: 'finale' }];
  assert.deepEqual(basicBlocks(blocks, sections), [
    { kind: 'basic-text', html: `<p>Intro</p>${image}` },
    photo,
    { kind: 'basic-text', html: '<h2>Zwei</h2><p>Ende</p>' },
  ]);
});

test('Vollständiges Format lässt sich mit den Originalen in allen Sprachen wieder einschalten', async () => {
  const directory = new URL('../src/components/blog/cornerstone/articles/', import.meta.url);
  const posts = new URL('../src/content/posts/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.ts'))) {
    const { outputFiles } = await build({
      entryPoints: [fileURLToPath(new URL(file, directory))],
      bundle: true,
      format: 'esm',
      platform: 'node',
      write: false,
    });
    const { default: article } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
    const stories = new Map(article.blocks.filter(block => block.kind === 'story').map(block => [block, block.scene()]));
    for (const prefix of ['', 'en/', 'nl/']) {
      const [, frontmatter, markdown] = readFileSync(new URL(`${prefix}${article.post}.md`, posts), 'utf8').split(/^---\s*$/m);
      if (/^legacyPath:/m.test(frontmatter)) continue;
      const sections = splitSections(withoutStaticLogo(marked.parse(markdown)));
      assert.equal(checkPlan({ ...article, layout: 'cornerstone' }, sections, stories), undefined, prefix + article.post);
    }
  }
});
