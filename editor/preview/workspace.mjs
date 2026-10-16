import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { git } from "../native-store.mjs";

// A private checkout of the saved draft into which an unsaved draft is written (never committed).
// Both preview drivers render from one: the live driver with `astro dev`, the static driver with `astro build`.

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** Identity of what a preview shows: the saved head plus every file the draft changes (order-independent). */
export function snapshotId(head, files) {
  return sha256(JSON.stringify([head, [...files].sort(([a], [b]) => a.localeCompare(b))]));
}

const saved = (store, head, file) => store.readFile(head, file).catch(() => null);

// The files a draft changes against `head`, encoded by the store exactly as a save would write them.
export async function draftFiles(store, { head, changes = [], creates = [], deletes = [] }) {
  // Several records may share one file (a map of categories): each change starts from the file as the
  // previous changes left it.
  const files = new Map();
  const current = async (file) => (files.has(file) ? files.get(file) : await saved(store, head, file));
  for (const change of changes) {
    const source = store.sourceFor(change?.id);
    if (!source || !Array.isArray(change.patches)) continue;
    const decoded = store.decode(source, await current(source.file));
    let raw = decoded.raw;
    for (const patch of change.patches) if (Array.isArray(patch.path) && !patch.path.length) raw = patch.value;
    files.set(source.file, store.encode(source, raw, decoded.doc, change.patches));
  }
  for (const creation of creates) {
    const source = store.sourceFor(creation?.id);
    if (source) files.set(source.file, store.encodeCreate ? store.encodeCreate(source, creation.data, await current(source.file)) : store.encode(source, creation.data));
  }
  for (const deletion of deletes) {
    const source = store.sourceFor(deletion?.id);
    if (source) {
      const existing = await current(source.file);
      files.set(source.file, existing === null ? null : store.encodeDelete?.(source, existing) ?? null);
    }
  }
  // A change that ends where the saved file is (typed and typed back) is no change.
  for (const [file, content] of files) if (content === (await saved(store, head, file))) files.delete(file);
  return files;
}

export class DraftWorkspace {
  constructor(store, dir, { site = store.site } = {}) {
    this.store = store;
    this.site = site || { contentRoot: "src/content", assetRoot: "public/assets" };
    this.dir = path.resolve(dir);
    this.git = store.git || git;
    this.head = null;
    // Files that differ from the saved head because of the draft last written: file → content (null = absent).
    this.written = new Map();
  }
  async exists(file) {
    return fs.access(file).then(() => true, () => false);
  }
  async ensure() {
    if (!(await this.exists(path.join(this.dir, ".git")))) {
      await fs.mkdir(path.dirname(this.dir), { recursive: true });
      await this.git(this.store.root, ["worktree", "add", "--detach", "-f", this.dir, await this.store.head()]);
    }
    const modules = path.join(this.dir, "node_modules");
    if (!(await this.exists(modules))) await fs.symlink(await fs.realpath(path.join(this.store.root, "node_modules")), modules);
    return this;
  }
  // Moving to another saved head discards every draft file written for the previous one. Reports which files
  // changed and whether any of them is code (components, schemas, config) rather than content.
  async checkout(head, { force = false } = {}) {
    if (!/^[a-f0-9]{40}$/.test(head)) throw Error("Ungültiger Vorschau-Stand.");
    if (head === this.head && !force) return { changed: [], codeChanged: false };
    const previous = this.head;
    await this.git(this.dir, ["checkout", "--detach", "-f", head]);
    await this.git(this.dir, ["clean", "-fdq", "--", this.site.contentRoot, this.site.assetRoot]);
    const reverted = [...this.written.keys()];
    this.written.clear();
    this.head = head;
    const changed = previous && previous !== head ? (await this.git(this.dir, ["diff", "--name-only", previous, head])).split("\n").filter(Boolean) : [];
    return { changed: [...new Set([...changed, ...reverted])], codeChanged: changed.some((file) => !file.startsWith(this.site.contentRoot + "/")) };
  }
  saved(head, file) {
    return saved(this.store, head, file);
  }
  // Writes `files` (the complete draft against the checked-out head) and returns every file whose bytes on
  // disk changed now, with the bytes they have now: draft files, and earlier draft files going back to saved.
  async materialize(head, files) {
    const desired = new Map(files);
    for (const file of this.written.keys()) if (!desired.has(file)) desired.set(file, await this.saved(head, file));
    const touched = new Map();
    for (const [file, content] of desired) {
      const target = path.join(this.dir, file);
      const current = await fs.readFile(target, "utf8").catch(() => null);
      if (current !== content) {
        if (content === null) await fs.rm(target, { force: true });
        else {
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, content);
        }
        touched.set(file, content);
      }
      if (files.has(file)) this.written.set(file, content);
      else this.written.delete(file);
    }
    return touched;
  }
  read(file) {
    return fs.readFile(path.join(this.dir, file), "utf8").catch(() => null);
  }
}
