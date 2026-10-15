// Where is each image used? One pure resolver for the server (/editor/api/media, delete guard) and the
// browser (the media library recomputes it from the unsaved draft, so a just-replaced image moves at once).
//
// A usage is an image object ({src, assetId, …}) or a Markdown image token inside a text field of a
// content record. `assetId` (full "media/x" or short "x") wins; `src` is the fallback for older content.
// One image object is one usage, however many of its keys match. Media records themselves never count
// as users. A `.src` that matches no media record (formation JSON, videos) is simply not media.
//
// Collections follow the record type that uses the image directly: a client logo stays in "Kunden"
// even when a page renders that client. Several direct types give several equal collections.
import { recordKinds, kindPlural } from "./record-kinds.mjs";

const MEDIA = "media/";
export const ALL = "all";
export const UNUSED = "unused";
const prefixOf = (id) => String(id).split("/")[0] + "/";
const isMedia = (record) => String(record?.id).startsWith(MEDIA);
// Inline Markdown images: ![alt](url) or ![alt](<url> "title").
const markdownImage = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

/** @returns {Map<string, {recordId:string, path:(string|number)[], matchedBy:'assetId'|'src', markdown?:true}[]>} */
export function mediaUsage(records) {
  const usage = new Map(),
    bySrc = new Map();
  for (const asset of records.filter(isMedia)) {
    usage.set(asset.id, []);
    const src = asset.data?.src;
    if (typeof src === "string" && src) bySrc.set(src, [...(bySrc.get(src) || []), asset.id]);
  }
  const add = (assetId, entry) => {
    const list = usage.get(assetId);
    if (!list.some((u) => u.recordId === entry.recordId && JSON.stringify(u.path) === JSON.stringify(entry.path))) list.push(entry);
  };
  for (const record of records) {
    if (isMedia(record)) continue;
    const walk = (node, path) => {
      if (typeof node === "string") {
        if (!node.includes("![")) return;
        for (const [, url] of node.matchAll(markdownImage))
          for (const assetId of bySrc.get(url) || []) add(assetId, { recordId: record.id, path, matchedBy: "src", markdown: true });
        return;
      }
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach((child, i) => walk(child, [...path, i]));
      const byId = typeof node.assetId === "string" && node.assetId ? (node.assetId.startsWith(MEDIA) ? node.assetId : MEDIA + node.assetId) : null;
      if (byId && usage.has(byId)) add(byId, { recordId: record.id, path, matchedBy: "assetId" });
      else if (typeof node.src === "string") for (const assetId of bySrc.get(node.src) || []) add(assetId, { recordId: record.id, path, matchedBy: "src" });
      for (const [key, child] of Object.entries(node)) if (key !== "src" && key !== "assetId") walk(child, [...path, key]);
    };
    walk(record.data, []);
  }
  return usage;
}

// The collection a using record files an image under: its own type; a translation counts as its source's
// type. A kind may name another kind's collection explicitly (system pages file under "Seiten").
export function collectionOf(recordId, records) {
  let prefix = prefixOf(recordId);
  if (prefix === "translation/") {
    const sourceId = records.find((r) => r.id === recordId)?.data?.sourceId;
    if (sourceId) prefix = prefixOf(sourceId);
  }
  return (recordKinds[prefix]?.[3] || prefix).slice(0, -1);
}

/** Library view of all media records: collections with counts (only non-empty ones, flat) and assets. */
export function mediaLibrary(records) {
  const usage = mediaUsage(records);
  const assets = records.filter(isMedia).map((asset) => {
    const used = usage.get(asset.id);
    const collections = [...new Set(used.map((u) => collectionOf(u.recordId, records)))];
    return { id: asset.id, data: asset.data, collections: collections.length ? collections : [UNUSED], usage: used };
  });
  const count = (id) => assets.filter((a) => a.collections.includes(id)).length;
  const typed = [...new Set(Object.keys(recordKinds).map((key) => collectionOf(key + "x", records)))]
    .map((id) => ({ id, label: kindPlural(id + "/"), count: count(id) }))
    .filter((c) => c.count);
  const collections = [{ id: ALL, label: "Alle", count: assets.length }, ...typed, { id: UNUSED, label: "Nicht verwendet", count: count(UNUSED) }].filter(
    (c) => c.id === ALL || c.count,
  );
  return { collections, assets };
}

// Ids of the records that use one media record (delete guard). The asset itself may already be gone
// from `records` (it is the one being deleted); its usages are still found.
export function mediaUsers(records, asset) {
  const all = records.some((r) => r.id === asset.id) ? records : [...records, asset];
  return [...new Set((mediaUsage(all).get(asset.id) || []).map((u) => u.recordId))];
}
