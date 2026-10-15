// Labels and editorial visibility are declared by the site's schema.
const humanize=value=>String(value??'Inhalt').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]+/g,' ').replace(/^./,c=>c.toUpperCase());
export function fieldLabel(field) {
  const key=[...(field.path||[])].reverse().find(part=>typeof part!=='number');
  return field.label && field.label!==key ? field.label : humanize(key);
}
export function choiceLabel(choice,field) {
  if(choice&&typeof choice==='object')return choice.label;
  return field?.['x-afe']?.choices?.[choice]?.label||humanize(choice);
}
export function isTechnical(field) {
  return ['advanced','hidden'].includes(field['x-afe']?.visibility)||field.advanced===true;
}
