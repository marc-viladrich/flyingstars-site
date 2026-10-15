// Native editor records persist ID strings. Astro converts the same annotated fields to
// reference() lookups at the collection boundary. Keep constraints and object refinements.
export function astroReferences(schema,reference) {
  const metadata=schema.meta?.()||{},relationship=metadata['x-afe']?.reference;
  // Media assetId keeps its existing prefixed ID encoding for the synchronous media resolver.
  if(relationship?.encoding==='id'&&relationship.collection!=='media'){
    let result=reference(relationship.collection);
    if(schema.isOptional())result=result.optional();
    if(schema.isNullable())result=result.nullable();
    return result.meta({...metadata,'x-afe':{...metadata['x-afe'],reference:{...relationship,encoding:'astro-reference'}}});
  }
  const definition=schema.def;
  if(definition.type==='object')return schema.clone({...definition,shape:Object.fromEntries(Object.entries(schema.shape).map(([key,child])=>[key,astroReferences(child,reference)]))}).meta(metadata);
  if(definition.type==='array')return schema.clone({...definition,element:astroReferences(schema.element,reference)}).meta(metadata);
  if(definition.innerType)return schema.clone({...definition,innerType:astroReferences(definition.innerType,reference)}).meta(metadata);
  return schema;
}
