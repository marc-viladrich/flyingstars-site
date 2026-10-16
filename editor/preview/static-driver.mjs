import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DraftWorkspace, snapshotId } from "./workspace.mjs";
const run = promisify(execFile);

// Static preview driver for hosts without room for a permanent dev server: each draft snapshot is built with
// `astro build` from a private workspace. Slower than the live driver (a full build per change, coalesced),
// but no process runs between edits. The artifact is the snapshot: it is built from exactly the written files
// and carries their snapshot ID, so what it shows is proven by construction.

export class StaticDriver {
  kind = "static";
  constructor(store, stateDir, { origin = "http://127.0.0.1:4542", node = process.execPath, site = store.site, env = {}, keep = 4, timeout = 180000 } = {}) {
    const root = path.join(path.resolve(stateDir), "preview");
    this.store = store;
    this.site = site;
    this.env = env;
    this.origin = origin;
    this.node = node;
    this.keep = keep;
    this.timeout = timeout;
    this.workspace = new DraftWorkspace(store, path.join(root, "static-worktree"), { site });
    this.artifacts = path.join(root, "static");
    this.imageCache = path.join(path.resolve(stateDir), "cache", "astro-images", "preview");
    this.recent = [];
  }
  async init() {
    await this.workspace.ensure();
    await this.workspace.checkout(await this.store.head(), { force: true });
    await fs.mkdir(this.artifacts, { recursive: true });
    return this;
  }
  async render({ head, files, route = "/" }) {
    const id = snapshotId(head, files);
    const output = path.join(this.artifacts, id);
    let built = false;
    if (!(await this.ready(output, id))) {
      await this.workspace.checkout(head);
      await this.workspace.materialize(head, files);
      await this.build(output, id);
      built = true;
    }
    this.recent = [id, ...this.recent.filter((other) => other !== id)];
    await this.prune();
    const page = path.join(output, "site", ...decodeURIComponent(route).split("/").filter(Boolean), "index.html");
    const html = await fs.readFile(page, "utf8").catch(() => {
      throw Object.assign(Error("Diese Seite gibt es im Entwurf nicht."), { status: 404 });
    });
    return { html, proof: { kind: "artifact", snapshotId: id, built } };
  }
  async ready(output, id) {
    try {
      return JSON.parse(await fs.readFile(path.join(output, "ready.json"), "utf8")).snapshotId === id;
    } catch {
      return false;
    }
  }
  async build(output, id) {
    await fs.rm(output, { recursive: true, force: true });
    await fs.mkdir(output, { recursive: true });
    const cli = path.join(this.workspace.dir, "node_modules/astro/bin/astro.mjs");
    const env = { ...this.env, ASTRO_TELEMETRY_DISABLED: "1", ...this.site?.extensions?.first("buildEnvironment", { editor: true, origin: this.origin, imageCache: this.imageCache }) };
    try {
      const result = await run(this.node, [cli, "build", "--outDir", path.join(output, "site")], { cwd: this.workspace.dir, env, timeout: this.timeout, maxBuffer: 5_000_000 });
      await fs.writeFile(path.join(output, "build.log"), result.stdout + result.stderr);
    } catch (error) {
      await fs.writeFile(path.join(output, "build.log"), (error.stdout || "") + (error.stderr || ""));
      throw Object.assign(Error("Dieser Entwurf lässt sich nicht aufbauen: " + String(error.stderr || error.message).split("\n").find((line) => /error/i.test(line))?.trim().slice(0, 300)), { status: 422 });
    }
    await fs.writeFile(path.join(output, "ready.json"), JSON.stringify({ snapshotId: id }));
  }
  async prune() {
    for (const name of await fs.readdir(this.artifacts).catch(() => []))
      if (!this.recent.slice(0, this.keep).includes(name)) await fs.rm(path.join(this.artifacts, name), { recursive: true, force: true });
    this.recent = this.recent.slice(0, this.keep);
  }
  // Assets a draft render references (optimised images, bundles) exist only in its artifact.
  handles(pathname) {
    return pathname.startsWith("/_astro/");
  }
  assetRoots() {
    return this.recent.map((id) => path.join(this.artifacts, id, "site"));
  }
}
