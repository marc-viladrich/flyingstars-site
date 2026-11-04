import data from './show-packages.json' with {type:'json'};
// The JSON object keys are package identity and order, services has its own schema.
export const PACKAGE_NAMES=Object.freeze(/** @type {Array<Exclude<keyof typeof data,'services'>>} */ (Object.keys(data).filter(name=>name!=='services')));
export const packageLabel=(name,t,{form=false}={})=>{const label=t(data[name].labelKey);return form?label[0].toLocaleLowerCase()+label.slice(1):label;};
