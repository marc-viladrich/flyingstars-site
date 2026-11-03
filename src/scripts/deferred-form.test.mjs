import test from 'node:test';
import assert from 'node:assert/strict';
import { deferredForm } from './deferred-form.mjs';

class Form extends EventTarget {
  nativePosts = 0;
  status = { dataset: { loadError: 'Please retry' }, textContent: '', focus() { this.focused = true; } };
  querySelector() { return this.status; }
  requestSubmit(submitter) {
    const event = new Event('submit', { cancelable: true });
    event.submitter = submitter;
    this.dispatchEvent(event);
    if (!event.defaultPrevented) this.nativePosts++;
  }
}
const settle = () => new Promise(setImmediate);

test('an early submit waits for a slow chunk and enters the real handler exactly once', async () => {
  const form = new Form();
  const button = { name: 'submit' };
  let resolve;
  let loads = 0;
  let handled = 0;
  const ensure = deferredForm(form, () => {
    loads++;
    return new Promise((done) => { resolve = () => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        assert.equal(event.submitter, button);
        handled++;
      });
      done('ready');
    }; });
  });
  const ready = ensure(); // The proximity loader has already started its slow import.
  form.requestSubmit(button);
  form.requestSubmit(button);
  await settle();
  assert.equal(loads, 1);
  assert.equal(handled, 0);
  assert.equal(form.nativePosts, 0);
  resolve();
  assert.equal(await ready, 'ready');
  await settle();
  assert.equal(handled, 1);
  assert.equal(form.nativePosts, 0);
  // Once ready, ordinary submissions go straight to the existing handler.
  form.requestSubmit(button);
  assert.equal(handled, 2);
  assert.equal(loads, 1);
});

test('failed chunks never navigate; a later submit retries without losing the page', async () => {
  const form = new Form();
  let loads = 0;
  let handled = 0;
  deferredForm(form, async () => {
    if (++loads === 1) throw new Error('offline');
    form.addEventListener('submit', (event) => { event.preventDefault(); handled++; });
  });
  form.requestSubmit();
  await settle();
  assert.equal(form.nativePosts, 0);
  assert.equal(form.status.textContent, 'Please retry');
  assert.equal(form.status.focused, true);
  form.requestSubmit();
  await settle();
  assert.equal(loads, 2);
  assert.equal(handled, 1);
  assert.equal(form.nativePosts, 0);
});
