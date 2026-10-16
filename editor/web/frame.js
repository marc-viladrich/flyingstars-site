import { prepareClonedSection } from "./prepare-cloned-section.mjs";
import { LiveNodeHistory, remappedReference } from "./live-node-history.mjs";
import * as afe from "./frame-markers.mjs";
import { marked } from "/editor/marked.mjs";
import { ui } from "./ui-icons.mjs";
import { fieldLabel, choiceLabel } from "./field-labels.mjs";
import { regions, isRuntime, sameStructure, patchInPlace } from "./preview-apply.mjs";
import { domTree, markdownSupported, markdownText } from "./inline-markdown.mjs";
import { inlineText, inlineSupported } from "./inline-format.mjs";
import {inlineHtml} from './inline-format.mjs';
import {extensions} from './site-adapter.mjs';
// Editor-only enhancement. The public page keeps its native scripts and canvas controls.
const translations=extensions.require('translationStorage');
const sourceLocale=extensions.require('languages').source;
let sourceMediaMap = {};
let records = [],
  preview = false,
  busy = false,
  outlines = false,
  selected = null,
  languageLocale = sourceLocale,
  languageValues = [];
const liveNodeHistory = new LiveNodeHistory();
let cloneSequence = 0;
const baselines = new WeakMap(),
  bindings = new WeakMap(),
  richBaselines = new WeakMap(),
  mediaBaselines = new WeakMap();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const send = (type, data = {}) =>
  parent.postMessage(
    { source: "afe-frame", type, frameURL: location.pathname + location.search, ...data },
    location.origin,
  );
const readPath = (data, path) => path.reduce((value, key) => value?.[key], data);
// The field a marked element shows, with its record and descriptor. Panel fields (formatted or computed
// output such as a price) open the raw field; inline fields are edited on the page.
function context(node, derived = false) {
  const marker = afe.markerOf(node, derived ? afe.isPanelField : afe.isInlineField);
  const found = marker && afe.binding(records, marker.address);
  if (!found) return null;
  const item = records.find((item) => item.id === found.id);
  const field = item?.fields.find((field) => equal(field.path, found.path));
  return item && field ? { id: item.id, path: found.path, field, item, node, derived, format: marker.kind === "body" ? "markdown" : field.format } : null;
}
function currentValue(c) {
  return readPath(c.item.data, c.path);
}
function sectionInfo(node) {
  const block = afe.blockInfo(records, node);
  return block ? { id: block.id, index: block.index } : null;
}
// The card/list entry around an element: its membership in a list, and the record it shows if that is another one.
function entryInfo(node) {
  const entry = afe.membershipInfo(records, node);
  return entry ? { id: entry.id, path: entry.path, record: entry.record } : null;
}
// Everything the shell needs to open the right object: the field, its record, its card and its section.
function target(c) {
  return { id: c.id, path: c.path, derived: c.derived, section: sectionInfo(c.node), entry: entryInfo(c.node) };
}
// ---------------------------------------------------------------------------
// Occurrences: the outermost item marker around a node is the card the person means ("this card"); nested
// items (a selected Leistung, a fact) are parts of it. The identity is the product's (occurrence, shown record,
// membership) and goes to the shell unchanged.
// ---------------------------------------------------------------------------
const occurrenceOf = (node) => afe.occurrenceInfo(records, node);
// Everything one occurrence renders, read from all its wrappers (a card may be drawn twice), as {id, path, kind}.
const occurrenceMarkers = (identity) => afe.occurrenceBindings(records, document, identity);
const renderedId = (node) => {
  const item = afe.markerOf(node, afe.isItem);
  return item ? afe.recordIdOf(records, item.rendered) : null;
};
// One inspection for every way in (right-click, toolbar gear, ⇧F10, a click on a price): inside a card the
// card opens, with the clicked element first; elsewhere the element, list entry, record or section.
function inspection(node) {
  if (!node?.closest) return null;
  const media = afe.closestMarker(node, afe.isMedia);
  const mediaAt = media && afe.binding(records, media.marker.address);
  const field = !mediaAt && afe.closestMarker(node, afe.isField);
  const c = field && context(field.node, !afe.hasMarker(field.node, afe.isInlineField));
  const occurrence = occurrenceOf(node);
  if (occurrence) {
    let focus = mediaAt ? { ...mediaAt, kind: "media" } : c ? { id: c.id, path: c.path, kind: c.derived ? "derived" : "field" } : null;
    // Inside a nested part of the card (a selected Leistung, a table cell, a fact) the part is what was meant,
    // also when the click hit its padding rather than its text.
    const nested = afe.closestMarker((focus && (media?.node || field?.node)) || node, afe.isItem);
    const part = nested && nested.node !== occurrence.node && nested.marker.membership && afe.binding(records, nested.marker.membership);
    if (part && part.id === occurrence.id) focus = { id: part.id, path: part.path, kind: "entry" };
    // A field of some other record embedded in the card keeps its own element panel.
    if (!focus || focus.id === occurrence.id || focus.id === occurrence.record)
      return {
        type: "inspect-instance",
        data: { id: occurrence.id, path: occurrence.path, record: occurrence.record, section: sectionInfo(occurrence.node), occurrence: occurrence.identity, focus, rect: rect(occurrence.node) },
      };
  }
  if (mediaAt) return { type: "media", data: { ...mediaAt, section: sectionInfo(media.node), entry: entryInfo(media.node) } };
  if (c) return { type: "inspect", data: { ...target(c), rect: rect(c.node) } };
  const entry = entryInfo(node);
  if (entry) return { type: "inspect-entry", data: { ...entry, section: sectionInfo(node) } };
  // A record shown here without being a list entry (a record wrapper, a queried card whose record has no panel of its own).
  const shown = afe.closestMarker(node, (marker) => marker.kind === "record" || afe.isItem(marker));
  const shownId = shown && afe.recordIdOf(records, shown.marker.kind === "record" ? shown.marker.address.owner : shown.marker.rendered);
  if (shownId && !extensions.some('isPage',{id:shownId}))
    return { type: "inspect-record", data: { id: shownId, section: sectionInfo(shown.node) } };
  const block = afe.blockInfo(records, node);
  if (block) return { type: "section", data: { id: block.id, index: block.index } };
  return null;
}
function inspect(node, point) {
  const found = inspection(node);
  if (found) send(found.type, { ...found.data, ...(point ? { point } : {}) });
  return !!found;
}
// In a foreign-language view, text shows its translation (or the German original until translated).
function translatedValue(c) {
  return translations.find(languageValues,c.id,c.path)?.text;
}
function displayValue(c) {
  if (languageLocale === sourceLocale || c.field.kind !== "text") return currentValue(c);
  return translatedValue(c) ?? currentValue(c);
}
function rect(node) {
  const r = node.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}
