// Record overview ("Inhalte verwalten" → one record): which blocks its sheet shows and what each holds.
// Derived from the schema description alone: the order of fields and containers and their x-afe `group`.
// A field, image, list or object that names a group joins that block; ungrouped fields and images form
// "Allgemein"; an ungrouped list or object is a block of its own. A page's block list (x-afe array role
// "blocks": its sections) is one member that lists the blocks; their fields are edited in the block's own
// view, never spilled into the record sheet. Blocks appear in the order of their first member in the schema.
// The editor turns members into controls; it never decides grouping per record type.
import { fieldLabel } from "./field-labels.mjs";

const under = (path, prefix) => prefix.every((part, index) => path[index] === part);
const same = (a, b) => a.length === b.length && under(a, b);
const GENERAL = "Allgemein";

/**
 * fields/containers: describe() output of one record. isMedia(container) marks image containers,
 * isTechnical(node) the advanced/hidden ones, present(path) whether the record holds a value there.
 * Returns { base, blocks: [{ title, general, members: [{ kind: "field" | "media" | "list" | "object" | "blocks", path, node }] }] }.
 */
export function overviewPlan({ fields = [], containers = [], isMedia = (c) => c.format === "image", isTechnical = () => false, present = () => true }) {
  const blockLists = containers.filter((c) => c.path.length === 1 && c.kind === "array" && (c["x-afe"]?.array?.role === "blocks" || c.path[0] === "sections"));
  const outside = (node) => !blockLists.some((b) => under(node.path, b.path));
  const visible = fields.filter((f) => !isTechnical(f) && outside(f));
  const own = containers.filter((c) => c.path.length && outside(c));
  const editable = (c) => (c.kind === "object" || c.kind === "array") && !isMedia(c) && !isTechnical(c);
  // A record that wraps nearly everything in one object (project → showcase) is grouped one level deeper.
  let base = [];
  for (;;) {
    const inner = own.find(
      (c) =>
        c.kind === "object" &&
        !isMedia(c) &&
        c.path.length === base.length + 1 &&
        under(c.path, base) &&
        visible.filter((f) => under(f.path, c.path)).length > visible.length * 0.6,
    );
    if (!inner) break;
    base = inner.path;
  }
  const parentIs = (c, p) => c.path.length === p.length + 1 && under(c.path, p);
  const roots = own.filter((c) => editable(c) && (parentIs(c, []) || parentIs(c, base)) && !under(base, c.path));
  const inRoot = (path) => roots.some((r) => under(path, r.path));
  const inMedia = (path) => own.some((c) => c.path.length < path.length && under(path, c.path) && isMedia(c));
  // Schema order: the position of the first field below a path (containers without fields go last).
  const rank = (path) => {
    const index = fields.findIndex((f) => under(f.path, path));
    return index >= 0 ? index : fields.length + containers.findIndex((c) => same(c.path, path));
  };
  const members = [
    ...visible.filter((f) => !inRoot(f.path) && !inMedia(f.path)).map((node) => ({ kind: "field", path: node.path, node })),
    ...own.filter((c) => isMedia(c) && !inRoot(c.path) && !inMedia(c.path) && present(c.path)).map((node) => ({ kind: "media", path: node.path, node })),
    ...roots.map((node) => ({ kind: node.kind === "array" ? "list" : "object", path: node.path, node })),
    ...blockLists.filter((node) => !isTechnical(node) && present(node.path)).map((node) => ({ kind: "blocks", path: node.path, node })),
  ].sort((a, b) => rank(a.path) - rank(b.path));
  const blocks = new Map();
  for (const member of members) {
    const group = typeof member.node.group === "string" && member.node.group.trim() ? member.node.group.trim() : null;
    const key = group ? "group:" + group : member.kind === "field" || member.kind === "media" ? "general" : "own:" + JSON.stringify(member.path);
    if (!blocks.has(key)) blocks.set(key, { title: group || (key === "general" ? GENERAL : fieldLabel(member.node)), general: key === "general", members: [] });
    blocks.get(key).members.push(member);
  }
  return { base, blocks: [...blocks.values()] };
}

// One-line summary of a collapsed list entry: its own nested lists with their size ("Leistungen: 5").
export function entryCounts(containers, data, path) {
  const value = (p) => p.reduce((v, k) => v?.[k], data);
  return containers
    .filter((c) => c.kind === "array" && c.path.length === path.length + 1 && under(c.path, path) && Array.isArray(value(c.path)))
    .map((c) => `${fieldLabel(c)}: ${value(c.path).length}`)
    .join(" · ");
}

// The direct children of one object in schema order: a field, or the container (image, list, object) that
// holds deeper fields. Shared by the record sheet (subtreeControls) and the guards over real records.
export function directChildren({ fields = [], containers = [], prefix = [] }) {
  const children = [];
  const seen = new Set();
  const consider = (path, child) => {
    const key = JSON.stringify(path.slice(0, prefix.length + 1));
    if (seen.has(key)) return;
    seen.add(key);
    children.push(child);
  };
  for (const f of fields) {
    if (!under(f.path, prefix) || f.path.length <= prefix.length) continue;
    const childPath = f.path.slice(0, prefix.length + 1);
    const container = f.path.length > prefix.length + 1 ? containers.find((c) => same(c.path, childPath)) : null;
    consider(childPath, container ? { container } : { field: f });
  }
  for (const c of containers) if (c.path.length === prefix.length + 1 && under(c.path, prefix)) consider(c.path, { container: c });
  return children;
}
// Inside an object, children that name an x-afe `group` gather under that subheading (in the order of the
// group's first member); ungrouped children keep their place. A group equal to the object's own block
// title adds nothing and is ignored. Returns [{ title: string | null, items }].
export function chunkByGroup(items, groupOf, { ignore = null } = {}) {
  const chunks = [];
  const named = new Map();
  for (const item of items) {
    const raw = groupOf(item);
    const title = typeof raw === "string" && raw.trim() && raw.trim() !== ignore ? raw.trim() : null;
    if (!title) {
      const last = chunks.at(-1);
      if (last && last.title === null) last.items.push(item);
      else chunks.push({ title: null, items: [item] });
      continue;
    }
    if (!named.has(title)) {
      const chunk = { title, items: [] };
      named.set(title, chunk);
      chunks.push(chunk);
    }
    named.get(title).items.push(item);
  }
  return chunks;
}
