import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { DraftWorkspace } from "./workspace.mjs";
import { awaitLoaded, provenanceDir } from "./proof.mjs";

// Live preview driver: a warm `astro dev` on a private workspace renders the draft with the real components.
// A render returns only once the provenance proof shows Astro loaded exactly the requested files.

const devAttributes = / data-astro-source-(?:file|loc)="[^"]*"/g;
const complete = (html) => /<\/html>\s*$/i.test(html);

export class LiveDriver {
  kind = "live";
  constructor(store, stateDir, { port = 4544, origin = "http://127.0.0.1:4542", node = process.execPath, site = store.site, env = {}, proofTimeout = 8000 } = {}) {
    this.site = site;
    this.env = env;
    this.workspace = new DraftWorkspace(store, path.join(path.resolve(stateDir), "preview", "worktree"), { site });
    this.dir = this.workspace.dir;
    this.port = port;
    this.origin = origin;
    this.node = node;
    this.proofTimeout = proofTimeout;
    this.base = `http://127.0.0.1:${port}`;
    this.starting = null;
    this.store = store;
    // Every file a loader has read in this workspace (see proof.mjs).
    this.known = new Set();
  }
  async init() {
    await this.workspace.ensure();
    await this.workspace.checkout(this.workspace.head || (await this.store.head()), { force: true });
    // The dev server is detached and outlives the editor process. One left over from an earlier editor
    // run holds that run's modules (schemas, collections, components), so it starts fresh here.
    if ((await this.probe()) !== "absent") await this.restart();
    else await this.start();
    return this;
  }
  async alive() {
    return (await this.probe()) === "ok";
  }
  // "ok", "failing" (a server answers, but with an error) or "absent" (nothing listens).
  async probe() {
    try {
      return (await fetch(this.base + "/", { signal: AbortSignal.timeout(1500) })).ok ? "ok" : "failing";
    } catch {
      return "absent";
    }
  }
  start() {
    if (this.starting) return this.starting;
    this.starting = (async () => {
      const state = await this.probe();
      if (state === "ok") return;
      // A failing server still holds the port and Astro's lock; a second one would never come up.
      if (state === "failing") await this.stop();
      const cli = path.join(this.dir, "node_modules/astro/bin/astro.mjs");
      const log = await fs.open(path.join(path.dirname(this.dir), "dev.log"), "a");
      const child = spawn(this.node, [cli, "dev", "--port", String(this.port), "--host", "127.0.0.1"], {
        cwd: this.dir,
        env: { ...this.env, ASTRO_TELEMETRY_DISABLED: "1", ...this.site?.extensions?.first("buildEnvironment", { editor: true, origin: this.origin }), AFE_PROVENANCE_DIR: provenanceDir(this.dir) },
        stdio: ["ignore", log.fd, log.fd],
        detached: true,
      });
      child.unref();
      await log.close(); // the child holds its own descriptor
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
    for (let i = 0; i < 40 && (await this.probe()) !== "absent"; i++) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  async restart() {
    await this.stop();
    await this.start();
  }
  // Renders `route` for the snapshot `files` (the complete draft against `head`).
  async render({ head, files, route = "/" }) {
    await this.start();
    // Moving to another saved head discards every draft file of the previous one. When the new head changes
    // code (components, schemas, config) and not only content, the dev server starts fresh: a warm server kept
    // stale modules and rendered pages only up to the first broken section.
    const moved = await this.workspace.checkout(head);
    if (moved.codeChanged) await this.restart();
    const touched = await this.workspace.materialize(head, files);
    // Every file that differs from what Astro had: changed by this draft or by the head change.
    const expected = new Map(files);
    for (const [file, content] of touched) expected.set(file, content);
    for (const file of moved.changed) if (!expected.has(file)) expected.set(file, await this.workspace.read(file));
    const existing = new Set();
    for (const file of expected.keys()) if ((await this.workspace.saved(head, file)) !== null) existing.add(file);
    const proof = await awaitLoaded(this.dir, expected, { existing, known: this.known, timeout: this.proofTimeout });
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
      await awaitLoaded(this.dir, expected, { existing, known: this.known, timeout: this.proofTimeout });
      html = await fetchHtml();
      if (!complete(html)) throw Object.assign(Error("Die Vorschau dieser Seite ist unvollständig (Renderfehler)."), { status: 502 });
    }
    return { html, proof: { kind: "provenance", ...proof } };
  }
  // Images in a freshly rendered section use Astro's dev image endpoint; the editor origin forwards them.
  handles(pathname) {
    return pathname.startsWith("/_image") || pathname.startsWith("/@fs/");
  }
  async proxy(req, res) {
    const response = await fetch(new URL(req.url, this.base), { signal: AbortSignal.timeout(20000) });
    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  }
}