function selection(c) {
  selected = c;
  selectedMedia = null;
  showToolbar(c.node, c.derived ? "derived" : "text", c);
  const opens = c.derived ? inspection(c.node) : null;
  send("select", {
    id: c.id,
    path: c.path,
    derived: c.derived,
    rich: c.format === "markdown" && c.node.hasAttribute("data-editor-editable"),
    rect: rect(c.node),
    ...(opens?.type === "inspect-instance" ? { instance: opens.data } : {}),
  });
}
// The schema format of the field a node shows: short texts with light formatting ("inline") are shown as HTML and
// stored as inline marks; Markdown fields and bodies ("markdown") as rendered Markdown.
const formatOf = (node) => (bindings.get(node) || context(node))?.format;
const isInline = (node) => formatOf(node) === "inline";
const isMarkdown = (node) => formatOf(node) === "markdown";
const inlineTree = (node) => ({ tag: "div", children: domTree(node).children });
function showText(node, value) {
  if (isMarkdown(node) && node.hasAttribute("data-editor-rich")) node.innerHTML = safeMarkdown(value ?? "");
  else if (isInline(node)) node.innerHTML = inlineHtml(value ?? "");
  else node.textContent = value ?? "";
}
function read(c) {
  if (isInline(c.node)) {
    const result = inlineText(inlineTree(c.node)),
      initial = richBaselines.get(c.node);
    return result === initial?.markdown ? initial.source : result;
  }
  if (isMarkdown(c.node)) {
    const result = markdownText(domTree(c.node)),
      initial = richBaselines.get(c.node);
    return result === initial?.markdown ? initial.source : result;
  }
  if (c.field.kind === "number") {
    const input = c.node.textContent.trim();
    return input === "" ? null : Number(input);
  }
  return c.node.textContent;
}
function stage(node, emit = true) {
  const c = bindings.get(node);
  if (!c) return null;
  const patch = { id: c.id, path: c.path, value: read(c) };
  if (languageLocale !== sourceLocale) {
    // Untouched text in a foreign view is not a translation; only real edits are written.
    if (equal(patch.value, baselines.get(node))) return null;
    patch.locale = languageLocale;
    if (emit) send("stage-translation", patch);
  } else if (emit) send("stage", patch);
  baselines.set(node, structuredClone(patch.value));
  return patch;
}
function flush() {
  const node = document.activeElement;
  if (bindings.has(node)) {
    const patch = stage(node, false);
    node.blur();
    return patch ? [patch] : [];
  }
  return [];
}
extensions.connect({frame: {
  flush,
  transient,
  freeze() {
    busy = true;
    mode();
  },
  orderedRecords(id, index) {
    const ordered = orderedList(blockNode(id, index));
    return ordered ? { field: ordered.field, ids: ordered.items.map(renderedId) } : null;
  },
  // The same order applied to the live page at once (also without live preview).
  orderRecords(id, index, ids) {
    const ordered = orderedList(blockNode(id, index));
    if (!ordered) return;
    const items = ordered.items;
    flip(items, () => ids.forEach((recordId) => { const node = items.find((n) => renderedId(n) === recordId); if (node) ordered.node.append(node); }));
  },
  // Text fields that are visible on this page (for "confirm all suggestions on this page").
  renderedFields() {
    return [...document.querySelectorAll("[data-editor-editable]")].map((n) => bindings.get(n)).filter(Boolean).map((c) => ({ id: c.id, path: c.path }));
  },
  // What one occurrence (card) renders, read fresh from the live page each time the panel draws.
  occurrenceMarkers(identity) {
    return identity ? occurrenceMarkers(identity) : [];
  },
  // Records whose content is visible on this page (for "translate what is on this page").
  recordsOnPage() {
    return afe.recordsOnPage(records, document);
  },
  refocus() {
    if (selected?.node?.isConnected) selected.node.focus({ preventScroll: true });
  },
  visibleSection() {
    const middle = innerHeight / 2;
    let best = null,
      distance = Infinity;
    for (const { node } of afe.allMarked(document, afe.isBlock)) {
      const r = node.getBoundingClientRect();
      if (r.height < 1) continue;
      const d =
        r.top <= middle && r.bottom >= middle ? 0 : Math.min(Math.abs(r.top - middle), Math.abs(r.bottom - middle));
      if (d < distance) {
        distance = d;
        best = sectionInfo(node);
      }
    }
    return best;
  },
}});
const uiTokens = document.createElement("link");
uiTokens.rel = "stylesheet";
uiTokens.href = "/editor/ui-tokens.css";
document.head.append(uiTokens);
const style = document.createElement("style");
style.dataset.editor = "true";
style.textContent = `html:not(.native-editor-preview) [data-editor-editable]{outline:2px solid transparent;outline-offset:4px;cursor:text;pointer-events:auto!important}html:not(.native-editor-preview) [data-editor-editable]:hover{outline:1px solid var(--ui-frame-hover)}html:not(.native-editor-preview) [data-editor-editable]:focus{outline:2px solid var(--ui-frame-accent);caret-color:var(--ui-frame-accent)}html.native-editor-outlines:not(.native-editor-preview) [data-editor-editable],html.native-editor-outlines:not(.native-editor-preview) [data-editor-panel]{outline:1px dashed var(--ui-frame-accent);outline-offset:4px}html:not(.native-editor-preview) [data-editor-panel]:hover{outline:1px solid var(--ui-frame-hover);outline-offset:4px;cursor:pointer}html:not(.native-editor-preview) [data-editor-panel]:focus-visible{outline:2px solid var(--ui-frame-accent);outline-offset:4px}html.native-editor-busy [data-editor-editable]{cursor:wait}`;
document.head.append(style);
style.textContent += extensions.collect('frameStyles').join('');
function mode() {
  if (preview || busy) hideToolbar();
  document.documentElement.classList.toggle("native-editor-preview", preview);
  document.documentElement.classList.toggle("native-editor-outlines", outlines);
  document.documentElement.classList.toggle("native-editor-busy", busy);
  for (const node of document.querySelectorAll("[data-editor-editable]")) {
    const c = bindings.get(node);
    const locked = preview || busy || (languageLocale !== sourceLocale && c?.field.kind !== "text");
    node.contentEditable = locked ? "false" : isMarkdown(node) || isInline(node) ? "true" : "plaintext-only";
    if (preview) {
      node.removeAttribute("role");
      node.removeAttribute("tabindex");
    } else {
      node.setAttribute("role", "textbox");
      node.tabIndex = 0;
    }
  }
  for (const node of document.querySelectorAll("[data-editor-panel]")) {
    if (preview) {
      node.removeAttribute("role");
      node.removeAttribute("tabindex");
      node.removeAttribute("aria-label");
    } else {
      const c = context(node, true);
      if (c) {
        node.tabIndex = busy ? -1 : 0;
        node.setAttribute("role", "button");
        node.setAttribute("aria-label", (c.field.label || "Basispreis") + " bearbeiten · " + c.item.title);
      }
    }
  }
}
function bind() {
  stampBlockTypes(document);
  // Panel fields (computed displays) get a focusable target; the attribute is the frame's own state.
  for (const node of new Set(afe.allMarked(document, afe.isPanelField).map(({ node }) => node)))
    if (!afe.hasMarker(node, afe.isInlineField)) node.setAttribute("data-editor-panel", "");
  for (const node of new Set(afe.allMarked(document, afe.isInlineField).map(({ node }) => node))) {
    const c = context(node);
    if (!c) continue;
    bindings.set(node, c);
    const rich = c.format === "markdown" && markdownSupported(domTree(node));
    const formatted = c.format === "inline" && inlineTree(node).children.every(inlineSupported);
    if (rich) node.setAttribute("data-editor-rich", "");
    // A template such as "Schritt {current} von {total}" is shown filled in; it is edited in the panel, not in place.
    // Format marks such as {o}…{/o} in formatted short texts are not placeholders.
    const templated = c.format !== "inline" && typeof currentValue(c) === "string" && /\{\w+\}/.test(currentValue(c));
    const inline =
      !templated &&
      ["text", "number"].includes(c.field.kind) &&
      !["IMG", "VIDEO", "CANVAS", "INPUT", "TEXTAREA", "SELECT"].includes(node.tagName) &&
      (node.children.length === 0 || rich || formatted);
    if (!inline) continue;
    node.setAttribute("data-editor-editable", "");
    node.setAttribute("aria-label", (c.field.label || c.path.at(-1)) + " · " + c.item.title);
    node.spellcheck = c.field.kind === "text";
    if (document.activeElement !== node) showText(node, displayValue(c));
    if (node.hasAttribute("data-editor-bound")) continue;
    node.setAttribute("data-editor-bound", "");
    node.addEventListener("focus", () => {
      const latest = context(node);
      bindings.set(node, latest);
      baselines.set(node, structuredClone(displayValue(latest)));
      if (rich) richBaselines.set(node, { markdown: markdownText(domTree(node)), source: displayValue(latest) });
      else if (isInline(node)) richBaselines.set(node, { markdown: inlineText(inlineTree(node)), source: displayValue(latest) });
      selection(latest);
    });
    if (rich || c.format === "inline")
      node.addEventListener("paste", (event) => {
        event.preventDefault();
        if (preview || busy) return;
        document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") || "");
      });
    node.addEventListener("input", () => {
      const binding = bindings.get(node);
      send(languageLocale === sourceLocale ? "input" : "input-translation", { id: binding.id, path: binding.path, value: read(binding), locale: languageLocale });
    });
    node.addEventListener("blur", () => {
      if (!preview && !busy) stage(node);
    });
    node.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        const binding = bindings.get(node);
        showText(node, baselines.get(node));
        send("cancel", { id: binding.id, path: binding.path, locale: languageLocale });
        node.blur();
      } else if (event.key === "Enter" && !event.shiftKey && !rich) {
        event.preventDefault();
        node.blur();
      }
    });
  }
  mode();
  const inlineNodes = [...document.querySelectorAll("[data-editor-editable]")];
  send("coverage", {
    inline: inlineNodes.length,
    derived: document.querySelectorAll("[data-editor-panel]").length,
    keys: inlineNodes
      .map((node) => bindings.get(node))
      .filter(Boolean)
      .map((c) => c.id + "/" + JSON.stringify(c.path)),
  });
}
// Buttons, links and disclosures that carry editable content: the first click selects them for editing,
// a second click on the same control does what it does on the website. ⌘/Ctrl-click always activates.
// Controls without editable content (pause button, form chips) keep working on the first click.
let armed = null,
  firstClick = null,
  armedHintShown = false;
