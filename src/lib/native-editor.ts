const privateBuild=()=>process.env.FLYINGSTARS_EDITOR==='1';
export function nativeRecord(record:string,path:(string|number)[]) {return privateBuild()?{'data-native-record':record,'data-native-path':JSON.stringify(path)}:{};}
export function nativeField(props:Record<string,any>,path:(string|number)[]) {return props._nativeRecord?nativeRecord(props._nativeRecord,['sections',props.index,...path]):{};}
export function nativeMedia(props:Record<string,any>,path:(string|number)[]){return privateBuild()&&props._nativeRecord?{'data-native-record':props._nativeRecord,'data-native-media-path':JSON.stringify(['sections',props.index,...path])}:{};}
export function nativeRecordMedia(record:string,path:(string|number)[]){return privateBuild()?{'data-native-record':record,'data-native-media-path':JSON.stringify(path)}:{};}
export function nativeSection(props:Record<string,any>){return privateBuild()&&props._nativeRecord?{'data-native-record':props._nativeRecord,'data-native-section-index':props.index,'data-native-section-type':props.type}:{};}
