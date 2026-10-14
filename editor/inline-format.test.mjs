import test from "node:test";
import assert from "node:assert/strict";
import { inlineText } from "./web/inline-format.mjs";
import { inlineHtml } from "../src/lib/inline-text.mjs";

// Tiny parser for the tags inlineHtml emits (and browsers add while editing), enough for round trips.
function tree(html) {
  const root = { tag: "div", children: [] },
    stack = [root];
  for (const [, close, tag, attrs, text] of html.matchAll(/<(\/?)(\w+)([^>]*)>|([^<]+)/g)) {
    if (text !== undefined) stack.at(-1).children.push({ text: text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") });
    else if (close) stack.pop();
    else {
      const attributes = Object.fromEntries([...attrs.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
      const node = { tag, attributes, children: [] };
      stack.at(-1).children.push(node);
      if (tag !== "br") stack.push(node);
    }
  }
  return root;
}

test("stored marks survive the trip through the page HTML and back", () => {
  for (const value of [
    "Wir gestalten dein Stück Himmel.",
    "Wir {o}gestalten{/o} dein **Stück** Himmel.",
    "{c}NFL{/c} {o}Berlin *Game*{/o}",
    "~~alt~~ **neu**",
    "Preis ab 10 000 € <ohne> & mit",
  ])
    assert.equal(inlineText(tree(inlineHtml(value))), value);
});

test("browser formatting via inline styles counts as the mark; normal styles are no mark", () => {
  assert.equal(inlineText(tree('<span style="font-weight: bold">Fett</span> und <span style="font-weight: normal">normal</span>')), "**Fett** und normal");
  assert.equal(inlineText(tree('<span style="font-style: italic; text-decoration: line-through">alt</span>')), "~~*alt*~~");
});

test("block wrappers from Enter or paste never glue words together; marks stay tight to words", () => {
  assert.equal(inlineText(tree("Erste<div>Zweite</div>")), "Erste Zweite");
  assert.equal(inlineText(tree("<b>Wort </b>danach")), "**Wort** danach");
});

test("no-break spaces a browser adds at edges become spaces; a deliberate one stays", () => {
  assert.equal(inlineText(tree("Wort ")), "Wort ");
  assert.equal(inlineText(tree("10 000")), "10 000");
});

test("asterisks and tildes typed as text stay text after saving and rendering", () => {
  const stored = inlineText(tree("A **literal** B, 5* und ~~ und {o}"));
  assert.equal(stored, "A \\*\\*literal\\*\\* B, 5\\* und \\~\\~ und \\{o}");
  assert.equal(inlineHtml(stored), "A **literal** B, 5* und ~~ und {o}");
});
