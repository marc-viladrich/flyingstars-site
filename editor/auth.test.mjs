import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {Duplex} from 'node:stream';
import vm from 'node:vm';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {randomUUID, scrypt as scryptCallback} from 'node:crypto';
import sharp from 'sharp';
import {EditorAuth, COOKIE_NAME, PASSWORD_PARAMS, hashPassword, verifyPassword, loadAccounts, assertPrivateAccountsPath} from './auth.mjs';
import {manageAccounts, writeAccounts} from './manage-accounts.mjs';
import {startNativeServers} from './server.mjs';
import {git} from './native-store.mjs';

const run = promisify(execFile), scrypt = promisify(scryptCallback), here = path.dirname(fileURLToPath(import.meta.url));
const password = 'Testpasswort äöü 123';
const identity = {id: 'test-marc', username: 'marc', displayName: 'Marc Viladrich', email: 'marc@example.invalid', disabled: false, passwordVersion: 1};
const req = (cookie, ip = '127.0.0.1') => ({headers: {cookie}, socket: {remoteAddress: ip}});
const cookiePair = cookie => cookie.split(';')[0];
let hashed;
async function account() { hashed ||= await hashPassword(password); return {...identity, ...hashed}; }
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-auth-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'private/accounts.json');
  await writeAccounts(file, {version: 1, users: [await account()]});
  return {dir, file};
}

test('scrypt uses the chosen cost, random 16-byte salts and a 64-byte constant-time verifiable hash', async () => {
  const one = await hashPassword(password), two = await hashPassword(password);
  assert.deepEqual(one.params, PASSWORD_PARAMS); assert.equal(one.salt.length, 32); assert.equal(one.hash.length, 128); assert.notEqual(one.salt, two.salt);
  const expected = await scrypt(password, Buffer.from(one.salt, 'hex'), 64, {...PASSWORD_PARAMS, maxmem: 64 * 1024 * 1024});
  assert.equal(one.hash, expected.toString('hex'));
  assert.equal(await verifyPassword(password, one), true);
  assert.equal(await verifyPassword('wrong', one), false);
  assert.equal(await verifyPassword(password, null), false);
  assert.equal(await verifyPassword(password, {...one, disabled: true}), false);
  await assert.rejects(hashPassword(''), /Passwort/);
});

test('scrypt admits one derivation plus eight waiting and rejects excess work', async () => {
  const user = await account();
  const results = await Promise.allSettled(Array.from({length: 10}, () => verifyPassword(password, user)));
  assert.equal(results.filter(result => result.status === 'fulfilled' && result.value).length, 9);
  const rejected = results.filter(result => result.status === 'rejected');
  assert.equal(rejected.length, 1); assert.equal(rejected[0].reason.status, 429);
});

test('signed cookies reject malformed, duplicated and tampered values; login rotates and logout revokes', async t => {
  const {file} = await fixture(t), auth = await new EditorAuth({file}).init();
  const first = auth.createSession(await account()), cookie = cookiePair(first.cookie);
  assert.match(first.cookie, /Path=\/; HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await auth.session(req(cookie))).user.id, identity.id);
  const [key, value] = cookie.split('='), [id, signature] = value.split('.');
  for (const invalid of [`${key}=broken`, `${key}=${id}.${signature.slice(0, -1)}${signature.endsWith('0') ? '1' : '0'}`, `${key}=${'0'.repeat(64)}.${signature}`, `${cookie}; ${cookie}`]) assert.equal(await auth.session(req(invalid)), null);
  const second = auth.createSession(await account(), req(cookie));
  assert.notEqual(first.session.id, second.session.id); assert.equal(await auth.session(req(cookie)), null);
  const logout = auth.destroySession(req(cookiePair(second.cookie)));
  assert.match(logout, /Max-Age=0/); assert.equal(await auth.session(req(cookiePair(second.cookie))), null);
  const active = cookiePair(auth.createSession(await account()).cookie); assert.ok(await auth.session(req(active)));
  assert.equal(await new EditorAuth({file, secret: auth.secret}).init().then(fresh => fresh.session(req(active))), null);
});

