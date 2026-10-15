import {promises as fs} from 'node:fs';
import path from 'node:path';
import {scrypt, randomBytes, createHmac, timingSafeEqual} from 'node:crypto';

export const PASSWORD_PARAMS = Object.freeze({N: 2 ** 15, r: 8, p: 1, keylen: 64});
export const COOKIE_NAME = '__Host-fs_editor';
// Without HTTPS (local loopback) browsers like Safari drop Secure cookies, and __Host- requires Secure.
export const LOCAL_COOKIE_NAME = 'fs_editor';
const MAXMEM = 64 * 1024 * 1024, IDLE = 2 * 60 * 60 * 1000, ABSOLUTE = 12 * 60 * 60 * 1000;
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

export class EditorAuth {
  constructor({file, secret, clock = Date.now, secure = true} = {}) {
    if (secret !== undefined && Buffer.byteLength(secret) < 32) throw error('AFE_SESSION_SECRET (EDITOR_SESSION_SECRET) braucht mindestens 32 Bytes.');
    this.file = file; this.secret = secret === undefined ? randomBytes(32) : secret; this.clock = clock;
    this.cookieName = secure ? COOKIE_NAME : LOCAL_COOKIE_NAME; this.cookieAttributes = 'Path=/; HttpOnly; ' + (secure ? 'Secure; ' : '') + 'SameSite=Strict';
    this.sessions = new Map(); this.userLimits = new Map(); this.ipLimits = new Map();
  }
  async init({forbiddenRoots = []} = {}) {
    this.file = await assertPrivateAccountsPath(this.file, forbiddenRoots);
    try { await loadAccounts(this.file); }
    catch (e) {
      if (e.code === 'ENOENT') throw error('Kontodatei fehlt. Anlegen mit: node relaunch/manage-accounts.mjs add <username> --name "Anzeigename" --email name@example.org');
      throw e;
    }
    return this;
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
  expired(session, now = this.clock()) { return now - session.lastSeen >= IDLE || now - session.createdAt >= ABSOLUTE; }
  async session(req) {
    const id = this.cookieId(req), session = this.sessions.get(id);
    if (!session) return null;
    if (this.expired(session)) { this.sessions.delete(id); return null; }
    // Re-read the tiny, atomically replaced file: disabling/resetting an account revokes sessions immediately.
    const user = (await loadAccounts(this.file)).users.find(user => user.id === session.userId);
    if (!user || user.disabled || user.passwordVersion !== session.passwordVersion) { this.sessions.delete(id); return null; }
    session.lastSeen = this.clock();
    return {...session, id, user};
  }
  createSession(user, req = {headers: {}}) {
    const old = this.cookieId(req); if (old) this.sessions.delete(old);
    for (const [id, session] of this.sessions) if (this.expired(session)) this.sessions.delete(id);
    if (this.sessions.size >= MAX_BUCKETS) this.sessions.delete(this.sessions.keys().next().value);
    const id = randomBytes(32).toString('hex'), now = this.clock();
    const session = {userId: user.id, passwordVersion: user.passwordVersion, csrf: randomBytes(32).toString('hex'), createdAt: now, lastSeen: now};
    this.sessions.set(id, session);
    return {session: {...session, id, user}, cookie: `${this.cookieName}=${id}.${this.signature(id)}; ${this.cookieAttributes}; Max-Age=${ABSOLUTE / 1000}`};
  }
  destroySession(req) {
    this.sessions.delete(this.cookieId(req));
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
    let {username, password} = credentials;
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
    return this.createSession(current, req);
  }
}
