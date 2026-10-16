import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { DraftWorkspace, draftFiles, snapshotId } from "./workspace.mjs";
import { awaitLoaded, loaded } from "./proof.mjs";
import { LiveDriver } from "./live-driver.mjs";
import { StaticDriver } from "./static-driver.mjs";
import { PreviewService } from "./service.mjs";

const sha = (text) => createHash("sha256").update(text).digest("hex");
const head = "a".repeat(40);

// A store stub with saved files; no git, no Astro.
function stubStore(saved = { "src/content/faq/a.md": "A-saved", "src/content/packages/p.json": "P-saved" }) {
  return {
    sourceFor: (id) => ({ "faq/a": { file: "src/content/faq/a.md" }, "package/p": { file: "src/content/packages/p.json" }, "faq/new": { file: "src/content/faq/new.md" } })[id] || null,
    readFile: async (at, file) => {
      if (!(file in saved)) throw Error("missing");
      return saved[file];
    },
    head: async () => head,
    decode: (source, text) => ({ raw: text, doc: null }),
    encode: (source, raw) => String(raw),
  };
}
async function temporary() {
  return fs.mkdtemp(path.join(os.tmpdir(), "afe-preview-"));
}
async function workspace() {
  const root = await temporary(),
    store = stubStore(),
    space = new DraftWorkspace(store, root);
  space.head = head;
  for (const file of ["src/content/faq/a.md", "src/content/packages/p.json"]) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), await store.readFile(head, file));
  }
  return { space, store, root, done: () => fs.rm(root, { recursive: true, force: true }) };
}

test("draft files are what a save would write; a value typed back to the saved one is no change", async () => {
  const store = stubStore();
  const files = await draftFiles(store, { head, changes: [{ id: "package/p", patches: [{ path: [], value: "P-draft" }] }, { id: "faq/a", patches: [{ path: [], value: "A-saved" }] }], creates: [{ id: "faq/new", data: "N" }], deletes: [] });
  assert.deepEqual([...files], [["src/content/packages/p.json", "P-draft"], ["src/content/faq/new.md", "N"]]);
});

test("a snapshot ID depends on head and files, not on their order", () => {
  const a = new Map([["x", "1"], ["y", null]]),
    b = new Map([["y", null], ["x", "1"]]);
  assert.equal(snapshotId(head, a), snapshotId(head, b));
  assert.notEqual(snapshotId(head, a), snapshotId("b".repeat(40), a));
  assert.notEqual(snapshotId(head, a), snapshotId(head, new Map([["x", "2"], ["y", null]])));
});

test("materialize: a repeated deletion stays tracked, and dropping it brings the saved file back", async () => {
  const { space, root, done } = await workspace();
  try {
    const read = (file) => fs.readFile(path.join(root, file), "utf8").catch(() => null);
    const deletion = new Map([["src/content/faq/a.md", null]]);
    assert.deepEqual([...(await space.materialize(head, deletion))], [["src/content/faq/a.md", null]]);
    assert.deepEqual([...(await space.materialize(head, deletion))], []);
    assert.equal(space.written.has("src/content/faq/a.md"), true);
    assert.deepEqual([...(await space.materialize(head, new Map()))], [["src/content/faq/a.md", "A-saved"]]);
    assert.equal(await read("src/content/faq/a.md"), "A-saved");
    assert.equal(space.written.size, 0);
  } finally {
    await done();
  }
});

test("materialize: files of an earlier draft go back to saved, created files disappear", async () => {
  const { space, root, done } = await workspace();
  try {
    const read = (file) => fs.readFile(path.join(root, file), "utf8").catch(() => null);
    await space.materialize(head, new Map([["src/content/packages/p.json", "P-draft"], ["src/content/faq/new.md", "N"]]));
    assert.equal(await read("src/content/faq/new.md"), "N");
    const touched = await space.materialize(head, new Map());
    assert.deepEqual(new Map(touched), new Map([["src/content/packages/p.json", "P-saved"], ["src/content/faq/new.md", null]]));
    assert.equal(await read("src/content/packages/p.json"), "P-saved");
    assert.equal(await read("src/content/faq/new.md"), null);
  } finally {
    await done();
  }
});

