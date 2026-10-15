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
    "{c}{o}Berlin Game{/o}{/c}",
    "{o}{c}Berlin Game{/c}{/o}",
    "{c}Exploring{/c}",
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

test("case-title outline is active and removes/adds cleanly through the frame toolbar and serializer", async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  // A full-field range, as formatRange() uses when there is no word selection.
  // Exercise the production toolbar functions; this small DOM only models that range.
  const owner = tree(inlineHtml('{o}Berlin *Game*{/o}'));
  function attach(node, parent = null) {
    node.parentElement = parent;
    node.nodeType = node.text === undefined ? 1 : 3;
    node.nodeValue = node.text;
    node.childNodes = node.children || [];
    node.contains = candidate => candidate === node || node.childNodes.some(child => child.contains(candidate));
    node.closest = selector => node.attributes?.class?.split(' ').includes(selector.slice(5)) ? node : parent?.closest(selector);
    node.replaceWith = (...parts) => {
      const siblings = node.parentElement.children;
      siblings.splice(siblings.indexOf(node), 1, ...parts);
      parts.forEach(part => attach(part, node.parentElement));
    };
    node.append = fragment => {
      node.children.push(...fragment.children);
      node.children.forEach(child => attach(child, node));
    };
    node.querySelectorAll = selector => node.childNodes.flatMap(child => [ ...(child.tag === 'span' && child.attributes?.class === selector.slice(5) ? [child] : []), ...(child.querySelectorAll?.(selector) || []) ]);
    Object.defineProperty(node, 'className', { configurable: true, set(value) { node.attributes = {class: value}; } });
    node.children?.forEach(child => attach(child, node));
    return node;
  }
  attach(owner);
  const range = {
    commonAncestorContainer: owner, collapsed: false,
    startContainer: owner, startOffset: 0, endContainer: owner, endOffset: 1,
    intersectsNode: () => true,
    extractContents() { const children = owner.children.splice(0); return {children}; },
    insertNode(node) { owner.children.push(node); attach(node, owner); },
    selectNodeContents() {},
  };
  const document = {
    createTreeWalker(root) {
      const nodes = [];
      const visit = node => node.nodeType === 3 ? nodes.push(node) : node.childNodes.forEach(visit);
      visit(root); let i = 0;
      return {nextNode() { this.currentNode = nodes[i++]; return !!this.currentNode; }};
    },
    createElement(tag) { return attach({tag, children: []}); },
    createRange() { return {setStart() {}, setEnd() {}, extractContents: () => ({textContent: '', children: []})}; },
  };
  const source = await readFile(new URL('./web/frame.js', import.meta.url), 'utf8');
  const functions = source.slice(source.indexOf('function textNodesIn('), source.indexOf('function format(command)'));
  const toolbar = runInNewContext(functions + ';({markActive,toggleMark})', {document, NodeFilter: {SHOW_TEXT: 4}, toolOwner: owner});
  for (let i = 0; i < 3; i++) {
    assert.equal(toolbar.markActive(range, 't-outline'), true);
    assert.equal(inlineText(owner), '{o}Berlin *Game*{/o}');
    toolbar.toggleMark(range, 't-outline');
    assert.equal(toolbar.markActive(range, 't-outline'), false);
    assert.equal(inlineText(owner), 'Berlin *Game*');
    toolbar.toggleMark(range, 't-outline');
    assert.equal(owner.querySelectorAll('span.t-outline').length, 1);
    assert.equal(inlineHtml(inlineText(owner)), '<span class="t-outline">Berlin <em>Game</em></span>');
  }
});