test('clock injection proves the two-hour idle and twelve-hour absolute expiry', async t => {
  const {file} = await fixture(t); let now = 0;
  const auth = await new EditorAuth({file, clock: () => now}).init(), user = await account();
  let cookie = cookiePair(auth.createSession(user).cookie);
  now = 2 * 60 * 60 * 1000; assert.equal(await auth.session(req(cookie)), null);
  cookie = cookiePair(auth.createSession(user).cookie);
  for (let hour = 1; hour < 12; hour++) { now += 60 * 60 * 1000; assert.ok(await auth.session(req(cookie))); }
  now += 60 * 60 * 1000; assert.equal(await auth.session(req(cookie)), null);
});

test('account CLI creates mode-0600 files, lists safely, resets passwords and disables with immediate revocation', async t => {
  const {dir} = await fixture(t), file = path.join(dir, 'cli/accounts.json');
  const cli = async args => run(process.execPath, [path.join(here, 'manage-accounts.mjs'), ...args], {env: {...process.env, EDITOR_ACCOUNTS: file, EDITOR_NEW_PASSWORD: password}});
  assert.match((await cli(['add', 'Marc', '--name', identity.displayName, '--email', identity.email])).stdout, /angelegt/);
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  let data = await loadAccounts(file); assert.equal(data.users[0].username, 'marc'); assert.equal(await verifyPassword(password, data.users[0]), true);
  const listing = (await cli(['list'])).stdout; assert.match(listing, /marc\tMarc Viladrich/); assert.ok(!listing.includes(data.users[0].hash));
  const auth = await new EditorAuth({file}).init(); let cookie = cookiePair(auth.createSession(data.users[0]).cookie);
  await cli(['passwd', 'marc']); assert.equal(await auth.session(req(cookie)), null);
  data = await loadAccounts(file); assert.equal(data.users[0].passwordVersion, 2);
  cookie = cookiePair(auth.createSession(data.users[0]).cookie); await cli(['disable', 'marc']);
  assert.equal(await auth.session(req(cookie)), null); assert.equal((await loadAccounts(file)).users[0].disabled, true);
  assert.equal((await fs.readdir(path.dirname(file))).length, 1);
  await assert.rejects(cli(['add', 'marc', '--name', 'Duplicate', '--email', identity.email]));
});

test('credentials cannot be stored under source, webroots or symlinks to them; malformed accounts fail closed', async t => {
  const {dir, file} = await fixture(t);
  for (const blocked of ['source', 'web', 'runtime', 'runtime-public', 'preview']) await assert.rejects(assertPrivateAccountsPath(path.join(here, blocked, 'accounts.json'), [path.dirname(here)]), /außerhalb/);
  const link = path.join(dir, 'web-link'); await fs.symlink(path.join(here, 'web'), link);
  await assert.rejects(assertPrivateAccountsPath(path.join(link, 'accounts.json'), [path.dirname(here)]), /außerhalb/);
  const data = await loadAccounts(file); data.users[0].params.N = 2 ** 20;
  await fs.writeFile(file, JSON.stringify(data)); await assert.rejects(new EditorAuth({file}).init(), /Ungültiger Eintrag/);
  await fs.writeFile(file, '{"private-value"'); await assert.rejects(loadAccounts(file), error => error.message === 'Ungültiges JSON in der Kontodatei.');
  await assert.rejects(manageAccounts(['add', 'a', '--name', 'A\nInjected', '--email', identity.email], {file: path.join(dir, 'bad.json'), password: async () => password, print: () => {}}), /Ungültiger Eintrag/);
});

