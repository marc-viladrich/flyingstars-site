// Keep the canonical text path alongside the feature so the editor writes to its package owner.
/**
 * @param {{name:string,featureGroups:{items:{id:string,text:string}[]}[]}} pkg
 * @param {string[]} ids
 * @returns {{feature:{id:string,text:string},path:(string|number)[]}[]}
 */
export function selectedPackageFeatures(pkg, ids) {
 const features=new Map();
 pkg.featureGroups.forEach((group,i)=>group.items.forEach((feature,j)=>features.set(feature.id,{feature,path:['featureGroups',i,'items',j,'text']})));
 return ids.map(id=>{
  const selected=features.get(id);
  if(!selected)throw new Error(`Paket ${pkg.name}: unbekannte Leistungskennung „${id}“ in featureIds.`);
  return selected;
 });
}
