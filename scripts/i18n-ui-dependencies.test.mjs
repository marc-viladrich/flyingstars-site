import test from 'node:test';
import assert from 'node:assert/strict';
import {contractFixtures} from '../editor/test/i18n-contract-fixtures.mjs';
import {project, fingerprint} from '../src/i18n/contract.mjs';
import {tokenDependency} from '../src/i18n/contract-dependencies.mjs';

const {pairs, dependencies} = await contractFixtures();
const run = (pair, deps) => project(pair.schema, pair.source, pair.target, pair.locale, deps);
const baselines = pairs.map(pair => run(pair, dependencies));

test('an unused UI key leaves every content and field fingerprint unchanged', () => {
  const deps = structuredClone(dependencies);
  deps.ui['regression.unused'] = {de: 'Neu', en: 'New', nl: 'Nieuw'};
  pairs.forEach((pair, i) => {
    const result = run(pair, deps);
    assert.equal(result.sourceFingerprint, baselines[i].sourceFingerprint, pair.id);
    assert.deepEqual(result.fields.map(f => f.sourceFingerprint), baselines[i].fields.map(f => f.sourceFingerprint), pair.id);
  });
});

for (const key of [`quantity.number${dependencies.showExtras.indoor.ceilingMin}`, 'price.from']) {
  test(`used UI key ${key} invalidates exactly its dependent content`, () => {
    const deps = structuredClone(dependencies);
    deps.ui[key].en += ' changed';
    let affected = 0;
    pairs.forEach((pair, i) => {
      const baseline = baselines[i];
      const usesKey = baseline.fields.some(field => field.dependencies.some(dep =>
        dep.token?.startsWith('offer.') &&
        (key.startsWith('quantity.') ? dep.token === 'offer.indoor.ceilingWords' : /\.(price|priceSuffix|priceLine|priceGuide)$/.test(dep.token))));
      assert.equal(run(pair, deps).sourceFingerprint !== baseline.sourceFingerprint, usesKey, pair.id);
      if (usesKey) affected++;
    });
    assert.ok(affected > 0, 'must exercise real token-bearing content');
  });
}

test('ceilingWords follows the renderer number-word range and ignores other number words', () => {
  const token = 'offer.indoor.ceilingWords';
  for (const ceilingMin of [-1, 0, 3, 12, 13, 3.5]) {
    const deps = structuredClone(dependencies);
    deps.showExtras.indoor.ceilingMin = ceilingMin;
    const before = fingerprint(tokenDependency(token, deps, 'en'));
    for (let n = 0; n <= 12; n++) {
      const changed = structuredClone(deps);
      changed.ui[`quantity.number${n}`].en += ' changed';
      assert.equal(fingerprint(tokenDependency(token, changed, 'en')) !== before, n === ceilingMin, `${ceilingMin}/${n}`);
    }
  }
});
