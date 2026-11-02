// Zusätzlicher Endpoint-Guard: node --experimental-strip-types --test src/scripts/contact.test.mjs
// Mock-Versand ausschließlich im Prozess; keine echten Anfragen an Brevo/Cloudflare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequestGet } from '../../functions/api/contact.ts';

const env = { BREVO_API_KEY: 'test-key', CONTACT_FROM: 'form@example.test', CONTACT_TO: 'inbox@example.test', SITE_NAME: 'FlyingStars' };
const fields = { name: 'Testperson', email: 'test@example.test', anlass: 'firma', ort: 'Essen', 'datum-offen': 'ja', message: 'Nur eine Testnachricht.' };
const request = (values = {}, headers = {}) => new Request('https://site.example.test/api/contact', {
  method: 'POST', body: new URLSearchParams({ ...fields, ...values }), headers: { accept: 'application/json', ...headers },
});
const post = (req, config = env) => onRequestPost({ request: req, env: config });

test('Versand minimiert Metadaten und schickt nur die benötigten Maildaten', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push({ url, init }); return new Response('{}', { status: 201 }); });
  const response = await post(request({ 'form-duration': '2500', website: '', unbekannt: 'nicht weiterleiten' }, { 'cf-connecting-ip': '192.0.2.1' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.replyTo.email, fields.email);
  assert.equal(payload.to[0].email, env.CONTACT_TO);
  assert.equal(payload.subject, 'Anfrage über FlyingStars');
  assert.ok(payload.textContent.includes(fields.message));
  for (const excluded of ['192.0.2.1', 'form-duration', 'website', 'nicht weiterleiten']) assert.ok(!JSON.stringify(payload).includes(excluded));
});

test('Honeypot, Vorschau und No-JS senden ohne Konfiguration keine Mail', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Kein Netzwerk erwartet'); });
  assert.equal((await (await post(request({ website: 'spam' }))).json()).ok, true);
  assert.equal((await (await post(request(), {})).json()).state, 'not-configured');
  const response = await post(request({}, { accept: 'text/html' }), {});
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://site.example.test/danke/?state=not-configured');
});

test('Zeitfalle, Pflichtwerte, Länge, Headerzeichen und Auswahlwerte werden geprüft', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{}'); });
  for (const values of [
    { 'form-duration': '100' }, { 'form-duration': 'unbekannt' }, { name: '' }, { name: 'x'.repeat(121) },
    { email: 'ungültig' }, { name: 'Name\nBcc: test@example.test' }, { message: 'x'.repeat(5001) },
    { telefon: 'x'.repeat(201) }, { anlass: 'ungültig' }, { paket: 'FREI' }, { datum: '2026-02-31' }, { drohnen: '1001' },
  ]) assert.equal((await post(request(values))).status, 400, JSON.stringify(values).slice(0, 80));
  assert.equal(calls, 0);
  assert.equal((await post(request())).status, 200); // Kein JS / kein Dauer-Feld ist erlaubt.
});

test('Gesamtgröße wird auch ohne Content-Length vor FormData-Auswertung begrenzt', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Kein Netzwerk erwartet'); });
  assert.equal((await post(request({ message: 'x'.repeat(70_000) }))).status, 413);
  assert.equal((await post(request({}, { 'content-length': '70000' }))).status, 413);
  assert.equal((await post(request({}, { origin: 'https://fremd.example.test' }))).status, 403);
  const malformed = new Request('https://site.example.test/api/contact', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=fehlt' }, body: 'kaputt' });
  assert.equal((await post(malformed)).status, 400);
  const file = new FormData();
  for (const [key, value] of Object.entries(fields)) file.append(key, value);
  file.append('logo', new Blob(['test']), 'logo.txt');
  assert.equal((await post(new Request('https://site.example.test/api/contact', { method: 'POST', body: file }))).status, 400);
  const duplicate = request();
  const body = await duplicate.text();
  assert.equal((await post(new Request(duplicate.url, { method: 'POST', headers: duplicate.headers, body: body + '&email=other%40example.test' }))).status, 400);
});

test('Providerfehler bleiben kontrolliert und enthalten keine Providerinterna', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('vertrauliche Providerantwort', { status: 500 }));
  let response = await post(request());
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('vertrauliche'));
  globalThis.fetch = async () => { throw new Error('internes Secret'); };
  response = await post(request());
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('Secret'));
});

test('Turnstile ist optional, prüft Hostname und erhält keine Besucher-IP', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(url.includes('siteverify') ? { success: true, hostname: 'site.example.test' } : {}));
  });
  const config = { ...env, TURNSTILE_SECRET: 'test-secret' };
  assert.equal((await post(request(), config)).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await post(request({ 'cf-turnstile-response': 'test-token' }, { 'cf-connecting-ip': '192.0.2.1' }), config)).status, 200);
  assert.equal(calls.length, 2);
  const payload = JSON.parse(calls[0].init.body);
  assert.ok(!('remoteip' in payload));
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname: 'fremd.example.test' }));
  assert.equal((await post(request({ 'cf-turnstile-response': 'test-token' }), config)).status, 403);
  globalThis.fetch = async () => { throw new Error('Provider ausgefallen'); };
  assert.equal((await post(request({ 'cf-turnstile-response': 'test-token' }), config)).status, 503);
  assert.equal(onRequestGet().headers.get('allow'), 'POST');
});
