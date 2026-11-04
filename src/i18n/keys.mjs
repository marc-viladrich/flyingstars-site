/** Fresh identities for copied sections and all their descendants. Public anchors are handled separately. */
export function renewKeys(value){
 if(value&&typeof value==='object'){
  if(Object.hasOwn(value,'_key'))value._key=globalThis.crypto.randomUUID();
  Object.values(value).forEach(renewKeys);
 }
 return value;
}
