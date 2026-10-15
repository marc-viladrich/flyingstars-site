import {extensions} from './site-adapter.mjs';
// "Inhalte verwalten": every record of the site, grouped by its content type. Groups come from the
// records themselves (record.type); this table only names and orders the known types. A translation is
// no row of its own: it is reachable at its source record (record.locales).
import { recordKinds } from "./record-kinds.mjs";

// Names and icons come from the one record-kind table; only the order of the groups is the navigator's.
const order = extensions.first('navigatorOrder')??[];
export const navigatorTypes = Object.fromEntries(
  order.filter((type) => recordKinds[type + "/"]).map((type) => [type, { label: recordKinds[type + "/"][2], icon: recordKinds[type + "/"][1] }]),
);
const typeOf = (record) => record.type || String(record.id).split("/")[0];
const fold = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });
// One search rule for the navigator and the media library: every word of the query occurs somewhere in the
// given texts (case, accents and order ignored). A search carried from one to the other finds the same items.
export function matchesQuery(texts, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold([texts].flat().filter((t) => t != null).join(" "));
  return words.every((word) => haystack.includes(word));
}
// The language chips beside a record: what each one opens, in words ("Englische Fassung").
const versionNames = { en: "Englische Fassung", nl: "Niederländische Fassung", de: "Deutsche Fassung" };
export const localeVersion = (code) => versionNames[code] || `Fassung ${String(code).toUpperCase()}`;

/**
 * records: draft records ({ id, type, title, route, data }); name(record) → display name;
 * canCreate(type) → whether new records of this type may be created; query → search text;
 * searchText(record) → further text a record is found by (an image's alternative text).
 * Returns [{ type, label, icon, total, create, items: [{ id, title, route, locales: [code] }] }].
 */
export function navigatorGroups(records, { name = (r) => r.title || r.id, canCreate = () => false, query = "", searchText = () => "" } = {}) {
  const translations=extensions.require('translationStorage');
  const locales = new Map();
  const orphans = [];
  const ids = new Set(records.map((r) => r.id));
  for (const record of records) {
    if (!translations.isRecord(record)) continue;
    const {ownerId:source,locale}=translations.metadata(record);
    if (source && ids.has(source)) locales.set(source, [...(locales.get(source) || []), locale].sort());
    else orphans.push(record);
  }
  const groups = new Map();
  for (const record of records) {
    const type = typeOf(record);
    if (type === translations.type) continue;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push({ id: record.id, title: String(name(record)), route: record.route || null, locales: locales.get(record.id) || [], text: searchText(record) });
  }
  if (orphans.length)
    groups.set(
      translations.type,
      orphans.map((record) => ({ id: record.id, title: String(name(record)), route: null, locales: [translations.metadata(record)?.locale].filter(Boolean) })),
    );
  for (const type of order) if (!groups.has(type) && canCreate(type)) groups.set(type, []);
  const searching = fold(query).trim() !== "";
  const rank = (type) => (order.includes(type) ? order.indexOf(type) : type === translations.type ? order.length + 1 : order.length);
  return [...groups]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([type, items]) => {
      const meta = navigatorTypes[type] || (type === translations.type ? { label: translations.orphanLabel, icon: "languages" } : { label: type, icon: "file-text" });
      // Pages in the order of their address (homepage first), everything else by name.
      const sorted = [...items].sort((a, b) => (extensions.some('sortNavigatorByRoute',type) && a.route && b.route ? collator.compare(a.route, b.route) : 0) || collator.compare(a.title, b.title));
      const shown = searching ? sorted.filter((item) => matchesQuery([item.title, item.route, item.id.split("/").slice(1).join("/"), meta.label, item.text], query)) : sorted;
      return { type, label: meta.label, icon: meta.icon, total: items.length, create: canCreate(type), items: shown.map(({ text, ...row }) => row) };
    })
    .filter((group) => (searching ? group.items.length > 0 : true));
}
