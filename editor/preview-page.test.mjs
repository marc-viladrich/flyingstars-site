import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { barColors, withPreviewBar } from "./preview-page.mjs";

const head = (c) => c.repeat(40);
const page = '<!doctype html><html lang="en"><head><title>x</title></head><body class="site"><nav class="nav"></nav><main>Hi</main></body></html>';

test("the preview bar sits first in <body>, names the state honestly and links the live page", () => {
  const html = withPreviewBar(page, { live: false, draftHead: head("b"), shownHead: head("b"), liveURL: "https://www.flyingstars.de/en/" });
  assert.ok(html.indexOf("<fs-preview-bar") === html.indexOf('<body class="site">') + '<body class="site">'.length);
  assert.match(html, /<b>Vorschau<\/b> · noch nicht veröffentlicht/);
  assert.match(html, /<a href="https:\/\/www\.flyingstars\.de\/en\/">Live ansehen<\/a>/);
  assert.doesNotMatch(html, /zuletzt erfolgreich aufgebaute/);
  assert.doesNotMatch(html, /frame\.js/);
  // The script runs after the page content; the page itself is untouched.
  assert.ok(html.lastIndexOf("<script>") > html.indexOf("<main>Hi</main>"));
  assert.ok(html.includes('<nav class="nav"></nav><main>Hi</main>'));
});

test("published state, a build behind the saved draft, a page not live yet", () => {
  const same = withPreviewBar(page, { live: true, draftHead: head("a"), shownHead: head("a"), liveURL: "http://127.0.0.1:4543/" });
  assert.match(same, /<b>Vorschau<\/b> · entspricht der Live-Version/);
  const behind = withPreviewBar(page, { live: false, draftHead: head("b"), shownHead: head("a"), liveURL: null });
  assert.match(behind, /Gezeigt wird der zuletzt erfolgreich aufgebaute Stand\./);
  assert.match(behind, /Diese Seite ist noch nicht live\./);
  assert.doesNotMatch(behind, /Live ansehen/);
  assert.match(withPreviewBar(page, { live: false, draftHead: '"><x', liveURL: 'https://x/"><script>' }), /data-draft-head="&quot;&gt;&lt;x".*href="https:\/\/x\/&quot;&gt;&lt;script&gt;"/s);
});

test("bar colours are the editor's tokens", async () => {
  const tokens = await readFile(new URL("./web/ui-tokens.css", import.meta.url), "utf8");
  const token = (name) => new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)[1].trim();
  assert.deepEqual(barColors, { surface: token("ui-accent-ink"), soft: token("ui-toast-accent"), ink: token("ui-on-accent") });
});
