// Shared by server helpers, the browser decoder and the checker. No Node/DOM imports.
export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
export const validOwner = owner => isObject(owner) && text(owner.collection) && text(owner.id);
export const validPath = path => Array.isArray(path) && Array.from(path).every(key =>
  typeof key === 'string'
  || Number.isSafeInteger(key) && key >= 0);
export const validAddress = address => isObject(address) && validOwner(address.owner)
  && ['data', 'body'].includes(address.part) && validPath(address.path)
  && (address.part !== 'body' || address.path.length === 0);
export const addressKey = address => JSON.stringify([address.owner.collection, address.owner.id, address.part, address.path]);
export const sameOwner = (a, b) => a?.collection === b?.collection && a?.id === b?.id;
export const renderedOwner = marker => marker.rendered?.record ?? marker.rendered;
const addressKinds = new Set(['field', 'media', 'blocks', 'color', 'body', 'list', 'query']);

export function validMarker(marker) {
  if (!isObject(marker) || marker.v !== 1) return false;
  if (addressKinds.has(marker.kind)) return validAddress(marker.address)
    && (marker.kind !== 'field' || marker.mode === undefined || ['inline', 'panel'].includes(marker.mode))
    && (marker.kind !== 'color' || /^--[\w-]+$/.test(marker.cssVar));
  if (marker.kind === 'record') return validAddress(marker.address) && marker.address.part === 'data' && marker.address.path.length === 0;
  if (marker.kind === 'item') return validOwner(renderedOwner(marker))
    && (marker.occurrence === undefined || text(marker.occurrence))
    && (marker.membership === undefined || validAddress(marker.membership) && marker.membership.part === 'data');
  if (marker.kind === 'uses') return Array.isArray(marker.addresses) && marker.addresses.length > 0 && marker.addresses.every(validAddress);
  if (marker.kind === 'order') return text(marker.collection) && validPath(marker.path) && marker.path.length > 0;
  return false;
}

/** Invalid/unknown versions are ignored by browsers and reported by the checker. */
export function decodeMarker(input) {
  try {
    const value = typeof input === 'string' ? JSON.parse(input) : input;
    if (validMarker(value)) return value;
    if (isObject(value) && value.v === 1 && Array.isArray(value.markers) && value.markers.length > 0 && value.markers.every(validMarker)) return value;
  } catch { /* Untrusted DOM attribute. */ }
  return null;
}
export const flattenMarker = value => value?.markers ?? (value ? [value] : []);
/** Rendered dependencies only: record wrappers and membership aren't field coverage. */
export function markerAddresses(marker) {
  if (marker.kind === 'uses') return marker.addresses;
  return addressKinds.has(marker.kind) ? [marker.address] : [];
}

export function valueAt(value, path) {
  for (const key of path) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    if (Array.isArray(value) && !Number.isSafeInteger(key)) return undefined;
    value = value[key];
  }
  return value;
}
export function descriptorAt(fields, path, data) {
  return fields.find(field => field.path.length === path.length
    && field.path.every((key, i) => key === path[i] || key === '*' && Number.isSafeInteger(path[i]))
    && (data === undefined || !(field.when ?? []).some(condition => condition.discriminator
      && !condition.values.includes(valueAt(data, condition.path.map((key, i) => key === '*' ? path[i] : key))?.[condition.discriminator]))));
}
