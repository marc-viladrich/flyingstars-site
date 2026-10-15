import {promises as fs} from 'node:fs';
import path from 'node:path';
import {scrypt, randomBytes, createHmac, timingSafeEqual} from 'node:crypto';

export const PASSWORD_PARAMS = Object.freeze({N: 2 ** 15, r: 8, p: 1, keylen: 64});
export const COOKIE_NAME = '__Host-fs_editor';
// Without HTTPS (local loopback) browsers like Safari drop Secure cookies, and __Host- requires Secure.
export const LOCAL_COOKIE_NAME = 'fs_editor';
const MAXMEM = 64 * 1024 * 1024, IDLE = 12 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000, REMEMBER = 30 * DAY, RENEWAL_GRACE = 30 * 1000;
const WINDOW = 15 * 60 * 1000, MAX_BUCKETS = 4096;
const error = (message, status = 400, retryAfter) => Object.assign(new Error(message), {status, retryAfter});
export const normalizeUsername = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validUsername = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value);
const validIdentity = (name, email) => typeof name === 'string' && name.trim().length > 0 && name.length <= 200 && !/[\x00-\x1f\x7f<>]/.test(name) && typeof email === 'string' && email.length <= 254 && /^[^\s<>\x00-\x1f\x7f@]+@[^\s<>\x00-\x1f\x7f@]+$/.test(email);
const inside = (file, dir) => file === dir || file.startsWith(dir + path.sep);

// Resolve existing ancestors too, so a symlink cannot put credentials into a webroot.
async function canonical(file) {
  try { return await fs.realpath(file); }
  catch (e) { if (e.code !== 'ENOENT') throw e; const parent = path.dirname(file); if (parent === file) throw e; return path.join(await canonical(parent), path.basename(file)); }
}
export async function assertPrivateAccountsPath(file, forbiddenRoots = []) {
  const actual = await canonical(path.resolve(file));
  const blocked = forbiddenRoots;
  for (const dir of blocked) if (inside(actual, await canonical(path.resolve(dir)))) throw error('Die Kontodatei muss außerhalb von Quellcode und Webroots liegen.');
  return actual;
}
export function validateAccounts(data) {
  if (data?.version !== 1 || !Array.isArray(data.users) || data.users.length > 1000) throw error('Ungültige Kontodatei.');
  const ids = new Set(), names = new Set();
  for (const user of data.users) {
    if (!user || typeof user.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(user.id) || ids.has(user.id) || !validUsername(user.username) || names.has(user.username) || !validIdentity(user.displayName, user.email) || typeof user.disabled !== 'boolean' || !/^[a-f0-9]{32}$/.test(user.salt) || !/^[a-f0-9]{128}$/.test(user.hash) || !Number.isSafeInteger(user.passwordVersion) || user.passwordVersion < 1 || !user.params || Object.entries(PASSWORD_PARAMS).some(([key, value]) => user.params[key] !== value)) throw error('Ungültiger Eintrag in der Kontodatei.');
    ids.add(user.id); names.add(user.username);
  }
  return data;
}
export async function loadAccounts(file) {
  const contents = await fs.readFile(file, 'utf8');
  let data; try { data = JSON.parse(contents); } catch { throw error('Ungültiges JSON in der Kontodatei.'); }
  return validateAccounts(data);
}

// One running scrypt per process and at most eight waiting derivations.
let running = false;
const waiting = [];
async function derive(password, salt, params = PASSWORD_PARAMS) {
  if (running) {
    if (waiting.length >= 8) throw error('Anmeldung ausgelastet. Bitte erneut versuchen.', 429, 1);
    await new Promise(resolve => waiting.push(resolve));
  } else running = true;
  try {
    return await new Promise((resolve, reject) => scrypt(password, Buffer.from(salt, 'hex'), params.keylen, {...params, maxmem: MAXMEM}, (e, result) => e ? reject(e) : resolve(result)));
  } finally {
    const next = waiting.shift(); if (next) next(); else running = false;
  }
}
const validPassword = password => typeof password === 'string' && Buffer.byteLength(password) > 0 && Buffer.byteLength(password) <= 1024;
export async function hashPassword(password) {
  if (!validPassword(password)) throw error('Passwort muss 1 bis 1024 UTF-8-Bytes lang sein.');
  const salt = randomBytes(16).toString('hex');
  return {salt, hash: (await derive(password, salt)).toString('hex'), params: {...PASSWORD_PARAMS}};
}
const dummy = {salt: randomBytes(16).toString('hex'), hash: randomBytes(64).toString('hex'), params: PASSWORD_PARAMS};
export async function verifyPassword(password, user) {
  if (!validPassword(password)) return false;
  const record = user || dummy;
  const actual = await derive(password, record.salt, record.params);
  const matches = timingSafeEqual(actual, Buffer.from(record.hash, 'hex'));
  return !!user && !user.disabled && matches;
}
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Never expose a partly written file, including the first generated signing secret.
async function writePrivate(file, contents, exclusive = false) {
  const temporary = path.join(path.dirname(file), '.auth-' + randomBytes(16).toString('hex') + '.tmp');
  try {
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(contents); await handle.sync(); }
    finally { await handle.close(); }
    if (exclusive) await fs.link(temporary, file);
    else await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, {force: true}); }
}

