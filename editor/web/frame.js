import { prepareClonedSection } from "./prepare-cloned-section.mjs";
import { LiveNodeHistory, remappedReference } from "./live-node-history.mjs";
import { mediaSourceChanged, instanceMarkers, sameOccurrence } from "./view-state.mjs";
import { marked } from "/editor/marked.mjs";
import { ui } from "./ui-icons.mjs";
import { fieldLabel, choiceLabel } from "./field-labels.mjs";
import { regions, isRuntime, sameStructure, patchInPlace } from "./preview-apply.mjs";
import { domTree, markdownSupported, markdownText } from "./inline-markdown.mjs";
import { inlineText, inlineSupported } from "./inline-format.mjs";
import { inlineHtml } from "/editor/site-lib/inline-text.mjs";
// Editor-only enhancement. The public page keeps its native scripts and canvas controls.
let sourceMediaMap = {};
let records = [],
  preview = false,
  busy = false,
  outlines = false,
  selected = null,
  languageLocale = "de",
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
    { source: "flyingstars-frame", type, frameURL: location.pathname + location.search, ...data },
    location.origin,
  );
const readPath = (data, path) => path.reduce((value, key) => value?.[key], data);
function parse(value) {
  try {
    const result = JSON.parse(value);
    return Array.isArray(result) ? result : null;
  } catch {
    return null;
  }
}
function context(node, derived = false) {
  const owner = node.closest("[data-native-record]");
  if (!owner) return null;
  const path = parse(derived ? node.dataset.nativeDerived : node.dataset.nativePath);
  if (!path) return null;
  const section = node.closest("[data-native-section-index]");
  const sectionOwned =
    section &&
    owner.dataset.nativeRecord.startsWith("page/") &&
    section.dataset.nativeRecord === owner.dataset.nativeRecord;
  const fullPath =
    sectionOwned && path[0] !== "sections" ? ["sections", Number(section.dataset.nativeSectionIndex), ...path] : path;
  const item = records.find((item) => item.id === owner.dataset.nativeRecord);
  const field = item?.fields.find((field) => equal(field.path, fullPath));
  return item && field ? { id: item.id, path: fullPath, field, item, node, derived } : null;
}
function currentValue(c) {
  return readPath(c.item.data, c.path);
}
function sectionInfo(node) {
  const section = node.closest("[data-native-section-index]");
  return section ? { id: section.dataset.nativeRecord, index: Number(section.dataset.nativeSectionIndex) } : null;
}
// The card/list entry around an element, stamped by the Astro components as data-native-entry.
function entryInfo(node) {
  const wrapper = node.closest("[data-native-entry]");
  const path = wrapper && parse(wrapper.dataset.nativeEntry);
  if (!path) return null;
  const id = wrapper.dataset.nativeEntryRecord || sectionInfo(wrapper)?.id || wrapper.closest("[data-native-record]")?.dataset.nativeRecord;
  const record = wrapper.dataset.nativeRecord && wrapper.dataset.nativeRecord !== id ? wrapper.dataset.nativeRecord : null;
  return id ? { id, path, record } : null;
}
// Everything the shell needs to open the right object: the field, its record, its card and its section.
function target(c) {
  return { id: c.id, path: c.path, derived: c.derived, section: sectionInfo(c.node), entry: entryInfo(c.node) };
}
// ---------------------------------------------------------------------------
// Occurrences: every card/list wrapper is stamped data-native-item. The outermost one around a node is the
// instance the person means ("this card"); nested wrappers (a selected Leistung, a fact) are parts of it.
// ---------------------------------------------------------------------------
function itemIdentity(wrapper) {
  const path = wrapper.dataset.nativeEntry ? parse(wrapper.dataset.nativeEntry) : null;
  const owner = path && (wrapper.dataset.nativeEntryRecord || sectionInfo(wrapper)?.id || wrapper.closest("[data-native-record]")?.dataset.nativeRecord);
  const record = wrapper.dataset.nativeRecord || null;
  return { section: sectionInfo(wrapper), entry: path && owner ? { id: owner, path } : null, record: path ? (record && record !== owner ? record : null) : record };
}
function occurrenceOf(node) {
  let outer = null;
  for (let n = node?.closest?.("[data-native-item]"); n; n = n.parentElement?.closest("[data-native-item]")) outer = n;
  if (!outer) return null;
  const identity = itemIdentity(outer);
  const id = identity.entry?.id || identity.record;
  const item = records.find((r) => r.id === id);
  if (!item || (identity.entry && readPath(item.data, identity.entry.path) === undefined)) return null;
  return { node: outer, identity, id, path: identity.entry?.path || [], record: identity.entry ? identity.record : null };
}
// Everything one occurrence renders: field, derived, media and render-dependency markers of all its wrappers
// (an entry may be drawn twice), as {id, path, kind}; parts of nested entries stand for those entries.
function occurrenceMarkers(identity) {
  const owner = identity.entry?.id || identity.record,
    raw = [];
  const wrappers = [...document.querySelectorAll("[data-native-item]")].filter((n) => !n.parentElement?.closest("[data-native-item]") && sameOccurrence(itemIdentity(n), identity));
  for (const wrapper of wrappers)
    for (const node of [wrapper, ...wrapper.querySelectorAll("[data-native-path],[data-native-derived],[data-native-media-path],[data-native-uses],[data-native-item]")]) {
      const nested = node === wrapper ? null : node.closest("[data-native-item]");
      const via = nested && nested !== wrapper ? itemIdentity(nested).entry : null;
      for (const derived of [false, true]) {
        if (!node.hasAttribute(derived ? "data-native-derived" : "data-native-path")) continue;
        const c = context(node, derived);
        if (c) raw.push({ id: c.id, path: c.path, kind: derived ? "derived" : "field", via });
      }
      const mediaPath = node.dataset.nativeMediaPath && parse(node.dataset.nativeMediaPath),
        mediaOwner = mediaPath && node.closest("[data-native-record]");
      if (mediaOwner) raw.push({ id: mediaOwner.dataset.nativeRecord, path: mediaPath, kind: "media", via });
      if (node.dataset.nativeUses)
        try {
          for (const [id, path] of JSON.parse(node.dataset.nativeUses)) raw.push({ id, path, kind: "uses", via });
        } catch {}
      if (nested === node) {
        const entry = itemIdentity(node).entry;
        if (entry) raw.push({ id: entry.id, path: entry.path, kind: "entry", via: null });
      }
    }
  return instanceMarkers(raw, owner);
}
// One inspection for every way in (right-click, toolbar gear, ⇧F10, a click on a price): inside a card the
// card opens, with the clicked element first; elsewhere the element, list entry, record or section.
function inspection(node) {
  if (!node?.closest) return null;
  const media = node.closest("[data-native-media-path]");
  const mediaOwner = media?.closest("[data-native-record]"),
    mediaPath = media && parse(media.dataset.nativeMediaPath);
  const field = !mediaOwner && node.closest("[data-native-path],[data-native-derived]");
  const c = field && context(field, field.hasAttribute("data-native-derived"));
  const occurrence = occurrenceOf(node);
  if (occurrence) {
    let focus = mediaOwner && mediaPath ? { id: mediaOwner.dataset.nativeRecord, path: mediaPath, kind: "media" } : c ? { id: c.id, path: c.path, kind: c.derived ? "derived" : "field" } : null;
    // Inside a nested part of the card (a selected Leistung, a table cell, a fact) the part is what was meant,
    // also when the click hit its padding rather than its text.
    const nested = ((focus && (media || field)) || node).closest("[data-native-item]");
    const part = nested && nested !== occurrence.node && itemIdentity(nested).entry;
    if (part && part.id === occurrence.id) focus = { id: part.id, path: part.path, kind: "entry" };
    // A field of some other record embedded in the card keeps its own element panel.
    if (!focus || focus.id === occurrence.id || focus.id === occurrence.record)
      return {
        type: "inspect-instance",
        data: { id: occurrence.id, path: occurrence.path, record: occurrence.record, section: occurrence.identity.section, occurrence: occurrence.identity, focus, rect: rect(occurrence.node) },
      };
  }
  if (mediaOwner && mediaPath) return { type: "media", data: { id: mediaOwner.dataset.nativeRecord, path: mediaPath, section: sectionInfo(media), entry: entryInfo(media) } };
  if (c) return { type: "inspect", data: { ...target(c), rect: rect(c.node) } };
  const entry = entryInfo(node);
  if (entry) return { type: "inspect-entry", data: { ...entry, section: sectionInfo(node) } };
  const owner = node.closest("[data-native-record]");
  const ownerSection = node.closest("[data-native-section-index]");
  if (owner && owner !== ownerSection && !/^(page|screen)\//.test(owner.dataset.nativeRecord))
    return { type: "inspect-record", data: { id: owner.dataset.nativeRecord, section: sectionInfo(owner) } };
  if (ownerSection) return { type: "section", data: { id: ownerSection.dataset.nativeRecord, index: Number(ownerSection.dataset.nativeSectionIndex) } };
  return null;
}
function inspect(node, point) {
  const found = inspection(node);
  if (found) send(found.type, { ...found.data, ...(point ? { point } : {}) });
  return !!found;
}
// In a foreign-language view, text shows its translation (or the German original until translated).
function translatedValue(c) {
  return languageValues.find((value) => value.sourceId === c.id && equal(value.path, c.path))?.text;
}
function displayValue(c) {
  if (languageLocale === "de" || c.field.kind !== "text") return currentValue(c);
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
    rich: c.node.dataset.nativeMarkdown === "true" && c.node.hasAttribute("data-native-editable"),
    rect: rect(c.node),
    ...(opens?.type === "inspect-instance" ? { instance: opens.data } : {}),
  });
}
// Short texts with light formatting (data-native-inline): shown as HTML, stored as inline marks.
const isInline = (node) => node.dataset.nativeInline === "true";
const inlineTree = (node) => ({ tag: "div", children: domTree(node).children });
function showText(node, value) {
  if (node.dataset.nativeMarkdown === "true" && node.dataset.nativeRich === "true") node.innerHTML = safeMarkdown(value ?? "");
  else if (isInline(node)) node.innerHTML = inlineHtml(value ?? "");
  else node.textContent = value ?? "";
}
function read(c) {
  if (isInline(c.node)) {
    const result = inlineText(inlineTree(c.node)),
      initial = richBaselines.get(c.node);
    return result === initial?.markdown ? initial.source : result;
  }
  if (c.node.dataset.nativeMarkdown === "true") {
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
  if (languageLocale !== "de") {
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
window.flyingstarsEditorFrame = {
  flush,
  transient,
  freeze() {
    busy = true;
    mode();
  },
  // Records a section lists in the order of one of their fields (FAQ by `order`), as rendered.
  orderedRecords(id, index) {
    const section = [...document.querySelectorAll("[data-native-section-index]")].find(
      (n) => n.dataset.nativeRecord === id && Number(n.dataset.nativeSectionIndex) === index,
    );
    const container = section?.querySelector("[data-native-order-field]");
    if (!container) return null;
    return { field: container.dataset.nativeOrderField, ids: [...container.children].map((n) => n.dataset.nativeRecord).filter(Boolean) };
  },
  // The same order applied to the live page at once (also without live preview).
  orderRecords(id, index, ids) {
    const section = [...document.querySelectorAll("[data-native-section-index]")].find(
      (n) => n.dataset.nativeRecord === id && Number(n.dataset.nativeSectionIndex) === index,
    );
    const container = section?.querySelector("[data-native-order-field]");
    if (!container) return;
    const items = [...container.children].filter((n) => n.dataset.nativeRecord);
    flip(items, () => ids.forEach((recordId) => { const node = items.find((n) => n.dataset.nativeRecord === recordId); if (node) container.append(node); }));
  },
  // Text fields that are visible on this page (for "confirm all suggestions on this page").
  renderedFields() {
    return [...document.querySelectorAll("[data-native-editable]")].map((n) => bindings.get(n)).filter(Boolean).map((c) => ({ id: c.id, path: c.path }));
  },
  // What one occurrence (card) renders, read fresh from the live page each time the panel draws.
  occurrenceMarkers(identity) {
    return identity ? occurrenceMarkers(identity) : [];
  },
  // Records whose content is visible on this page (for "translate what is on this page").
  recordsOnPage() {
    return [...new Set([...document.querySelectorAll("[data-native-record]")].map((node) => node.dataset.nativeRecord))];
  },
  refocus() {
    if (selected?.node?.isConnected) selected.node.focus({ preventScroll: true });
  },
  visibleSection() {
    const middle = innerHeight / 2;
    let best = null,
      distance = Infinity;
    for (const node of document.querySelectorAll("[data-native-section-index]")) {
      const r = node.getBoundingClientRect();
      if (r.height < 1) continue;
      const d =
        r.top <= middle && r.bottom >= middle ? 0 : Math.min(Math.abs(r.top - middle), Math.abs(r.bottom - middle));
      if (d < distance) {
        distance = d;
        best = { id: node.dataset.nativeRecord, index: Number(node.dataset.nativeSectionIndex) };
      }
    }
    return best;
  },
};
const uiTokens = document.createElement("link");
uiTokens.rel = "stylesheet";
uiTokens.href = "/editor/ui-tokens.css";
document.head.append(uiTokens);
const style = document.createElement("style");
style.dataset.nativeEditor = "true";
style.textContent = `html:not(.native-editor-preview) [data-native-editable]{outline:2px solid transparent;outline-offset:4px;cursor:text;pointer-events:auto!important}html:not(.native-editor-preview) [data-native-editable]:hover{outline:1px solid var(--ui-frame-hover)}html:not(.native-editor-preview) [data-native-editable]:focus{outline:2px solid var(--ui-frame-accent);caret-color:var(--ui-frame-accent)}html.native-editor-outlines:not(.native-editor-preview) [data-native-editable],html.native-editor-outlines:not(.native-editor-preview) [data-native-derived]{outline:1px dashed var(--ui-frame-accent);outline-offset:4px}html:not(.native-editor-preview) [data-native-derived]:hover{outline:1px solid var(--ui-frame-hover);outline-offset:4px;cursor:pointer}html:not(.native-editor-preview) [data-native-derived]:focus-visible{outline:2px solid var(--ui-frame-accent);outline-offset:4px}html.native-editor-busy [data-native-editable]{cursor:wait}`;
document.head.append(style);
function mode() {
  if (preview || busy) hideToolbar();
  document.documentElement.classList.toggle("native-editor-preview", preview);
  document.documentElement.classList.toggle("native-editor-outlines", outlines);
  document.documentElement.classList.toggle("native-editor-busy", busy);
  for (const node of document.querySelectorAll("[data-native-editable]")) {
    const c = bindings.get(node);
    const locked = preview || busy || (languageLocale !== "de" && c?.field.kind !== "text");
    node.contentEditable = locked ? "false" : node.dataset.nativeMarkdown === "true" || isInline(node) ? "true" : "plaintext-only";
    if (preview) {
      node.removeAttribute("role");
      node.removeAttribute("tabindex");
    } else {
      node.setAttribute("role", "textbox");
      node.tabIndex = 0;
    }
  }
  for (const node of document.querySelectorAll("[data-native-derived]")) {
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
  for (const node of document.querySelectorAll("[data-native-path]")) {
    const c = context(node);
    if (!c) continue;
    bindings.set(node, c);
    const rich = node.dataset.nativeMarkdown === "true" && markdownSupported(domTree(node));
    const formatted = isInline(node) && inlineTree(node).children.every(inlineSupported);
    if (rich) node.dataset.nativeRich = "true";
    // A template such as "Schritt {current} von {total}" is shown filled in; it is edited in the panel, not in place.
    // Format marks such as {o}…{/o} in formatted short texts are not placeholders.
    const templated = !isInline(node) && typeof currentValue(c) === "string" && /\{\w+\}/.test(currentValue(c));
    const inline =
      !templated &&
      ["text", "number"].includes(c.field.kind) &&
      !["IMG", "VIDEO", "CANVAS", "INPUT", "TEXTAREA", "SELECT"].includes(node.tagName) &&
      (node.children.length === 0 || rich || formatted);
    if (!inline) continue;
    node.dataset.nativeEditable = "true";
    node.setAttribute("aria-label", (c.field.label || c.path.at(-1)) + " · " + c.item.title);
    node.spellcheck = c.field.kind === "text";
    if (document.activeElement !== node) showText(node, displayValue(c));
    if (node.dataset.nativeBound) continue;
    node.dataset.nativeBound = "true";
    node.addEventListener("focus", () => {
      const latest = context(node);
      bindings.set(node, latest);
      baselines.set(node, structuredClone(displayValue(latest)));
      if (rich) richBaselines.set(node, { markdown: markdownText(domTree(node)), source: displayValue(latest) });
      else if (isInline(node)) richBaselines.set(node, { markdown: inlineText(inlineTree(node)), source: displayValue(latest) });
      selection(latest);
    });
    if (rich || isInline(node))
      node.addEventListener("paste", (event) => {
        event.preventDefault();
        if (preview || busy) return;
        document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") || "");
      });
    node.addEventListener("input", () => {
      const binding = bindings.get(node);
      send(languageLocale === "de" ? "input" : "input-translation", { id: binding.id, path: binding.path, value: read(binding), locale: languageLocale });
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
  const inlineNodes = [...document.querySelectorAll("[data-native-editable]")];
  send("coverage", {
    inline: inlineNodes.length,
    derived: document.querySelectorAll("[data-native-derived]").length,
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
    control.matches("[data-native-path],[data-native-derived],[data-native-entry]") ||
    control.querySelector("[data-native-path],[data-native-derived]") ||
    control.closest("[data-native-path]")
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
    const media = event.target.closest("[data-native-media-path]");
    if (media && event.target.closest("img")) {
      const owner = media.closest("[data-native-record]"),
        path = parse(media.dataset.nativeMediaPath);
      if (owner && path) {
        event.preventDefault();
        selected = null;
        selectedMedia = event.target.closest("img");
        showToolbar(selectedMedia, "media", { id: owner.dataset.nativeRecord, path, section: sectionInfo(media), entry: entryInfo(media) });
        send("select-media", { id: owner.dataset.nativeRecord, path, section: sectionInfo(media) });
        return;
      }
    }
    const derived = event.target.closest("[data-native-derived]");
    if (derived) {
      const c = context(derived, true);
      if (c) {
        event.preventDefault();
        event.stopPropagation();
        selection(c);
      }
      return;
    }
    const node = event.target.closest("[data-native-path]");
    const entryNode = !node && event.target.closest("[data-native-entry]");
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
        if (node.hasAttribute("data-native-editable")) {
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
  if (!preview && !busy && ["Enter", " "].includes(event.key) && event.target.matches("[data-native-derived]")) {
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
  if (event.source !== parent || event.origin !== location.origin || event.data?.source !== "flyingstars-editor")
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
    const node = [...document.querySelectorAll("[data-native-editable]")].find((n) => {
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
  attributeFilter: ["data-native-record"],
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
    configurator: window.flyingstarsConfigurator?.snapshot(),
    inputs: [...document.querySelectorAll("input[id],textarea[id],select[id],input[name]")]
      .filter((node) => node.type !== "password" && node.type !== "file" && !node.closest("[data-native-editor]"))
      .map((node) => ({ id: node.id, name: node.name, type: node.type, value: node.value, checked: node.checked })),
    scroll: window.scrollY,
  };
}
async function restoreTransient(value) {
  if (value?.configurator && window.flyingstarsConfigurator?.restore)
    await window.flyingstarsConfigurator.restore(value.configurator);
  for (const field of value?.inputs || []) {
    const node = field.id
      ? document.getElementById(field.id)
      : [...document.querySelectorAll("input[name]")].find((n) => n.name === field.name && n.value === field.value);
    if (!node || node.type !== field.type || (value?.configurator && node.closest("#cfg"))) continue;
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
function remapSection(node, index, id) {
  node.dataset.nativeSectionIndex = String(index);
  node.dataset.nativeRecord = id;
  for (const target of node.querySelectorAll("[data-native-path],[data-native-media-path],[data-native-entry]"))
    for (const key of ["nativePath", "nativeMediaPath", "nativeEntry"])
      if (target.dataset[key]) {
        const path = parse(target.dataset[key]);
        if (path?.[0] === "sections") {
          path[1] = index;
          target.dataset[key] = JSON.stringify(path);
        }
      }
}
function structure(data) {
  const nodes = [...document.querySelectorAll("[data-native-section-index]")].filter(
      (node) => node.dataset.nativeRecord === data.id,
    ),
    target = nodes.find((node) => Number(node.dataset.nativeSectionIndex) === data.index);
  liveNodeHistory.capture(data.id, nodes);
  if (data.action === "remove") target?.remove();
  else if (data.action === "duplicate" && target) {
    const copy = target.cloneNode(true);
    uniqueCloneIds(copy);
    prepareClonedSection(copy, { livePreview: hasBaseline });
    inheritMediaBaselines(target, copy);
    for (const bound of copy.querySelectorAll("[data-native-bound]")) delete bound.dataset.nativeBound;
    target.after(copy);
  } else if (data.action === "up" && target) {
    const previous = nodes[nodes.indexOf(target) - 1];
    previous?.before(target);
  } else if (data.action === "down" && target) {
    const next = nodes[nodes.indexOf(target) + 1];
    next?.after(target);
  } else if (data.action === "insert") {
    const section = data.sections[data.index],
      source = nodes.find((node) => node.dataset.nativeSectionType === section.type);
    let copy = source?.cloneNode(true);
    if (copy) {
      uniqueCloneIds(copy);
      prepareClonedSection(copy, { livePreview: hasBaseline });
      inheritMediaBaselines(source, copy);
      for (const bound of copy.querySelectorAll("[data-native-bound]")) delete bound.dataset.nativeBound;
    } else {
      copy = document.createElement("section");
      copy.className = "native-pending-section";
      copy.innerHTML = "<h2></h2><p>Neuer Abschnitt. Er erscheint nach dem Speichern mit seinem Inhalt.</p>";
      copy.querySelector("h2").textContent = data.template?.title || section.headline || section.type;
      copy.dataset.nativeSectionType = section.type;
    }
    copy.dataset.nativeRecord = data.id;
    copy.dataset.nativeSectionIndex = String(data.index);
    if (target) target.before(copy);
    else if (nodes.length) nodes.at(-1).after(copy);
    else {
      const anchor = [...document.querySelectorAll("[data-native-section-list]")].find(
        (node) => node.dataset.nativeSectionList === data.id,
      );
      anchor?.after(copy);
    }
  }
  for (const [index, node] of [...document.querySelectorAll("[data-native-section-index]")]
    .filter((node) => node.dataset.nativeRecord === data.id)
    .entries())
    remapSection(node, index, data.id);
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
  const node = [...document.querySelectorAll("[data-native-section-index]")].find(
    (n) => n.dataset.nativeRecord === data.id && Number(n.dataset.nativeSectionIndex) === resulting,
  );
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
  languageLocale = data.locale || "de";
  languageValues = data.values || [];
  document.documentElement.dataset.editorLocale = languageLocale;
  for (const node of document.querySelectorAll("[data-native-path]")) {
    const c = context(node);
    if (!c || c.field.kind !== "text") continue;
    const translated = data.values?.find((value) => value.sourceId === c.id && equal(value.path, c.path));
    if (node.matches("input,textarea") && node.hasAttribute("placeholder")) node.placeholder = translated?.text ?? currentValue(c) ?? "";
    else if (node.matches("option")) node.textContent = translated?.text ?? currentValue(c) ?? "";
    if (node.hasAttribute("data-native-editable") && document.activeElement !== node) {
      const value = translated?.text ?? currentValue(c) ?? "";
      if (node.dataset.nativeMarkdown === "true") node.innerHTML = safeMarkdown(value);
      else if (isInline(node)) node.innerHTML = inlineHtml(value);
      else node.textContent = value;
    }
    // Addresses, numbers and links are data, not text to translate.
    const german = currentValue(c);
    const dataLike = typeof german !== "string" || !/\p{L}{2}/u.test(german) || /^(https?:|mailto:|tel:|\/|#)|^[\w.+-]+@[\w-]+\.[\w.]+$/.test(german.trim());
    node.toggleAttribute("data-native-untranslated", languageLocale !== "de" && !translated && !dataLike);
    node.toggleAttribute("data-native-machine", languageLocale !== "de" && !!translated && !translated.reviewed);
  }
  document.documentElement.classList.toggle("native-language-draft", languageLocale !== "de");
  mode();
}
style.textContent +=
  " .native-pending-section{margin:32px auto;padding:44px;width:min(90%,1100px);border:2px dashed var(--ui-frame-accent);border-radius:14px;color:inherit;background:var(--ui-frame-tint)}.native-pending-section h2{font:600 28px/1.3 system-ui}.native-pending-section p{font:16px/1.6 system-ui}";

function restoreStructure(items, id) {
  const previous = liveNodeHistory.restore(id);
  if (!previous) return;
  const anchor = [...document.querySelectorAll("[data-native-section-list]")].find(
    (node) => node.dataset.nativeSectionList === id,
  );
  if (!anchor) return;
  const keep = new Set(previous),
    current = [...document.querySelectorAll("[data-native-section-index]")].filter(
      (node) => node.dataset.nativeRecord === id,
    );
  for (const node of current) if (!keep.has(node)) node.remove();
  let at = anchor;
  for (const [index, node] of previous.entries()) {
    at.after(node);
    remapSection(node, index, id);
    at = node;
  }
  selected = null;
  bind();
  applyPresentation();
  if (languageLocale !== "de") translationOverlay({ locale: languageLocale, values: languageValues });
}

// Translation is offered in the context panel ("Übersetzen"), not as a floating button per text.

function applyPresentation() {
  // Colour fields feed CSS variables (marked with nativeColor): a picked colour shows at once.
  for (const node of document.querySelectorAll("[data-native-color]")) {
    let spec;
    try {
      spec = JSON.parse(node.dataset.nativeColor);
    } catch {
      continue;
    }
    const id = readPath(records.find((r) => r.id === spec.record)?.data, spec.path);
    if (typeof id === "string" && /^[a-z0-9-]+$/.test(id)) node.style.setProperty(spec.var, `var(--c-${id})`);
  }
  for (const node of document.querySelectorAll("[data-native-section-index]")) {
    const owner = records.find((r) => r.id === node.dataset.nativeRecord),
      section = owner?.data.sections?.[Number(node.dataset.nativeSectionIndex)];
    if (!section) continue;
    if (section.columns) {
      const grid = node.querySelector(".packs,.crew,.testimonials");
      if (grid) {
        grid.style.removeProperty("grid-template-columns");
        const base = grid.classList.contains("packs")
            ? "packs"
            : grid.classList.contains("crew")
              ? "crew"
              : "testimonials",
          variants = base === "packs" ? ["one", "two"] : base === "crew" ? ["one", "two", "three"] : ["one"];
        for (const variant of variants) grid.classList.toggle(base + "--" + variant, section.columns === variant);
      }
    }
    if (section.type === "testimonials") {
      const grid = node.querySelector(".testimonials");
      grid?.classList.toggle("testimonials--plain", section.background === false);
    }
    if (section.showImages !== undefined) {
      for (const img of node.querySelectorAll("img")) img.hidden = !section.showImages;
      if (section.type === "team")
        for (const portrait of node.querySelectorAll(".portrait")) portrait.hidden = !section.showImages;
    }
    if (section.type === "pricing")
      for (const [index, card] of [...node.querySelectorAll(".pack")].entries()) {
        const canvas = card.querySelector("canvas");
        if (canvas)
          canvas.hidden = node.classList.contains("native-copy-pending") || section.tiers?.[index]?.showOrb === false;
        // Immediate feedback; the server render confirms it a moment later.
        // The recommendation belongs to the package (shown wherever it appears), not to this card.
        const pack = section.tiers?.[index] && records.find((r) => r.id === "package/" + section.tiers[index].packageId);
        if (pack) card.classList.toggle("featured", !!pack.data.highlight);
      }
    if (section.type === "textMedia") {
      const image = node.querySelector("figure,img");
      if (image) image.hidden = section.showImage === false;
      const grid = node.querySelector(".wrap");
      if (grid) {
        grid.classList.toggle("grid-2", section.showImage !== false && !!section.image);
        grid.classList.toggle("grid-2--media-left", section.showImage !== false && section.mediaSide === "left");
      }
    }
  }
  for (const node of document.querySelectorAll("[data-native-media-path]")) {
    const owner = node.closest("[data-native-record]"),
      item = records.find((r) => r.id === owner?.dataset.nativeRecord),
      path = parse(node.dataset.nativeMediaPath),
      usage = path && readPath(item?.data, path);
    if (!usage) continue;
    const asset =
        usage.assetId && records.find((r) => r.id === usage.assetId || r.id === "media/" + usage.assetId)?.data,
      media = asset
        ? {
            ...usage,
            src: asset.src,
            width: asset.width,
            height: asset.height,
            alt: usage.decorative ? "" : (usage.altOverride ?? asset.defaultAlt ?? ""),
          }
        : usage;
    const img = node.matches("img") ? node : node.querySelector("img");
    if (img) {
      let baseline = mediaBaselines.get(img);
      if (!baseline) {
        const saved = initialMediaSource(owner?.dataset.nativeRecord, path) || media.src;
        baseline = {
          source: saved,
          src: img.getAttribute("src"),
          srcset: img.getAttribute("srcset"),
          width: img.getAttribute("width"),
          height: img.getAttribute("height"),
          sources: [...(img.closest("picture")?.querySelectorAll("source") || [])].map((node) => ({
            node,
            srcset: node.getAttribute("srcset"),
          })),
          replaced: false,
        };
        mediaBaselines.set(img, baseline);
      }
      if (mediaSourceChanged(baseline.source, media.src)) {
        if (!baseline.replaced || img.getAttribute("src") !== media.src) {
          for (const entry of baseline.sources) entry.node.removeAttribute("srcset");
          img.removeAttribute("srcset");
          img.src = media.src;
          if (media.width) img.width = media.width;
          if (media.height) img.height = media.height;
          baseline.replaced = true;
        }
      } else if (baseline.replaced) {
        for (const [name, newValue] of [
          ["src", baseline.src],
          ["srcset", baseline.srcset],
          ["width", baseline.width],
          ["height", baseline.height],
        ])
          if (newValue === null) img.removeAttribute(name);
          else img.setAttribute(name, newValue);
        for (const entry of baseline.sources)
          if (entry.srcset !== null) entry.node.setAttribute("srcset", entry.srcset);
        baseline.replaced = false;
      }
      img.alt = media.decorative ? "" : (media.altOverride ?? media.alt ?? "");
    }
  }
}

// One small toolbar for the selected element: formatting (only for a text selection), translate, options.
let toolOwner = null,
  toolKind = null,
  toolTarget = null,
  richRange = null;
const toolbar = document.createElement("div");
toolbar.dataset.nativeEditor = "toolbar";
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
  for (const span of root.querySelectorAll("span.t-outline, span.t-caps")) {
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
  for (const span of [...root.querySelectorAll("span.t-outline, span.t-caps")]) {
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
  if (command === "outline" || command === "caps") {
    // Splitting or unwrapping marks rebuilds the DOM; the same words stay selected, so a second click
    // acts on them again instead of on the whole field.
    const offsets = textOffsets(toolOwner, range);
    toggleMark(range, command === "outline" ? "t-outline" : "t-caps");
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
    outline: () => markActive(range, "t-outline"),
    caps: () => markActive(range, "t-caps"),
  };
  for (const button of formatButtons) {
    let on = false;
    try {
      on = states[button.dataset.command]?.() || false;
    } catch {}
    button.setAttribute("aria-pressed", String(on));
    // Text the layout already sets in capitals cannot be capitalised further (nor "un-capitalised" here);
    // an existing caps mark stays removable.
    if (button.dataset.command === "caps") {
      const layoutCaps = !on && getComputedStyle(toolOwner).textTransform === "uppercase";
      button.disabled = layoutCaps;
      button.title = layoutCaps ? "Dieser Text steht durch die Gestaltung bereits in Versalien." : button.getAttribute("aria-label");
    }
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
  ["type-outline", "Kontur (hohle Schrift)", "outline"],
  ["case-upper", "Versalien", "caps"],
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
// Records listed in the order of one of their fields (FAQ by `order`): direct children carrying their
// record inside a container marked data-native-order-field. Moving them rewrites that field.
const orderItem = (node) => node?.closest?.("[data-native-order-field] > [data-native-record]") || null;
// Ordered records follow their order values in the draft (Undo of a move, also without live preview).
function syncOrderedRecords() {
  if (dragging) return;
  for (const container of document.querySelectorAll("[data-native-order-field]")) {
    const field = container.dataset.nativeOrderField;
    const items = [...container.children].filter((n) => n.dataset.nativeRecord);
    const valueOf = (n) => Number(readPath(records.find((r) => r.id === n.dataset.nativeRecord)?.data, [field]));
    if (items.some((n) => !Number.isFinite(valueOf(n)))) continue;
    const sorted = [...items].sort((a, b) => valueOf(a) - valueOf(b));
    if (sorted.every((n, i) => n === items[i])) continue;
    flip(items, () => sorted.forEach((n) => container.append(n)));
  }
}
function toolEntry() {
  if (!toolOwner) return null;
  const node = toolKind === "entry" ? toolOwner : toolOwner.closest("[data-native-entry]");
  if (node && entryInfo(node)) return node;
  return orderItem(toolOwner);
}
function listSiblings(node) {
  if (!node.dataset.nativeEntry && orderItem(node) === node) return [...node.parentElement.children].filter((n) => n.dataset?.nativeRecord);
  const list = JSON.stringify(parse(node.dataset.nativeEntry).slice(0, -1));
  return [...node.parentElement.children].filter((n) => n.dataset?.nativeEntry && JSON.stringify(parse(n.dataset.nativeEntry).slice(0, -1)) === list);
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
    // Ratings look like the badge they produce on the page (Ja green, Nein red, Teilweise amber).
    if (field.path.at(-1) === "tone" && ["y", "n", "p"].includes(value)) chip.dataset.tone = value;
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
  const markdown = toolKind === "text" && toolOwner.dataset.nativeMarkdown === "true";
  const inline = toolKind === "text" && isInline(toolOwner) && toolOwner.hasAttribute("data-native-editable");
  const selected = markdown && richRange && !richRange.collapsed && toolOwner.contains(richRange.commonAncestorContainer);
  for (const button of formatButtons) button.hidden = !(inline || (selected && !["outline", "caps"].includes(button.dataset.command)));
  const visible = formatButtons.filter((button) => !button.hidden);
  for (const button of formatButtons) button.classList.toggle("fmt-last", button === visible.at(-1));
  if (visible.length) updateFormatState();
  confirmButton.hidden = !(toolKind === "text" && toolOwner.hasAttribute("data-native-machine"));
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
  if (!node.dataset.nativeEntry) return; // ordered records keep their identity; nothing is renumbered
  for (const sibling of listSiblings(node))
    if (sibling.dataset.nativeOrigin === undefined) sibling.dataset.nativeOrigin = String(parse(sibling.dataset.nativeEntry).at(-1));
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
  if (!node.dataset.nativeEntry) {
    const container = node.parentElement;
    send("reorder-records", { ids: listSiblings(node).map((n) => n.dataset.nativeRecord), field: container.dataset.nativeOrderField });
    refreshToolbar();
    return;
  }
  const siblings = listSiblings(node);
  const listPath = parse(node.dataset.nativeEntry).slice(0, -1);
  siblings.forEach((sibling, index) => renumberEntry(sibling, listPath, index));
  bind();
  send("reorder", { id: entryInfo(node).id, path: listPath, from, to });
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
  ' .native-toolbar{position:fixed;z-index:99999;display:flex;align-items:center;gap:2px;border:1px solid var(--ui-line);border-radius:10px;background:var(--ui-surface);padding:3px;box-shadow:0 12px 32px var(--ui-shadow-small),0 1px 3px var(--ui-shadow-low);font:500 12px/1 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:normal;text-transform:none}.native-toolbar button{display:grid;place-items:center;width:30px;height:30px;border:0;background:transparent;border-radius:7px;color:var(--ui-ink);cursor:pointer;font:inherit}.native-toolbar button:hover{background:var(--ui-hover)}.native-toolbar button:disabled{opacity:.35;cursor:not-allowed;background:transparent}.native-toolbar button:focus-visible{outline:2px solid var(--ui-accent);outline-offset:1px}.native-toolbar svg{width:16px;height:16px;stroke-width:2}.native-toolbar .grip{cursor:grab;touch-action:none;color:var(--ui-muted)}.native-toolbar .grip:active{cursor:grabbing}.native-toolbar .lang svg{width:20px;height:15px;border-radius:2px;box-shadow:0 0 0 1px var(--ui-shadow-popover)}.native-variant{display:flex;gap:2px;padding:0 4px;margin:0 2px;border-left:1px solid var(--ui-line);border-right:1px solid var(--ui-line)}.native-variant button{width:auto;padding:0 8px;color:var(--ui-ink)}.native-variant button[aria-pressed=true]{background:var(--ui-tint);color:var(--ui-accent-ink);box-shadow:inset 0 0 0 1px var(--ui-accent)}.native-toolbar .fmt[aria-pressed=true]{background:var(--ui-tint);color:var(--ui-accent-ink)}.native-variant button[data-tone]{font:500 10.5px/1 ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;height:24px;margin:3px 1px;border-radius:3px;box-shadow:inset 0 0 0 1px currentColor;opacity:.55}.native-variant button[data-tone=y]{color:var(--ui-success)}.native-variant button[data-tone=n]{color:var(--ui-danger)}.native-variant button[data-tone=p]{color:var(--ui-warning)}.native-variant button[data-tone][aria-pressed=true]{opacity:1;color:var(--ui-on-accent);box-shadow:none}.native-variant button[data-tone=y][aria-pressed=true]{background:var(--ui-success)}.native-variant button[data-tone=n][aria-pressed=true]{background:var(--ui-danger)}.native-variant button[data-tone=p][aria-pressed=true]{background:var(--ui-warning)}.native-toolbar .confirm{color:var(--ui-warning);background:var(--ui-warning-tint)}.native-toolbar .confirm:hover{background:var(--ui-warning-hover)}.native-toolbar .fmt-last{margin-right:5px;position:relative}.native-toolbar .fmt-last::after{content:"";position:absolute;right:-4px;top:7px;bottom:7px;width:1px;background:var(--ui-line)}.native-toolbar [hidden],.native-toolbar[hidden],.native-editor-preview .native-toolbar{display:none!important}html.native-language-draft:not(.native-editor-preview) [data-native-untranslated]{outline:1px dashed var(--ui-frame-untranslated);outline-offset:4px}html.native-language-draft:not(.native-editor-preview) [data-native-machine]{outline:1px dashed var(--ui-machine);outline-offset:4px}.native-dragging{outline:2px solid var(--ui-frame-accent)!important;outline-offset:2px;opacity:.9;transition:none!important}html:not(.native-editor-preview) .native-entry-selected{outline:2px solid var(--ui-frame-accent)!important;outline-offset:-2px}';

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
// so comparisons ignore the section index (it is part of attributes and field paths).
const serverOf = new WeakMap();
let hasBaseline = false,
  deferredPreview = null,
  previewGeneration = 0;
const normalized = (node) =>
  node.outerHTML.replace(/ data-native-section-index="\d+"/g, "").replace(/\[&quot;sections&quot;,\d+/g, "[&quot;sections&quot;,#");
let dragging = false;
function applyPreview({ html, baseline }) {
  if (dragging && !baseline) {
    deferredPreview = { html, seq: previewGeneration };
    return;
  }
  previewGeneration++;
  const doc = new DOMParser().parseFromString(html, "text/html");
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
  if (!deferred) for (const node of document.querySelectorAll("[data-native-origin]")) delete node.dataset.nativeOrigin;
  if (applied) {
    bind();
    applyPresentation();
    send("preview-applied");
    if (languageLocale !== "de") translationOverlay({ locale: languageLocale, values: languageValues });
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

// Expanded FAQ answers and other <details> stay open when their region is re-rendered.
function keepDisclosureState(from, to) {
  const key = (node, index) => node.closest("[data-native-record]")?.dataset.nativeRecord + "|" + (node.dataset.nativeEntry || index);
  const open = new Set([...from.querySelectorAll("details")].map((node, index) => node.open && key(node, index)).filter(Boolean));
  [...to.querySelectorAll("details")].forEach((node, index) => (node.open = open.has(key(node, index))));
}
// Cards of an animated section (pricing orbs …) that only changed order move as live nodes,
// so their running canvases move with them. Field paths inside are renumbered.
function entryKey(node) {
  return node.dataset.nativeRecord || node.outerHTML.replace(/\[&quot;sections&quot;,\d+(,&quot;[^&]+&quot;,\d+)?/g, "#");
}
function topEntries(root) {
  return [...root.querySelectorAll("[data-native-entry]")].filter((node) => !node.parentElement.closest("[data-native-entry]") || node.parentElement.closest("[data-native-entry]") === root);
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
  const byKey = new Map(current.map((node, i) => [wasKeys[Number(node.dataset.nativeOrigin ?? i)], node]));
  const anchor = current.at(-1).nextSibling;
  nowKeys.forEach((key, index) => {
    const node = byKey.get(key);
    parent.insertBefore(node, anchor);
    const listPath = parse(node.dataset.nativeEntry).slice(0, -1);
    renumberEntry(node, listPath, index);
    delete node.dataset.nativeOrigin;
  });
  return true;
}
function renumberEntry(node, listPath, index) {
  const depth = listPath.length;
  for (const target of [node, ...node.querySelectorAll("[data-native-path],[data-native-media-path],[data-native-entry]")])
    for (const key of ["nativePath", "nativeMediaPath", "nativeEntry"]) {
      const path = target.dataset[key] && parse(target.dataset[key]);
      if (path && path.length > depth && listPath.every((part, i) => path[i] === part)) {
        path[depth] = index;
        target.dataset[key] = JSON.stringify(path);
      }
    }
  for (const bound of node.querySelectorAll("[data-native-bound]")) delete bound.dataset.nativeBound;
}
