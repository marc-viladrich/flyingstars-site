import {projectValue} from '../content/project-facts.mjs';
import {projectContact, contactText} from '../content/contact.mjs';
import {durationText} from '../content/show-duration.mjs';
import {offerTextCore} from '../content/offer-core.mjs';
import {translatorFor} from './ui-core.mjs';

const own = (source, key) => {
  if (!source || !Object.hasOwn(source, key)) throw Error(`Missing i18n dependency: ${key}`);
  return source[key];
};

/** Resolve the EXISTING token grammar against explicitly supplied owner snapshots. */
export function tokenDependency(token, dependencies, locale) {
  const [owner, ...parts] = token.split('.');
  let value, meaning;
  if (owner === 'project') {
    const [project, field, display] = parts;
    if (parts.length < 2 || parts.length > 3) throw Error(`Unknown fact token: ${token}`);
    const source = own(dependencies, 'projectFacts');
    value = projectValue({project, field, display: display ?? (field === 'date' ? 'iso' : undefined)}, locale, source);
    const event = own(source, project);
    meaning = field === 'totalDrones' ? {drones: event.drones, shows: event.shows} : own(event, field);
  } else if (owner === 'contact') {
    const source = projectContact(own(dependencies, 'contact'));
    value = contactText(`{{${token}}}`, source);
    if (value === `{{${token}}}`) throw Error(`Unknown fact token: ${token}`);
    meaning = value;
  } else if (owner === 'duration') {
    const source = own(dependencies, 'showDuration');
    value = durationText(`{{${token}}}`, source);
    if (value === `{{${token}}}`) throw Error(`Unknown fact token: ${token}`);
    meaning = value;
  } else if (owner === 'offer') {
    const source = own(dependencies, 'showExtras');
    if (!Object.hasOwn(source, parts[0])) throw Error(`Unknown fact token: ${token}`);
    value = offerTextCore(`{{${token}}}`, locale, source,{t:translatorFor(own(dependencies,'ui'),locale)});
    if (value === `{{${token}}}`) throw Error(`Unknown fact token: ${token}`);
    // The existing priceLine renderer controls amount formatting in all three languages.
    // Only its amount is parametric. Currency, qualifier, net/travel and UI copy remain review dependencies.
    if (parts.length === 2 && ['price', 'priceSuffix', 'priceLine', 'priceGuide'].includes(parts[1])) {
      const {amount, ...priceMeaning} = own(source[parts[0]], 'price');
      const ui = own(dependencies, 'ui');
      meaning = {renderer: 'priceLine-v1', price: priceMeaning,
        copy: Object.fromEntries(['price.from', 'price.fromApprox', 'price.fromApproxGuide'].map(key => [key, own(ui, key)]))};
    } else if (parts.join('.') === 'indoor.ceilingWords') {
      const ceilingMin = source.indoor.ceilingMin;
      // Match offerTextCore: only integer values 0–12 read a number word.
      const keys = Number.isInteger(ceilingMin) && ceilingMin >= 0 && ceilingMin <= 12
        ? [`quantity.number${ceilingMin}`] : [];
      meaning = {ceilingMin, ui: Object.fromEntries(keys.map(key => [key, own(own(dependencies, 'ui'), key)]))};
    } else meaning = value;
  } else throw Error(`Unknown fact token: ${token}`);
  if (value === undefined) throw Error(`Missing fact value: ${token}`);
  return {token, meaning};
}

/** Reference owners are conservative review dependencies, never inferred from equal text/numbers. */
export function referenceDependency(reference, value, dependencies) {
  const source = own(dependencies, reference.collection);
  const id = reference.encoding === 'astro-reference' ? value?.id : value;
  return {owner: reference.collection, id, meaning: own(source, id)};
}

export function structuredFactDependency(value, dependencies, locale) {
  if (value && typeof value === 'object' && Object.hasOwn(value, 'project')) {
    return tokenDependency(`project.${value.project}.${value.field}${value.display ? '.' + value.display : ''}`, dependencies, locale);
  }
  if (value && typeof value === 'object' && Object.hasOwn(value, 'fact')) {
    const entry = own(own(dependencies, 'businessFacts'), value.fact);
    return {owner: 'businessFacts', id: value.fact, display: value.display ?? 'number', meaning: entry};
  }
  return null;
}
