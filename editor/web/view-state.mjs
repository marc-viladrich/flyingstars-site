export function normalizedRoute(path){const clean=String(path||'/').split(/[?#]/,1)[0];return clean==='/'?'/':'/'+clean.replace(/^\/+|\/+$/g,'')+'/';}
export function navigationChoices(records){const choices=new Map([['/','Startseite'],['/drohnenshow-preise/','Preise & Pakete'],['/show-konfigurator/','Show-Konfigurator']]);for(const item of records){const path=item.route||(item.id.startsWith('page/')?(item.id==='page/index'?'/':'/'+item.id.slice(5)+'/'):null);if(path)choices.set(normalizedRoute(path),item.title);}return [...choices].map(([value,label])=>({value,label}));}
export function savedRecordRoute(records,id){return records.find(item=>item.id===id)?.route||'/';}
export function publishNeedsActivation(review){return !!review.publishedHead&&review.activePublishedHead!==review.publishedHead;}
export function mediaSourceChanged(originalSource,currentSource){return originalSource!==currentSource;}
export function fieldsInScope(fields,path,scope){const prefix=scope==='media'?path:path[0]==='sections'?path.slice(0,2):path.slice(0,-1);return fields.filter(field=>prefix.every((part,index)=>field.path[index]===part)&&(scope!=='context'||path[0]!=='sections'||['enum','boolean'].includes(field.kind)));}
export function sourceMediaSources(records){const sources={};const walk=(id,value,path=[])=>{if(Array.isArray(value)){value.forEach((item,index)=>walk(id,item,[...path,index]));return;}if(!value||typeof value!=='object')return;if(typeof value.src==='string'&&value.width&&value.height){const asset=value.assetId&&records.find(r=>r.id===value.assetId||r.id==='media/'+value.assetId)?.data;sources[id+'/'+JSON.stringify(path)]=asset?.src||value.src;}for(const [key,child]of Object.entries(value))walk(id,child,[...path,key]);};for(const record of records)walk(record.id,record.data);return sources;}
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
const filled = (value) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
// A media usage points at its library record by full id ("media/x") or, in older content, by the bare id.
export function mediaRecordFor(records, assetId) {
  if (typeof assetId !== "string" || !assetId) return null;
  return records.find((r) => r.id === assetId) || records.find((r) => r.id === "media/" + assetId) || null;
}
// An entry standing for another record (packageId: horizon → package/horizon). A value that already is a
// full record id ("media/x") is used as it is, never prefixed a second time.
export function linkedRecordFor(records, entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  for (const [key, id] of Object.entries(entry)) {
    if (!key.endsWith("Id") || typeof id !== "string" || !id) continue;
    const found = key === "assetId" ? mediaRecordFor(records, id) : records.find((r) => r.id === (id.includes("/") ? id : key.slice(0, -2) + "/" + id));
    if (found) return found;
  }
  return null;
}
const fileName = (src) => {
  if (typeof src !== "string" || !src) return "";
  const last = src.split(/[?#]/, 1)[0].split("/").filter(Boolean).at(-1) || "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};
// Image usage: caption → effective alt (local override, own alt, library default) → library title → file name.
export function imageSummary(usage, records = []) {
  const asset = mediaRecordFor(records, usage?.assetId)?.data;
  const override = usage?.altOverride === null || usage?.altOverride === undefined ? "" : filled(usage.altOverride);
  const label = filled(usage?.caption) || override || filled(usage?.alt) || filled(asset?.defaultAlt) || filled(asset?.title) || fileName(asset?.src || usage?.src);
  return { label, thumb: asset?.src || (typeof usage?.src === "string" && usage.src) || null };
}
const ownNames = ["displayName", "title", "name", "headline", "label", "question", "value"];
// image: the entry itself is an image; imageChild: the image an entry carries (a member's portrait).
export function itemSummary(entry, index, { records = [], image = false, imageChild = null, recordName = (r) => r?.title || r?.id } = {}) {
  const fallback = `Eintrag ${Number(index) + 1 || 1}`;
  if (entry === null || entry === undefined || typeof entry !== "object") return { label: filled(entry) || fallback, thumb: null };
  if (image) {
    const summary = imageSummary(entry, records);
    return { label: summary.label || fallback, thumb: summary.thumb };
  }
  const linked = linkedRecordFor(records, entry);
  if (linked) return { label: recordName(linked) || fallback, thumb: null };
  const own = ownNames.map((key) => filled(entry[key])).find(Boolean);
  const child = imageChild ? imageSummary(imageChild, records) : null;
  return { label: own || child?.label || fallback, thumb: child?.thumb || null };
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
