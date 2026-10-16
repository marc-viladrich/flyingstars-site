import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileCollection } from '../contract/descriptor.mjs';
import { validOwner, validPath, validAddress, valueAt, descriptorAt, decodeMarker, flattenMarker } from './protocol.mjs';

// Captured once in the server module. URLs and browser globals never enable markers.
const editor = process.env.AFE_MODE === 'editor';
const schemas = new Map();
export const editorBuild = () => editor;
const fail = message => { throw new TypeError(`AFE marker: ${message}`); };
const ownerOf = entry => {
  const owner = entry?.owner ?? entry?.record ?? entry;
  if (!validOwner(owner)) fail('expected a CollectionEntry or {collection, id} owner.');
  return { collection: owner.collection, id: owner.id };
};
const pathOf = path => {
  const result = typeof path === 'string' ? [path] : path;
  if (!validPath(result)) fail('path must be an array of field names and non-negative integer indices (or one field name).');
  return [...result];
};
export function address(entry, path = [], part = 'data') {
  const result = { owner: ownerOf(entry), part, path: pathOf(path) };
  if (!validAddress(result)) fail('part must be data or body; body has an empty path.');
  return result;
}
export const at = (base, ...parts) => address(base, [...base.path, ...parts], base.part);

function descriptors(collection) {
  if (schemas.has(collection)) return schemas.get(collection);
  // Collection names cannot escape the generated-schema directory.
  if (collection.includes('/') || collection.includes('\\') || collection === '..') fail('invalid collection name.');
  let schema;
  try { schema = JSON.parse(readFileSync(join(process.cwd(), '.astro/collections', `${collection}.schema.json`), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
  const compiled = compileCollection(collection, schema);
  schemas.set(collection, compiled.fields);
  return compiled.fields;
}
function target(entry, path) {
  const result = entry?.owner && entry?.part ? address(entry, entry.path, entry.part) : address(entry, path);
  const fields = descriptors(result.owner.collection);
  if (result.part === 'data') {
    if (fields && !descriptorAt(fields, result.path, entry?.data))
      fail(`unknown field ${result.owner.collection}/${result.owner.id} ${JSON.stringify(result.path)} in generated schema. Check the field name, array index and active variant.`);
    if (entry?.data !== undefined && valueAt(entry.data, result.path) === undefined)
      fail(`field ${result.owner.collection}/${result.owner.id} ${JSON.stringify(result.path)} is missing in this entry. Check the field name and array index.`);
  }
  return result;
}
const emit = marker => ({ 'data-afe': JSON.stringify({ v: 1, ...marker }) });
export function record(entry) {
  return editor ? emit({ kind: 'record', address: address(entry) }) : {};
}
export function field(entry, path, options = {}) {
  if (!editor) return {};
  if (entry?.owner && entry?.part) { options = path ?? {}; path = undefined; }
  const mode = options.mode ?? 'panel';
  if (!['inline', 'panel'].includes(mode)) fail('field mode must be inline or panel.');
  return emit({ kind: 'field', address: target(entry, path), mode });
}
export function media(entry, path) { return editor ? emit({ kind: 'media', address: target(entry, path) }) : {}; }
export function blocks(entry, path) { return editor ? emit({ kind: 'blocks', address: target(entry, path) }) : {}; }
export function body(entry) { return editor ? emit({ kind: 'body', address: address(entry, [], 'body') }) : {}; }
export function item(entry, options = {}) {
  if (!editor) return {};
  if (typeof options.occurrence !== 'string' || !options.occurrence.length) fail('item requires a nonempty occurrence string unique to its location on the page.');
  const membership = options.entry === undefined ? undefined
    : options.entry?.owner ? target(options.entry) : target(entry, options.entry);
  if (membership?.part !== undefined && membership.part !== 'data') fail('item membership must address data.');
  return emit({ kind: 'item', rendered: ownerOf(entry), occurrence: options.occurrence, ...(membership ? { membership } : {}) });
}
export function order(collection, path) {
  if (!editor) return {};
  if (typeof collection !== 'string' || !collection.length) fail('order requires a collection name.');
  path = pathOf(path);
  if (!path.length) fail('order requires a field path.');
  const fields = descriptors(collection);
  if (fields && !['number', 'integer'].includes(descriptorAt(fields, path)?.kind)) fail(`order field ${collection} ${JSON.stringify(path)} must be numeric in the generated schema.`);
  return emit({ kind: 'order', collection, path });
}
export function uses(entry, paths) {
  if (!editor) return {};
  if (!Array.isArray(paths)) fail('uses requires an array of paths or absolute addresses.');
  return paths.length ? emit({ kind: 'uses', addresses: paths.map(path => path?.owner ? target(path) : target(entry, path)) }) : {};
}
export function color(entry, path, cssVar) {
  if (!editor) return {};
  if (entry?.owner && entry?.part) { cssVar = path; path = undefined; }
  if (typeof cssVar !== 'string' || !/^--[\w-]+$/.test(cssVar)) fail('color requires a CSS custom property such as --accent.');
  return emit({ kind: 'color', address: target(entry, path), cssVar });
}
/** Several helpers on one element must be combined before spreading attributes. */
export function merge(...attributes) {
  if (!editor) return {};
  const markers = attributes.flatMap(attrs => {
    if (attrs['data-afe'] === undefined) return [];
    const decoded = decodeMarker(attrs['data-afe']);
    if (!decoded) fail('merge received an invalid data-afe attribute.');
    return flattenMarker(decoded);
  });
  return markers.length ? { 'data-afe': JSON.stringify(markers.length === 1 ? markers[0] : { v: 1, markers }) } : {};
}