const controlOf = (target) => target.closest("a[href],button,summary,[role='button']");
const editableControl = (control) =>
  !toolbar.contains(control) &&
  !!(
    afe.hasMarker(control, (marker) => afe.isField(marker) || afe.isMembership(marker)) ||
    afe.allMarked(control, afe.isField).some(({ node }) => node !== control) ||
    !!afe.closestMarker(control, afe.isInlineField)
  );
document.addEventListener(
  "click",
  (event) => {
    if (preview || busy) return;
    const control = controlOf(event.target);
    if (control && editableControl(control)) {
      if (armed === control || event.metaKey || event.ctrlKey) return;
      armed = control;
      firstClick = event;
      event.preventDefault();
      event.stopPropagation();
      if (!armedHintShown) {
        armedHintShown = true;
        send("hint", { text: "Erster Klick bearbeitet, ein zweiter Klick löst Button oder Link aus. ⌘-Klick löst sofort aus." });
      }
    }
    const media = afe.closestMarker(event.target, afe.isMedia);
    if (media && event.target.closest("img")) {
      const at = afe.binding(records, media.marker.address);
      if (at) {
        event.preventDefault();
        selected = null;
        selectedMedia = event.target.closest("img");
        showToolbar(selectedMedia, "media", { ...at, section: sectionInfo(media.node), entry: entryInfo(media.node) });
        send("select-media", { ...at, section: sectionInfo(media.node) });
        return;
      }
    }
    const derived = afe.closestMarker(event.target, afe.isPanelField)?.node;
    if (derived) {
      const c = context(derived, true);
      if (c) {
        event.preventDefault();
        event.stopPropagation();
        selection(c);
      }
      return;
    }
    const node = afe.closestMarker(event.target, afe.isInlineField)?.node;
    const entryNode = !node && afe.closestMarker(event.target, afe.isMembership)?.node;
    if (entryNode && !event.target.closest("button,input,select,textarea,summary,canvas,video")) {
      const info = entryInfo(entryNode);
      if (info) {
        event.preventDefault();
        selected = null;
        showToolbar(entryNode, "entry", { ...info, section: sectionInfo(entryNode) });
        return;
      }
    }
    if (node) {
      const c = context(node);
      if (c) {
        if (node.hasAttribute("data-editor-editable")) {
          if (event.target.closest("a")) event.preventDefault();
          selection(c);
        } else {
          event.preventDefault();
          inspect(node, { x: event.clientX, y: event.clientY });
        }
      }
    }
  },
  true,
);
document.addEventListener(
  "pointerdown",
  (event) => {
    if (toolbar.contains(event.target)) return;
    if (armed && !armed.contains(event.target)) armed = null;
    selectedMedia = null;
    if (selected && !selected.node.contains(event.target)) selected = null;
    if (!toolOwner?.contains(event.target)) hideToolbar();
    send("pointerdown");
  },
  true,
);
document.addEventListener("contextmenu", (event) => {
  if (preview || busy) return;
  if (inspection(event.target)) {
    event.preventDefault();
    inspect(event.target, { x: event.clientX, y: event.clientY });
  }
});
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || event.button !== 0 || event.shiftKey || event.altKey) return;
  // ⌘/Ctrl-click opens a new tab natively, also in edit mode.
  if (event.metaKey || event.ctrlKey) return;
  // While editing, a link is content on the first click; the second click (or ⌘/Ctrl-click) follows it.
  const follow = preview || armed === link || event.metaKey || event.ctrlKey || !editableControl(link);
  if (event === firstClick || !follow) {
    event.preventDefault();
    return;
  }
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) {
    // External links open beside the editor, never inside it.
    event.preventDefault();
    window.open(url.href, "_blank", "noopener");
    return;
  }
  if (url.pathname.startsWith("/editor/")) return;
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
  event.preventDefault();
  if (!busy) send("navigate", { url: url.pathname + url.search + url.hash });
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    send("save");
  }
  if (!preview && !busy && ["Enter", " "].includes(event.key) && event.target.hasAttribute?.("data-editor-panel")) {
    const c = context(event.target, true);
    if (c) {
      event.preventDefault();
      selection(c);
    }
  }
  if (!preview && !busy && event.key === "F10" && event.shiftKey && selected) {
    event.preventDefault();
    inspect(selected.node);
  }
  if (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    event.key.toLowerCase() === "z" &&
    !event.target.closest?.("[contenteditable=true],[contenteditable=plaintext-only],input,textarea,select")
  ) {
    event.preventDefault();
    send("undo");
  }
});
let selectedMedia = null;
const updateRect = () => placeToolbar();
window.addEventListener("scroll", updateRect, { passive: true });
window.addEventListener("resize", updateRect);
window.addEventListener("message", (event) => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.source !== "afe-editor")
    return;
  const data = event.data;
  if (data.type === "state") {
    records = data.records || [];
    sourceMediaMap = data.mediaSources || sourceMediaMap;
    preview = !!data.preview;
    busy = !!data.busy;
    outlines = !!data.outlines;
    bind();
    applyPresentation();
    syncOrderedRecords();
  } else if (data.type === "mode") {
    preview = !!data.preview;
    busy = !!data.busy;
    outlines = !!data.outlines;
    mode();
  } else if (data.type === "scroll") {
    window.scrollTo({ top: data.y, behavior: "instant" });
  } else if (data.type === "rect-request") updateRect();
  else if (data.type === "sections") structure(data);
  else if (data.type === "restore-transient") restoreTransient(data.value);
  else if (data.type === "restore-structure") {
    restoreStructure(data.records, data.id);
  } else if (data.type === "translations") {
    translationOverlay(data);
    if (!toolbar.hidden) placeToolbar();
  }
  else if (data.type === "preview-html") applyPreview(data);
  else if (data.type === "focus-field") {
    const node = [...document.querySelectorAll("[data-editor-editable]")].find((n) => {
      const c = bindings.get(n);
      return c && c.id === data.id && equal(c.path, data.path);
    });
    if (node) {
      node.focus({ preventScroll: true });
      node.scrollIntoView({ block: "nearest" });
    }
  }
});
new MutationObserver(() => mode()).observe(document.body, {
  attributes: true,
  subtree: true,
  // A site script may re-point a marker (the configurator's price shows the selected package).
  attributeFilter: ["data-afe"],
});
send("ready", { url: location.pathname + location.search + location.hash });
// Restored from the back/forward cache: the page may still be frozen from when it was left.
addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  busy = false;
  send("ready", { url: location.pathname + location.search + location.hash, restored: true });
});

