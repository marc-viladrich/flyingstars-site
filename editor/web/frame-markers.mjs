// What the editor frame reads from the page: astro-frontend-editor markers (one data-afe attribute per element),
// decoded with the product's browser decoder and translated into editor records (id) and editor paths.
// A Markdown file body (address part "body") is the editor path ["body"], as in the source registry.
import {markersOf,occurrenceOf as outermostItem,occurrenceMarkers as productOccurrenceMarkers,sameOccurrence} from '../vendor/astro-frontend-editor/src/markers/client.mjs';

export {markersOf,sameOccurrence};
export const MARKED='[data-afe]';
export const editorPath=address=>address.part==='body'?['body',...address.path]:[...address.path];
const sameOwner=(a,b)=>a?.collection===b?.collection&&a?.id===b?.id;
const startsWith=(prefix,path)=>prefix.length<=path.length&&prefix.every((part,index)=>path[index]===part);

export const isField=marker=>marker.kind==='field'||marker.kind==='body';
/** Edited in place (text on the page): inline fields and Markdown bodies. */
export const isInlineField=marker=>marker.kind==='body'||marker.kind==='field'&&marker.mode==='inline';
/** A formatted or computed display (price, count): opens its raw field in the panel. */
export const isPanelField=marker=>marker.kind==='field'&&marker.mode!=='inline';
export const isMedia=marker=>marker.kind==='media';
/** One block of a block list (a page section): a blocks binding to a list entry. */
export const isBlock=marker=>marker.kind==='blocks'&&typeof marker.address.path.at(-1)==='number';
/** The block list itself, also present (as an anchor) when it is empty. */
export const isBlockList=marker=>marker.kind==='blocks'&&typeof marker.address.path.at(-1)!=='number';
export const isItem=marker=>marker.kind==='item';
export const isMembership=marker=>marker.kind==='item'&&!!marker.membership;
export const isColor=marker=>marker.kind==='color';
export const isOrder=marker=>marker.kind==='order';

export const markerOf=(element,test)=>markersOf(element).find(test)??null;
export const hasMarker=(element,test)=>!!markerOf(element,test);
/** The nearest element (node itself or an ancestor) with a marker passing test. */
export function closestMarker(node,test){
 for(let element=node?.closest?.(MARKED);element;element=element.parentElement?.closest(MARKED)){
  const marker=markerOf(element,test);
  if(marker)return {node:element,marker};
 }
 return null;
}
/** Every element below root (root included) with a marker passing test, once per marker. */
export function allMarked(root,test){
 const elements=[...(root?.matches?.(MARKED)?[root]:[]),...root.querySelectorAll(MARKED)];
 return elements.flatMap(node=>markersOf(node).filter(test).map(marker=>({node,marker})));
}

/** Editor record lookup by Astro address owner; null when the page renders a record the editor does not hold. */
export function recordOf(records,owner){return records.find(record=>sameOwner(record.address,owner))??null;}
export const recordIdOf=(records,owner)=>recordOf(records,owner)?.id??null;
export const binding=(records,address)=>{const id=recordIdOf(records,address.owner);return id?{id,path:editorPath(address)}:null;};

export function blockInfo(records,node){
 const found=closestMarker(node,isBlock),id=found&&recordIdOf(records,found.marker.address.owner);
 return id?{id,index:found.marker.address.path.at(-1),node:found.node}:null;
}
/** The list entry around node: membership owner and path, plus the displayed record when it is another one. */
export function membershipInfo(records,node){
 const found=closestMarker(node,isMembership);
 if(!found)return null;
 const {membership,rendered}=found.marker,id=recordIdOf(records,membership.owner);
 if(!id)return null;
 const shown=sameOwner(rendered,membership.owner)?null:recordIdOf(records,rendered);
 return {id,path:editorPath(membership),record:shown,node:found.node};
}
/** The card the person means: the outermost item around node, in editor terms, with its product identity. */
export function occurrenceInfo(records,node){
 const found=outermostItem(node);
 if(!found)return null;
 const {identity}=found,membership=identity.membership,owner=membership?.owner??identity.rendered;
 const id=recordIdOf(records,owner),item=id&&records.find(record=>record.id===id);
 if(!item)return null;
 const path=membership?editorPath(membership):[];
 if(membership&&path.reduce((value,key)=>value?.[key],item.data)===undefined)return null;
 const record=membership&&!sameOwner(identity.rendered,membership.owner)?recordIdOf(records,identity.rendered):null;
 return {node:found.node,identity,id,path,record};
}
/** What one occurrence renders, as editor {id,path,kind}; nested entries of its owner stand for the entry. */
export function occurrenceBindings(records,root,identity){
 const out=[];
 for(const {address,kind} of productOccurrenceMarkers(root,identity)){const found=binding(records,address);if(found)out.push({...found,kind});}
 return out;
}

/** Editor records whose content is visible on the page: shown records and owners of the values rendered here. */
export function recordsOnPage(records,root){
 const ids=new Set();
 for(const {marker} of allMarked(root,()=>true)){
  const owners=marker.kind==='item'?[marker.rendered,marker.membership?.owner]:['uses','order'].includes(marker.kind)?[]:[marker.address?.owner];
  for(const owner of owners){const id=owner&&recordIdOf(records,owner);if(id)ids.add(id);}
 }
 return [...ids];
}
/** Rewrites every address of the markers on element (item membership, uses and color included). */
export function rewriteAddresses(element,map){
 const raw=element.getAttribute('data-afe');
 if(raw===null)return;
 const value=JSON.parse(raw),markers=value.markers??[value];
 for(const marker of markers){
  if(marker.address)marker.address=map(marker.address);
  if(marker.membership)marker.membership=map(marker.membership);
  if(marker.addresses)marker.addresses=marker.addresses.map(map);
 }
 const next=JSON.stringify(value);
 if(next!==raw)element.setAttribute('data-afe',next);
}
/** Renumbers list entry listPath[...] of owner to index in element and below (a moved card or section). */
export function renumber(root,owner,listPath,index){
 const depth=listPath.length;
 const map=address=>sameOwner(address.owner,owner)&&address.part==='data'&&address.path.length>depth&&startsWith(listPath,address.path)?{...address,path:address.path.map((part,i)=>i===depth?index:part)}:address;
 for(const element of [...(root.matches?.(MARKED)?[root]:[]),...root.querySelectorAll(MARKED)])rewriteAddresses(element,map);
}
/** Marker attribute for an element the frame creates itself (a pending section's block). */
export const blockAttribute=(owner,path)=>JSON.stringify({v:1,kind:'blocks',address:{owner,part:'data',path}});
const htmlJSON=value=>JSON.stringify(value).replaceAll('"','&quot;');
const escapeRegExp=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** HTML of a server fragment with the positions in the given lists blanked (and occurrence names, which are
 * the site's own location labels), so a moved section or card compares equal to its earlier render. */
export function positionless(html,lists){
 let out=html.replace(/&quot;occurrence&quot;:&quot;.*?&quot;(?=[,}])/g,'&quot;occurrence&quot;:#');
 for(const list of lists){const prefix=htmlJSON(list).slice(0,-1);out=out.replace(new RegExp(escapeRegExp(prefix)+',\\d+','g'),prefix+',#');}
 return out;
}
/** Paths of the block lists on a page (e.g. ["sections"]); their entries are what moves between regions. */
export const blockLists=root=>[...new Map(allMarked(root,isBlockList).map(({marker})=>[JSON.stringify(marker.address.path),marker.address.path])).values()];
