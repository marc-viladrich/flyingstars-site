/** Distinct taxonomies: a reference category is not a configurator sequence or a request type. */
export const FORM_OCCASIONS={firma:'contactform.corporateEvent',stadt:'contactform.cityFestival',agentur:'contactform.agency',privat:'contactform.weddingPrivate',indoor:null,sonstiges:'contactform.other'};
export const FORM_OCCASION_IDS=Object.keys(FORM_OCCASIONS);
export const REFERENCE_OCCASIONS={firma:'references.brands',stadt:'references.cities',kultur:'references.culture',privat:'contactform.weddingPrivate',indoor:'references.indoor',sonstiges:'contactform.other'};
export const REFERENCE_OCCASION_IDS=Object.keys(REFERENCE_OCCASIONS);
// Preserve existing inquiry semantics. Culture and anniversaries deliberately reach "sonstiges".
export const CONFIGURATOR_FORM_MAP={launch:'firma',jubilaeum:'sonstiges',festival:'stadt',hochzeit:'privat',kultur:'sonstiges',silvester:'stadt'};
export const REFERENCE_FORM_MAP={firma:'firma',stadt:'stadt',kultur:'sonstiges',privat:'privat',indoor:'indoor',sonstiges:'sonstiges'};
export function formOccasionFor(id){const value=CONFIGURATOR_FORM_MAP[id];if(!value||!FORM_OCCASION_IDS.includes(value))throw Error('Unbekannter Konfiguratoranlass: '+id);return value;}
export const formOccasions=t=>Object.entries(FORM_OCCASIONS).map(([id,key])=>[id,key?t(key):'Indoor']);
