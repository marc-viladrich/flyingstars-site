/** Browser extension contract, version 1.0.
 * Definitions are trusted modules supplied by the site adapter, never by a request parameter.
 * hooks: named resolvers/validators below. Resolvers return null/undefined when not responsible.
 * widgets: namespaced IDs -> {render?, choices?, table?, layout?} consumed by schema x-afe.widget.
 * codecs: namespaced IDs -> {decode, encode, plainText, html?, fromDOM?, supportsDOM?}.
 * Lifecycle hooks receive the frame document/window explicitly. restoreFrame may return a Promise.
 * A frame exposes its existing cross-window bridge through connect(), on this registry only.
 */
export const BROWSER_EXTENSION_CONTRACT_VERSION='1.0';
const hookNames=new Set(['resolveReference', 'omitOwnedField', 'omitRecordField', 'mediaRecordFor', 'imageSummary', 'mediaSource', 'mediaControl', 'siteChange', 'mediaSelection', 'selectedMedia', 'uploadedMediaId', 'referencePrefix', 'optionalFieldAllowed', 'referencedRecords', 'mediaUsageKeys', 'derivedPath', 'inlineCodec', 'createRecord', 'uniqueSection', 'creationForm', 'validateCreation', 'navigateCreated', 'canDelete', 'query', 'sectionQuery', 'normalize', 'recordKinds', 'navigatorOrder', 'sortNavigatorByRoute', 'navigation', 'pageChoices', 'pageGroups', 'currentPage', 'navigatorName', 'changeKinds', 'translationKinds', 'recordGroup', 'mediaUsage', 'mediaCollection', 'mediaLibrary', 'mediaUsers', 'isRuntime', 'prepareClone', 'variantPresentation','frameStyles','presentFrame', 'snapshotFrame', 'restoreFrame', 'ownsTransientInput', 'translationStorage','languages','localeNames','colorTokens','orderedQuery','attributePolicy','newPage','isPage','ownerless','routeTools','isMedia','isPhoto','mediaSearchText','mediaAssetSearch']);

const immutable=value=>{if(!value||typeof value!=='object')return value;return Object.freeze(Array.isArray(value)?value.map(immutable):Object.fromEntries(Object.entries(value).map(([key,child])=>[key,immutable(child)])));};
const namespaced=value=>typeof value==='string'&&/^[-a-z0-9]+\/[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(value);
export function createBrowserExtensionRegistry(definitions=[]) {
 const names=new Set(),capabilities={widgets:{},codecs:{}};
 const ordered=definitions.map(extension=>{
  if(!extension||!namespaced(extension.name))throw Error('Extension name must be namespaced.');
  if(names.has(extension.name))throw Error('Duplicate extension: '+extension.name);
  if(extension.contractVersion!==BROWSER_EXTENSION_CONTRACT_VERSION)throw Error('Extension contract version mismatch: '+extension.name);
  names.add(extension.name);
  for(const [name,hook] of Object.entries(extension.hooks||{}))if(!hookNames.has(name)||typeof hook!=='function')throw Error('Invalid extension hook: '+name);
  const result={...extension,hooks:Object.freeze({...extension.hooks})};
  for(const kind of ['widgets','codecs']){
   const entries={};
   for(const [id,value]of Object.entries(extension[kind]||{})){
    if(!namespaced(id)||Object.hasOwn(capabilities[kind],id))throw Error('Invalid or duplicate '+kind+' ID: '+id);
    if(!value||typeof value!=='object')throw Error('Invalid '+kind+': '+id);
    const allowed=kind==='widgets'?{render:'function',choices:'function',table:'boolean',layout:'string'}:{decode:'function',encode:'function',plainText:'function',html:'function',fromDOM:'function',supportsDOM:'function',markSelector:'string',marks:'object',buttons:'object'};
    for(const [key,entry]of Object.entries(value))if(!Object.hasOwn(allowed,key)||typeof entry!==allowed[key])throw Error('Invalid '+kind+' member: '+id+'.'+key);
    if(kind==='codecs'&&['decode','encode','plainText'].some(key=>typeof value[key]!=='function'))throw Error('Incomplete codec: '+id);
    entries[id]=immutable(value);capabilities[kind][id]=entries[id];
   }
   result[kind]=Object.freeze(entries);
  }
  return Object.freeze(result);
 }).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 let active=false;
 const hooks=name=>{if(!hookNames.has(name))throw Error('Unknown extension hook: '+name);return ordered.flatMap(e=>e.hooks[name]?[e.hooks[name]]:[]);};
 const enter=work=>{if(active)throw Error('Recursive extension dispatch is not allowed.');active=true;try{return work();}finally{active=false;}};
 const syncValue=(name,hook,args)=>{const value=hook(...args);if(value?.then){Promise.resolve(value).catch(()=>{});throw Error('Async hook requires runAsync: '+name);}return value;};
 const invoke=(name,args,mode)=>enter(()=>{
  const out=[];
  for(const hook of hooks(name)){
   const value=syncValue(name,hook,args);
   if(mode==='first'&&value!=null)return value;
   if(mode==='some'&&value)return true;
   if(mode==='collect'&&value!=null)out.push(...value);
  }
  return mode==='collect'?out:mode==='some'?false:undefined;
 });
 const required=(name,args,mode)=>{if(!hooks(name).length)throw Error('Required extension hook is missing: '+name);return invoke(name,args,mode);};
 const bridge={};
 return Object.freeze({definitions:Object.freeze(ordered),widgets:Object.freeze(capabilities.widgets),codecs:Object.freeze(capabilities.codecs),
  first:(name,...args)=>invoke(name,args,'first'),require:(name,...args)=>required(name,args,'first'),
  some:(name,...args)=>invoke(name,args,'some'),collect:(name,...args)=>invoke(name,args,'collect'),
  run:(name,...args)=>invoke(name,args,'run'),runRequired:(name,...args)=>required(name,args,'run'),
  async runAsync(name,...args){const list=enter(()=>hooks(name).map(hook=>hook));for(const hook of list)await enter(()=>hook(...args));},
  snapshotFrame(context){return enter(()=>Object.fromEntries(ordered.filter(e=>e.hooks.snapshotFrame).map(e=>[e.name,syncValue('snapshotFrame',e.hooks.snapshotFrame,[context])])));},
  async restoreFrame(states={},context){for(const extension of ordered)if(extension.hooks.restoreFrame)await enter(()=>extension.hooks.restoreFrame(states?.[extension.name],context));},
  ownsTransientInput(node,states){return enter(()=>ordered.some(e=>e.hooks.ownsTransientInput&&syncValue('ownsTransientInput',e.hooks.ownsTransientInput,[node,states?.[e.name]])));},
  connect(values){for(const key of Object.keys(values))if(!['frame','layout'].includes(key)||Object.hasOwn(bridge,key))throw Error('Invalid or duplicate bridge: '+key);Object.assign(bridge,values);},
  get inlineCodec(){const id=required('inlineCodec',[],'first');if(!Object.hasOwn(capabilities.codecs,id))throw Error('Inline codec is not registered: '+id);return capabilities.codecs[id];},
  get frame(){return bridge.frame;},get layout(){return bridge.layout;},
 });
}
