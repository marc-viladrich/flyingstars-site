// Editor markers for FlyingStars, written with the astro-frontend-editor helpers (one `data-afe` attribute per
// element, full addresses, explicit occurrences). Components keep passing editor record IDs such as
// "page/index"; ownerOf() turns them into Astro collection addresses. Outside editor builds (AFE_MODE=editor)
// every marker is empty; only the `lang` attributes of translated section fields are public.
import {address,field,media,blocks,body,item,uses,color,order,merge,editorBuild} from 'astro-frontend-editor/markers';
import {legacyCollections,siteAddresses} from './content-addresses.mjs';

export {editorBuild};
type Path=(string|number)[];
type Attrs=Record<string,any>;
type Owner={collection:string;id:string};
type SectionProps={_recordId?:string;_sectionIndex?:number;index?:number;_localization?:any;[key:string]:any};

export function ownerOf(recordId:string):Owner{
 const slash=recordId.indexOf('/'),prefix=recordId.slice(0,slash),id=recordId.slice(slash+1);
 const owner=prefix==='site'?siteAddresses[id as keyof typeof siteAddresses]:legacyCollections[prefix as keyof typeof legacyCollections]&&{collection:legacyCollections[prefix as keyof typeof legacyCollections],id};
 if(slash<1||!owner)throw new TypeError(`Unbekannte Datensatz-ID für Editor-Markierung: ${recordId}`);
 return owner;
}
const sectionPath=(props:SectionProps,path:Path=[]):Path=>['sections',props._sectionIndex??props.index as number,...path];

/** Several markers (and plain attributes such as lang) on one element. merge() alone drops non-marker attributes. */
export function markers(...attributes:Attrs[]):Attrs{
 const plain:Attrs={};
 for(const attrs of attributes)for(const [key,value] of Object.entries(attrs))if(key!=='data-afe')plain[key]=value;
 return {...plain,...merge(...attributes)};
}

/** A text field of a record, edited in place. Its format (plain, inline marks, Markdown) comes from the schema. */
export const recordField=(recordId:string,path:Path)=>field(address(ownerOf(recordId),path),{mode:'inline'});
/** A formatted or computed display of a raw field (a price, a count): opens the field in the panel. */
export const recordPanelField=(recordId:string,path:Path)=>field(address(ownerOf(recordId),path),{mode:'panel'});
export const recordBody=(recordId:string)=>body(ownerOf(recordId));
export const recordMedia=(recordId:string,path:Path)=>media(address(ownerOf(recordId),path));
export const colorBinding=(recordId:string,path:Path,cssVar:string)=>color(address(ownerOf(recordId),path),cssVar);
/** A query-backed list sorted by a numeric field of its collection. */
export const collectionOrder=(collection:string,path:string)=>order(collection,[path]);

/** A field of the section's own record; translated output keeps its lang attribute in every build. */
export function sectionField(props:SectionProps,path:Path):Attrs{
 if(!props._recordId)return {};
 const absolute=sectionPath(props,path),metadata=props._localization,attrs:Attrs={...field(address(ownerOf(props._recordId),absolute),{mode:'inline'})};
 if(metadata?.locale&&metadata.locale!=='de'){
  const key=JSON.stringify(absolute),has=(paths:Path[])=>paths.some(entry=>JSON.stringify(entry)===key);
  if(has(metadata.fallback))attrs.lang='de';else if(has(metadata.applied))attrs.lang=metadata.locale;
 }
 return attrs;
}
export const sectionMedia=(props:SectionProps,path:Path)=>props._recordId?media(address(ownerOf(props._recordId),sectionPath(props,path))):{};
/** The section element: one block of its record's `sections` list. */
export const sectionBlock=(props:SectionProps)=>props._recordId?blocks(address(ownerOf(props._recordId),sectionPath(props))):{};
/** The record's whole block list, on an anchor that also exists when the list is empty. */
export const blockList=(recordId:string)=>blocks(address(ownerOf(recordId),['sections']));

// Repeated card/list wrapper. record = the record the card displays (default: the membership owner);
// entry = array path, relative to the section when it lives in the section's record, otherwise relative to
// entryRecord (default: the section record, else record). Query loops pass no entry. The occurrence names
// the location on the page, so two presentations of one membership share it and different places do not.
export function listItem(props:SectionProps,{record,entry,entryRecord}:{record?:string;entry?:Path;entryRecord?:string}={}):Attrs{
 if(!editorBuild())return {};
 const page=props._recordId,owner=entryRecord??page??record;
 const membership=entry&&owner?address(ownerOf(owner),page&&owner===page?sectionPath(props,entry):entry):undefined;
 const rendered=record&&record!==page?record:membership?owner:undefined;
 if(!rendered)return {};
 const where=page?`${page}/sections/${props._sectionIndex??props.index}`:'page';
 const what=membership?`${owner}#${JSON.stringify(membership.path)}`:`record:${rendered}`;
 return item(ownerOf(rendered as string),{...(membership?{entry:membership}:{}),occurrence:`${where} ${what}`});
}

// Values a card renders without an editable element of their own (a link target, a class, canvas settings,
// a date, a count). A path array belongs to the section's record (relative to the section, like sectionField);
// {record,path} belongs to another record.
type Use=Path|{record:string;path:Path};
export function sectionUses(props:SectionProps,list:Use[]):Attrs{
 if(!editorBuild())return {};
 const addresses=list.flatMap(use=>Array.isArray(use)?(props._recordId?[address(ownerOf(props._recordId),sectionPath(props,use))]:[]):[address(ownerOf(use.record),use.path)]);
 // Every entry is an absolute address, so the first owner only satisfies the signature.
 return addresses.length?uses(addresses[0].owner,addresses):{};
}
