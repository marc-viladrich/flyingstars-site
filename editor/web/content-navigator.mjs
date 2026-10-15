// "Inhalte verwalten": every record of the site, grouped by its content type. Groups come from the
// records themselves (record.type); this table only names and orders the known types. A translation is
// no row of its own: it is reachable at its source record (record.locales).
export const navigatorTypes = {
  page: { label: "Seiten", icon: "file-text" },
  screen: { label: "Systemseiten", icon: "panel-top" },
  post: { label: "Blog", icon: "newspaper" },
  project: { label: "Projekte", icon: "folder-open" },
  package: { label: "Show-Pakete", icon: "package" },
  client: { label: "Kunden", icon: "building-2" },
  team: { label: "Team", icon: "users" },
  faq: { label: "FAQ", icon: "circle-help" },
  media: { label: "Medien", icon: "image" },
  site: { label: "Website-Daten", icon: "globe" },
};
const order = Object.keys(navigatorTypes);
const typeOf = (record) => record.type || String(record.id).split("/")[0];
const fold = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });

/**
 * records: draft records ({ id, type, title, route, data }); name(record) → display name;
 * canCreate(type) → whether new records of this type may be created; query → search text.
 * Returns [{ type, label, icon, total, create, items: [{ id, title, route, locales: [code] }] }].
 */
export function navigatorGroups(records, { name = (r) => r.title || r.id, canCreate = () => false, query = "" } = {}) {
  const locales = new Map();
  const orphans = [];
  const ids = new Set(records.map((r) => r.id));
  for (const record of records) {
    if (typeOf(record) !== "translation") continue;
    const source = record.data?.sourceId;
    if (source && ids.has(source)) locales.set(source, [...(locales.get(source) || []), record.data.locale].sort());
    else orphans.push(record);
  }
  const groups = new Map();
  for (const record of records) {
    const type = typeOf(record);
    if (type === "translation") continue;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push({ id: record.id, title: String(name(record)), route: record.route || null, locales: locales.get(record.id) || [] });
  }
  if (orphans.length)
    groups.set(
      "translation",
      orphans.map((record) => ({ id: record.id, title: String(name(record)), route: null, locales: [record.data?.locale].filter(Boolean) })),
    );
  for (const type of order) if (!groups.has(type) && canCreate(type)) groups.set(type, []);
  const words = fold(query).split(/\s+/).filter(Boolean);
  const rank = (type) => (order.includes(type) ? order.indexOf(type) : type === "translation" ? order.length + 1 : order.length);
  return [...groups]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([type, items]) => {
      const meta = navigatorTypes[type] || (type === "translation" ? { label: "Sprachfassungen ohne Ursprung", icon: "languages" } : { label: type, icon: "file-text" });
      // Pages in the order of their address (homepage first), everything else by name.
      const sorted = [...items].sort((a, b) => (type === "page" && a.route && b.route ? collator.compare(a.route, b.route) : 0) || collator.compare(a.title, b.title));
      const shown = words.length ? sorted.filter((item) => words.every((word) => fold([item.title, item.route, item.id.split("/").slice(1).join("/"), meta.label].join(" ")).includes(word))) : sorted;
      return { type, label: meta.label, icon: meta.icon, total: items.length, create: canCreate(type), items: shown };
    })
    .filter((group) => (words.length ? group.items.length > 0 : true));
}
