// Vendored from astro-frontend-editor/src/schema/spec.mjs, package 0.0.0, contract 1.0 (PR 4, 2026-10-15).
// PR 11 replaces this module with the package import. Keep the vocabulary identical.
/** Closed metadata vocabulary. Validation and defaults both read this object. */
const string = { type: 'string' };
const boolean = { type: 'boolean' };
const path = { type: 'array', items: { type: 'path-part' } };
const list = items => ({ type: 'array', items });
const enumeration = (...values) => ({ type: 'enum', values });
const object = (properties, required = []) => ({ type: 'object', properties, required });
const optionalBoolean = { ...boolean, default: false };
const collection = object({
  label: string, title: path, group: string, icon: string,
  operations: { ...list(enumeration('update', 'create', 'delete')), default: ['update'] },
  placement: { ...enumeration('frontend', 'library'), default: 'frontend' },
  i18n: { type: 'variant', discriminator: 'mode', default: { mode: 'none' }, variants: {
    none: object({ mode: enumeration('none') }, ['mode']),
    records: object({ mode: enumeration('records'), key: path, locale: path }, ['mode', 'key', 'locale']),
    fields: object({ mode: enumeration('fields'), containers: list(path) }, ['mode', 'containers']),
    overlay: object({ mode: enumeration('overlay') }, ['mode']),
  } },
  body: object({ label: string, translatable: optionalBoolean }, ['label']), factory: string, policies: list(string),
}, ['label', 'title']);

export const AFE_META_SPEC = freeze(object({
  help: string, icon: string, group: string, order: { type: 'number', default: 0 },
  visibility: { ...enumeration('normal', 'advanced', 'hidden'), default: 'normal' },
  readOnly: optionalBoolean, translatable: optionalBoolean,
  format: { ...enumeration('plain', 'multiline', 'inline', 'markdown', 'url', 'email', 'tel', 'date', 'datetime', 'time'), default: 'plain' },
  valueEncoding: { ...enumeration('json', 'date-only', 'datetime'), default: 'json' },
  codec: string, widget: string, factory: string,
  choices: { type: 'record', values: object({ label: string, tone: enumeration('neutral', 'positive', 'warning', 'negative') }, ['label']) },
  reference: object({ collection: string, encoding: enumeration('id', 'astro-reference'), onDelete: { ...enumeration('restrict'), default: 'restrict' } }, ['collection', 'encoding']),
  media: object({ policy: string, shape: { type: 'variant', discriminator: 'kind', variants: {
    path: object({ kind: enumeration('path'), altField: path }, ['kind']),
    object: object({ kind: enumeration('object'), source: path, alt: path, width: path, height: path, decorative: path }, ['kind', 'source', 'alt']),
  } } }, ['policy', 'shape']),
  array: object({ role: { ...enumeration('list', 'blocks'), default: 'list' }, key: path, itemLabel: path,
    reorderable: optionalBoolean, insertable: optionalBoolean, removable: optionalBoolean, discriminator: string }),
  block: object({ label: string, icon: string, maxInstances: { type: 'nonnegative-integer' }, factory: string, lifecycle: string }, ['label']),
  collection,
}));

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const isObject = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** @typedef {{path:Array<string|number>, code:string, expected?:string, actual?:string, message:string}} MetaIssue */
/** @param {unknown} value @returns {MetaIssue[]} */
export function validateMeta(value) { return readMeta(value).issues; }

/** Invalid members are reported and excluded; callers never consume unchecked metadata.
 * @param {unknown} value @param {boolean} [defaults] */
export function readMeta(value, defaults = false) {
  const issues = [];
  function read(spec, input, at) {
    const issue = (code, expected) => {
      const actual = input === null ? 'null' : Array.isArray(input) ? 'array' : typeof input;
      issues.push({ path: at, code, expected, actual, message: `${at.join('.') || 'x-afe'}: expected ${expected}, received ${actual}` });
    };
    if (spec.type === 'variant') {
      if (!isObject(input)) { issue('wrong-type', 'object'); return; }
      const branch = spec.variants[input[spec.discriminator]];
      if (!Object.hasOwn(spec.variants, input[spec.discriminator])) {
        issues.push({ path: [...at, spec.discriminator], code: 'invalid-value', message: `Expected one of ${Object.keys(spec.variants).join(', ')}` }); return;
      }
      return read(branch, input, at);
    }
    if (spec.type === 'object' || spec.type === 'record') {
      if (!isObject(input)) { issue('wrong-type', 'object'); return; }
      const output = Object.create(null);
      for (const [key, item] of Object.entries(input)) {
        if (spec.type === 'object' && !Object.hasOwn(spec.properties, key)) {
          issues.push({ path: [...at, key], code: 'unknown-key', message: `Unknown x-afe key: ${[...at, key].join('.')}` }); continue;
        }
        const checked = read(spec.type === 'record' ? spec.values : spec.properties[key], item, [...at, key]);
        if (checked !== undefined) output[key] = checked;
      }
      for (const key of spec.required ?? []) if (!Object.hasOwn(input, key)) {
        issues.push({ path: [...at, key], code: 'missing-key', message: `Required x-afe key: ${[...at, key].join('.')}` });
      }
      if (defaults) for (const [key, child] of Object.entries(spec.properties ?? {})) {
        if (!Object.hasOwn(input, key) && 'default' in child) output[key] = structuredClone(child.default);
      }
      // An incomplete nested annotation must not enable a reference, media policy, etc.
      if ((spec.required ?? []).some(key => !Object.hasOwn(output, key))) return;
      return { ...output };
    }
    if (spec.type === 'array') {
      if (!Array.isArray(input)) { issue('wrong-type', 'array'); return; }
      const output = Array.from(input, (item, index) => read(spec.items, item, [...at, index]));
      return output.some(item => item === undefined) ? undefined : output;
    }
    const valid = spec.type === 'enum' ? spec.values.includes(input)
      : spec.type === 'path-part' ? typeof input === 'string' || Number.isInteger(input) && input >= 0
      : spec.type === 'nonnegative-integer' ? Number.isInteger(input) && input >= 0
      : spec.type === 'number' ? typeof input === 'number' && Number.isFinite(input)
      : typeof input === spec.type;
    if (!valid) { issue(spec.type === 'enum' ? 'invalid-value' : 'wrong-type', spec.values?.join(' | ') ?? spec.type); return; }
    return input;
  }
  return { value: read(AFE_META_SPEC, value, []) ?? {}, issues };
}
