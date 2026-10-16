import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { sharedSlices } from "../vendor/astro-frontend-editor/src/astro/source-spans.mjs";

// Proof that Astro's content layer loaded exactly the bytes a preview wrote, from the editor's own loader
// wrappers (astro-frontend-editor/astro/loaders): each collection's provenance manifest lists every entry's
// source file and a hash of its source bytes. Astro's internal data store is never parsed; only its file time
// is read, because a store written after the manifest contains the entries the manifest describes.

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const codecOf = (file) => ({ ".json": "json", ".yaml": "yaml", ".yml": "yaml" })[path.extname(file)] ?? null;

export async function readProvenance(dir) {
  const folder = path.join(dir, process.env.AFE_PROVENANCE_DIR ?? ".astro/afe-provenance");
  const manifests = [];
  for (const name of await fs.readdir(folder).catch(() => [])) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(folder, name);
    try {
      const [text, stat] = await Promise.all([fs.readFile(file, "utf8"), fs.stat(file)]);
      manifests.push({ ...JSON.parse(text), mtimeMs: stat.mtimeMs });
    } catch {} // replaced while being read; the next poll sees it
  }
  return manifests;
}

/** Whether the manifests show `content` (null = deleted) for `file`, and the manifests that mention it. */
export function loaded(manifests, file, content) {
  const mentioning = manifests.filter((manifest) => manifest.entries.some((entry) => entry.source === file));
  if (content === null) return { ok: !mentioning.length, manifests: mentioning };
  if (!mentioning.length) return { ok: false, manifests: [] };
  const ok = mentioning.every((manifest) => {
    const entries = manifest.entries.filter((entry) => entry.source === file);
    if (manifest.loader === "glob") return entries.every((entry) => entry.hash === sha256(content));
    let slices;
    try {
      slices = new Set(sharedSlices(content, codecOf(file)).records.map((slice) => sha256(slice.raw)));
    } catch {
      return false;
    }
    return entries.length === slices.size && entries.every((entry) => slices.has(entry.hash));
  });
  return { ok, manifests: mentioning };
}

/**
 * Waits until every file in `files` (file → bytes, null = deleted) is loaded and Astro's data store was written
 * after the newest manifest involved. A file that exists in the saved state but that no loader has ever read (a
 * module imported directly) cannot be proven this way: it is reported as `unproven` after a short settling time.
 * `known` collects every source a manifest has named, across calls: a saved file a draft deleted is absent from
 * the manifests for a while, yet still belongs to its collection when it comes back.
 * Resolves with the evidence, rejects after `timeout` ms.
 */
export async function awaitLoaded(dir, files, { existing = new Set(), known = new Set(), timeout = 8000, interval = 25, settle = 150, dataStore = path.join(dir, ".astro", "data-store.json") } = {}) {
  const started = Date.now();
  const first = await readProvenance(dir);
  for (const manifest of first) for (const entry of manifest.entries) known.add(entry.source);
  const unproven = [...files.keys()].filter((file) => existing.has(file) && !known.has(file));
  const proven = new Map([...files].filter(([file]) => !unproven.includes(file)));
  // Collections that mention a file at any point: a deletion is proven by a manifest that no longer does.
  const involved = new Set();
  let pending = [];
  for (let manifests = first; ; manifests = await readProvenance(dir)) {
    pending = [];
    for (const manifest of manifests) for (const entry of manifest.entries) known.add(entry.source);
    for (const [file, content] of proven) {
      const result = loaded(manifests, file, content);
      if (!result.ok) pending.push(file);
      for (const manifest of result.manifests) involved.add(manifest.collection);
    }
    const newest = Math.max(0, ...manifests.filter((manifest) => involved.has(manifest.collection)).map((manifest) => manifest.mtimeMs));
    if (!pending.length) {
      const store = await fs.stat(dataStore).then((stat) => stat.mtimeMs, () => 0);
      if (!proven.size || store >= newest) {
        if (unproven.length) await new Promise((resolve) => setTimeout(resolve, settle));
        return { proven: proven.size, unproven, waited: Date.now() - started };
      }
    }
    if (Date.now() - started > timeout)
      throw Object.assign(Error("Die Vorschau konnte nicht bestätigen, dass sie den aktuellen Entwurf zeigt" + (pending.length ? ` (nicht geladen: ${pending.slice(0, 3).join(", ")})` : " (Datenspeicher nicht neu geschrieben)") + "."), { status: 504 });
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