// Provenance fixtures as the loader wrappers write them.
async function provenance(dir, manifests, storeTime) {
  const folder = path.join(dir, ".astro/afe-provenance");
  await fs.mkdir(folder, { recursive: true });
  for (const name of await fs.readdir(folder)) await fs.rm(path.join(folder, name));
  for (const manifest of manifests) await fs.writeFile(path.join(folder, sha(manifest.collection) + ".json"), JSON.stringify(manifest));
  const store = path.join(dir, ".astro/data-store.json");
  await fs.writeFile(store, "{}");
  if (storeTime) await fs.utimes(store, storeTime / 1000, storeTime / 1000);
}
const glob = (collection, entries) => ({ collection, loader: "glob", entries: entries.map(([source, text]) => ({ id: source, source, hash: sha(text) })), issues: [] });

test("loaded: glob entries by file hash, shared files by slice hashes, deletions by absence", () => {
  const manifests = [glob("faq", [["src/content/faq/a.md", "A2"]]), { collection: "categories", loader: "file", entries: [{ id: "bread", source: "src/categories.yaml", hash: sha("bread:\n  name: Brot\n") }, { id: "cake", source: "src/categories.yaml", hash: sha("cake:\n  name: Kuchen\n") }], issues: [] }];
  assert.equal(loaded(manifests, "src/content/faq/a.md", "A2").ok, true);
  assert.equal(loaded(manifests, "src/content/faq/a.md", "A1").ok, false);
  assert.equal(loaded(manifests, "src/categories.yaml", "bread:\n  name: Brot\ncake:\n  name: Kuchen\n").ok, true);
  assert.equal(loaded(manifests, "src/categories.yaml", "bread:\n  name: Brote\ncake:\n  name: Kuchen\n").ok, false);
  assert.equal(loaded(manifests, "src/content/faq/gone.md", null).ok, true);
  assert.equal(loaded(manifests, "src/content/faq/a.md", null).ok, false);
});

