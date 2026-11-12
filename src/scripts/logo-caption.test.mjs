import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Logo-Budgethinweise erscheinen nicht als zusätzliche Box auf der Bühne', () => {
  const component = readFileSync(new URL('../components/configurator/ShowConfigurator.astro', import.meta.url), 'utf8');
  const controller = readFileSync(new URL('./show-configurator.js', import.meta.url), 'utf8');
  assert.doesNotMatch(component, /cfg-logo-caption/);
  assert.doesNotMatch(controller, /cfg-logo-caption/);
  assert.match(component, /aria-describedby="cfg-scene"/);
  assert.match(component, /class="sr-only" id="cfg-scene"/);
});
