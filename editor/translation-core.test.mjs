import {createFlyingStarsAdapter as translationSite} from './flyingstars-adapter.mjs';
import {fileURLToPath as translationRoot} from 'node:url';
import test from "node:test";
import assert from "node:assert/strict";
import {execute, sha256, segmentsOf, createTranslationCore} from "./translation-core.mjs";
const {plan,mergeIntoTranslations}=createTranslationCore(await translationSite(translationRoot(new URL('../',import.meta.url))));

// A fake provider that records what it was asked to translate.
function fakeProvider() {
  const sent = [];
  return {
    id: "fake",
    maxChars: 5000,
    sent,
    async translate({ texts }) {
      sent.push(...texts);
      return { texts: texts.map((t) => "EN:" + t), billedCharacters: texts.reduce((n, t) => n + t.length, 0) };
    },
  };
}
const page = (sections) => ({
  id: "page/test",
  revision: "r1",
  data: { title: "Titel der Seite", sections },
  fields: [
    { path: ["title"], kind: "text" },
    ...sections.flatMap((s, i) => [
      { path: ["sections", i, "headline"], kind: "text" },
      { path: ["sections", i, "href"], kind: "text" },
    ]),
  ],
});

test("only new or changed fields are sent; identical text is sent once; a second run sends nothing", async () => {
  const records = [page([{ headline: "Hallo Welt", href: "/kontakt/" }, { headline: "Hallo Welt", href: "/x/" }])];
  const memory = { entries: {} };
  const provider = fakeProvider();
  const first = plan({ records, locale: "en", memory });
  assert.equal(first.jobs.length, 3); // title + two headlines, never the links
  assert.equal(first.toSend.length, 2); // "Hallo Welt" only once
  const { values } = await execute(first, provider, { memory });
  const merged = mergeIntoTranslations({ records, locale: "en", values });
  const translation = { id: merged[0].id, revision: "t1", data: merged[0].data };
  const again = plan({ records: [...records, translation], locale: "en", memory });
  assert.equal(again.jobs.length, 0);
  assert.equal(again.chars, 0);
  // change exactly one headline: exactly one field, and its text is new
  records[0].data.sections[1].headline = "Hallo Mond";
  records[0].revision = "r2";
  const changed = plan({ records: [...records, translation], locale: "en", memory });
  assert.deepEqual(changed.jobs.map((j) => j.path.join(".")), ["sections.1.headline"]);
  assert.deepEqual(changed.toSend.map((s) => s.text), ["Hallo Mond"]);
});

test("unchanged markdown paragraphs come from memory; link targets survive", async () => {
  const body = "Erster Absatz mit [Link](/kontakt/).\n\nZweiter Absatz.";
  const post = { id: "post/a", revision: "p1", data: { body }, fields: [{ path: ["body"], kind: "text", format: "markdown" }] };
  const memory = { entries: {} };
  const provider = fakeProvider();
  const first = plan({ records: [post], locale: "en", memory });
  const { values } = await execute(first, provider, { memory });
  const text = values.get("post/a").entries[0].text;
  assert.match(text, /\]\(\/kontakt\/\)/);
  assert.equal(segmentsOf({ markdown: true, text: body }).filter((p) => p.text?.trim()).length, 2);
  post.data.body = body.replace("Zweiter Absatz.", "Zweiter Absatz, geändert.");
  const second = plan({ records: [post], locale: "en", memory });
  assert.deepEqual(second.toSend.map((s) => s.text), ["Zweiter Absatz, geändert."]);
});

test("moving the record hash never revives an old value without a field hash", () => {
  const owner = { id: "page/test", revision: "r2", data: { title: "Neu" }, fields: [{ path: ["title"], kind: "text" }] };
  const old = { id: "translation/page-test-en", revision: "t1", data: { sourceId: "page/test", locale: "en", sourceHash: "r1", values: [{ path: ["title"], text: "Old", reviewed: true }] } };
  const merged = mergeIntoTranslations({ records: [owner, old], locale: "en", values: new Map([["page/test", { revision: "r2", entries: [] }]]) });
  assert.equal(merged[0].data.values[0].sourceHash, sha256(""));
  assert.notEqual(merged[0].data.values[0].sourceHash, sha256("Neu"));
});

