import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NativePreview } from "./native-preview.mjs";

// Materialisation only: no git, no Astro. The store is a stub with two saved files.
async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fs-preview-"));
  const saved = { "src/content/faq/a.md": "A-saved", "src/content/packages/p.json": "P-saved" };
  const store = {
    sourceFor: (id) => ({ "faq/a": { file: "src/content/faq/a.md" }, "package/p": { file: "src/content/packages/p.json" }, "faq/new": { file: "src/content/faq/new.md" } })[id] || null,
    readFile: async (head, file) => {
      if (!(file in saved)) throw Error("missing");
      return saved[file];
    },
    decode: (source, text) => ({ raw: text, doc: null }),
    encode: (source, raw) => String(raw),
  };
  const preview = new NativePreview(store, root);
  for (const [file, content] of Object.entries(saved)) {
    await fs.mkdir(path.dirname(path.join(preview.dir, file)), { recursive: true });
    await fs.writeFile(path.join(preview.dir, file), content);
  }
  preview.start = async () => {};
  preview.checkout = async (head) => (preview.head = head);
  preview.head = "a".repeat(40);
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => "<html></html>" });
  const read = (file) => fs.readFile(path.join(preview.dir, file), "utf8").catch(() => null);
  return { preview, read, done: () => ((globalThis.fetch = original), fs.rm(root, { recursive: true, force: true })) };
}
const head = "a".repeat(40);

test("a repeated deletion stays tracked and Undo brings the saved file back", async () => {
  const { preview, read, done } = await setup();
  try {
    await preview.renderNow({ head, deletes: [{ id: "faq/a" }] });
    assert.equal(await read("src/content/faq/a.md"), null);
    await preview.renderNow({ head, deletes: [{ id: "faq/a" }] });
    assert.equal(preview.written.has("src/content/faq/a.md"), true);
    await preview.renderNow({ head });
    assert.equal(await read("src/content/faq/a.md"), "A-saved");
  } finally {
    await done();
  }
});

test("draft files that are no longer changed go back to the saved version; created files disappear", async () => {
  const { preview, read, done } = await setup();
  try {
    await preview.renderNow({ head, changes: [{ id: "package/p", patches: [{ path: [], value: "P-draft" }] }], creates: [{ id: "faq/new", data: "N" }] });
    assert.equal(await read("src/content/packages/p.json"), "P-draft");
    assert.equal(await read("src/content/faq/new.md"), "N");
    await preview.renderNow({ head });
    assert.equal(await read("src/content/packages/p.json"), "P-saved");
    assert.equal(await read("src/content/faq/new.md"), null);
    assert.equal(preview.written.size, 0);
  } finally {
    await done();
  }
});

test("a page cut off by a render error restarts the dev server once and then reports the error", async () => {
  const { preview, done } = await setup();
  try {
    let restarts = 0,
      calls = 0;
    preview.restart = async () => restarts++;
    globalThis.fetch = async () => ({ ok: true, text: async () => (++calls === 1 ? "<html><body><section>" : "<html><body></body></html>") });
    const result = await preview.renderNow({ head });
    assert.equal(restarts, 1);
    assert.match(result.html, /<\/html>$/);
    globalThis.fetch = async () => ({ ok: true, text: async () => "<html><body><section>" });
    await assert.rejects(preview.renderNow({ head }), /unvollständig/);
  } finally {
    await done();
  }
});

test("only a head that changes code (not just content) restarts the dev server", async () => {
  const { preview, done } = await setup();
  try {
    let restarts = 0;
    preview.restart = async () => restarts++;
    const diffs = { b: "src/content/faq/a.md", c: "src/content/faq/a.md\nsrc/components/sections/Pricing.astro" };
    delete preview.checkout; // the real checkout, with git answered by the stub below
    preview.git = async (dir, args) => (args[0] === "diff" ? diffs[args[3][0]] : "");
    await preview.renderNow({ head: "b".repeat(40) });
    assert.equal(restarts, 0);
    await preview.renderNow({ head: "c".repeat(40) });
    assert.equal(restarts, 1);
  } finally {
    await done();
  }
});