test("awaitLoaded waits for the manifest and for a data store written after it", async () => {
  const dir = await temporary();
  try {
    const file = "src/content/faq/a.md";
    await provenance(dir, [glob("faq", [[file, "old"]])]);
    const waiting = awaitLoaded(dir, new Map([[file, "new"]]), { existing: new Set([file]), timeout: 3000, interval: 10 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    // The loader saw the new bytes, but the data store is older than the manifest: still waiting.
    const now = Date.now();
    await provenance(dir, [glob("faq", [[file, "new"]])], now - 5000);
    let settled = false;
    waiting.then(() => (settled = true));
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(settled, false);
    await fs.utimes(path.join(dir, ".astro/data-store.json"), (now + 1000) / 1000, (now + 1000) / 1000);
    const proof = await waiting;
    assert.equal(proof.proven, 1);
    assert.deepEqual(proof.unproven, []);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("awaitLoaded: a deletion needs a newer data store too; files no loader reads are reported, not waited for", async () => {
  const dir = await temporary();
  try {
    const file = "src/content/faq/a.md";
    await provenance(dir, [glob("faq", [[file, "A"]])]);
    const waiting = awaitLoaded(dir, new Map([[file, null], ["src/settings.json", "{}"]]), { existing: new Set([file, "src/settings.json"]), timeout: 3000, interval: 10, settle: 1 });
    await new Promise((resolve) => setTimeout(resolve, 40));
    await provenance(dir, [glob("faq", [])], Date.now() - 5000);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const now = Date.now() + 1000;
    await fs.utimes(path.join(dir, ".astro/data-store.json"), now / 1000, now / 1000);
    const proof = await waiting;
    assert.deepEqual(proof.unproven, ["src/settings.json"]);
    assert.equal(proof.proven, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("awaitLoaded: a saved file a draft deleted and then restored is waited for, not taken for a non-collection file", async () => {
  const dir = await temporary();
  try {
    const file = "src/content/faq/a.md",
      known = new Set();
    await provenance(dir, [glob("faq", [[file, "A"]])]);
    await awaitLoaded(dir, new Map([[file, "A"]]), { existing: new Set([file]), known, timeout: 1000, interval: 10 });
    // The draft deleted it: the manifest no longer names it. Restoring it must wait for the loader.
    await provenance(dir, [glob("faq", [])], Date.now() + 1000);
    const waiting = awaitLoaded(dir, new Map([[file, "A"]]), { existing: new Set([file]), known, timeout: 3000, interval: 10 });
    let settled = false;
    waiting.then(() => (settled = true));
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(settled, false);
    await provenance(dir, [glob("faq", [[file, "A"]])], Date.now() + 2000);
    assert.deepEqual((await waiting).unproven, []);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("awaitLoaded fails closed: a created file no loader picks up is a 504, not an unproven page", async () => {
  const dir = await temporary();
  try {
    await provenance(dir, [glob("faq", [])]);
    await assert.rejects(awaitLoaded(dir, new Map([["src/content/elsewhere/new.md", "N"]]), { timeout: 100, interval: 10 }), (error) => error.status === 504 && /nicht geladen/.test(error.message));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

// Live driver around a stubbed dev server: process handling only.
async function liveDriver() {
  const { space, store, root, done } = await workspace();
  const driver = new LiveDriver(store, root);
  driver.workspace = space;
  driver.dir = space.dir;
  driver.start = async () => {};
  space.checkout = async (at) => ((space.head = at), { changed: [], codeChanged: false });
  await provenance(space.dir, []);
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => "<html></html>" });
  return { driver, space, done: () => ((globalThis.fetch = original), done()) };
}

test("live: a page cut off by a render error restarts the dev server once and then reports the error", async () => {
  const { driver, done } = await liveDriver();
  try {
    let restarts = 0,
      calls = 0;
    driver.restart = async () => restarts++;
    globalThis.fetch = async () => ({ ok: true, text: async () => (++calls === 1 ? "<html><body><section>" : "<html><body></body></html>") });
    const result = await driver.render({ head, files: new Map() });
    assert.equal(restarts, 1);
    assert.match(result.html, /<\/html>$/);
    globalThis.fetch = async () => ({ ok: true, text: async () => "<html><body><section>" });
    await assert.rejects(driver.render({ head, files: new Map() }), /unvollständig/);
    // Astro dev appends hoisted page scripts after </html>: complete, no restart.
    globalThis.fetch = async () => ({ ok: true, text: async () => '<html><body></body></html><script type="module" src="/src/views/Catalog.astro?astro&type=script"></script>' });
    restarts = 0;
    await driver.render({ head, files: new Map() });
    assert.equal(restarts, 0);
  } finally {
    await done();
  }
});

test("live: only a head that changes code (not just content) restarts the dev server", async () => {
  const { driver, space, done } = await liveDriver();
  try {
    let restarts = 0;
    driver.restart = async () => restarts++;
    const diffs = { b: "src/content/faq/a.md", c: "src/content/faq/a.md\nsrc/components/sections/Pricing.astro" };
    delete space.checkout; // the real checkout, with git answered by the stub below
    space.git = async (dir, args) => (args[0] === "diff" ? diffs[args[3][0]] : "");
    driver.proofTimeout = 50;
    // The content file of the head change is not in any manifest of this stub: unproven, not waited for.
    await driver.render({ head: "b".repeat(40), files: new Map() }).catch(() => {});
    assert.equal(restarts, 0);
    await driver.render({ head: "c".repeat(40), files: new Map() }).catch(() => {});
    assert.equal(restarts, 1);
  } finally {
    await done();
  }
});

test("live: a dev server left over from an earlier editor run is restarted on init, a missing one just started", async () => {
  const { driver, space, done } = await liveDriver();
  try {
    const calls = [];
    space.ensure = async () => space;
    driver.restart = async () => calls.push("restart");
    driver.start = async () => calls.push("start");
    for (const state of ["ok", "failing", "absent"]) {
      driver.probe = async () => state;
      await driver.init();
    }
    // A server answering with an error (stale modules after a code change) counts as left over too.
    assert.deepEqual(calls, ["restart", "restart", "start"]);
  } finally {
    await done();
  }
});

test("static: a snapshot is built once, read per route, older artifacts are pruned", async () => {
  const { space, store, root, done } = await workspace();
  try {
    const driver = new StaticDriver(store, root, { keep: 2 });
    driver.workspace = space;
    space.checkout = async () => ({ changed: [], codeChanged: false });
    await fs.mkdir(driver.artifacts, { recursive: true });
    const builds = [];
    driver.build = async (output, id) => {
      builds.push(id);
      await fs.mkdir(path.join(output, "site", "kontakt"), { recursive: true });
      const content = await fs.readFile(path.join(space.dir, "src/content/packages/p.json"), "utf8");
      await fs.writeFile(path.join(output, "site", "index.html"), `<html>${content}</html>`);
      await fs.writeFile(path.join(output, "site", "kontakt", "index.html"), "<html>Kontakt</html>");
      await fs.writeFile(path.join(output, "ready.json"), JSON.stringify({ snapshotId: id }));
    };
    const draft = (value) => new Map([["src/content/packages/p.json", value]]);
    const first = await driver.render({ head, files: draft("P1") });
    assert.equal(first.html, "<html>P1</html>");
    assert.equal(first.proof.snapshotId, snapshotId(head, draft("P1")));
    assert.equal((await driver.render({ head, files: draft("P1"), route: "/kontakt/" })).html, "<html>Kontakt</html>");
    assert.equal(builds.length, 1);
    await driver.render({ head, files: draft("P2") });
    await driver.render({ head, files: draft("P3") });
    assert.deepEqual((await fs.readdir(driver.artifacts)).sort(), [snapshotId(head, draft("P2")), snapshotId(head, draft("P3"))].sort());
    await assert.rejects(driver.render({ head, files: draft("P3"), route: "/fehlt/" }), (error) => error.status === 404);
  } finally {
    await done();
  }
});

// Service around a driver that records what it rendered.
function service() {
  const rendered = [];
  let release;
  const driver = {
    kind: "test",
    gate: null,
    async render({ files }) {
      if (this.gate) await this.gate;
      rendered.push(Object.fromEntries(files));
      return { html: "<html>" + JSON.stringify(Object.fromEntries(files)) + "</html>", proof: { kind: "test" } };
    },
    handles: () => false,
  };
  const store = stubStore();
  return { previews: new PreviewService(driver, store), driver, rendered, hold: () => (driver.gate = new Promise((resolve) => (release = resolve))), release: () => ((driver.gate = null), release()) };
}
const change = (value) => ({ head, changes: [{ id: "package/p", patches: [{ path: [], value }] }] });

test("service: a lease belongs to its login; an old or repeated epoch is refused", async () => {
  const { previews } = service();
  const { leaseId } = previews.lease("user:marc");
  await assert.rejects(previews.render({ leaseId, epoch: 1, ...change("X") }, "user:other"), (error) => error.status === 403);
  const result = await previews.render({ leaseId, epoch: 2, ...change("X") }, "user:marc");
  assert.equal(result.snapshotId, snapshotId(head, new Map([["src/content/packages/p.json", "X"]])));
  await assert.rejects(previews.render({ leaseId, epoch: 2, ...change("Y") }, "user:marc"), (error) => error.status === 409 && error.code === "stale");
  await assert.rejects(previews.render({ leaseId: "unknown", epoch: 3, ...change("Y") }, "user:marc"), (error) => error.code === "lease-unknown");
});

test("service: a waiting request overtaken by a newer one of the same tab is dropped unrendered", async () => {
  const { previews, rendered, hold, release } = service();
  const { leaseId } = previews.lease("local");
  hold();
  const first = previews.render({ leaseId, epoch: 1, ...change("A") }, "local");
  await new Promise((resolve) => setTimeout(resolve, 10)); // the first one is rendering
  const second = previews.render({ leaseId, epoch: 2, ...change("AB") }, "local").catch((error) => error);
  const third = previews.render({ leaseId, epoch: 3, ...change("ABC") }, "local");
  release();
  await first;
  assert.equal((await second).code, "superseded");
  assert.match((await third).html, /ABC/);
  assert.deepEqual(rendered.map((files) => files["src/content/packages/p.json"]), ["A", "ABC"]);
});

test("service: two tabs alternate; each answer shows its own draft only", async () => {
  const { previews } = service();
  const a = previews.lease("user:marc").leaseId,
    b = previews.lease("user:kunde").leaseId;
  const [first, second] = await Promise.all([previews.render({ leaseId: a, epoch: 1, ...change("draft-a") }, "user:marc"), previews.render({ leaseId: b, epoch: 1, ...change("draft-b") }, "user:kunde")]);
  const third = await previews.render({ leaseId: a, epoch: 2, head, changes: [] }, "user:marc");
  assert.match(first.html, /draft-a/);
  assert.doesNotMatch(first.html, /draft-b/);
  assert.match(second.html, /draft-b/);
  assert.doesNotMatch(second.html, /draft-a/);
  assert.equal(third.html, "<html>{}</html>");
});
