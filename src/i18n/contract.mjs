import {sha256} from './sha256.mjs';
import {policyTree} from './field-policy.mjs';
import {tokenDependency, referenceDependency, structuredFactDependency} from './contract-dependencies.mjs';

export const CONTRACT_VERSION = 2;
export const ADDRESSING = 'stable-keys';
const pointer = path => '/' + path.map(part => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
const equal = (a, b) => canonical(a) === canonical(b);
export function canonical(value) {
  if (value === undefined) return 'undefined';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const fingerprint = value => sha256(canonical(value));

function matches(node, value) {
  if (value === undefined) return node.optional;
  if (value === null) return node.nullable;
  if (node.kind === 'union') return node.options.some(option => matches(option, value));
  if (node.kind === 'object') return typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) &&
    Object.keys(value).every(key => Object.hasOwn(node.properties, key)) &&
    Object.entries(node.properties).every(([key, child]) => matches(child, value[key]));
  if (node.kind === 'array') return Array.isArray(value) && value.every(item => matches(node.element, item));
  if (node.kind === 'tuple') return Array.isArray(value) && value.length === node.items.length && node.items.every((child, i) => matches(child, value[i]));
  if (node.kind === 'enum') return node.choices.includes(value);
  if (node.kind === 'literal') return equal(node.value, value);
  return node.kind === 'text' ? typeof value === 'string' || value instanceof Date : typeof value === node.kind;
}
export function selected(node, value, path = []) {
  if (node.kind !== 'union') return node;
  if (node.discriminator) {
    const choice = node.options.find(option => option.properties?.[node.discriminator]?.value === value?.[node.discriminator]);
    if (!choice) throw Error(`Unknown union branch at ${pointer(path)}`);
    return selected(choice, value, path);
  }
  const choices = node.options.filter(option => matches(option, value));
  if (!choices.length || choices.slice(1).some(choice => !equal(choice, choices[0]))) throw Error(`Unknown or ambiguous union branch at ${pointer(path)}`);
  return selected(choices[0], value, path);
}
const hasText = node => node.mode === 'translatable' || Object.values(node.properties ?? {}).some(hasText) || node.options?.some(hasText) || node.items?.some(hasText) || (node.element && hasText(node.element));

/** Pure, strict projection. Never falls back to German for a missing translation; never writes files. */
export function project(schema, source, target, locale, dependencies = {}) {
  if (!['en', 'nl'].includes(locale)) throw Error(`Unsupported target locale: ${locale}`);
  const tree = policyTree(schema);
  if(tree.properties){tree.properties={...tree.properties};for(const key of ['translationSourceHash','translationContractVersion','translationEvidence','translationReview'])delete tree.properties[key];}
  const clean=data=>Object.fromEntries(Object.entries(data).filter(([key])=>!['translationSourceHash','translationContractVersion','translationEvidence','translationReview'].includes(key)));
  source=clean(source);target=clean(target);
  const fields = [], sharedDifferences = [], globalDependencies = [];
  // Real schemas additionally enforce refinements; unknown fields are checked below BEFORE Zod can strip them.
  const walk = (original, de, translated, path, inheritedDependencies = []) => {
    if (de === undefined || de === null) {
      if (de === undefined && !original.optional || de === null && !original.nullable) throw Error(`Invalid source at ${pointer(path)}`);
      if (hasText(original)) {
        if (!equal(de, translated)) throw Error(`Orphan translation at ${pointer(path)}`);
        fields.push({address: pointer(path), path, present: de !== undefined, optional: original.optional, nullable: original.nullable, value: de, target: translated, dependencies: inheritedDependencies});
      } else if (!equal(de, translated)) sharedDifferences.push({address: pointer(path), source: de, target: translated});
      return de;
    }
    const node = selected(original, de, path);
    if (node.reference) globalDependencies.push(referenceDependency(node.reference, de, dependencies));
    if (node.kind === 'object') {
      if (typeof de !== 'object' || Array.isArray(de)) throw Error(`Invalid source at ${pointer(path)}`);
      for (const value of [de, translated]) if (value && typeof value === 'object') for (const key of Object.keys(value)) {
        if (!Object.hasOwn(node.properties, key)) throw Error(`Unknown i18n field: ${pointer([...path, key])}`);
      }
      if (translated !== undefined && (translated === null || typeof translated !== 'object' || Array.isArray(translated))) throw Error(`Invalid translation at ${pointer(path)}`);
      const fact = structuredFactDependency(de, dependencies, locale);
      if (fact) globalDependencies.push(fact);
      let reviewDependencies = inheritedDependencies;
      if (node.media) {
        const sourcePath = node.media.shape.source;
        reviewDependencies = [...inheritedDependencies, {owner: 'media-content', address: pointer([...path, ...sourcePath]), meaning: sourcePath.reduce((v, key) => v?.[key], de)}];
      }
      const out = {};
      for (const [key, child] of Object.entries(node.properties)) {
        const projected = walk(child, de[key], translated?.[key], [...path, key], reviewDependencies);
        if (Object.hasOwn(de, key)) out[key] = projected;
      }
      return out;
    }
    if (node.kind === 'array' || node.kind === 'tuple') {
      if (!Array.isArray(de)) throw Error(`Invalid source list at ${pointer(path)}`);
      if (translated !== undefined && !Array.isArray(translated)) throw Error(`Invalid translated list at ${pointer(path)}`);
      if (node.kind === 'array' && hasText(node.element)) {
        const index = (items, label) => {
          const byKey = new Map();
          for (const item of items ?? []) {
            if (!item || typeof item._key !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(item._key)) throw Error(`Missing or invalid _key in ${label} at ${pointer(path)}`);
            if (byKey.has(item._key)) throw Error(`Duplicate _key at ${pointer(path)}: ${item._key}`);
            byKey.set(item._key, item);
          }
          return byKey;
        };
        const originals = index(de, 'source'), targets = index(translated, 'translation');
        if ([...targets.keys()].some(key => !originals.has(key))) throw Error(`Orphan translation key at ${pointer(path)}`);
        return de.map(item => walk(node.element, item, targets.get(item._key), [...path, '@' + item._key], inheritedDependencies));
      }
      return de.map((item, i) => walk(node.element ?? node.items[i], item, translated?.[i], [...path, i], inheritedDependencies));
    }
    if (!matches(node, de)) throw Error(`Invalid source value at ${pointer(path)}`);
    if (node.mode === 'shared') {
      if (!equal(de, translated)) sharedDifferences.push({address: pointer(path), source: de, target: translated});
      return structuredClone(de);
    }
    if (translated === undefined || translated === null || !matches(node, translated)) {
      throw Error(`Missing or invalid ${locale} translation: ${pointer(path)}`);
    }
    const tokens = text => typeof text === 'string' ? [...text.matchAll(/\{\{([^{}]+)\}\}/g)].map(match => match[1]).sort() : [];
    // A translated date may choose long instead of numeric; fact identity stays the same.
    const identity = token => token.startsWith('project.') ? token.split('.').slice(0, 3).join('.') : token;
    const identities = text => [...new Set(tokens(text).map(identity))].sort();
    if (!equal(identities(de), identities(translated))) throw Error(`Fact token mismatch at ${pointer(path)}`);
    tokens(translated).forEach(token => tokenDependency(token, dependencies, locale));
    const facts = tokens(de).map(token => tokenDependency(token, dependencies, locale));
    fields.push({address: pointer(path), path, present: true, optional: original.optional, nullable: original.nullable, value: de, target: translated, dependencies: [...inheritedDependencies, ...facts]});
    return structuredClone(translated);
  };
  const projection = walk(tree, source, target, []);
  if (schema.safeParse) {
    schema.parse(source);
    // Shared values have already been projected, but constraints on translated prose still apply.
    schema.parse(projection);
  }
  for (const field of fields) { let value = projection; field.path = field.path.map(part => { const key = typeof part === 'string' && part.startsWith('@') && Array.isArray(value) ? value.findIndex(item => item._key === part.slice(1)) : part; value = value?.[key]; return key; }); }
  fields.sort((a, b) => a.address.localeCompare(b.address, 'en'));
  const contractFields = fields.map(field => {
    const reviewDependencies = [...new Map([...field.dependencies, ...globalDependencies].map(dependency => [canonical(dependency), dependency])).values()].sort((a, b) => canonical(a).localeCompare(canonical(b), 'en'));
    return {...field, dependencies: reviewDependencies, sourceFingerprint: fingerprint({address: field.address, present: field.present, optional: field.optional, nullable: field.nullable, value: field.value, dependencies: reviewDependencies}), targetFingerprint: fingerprint({present: field.present, value: field.target})};
  });
  const sourceFingerprint = fingerprint({version: CONTRACT_VERSION, addressing: ADDRESSING, fields: contractFields.map(({address, sourceFingerprint}) => ({address, sourceFingerprint}))});
  return {version: CONTRACT_VERSION, addressing: ADDRESSING, locale, projection, sharedDifferences,
    requiredTranslations: contractFields.filter(field => field.present).map(field => field.address), fields: contractFields, sourceFingerprint};
}

/** Versioned, in-memory migration evidence. Historical flags are retained solely as provenance. */
export function adoptionEvidence(result, legacy = {}) {
  return {version: CONTRACT_VERSION, addressing: ADDRESSING, locale: result.locale, sourceFingerprint: result.sourceFingerprint,
    legacy: structuredClone(legacy), fields: result.fields.map(({address, sourceFingerprint, targetFingerprint}) =>
      ({address, sourceFingerprint, targetFingerprint, status: 'adopted-existing'}))};
}

/** Compare explicit evidence. No sync/preview operation can manufacture a human review. */
export function reviewRequired(result, evidence) {
  if (evidence.version !== CONTRACT_VERSION || evidence.addressing !== ADDRESSING || evidence.locale !== result.locale) throw Error('Incompatible i18n evidence');
  const existing = new Map();
  for (const field of evidence.fields) {
    if (existing.has(field.address)) throw Error(`Duplicate i18n evidence: ${field.address}`);
    if (!['adopted-existing', 'reviewed', 'unreviewed'].includes(field.status)) throw Error(`Unknown i18n review status: ${field.status}`);
    existing.set(field.address, field);
  }
  const needed = [];
  for (const field of result.fields) {
    const previous = existing.get(field.address);
    existing.delete(field.address);
    if (!previous || previous.status === 'unreviewed' || previous.sourceFingerprint !== field.sourceFingerprint || previous.targetFingerprint !== field.targetFingerprint) needed.push(field.address);
  }
  if (existing.size) throw Error(`Orphan i18n evidence: ${[...existing.keys()].join(', ')}`);
  return needed;
}

