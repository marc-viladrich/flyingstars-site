import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {schemaDescription} from 'astro-frontend-editor/runtime/extensions';
import {fieldPolicy, policyTree, policyStatistics} from '../src/i18n/field-policy.mjs';
import {contractFixtures} from './test/i18n-contract-fixtures.mjs';

const fixtures = await contractFixtures();
const ids = ['page/index', 'post/test', 'project/test', 'faq/test', 'person/test', 'media/test', 'site/contact', 'site/navigation', 'site/show-duration', 'site/show-extras', 'site/business-facts', 'site/project-facts', 'site/preview-policy', 'package/configuration', 'site/ui'];

test('every possible branch of every registered source has the same server/browser policy', () => {
  for (const id of ids) {
    const schema = fixtures.site.sourceFor(id).schema, tree = policyTree(schema);
    assert.deepEqual(tree, policyTree(schemaDescription(schema)), id);
    const stats = policyStatistics(tree);
    assert.ok(stats.shared + stats.translatable > 0, id);
  }
});

test('unknown/unannotated fields stop even in unused reference/section union options', () => {
  const s = fieldPolicy(z.string(), 'shared');
  assert.throws(() => policyTree(z.union([s, z.object({notYetUsed: z.string()})])), /Unannotated.*notYetUsed/);
  assert.throws(() => policyTree(z.object({untested: z.array(z.union([s, z.number()]))})), /Unannotated/);
  assert.throws(() => policyTree(z.object({opaque: z.record(z.string(), s)})), /Unsupported/);
  assert.throws(() => fieldPolicy(z.string(), 'guess'), /Unknown field policy/);
});

test('one helper preserves widget metadata and explicitly sets x-afe.translatable', () => {
  const source = z.string().meta({'x-afe': {format: 'markdown', group: 'Text'}});
  assert.deepEqual(fieldPolicy(source, 'translatable').meta()['x-afe'], {format: 'markdown', group: 'Text', translatable: true});
  assert.equal(policyTree(fieldPolicy(source, 'shared')).mode, 'shared');
  assert.equal(policyTree(fieldPolicy(source, 'translatable').optional().describe('Copy')).mode, 'translatable');
});

test('contextual names, labels, image alts and Markdown remain translated; references and media source are shared', () => {
  const page = policyTree(fixtures.site.sourceFor('page/index').schema);
  const section = type => page.properties.sections.element.options.find(node => node.properties.type.value === type);
  assert.equal(section('logoBar').properties.logos.element.properties.name.mode, 'translatable');
  assert.equal(section('landingHero').properties.cta.properties.label.mode, 'translatable');
  assert.equal(section('landingHero').properties.cta.properties.href.mode, 'shared');
  assert.equal(section('landingHero').properties.poster.properties.alt.mode, 'translatable');
  assert.equal(section('landingHero').properties.poster.properties.src.options[0].mode, 'shared');
  assert.equal(policyTree(fixtures.site.sourceFor('post/test').schema).properties.body.mode, 'translatable');
  const client = policyTree(fixtures.site.sourceFor('project/test').schema).properties.client;
  assert.equal(client.options[0].mode, 'translatable');
  assert.equal(client.options[1].properties.project.mode, 'shared');
});