// Native visitor controls are transient and never written into content files.
function transient() {
  return {
    extensions: extensions.snapshotFrame({window,document}),
    inputs: [...document.querySelectorAll("input[id],textarea[id],select[id],input[name]")]
      .filter((node) => node.type !== "password" && node.type !== "file" && !node.closest("[data-editor]"))
      .map((node) => ({ id: node.id, name: node.name, type: node.type, value: node.value, checked: node.checked })),
    scroll: window.scrollY,
  };
}
async function restoreTransient(value) {
  await extensions.restoreFrame(value?.extensions,{window,document});
  for (const field of value?.inputs || []) {
    const node = field.id
      ? document.getElementById(field.id)
      : [...document.querySelectorAll("input[name]")].find((n) => n.name === field.name && n.value === field.value);
    if (!node || node.type !== field.type || extensions.ownsTransientInput(node,value?.extensions)) continue;
    if (field.type === "radio" || field.type === "checkbox") {
      node.checked = field.checked;
      if (field.checked) node.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      node.value = field.value;
      node.dispatchEvent(new Event("input", { bubbles: true }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  if (Number.isFinite(value?.scroll)) window.scrollTo({ top: value.scroll, behavior: "instant" });
}
// A section moved to index: its block address and every address below it follow (fields, media, cards, uses).
function remapSection(node, index) {
  const block = afe.markerOf(node, afe.isBlock);
  if (block) afe.renumber(node, block.address.owner, block.address.path.slice(0, -1), index);
}
// The block elements of record id in page order, and the anchor of its (possibly empty) block list.
const blockNodes = (id) => [...new Set(afe.allMarked(document, afe.isBlock).filter(({ marker }) => afe.recordIdOf(records, marker.address.owner) === id).map(({ node }) => node))];
const blockNode = (id, index) => blockNodes(id).find((node) => sectionInfo(node)?.index === index) || null;
const blockListAnchor = (id) => afe.allMarked(document, afe.isBlockList).find(({ marker }) => afe.recordIdOf(records, marker.address.owner) === id) || null;
// Every block element carries its type as frame state (data-editor-block-type): the clone source of an insert
// and the site's runtime classification read it. The discriminator comes from the block list's schema.
function stampBlockTypes(root) {
  for (const { node, marker } of afe.allMarked(root, afe.isBlock)) {
    const item = afe.recordOf(records, marker.address.owner),
      list = marker.address.path.slice(0, -1);
    const discriminator = item?.containers?.find((container) => equal(container.path, list))?.["x-afe"]?.array?.discriminator || "type";
    const type = readPath(item?.data, marker.address.path)?.[discriminator];
    if (typeof type === "string") node.dataset.editorBlockType = type;
  }
}
// A query-backed list inside node, sorted by a numeric field of its collection: its container and the cards in it.
function orderedList(node) {
  const found = node && afe.allMarked(node, afe.isOrder)[0];
  if (!found) return null;
  return { node: found.node, path: found.marker.path, field: found.marker.path.join("."), items: [...found.node.children].filter((n) => renderedId(n)) };
}
function structure(data) {
  const nodes = blockNodes(data.id),
    target = nodes.find((node) => sectionInfo(node)?.index === data.index);
  liveNodeHistory.capture(data.id, nodes);
  if (data.action === "remove") target?.remove();
  else if (data.action === "duplicate" && target) {
    const copy = target.cloneNode(true);
    uniqueCloneIds(copy);
    prepareClonedSection(copy, { livePreview: hasBaseline });
    inheritMediaBaselines(target, copy);
    for (const bound of copy.querySelectorAll("[data-editor-bound]")) bound.removeAttribute("data-editor-bound");
    target.after(copy);
  } else if (data.action === "up" && target) {
    const previous = nodes[nodes.indexOf(target) - 1];
    previous?.before(target);
  } else if (data.action === "down" && target) {
    const next = nodes[nodes.indexOf(target) + 1];
    next?.after(target);
  } else if (data.action === "insert") {
    const section = data.sections[data.index],
      anchor = blockListAnchor(data.id),
      source = nodes.find((node) => node.dataset.editorBlockType === section.type);
    let copy = source?.cloneNode(true);
    if (copy) {
      uniqueCloneIds(copy);
      prepareClonedSection(copy, { livePreview: hasBaseline });
      inheritMediaBaselines(source, copy);
      for (const bound of copy.querySelectorAll("[data-editor-bound]")) bound.removeAttribute("data-editor-bound");
    } else {
      copy = document.createElement("section");
      copy.className = "native-pending-section";
      copy.innerHTML = "<h2></h2><p>Neuer Abschnitt. Er erscheint nach dem Speichern mit seinem Inhalt.</p>";
      copy.querySelector("h2").textContent = data.template?.title || section.headline || section.type;
      copy.dataset.editorBlockType = section.type;
      if (anchor) copy.setAttribute("data-afe", afe.blockAttribute(anchor.marker.address.owner, [...anchor.marker.address.path, data.index]));
    }
    if (target) target.before(copy);
    else if (nodes.length) nodes.at(-1).after(copy);
    else anchor?.node.after(copy);
  }
  for (const [index, node] of blockNodes(data.id).entries()) remapSection(node, index);
  selected = null;
  bind();
  revealSection(data);
}
// Show where a structural change landed. The node at the resulting index is the moved, copied or inserted section.
function revealSection(data) {
  if (data.action === "remove") return;
  const resulting =
    data.action === "up"
      ? data.index - 1
      : data.action === "down" || data.action === "duplicate"
        ? data.index + 1
        : data.index;
  const node = blockNode(data.id, resulting);
  if (!node) return;
  const r = node.getBoundingClientRect();
  if (r.top < 0 || r.top > innerHeight * 0.6)
    node.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  node.animate?.([{ boxShadow: "inset 0 0 0 2px var(--ui-frame-accent)" }, { boxShadow: "inset 0 0 0 2px var(--ui-frame-fade)" }], {
    duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1600,
    easing: "ease-out",
  });
}
function translationOverlay(data) {
  languageLocale = data.locale || sourceLocale;
  languageValues = data.values || [];
  document.documentElement.dataset.editorLocale = languageLocale;
  for (const node of new Set(afe.allMarked(document, afe.isInlineField).map(({ node }) => node))) {
    const c = context(node);
    if (!c || c.field.kind !== "text") continue;
    const translated = translations.find(data.values,c.id,c.path);
    if (node.matches("input,textarea") && node.hasAttribute("placeholder")) node.placeholder = translated?.text ?? currentValue(c) ?? "";
    else if (node.matches("option")) node.textContent = translated?.text ?? currentValue(c) ?? "";
    if (node.hasAttribute("data-editor-editable") && document.activeElement !== node) {
      const value = translated?.text ?? currentValue(c) ?? "";
      if (c.format === "markdown") node.innerHTML = safeMarkdown(value);
      else if (c.format === "inline") node.innerHTML = inlineHtml(value);
      else node.textContent = value;
    }
    // Addresses, numbers and links are data, not text to translate.
    const german = currentValue(c);
    const dataLike = typeof german !== "string" || !/\p{L}{2}/u.test(german) || /^(https?:|mailto:|tel:|\/|#)|^[\w.+-]+@[\w-]+\.[\w.]+$/.test(german.trim());
    node.toggleAttribute("data-editor-untranslated", languageLocale !== sourceLocale && !translated && !dataLike);
    node.toggleAttribute("data-editor-machine", languageLocale !== sourceLocale && translations.suggested(translated));
  }
  document.documentElement.classList.toggle("native-language-draft", languageLocale !== sourceLocale);
  mode();
}
style.textContent +=
  " .native-pending-section{margin:32px auto;padding:44px;width:min(90%,1100px);border:2px dashed var(--ui-frame-accent);border-radius:14px;color:inherit;background:var(--ui-frame-tint)}.native-pending-section h2{font:600 28px/1.3 system-ui}.native-pending-section p{font:16px/1.6 system-ui}";

function restoreStructure(items, id) {
  const previous = liveNodeHistory.restore(id);
  if (!previous) return;
  const anchor = blockListAnchor(id)?.node;
  if (!anchor) return;
  const keep = new Set(previous),
    current = blockNodes(id);
  for (const node of current) if (!keep.has(node)) node.remove();
  let at = anchor;
  for (const [index, node] of previous.entries()) {
    at.after(node);
    remapSection(node, index);
    at = node;
  }
  selected = null;
  bind();
  applyPresentation();
  if (languageLocale !== sourceLocale) translationOverlay({ locale: languageLocale, values: languageValues });
}

// Translation is offered in the context panel ("Übersetzen"), not as a floating button per text.

function applyPresentation() {
  extensions.run('presentFrame',{document,records,mediaBaselines,initialMediaSource,markers:afe});
}

// One small toolbar for the selected element: formatting (only for a text selection), translate, options.
let toolOwner = null,
  toolKind = null,
  toolTarget = null,
  richRange = null;
const toolbar = document.createElement("div");
toolbar.dataset.editor = "toolbar";
toolbar.className = "native-toolbar";
toolbar.setAttribute("role", "toolbar");
toolbar.setAttribute("aria-label", "Element");
toolbar.hidden = true;
document.body.append(toolbar);
function toolButton(name, label, run, cls = "", html) {
  const button = document.createElement("button");
  button.type = "button";
  button.innerHTML = html || ui[name];
  button.title = label;
  button.className = cls;
  button.setAttribute("aria-label", label);
  button.addEventListener("mousedown", (event) => event.preventDefault());
  if (run) button.addEventListener("click", run);
  toolbar.append(button);
  return button;
}
// Formatting applies to the selected words, or to the whole text when nothing is selected
// ("ist diese Überschrift Outline oder nicht" is one click).
function formatRange() {
  if (richRange && !richRange.collapsed && toolOwner.contains(richRange.commonAncestorContainer)) return richRange;
  const range = document.createRange();
  range.selectNodeContents(toolOwner);
  return range;
}
function textNodesIn(range) {
  const root = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
    out = [];
  while (walker.nextNode()) if (range.intersectsNode(walker.currentNode) && walker.currentNode.nodeValue.trim()) out.push(walker.currentNode);
  return out;
}
const markOf = (text, cls) => {
  const span = text.parentElement.closest("span." + cls);
  return span && toolOwner.contains(span) ? span : null;
};
function markActive(range, cls) {
  const nodes = textNodesIn(range);
  return nodes.length > 0 && nodes.every((n) => markOf(n, cls));
}
// Character offsets of a range within root (DOM text, not the rendered transform), and back.
function textOffsets(root, range) {
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  return { start, end: start + range.toString().length };
}
function rangeAt(root, { start, end }) {
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0,
    started = false,
    node;
  while ((node = walker.nextNode())) {
    const length = node.textContent.length;
    if (!started && pos + length > start) {
      range.setStart(node, start - pos);
      started = true;
    }
    if (started && pos + length >= end) {
      range.setEnd(node, end - pos);
      return range;
    }
    pos += length;
  }
  range.selectNodeContents(root);
  return range;
}
// Spaces at the edge of a mark belong between words, not to the mark: WebKit drops a space that ends a
// mark span once the selection moves ("Berlin Game" became "BerlinGame"). Same rule as the serializer.
function edgeSpacesOut(root) {
  for (const span of root.querySelectorAll(extensions.inlineCodec.markSelector)) {
    const first = span.firstChild,
      last = span.lastChild;
    if (first?.nodeType === 3 && /^[ \u00a0]+/.test(first.data)) {
      const lead = first.data.match(/^[ \u00a0]+/)[0];
      first.data = first.data.slice(lead.length);
      span.before(document.createTextNode(lead));
    }
    if (last?.nodeType === 3 && /[ \u00a0]+$/.test(last.data)) {
      const trail = last.data.match(/[ \u00a0]+$/)[0];
      last.data = last.data.slice(0, -trail.length);
      span.after(document.createTextNode(trail));
    }
    if (!span.textContent) span.remove();
  }
  root.normalize();
  // Two marks of the same kind separated only by spaces are one mark again ("Berlin Game", not two),
  // so toggling a word off and on returns to the stored value.
  for (const span of [...root.querySelectorAll(extensions.inlineCodec.markSelector)]) {
    const gap = span.nextSibling,
      next = gap?.nextSibling;
    if (gap?.nodeType === 3 && /^[ \u00a0]+$/.test(gap.data) && next?.nodeType === 1 && next.className === span.className) {
      next.prepend(...span.childNodes, gap);
      span.remove();
    }
  }
  root.normalize();
}
function toggleMark(range, cls) {
  if (markActive(range, cls)) {
    const spans = [...new Set(textNodesIn(range).map((n) => markOf(n, cls)))];
    // Only the selected words lose the mark: split a single mark around the selection.
    if (spans.length === 1 && !range.collapsed) {
      const span = spans[0];
      const before = document.createRange(),
        after = document.createRange();
      before.setStart(span, 0);
      before.setEnd(range.startContainer, range.startOffset);
      after.setStart(range.endContainer, range.endOffset);
      after.setEnd(span, span.childNodes.length);
      const head = before.extractContents(),
        tail = after.extractContents();
      const wrapPart = (fragment) => {
        if (!fragment.textContent) return null;
        const part = span.cloneNode(false);
        part.append(fragment);
        return part;
      };
      const parts = [wrapPart(head), ...span.childNodes, wrapPart(tail)].filter(Boolean);
      span.replaceWith(...parts);
      return;
    }
    for (const span of spans) span.replaceWith(...span.childNodes);
    return;
  }
  const span = document.createElement("span");
  span.className = cls;
  span.append(range.extractContents());
  for (const inner of span.querySelectorAll("span." + cls)) inner.replaceWith(...inner.childNodes);
  range.insertNode(span);
  range.selectNodeContents(span);
}
function format(command) {
  if (!toolOwner || preview || busy) return;
  toolOwner.focus();
  const selection = window.getSelection(),
    range = formatRange();
  selection.removeAllRanges();
  selection.addRange(range);
  if (extensions.inlineCodec.marks?.[command]) {
    // Splitting or unwrapping marks rebuilds the DOM; the same words stay selected, so a second click
    // acts on them again instead of on the whole field.
    const offsets = textOffsets(toolOwner, range);
    toggleMark(range, extensions.inlineCodec.marks?.[command]);
    edgeSpacesOut(toolOwner);
    selection.removeAllRanges();
    selection.addRange(rangeAt(toolOwner, offsets));
  } else document.execCommand(command);
  // Empty leftovers of toggling (an unwrapped <b></b>) are not content.
  for (const empty of toolOwner.querySelectorAll("b:empty,strong:empty,i:empty,em:empty,s:empty,strike:empty,span:empty")) empty.remove();
  richRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  // Each format action is its own undo step (typing in between stays grouped as before).
  stage(toolOwner);
  updateFormatState();
}
function updateFormatState() {
  if (!toolOwner) return;
  const range = formatRange();
  const states = {
    bold: () => document.queryCommandState("bold"),
    italic: () => document.queryCommandState("italic"),
    strikeThrough: () => document.queryCommandState("strikeThrough"),
    ...Object.fromEntries(Object.entries(extensions.inlineCodec.marks||{}).map(([command,cls])=>[command,()=>markActive(range,cls)])),
  };
  for (const button of formatButtons) {
    let on = false;
    try {
      on = states[button.dataset.command]?.() || false;
    } catch {}
    button.setAttribute("aria-pressed", String(on));
  }
}
// Order: move · variant · formatting · language · options.
const gripButton = toolButton("grip-vertical", "Verschieben: ziehen oder Pfeiltasten", null, "grip");
const variantGroup = document.createElement("div");
variantGroup.className = "native-variant";
variantGroup.setAttribute("role", "group");
toolbar.append(variantGroup);
const formatButtons = [
  ["bold", "Fett", "bold"],
  ["italic", "Kursiv", "italic"],
  ["strikethrough", "Durchgestrichen", "strikeThrough"],
  ...(extensions.inlineCodec.buttons||[]),
].map(([iconName, label, command]) => {
  const button = toolButton(iconName, label, () => format(command), "fmt");
  button.dataset.command = command;
  return button;
});
// A machine suggestion (yellow dashed) is confirmed as it is with one click; editing it confirms it too.
const confirmButton = toolButton("check", "Übersetzung bestätigen", () => {
  if (!toolOwner || toolKind !== "text") return;
  const c = bindings.get(toolOwner);
  if (c) send("confirm-translation", { id: c.id, path: c.path, locale: languageLocale, value: read(c) });
}, "confirm");
toolButton("settings", "Optionen (⇧F10 oder Rechtsklick)", () => {
  if (!toolTarget || !toolOwner) return;
  inspect(toolOwner);
});
// The card/list entry the toolbar acts on: the selected entry itself or the one around the element.
// or a card of a query-backed list (a container with an order marker). Moving those rewrites their order field.
const orderItem = (node) => {
  for (let n = node?.closest?.(afe.MARKED); n; n = n.parentElement?.closest(afe.MARKED))
    if (renderedId(n) && n.parentElement && afe.hasMarker(n.parentElement, afe.isOrder)) return n;
  return null;
};
// Ordered records follow their order values in the draft (Undo of a move, also without live preview).
function syncOrderedRecords() {
  if (dragging) return;
  for (const { node: container, marker } of afe.allMarked(document, afe.isOrder)) {
    const items = [...container.children].filter((n) => renderedId(n));
    const valueOf = (n) => Number(readPath(records.find((r) => r.id === renderedId(n))?.data, marker.path));
    if (items.some((n) => !Number.isFinite(valueOf(n)))) continue;
    const sorted = [...items].sort((a, b) => valueOf(a) - valueOf(b));
    if (sorted.every((n, i) => n === items[i])) continue;
    flip(items, () => sorted.forEach((n) => container.append(n)));
  }
}
function toolEntry() {
  if (!toolOwner) return null;
  const node = toolKind === "entry" ? toolOwner : afe.closestMarker(toolOwner, afe.isMembership)?.node;
  if (node && entryInfo(node)) return node;
  return orderItem(toolOwner);
}
const membershipOf = (node) => afe.markerOf(node, afe.isMembership)?.membership || null;
const sameList = (a, b) => a.owner.collection === b.owner.collection && a.owner.id === b.owner.id && equal(a.path.slice(0, -1), b.path.slice(0, -1));
function listSiblings(node) {
  const membership = membershipOf(node);
  if (!membership && orderItem(node) === node) return [...node.parentElement.children].filter((n) => renderedId(n));
  return [...node.parentElement.children].filter((n) => { const other = membershipOf(n); return other && sameList(other, membership); });
}
// One short enum of the entry (e.g. a table cell's Ja/Nein/Teilweise) is offered right in the toolbar.
function renderVariant(entryNode) {
  variantGroup.replaceChildren();
  const info = entryNode && entryInfo(entryNode);
  const item = info && records.find((r) => r.id === info.id);
  const enums = item ? item.fields.filter((f) => f.kind === "enum" && f.path.length === info.path.length + 1 && info.path.every((p, i) => f.path[i] === p) && (f.choices || []).length <= 4) : [];
  variantGroup.hidden = enums.length !== 1;
  if (enums.length !== 1) return;
  const field = enums[0];
  variantGroup.setAttribute("aria-label", fieldLabel(field));
  for (const choice of field.choices) {
    const value = typeof choice === "object" ? choice.value : choice;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = choiceLabel(choice);
    extensions.run('variantPresentation',field,value,chip);
    chip.title = fieldLabel(field) + ": " + choiceLabel(choice);
    chip.setAttribute("aria-pressed", String(equal(readPath(item.data, field.path), value)));
    chip.addEventListener("mousedown", (event) => event.preventDefault());
    chip.addEventListener("click", () => {
      for (const other of variantGroup.children) other.setAttribute("aria-pressed", String(other === chip));
      send("set-field", { id: item.id, path: field.path, value });
    });
    variantGroup.append(chip);
  }
}
function showToolbar(node, kind, c) {
  if (preview || busy) return;
  document.querySelector(".native-entry-selected")?.classList.remove("native-entry-selected");
  if (kind === "entry") node.classList.add("native-entry-selected");
  toolOwner = node;
  toolKind = kind;
  toolTarget = kind === "media" || kind === "entry" ? c : target(c);
  const entryNode = toolEntry();
  // Table cells keep their column; rows, cards and list items move.
  gripButton.hidden = !entryNode || entryNode.matches("td,th") || listSiblings(entryNode).length < 2;
  renderVariant(entryNode);
  toolbar.hidden = false;
  placeToolbar();
}
function hideToolbar() {
  document.querySelector(".native-entry-selected")?.classList.remove("native-entry-selected");
  toolbar.hidden = true;
  toolOwner = toolKind = toolTarget = null;
}
function placeToolbar() {
  if (toolbar.hidden || !toolOwner?.isConnected) return hideToolbar();
  // Markdown texts: bold/italic/strike for a selection. Short formatted texts: all five, also without selection.
  const markdown = toolKind === "text" && isMarkdown(toolOwner);
  const inline = toolKind === "text" && isInline(toolOwner) && toolOwner.hasAttribute("data-editor-editable");
  const selected = markdown && richRange && !richRange.collapsed && toolOwner.contains(richRange.commonAncestorContainer);
  for (const button of formatButtons) button.hidden = !(inline || (selected && !Object.hasOwn(extensions.inlineCodec.marks||{},button.dataset.command)));
  const visible = formatButtons.filter((button) => !button.hidden);
  for (const button of formatButtons) button.classList.toggle("fmt-last", button === visible.at(-1));
  if (visible.length) updateFormatState();
  confirmButton.hidden = !(toolKind === "text" && toolOwner.hasAttribute("data-editor-machine"));
  const r = toolOwner.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) {
    toolbar.style.visibility = "hidden";
    return;
  }
  toolbar.style.visibility = "";
  const width = toolbar.offsetWidth,
    height = toolbar.offsetHeight;
  toolbar.style.left = Math.max(8, Math.min(innerWidth - width - 8, r.right - width)) + "px";
  toolbar.style.top = (r.top - height - 8 < 8 ? Math.min(innerHeight - height - 8, r.bottom + 8) : r.top - height - 8) + "px";
}
// Moving entries on the page: drag the grip, or arrow keys on it. The live nodes move (animations keep
// running), field paths are renumbered at once, and the shell writes the new order to the draft.
// Before entries move: text still being typed is saved under its old path, and every sibling
// remembers where it came from (a server render arriving later maps live nodes by that origin).
function beginMove(node) {
  const active = document.activeElement;
  if (active && bindings.has(active) && node.parentElement.contains(active)) {
    stage(active);
    active.blur();
  }
  if (!membershipOf(node)) return; // ordered records keep their identity; nothing is renumbered
  for (const sibling of listSiblings(node))
    if (sibling.dataset.editorOrigin === undefined) sibling.dataset.editorOrigin = String(membershipOf(sibling).path.at(-1));
}
// Siblings that change place glide there (FLIP); the dragged entry itself follows the pointer.
const motionOK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
function flip(nodes, mutate, skip) {
  if (!motionOK()) return mutate();
  const before = new Map(nodes.map((n) => [n, n.getBoundingClientRect()]));
  mutate();
  for (const [n, r] of before) {
    if (n === skip) continue;
    const a = n.getBoundingClientRect();
    const dx = r.left - a.left,
      dy = r.top - a.top;
    if (dx || dy) n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 180, easing: "cubic-bezier(.2,.7,.3,1)" });
  }
}
const settling = (n) => n.getAnimations().some((a) => a.playState === "running");
function moveEntry(node, from, to) {
  if (from === to) return;
  const membership = membershipOf(node);
  if (!membership) {
    send("reorder-records", { ids: listSiblings(node).map(renderedId), field: orderedList(node.parentElement)?.field });
    refreshToolbar();
    return;
  }
  const siblings = listSiblings(node);
  siblings.forEach((sibling, index) => renumberEntry(sibling, membership, index));
  bind();
  send("reorder", { id: entryInfo(node).id, path: afe.editorPath(membership).slice(0, -1), from, to });
  refreshToolbar();
}
// After paths change (move, re-render), the toolbar acts on the element's current path.
function refreshToolbar() {
  if (toolbar.hidden || !toolOwner?.isConnected) return hideToolbar();
  if (toolKind === "entry") showToolbar(toolOwner, "entry", { ...entryInfo(toolOwner), section: sectionInfo(toolOwner) });
  else if (toolKind === "text" || toolKind === "derived") {
    const c = bindings.get(toolOwner) || context(toolOwner, toolKind === "derived");
    if (c) showToolbar(toolOwner, toolKind, c);
  } else placeToolbar();
}
gripButton.addEventListener("keydown", (event) => {
  const node = toolEntry();
  if (!node || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const siblings = listSiblings(node),
    from = siblings.indexOf(node),
    to = from + (event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1);
  if (to < 0 || to >= siblings.length) return;
  beginMove(node);
  flip(siblings, () => (to < from ? siblings[to].before(node) : siblings[to].after(node)));
  moveEntry(node, from, to);
});
gripButton.addEventListener("pointerdown", (event) => {
  const node = toolEntry();
  if (!node || event.button !== 0) return;
  event.preventDefault();
  gripButton.setPointerCapture(event.pointerId);
  beginMove(node);
  const from = listSiblings(node).indexOf(node);
  node.classList.add("native-dragging");
  dragging = true;
  const move = (e) => {
    // Entries still gliding to their new place are not targets yet (no back-and-forth while they move).
    const others = listSiblings(node).filter((n) => n !== node && !settling(n));
    let best = null,
      distance = Infinity;
    for (const other of others) {
      const r = other.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d < distance) (distance = d), (best = other);
    }
    const own = node.getBoundingClientRect();
    if (best && distance < Math.hypot(e.clientX - (own.left + own.width / 2), e.clientY - (own.top + own.height / 2))) {
      const siblings = listSiblings(node);
      flip(siblings, () => (siblings.indexOf(best) < siblings.indexOf(node) ? best.before(node) : best.after(node)), node);
    }
    placeToolbar();
  };
  const end = () => {
    gripButton.removeEventListener("pointermove", move);
    gripButton.removeEventListener("pointerup", end);
    gripButton.removeEventListener("pointercancel", end);
    node.classList.remove("native-dragging");
    dragging = false;
    if (node.isConnected) moveEntry(node, from, listSiblings(node).indexOf(node));
    if (deferredPreview) {
      const pending = deferredPreview;
      deferredPreview = null;
      applyPreview(pending);
    }
  };
  gripButton.addEventListener("pointermove", move);
  gripButton.addEventListener("pointerup", end);
  gripButton.addEventListener("pointercancel", end);
});
window.addEventListener("scroll", placeToolbar, { passive: true });
window.addEventListener("resize", placeToolbar);
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (toolOwner && selection?.rangeCount && toolOwner.contains(selection.anchorNode)) richRange = selection.getRangeAt(0).cloneRange();
  else richRange = null;
  if (toolKind === "text") placeToolbar();
});
style.textContent +=
  ' .native-toolbar{position:fixed;z-index:99999;display:flex;align-items:center;gap:2px;border:1px solid var(--ui-line);border-radius:10px;background:var(--ui-surface);padding:3px;box-shadow:0 12px 32px var(--ui-shadow-small),0 1px 3px var(--ui-shadow-low);font:500 12px/1 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:normal;text-transform:none}.native-toolbar button{display:grid;place-items:center;width:30px;height:30px;border:0;background:transparent;border-radius:7px;color:var(--ui-ink);cursor:pointer;font:inherit}.native-toolbar button:hover{background:var(--ui-hover)}.native-toolbar button:disabled{opacity:.35;cursor:not-allowed;background:transparent}.native-toolbar button:focus-visible{outline:2px solid var(--ui-accent);outline-offset:1px}.native-toolbar svg{width:16px;height:16px;stroke-width:2}.native-toolbar .grip{cursor:grab;touch-action:none;color:var(--ui-muted)}.native-toolbar .grip:active{cursor:grabbing}.native-toolbar .lang svg{width:20px;height:15px;border-radius:2px;box-shadow:0 0 0 1px var(--ui-shadow-popover)}.native-variant{display:flex;gap:2px;padding:0 4px;margin:0 2px;border-left:1px solid var(--ui-line);border-right:1px solid var(--ui-line)}.native-variant button{width:auto;padding:0 8px;color:var(--ui-ink)}.native-variant button[aria-pressed=true]{background:var(--ui-tint);color:var(--ui-accent-ink);box-shadow:inset 0 0 0 1px var(--ui-accent)}.native-toolbar .fmt[aria-pressed=true]{background:var(--ui-tint);color:var(--ui-accent-ink)}.native-toolbar .confirm{color:var(--ui-warning);background:var(--ui-warning-tint)}.native-toolbar .confirm:hover{background:var(--ui-warning-hover)}.native-toolbar .fmt-last{margin-right:5px;position:relative}.native-toolbar .fmt-last::after{content:"";position:absolute;right:-4px;top:7px;bottom:7px;width:1px;background:var(--ui-line)}.native-toolbar [hidden],.native-toolbar[hidden],.native-editor-preview .native-toolbar{display:none!important}html.native-language-draft:not(.native-editor-preview) [data-editor-untranslated]{outline:1px dashed var(--ui-frame-untranslated);outline-offset:4px}html.native-language-draft:not(.native-editor-preview) [data-editor-machine]{outline:1px dashed var(--ui-machine);outline-offset:4px}.native-dragging{outline:2px solid var(--ui-frame-accent)!important;outline-offset:2px;opacity:.9;transition:none!important}html:not(.native-editor-preview) .native-entry-selected{outline:2px solid var(--ui-frame-accent)!important;outline-offset:-2px}';

