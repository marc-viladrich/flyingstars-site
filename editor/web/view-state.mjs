import {nodeAt} from '../core/metadata.mjs';
import {resolveReference,imageSummary,mediaSource} from './site-adapter.mjs';
import {describe} from './native-schema.mjs';
export function normalizedRoute(path){const clean=String(path||'/').split(/[?#]/,1)[0];return clean==='/'?'/':'/'+clean.replace(/^\/+|\/+$/g,'')+'/';}
export function navigationChoices(records){const choices=new Map([['/','Startseite'],['/drohnenshow-preise/','Preise & Pakete'],['/show-konfigurator/','Show-Konfigurator']]);for(const item of records){const path=item.route||(item.id.startsWith('page/')?(item.id==='page/index'?'/':'/'+item.id.slice(5)+'/'):null);if(path)choices.set(normalizedRoute(path),item.title);}return [...choices].map(([value,label])=>({value,label}));}
export function savedRecordRoute(records,id){return records.find(item=>item.id===id)?.route||'/';}
export function publishNeedsActivation(review){return !!review.publishedHead&&review.activePublishedHead!==review.publishedHead;}
export function mediaSourceChanged(originalSource,currentSource){return originalSource!==currentSource;}
export function fieldsInScope(fields,path,scope){const prefix=scope==='media'?path:path[0]==='sections'?path.slice(0,2):path.slice(0,-1);return fields.filter(field=>prefix.every((part,index)=>field.path[index]===part)&&(scope!=='context'||path[0]!=='sections'||['enum','boolean'].includes(field.kind)));}
export function sourceMediaSources(records){
 const sources={};
 for(const record of records){
  const containers=record.schema?describe(record.schema,record.data).containers:record.containers||[];
  for(const container of containers.filter(c=>c.format==='image')){
   const value=container.path.reduce((value,key)=>value?.[key],record.data);if(!value)continue;
   sources[record.id+'/'+JSON.stringify(container.path)]=mediaSource(value,records);
  }
 }
 return sources;
}
export function floatingInspectorAllowed(selection,{preview=false,busy=false}={}){return !!selection&&!selection.rich&&!preview&&!busy;}
export function richFormattingAllowed({preview=false,busy=false,locale='de'}={}){return !preview&&!busy&&locale==='de';}
const pathValue=(data,path)=>path.reduce((value,key)=>value?.[key],data);
const ancestor=(parent,path)=>parent.length<path.length&&parent.every((part,index)=>part===path[index]);
export function disclosedContainers(containers,data){return containers.filter(container=>!containers.some(parent=>['object','array'].includes(parent.kind)&&ancestor(parent.path,container.path)&&pathValue(data,parent.path)===undefined));}
export function disclosedOptionalFields(fields,containers,data){return fields.filter(field=>!containers.some(parent=>parent.path.every((part,index)=>field.path[index]===part)&&(parent.path.length===field.path.length||pathValue(data,parent.path)===undefined)));}
export function inspectionTarget(binding,section){if(section&&section.id!==binding.id)return {id:section.id,path:['sections',section.index],linkedId:binding.id};return {id:binding.id,path:binding.path,derived:binding.derived};}
export function restoredInspector(inspector,records,operation){if(!inspector||inspector.scope==='library'||operation?.kind==='set'&&operation.path?.length===1&&operation.path[0]==='sections')return null;return records.some(record=>record.id===inspector.context?.id)?inspector:null;}

// ---------------------------------------------------------------------------
// Item summaries: one resolver for list rows, drag labels, inspector headings and parent navigation.
// ---------------------------------------------------------------------------
const filled=value=>typeof value==='string'?value.trim():typeof value==='number'?String(value):'';
export {mediaRecordFor,imageSummary} from './site-adapter.mjs';
export function linkedRecordFor(records,entry,{itemLabel,element}={}) {
 if(!entry||typeof entry!=='object'||!itemLabel)return null;
 const reference=nodeAt(element,entry,itemLabel)?.['x-afe']?.reference;
 return resolveReference(records,pathValue(entry,itemLabel),reference);
}
export function itemSummary(entry,index,{records=[],image=false,imageChild=null,recordName=r=>r?.title||r?.id,itemLabel,element}={}) {
 const fallback=`Eintrag ${Number(index)+1||1}`;
 if(entry==null||typeof entry!=='object')return {label:filled(entry)||fallback,thumb:null};
 if(image){const summary=imageSummary(entry,records);return {label:summary.label||fallback,thumb:summary.thumb};}
 const linked=linkedRecordFor(records,entry,{itemLabel,element});
 if(linked)return {label:recordName(linked)||fallback,thumb:null};
 const child=imageChild?imageSummary(imageChild,records):null;
 return {label:(itemLabel&&filled(pathValue(entry,itemLabel)))||child?.label||fallback,thumb:child?.thumb||null};
}

// ---------------------------------------------------------------------------
// Instance scope: a card on the canvas is one occurrence of an owner (a list entry, or a whole record for
// query-backed cards), optionally rendering a second, shared record (the package of a pricing card).
// What it renders is read from the editor markers inside the occurrence; everything else of the owner
// stays reachable under one "Weitere Felder (N)".
// ---------------------------------------------------------------------------
const startsWith = (prefix, path) => prefix.length <= path.length && prefix.every((part, index) => path[index] === part);
// A marker on a container covers its fields; a marker on a field covers the containing unit.
export const covers = (marker, path) => startsWith(marker, path) || startsWith(path, marker);
// Raw frame markers → unique {id, path, kind}. A marker inside a nested entry of the same owner (a selected
// Leistung inside a pricing card, a fact inside an occasion card) stands for that entry, not for the text of
// the record it happens to show.
export function instanceMarkers(raw, ownerId) {
  const out = [],
    seen = new Set();
  for (const marker of raw) {
    const use = marker.via && marker.via.id === ownerId ? { id: marker.via.id, path: marker.via.path, kind: "entry" } : { id: marker.id, path: marker.path, kind: marker.kind };
    const key = use.id + "/" + JSON.stringify(use.path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(use);
  }
  return out;
}
// Two wrappers are the same occurrence when they stamp the same owner entry (or, without entry, the same
// record) in the same section: a fact rendered twice is one instance, two cards of one package are two.
export function sameOccurrence(a, b) {
  if (!a || !b) return false;
  const section = (s) => (s ? s.id + "#" + s.index : "");
  if (section(a.section) !== section(b.section)) return false;
  if (a.entry || b.entry) return !!a.entry && !!b.entry && a.entry.id === b.entry.id && JSON.stringify(a.entry.path) === JSON.stringify(b.entry.path);
  return a.record === b.record;
}
// The editable units of one owner below prefix, in schema order. A unit is what one control edits: a field,
// a whole list or image, an absent optional ("… ergänzen") or an absent optional switch with its default.
// fields/optionalFields: describe() output with technical ones removed and inline (edited on the canvas)
// flagged; containers additionally carry media (image) and reference/candidates (id pickers).
export function scopeUnits({ fields = [], containers = [], optionalFields = [], data, prefix = [] }) {
  const below = (path) => path.length > prefix.length && startsWith(prefix, path);
  const atomic = containers.filter((c) => below(c.path) && (c.kind === "array" || c.media) && pathValue(data, c.path) !== undefined);
  const absent = containers.filter((c) => below(c.path) && pathValue(data, c.path) === undefined);
  const inside = (path, list) => list.some((c) => c.path.length < path.length && startsWith(c.path, path));
  const units = [];
  for (const [i, c] of atomic.entries())
    if (!inside(c.path, atomic) && !inside(c.path, absent))
      units.push({ kind: c.kind === "array" && !c.media ? "array" : "media", path: c.path, reference: !!c.reference, candidates: c.candidates || 0, rank: i });
  for (const [i, c] of absent.entries())
    if (c.template !== undefined && !inside(c.path, atomic) && !inside(c.path, absent)) units.push({ kind: "add", path: c.path, rank: i });
  for (const [i, f] of fields.entries())
    if (below(f.path) && !inside(f.path, atomic) && !inside(f.path, absent)) units.push({ kind: "field", path: f.path, inline: !!f.inline, fieldKind: f.kind, rank: i });
  for (const [i, f] of optionalFields.entries())
    if (below(f.path) && pathValue(data, f.path) === undefined && !inside(f.path, atomic) && !inside(f.path, absent) && !units.some((u) => startsWith(u.path, f.path)))
      units.push({ kind: ["boolean", "enum"].includes(f.kind) ? "variant" : "add", path: f.path, rank: i });
  // Order as stored (which follows the schema): compare at the first differing key; absent keys go last.
  const position = (parent, key) => {
    if (typeof key === "number") return key;
    const keys = Object.keys(pathValue(data, parent) || {});
    return keys.includes(key) ? keys.indexOf(key) : keys.length + 1;
  };
  const order = (a, b) => {
    const d = a.path.findIndex((part, index) => part !== b.path[index]);
    if (d < 0 || d >= b.path.length) return a.path.length - b.path.length;
    return position(a.path.slice(0, d), a.path[d]) - position(a.path.slice(0, d), b.path[d]) || a.rank - b.rank;
  };
  return units.sort(order);
}
// shown: what the occurrence renders (fields edited on the canvas itself stay there unless includeInline);
// more: everything else, one entry per control, which is exactly the N of "Weitere Felder (N)". A rendered
// id picker shows its chosen entries; its unchosen candidates count once, as one more control.
export function partitionUnits(units, markers, { id, path: prefix = [] }, { includeInline = false } = {}) {
  const mine = markers.filter((m) => m.id === id && m.path.length > prefix.length && startsWith(prefix, m.path));
  const shown = [],
    more = [];
  for (const unit of units) {
    const rendered = unit.kind !== "add" && mine.some((m) => covers(m.path, unit.path));
    if (!rendered) {
      more.push(unit);
      continue;
    }
    if (unit.kind === "field" && unit.inline && !includeInline) continue;
    shown.push(unit);
    if (unit.reference && unit.candidates > 0) more.push({ ...unit, kind: "candidates" });
  }
  return { shown, more, count: more.length };
}

// ---------------------------------------------------------------------------
// Stable layout while a panel stays open: what the user just clicked never jumps to another zone. A card's
// split between its main area and "Weitere Felder", and which choices stand in the chosen list or among the
// candidates, are fixed when the view is first drawn and re-derived only when it is opened again. memo is
// one plain object per open view (and per control); the first call fills it.
// ---------------------------------------------------------------------------
const unitKey = (unit) => (unit.kind === "candidates" ? "candidates:" : "") + JSON.stringify(unit.path);
export function stablePartition(part, memo) {
  if (!memo.zones) {
    memo.zones = new Map([...part.shown.map((unit) => [unitKey(unit), { zone: "shown", unit }]), ...part.more.map((unit) => [unitKey(unit), { zone: "more", unit }])]);
    return part;
  }
  const fresh = new Map([...part.shown, ...part.more].map((unit) => [unitKey(unit), unit]));
  const freshZone = (key) => (part.shown.some((unit) => unitKey(unit) === key) ? "shown" : "more");
  for (const key of fresh.keys()) if (!memo.zones.has(key)) memo.zones.set(key, { zone: freshZone(key), unit: fresh.get(key) });
  const zones = { shown: [], more: [] };
  for (const [key, { zone, unit }] of memo.zones) {
    const base = key.startsWith("candidates:") ? key.slice("candidates:".length) : null;
    // A list kept whole in "Weitere Felder" already shows its candidates.
    if (base && memo.zones.get(base)?.zone === "more") continue;
    if (fresh.has(key)) zones[zone].push(fresh.get(key));
    // All candidates ticked: the candidates stay where they were clicked, now checked.
    else if (base && fresh.has(base)) zones[zone].push(unit);
  }
  return { shown: zones.shown, more: zones.more, count: zones.more.length };
}
// options: [{ key, … }]; chosen: the stored ids; matches(option, id). Returns the rows of the chosen list
// (first-drawn chosen ones, an unticked one keeping its place) and of the candidates, each with its
// current state. A choice that did not exist when the view was drawn (just created) goes by its state.
export function pinnedChoices(options, chosen, matches, memo) {
  const isChosen = (option) => chosen.some((id) => matches(option, id));
  if (!memo.pins) {
    memo.pins = new Map(options.map((option) => [option.key, isChosen(option) ? "chosen" : "other"]));
    memo.order = chosen.map((id) => options.find((option) => matches(option, id))?.key).filter((key) => key !== undefined);
  }
  const pin = (option) => memo.pins.get(option.key) ?? (isChosen(option) ? "chosen" : "other");
  const list = chosen.map((id) => options.find((option) => matches(option, id))).filter((option) => option && pin(option) === "chosen");
  for (const key of memo.order) {
    const option = options.find((o) => o.key === key);
    if (option && !isChosen(option)) list.splice(Math.min(memo.order.indexOf(key), list.length), 0, option);
  }
  return {
    chosen: list.map((option) => ({ option, checked: isChosen(option) })),
    others: options.filter((option) => pin(option) === "other").map((option) => ({ option, checked: isChosen(option) })),
  };
}
// Reorders the visible chosen ids (the order shown after a drag) inside the stored list: ids that are not
// visible (ticked among the candidates) keep their index.
export function reorderVisible(current, visible) {
  const wanted = new Set(visible);
  const slots = current.map((id, index) => (wanted.has(id) ? index : -1)).filter((index) => index >= 0);
  const next = [...current];
  slots.forEach((slot, k) => (next[slot] = visible[k]));
  return next;
}
