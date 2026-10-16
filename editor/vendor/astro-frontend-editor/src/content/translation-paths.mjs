// Paths of translated values (content format 2).
//
// A stored path addresses one string inside a source record. Object keys are strings. An item of a list is
// addressed by its key when the list declares one (`x-afe.array.key`) and the item has it, written as an object
// with exactly that one property: ["sections", {"id": "pakete"}, "headline"]. Items without a key keep their
// position (a number). A keyed segment says which property holds the key, so a stored path resolves against
// the data without a schema; a reorder does not change it.
//
// Editors and sites work with positional paths; stored paths are converted only at the storage boundary.

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

/** @param {unknown} segment */
export function isKeyedSegment(segment) {
  if (!segment || typeof segment !== 'object' || Array.isArray(segment)) return false;
  const entries = Object.entries(segment);
  return entries.length === 1 && !forbidden.has(entries[0][0]) && (typeof entries[0][1] === 'string' || Number.isInteger(entries[0][1]));
}

/** @param {unknown} path */
export function isStoredPath(path) {
  return Array.isArray(path) && path.length > 0 && path.every(segment =>
    typeof segment === 'string' ? !forbidden.has(segment) : Number.isInteger(segment) && segment >= 0 || isKeyedSegment(segment));
}

/**
 * The positional path of a stored path in `data`, or null when it does not resolve (the keyed item is gone).
 * @param {unknown} data @param {unknown[]} path @returns {(string|number)[]|null}
 */
export function resolvePath(data, path) {
  if (!isStoredPath(path)) return null;
  const out = [];
  let value = data;
  for (const segment of path) {
    if (isKeyedSegment(segment)) {
      if (!Array.isArray(value)) return null;
      const [field, key] = Object.entries(segment)[0];
      const index = value.findIndex(item => item && typeof item === 'object' && item[field] === key);
      if (index < 0) return null;
      out.push(index);
      value = value[index];
    } else {
      if (value == null || typeof value !== 'object') return null;
      out.push(segment);
      value = value[segment];
    }
  }
  return out;
}

/** The value a stored path addresses, or undefined. */
export function valueAt(data, path) {
  const resolved = resolvePath(data, path);
  return resolved ? resolved.reduce((value, key) => value?.[key], data) : undefined;
}

/**
 * The stored form of a positional path: list positions become keys where `keyAt(listPath)` names a key
 * property and the item has a string or integer value there.
 * @param {unknown} data @param {(string|number)[]} path @param {(listPath:(string|number)[]) => string|null|undefined} keyAt
 */
export function storedPath(data, path, keyAt) {
  const out = [];
  let value = data;
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    if (Array.isArray(value) && Number.isInteger(segment)) {
      const field = keyAt(path.slice(0, i));
      const key = field ? value[segment]?.[field] : undefined;
      // A key is identity only if no other item of the list has it.
      const unique = key !== undefined && value.filter(item => item?.[field] === key).length === 1;
      out.push((typeof key === 'string' || Number.isInteger(key)) && unique ? { [field]: key } : segment);
    } else out.push(segment);
    value = value?.[segment];
  }
  return out;
}

/** Stored paths compare by value; key order inside a keyed segment cannot differ (one property). */
export const samePath = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Where each item of a list went after one change: unchanged items in place first, then moved items by equal
// content, then (same length, so no insertion or removal) an item edited in place keeps its position.
// One editor change either restructures a list or edits inside it, never both.
function matchItems(before, after) {
  const text = list => list.map(item => JSON.stringify(item));
  const b = text(before), a = text(after), used = new Set(), match = new Array(before.length).fill(null);
  for (let i = 0; i < b.length; i++) if (i < a.length && b[i] === a[i]) { match[i] = i; used.add(i); }
  for (let i = 0; i < b.length; i++) if (match[i] === null) {
    const j = a.findIndex((item, index) => !used.has(index) && item === b[i]);
    if (j >= 0) { match[i] = j; used.add(j); }
  }
  if (b.length === a.length) for (let i = 0; i < b.length; i++) if (match[i] === null && !used.has(i)) { match[i] = i; used.add(i); }
  return match;
}

/**
 * The stored path that addresses, in `after`, what `path` addressed in `before`; null if that was removed.
 * Positions follow moves, insertions and removals; keys stay unless the keyed item was removed, and follow a
 * key that was edited in place.
 * Pass one `cache` for all paths of one change: lists are matched once.
 * @param {unknown} before @param {unknown} after @param {unknown[]} path @param {WeakMap<object, (number|null)[]>} [cache]
 */
export function followPath(before, after, path, cache = new WeakMap()) {
  if (!isStoredPath(path)) return null;
  const out = [];
  let b = before, a = after;
  for (const segment of path) {
    if (Array.isArray(b) && Array.isArray(a) && (Number.isInteger(segment) || isKeyedSegment(segment))) {
      let i = segment;
      let field = null;
      if (isKeyedSegment(segment)) {
        const [name, key] = Object.entries(segment)[0];
        field = name;
        i = b.findIndex(item => item?.[name] === key);
        if (i < 0) return null;
      }
      if (!cache.has(b)) cache.set(b, matchItems(b, a));
      const j = cache.get(b)[i];
      if (j === null || j === undefined || j >= a.length) return null;
      const key = field ? a[j]?.[field] : undefined;
      out.push(field && (typeof key === 'string' || Number.isInteger(key)) ? { [field]: key } : j);
      b = b[i]; a = a[j];
    } else {
      if (isKeyedSegment(segment)) return null;
      out.push(segment);
      b = b?.[segment]; a = a?.[segment];
    }
  }
  return out;
}

// Identity of a translation record: [owner record, locale], written as "<owner id>/<locale>". The locale is the
// last segment and has no slash, so two different tuples never give the same ID (format 1 flattened "/" to "-":
// project/nfl-berlin-game and project/nfl/berlin-game collided).
const localePattern = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
/** @param {string} ownerId @param {string} locale */
export function translationKey(ownerId, locale) {
  if (typeof ownerId !== 'string' || !ownerId || ownerId.startsWith('/') || ownerId.endsWith('/') || ownerId.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Invalid translation owner: ${ownerId}`);
  if (!localePattern.test(locale)) throw new Error(`Invalid locale: ${locale}`);
  return `${ownerId}/${locale}`;
}
/** @param {string} key */
export function parseTranslationKey(key) {
  const at = typeof key === 'string' ? key.lastIndexOf('/') : -1;
  if (at <= 0 || !localePattern.test(key.slice(at + 1))) return null;
  return { ownerId: key.slice(0, at), locale: key.slice(at + 1) };
}