test('five failures trigger Retry-After; username and IP limits are independent and cooldown doubles', async t => {
  const {file} = await fixture(t); let now = 100;
  const auth = await new EditorAuth({file, clock: () => now}).init();
  for (let i = 0; i < 4; i++) await assert.rejects(auth.login({username: 'unknown', password}, req()), error => error.status === 401);
  await assert.rejects(auth.login({username: 'unknown', password}, req()), error => error.status === 429 && error.retryAfter === 900);
  assert.throws(() => auth.checkLoginLimit('other', '127.0.0.1'), error => error.status === 429);
  assert.throws(() => auth.checkLoginLimit('unknown', 'another-ip'), error => error.status === 429);
  now += 900_000; auth.checkLoginLimit('unknown', '127.0.0.1');
  for (let i = 0; i < 4; i++) await assert.rejects(auth.login({username: 'unknown', password}, req()), error => error.status === 401);
  await assert.rejects(auth.login({username: 'unknown', password}, req()), error => error.status === 429 && error.retryAfter === 1800);
  assert.throws(() => auth.checkLoginLimit('unknown', 'another-ip'), error => error.retryAfter === 1800);
  // Capacity saturation rejects new keys rather than evicting active throttles.
  const full = new EditorAuth({file, clock: () => now});
  for (let i = 0; i < 4096; i++) full.failedLogin('u' + i, 'ip' + i);
  assert.throws(() => full.checkLoginLimit('new', 'new'), error => error.status === 429);
  assert.equal(full.userLimits.size, 4096); assert.equal(full.ipLimits.size, 4096);
  now += 24 * 60 * 60 * 1000; full.checkLoginLimit('new', 'new'); assert.equal(full.userLimits.size, 0);
});

test('CLI startup with auth enabled refuses missing credentials before starting builds or listeners', async t => {
  const {dir} = await fixture(t);
  await assert.rejects(run(process.execPath, [path.join(here, 'server.mjs')], {env: {...process.env, EDITOR_AUTH: 'on', EDITOR_ACCOUNTS: path.join(dir, 'missing.json'), RELAUNCH_PREVIEW: '0'}}), error => error.code === 1 && /manage-accounts.mjs add/.test(error.stderr));
});

test('the actual login script keeps redirects on-origin and reports errors as text', async () => {
  const script = await fs.readFile(path.join(here, 'web/login.js'), 'utf8');
  for (const [next, expected] of [[null, '/editor/'], ['/editor/?page=%2Fpreise%2F', '/editor/?page=%2Fpreise%2F'], ['https://evil.example/', '/editor/'], ['//evil.example/', '/editor/'], ['/\\evil.example/', '/editor/'], ['/editor/login', '/editor/'], ['/\nevil.example/', '/editor/']]) {
    let submit, assigned;
    const form = {elements: {username: {value: 'marc'}, password: {value: password, focus() {}}}, querySelector: () => ({}), addEventListener: (_type, callback) => { submit = callback; }};
    const message = {}, location = {origin: 'https://editor.example', href: 'https://editor.example/editor/login' + (next === null ? '' : '?next=' + encodeURIComponent(next)), assign: value => { assigned = value; }};
    vm.runInNewContext(script, {URL, location, document: {querySelector: selector => selector === '#login-form' ? form : message}, fetch: async () => ({ok: true, json: async () => ({})})});
    await submit({preventDefault() {}}); assert.equal(assigned, expected); assert.equal(form.elements.password.value, '');
  }
  let submit;
  const message = {}, form = {elements: {username: {value: 'marc'}, password: {value: password, focus() {}}}, querySelector: () => ({}), addEventListener: (_type, callback) => { submit = callback; }};
  vm.runInNewContext(script, {URL, document: {querySelector: selector => selector === '#login-form' ? form : message}, fetch: async () => ({ok: false, json: async () => ({error: '<script>unsafe</script>'})})});
  await submit({preventDefault() {}}); assert.equal(message.textContent, '<script>unsafe</script>'); assert.equal(message.hidden, false);
});

