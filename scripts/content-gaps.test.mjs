import {sectionSchema} from '../src/schemas/content-schema.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { projectShowcaseSchema } from '../src/schemas/project-showcase.mjs';
const root = new URL('../src/content/', import.meta.url);
const entry = (path) => { const raw = readFileSync(new URL(path, root), 'utf8'); return parse(path.endsWith('.md') ? raw.split('---')[1] : raw); };
const files = (dir, ext) => readdirSync(new URL(dir, root)).filter((f) => f.endsWith(ext));

test('Every internal section note is identical in DE, EN and NL', () => {
  for (const file of files('pages/', '.yaml')) {
    const de = entry(`pages/${file}`);
    for (const locale of ['en', 'nl']) {
      const target = entry(`pages/${locale}/${file}`);
      assert.deepEqual(target.sections.map((s) => s.todo), de.sections.map((s) => s.todo), `${locale}/${file}`);
    }
  }
});

test('Every landing reference has a real case study or an explicit content gap', () => {
  for (const file of files('pages/', '.yaml')) {
    for (const section of entry(`pages/${file}`).sections) {
      if (section.type !== 'landingRefs') continue;
      for (const id of section.projects) {
        const project = entry(`projects/${id}.md`);
        assert.ok((project.showcase && !project.draft) || section.todo, `${file}: ${id} has no case study or note`);
      }
    }
  }
});

test('Case studies accept missing footage, formation and gallery without weakening available data', () => {
  for (const file of files('projects/', '.md')) {
    const source = entry(`projects/${file}`).showcase;
    if (!source) continue;
    const minimal = structuredClone(source);
    delete minimal.heroVideo; delete minimal.formation; delete minimal.gallery;
    assert.deepEqual(projectShowcaseSchema.parse(minimal).gallery, [], file);
    assert.equal(projectShowcaseSchema.safeParse({ ...minimal, heroVideo: 'invented' }).success, false);
    assert.equal(projectShowcaseSchema.safeParse({ ...minimal, formation: {} }).success, false);
    assert.equal(projectShowcaseSchema.safeParse({ ...minimal, videoLink: { href: 'invented', label: 'Film' } }).success, false);
  }
});

test('Every published case has a unique route/order and an existing next case', () => {
  const cases = files('projects/', '.md').map((f) => entry(`projects/${f}`)).filter((p) => !p.draft && p.showcase).map((p) => p.showcase);
  assert.equal(new Set(cases.map((c) => c.route)).size, cases.length);
  assert.equal(new Set(cases.map((c) => c.order)).size, cases.length);
  for (const c of cases) assert.ok(cases.some((next) => next.route === c.nextRoute && next.route !== c.route), c.route);
});

test('Internal section notes render only in the local dev server, never in a build or preview', () => {
  const renderer = readFileSync(new URL('../src/components/SectionRenderer.astro', import.meta.url), 'utf8');
  const gate = renderer.match(/const annotate = (.+);/)?.[1];
  assert.equal(gate, 'import.meta.env.DEV', 'todo notes must depend on the dev server alone, not on a build flag');
});

test('Alle Section-Typen erben dieselbe Dev-only-Hilfe aus dem Schema',()=>{
 const descriptions=sectionSchema.options.map(s=>s.shape.todo.description);
 assert.equal(new Set(descriptions).size,1);
 assert.match(descriptions[0],/lokalen Dev-Server/);
 assert.match(descriptions[0],/nie in Build oder Preview/);
});