test("pieces respect a UTF-8 byte limit, also for long sentences without full stops", async () => {
  const memory = { entries: {} };
  const seen = [];
  const provider = { id: "fake", maxChars: 100, async translate({ texts }) { seen.push(...texts); return { texts: texts.map((t) => t), billedCharacters: 0 }; } };
  const text = "ä".repeat(30) + ", " + "wort ".repeat(40);
  const record = { id: "page/t", revision: "r", data: { title: text }, fields: [{ path: ["title"], kind: "text" }] };
  await execute(plan({ records: [record], locale: "en", memory }), provider, { memory });
  assert.ok(seen.length > 1 && seen.every((t) => new TextEncoder().encode(t).length <= 100), seen.map((t) => new TextEncoder().encode(t).length).join(","));
});

test("code fences stay untouched across blank lines; titled links and placeholders are protected", () => {
  const body = "Text davor.\n\n```js\nconst a = 1;\n\nconst b = 2;\n```\n\nSiehe [Seite](/x \"Titel\") und {name}.";
  const parts = segmentsOf({ markdown: true, text: body }).filter((p) => p.text?.trim());
  assert.deepEqual(parts.map((p) => p.text), ["Text davor.", 'Siehe [Seite](/x "Titel") und {name}.']);
  const planned = plan({ records: [{ id: "post/c", revision: "r", data: { body }, fields: [{ path: ["body"], kind: "text", format: "markdown" }] }], locale: "en", memory: { entries: {} } });
  assert.ok(planned.toSend.every((s) => !s.text.includes("const ")));
  assert.ok(planned.toSend.some((s) => s.text.includes("⟦") && !s.text.includes("/x") && !s.text.includes("{name}")));
});

test("a translation that drops a protected token is rejected; successful pieces are kept on partial failure", async () => {
  const memory = { entries: {} };
  const record = { id: "page/t", revision: "r", data: { a: "Hallo {name}", b: "Guten Tag" }, fields: [{ path: ["a"], kind: "text" }, { path: ["b"], kind: "text" }] };
  const provider = { id: "fake", async translate({ texts }) { return { texts: texts.map((t) => (t.includes("⟦") ? "Hello " : "Good day")), billedCharacters: 5 }; } };
  const result = await execute(plan({ records: [record], locale: "en", memory }), provider, { memory });
  assert.equal(result.skippedFields, 1);
  assert.equal(result.values.get("page/t").entries.length, 1);
  assert.equal(result.values.get("page/t").entries[0].text, "Good day");
  const failing = { id: "fake", async translate({ texts }) { return { texts: texts.map((t, i) => (i === 0 ? "ok" : null)), billedCharacters: 2, errors: ["boom"] }; } };
  const memory2 = { entries: {} };
  const record2 = { id: "page/u", revision: "r", data: { a: "Eins", b: "Zwei" }, fields: [{ path: ["a"], kind: "text" }, { path: ["b"], kind: "text" }] };
  const partial = await execute(plan({ records: [record2], locale: "en", memory: memory2 }), failing, { memory: memory2 });
  assert.equal(Object.keys(memory2.entries).length, 1);
  assert.equal(partial.skippedFields, 1);
});

test("outline and caps marks are protected like placeholders and come back in place", async () => {
  const memory = { entries: {} };
  const record = { id: "page/t", revision: "r", data: { title: "Wir {o}gestalten{/o} dein {c}Himmel{/c}" }, fields: [{ path: ["title"], kind: "text" }] };
  const planned = plan({ records: [record], locale: "en", memory });
  assert.ok(planned.toSend.every((s) => !/\{\/?[oc]\}/.test(s.text)));
  const provider = { id: "fake", async translate({ texts }) { return { texts: texts.map((t) => t.replace("Wir", "We").replace("gestalten", "design").replace("dein", "your").replace("Himmel", "sky")), billedCharacters: 1 }; } };
  const { values } = await execute(planned, provider, { memory });
  assert.equal(values.get("page/t").entries[0].text, "We {o}design{/o} your {c}sky{/c}");
});