let socketless = false;
async function ports(t) {
  const servers = [http.createServer(), http.createServer()];
  try {
    await Promise.all(servers.map(server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); })));
    return servers.map(server => server.address().port);
  } catch (error) {
    if (error.code !== 'EPERM') throw error;
    socketless = true; t.diagnostic('Sandbox blocks TCP listen: exercising the actual HTTP handler with Node IncomingMessage/ServerResponse over an in-memory stream.');
    return [45420, 45421];
  } finally { await Promise.all(servers.filter(server => server.listening).map(server => new Promise(resolve => server.close(resolve)))); }
}
// Same Node request/response classes and routing, without a TCP port when the sandbox forbids it.
async function request(server, origin, route, options = {}) {
  // Real listeners through node:http: fetch() would silently drop the Host header the server checks.
  if (!socketless) return new Promise((resolve, reject) => {
    const target = new URL(route, origin);
    const outgoing = http.request({hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: options.method || 'GET', headers: {...(options.headers || {})}}, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers)) for (const item of [].concat(value)) headers.append(key, String(item));
        resolve(new Response(options.method === 'HEAD' || [204, 304].includes(response.statusCode) ? null : Buffer.concat(chunks), {status: response.statusCode, headers}));
      });
    });
    outgoing.on('error', reject);
    if (options.body) outgoing.write(Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body));
    outgoing.end();
  });
  const chunks = [], socket = new Duplex({read() {}, write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); }});
  socket.remoteAddress = '127.0.0.1';
  const incoming = new http.IncomingMessage(socket);
  incoming.method = options.method || 'GET'; incoming.url = route; incoming.complete = true; incoming.httpVersion = '1.0'; incoming.httpVersionMajor = 1; incoming.httpVersionMinor = 0;
  incoming.headers = {host: new URL(origin).host, ...Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value]))};
  if (options.body) incoming.push(Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body)); incoming.push(null);
  const outgoing = new http.ServerResponse(incoming); outgoing.assignSocket(socket);
  return new Promise((resolve, reject) => {
    outgoing.once('error', reject);
    outgoing.once('finish', () => {
      const bytes = Buffer.concat(chunks), offset = bytes.indexOf('\r\n\r\n') + 4;
      const headers = new Headers(Object.entries(outgoing.getHeaders()).map(([key, value]) => [key, String(value)]));
      resolve(new Response(incoming.method === 'HEAD' ? null : bytes.subarray(offset), {status: outgoing.statusCode, headers})); socket.destroy();
    });
    server.emit('request', incoming, outgoing);
  });
}
async function cachedArtifact(dir, runtimeName, head, origin, editor) {
  const base = path.join(dir, runtimeName, head), site = path.join(base, 'site');
  for (const name of ['index.html', 'show-konfigurator/index.html', 'drohnenshow-preise/index.html']) {
    await fs.mkdir(path.dirname(path.join(site, name)), {recursive: true});
    await fs.writeFile(path.join(site, name), '<!doctype html><html><body>Cached site</body></html>');
  }
  await fs.writeFile(path.join(site, 'asset.js'), 'console.log("asset")');
  await fs.writeFile(path.join(base, 'ready.json'), JSON.stringify({head, origin, editor}));
}

