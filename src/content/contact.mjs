import data from './contact.json' with {type:'json'};
export const CONTACT_OWNER={collection:'contact',id:'configuration'};
const international=number=>'+49'+number.replaceAll(' ','').slice(1);
/** @param {typeof data} source */
export function projectContact(source){
 /** @param {string} label */
 const phone=label=>({label,href:`tel:${international(label)}`});
 return {...source,phone:phone(source.phone),mobile:phone(source.mobile),whatsapp:{label:'WhatsApp',href:`https://wa.me/${international(source.mobile).slice(1)}`}};
}
export const contact=projectContact(data);
// Explicit tokens only. No replacement of arbitrary prose or legal documents.
export function contactText(text,source=contact){
 const values={email:source.email,'phone.label':source.phone.label,'phone.href':source.phone.href};
 return text.replace(/\{\{contact\.([\w.]+)\}\}/g,(_,key)=>{
  if(!Object.hasOwn(values,key))throw Error(`Unbekannter Kontaktplatzhalter: ${key}`);
  return values[key];
 });
}
export function legalContactDrift(documents,source=contact){
 return documents.flatMap(({file,text})=>{
  const facts={email:source.email,...Object.fromEntries(source.post.map((line,i)=>[`post.${i}`,line])),...(file.endsWith('impressum.yaml')?{'phone.href':source.phone.href,...Object.fromEntries(source.visit.map((line,i)=>[`visit.${i}`,line]))}:{})};
  return Object.entries(facts).filter(([,value])=>!text.includes(value)).map(([fact,expected])=>({file,fact,expected}));
 });
}
