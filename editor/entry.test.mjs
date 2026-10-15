import test from "node:test";
import assert from "node:assert/strict";
import { editorEntry, isSitePage, loginReturn, topLevelVisit } from "./entry.mjs";

const at = (path) => editorEntry(new URL(path, "http://127.0.0.1:4542"));

test("every entry address leads into the editor, site pages open inside it", () => {
  assert.equal(at("/"), "/editor/");
  assert.equal(at("/editor"), "/editor/");
  assert.equal(at("/editor?page=%2Fshows%2F"), "/editor/?page=%2Fshows%2F");
  assert.equal(at("/editor/login"), "/editor/");
  assert.equal(at("/projekte/nfl-berlin-game/"), "/editor/?page=%2Fprojekte%2Fnfl-berlin-game%2F");
  assert.equal(at("/en/shows/"), "/editor/?page=%2Fen%2Fshows%2F");
  // Editor-internal frame parameters are not part of the page address.
  assert.equal(at("/shows/?editor=1&_editorNavigation=x"), "/editor/?page=%2Fshows%2F");
});

test("assets, API calls and dev-server paths are not pages", () => {
  for (const p of ["/editor/editor.js", "/editor/api/state", "/_astro/a.css", "/@vite/client", "/favicon.svg", "/assets/a.webp"]) assert.equal(isSitePage(p), false, p);
  for (const p of ["/", "/shows/", "/index.html", "/en/"]) assert.equal(isSitePage(p), true, p);
});

test("only top-level document visits are redirected, the editor iframe is not", () => {
  assert.equal(topLevelVisit({ method: "GET", headers: { "sec-fetch-dest": "document" } }), true);
  assert.equal(topLevelVisit({ method: "GET", headers: { "sec-fetch-dest": "iframe" } }), false);
  assert.equal(topLevelVisit({ method: "GET", headers: {} }), false);
});

test("the preview of the saved draft is no frame page: a top-level visit stays there, the login returns there", () => {
  for (const p of ["/vorschau", "/vorschau/", "/vorschau/en/", "/vorschau/kontakt/", "/vorschau/index.html"]) {
    assert.equal(isSitePage(p), false, p);
    assert.equal(at(p), null, p);
    assert.equal(loginReturn(new URL(p, "http://127.0.0.1:4542")), p, p);
  }
  // Only the exact prefix: a German page that merely starts with the word stays a frame page.
  assert.equal(isSitePage("/vorschauen/"), true);
  assert.equal(loginReturn(new URL("/vorschau/en/?x=1", "http://127.0.0.1:4542")), "/vorschau/en/?x=1");
  assert.equal(loginReturn(new URL("/shows/", "http://127.0.0.1:4542")), "/editor/?page=%2Fshows%2F");
  assert.equal(loginReturn(new URL("/editor/api/state", "http://127.0.0.1:4542")), "/editor/");
});