test('real HTTP listeners enforce authentication, CSRF and account-authored Git mutations', {timeout: 180_000}, async t => {
  const {dir, file} = await fixture(t), source = path.join(dir, 'source'), [port, publicPort] = await ports(t);
  await git(here, ['clone', '--quiet', '--no-hardlinks', path.join(here, '..'), source]);await git(source,['checkout','-B','content/draft']);
  await fs.symlink(await fs.realpath(path.join(here, '../node_modules')), path.join(source, 'node_modules'));
  const head = await git(source, ['rev-parse', 'content/draft']), main = head;
  await cachedArtifact(dir, 'runtime', head, 'http://127.0.0.1:' + port, true);
  await cachedArtifact(dir, 'runtime-public', main, 'http://127.0.0.1:' + publicPort, false);
  let now = Date.now();
  const servers = await startNativeServers({remote:false,source, runtimeRoot: dir, port, publicPort, listen: !socketless, auth: {file, clock: () => now}});
  // Auth integration uses real Git commits and NativeBuilder activation with cached static fixtures.
  // Full Astro compilation is exercised by native-builder.test.mjs, independently of authentication.
  const build = servers.builder.build.bind(servers.builder);
  servers.builder.build = async head => { await cachedArtifact(dir, 'runtime', head, servers.origin, true); return build(head); };
  t.after(async () => { await Promise.all([servers.editor, servers.publicServer].map(server => new Promise(resolve => server.close(resolve)))); });
  const call = (route, options = {}) => request(servers.editor, servers.origin, route, options);
  const publicCall = (route, options = {}) => request(servers.publicServer, servers.publicOrigin, route, options);
  const post = (route, data, headers = {}) => call(route, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: servers.origin, ...headers}, body: JSON.stringify(data)});
  let cookie, csrf;

  await t.test('all private API and asset routes deny anonymous requests; iframe and shell redirect', async () => {
    for (const route of ['/editor/api/state', '/editor/api/media', '/editor/api/review', '/editor/api/translation', '/editor/api/session', '/editor/editor.js', '/editor/frame.js', '/editor/ui-icons.mjs', '/editor/site-lib/inline-text.mjs', '/editor/site-lib/editorial-text.mjs', '/editor/shared/draft.mjs', '/editor/marked.mjs', '/editor/package-ids.mjs', '/editor/package-ownership.mjs', '/asset.js', '/_image?href=x', '/@fs/private-file']) {
      const response = await call(route); assert.equal(response.status, 401, route); assert.deepEqual(await response.json(), {error: 'Nicht angemeldet.'});
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.equal(response.headers.get('referrer-policy'), 'same-origin'); assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    for (const route of ['/', '/?editor=1', '/editor/', '/editor/index.html', '/editor/login.html', '/drohnenshow-preise/?editor=1']) {
      const response = await call(route); assert.equal(response.status, 302, route); assert.equal(response.headers.get('location'), '/editor/login?next=' + encodeURIComponent(route));
    }
    for (const route of ['save', 'publish', 'translate', 'translate-missing', 'preview', 'media', 'logout']) assert.equal((await post('/editor/api/' + route, {})).status, 401, route);
    assert.equal((await call('/editor/api/save', {method: 'POST'})).status, 401);
    assert.equal((await call('/editor/api/state', {method: 'HEAD'})).status, 401);
    assert.equal(await git(source, ['rev-parse', 'content/draft']), head);
  });

  await t.test('login page and essential assets stay accessible, the public listener stays public', async () => {
    const response = await call('/editor/login?next=%2Feditor%2F'); assert.equal(response.status, 200);
    const html = await response.text(); assert.match(html, /id="login"/); assert.match(html, /autocomplete="current-password"/);
    assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'none'");
    for (const asset of ['login.js', 'editor.css']) assert.equal((await call('/editor/' + asset)).status, 200);
    assert.equal((await publicCall('/')).status, 200);
    assert.equal((await publicCall('/', {method: 'POST'})).status, 405);
    const host = await call('/editor/login', {headers: {Host: 'evil.example'}}); assert.equal(host.status, 403); assert.equal(host.headers.get('x-content-type-options'), 'nosniff');
  });

  await t.test('login requires exact Origin and JSON, wrong credentials and throttling are generic', async () => {
    assert.equal((await post('/editor/api/login', {username: 'marc', password}, {Origin: 'https://evil.example'})).status, 403);
    assert.equal((await post('/editor/api/login', {username: 'marc', password}, {Origin: ''})).status, 403);
    assert.equal((await post('/editor/api/login', {username: 'marc', password}, {'Content-Type': 'text/plain'})).status, 415);
    assert.equal((await post('/editor/api/login', {username: 'marc', password}, {'Content-Type': 'application/jsonp'})).status, 415);
    assert.equal((await post('/editor/api/login', null)).status, 400);
    for (let i = 0; i < 4; i++) { const response = await post('/editor/api/login', {username: 'unknown', password}); assert.equal(response.status, 401); assert.deepEqual(await response.json(), {error: 'Benutzername oder Passwort ist falsch.'}); }
    const limited = await post('/editor/api/login', {username: 'unknown', password}); assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '900');
    now += 900_000;
    const response = await post('/editor/api/login', {username: 'Marc', password}); assert.equal(response.status, 200);
    cookie = cookiePair(response.headers.get('set-cookie')); assert.ok(cookie.startsWith(servers.auth.cookieName + '='));
    // Loopback over http: no Secure (Safari would drop the cookie and the login would loop), still HttpOnly and SameSite=Strict.
    assert.equal(servers.auth.cookieName, 'fs_editor'); assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/); assert.doesNotMatch(response.headers.get('set-cookie'), /Secure/);
    const result = await response.json(); assert.deepEqual(result.user, {id: identity.id, username: identity.username, displayName: identity.displayName}); csrf = result.csrf;
    const session = await call('/editor/api/session', {headers: {Cookie: cookie}}); assert.equal(session.status, 200); assert.deepEqual(await session.json(), result);
  });

  await t.test('every authenticated POST including upload and translations rejects missing/wrong CSRF and Origin', async () => {
    for (const route of ['save', 'publish', 'translate', 'translate-missing', 'preview', 'media', 'logout', 'future-route']) {
      for (const token of [undefined, 'wrong']) {
        const response = await post('/editor/api/' + route, {}, {Cookie: cookie, ...token ? {'X-CSRF-Token': token} : {}}); assert.equal(response.status, 403, route);
      }
      assert.equal((await post('/editor/api/' + route, {}, {Cookie: cookie, 'X-CSRF-Token': csrf, Origin: 'https://evil.example'})).status, 403, route);
      assert.equal((await post('/editor/api/' + route, {}, {Cookie: cookie, 'X-CSRF-Token': csrf, Origin: ''})).status, 403, route);
    }
    assert.equal(await git(source, ['rev-parse', 'content/draft']), head);
  });

  await t.test('authenticated shell and iframe have distinct frame-ancestors policies, API session exposes no credentials', async () => {
    const shell = await call('/editor/', {headers: {Cookie: cookie}}); assert.equal(shell.status, 200); assert.equal(shell.headers.get('content-security-policy'), "frame-ancestors 'none'");
    const frame = await call('/?editor=1', {headers: {Cookie: cookie}}); assert.equal(frame.status, 200); assert.equal(frame.headers.get('content-security-policy'), "frame-ancestors 'self'"); assert.match(await frame.text(), /\/editor\/frame.js/);
    const result = await (await call('/editor/api/session', {headers: {Cookie: cookie}})).json(); assert.deepEqual(Object.keys(result).sort(), ['csrf', 'user']); assert.deepEqual(Object.keys(result.user).sort(), ['displayName', 'id', 'username']);
  });

  await t.test('login → session → save succeeds with CSRF and Git author comes only from the account', async () => {
    const state = await (await call('/editor/api/state', {headers: {Cookie: cookie}})).json(), pkg = state.records.find(record => record.id === 'package/spark');
    const request = {expectedHead: state.head, requestId: randomUUID(), actor: {name: 'Spoofed', email: 'spoofed@example.invalid'}, changes: [{id: pkg.id, expectedRevision: pkg.revision, patches: [{path: ['price'], value: pkg.data.price + 1}]}]};
    const response = await post('/editor/api/save', request, {Cookie: cookie, 'X-CSRF-Token': csrf}); assert.equal(response.status, 200);
    const saved = await response.json(); assert.notEqual(saved.head, state.head); assert.equal(saved.activeHead, saved.head); assert.equal(saved.buildError, undefined);
    assert.equal(await git(source, ['show', '-s', '--format=%an <%ae>%n%cn', saved.head]), 'Marc Viladrich <marc@example.invalid>\nFlyingStars Editor');
    const replay = await post('/editor/api/save', request, {Cookie: cookie, 'X-CSRF-Token': csrf}); assert.equal((await replay.json()).replayed, true);
    const data = await loadAccounts(file), other = {...await account(), id: 'test-other', username: 'other', displayName: 'Other editor', email: 'other@example.invalid'};
    data.users.push(other); await writeAccounts(file, data);
    const otherSession = servers.auth.createSession(other);
    const foreignReplay = await post('/editor/api/save', request, {Cookie: cookiePair(otherSession.cookie), 'X-CSRF-Token': otherSession.session.csrf});
    assert.equal(foreignReplay.status, 409); assert.equal(await servers.store.head(), saved.head);
  });

  await t.test('media upload forwards the actor and a publication records it without fabricating a commit', async () => {
    const bytes = await sharp({create: {width: 8, height: 8, channels: 3, background: '#123456'}}).png().toBuffer();
    const expectedHead = await servers.store.head();
    const response = await call('/editor/api/media', {method: 'POST', headers: {Origin: servers.origin, Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'image/png', 'X-Filename': 'Proof.png', 'X-Expected-Head': expectedHead, 'X-Request-Id': randomUUID()}, body: bytes});
    assert.equal(response.status, 200); const uploaded = await response.json(); assert.equal(uploaded.state.buildError, undefined); assert.notEqual(uploaded.state.head, expectedHead);
    assert.equal(await git(source, ['show', '-s', '--format=%an <%ae>%n%cn', uploaded.state.head]), 'Marc Viladrich <marc@example.invalid>\nFlyingStars Editor');
    // Use the actual cached immutable artifact to keep this publication check focused on auth.
    await cachedArtifact(dir, 'runtime-public', uploaded.state.head, servers.publicOrigin, false);
    const review = await (await call('/editor/api/review', {headers: {Cookie: cookie}})).json();
    const published = await post('/editor/api/publish', {expectedHead: review.draftHead, expectedPublishedHead: review.publishedHead, requestId: randomUUID()}, {Cookie: cookie, 'X-CSRF-Token': csrf});
    assert.equal(published.status, 200); assert.deepEqual((await published.json()).actor, {name: identity.displayName, email: identity.email});
    assert.equal(await git(source, ['rev-parse', 'main']), uploaded.state.head);
  });

  await t.test('logout revokes; expiry requires login; the public output remains accessible', async () => {
    const response = await post('/editor/api/logout', {}, {Cookie: cookie, 'X-CSRF-Token': csrf}); assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal((await call('/editor/api/session', {headers: {Cookie: cookie}})).status, 401);
    const login = await post('/editor/api/login', {username: 'marc', password}); cookie = cookiePair(login.headers.get('set-cookie'));
    now += 2 * 60 * 60 * 1000;
    assert.equal((await call('/editor/api/state', {headers: {Cookie: cookie}})).status, 401);
    assert.equal((await publicCall('/')).status, 200);
  });
});