function safeMarkdown(source) {
  const holder = document.createElement("template");
  holder.innerHTML = marked.parse(source);
  for (const element of holder.content.querySelectorAll("*")) {
    if (
      [
        "SCRIPT",
        "STYLE",
        "IFRAME",
        "OBJECT",
        "EMBED",
        "FORM",
        "INPUT",
        "BUTTON",
        "SVG",
        "MATH",
        "LINK",
        "META",
      ].includes(element.tagName)
    ) {
      element.remove();
      continue;
    }
    for (const attr of [...element.attributes]) {
      if (attr.name.startsWith("on") || ["srcdoc", "style"].includes(attr.name)) element.removeAttribute(attr.name);
      else if (
        ["href", "src", "xlink:href"].includes(attr.name) &&
        !/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:|\.\.?\/)/i.test(attr.value)
      )
        element.removeAttribute(attr.name);
    }
  }
  return holder.innerHTML;
}

function initialMediaSource(id, path) {
  return sourceMediaMap[id + "/" + JSON.stringify(path)] || null;
}

function inheritMediaBaselines(source, copy) {
  const originals = [...source.querySelectorAll("img")],
    copies = [...copy.querySelectorAll("img")];
  for (const [index, img] of originals.entries()) {
    const baseline = mediaBaselines.get(img),
      target = copies[index];
    if (!baseline || !target) continue;
    const sources = [...(target.closest("picture")?.querySelectorAll("source") || [])];
    mediaBaselines.set(target, {
      ...baseline,
      sources: baseline.sources
        .map((entry, i) => ({ srcset: entry.srcset, node: sources[i] }))
        .filter((entry) => entry.node),
    });
  }
}

