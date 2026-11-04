/** One annotation helper. AFE serializes this metadata unchanged to the browser.
 * @template {import('zod').ZodType} T
 * @param {T} schema
 * @param {'shared'|'translatable'} mode
 * @returns {T}
 */
export function fieldPolicy(schema, mode) {
  if (!['shared', 'translatable'].includes(mode)) throw Error(`Unknown field policy: ${mode}`);
  const meta = schema.meta() ?? {};
  return schema.meta({...meta, 'x-afe': {...meta['x-afe'], translatable: mode === 'translatable'}});
}

const wrappers = new Set(['optional', 'nullable', 'default', 'prefault', 'readonly', 'catch']);
const leaves = new Set(['text', 'number', 'boolean', 'enum', 'literal']);

/** Normalize real Zod and AFE's browser schema into the SAME policy tree. No name/value heuristics. */
export function policyTree(schema, address = '$') {
  let node = schema;
  while (node?._def && wrappers.has(node._def.type)) node = node._def.innerType;
  const zod = !!node?._def;
  const type = zod ? node._def.type : node?.kind;
  const kind = ['string', 'date'].includes(type) ? 'text' : type;
  const afe = {...(zod ? node.meta?.()?.['x-afe'] : node?.['x-afe']), ...schema.meta?.()?.['x-afe']};
  const result = {kind, optional: zod ? schema.isOptional() : !!schema.optional,
    nullable: zod ? schema.isNullable() : !!schema.nullable};
  if (afe.media) result.media = afe.media;
  if (afe.reference) result.reference = afe.reference;
  if (kind === 'object') result.properties = Object.fromEntries(Object.entries(zod ? node.shape : node.properties).map(([key, child]) => [key, policyTree(child, `${address}/${key}`)]));
  else if (kind === 'union') {
    result.discriminator = zod ? node._def.discriminator : node.discriminator;
    result.options = node.options.map((child, index) => policyTree(child, `${address}/<${index}>`));
  } else if (kind === 'array') result.element = policyTree(zod ? node._def.element : node.element, `${address}/*`);
  else if (kind === 'tuple') result.items = (zod ? node._def.items : node.items).map((child, i) => policyTree(child, `${address}/${i}`));
  else if (leaves.has(kind)) {
    if (typeof afe.translatable !== 'boolean') throw Error(`Unannotated i18n field: ${address}`);
    result.mode = afe.translatable ? 'translatable' : 'shared';
    if (kind === 'enum') result.choices = zod ? node.options : node.choices;
    if (kind === 'literal') result.value = zod ? node._def.values[0] : node.value;
  } else throw Error(`Unsupported i18n schema at ${address}: ${kind}`);
  return result;
}

/** Counts possible leaf addresses, including EVERY union option, even unused ones. */
export function policyStatistics(tree) {
  const stats = {shared: 0, translatable: 0};
  const walk = node => {
    if (node.mode) stats[node.mode]++;
    Object.values(node.properties ?? {}).forEach(walk);
    node.options?.forEach(walk);
    node.items?.forEach(walk);
    if (node.element) walk(node.element);
  };
  walk(tree);
  return stats;
}