test('programmatic server default keeps auth off and session bootstrap advertises that mode', async t => {
  const {dir} = await fixture(t), source = path.join(dir, 'source'), [port, publicPort] = await ports(t);
  await git(here, ['clone', '--quiet', '--no-hardlinks', path.join(here, '..'), source]);await git(source,['checkout','-B','content/draft']);
  await fs.symlink(await fs.realpath(path.join(here, '../node_modules')), path.join(source, 'node_modules'));
  const head = await git(source, ['rev-parse', 'content/draft']), main = head;
  await cachedArtifact(dir, 'runtime', head, 'http://127.0.0.1:' + port, true);
  await cachedArtifact(dir, 'runtime-public', main, 'http://127.0.0.1:' + publicPort, false);
  const servers = await startNativeServers({remote:false,source, runtimeRoot: dir, port, publicPort, listen: !socketless});
  t.after(async () => { await Promise.all([servers.editor, servers.publicServer].map(server => new Promise(resolve => server.close(resolve)))); });
  assert.equal((await request(servers.editor, servers.origin, '/editor/api/state')).status, 200);
  assert.deepEqual(await (await request(servers.editor, servers.origin, '/editor/api/session')).json(), {user: null, csrf: null});
});

test('over HTTPS the session cookie is __Host- prefixed and Secure', async () => {
  const auth = new EditorAuth({secure: true});
  assert.equal(auth.cookieName, COOKIE_NAME);
  assert.match(auth.cookieAttributes, /Secure; SameSite=Strict/);
});