function uniqueCloneIds(copy) {
  const prefix = "-editor-copy-" + ++cloneSequence,
    ids = new Map(),
    nodes = [copy, ...copy.querySelectorAll("*")];
  for (const node of nodes)
    if (node.id) {
      const old = node.id,
        next = old + prefix;
      ids.set(old, next);
      node.id = next;
    }
  for (const node of nodes)
    for (const name of [
      "aria-labelledby",
      "aria-describedby",
      "aria-controls",
      "aria-owns",
      "aria-activedescendant",
      "for",
      "href",
    ])
      if (node.hasAttribute(name)) {
        const value = node.getAttribute(name);
        node.setAttribute(
          name,
          remappedReference(value, ids, { tokens: name.startsWith("aria-") && name !== "aria-activedescendant" }),
        );
      }
}

style.textContent +=
  " .native-copy-pending canvas{display:none!important}.native-runtime-note{display:block;margin:0 0 20px;padding:10px 14px;border:1px dashed var(--ui-frame-accent);border-radius:7px;background:var(--ui-tint);color:var(--ui-accent-ink);font:500 14px/1.5 system-ui,sans-serif}";

// ---------------------------------------------------------------------------
// Live preview: the shell sends server renders of the draft; the first one is the baseline.
// ---------------------------------------------------------------------------
// Each live region remembers the server render it currently shows. A moved section keeps its node,
// so comparisons ignore its position in the block list (part of every address below it) and occurrence names.
const serverOf = new WeakMap();
let hasBaseline = false,
  deferredPreview = null,
  previewGeneration = 0;
