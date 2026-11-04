// Read-only parallel audit. This does not activate/persist v2 or relax the legacy gate.
import {createHash} from 'node:crypto';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import {contractFixtures} from './test/i18n-contract-fixtures.mjs';
import {policyTree, policyStatistics} from '../src/i18n/field-policy.mjs';
import {checkParallel, project, adoptionEvidence, reviewRequired} from '../src/i18n/contract.mjs';

const {site, pairs, dependencies} = await contractFixtures();
const ids = ['page/index', 'post/test', 'project/test', 'faq/test', 'person/test', 'media/test', 'site/contact', 'site/navigation', 'site/show-duration', 'site/show-extras', 'site/business-facts', 'site/project-facts', 'site/preview-policy', 'package/configuration', 'site/ui'];
const policy = Object.fromEntries(ids.map(id => [id, policyStatistics(policyTree(site.sourceFor(id).schema))]));
const report = {version: 2, addressing: 'positional-pre-keys', sources: pairs.length / 2, localeFiles: pairs.length,
  rawCurrent: 0, shadowPass: 0, blockers: [], sharedDrift: [], policy,
  commentOnly: {checked: 0, rawStale: 0, fingerprintUnchanged: 0},
  technicalField: {checked: 0, rawStale: 0, fingerprintUnchanged: 0},
  textField: {checked: 0, rawStale: 0, fingerprintChanged: 0}};
const set = (object, path, value) => {let node = object;for (const key of path.slice(0, -1)) node = node[key];node[path.at(-1)] = value;};
for (const pair of pairs) {
  if (pair.target.translationSourceHash === createHash('sha256').update(pair.sourceRaw).digest('hex')) report.rawCurrent++;
  try {
    const result = checkParallel(pair), evidence = adoptionEvidence(result);
    report.shadowPass++;
    const drift = result.sharedDifferences.filter(field => field.address !== '/translationSourceHash');
    if (drift.length) report.sharedDrift.push({file: pair.targetFile, drift});
    report.commentOnly.checked++;
    const commentRaw = pair.sourceRaw.replace(/^(---\r?\n)?/, '$&# i18n shadow comment\n');
    if (createHash('sha256').update(commentRaw).digest('hex') !== result.rawHash) report.commentOnly.rawStale++;
    if (project(pair.schema, codecs[pair.format].parse(commentRaw), pair.target, pair.locale, dependencies).sourceFingerprint === result.sourceFingerprint) report.commentOnly.fingerprintUnchanged++;
    const technical = structuredClone(pair.source);
    const technicalKey = pair.format === 'yaml' ? 'noindex' : 'draft';
    if (technicalKey) {
      report.technicalField.checked++;
      technical[technicalKey] = !technical[technicalKey];
      // Re-encoding changes raw bytes; the shadow projection accepts shared differences without a text review.
      const changed = project(pair.schema, technical, pair.target, pair.locale, dependencies);
      const bytes = codecs[pair.format].update(pair.sourceRaw, [technicalKey], technical[technicalKey]);
      if (createHash('sha256').update(bytes).digest('hex') !== result.rawHash) report.technicalField.rawStale++;
      if (changed.sourceFingerprint === result.sourceFingerprint && reviewRequired(changed, evidence).length === 0) report.technicalField.fingerprintUnchanged++;
    }
    const text = structuredClone(pair.source), field = result.fields.find(field => typeof field.value === 'string');
    if (field) {
      report.textField.checked++;set(text, field.path, field.value + ' ');
      const changed = project(pair.schema, text, pair.target, pair.locale, dependencies);
      const bytes = codecs[pair.format].update(pair.sourceRaw, field.path, field.value + ' ');
      if (createHash('sha256').update(bytes).digest('hex') !== result.rawHash) report.textField.rawStale++;
      if (changed.sourceFingerprint !== result.sourceFingerprint) report.textField.fingerprintChanged++;
    }
  } catch (error) { report.blockers.push({file: pair.targetFile, reason: error.message}); }
}
console.log(JSON.stringify(report, null, 2));
