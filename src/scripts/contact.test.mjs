// Zusätzlicher Endpoint-Guard: node --experimental-strip-types --test src/scripts/contact.test.mjs
// Mock-Versand ausschließlich im Prozess; keine echten Anfragen an Brevo/Cloudflare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequestGet } from '../../functions/api/contact.ts';

const env = { BREVO_API_KEY: 'test-key', CONTACT_FROM: 'form@example.test', CONTACT_TO: 'inbox@example.test', SITE_NAME: 'FlyingStars' };
const fields = { name: 'Testperson', email: 'test@example.test', anlass: 'unternehmen', ort: 'Essen', 'datum-offen': 'ja', message: 'Nur eine Testnachricht.' };
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
  // Ohne JavaScript: keine Weiterleitung auf „Wir haben eure Anfrage erhalten“, sondern eine lesbare Seite am Formularziel.
  const response = await post(request({}, { accept: 'text/html', referer: 'https://site.example.test/en/kontakt/?text=privat' }), {});
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('location'), null);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  const html = await response.text();
  assert.match(html, /<html lang="de">/); // Sprache folgt dem gesendeten Formularfeld, nicht dem Referrer
  assert.match(html, /Es wurde nichts gesendet/);
  assert.doesNotMatch(html, /Anfrage erhalten/);
  assert.match(html, /href="\/en\/kontakt\/#anfrage"/); // zurück zum Formular, ohne privaten Query-Entwurf
  assert.match(html, /href="mailto:team@flyingstars\.art"/);
});

test('Ohne JavaScript erscheinen Fehler als lesbare Seite mit Statuscode statt als JSON', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('vertraulich', { status: 500 }));
  const invalid = await post(request({ email: 'ungültig', locale: 'nl' }, { accept: 'text/html' }));
  assert.equal(invalid.status, 400);
  const html = await invalid.text();
  assert.match(html, /<html lang="nl">/);
  assert.match(html, /Ongeldig e-mailadres\./);
  assert.match(html, /<h1>De aanvraag kon niet worden verstuurd\.<\/h1>/);
  const failed = await post(request({}, { accept: 'text/html' }));
  assert.equal(failed.status, 502);
  const text = await failed.text();
  assert.ok(!text.includes('vertraulich'));
  assert.ok(!text.includes('<script'));
  assert.equal((await post(request({}, { accept: 'text/html' }))).headers.get('content-security-policy')?.startsWith("default-src 'none'"), true);
});

test('Erfolg ohne JavaScript: Anfrage auf die Danke-Seite der Sprache, Herkunftsantwort als eigene Bestätigungsseite', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 201 }));
  // Die Danke-Seite zeigt Dank und Herkunftsfrage immer (Marc, 19.11.2026); kein signierter Link, kein Zustand „gesendet“
  for (const [locale, path] of [['de', '/danke/'], ['en', '/en/danke/'], ['nl', '/nl/danke/']]) {
    const inquiry = await post(request({ locale }, { accept: 'text/html' }));
    assert.equal(inquiry.status, 303);
    assert.equal(inquiry.headers.get('cache-control'), 'no-store');
    assert.equal(inquiry.headers.get('location'), 'https://site.example.test' + path);
  }
  // Honeypot ohne Versandkonfiguration: derselbe Weg, keine Mail
  const unsigned = await onRequestPost({ request: new Request('https://site.example.test/api/contact', { method: 'POST', body: new URLSearchParams({ ...fields, website: 'bot' }), headers: { accept: 'text/html' } }), env: {} });
  assert.equal(unsigned.status, 303);
  assert.equal(unsigned.headers.get('location'), 'https://site.example.test/danke/');
  const answer = (values, headers = {}) => new Request('https://site.example.test/api/contact', { method: 'POST', body: new URLSearchParams({ kind: 'quelle', locale: 'de', ref: '', ...values }), headers: { accept: 'text/html', ...headers } });
  const sent = await post(answer({ quelle: 'linkedin' }));
  // Kein frei aufrufbares Sprungziel: die Bestätigung kommt nur aus der Versandantwort selbst.
  assert.equal(sent.status, 200);
  assert.equal(sent.headers.get('location'), null);
  const html = await sent.text();
  assert.match(html, /<h1>Eure Antwort ist angekommen\.<\/h1>/);
  assert.match(html, /Danke, das hilft uns sehr!/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /Zurück zum Formular|nicht gesendet/);
  const nl = await post(answer({ quelle: 'ki', locale: 'nl' }));
  assert.match(await nl.text(), /<html lang="nl">[\s\S]*href="\/nl\/"/);
});