const normalized = (node) => afe.positionless(node.outerHTML, afe.blockLists(document));
let dragging = false;
function applyPreview({ html, baseline }) {
  if (dragging && !baseline) {
    deferredPreview = { html, seq: previewGeneration };
    return;
  }
  previewGeneration++;
  const doc = new DOMParser().parseFromString(html, "text/html");
  stampBlockTypes(doc);
  const next = regions(doc);
  const live = regions(document);
  if (baseline || !hasBaseline) {
    for (const [key, node] of next) if (live.get(key)) serverOf.set(live.get(key), node);
    hasBaseline = true;
    return;
  }
  let applied = 0,
    deferred = false;
  for (const [key, node] of next) {
    const current = live.get(key);
    if (!current) continue;
    const before = serverOf.get(current);
    const pending = current.matches(".native-pending-section,.native-copy-pending");
    if (before && !pending && normalized(before) === normalized(node)) {
      serverOf.set(current, node);
      continue;
    }
    if (before && !pending && isRuntime(current) && reorderEntries(current, before, node)) {
      serverOf.set(current, node);
      applied++;
      continue;
    }
    // Same structure: patch in place (the field being typed into is left alone), for every region.
    if (before && !pending && sameStructure(before, node)) {
      const report = patchInPlace(current, before, node);
      if (!report.unsafe) {
        serverOf.set(current, node);
        if (report.changed) applied++;
        continue;
      }
    }
    // A region that must be replaced waits while someone types in it.
    if (current.contains(document.activeElement) && document.activeElement !== document.body) {
      deferred = true;
      continue;
    }
    const fresh = document.importNode(node, true);
    keepDisclosureState(current, fresh);
    if (isRuntime(fresh)) prepareClonedSection(fresh, { livePreview: true });
    current.replaceWith(fresh);
    serverOf.set(fresh, node);
    applied++;
  }
  deferredPreview = deferred ? { html, seq: ++previewGeneration } : null;
  // The live page now matches the draft order; origins of earlier moves are no longer needed.
  if (!deferred) for (const node of document.querySelectorAll("[data-editor-origin]")) delete node.dataset.editorOrigin;
  if (applied) {
    bind();
    applyPresentation();
    send("preview-applied");
    if (languageLocale !== sourceLocale) translationOverlay({ locale: languageLocale, values: languageValues });
    refreshToolbar();
  }
}
document.addEventListener("focusout", () => {
  if (!deferredPreview) return;
  const pending = deferredPreview;
  deferredPreview = null;
  setTimeout(() => {
    if (pending.seq === previewGeneration) applyPreview(pending);
  }, 0);
});

