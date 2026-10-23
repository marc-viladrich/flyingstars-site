import './test/register-browser-site.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { frontendTarget, liveURL, localizedPath, previewSitePath, previewURL, savedIsLive, splitLocale } from "astro-frontend-editor/web/frontend-url.mjs";

const head = (c) => c.repeat(40);
const origin = "https://www.flyingstars.de";

test("live when the saved draft is what the public site serves, in the active language", () => {
  const publication = { draftHead: head("a"), activePublishedHead: head("a"), url: origin };
  assert.deepEqual(frontendTarget({ route: "/", locale: "de", publication }), { kind: "live", url: origin + "/", live: origin + "/" });
  assert.equal(frontendTarget({ route: "/", locale: "en", publication }).url, origin + "/en/");
  assert.equal(frontendTarget({ route: "/drohnenshow-preise/", locale: "nl", publication }).url, origin + "/nl/drohnenshow-preise/");
  assert.equal(frontendTarget({ route: "/kontakt/", locale: "de", publication }).url, origin + "/kontakt/");
});

test("saved but unpublished (or not yet active) → preview of the saved draft, with the live address alongside", () => {
  for (const publication of [
    { draftHead: head("b"), activePublishedHead: head("a"), url: origin },
    // Published in Git but the public build is not active yet: the public site still serves the old state.
    { draftHead: head("b"), publishedHead: head("b"), activePublishedHead: head("a"), url: origin },
  ]) {
    const target = frontendTarget({ route: "/shows/", locale: "en", publication });
    assert.equal(target.kind, "preview");
    assert.equal(target.url, "/vorschau/en/shows/");
    assert.equal(target.live, origin + "/en/shows/");
  }
  assert.equal(frontendTarget({ route: "/", locale: "de", publication: { draftHead: head("b"), activePublishedHead: head("a"), url: origin } }).url, "/vorschau/");
});

test("without publication data the preview is the safe answer", () => {
  assert.equal(savedIsLive(undefined), false);
  assert.equal(savedIsLive({ draftHead: undefined, activePublishedHead: undefined }), false);
  assert.deepEqual(frontendTarget({ route: "/", locale: "de" }), { kind: "preview", url: "/vorschau/", live: null });
});

test("language prefixes round-trip; preview addresses map back to the site path", () => {
  for (const [route, locale, path] of [["/", "de", "/"], ["/", "en", "/en/"], ["/shows/", "nl", "/nl/shows/"], ["/kontakt/", "de", "/kontakt/"]]) {
    assert.equal(localizedPath(route, locale), path);
    assert.deepEqual(splitLocale(path), { locale, path: route });
    assert.equal(previewSitePath(previewURL(route, locale)), path);
    assert.equal(new URL(liveURL(route, locale, "http://127.0.0.1:4543")).pathname, path);
  }
  assert.equal(previewSitePath("/vorschau"), "/");
  assert.equal(previewSitePath("/vorschauen/"), null);
  assert.equal(previewSitePath("/editor/"), null);
  assert.equal(previewSitePath("/en/"), null);
});