function storedSessions(data) {
  if (data?.version !== 1 || !Array.isArray(data.sessions) || data.sessions.length > MAX_BUCKETS) throw error('Ungültige Sitzungsdatei.');
  const sessions = new Map();
  const fields = ['tokenHash', 'userId', 'passwordVersion', 'csrf', 'createdAt', 'lastSeen', 'expiresAt', 'renewedAt', 'remember'];
  for (const record of data.sessions) {
    if (!record || Object.keys(record).length !== fields.length || Object.keys(record).some(key => !fields.includes(key))) throw error('Ungültiger Eintrag in der Sitzungsdatei.');
    const {tokenHash, ...session} = record;
    if (!/^[a-f0-9]{64}$/.test(tokenHash) || sessions.has(tokenHash) || !/^[a-zA-Z0-9_-]{1,100}$/.test(session.userId) || !/^[a-f0-9]{64}$/.test(session.csrf) || !Number.isSafeInteger(session.passwordVersion) || session.passwordVersion < 1 || typeof session.remember !== 'boolean' || ['createdAt', 'lastSeen', 'expiresAt', 'renewedAt'].some(key => !Number.isSafeInteger(session[key]) || session[key] < 0) || session.createdAt > session.renewedAt || session.renewedAt > session.lastSeen || session.lastSeen >= session.expiresAt) throw error('Ungültiger Eintrag in der Sitzungsdatei.');
    sessions.set(tokenHash, session);
  }
  return sessions;
}