function keepDisclosureState(from, to) {
  const key = (node, index) => {
    const item = afe.closestMarker(node, afe.isItem)?.marker;
    return item ? JSON.stringify([item.rendered, item.membership?.path ?? null]) : String(index);
  };
  const open = new Set([...from.querySelectorAll("details")].map((node, index) => node.open && key(node, index)).filter(Boolean));
  [...to.querySelectorAll("details")].forEach((node, index) => (node.open = open.has(key(node, index))));
}
// Cards of an animated section that only changed order move as live nodes,
// so their running canvases move with them. Field paths inside are renumbered.
function entryKey(node) {
  const item = afe.markerOf(node, afe.isItem);
  if (item && !item.membership) return JSON.stringify(item.rendered);
  const membership = membershipOf(node);
  return afe.positionless(node.outerHTML, [...afe.blockLists(document), ...(membership ? [membership.path.slice(0, -1)] : [])]);
}
function topEntries(root) {
  const entries = [...new Set(afe.allMarked(root, afe.isMembership).map(({ node }) => node))].filter((node) => node !== root);
  return entries.filter((node) => {
    const up = afe.closestMarker(node.parentElement, afe.isMembership)?.node;
    return !up || up === root;
  });
}
function reorderEntries(live, before, after) {
  const was = topEntries(before),
    now = topEntries(after),
    current = topEntries(live);
  if (!was.length || was.length !== now.length || current.length !== was.length) return false;
  const wasKeys = was.map(entryKey),
    nowKeys = now.map(entryKey);
  if (wasKeys.join("\n") === nowKeys.join("\n") || [...wasKeys].sort().join("\n") !== [...nowKeys].sort().join("\n")) return false;
  if (new Set(wasKeys).size !== wasKeys.length) return false;
  const parent = current[0].parentElement;
  if (current.some((node) => node.parentElement !== parent)) return false;
  // A live entry may already sit at its new place (dragged on the page); map it by where it came from.
  const byKey = new Map(current.map((node, i) => [wasKeys[Number(node.dataset.editorOrigin ?? i)], node]));
  const anchor = current.at(-1).nextSibling;
  nowKeys.forEach((key, index) => {
    const node = byKey.get(key);
    parent.insertBefore(node, anchor);
    const membership = membershipOf(node);
    if (membership) renumberEntry(node, membership, index);
    delete node.dataset.editorOrigin;
  });
  return true;
}
// An entry now at index of its list: its membership and every address of that entry below it follow.
function renumberEntry(node, membership, index) {
  afe.renumber(node, membership.owner, membership.path.slice(0, -1), index);
  for (const bound of node.querySelectorAll("[data-editor-bound]")) bound.removeAttribute("data-editor-bound");
}