test('Herkunftsfrage: Freitext gehört nur zu „Andere“, ein Rest aus einer vorherigen Wahl wird verworfen', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push(JSON.parse(init.body)); return new Response('{}', { status: 201 }); });
  const answer = (values) => new Request('https://site.example.test/api/contact', { method: 'POST', body: new URLSearchParams({ kind: 'quelle', locale: 'de', ref: '', ...values }), headers: { accept: 'application/json' } });
  // Wechsel von „Andere“ mit Text zu LinkedIn (ohne JavaScript bleibt der Text im Formular): gültig, ohne Freitext
  assert.deepEqual(await (await post(answer({ quelle: 'linkedin', 'quelle-text': 'Messe in Köln' }))).json(), { ok: true, state: 'sent' });
  assert.match(calls.at(-1).textContent, /quelle: linkedin\n/);
  assert.doesNotMatch(calls.at(-1).textContent, /freitext|Messe/);
  // Ein ungültiger Rest blockiert die feste Auswahl ebenfalls nicht
  assert.equal((await post(answer({ quelle: 'instagram', 'quelle-text': 'x'.repeat(500) }))).status, 200);
  // Bei „Andere“ geht der Text mit und bleibt geprüft
  assert.equal((await post(answer({ quelle: 'andere', 'quelle-text': 'Messe in Köln' }))).status, 200);
  assert.match(calls.at(-1).textContent, /freitext: Messe in Köln/);
  assert.equal((await post(answer({ quelle: 'andere', 'quelle-text': 'x'.repeat(500) }))).status, 400);
  assert.equal((await post(answer({ quelle: 'andere', 'quelle-text': 'a\u0007b' }))).status, 400);
  assert.equal(calls.length, 3);
});

test('Herkunftsfrage: Auswahl ist Pflicht, Erfolg nur nach bestätigtem Versand', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{}', { status: 201 }); });
  const answer = (values, headers = { accept: 'application/json' }) => new Request('https://site.example.test/api/contact', { method: 'POST', body: new URLSearchParams({ kind: 'quelle', locale: 'de', ref: 'a1b2c3d4e5f6', ...values }), headers });
  const missing = await post(answer({}));
  assert.equal(missing.status, 400);
  assert.deepEqual(await missing.json(), { ok: false, detail: 'Bitte wählt eine Antwort aus.' });
  assert.deepEqual(await (await post(answer({ quelle: 'ki' }), {})).json(), { ok: true, state: 'not-configured' });
  assert.equal(calls, 0);
  assert.deepEqual(await (await post(answer({ quelle: 'ki' }))).json(), { ok: true, state: 'sent' });
  assert.equal(calls, 1);
  const unconfigured = await post(answer({ quelle: 'ki' }, { accept: 'text/html' }), {});
  assert.equal(unconfigured.status, 503);
  const html = await unconfigured.text();
  assert.match(html, /<h1>Eure Antwort wurde nicht gesendet\.<\/h1>/);
  assert.match(html, /href="\/danke\/#danke"/);
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
  // GET ohne signierten Danke-Link bleibt abgelehnt
  const get = await onRequestGet({ request: new Request('https://site.example.test/api/contact'), env });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
});

test('Herkunftsantwort ohne Bezug (direkter Aufruf der Danke-Seite) wird angenommen und als solche gekennzeichnet', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push(JSON.parse(init.body)); return new Response('{}', { status: 201 }); });
  const answer = (values) => new Request('https://site.example.test/api/contact', { method: 'POST', body: new URLSearchParams({ kind: 'quelle', locale: 'de', ...values }), headers: { accept: 'application/json' } });
  assert.deepEqual(await (await post(answer({ quelle: 'instagram' }))).json(), { ok: true, state: 'sent' }); // ohne Feld ref
  assert.deepEqual(await (await post(answer({ quelle: 'linkedin', ref: '' }))).json(), { ok: true, state: 'sent' }); // leeres ref
  assert.equal(calls.length, 2);
  assert.equal(calls[0].subject, 'Quelle zur Anfrage über FlyingStars');
  assert.match(calls[0].textContent, /ref: ohne Bezug/);
  assert.equal((await post(answer({ quelle: 'ki', ref: 'kein-bezug' }))).status, 400); // ein gesetzter Bezug bleibt geprüft
  // GET bleibt abgelehnt, auch mit einem Link aus der früheren Fassung
  const old = await onRequestGet({ request: new Request('https://site.example.test/api/contact?danke=1.abc&sprache=en'), env });
  assert.equal(old.status, 405);
});
