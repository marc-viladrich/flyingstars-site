import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { git } from "./native-store.mjs";

// Live preview of the unsaved draft, rendered by the real Astro components.
// A warm `astro dev` runs on a detached git worktree of the content branch. Draft records are
// written there (never committed), Astro re-renders, and the editor swaps the changed sections.
// Saving, building and publishing stay with NativeStore/NativeBuilder.

const devAttributes = / data-astro-source-(?:file|loc)="[^"]*"/g;
const complete = (html) => /<\/html>\s*$/i.test(html);

export class NativePreview {
  constructor(store, root, { port = 4544, origin = "http://127.0.0.1:4542", node = process.execPath, site = store.site, env = store.runtime?.processEnv || {} } = {}) {
    this.store = store;
    this.site = site || {contentCollections:[],contentRoot:"src/content",assetRoot:"public/assets"};
    this.env = env;
    this.dir = path.join(path.resolve(root), "preview", "worktree");
    this.port = port;
    this.origin = origin;
    this.node = node;
    this.base = `http://127.0.0.1:${port}`;
    this.head = null;
    this.written = new Map();
    this.queue = Promise.resolve();
    this.starting = null;
    this.git = store.git || git;
  }
  enqueue(work) {
    const result = this.queue.then(work);
    this.queue = result.catch(() => {});
    return result;
  }
  async exists(file) {
    return fs.access(file).then(() => true, () => false);
  }
  async init() {
    if (!(await this.exists(path.join(this.dir, ".git")))) {
      await fs.mkdir(path.dirname(this.dir), { recursive: true });
      await this.git(this.store.root, ["worktree", "add", "--detach", "-f", this.dir, await this.store.head()]);
    }
    const modules = path.join(this.dir, "node_modules");
    if (!(await this.exists(modules))) await fs.symlink(await fs.realpath(path.join(this.store.root, "node_modules")), modules);
    const head = this.head || (await this.store.head());
    await this.enqueue(() => this.checkout(head, { force: true }));
    // The dev server is detached and outlives the editor process. One left over from an earlier editor
    // run holds that run's modules (schemas, collections, components), so it starts fresh here.
    if (await this.alive()) await this.restart();
    else await this.start();
    return this;
  }
  async alive() {
    try {
      return (await fetch(this.base + "/", { signal: AbortSignal.timeout(1500) })).ok;
    } catch {
      return false;
    }
  }
  start() {
    if (this.starting) return this.starting;
    this.starting = (async () => {
      if (await this.alive()) return;
      const cli = path.join(this.dir, "node_modules/astro/bin/astro.mjs");
      const log = await fs.open(path.join(path.dirname(this.dir), "dev.log"), "a");
      const child = spawn(this.node, [cli, "dev", "--port", String(this.port), "--host", "127.0.0.1"], {
        cwd: this.dir,
        env: { ...this.env, ASTRO_TELEMETRY_DISABLED: "1", FLYINGSTARS_EDITOR: "1", SITE_URL: this.origin },
        stdio: ["ignore", log.fd, log.fd],
        detached: true,
      });
      child.unref();
      for (let i = 0; i < 120; i++) {
        if (await this.alive()) return;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      throw Error("Die Live-Vorschau konnte nicht gestartet werden.");
    })().finally(() => (this.starting = null));
    return this.starting;
  }
  // Stops the dev server (Astro runs it as a background process with its own stop command).
  async stop() {
    const cli = path.join(this.dir, "node_modules/astro/bin/astro.mjs");
    await new Promise((resolve) => {
      const child = spawn(this.node, [cli, "dev", "stop"], { cwd: this.dir, stdio: "ignore" });
      child.on("exit", resolve);
      child.on("error", resolve);
    });
    for (let i = 0; i < 40 && (await this.alive()); i++) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  async restart() {
    await this.stop();
    this.lastHtml?.clear();
    await this.start();
  }
  // Moving to another saved head discards every draft file written for the previous one. When the new
  // head changes code (components, schemas, config) and not only content, the dev server starts fresh:
  // a warm server kept stale modules and rendered pages only up to the first broken section.
  async checkout(head, { force = false } = {}) {
    if (!/^[a-f0-9]{40}$/.test(head)) throw Error("Ungültiger Vorschau-Stand.");
    if (head === this.head && !force) return;
    const previous = this.head;
    await this.git(this.dir, ["checkout", "--detach", "-f", head]);
    await this.git(this.dir, ["clean", "-fdq", "--", this.site.contentRoot, this.site.assetRoot]);
    this.written.clear();
    this.head = head;
    if (previous && previous !== head) {
      const changed = (await this.git(this.dir, ["diff", "--name-only", previous, head])).split("\n").filter(Boolean);
      if (changed.some((file) => !file.startsWith(this.site.contentRoot+"/"))) this.codeChanged = true;
    }
  }
  render(request) {
    return this.enqueue(() => this.renderNow(request));
  }
  async desiredFiles({ head, changes = [], creates = [], deletes = [] }) {
    const files = new Map();
    for (const change of changes) {
      const source = this.store.sourceFor(change?.id);
      if (!source || !Array.isArray(change.patches)) continue;
      const decoded = this.store.decode(source, await this.store.readFile(head, source.file));
      let raw = decoded.raw;
      for (const patch of change.patches) if (Array.isArray(patch.path) && !patch.path.length) raw = patch.value;
      files.set(source.file, this.store.encode(source, raw, decoded.doc, change.patches));
    }
    for (const creation of creates) {
      const source = this.store.sourceFor(creation?.id);
      if (source) files.set(source.file, this.store.encode(source, creation.data));
    }
    for (const deletion of deletes) {
      const source = this.store.sourceFor(deletion?.id);
      if (source) files.set(source.file, null);
    }
    return files;
  }
  async renderNow({ head, route = "/", ...draft }) {
    await this.start();
    const dataStore = path.join(this.dir, ".astro", "data-store.json");
    const before = await fs.stat(dataStore).then((s) => s.mtimeMs, () => 0);
    // A checkout to another saved head changes content files too; wait for Astro like after a draft write.
    const headChanged = head !== this.head;
    await this.checkout(head);
    if (this.codeChanged) {
      this.codeChanged = false;
      await this.restart();
    }
    const files = await this.desiredFiles({ head, ...draft });
    // Files written for an earlier draft but no longer changed go back to the saved version.
    for (const file of this.written.keys())
      if (!files.has(file)) {
        let saved = null;
        try {
          saved = await this.store.readFile(head, file);
        } catch {}
        files.set(file, saved);
      }
    let collectionChanged = headChanged,
      anyChanged = false;
    for (const [file, content] of files) {
      const target = path.join(this.dir, file);
      const current = await fs.readFile(target, "utf8").catch(() => null);
      if (current === content) {
        // Still tracked unless it equals the saved version (a repeated deletion stays a deletion).
        if ((await this.store.readFile(head, file).catch(() => null)) === content) this.written.delete(file);
        else this.written.set(file, content);
        continue;
      }
      anyChanged = true;
      if (this.site.contentCollections.some((prefix) => file.startsWith(prefix))) collectionChanged = true;
      if (content === null) await fs.rm(target, { force: true });
      else {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content);
      }
      const saved = await this.store.readFile(head, file).catch(() => null);
      if (saved === content) this.written.delete(file);
      else this.written.set(file, content);
    }
    // Content collections are re-read asynchronously (Astro debounces ~500 ms); wait for the store write.
    if (collectionChanged) {
      for (let waited = 0; waited < 2000; waited += 40) {
        const now = await fs.stat(dataStore).then((s) => s.mtimeMs, () => 0);
        if (now > before) break;
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    } else if (anyChanged) await new Promise((resolve) => setTimeout(resolve, 60));
    const url = new URL(route, this.base);
    url.searchParams.set("editor", "1");
    const fetchHtml = async () => {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Object.assign(Error("Die Vorschau konnte diese Seite nicht rendern."), { status: 502 });
      return (await response.text()).replace(devAttributes, "");
    };
    let html = await fetchHtml();
    // A page that stops mid-stream hit a render error; a fresh dev server gets one more try.
    if (!complete(html)) {
      await this.restart();
      html = await fetchHtml();
      if (!complete(html)) throw Object.assign(Error("Die Vorschau dieser Seite ist unvollständig (Renderfehler)."), { status: 502 });
    }
    // Vite reloads changed JSON modules asynchronously; if the page did not change yet, ask again briefly.
    this.lastHtml ??= new Map();
    if (anyChanged) for (let tries = 0; tries < 8 && html === this.lastHtml.get(route); tries++) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      html = await fetchHtml();
    }
    this.lastHtml.set(route, html);
    return { head, html };
  }
  // Images in a freshly rendered section use Astro's dev image endpoint; the editor origin forwards them.
  async proxy(req, res, pathname) {
    const response = await fetch(new URL(req.url, this.base), { signal: AbortSignal.timeout(20000) });
    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  }
}
