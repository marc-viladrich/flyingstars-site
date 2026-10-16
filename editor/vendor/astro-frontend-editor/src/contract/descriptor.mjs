import { readMeta, AFE_META_SPEC } from '../schema/spec.mjs';

/** @typedef {{path:Array<string|number>, pointer:string, label:string|null, kind:string,
 * required:boolean, nullable:boolean, container:'object'|'array'|'union'|null,
 * meta:object, constraints:object, when:Array<object>, issues:Array<object>,
 * default?:unknown, enum?:Array<unknown>, variants?:{field:string,options:Array<Array<unknown>>}}} FieldDescriptor */
const escape = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const formats = { uri: 'url', 'uri-reference': 'url', 'date-time': 'datetime', date: 'date', time: 'time', email: 'email' };
const constraintKeys = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'minLength', 'maxLength', 'pattern', 'format', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties', 'additionalProperties'];
const stable = value => JSON.stringify(value, (_key, item) => isObject(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

/** Compile input shape only; Astro remains the authority for validation on save.
 * Paths use '*' for array elements. `when` and schema pointers distinguish branches.
 * @param {string} name @param {object} schema @param {{loader?:'file'|'glob', annotationOrigins?:boolean}} [options]
 * @returns {{name:string, meta:object, fields:FieldDescriptor[], issues:Array<object>, envelope:boolean}} */
export function compileCollection(name, schema, { loader, annotationOrigins = false } = {}) {
  const fields = [];
  function resolve(node, refs, pointer = '') {
    let current = node;
    const active = new Set(refs);
    while (isObject(current) && current.$ref !== undefined) {
      const ref = current.$ref;
      if (active.has(ref)) return { node: current, refs: active, pointer, error: ['recursive-schema', `Recursive reference ${ref}`] };
      if (typeof ref !== 'string' || !ref.startsWith('#/')) return { node: current, refs: active, pointer, error: ['unsupported-ref', `Only local JSON pointers are supported: ${ref}`] };
      let target = schema;
      for (const part of ref.slice(2).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
        target = isObject(target) && Object.hasOwn(target, part) ? target[part] : undefined;
      }
      if (target === undefined) return { node: current, refs: active, pointer, error: ['unresolved-ref', `Missing reference ${ref}`] };
      // Annotation siblings override annotations, but constraints cannot be merged by object spread.
      const siblings = Object.fromEntries(Object.entries(current).filter(([key]) => key !== '$ref'));
      const assertions = Object.keys(siblings).filter(key => !['description', 'title', 'default', 'x-afe', 'format', '$defs', 'definitions', '$schema', '$id'].includes(key));
      if (assertions.length) return { node: current, refs: active, pointer, error: ['unsupported-ref-siblings', `Reference has assertion siblings: ${assertions.join(', ')}`] };
      active.add(ref);
      pointer = ref.slice(1);
      current = isObject(target) ? { ...target, ...siblings } : target;
    }
    return { node: current, refs: active, pointer };
  }
  // Astro file-loader exports array/map alternatives. Never unwrap ordinary arrays.
  const resolvedRoot = resolve(schema, new Set());
  const alternatives = resolvedRoot.error ? undefined : resolvedRoot.node?.anyOf;
  let root = schema, rootPointer = '', envelope = false;
  if (loader !== 'glob' && alternatives?.length === 2) {
    const alternativesPointer = resolvedRoot.pointer;
    const resolvedAlternatives = alternatives.map((node, index) => resolve(node, new Set(), `${alternativesPointer}/anyOf/${index}`));
    const branches = resolvedAlternatives.map(result => result.node);
    const arrayIndex = branches.findIndex(node => node?.type === 'array');
    const mapIndex = branches.findIndex(node => node?.type === 'object' && Object.keys(node.properties ?? {}).every(key => key === '$schema') && isObject(node.additionalProperties));
    if (arrayIndex >= 0 && mapIndex >= 0) {
      const resolvedEntry = resolve(branches[arrayIndex].items, new Set(), `${resolvedAlternatives[arrayIndex].pointer}/items`);
      const entry = resolvedEntry.node;
      const map = resolve(branches[mapIndex].additionalProperties, new Set()).node;
      if (stable(entry) === stable(map)) {
        root = { ...entry, ...(Object.hasOwn(resolvedRoot.node, 'x-afe') ? { 'x-afe': resolvedRoot.node['x-afe'] } : {}) };
        rootPointer = resolvedEntry.pointer; envelope = true;
      }
    }
  }
  function walk(input, path, pointer, required, when = [], refs = new Set(), inheritedReadOnly = false, depth = 0, branch = false, immutable = false, discriminator) {
    const resolved = resolve(input, refs, pointer);
    pointer = resolved.pointer;
    let node = resolved.node;
    const issues = [];
    const issue = (code, message, extra = {}) => issues.push({ code, message, ...extra });
    if (resolved.error) issue(...resolved.error);
    if (depth > 128) issue('recursion-limit', 'Schema nesting exceeds 128 levels');
    if (!isObject(node)) { issue('unsupported-schema', 'Expected an explicit JSON Schema object'); node = {}; }
    const rawMeta = Object.hasOwn(node, 'x-afe') ? node['x-afe'] : {};
    const { value: meta, issues: metaIssues } = readMeta(rawMeta, true);
    issues.push(...metaIssues.map(({path: metaPath, ...item}) => ({ ...item, code: `metadata-${item.code}`, metaPath })));
    if (!isObject(rawMeta) || !Object.hasOwn(rawMeta, 'format')) {
      const legacy = AFE_META_SPEC.properties.format.values.includes(node.format) ? node.format : formats[node.format];
      if (legacy) meta.format = legacy;
    }
    if (inheritedReadOnly || immutable === true || Object.hasOwn(node, 'const')) meta.readOnly = true;
    const branches = node.oneOf ?? node.anyOf;
    const resolvedBranches = branches?.map(child => resolve(child, resolved.refs).node);
    const nullable = node.type === 'null' || Array.isArray(node.type) && node.type.includes('null')
      || resolvedBranches?.some(child => child?.type === 'null') || node.enum?.includes(null) || node.const === null;
    const nonNull = resolvedBranches?.filter(child => child?.type !== 'null');
    // A nullable value is one control; keep outer annotations and nullability.
    if (!resolved.error && nonNull?.length === 1 && resolvedBranches.length === 2) {
      const childIndex = resolvedBranches.findIndex(child => child?.type !== 'null');
      const outer = Object.fromEntries(Object.entries(node).filter(([key]) => !['anyOf', 'oneOf'].includes(key)));
      const start = fields.length;
      walk({ ...nonNull[0], ...outer }, path, `${pointer}/${node.oneOf ? 'oneOf' : 'anyOf'}/${childIndex}`, required, when, resolved.refs, inheritedReadOnly, depth + 1, branch, immutable, discriminator);
      fields[start].nullable = true;
      return;
    }
    const candidates = [];
    if (resolvedBranches?.length >= 2 && resolvedBranches.every(child => isObject(child?.properties))) {
      for (const key of Object.keys(resolvedBranches[0].properties)) {
        const options = resolvedBranches.map(child => {
          const literal = resolve(child.properties[key], resolved.refs).node;
          return child.required?.includes(key) && isObject(literal)
            ? Object.hasOwn(literal, 'const') ? [literal.const] : literal.enum : undefined;
        });
        if (options.every(values => values?.length && values.every(value => ['string', 'number', 'boolean'].includes(typeof value)))
          && new Set(options.flat()).size === options.flat().length) candidates.push({ field: key, options });
      }
    }
    const declared = discriminator;
    const variants = declared ? candidates.find(item => item.field === declared) : candidates.length === 1 ? candidates[0] : undefined;
    const referenceInput = meta.reference && resolvedBranches?.every(child => ['string', 'number', 'integer'].includes(child?.type)
      || child?.type === 'object' && child.properties?.collection?.type === 'string'
        && ['id', 'slug'].some(key => child.properties?.[key]?.type === 'string'));
    if (branches && !variants && !referenceInput) issue('ambiguous-union', candidates.length > 1
      ? `Multiple discriminators: ${candidates.map(item => item.field).join(', ')}` : 'No unique required, non-overlapping literal discriminator');
    let kind = branches ? variants ? 'discriminated-union' : 'union'
      : Object.hasOwn(node, 'const') ? 'literal' : node.enum ? 'enum'
      : node.prefixItems || Array.isArray(node.items) ? 'tuple'
      : Array.isArray(node.type) ? node.type.filter(type => type !== 'null')[0] ?? 'null'
      : node.type ?? (node.properties ? 'object' : 'unknown');
    if (resolved.error) kind = resolved.error[0] === 'recursive-schema' ? 'recursive' : 'unknown';
    const container = branches ? 'union' : kind === 'object' ? 'object' : ['array', 'tuple'].includes(kind) ? 'array' : null;
    if (meta.collection && path.length) issue('metadata-placement', 'collection metadata belongs on the entry root');
    if (meta.array && container !== 'array') issue('metadata-placement', 'array metadata belongs on an array');
    if (meta.block && (kind !== 'object' || !branch)) issue('metadata-placement', 'block metadata belongs on an object union branch');
    if (kind === 'unknown' && !resolved.error) issue('unsupported-schema', 'Schema has no supported input shape');
    if (Array.isArray(node.type) && node.type.filter(type => type !== 'null').length > 1) issue('ambiguous-union', 'Multiple non-null types require an explicit representation');
    for (const key of ['allOf', 'not', 'if', 'then', 'else', 'patternProperties', 'dependentSchemas', 'contains']) {
      if (Object.hasOwn(node, key)) issue('unsupported-keyword', `Cannot compile ${key} without losing shape`);
    }
    if (node.oneOf && node.anyOf) issue('unsupported-keyword', 'Combined oneOf and anyOf are not supported');
    const field = { path, pointer, label: node.description ?? null, kind, required, nullable: !!nullable, container,
      ...(annotationOrigins ? { annotationOrigins: { format: isObject(rawMeta) && Object.hasOwn(rawMeta, 'format') } } : {}),
      ...('default' in node ? { default: node.default } : {}),
      ...(node.enum ? { enum: node.enum } : {}), ...('const' in node ? { const: node.const } : {}),
      ...(variants ? { variants } : {}), meta,
      constraints: Object.fromEntries(constraintKeys.filter(key => key in node).map(key => [key, node[key]])), when, issues };
    fields.push(field);
    if (resolved.error || depth > 128) return;
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      if (key === '$schema') continue;
      walk(child, [...path, key], `${pointer}/properties/${escape(key)}`, node.required?.includes(key) ?? false,
        when, resolved.refs, meta.readOnly, depth + 1, false, immutable === key);
    }
    const tuple = node.prefixItems ?? (Array.isArray(node.items) ? node.items : undefined);
    if (tuple) tuple.forEach((child, index) => walk(child, [...path, index], `${pointer}/${node.prefixItems ? 'prefixItems' : 'items'}/${index}`,
      index < (node.minItems ?? 0), when, resolved.refs, meta.readOnly, depth + 1));
    else if (isObject(node.items)) walk(node.items, [...path, '*'], `${pointer}/items`, true, when, resolved.refs, meta.readOnly, depth + 1, false, false, meta.array?.discriminator);
    if (kind === 'object' && isObject(node.additionalProperties)) {
      issue('dynamic-properties', 'Dynamic map keys need an explicit editor representation');
    }
    branches?.forEach((child, index) => walk(child, path, `${pointer}/${node.oneOf ? 'oneOf' : 'anyOf'}/${index}`, required,
      [...when, variants ? { path, discriminator: variants.field, values: variants.options[index] }
        : { path, keyword: node.oneOf ? 'oneOf' : 'anyOf', index }], resolved.refs, meta.readOnly, depth + 1, true, variants?.field));
  }
  walk(root, [], rootPointer, true);
  return { name, meta: fields[0]?.meta.collection ?? {}, fields,
    issues: fields.flatMap(field => field.issues.map(item => ({ ...item, path: field.path, pointer: field.pointer, when: field.when }))), envelope };
}
