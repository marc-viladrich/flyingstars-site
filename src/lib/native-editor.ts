const privateBuild=()=>process.env.FLYINGSTARS_EDITOR==='1';
export function nativeRecord(record:string,path:(string|number)[],inline=false) {return privateBuild()?{'data-native-record':record,'data-native-path':JSON.stringify(path),...(inline?{'data-native-inline':'true'}:{})}:{};}
export function nativeField(props:Record<string,any>,path:(string|number)[],inline=false) {
 const absolute=['sections',props._nativeIndex??props.index,...path],metadata=props._localization;
 const attrs:Record<string,string>=props._nativeRecord?nativeRecord(props._nativeRecord,absolute,inline):{};
 if(metadata?.locale&&metadata.locale!=='de') {
  const key=JSON.stringify(absolute),has=(paths:(string|number)[][])=>paths.some(entry=>JSON.stringify(entry)===key);
  if(has(metadata.fallback))attrs.lang='de';else if(has(metadata.applied))attrs.lang=metadata.locale;
  if(privateBuild()&&has(metadata.machine))attrs['data-native-machine']='true';
 }
 return attrs;
}
export function nativeMedia(props:Record<string,any>,path:(string|number)[]){return privateBuild()&&props._nativeRecord?{'data-native-record':props._nativeRecord,'data-native-media-path':JSON.stringify(['sections',props._nativeIndex??props.index,...path])}:{};}
export function nativeRecordMedia(record:string,path:(string|number)[]){return privateBuild()?{'data-native-record':record,'data-native-media-path':JSON.stringify(path)}:{};}
export function nativeSection(props:Record<string,any>){return privateBuild()&&props._nativeRecord?{'data-native-record':props._nativeRecord,'data-native-section-index':props._nativeIndex??props.index,'data-native-section-type':props.type}:{};}
// Repeated card/list wrapper: record = rendered owner (omitted when it is the section's own record);
// entry = array path, relative to the section when the entry lives in the section's record, otherwise
// relative to entryRecord (default: the section record, else record). Query loops pass no entry.
// Every wrapper is stamped as one occurrence (data-native-item) with its explicit entry owner, so the editor
// can tell "this card" from "the record it shows" and read what exactly the card renders.
export function nativeItem(props:Record<string,any>,{record,entry,entryRecord}:{record?:string;entry?:(string|number)[];entryRecord?:string}={}){if(!privateBuild())return {};const page=props._nativeRecord,owner=entryRecord??page??record,attrs:Record<string,string>={};if(record&&record!==page)attrs['data-native-record']=record;if(entry&&owner){attrs['data-native-entry']=JSON.stringify(page&&owner===page?['sections',props._nativeIndex??props.index,...entry]:entry);attrs['data-native-entry-record']=owner;}if(Object.keys(attrs).length)attrs['data-native-item']='';return attrs;}
// Values a card renders without an editable marker of their own (a link target, a class, canvas settings,
// a date, a count): stamped at the render expression. A path array belongs to the section's record (relative
// to the section, like nativeField); {record,path} belongs to another record.
type NativeUse=(string|number)[]|{record:string;path:(string|number)[]};
export function nativeUses(props:Record<string,any>,uses:NativeUse[]){if(!privateBuild())return {};const list=uses.map(use=>Array.isArray(use)?(props._nativeRecord?[props._nativeRecord,['sections',props._nativeIndex??props.index,...use]]:null):[use.record,use.path]).filter(Boolean);return list.length?{'data-native-uses':JSON.stringify(list)}:{};}
// Editor builds keep optional runtime nodes (canvases) in the DOM, hidden, so toggling them is an
// attribute change the live preview can apply without restarting the section's animations.
export function editorBuild(){return privateBuild();}

// Query-backed lists use their collection-wide numeric order, never fictitious array entries.
export function nativeOrder(field:string){return privateBuild()?{'data-native-order-field':field}:{};}