export class EditorAuth {
  constructor({file, sessionDir, secret, clock = Date.now, secure = true} = {}) {
    if (secret !== undefined && Buffer.byteLength(secret) < 32) throw error('AFE_SESSION_SECRET (EDITOR_SESSION_SECRET) braucht mindestens 32 Bytes.');
    this.file = file; this.sessionDir = sessionDir; this.secret = secret; this.clock = clock;
    this.cookieName = secure ? COOKIE_NAME : LOCAL_COOKIE_NAME; this.cookieAttributes = 'Path=/; HttpOnly; ' + (secure ? 'Secure; ' : '') + 'SameSite=Strict';
    this.sessions = new Map(); this.userLimits = new Map(); this.ipLimits = new Map(); this.pending = Promise.resolve();
  }
  async init({forbiddenRoots = []} = {}) {
    this.file = await assertPrivateAccountsPath(this.file, forbiddenRoots);
    let accounts;
    try { accounts = await loadAccounts(this.file); }
    catch (e) {
      if (e.code === 'ENOENT') throw error('Kontodatei fehlt. Anlegen mit: node relaunch/manage-accounts.mjs add <username> --name "Anzeigename" --email name@example.org');
      throw e;
    }
    this.sessionDir = await assertPrivateAccountsPath(this.sessionDir || path.join(path.dirname(this.file), 'editor-session-state'), forbiddenRoots);
    this.sessionsFile = await assertPrivateAccountsPath(path.join(this.sessionDir, 'editor-sessions.json'), forbiddenRoots);
    const secretFile = await assertPrivateAccountsPath(path.join(this.sessionDir, 'editor-session-secret'), forbiddenRoots);
    if ([this.sessionsFile, secretFile].includes(this.file)) throw error('Konten und Sitzungen brauchen getrennte Dateien.');
    await fs.mkdir(this.sessionDir, {recursive: true, mode: 0o700});
    await fs.chmod(this.sessionDir, 0o700);
    if (this.secret === undefined) {
      try { await writePrivate(secretFile, randomBytes(32).toString('hex') + '\n', true); }
      catch (e) { if (e.code !== 'EEXIST') throw e; }
      const secret = await fs.readFile(secretFile, 'utf8');
      if (!/^[a-f0-9]{64}\n$/.test(secret)) throw error('Ungültiges Sitzungsgeheimnis.');
      await fs.chmod(secretFile, 0o600);
      this.secret = secret.trim();
    }
    try {
      const data = JSON.parse(await fs.readFile(this.sessionsFile, 'utf8'));
      const sessions = storedSessions(data);
      this.sessions = equal(data.keyId, this.signature('session-store')) ? sessions : new Map();
    }
    catch (e) { if (e.code !== 'ENOENT') throw error('Ungültige Sitzungsdatei.'); }
    this.pruneSessions(accounts);
    await this.persistSessions();
    return this;
  }
  tokenHash(id) { return createHmac('sha256', this.secret).update('session-token:' + id).digest('hex'); }
  async persistSessions() {
    await writePrivate(this.sessionsFile, JSON.stringify({version: 1, keyId: this.signature('session-store'), sessions: [...this.sessions].map(([tokenHash, session]) => ({tokenHash, ...session}))}) + '\n');
  }
  // A single editor process owns this state directory. Serialize read/modify/write and roll back failed writes.
  transaction(change) {
    const result = this.pending.then(async () => {
      const previous = this.sessions;
      this.sessions = new Map([...previous].map(([key, session]) => [key, {...session}]));
      try { const value = await change(); await this.persistSessions(); return value; }
      catch (e) { this.sessions = previous; throw e; }
    });
    this.pending = result.catch(() => {});
    return result;
  }
  pruneSessions(accounts) {
    const users = new Map(accounts.users.map(user => [user.id, user]));
    for (const [key, session] of this.sessions) {
      const user = users.get(session.userId);
      if (this.expired(session) || !user || user.disabled || user.passwordVersion !== session.passwordVersion) this.sessions.delete(key);
    }
  }
  revoke(id) {
    const session = id && this.sessions.get(this.tokenHash(id));
    if (session) for (const [key, candidate] of this.sessions) if (candidate.csrf === session.csrf) this.sessions.delete(key);
  }
  sessionCookie(id, remember) {
    return `${this.cookieName}=${id}.${this.signature(id)}; ${this.cookieAttributes}${remember ? '; Max-Age=' + REMEMBER / 1000 : ''}`;
  }
  signature(id) { return createHmac('sha256', this.secret).update(id).digest('hex'); }
  cookieId(req) {
    const values = String(req.headers.cookie || '').split(';').map(part => part.trim()).filter(part => part.startsWith(this.cookieName + '='));
    if (values.length !== 1) return null;
    const value = values[0].slice(this.cookieName.length + 1);
    if (!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) return null;
    const [id, signature] = value.split('.');
    return equal(signature, this.signature(id)) ? id : null;
  }
  expired(session, now = this.clock()) { return now >= session.expiresAt; }
  async session(req) {
    const id = this.cookieId(req);
    if (!id) return null;
    return this.transaction(async () => {
      // Re-read accounts on every authenticated request, including after a restart.
      const accounts = await loadAccounts(this.file);
      this.pruneSessions(accounts);
      const session = this.sessions.get(this.tokenHash(id));
      if (!session) return null;
      const now = this.clock(), user = accounts.users.find(user => user.id === session.userId);
      session.lastSeen = now;
      if (!session.remember) session.expiresAt = now + IDLE;
      let cookie;
      if (session.remember && now - session.renewedAt >= DAY) {
        const renewed = {...session, renewedAt: now, expiresAt: now + REMEMBER};
        const next = randomBytes(32).toString('hex');
        // Parallel asset/API requests may still carry the old cookie. They cannot renew it again.
        session.expiresAt = Math.min(session.expiresAt, now + RENEWAL_GRACE); session.renewedAt = now;
        if (this.sessions.size >= MAX_BUCKETS) this.sessions.delete([...this.sessions.keys()].find(key => key !== this.tokenHash(id)));
        this.sessions.set(this.tokenHash(next), renewed);
        cookie = this.sessionCookie(next, true);
        return {...renewed, id: next, user, cookie};
      }
      return {...session, id, user, cookie};
    });
  }
  async createSession(user, req = {headers: {}}, remember = false) {
    return this.transaction(async () => {
      const accounts = await loadAccounts(this.file);
      const current = accounts.users.find(account => account.id === user.id);
      if (!current || current.disabled || current.passwordVersion !== user.passwordVersion || current.hash !== user.hash) throw error('Benutzername oder Passwort ist falsch.', 401);
      this.revoke(this.cookieId(req));
      this.pruneSessions(accounts);
      if (this.sessions.size >= MAX_BUCKETS) this.sessions.delete(this.sessions.keys().next().value);
      const id = randomBytes(32).toString('hex'), now = this.clock();
      const session = {userId: user.id, passwordVersion: user.passwordVersion, csrf: randomBytes(32).toString('hex'), createdAt: now, lastSeen: now, renewedAt: now, expiresAt: now + (remember ? REMEMBER : IDLE), remember};
      this.sessions.set(this.tokenHash(id), session);
      return {session: {...session, id, user}, cookie: this.sessionCookie(id, remember)};
    });
  }
  async destroySession(req) {
    await this.transaction(() => { this.revoke(this.cookieId(req)); });
    return `${this.cookieName}=; ${this.cookieAttributes}; Max-Age=0`;
  }
  requireCsrf(req, session) {
    if (!equal(req.headers['x-csrf-token'], session.csrf)) throw error('CSRF-Token fehlt oder ist ungültig.', 403);
  }
  prune(map) {
    const now = this.clock();
    for (const [key, bucket] of map) if (now - bucket.updated >= 24 * 60 * 60 * 1000 && bucket.until <= now) map.delete(key);
  }
  checkLoginLimit(username, ip) {
    this.prune(this.userLimits); this.prune(this.ipLimits);
    const now = this.clock(), buckets = [this.userLimits.get(username), this.ipLimits.get(ip)];
    const until = Math.max(now, ...buckets.map(bucket => bucket?.until || 0));
    // Do not evict active buckets to accept unbounded new attackers. Reject new keys while full.
    if ((!this.userLimits.has(username) && this.userLimits.size >= MAX_BUCKETS) || (!this.ipLimits.has(ip) && this.ipLimits.size >= MAX_BUCKETS)) throw error('Zu viele Anmeldeversuche. Bitte später erneut versuchen.', 429, 60);
    if (until > now) throw error('Zu viele Anmeldeversuche. Bitte später erneut versuchen.', 429, Math.ceil((until - now) / 1000));
  }
  failedLogin(username, ip) {
    const now = this.clock();
    for (const [map, key] of [[this.userLimits, username], [this.ipLimits, ip]]) {
      let bucket = map.get(key);
      if (!bucket) { bucket = {failures: 0, start: now, strikes: 0, until: 0}; map.set(key, bucket); }
      if (now - bucket.start >= WINDOW) { bucket.start = now; bucket.failures = 0; }
      bucket.failures++; bucket.updated = now;
      if (bucket.failures >= 5) { bucket.strikes++; bucket.until = now + Math.min(WINDOW * 2 ** Math.min(bucket.strikes - 1, 6), 24 * 60 * 60 * 1000); bucket.failures = 0; bucket.start = now; }
    }
    this.checkLoginLimit(username, ip);
  }
  async login(credentials, req) {
    if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) throw error('Benutzername und Passwort erforderlich.');
    let {username, password, remember = false} = credentials;
    if (typeof remember !== 'boolean') throw error('Ungültige Auswahl für Angemeldet bleiben.');
    username = normalizeUsername(username);
    if (!validUsername(username) || !validPassword(password)) throw error('Benutzername und Passwort erforderlich.');
    // socket.remoteAddress is deliberately used. Forwarded headers are not trusted implicitly.
    const ip = req.socket?.remoteAddress || 'unknown';
    this.checkLoginLimit(username, ip);
    const user = (await loadAccounts(this.file)).users.find(user => user.username === username);
    const matches = await verifyPassword(password, user);
    this.checkLoginLimit(username, ip); // concurrent failures may have reached the limit while queued
    if (!matches) { this.failedLogin(username, ip); throw error('Benutzername oder Passwort ist falsch.', 401); }
    const current = (await loadAccounts(this.file)).users.find(account => account.id === user.id);
    if (!current || current.disabled || current.passwordVersion !== user.passwordVersion || current.hash !== user.hash) throw error('Benutzername oder Passwort ist falsch.', 401);
    this.userLimits.delete(username);
    return this.createSession(current, req, remember);
  }
}
