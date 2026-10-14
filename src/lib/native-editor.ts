const privateBuild=()=>process.env.FLYINGSTARS_EDITOR==='1';
export function nativeRecord(record:string,path:(string|number)[]) {return privateBuild()?{'data-native-record':record,'data-native-path':JSON.stringify(path)}:{};}
export function nativeField(props:Record<string,any>,path:(string|number)[]) {return props._nativeRecord?nativeRecord(props._nativeRecord,['sections',props._nativeIndex??props.index,...path]):{};}
export function nativeMedia(props:Record<string,any>,path:(string|number)[]){return privateBuild()&&props._nativeRecord?{'data-native-record':props._nativeRecord,'data-native-media-path':JSON.stringify(['sections',props._nativeIndex??props.index,...path])}:{};}
export function nativeRecordMedia(record:string,path:(string|number)[]){return privateBuild()?{'data-native-record':record,'data-native-media-path':JSON.stringify(path)}:{};}
export function nativeSection(props:Record<string,any>){return privateBuild()&&props._nativeRecord?{'data-native-record':props._nativeRecord,'data-native-section-index':props._nativeIndex??props.index,'data-native-section-type':props.type}:{};}
// Repeated card/list wrapper: record = rendered owner (omitted when it is the section's own record);
// entry = array path, relative to the section when the entry lives in the section's record, otherwise
// relative to entryRecord (default: the section record, else record). Query loops pass no entry.
export function nativeItem(props:Record<string,any>,{record,entry,entryRecord}:{record?:string;entry?:(string|number)[];entryRecord?:string}={}){if(!privateBuild())return {};const page=props._nativeRecord,owner=entryRecord??page??record,attrs:Record<string,string>={};if(record&&record!==page)attrs['data-native-record']=record;if(entry&&owner){attrs['data-native-entry']=JSON.stringify(page&&owner===page?['sections',props._nativeIndex??props.index,...entry]:entry);if(owner!==(attrs['data-native-record']??page))attrs['data-native-entry-record']=owner;}return attrs;}
// Editor builds keep optional runtime nodes (canvases) in the DOM, hidden, so toggling them is an
// attribute change the live preview can apply without restarting the section's animations.
export function editorBuild(){return privateBuild();}

// Query-backed lists use their collection-wide numeric order, never fictitious array entries.
export function nativeOrder(field:string){return privateBuild()?{'data-native-order-field':field}:{};}
