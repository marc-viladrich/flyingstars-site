import {siteWidgets,siteChange,referencePrefix,referencedRecords,omitRecordField,mediaUsageKeys,mediaSelection,selectedMedia,uploadedMediaId,optionalFieldAllowed} from './site-adapter.mjs';
import {nodeAt,listPolicy,recordTitle} from '../core/metadata.mjs';
import { inspectHorizontalLayout } from "./layout-guard.mjs";
import {
  normalizedRoute,
  navigationChoices,
  savedRecordRoute,
  publishNeedsActivation,
  fieldsInScope,
  sourceMediaSources,
  disclosedContainers,
  disclosedOptionalFields,
  restoredInspector,
  itemSummary,
  scopeUnits,
  partitionUnits,
} from "./view-state.mjs";
import { packageOwnedPagePath } from "/editor/package-ownership.mjs";
import { describe } from "./native-schema.mjs";
import { NativeDraft, getPath, same, sectionMutation, newRecordData } from "./native-draft.mjs";
import { ui } from "./ui-icons.mjs";
import { fieldLabel, choiceLabel, isTechnical } from "./field-labels.mjs";
import { sha256 } from "./sha256.mjs";
import { flags } from "./flags.mjs";
import { inlinePlain } from "/editor/site-lib/inline-text.mjs";
import { kindOf, kindPlural } from "./record-kinds.mjs";
import { mediaLibrary, mediaUsers, collectionOf, ALL as ALL_MEDIA, UNUSED as UNUSED_MEDIA } from "./media-usage.mjs";
import { splitLocale, localizedPath, frontendTarget, liveURL } from "./frontend-url.mjs";
import { navigatorGroups } from "./content-navigator.mjs";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const $ = (selector) => document.querySelector(selector);
const frame = $("#site-frame"),
  draft = new NativeDraft(),
  editing = new Map();
let state,
  busy = false,
  preview = false,
  outlines = false,
  ready = false,
  activeLocale = "de",
  route = "/",
  selection = null,
  retry = null,
  initialHead,
  expectedFrameURL,
  nextViewRecordId = null,
  currentInspector = null,
  inlineKeys = new Set(),
  publishPending = false,
  // Last /editor/api/review answer: saved draft head, active public head, public origin.
  publication = null,
  toastTimer = null,
  openMenuState = null,
  loadError = false;

const pathKey = (path) => JSON.stringify(path);
const fieldKey = (id, path) => id + "/" + pathKey(path);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const records = () => draft.records();
const record = (id) => records().find((item) => item.id === id);
const value = (item, path) => getPath(draft.get(item.id)?.data, path);
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const sectionIcon=type=>state?.templates?.sections?.find(t=>t.type===type)?.schema?.['x-afe']?.block?.icon||'layers';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (val === undefined || val === null || val === false) continue;
    if (key === "class") node.className = val;
    else if (key === "text") node.textContent = val;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), val);
    else if (key in node && typeof val !== "string") node[key] = val;
    else node.setAttribute(key, val === true ? "" : val);
  }
  for (const child of children.flat())
    if (child !== null && child !== undefined && child !== false) node.append(typeof child === "string" ? document.createTextNode(child) : child);
  return node;
}
// Group builders return null when a group would be empty; empty groups are simply left out.
function put(parent, ...nodes) {
  parent.append(...nodes.flat().filter(Boolean));
}
function icon(name) {
  const holder = document.createElement("span");
  holder.innerHTML = ui[name] || ui["settings"];
  return holder.firstElementChild;
}
function button(label, onclick, { icon: name, cls = "", iconOnly = false, title } = {}) {
  const node = el("button", { type: "button", class: cls, onclick });
  if (name) node.append(icon(name));
  if (iconOnly) {
    node.classList.add("icon-only");
    node.setAttribute("aria-label", label);
    node.title = title || label;
  } else node.append(el("span", { text: label }));
  return node;
}
function flagIcon(locale) {
  const holder = el("span", { class: "flag", "aria-hidden": "true" });
  holder.innerHTML = flags[locale] || flags.de;
  return holder;
}
function setButton(node, iconName, label, { wideOnly = false } = {}) {
  node.replaceChildren(icon(iconName));
  if (label) node.append(el("span", { class: wideOnly ? "label-wide" : "", text: label }));
}
// Destructive one-click actions take a second click in place.
function confirmInPlace(node, question, run) {
  let armed = false,
    timer;
  node.addEventListener("click", (event) => {
    if (!armed) {
      event.stopImmediatePropagation();
      armed = true;
      const span = node.querySelector("span");
      const original = span?.textContent;
      if (span) span.textContent = question;
      timer = setTimeout(() => {
        armed = false;
        if (span) span.textContent = original;
      }, 4000);
      return;
    }
    clearTimeout(timer);
    run();
  });
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
// Login: the session cookie is HttpOnly; the shell only keeps who is signed in and the CSRF token that
// every change must carry. Without login (local development) both are null.
let session = { user: null, csrf: null };
const csrfHeader = () => (session.csrf ? { "X-CSRF-Token": session.csrf } : {});
async function loadSession() {
  const response = await fetch("/editor/api/session", { cache: "no-store" });
  if (response.status === 401) return location.assign("/editor/login?next=" + encodeURIComponent(location.pathname + location.search));
  if (response.ok) session = await response.json();
}
async function api(url, data) {
  const response = await fetch(
    url,
    data
      ? { method: "POST", headers: { "content-type": "application/json", ...csrfHeader() }, body: JSON.stringify(data) }
      : { cache: "no-store" },
  );
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) sessionExpired();
  if (!response.ok) throw Object.assign(new Error(result.error || "Anfrage fehlgeschlagen."), { status: response.status });
  return result;
}
// The session ran out while editing: sign in again right here. Draft, undo and translations stay as
// they are; nothing is resent automatically — saving again is a deliberate click.
let reloginOpen = false;
function sessionExpired() {
  if (reloginOpen) return;
  reloginOpen = true;
  const d = dialog("Sitzung abgelaufen", { narrow: true });
  d.addEventListener("close", () => (reloginOpen = false));
  const user = el("input", { type: "text", autocomplete: "username", "aria-label": "Benutzername", value: session.user?.username || "" });
  const password = el("input", { type: "password", autocomplete: "current-password", "aria-label": "Passwort" });
  const error = el("p", { class: "note error", role: "alert" });
  const submit = async (event) => {
    event?.preventDefault();
    error.textContent = "";
    const response = await fetch("/editor/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: user.value, password: password.value }),
    }).catch(() => null);
    const result = (await response?.json().catch(() => ({}))) || {};
    if (!response?.ok) {
      error.textContent = result.error || "Anmeldung fehlgeschlagen.";
      password.value = "";
      return password.focus();
    }
    session = result;
    d.close();
    toast(changeCount() ? "Wieder angemeldet. Deine Änderungen sind noch da – jetzt speichern." : "Wieder angemeldet.");
  };
  const form = el(
    "form",
    { class: "relogin", onsubmit: submit },
    el("p", { class: "note", text: "Deine ungespeicherten Änderungen bleiben erhalten. Melde dich an und speichere dann erneut." }),
    el("label", { class: "stack" }, el("span", { class: "row-label", text: "Benutzername" }), user),
    el("label", { class: "stack" }, el("span", { class: "row-label", text: "Passwort" }), password),
    error,
  );
  d.body.append(form);
  d.foot.append(button("Anmelden", submit, { cls: "primary" }));
  (user.value ? password : user).focus();
}
async function logout() {
  const response = await fetch("/editor/api/logout", { method: "POST", headers: { ...csrfHeader() } }).catch(() => null);
  if (!response?.ok) return toast("Abmelden hat nicht geklappt. Deine Änderungen sind noch da.", { error: true });
  draft.discard();
  location.assign("/editor/login");
}
function send(type, data = {}) {
  if (ready) frame.contentWindow.postMessage({ source: "flyingstars-editor", type, ...data }, location.origin);
}
function toast(message, { error = false, action, actionLabel = "Rückgängig" } = {}) {
  // While the sign-in dialog is open it already says what happened.
  if (error && reloginOpen) return;
  const box = $("#toast");
  clearTimeout(toastTimer);
  if (!message) {
    box.hidden = true;
    return;
  }
  box.replaceChildren(el("span", { text: message }));
  box.classList.toggle("error", error);
  box.classList.toggle("has-action", !!action || error);
  if (action)
    box.append(
      button(actionLabel, () => {
        box.hidden = true;
        action();
      }),
    );
  if (error) box.append(button("Schließen", () => (box.hidden = true), { icon: "x", iconOnly: true }));
  box.hidden = false;
  if (!error) toastTimer = setTimeout(() => (box.hidden = true), action ? 7000 : 3500);
}

// ---------------------------------------------------------------------------
// Draft bookkeeping
// ---------------------------------------------------------------------------
function stagedRecords() {
  return records().map((item) => ({
    id: item.id,
    title: item.title,
    revision: item.revision,
    data: item.data,
    fields: fieldsFor(item),
  }));
}
// Draft records are replaced (never mutated) on every change, so one schema walk per record version is
// enough; panels ask for fields and containers many times per draw. Results are read-only.
const described = new WeakMap();
function describeItem(item) {
  let result = described.get(item);
  if (!result) {
    result = describe(item.schema, item.data, {
      id: item.id,
      readOnlyPaths: item.readOnlyPaths || [],
      derivedPath: packageOwnedPagePath,
      omitPath:(data,path)=>omitRecordField(item,data,path),
    });
    described.set(item, result);
  }
  return result;
}
function fieldsFor(item) {
  if (item.schema) return describeItem(item).fields;
  const fields = (item.fields || []).filter((field) => field.path[0] !== "sections" && getPath(item.data, field.path) !== undefined);
  for (const [index, section] of (item.data.sections || []).entries()) {
    const template = state?.templates?.sections?.find((t) => t.type === section.type);
    let sourceFields = template?.fields;
    if (!sourceFields) {
      for (const original of state?.records || []) {
        const sourceIndex = original.data.sections?.findIndex((s) => s.type === section.type) ?? -1;
        if (sourceIndex >= 0) {
          sourceFields = original.fields.filter((f) => f.path[0] === "sections" && f.path[1] === sourceIndex).map((f) => ({ ...f, path: f.path.slice(2) }));
          break;
        }
      }
    }
    for (const field of sourceFields || []) {
      const path = ["sections", index, ...field.path];
      if (getPath(item.data, path) !== undefined) fields.push({ ...field, path });
    }
  }
  return fields.map((field) => ({ ...field, value: getPath(item.data, field.path) }));
}
function containersFor(item) {
  if (item.schema) return describeItem(item).containers;
  const containers = (item.containers || []).filter((c) => c.path[0] !== "sections");
  for (const [index, section] of (item.data.sections || []).entries()) {
    const template = state?.templates?.sections?.find((t) => t.type === section.type);
    for (const c of template?.containers || []) containers.push({ ...c, path: ["sections", index, ...c.path] });
  }
  return containers;
}
function optionalFieldsFor(item) {
  return disclosedOptionalFields(item.schema ? describeItem(item).optionalFields : item.optionalFields || [], containersFor(item), item.data);
}
// ---------------------------------------------------------------------------
// Live preview: after each draft change the server renders the page with the real Astro components.
// ---------------------------------------------------------------------------
let previewTimer = null,
  previewSeq = 0,
  previewAvailable = true,
  previewBaselineFor = null;
function previewPayload(empty = false) {
  const request = empty ? { changes: [], creates: [], deletes: [] } : draft.request(initialHead, "00000000-0000-0000-0000-000000000000");
  return { head: initialHead, route: expectedFrameURL?.split("?")[0] || route, changes: request.changes, creates: request.creates, deletes: request.deletes };
}
async function requestPreview({ baseline = false, seq = ++previewSeq } = {}) {
  if (!previewAvailable || !ready || !initialHead) return;
  const frameURL = expectedFrameURL;
  try {
    const result = await api("/editor/api/preview", previewPayload(baseline));
    if (frameURL !== expectedFrameURL || result.head !== initialHead) return;
    if (!baseline && seq !== previewSeq) return;
    send("preview-html", { html: result.html, baseline });
  } catch (error) {
    if (error.status === 503) {
      previewAvailable = false;
      update();
    }
    else console.warn("Vorschau:", error.message);
  }
}
function schedulePreview() {
  if (!previewAvailable || !ready || busy || previewBaselineFor !== expectedFrameURL) return;
  clearTimeout(previewTimer);
  const seq = ++previewSeq;
  previewTimer = setTimeout(() => requestPreview({ seq }), 120);
}
async function startPreview() {
  // The first render of the saved state is the baseline the live page corresponds to.
  previewBaselineFor = null;
  const frameURL = expectedFrameURL;
  await requestPreview({ baseline: true });
  if (frameURL !== expectedFrameURL) return;
  previewBaselineFor = frameURL;
  if (draft.size) requestPreview();
}
function syncFrame() {
  schedulePreview();
  send("state", {
    records: stagedRecords(),
    mediaSources: sourceMediaSources([...draft.base.values()]),
    preview,
    busy,
    outlines,
  });
  if (activeLocale !== "de") overlayLocale(activeLocale);
}
function pendingCount() {
  return [...editing.values()].filter((item) => {
    const r = record(item.id);
    return r && !equal(value(r, item.path), item.value);
  }).length;
}
function changeCount() {
  return draft.size + pendingCount() + pendingTranslations.size;
}
// A visible e-mail address or phone number and its mailto:/tel: link always change together.
function linkedHref(item, path, newValue) {
  if (path.at(-1) !== "value" || typeof newValue !== "string") return null;
  const hrefPath = [...path.slice(0, -1), "href"];
  const href = getPath(item.data, hrefPath);
  if (typeof href !== "string") return null;
  if (href.startsWith("mailto:")) return [hrefPath, "mailto:" + newValue.trim()];
  if (href.startsWith("tel:")) {
    const digits = newValue.replace(/[^\d+]/g, "");
    return [hrefPath, "tel:" + (digits.startsWith("+") ? digits : digits.startsWith("0") ? "+49" + digits.slice(1) : digits)];
  }
  return null;
}
function stage(id, path, newValue) {
  const item = record(id);
  if (!item || !fieldsFor(item).some((field) => equal(field.path, path))) return;
  const link = linkedHref(item, path, newValue);
  draft.group(() => {
    draft.set(id, path, newValue);
    if (link) draft.set(id, link[0], link[1]);
  });
  editing.delete(fieldKey(id, path));
  retry = null;
  update();
  syncFrame();
}
function stageInputs() {
  if (document.activeElement === frame)
    try {
      for (const patch of frame.contentWindow.flyingstarsEditorFrame?.flush() || [])
        if (patch.locale) {
          pendingTranslations.delete(fieldKey(patch.id, patch.path) + "@" + patch.locale);
          writeTranslation(patch.id, patch.path, patch.locale, patch.value);
        } else stage(patch.id, patch.path, patch.value);
    } catch {}
  const active = document.activeElement;
  if (active?.dataset?.fieldKey && $("#panel").contains(active)) active.blur();
  for (const item of [...editing.values()]) stage(item.id, item.path, item.value);
  // Foreign-language text typed but not yet blurred is written like German input (never to German fields).
  for (const [key, item] of [...pendingTranslations]) {
    pendingTranslations.delete(key);
    writeTranslation(item.id, item.path, item.locale, item.value);
  }
}
function changed(id, path, newValue) {
  if (busy || !ready) return;
  stageInputs();
  if (siteChange(id,path,newValue,{record,draft})) {
    editing.clear();retry=null;syncFrame();update();rerender();return;
  }
  draft.set(id, path, newValue);
  editing.clear();
  retry = null;
  syncFrame();
  update();
}

// ---------------------------------------------------------------------------
// Dock
// ---------------------------------------------------------------------------
function currentPage() {
  const routed = records().find((item) => item.route && normalizedRoute(item.route) === route);
  if (routed) return routed;
  const slug = route === "/" ? "index" : route.replace(/^\/+|\/+$/g, "");
  return record("page/" + slug) || record("screen/" + slug) || record(selection?.id);
}
function pageHasSections() {
  return !!currentPage()?.schema?.properties?.sections;
}
function update() {
  const count = changeCount(),
    locked = busy || !ready || !state;
  const page = pageChoices().find((choice) => choice.value === route);
  const pageButton = $("#page-button");
  pageButton.replaceChildren(icon("file-text"), el("span", { text: page?.label || "Seite" }), icon("chevron-down"));
  pageButton.disabled = locked;
  pageButton.setAttribute("aria-label", "Seite wechseln, aktuell " + (page?.label || "Seite"));

  setButton($("#mode"), preview ? "pencil" : "eye", preview ? "Bearbeiten" : "Vorschau", { wideOnly: !preview });
  $("#mode").setAttribute("aria-pressed", String(preview));
  $("#mode").title = preview ? "Zurück zum Bearbeiten" : "Seite ohne Bearbeitungshilfen ansehen";
  $("#mode").disabled = locked;

  // Language of the view: translate icon + flag, so the current language is visible at a glance.
  $("#language").replaceChildren(icon("languages"), flagIcon(activeLocale), el("span", { class: "label-wide", text: activeLocale.toUpperCase() }));
  $("#language").setAttribute("aria-pressed", String(activeLocale !== "de"));
  $("#language").setAttribute("aria-label", "Sprache der Ansicht: " + localeNames[activeLocale]);
  $("#language").disabled = locked;
  $("#add-section").hidden = preview || !pageHasSections();
  $("#add-section").disabled = locked;
  $("#more").hidden = preview;
  $("#more").disabled = locked;

  $("#undo").hidden = preview || !draft.history.length;
  $("#undo").disabled = locked;

  // The preview tab (same origin) shows whether the editor holds changes it does not contain.
  try {
    if (count) localStorage.setItem("fs-editor-unsaved", String(count));
    else localStorage.removeItem("fs-editor-unsaved");
  } catch {}
  const save = $("#save");
  save.hidden = !count && !busy;
  save.disabled = locked || !count;
  if (busy) save.replaceChildren(Object.assign(icon("loader-circle"), { classList: "spin" }), el("span", { text: "Speichert …" }));
  else save.replaceChildren(el("span", { text: "Speichern" }), el("span", { class: "count", text: String(count) }));
  save.setAttribute("aria-label", busy ? "Speichert" : `${count} Änderung${count === 1 ? "" : "en"} speichern`);

  const status = $("#dock-status");
  const buildMissing = state?.activeHead && state.activeHead !== state.head;
  // The loading overlay already says "lädt"; the dock only reports states that need attention.
  // Without live preview (RELAUNCH_PREVIEW=0, e.g. on small hosting) some changes appear only after saving.
  const previewLater = ready && !previewAvailable && count > 0 && !busy;
  status.hidden = !(loadError || previewLater || (ready && buildMissing && !count && !busy));
  status.textContent = loadError ? "Nicht geladen" : previewLater ? "Vollständige Vorschau nach dem Speichern" : "Neuer Stand · noch nicht aufgebaut";
  status.classList.toggle("neutral", previewLater && !loadError);

  $("#publish").hidden = preview || !!count || busy || !publishPending || !ready;
  $("#publish").disabled = locked;

  $("#panel").inert = locked;
  for (const input of document.querySelectorAll("#panel-body input,#panel-body textarea,#panel-body select"))
    input.disabled = locked || input.dataset.inherited === "true";
  send("mode", { preview, busy: locked, outlines });
}
setButton($("#publish"), "globe", "Freigeben", { wideOnly: true });
$("#publish").setAttribute("aria-label", "Freigeben");
$("#undo").append(icon("undo-2"));
$("#add-section").append(icon("plus"));
$("#more").append(icon("ellipsis"));
$("#panel-close").append(icon("x"));
$("#panel-back").append(icon("chevron-left"));

// A preview tab offers to reload once a newer state is saved.
function rememberSavedHead() {
  try {
    localStorage.setItem("fs-editor-head", state.head);
  } catch {}
}
async function refreshPublishState() {
  try {
    const result = await api("/editor/api/review");
    publication = result;
    publishPending = (result.changed || []).length > 0 || publishNeedsActivation(result);
  } catch {
    publishPending = false;
  }
  update();
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------
function closeMenu({ restoreFocus = false } = {}) {
  if (!openMenuState) return;
  const { node, trigger } = openMenuState;
  node.remove();
  trigger.setAttribute("aria-expanded", "false");
  openMenuState = null;
  if (restoreFocus) trigger.focus();
}
// Dock menus open above their button and replace the panel; a menu from inside the panel (keepPanel)
// leaves it open and drops below its button when there is no room above.
function openMenu(trigger, items, { keepPanel = false } = {}) {
  if (openMenuState?.trigger === trigger) return closeMenu();
  closeMenu();
  if (!keepPanel) closePanel();
  const node = el("div", { class: "editor-ui menu", role: "menu" });
  for (const item of items.filter(Boolean)) {
    if (item === "-") node.append(el("div", { class: "menu-sep", role: "separator" }));
    else if (item.heading) node.append(el("div", { class: "menu-label", text: item.heading }));
    else {
      const row = button(
        item.label,
        item.confirm
          ? null
          : () => {
              // Toggles open no new surface, so focus returns to the menu button.
              closeMenu({ restoreFocus: item.checked !== undefined });
              item.run();
            },
        { icon: item.icon, cls: "menu-item " + (item.danger ? "danger" : "") },
      );
      if (item.flag) row.prepend(flagIcon(item.flag));
      if (item.hint) row.querySelector("span").after(el("small", { class: "menu-hint", text: item.hint }));
      row.setAttribute("role", item.checked !== undefined ? "menuitemcheckbox" : "menuitem");
      if (item.checked !== undefined) {
        row.setAttribute("aria-checked", String(item.checked));
        row.append(Object.assign(icon("check"), { classList: "check" }));
      }
      if (item.current !== undefined) {
        row.setAttribute("aria-current", item.current ? "page" : "false");
        row.append(Object.assign(icon("check"), { classList: "check" }));
      }
      if (item.disabled) row.disabled = true;
      if (item.confirm) {
        confirmInPlace(row, item.confirm, () => {
          closeMenu();
          item.run();
        });
      }
      node.append(row);
    }
  }
  document.body.append(node);
  const box = trigger.getBoundingClientRect(),
    width = node.offsetWidth,
    height = node.offsetHeight;
  node.style.left = Math.max(12, Math.min(innerWidth - width - 12, box.left)) + "px";
  const above = box.top - height - 8;
  node.style.top = (keepPanel && above < 12 ? Math.min(box.bottom + 6, innerHeight - height - 12) : Math.max(12, above)) + "px";
  trigger.setAttribute("aria-expanded", "true");
  openMenuState = { node, trigger };
  const rows = () => [...node.querySelectorAll("button:not(:disabled)")];
  (rows().find((row) => row.getAttribute("aria-current") === "page") || rows()[0])?.focus();
  node.addEventListener("keydown", (event) => {
    const list = rows(),
      at = list.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      list[(at + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      (event.key === "Home" ? list[0] : list.at(-1))?.focus();
    } else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      // Escape closes only the menu, not the panel it was opened from.
      event.stopPropagation();
      closeMenu({ restoreFocus: true });
    }
  });
}
// Short, human page names: the SEO title minus the brand suffix; the root is always "Startseite".
function pageChoices() {
  const groups = { "page/": "Seiten", "screen/": "Seiten", "project/": "Projekte", "post/": "Blog" };
  const seen = new Map();
  for (const choice of navigationChoices(records())) seen.set(choice.value, { ...choice, group: "Seiten" });
  for (const item of records()) {
    const prefix = item.id.split("/")[0] + "/";
    if (!item.route || !groups[prefix]) continue;
    const value = normalizedRoute(item.route);
    const label = value === "/" ? "Startseite" : String(item.data?.title || item.title).split(" – ")[0];
    seen.set(value, { value, label, group: groups[prefix] });
  }
  if (seen.has("/")) seen.get("/").label = "Startseite";
  return [...seen.values()];
}
function pageMenu() {
  const items = [];
  for (const groupName of ["Seiten", "Projekte", "Blog"]) {
    const choices = pageChoices().filter((choice) => choice.group === groupName);
    if (!choices.length) continue;
    if (items.length) items.push("-");
    items.push({ heading: groupName });
    for (const choice of choices) items.push({ label: choice.label, current: choice.value === route, run: () => navigate(choice.value) });
  }
  if (recordTemplate("page/")) items.push("-", { label: "Neue Seite anlegen", icon: "plus", run: () => openCreate("page/") });
  openMenu($("#page-button"), items);
}
function moreMenu() {
  const count = changeCount();
  openMenu($("#more"), [
    { label: "Seiteneinstellungen", icon: "settings", run: () => openInspector({ id: currentPage()?.id, path: [] }, "page", undefined, { docked: true }) },
    { label: "Inhalte verwalten", icon: "layers", run: () => contentLibrary() },
    {
      label: "Bearbeitbare Stellen zeigen",
      icon: "square-dashed",
      checked: outlines,
      run: () => {
        outlines = !outlines;
        syncFrame();
      },
    },
    frontendMenuItem(),
    "-",
    count ? { label: "Alle Änderungen verwerfen", icon: "rotate-ccw", danger: true, confirm: "Wirklich alle verwerfen?", run: discardAll } : null,
    session.user ? "-" : null,
    session.user
      ? count
        ? { label: `Abmelden (${session.user.displayName})`, icon: "user", danger: true, confirm: `${count} ungespeicherte Änderung${count === 1 ? "" : "en"} verwerfen?`, run: logout }
        : { label: `Abmelden (${session.user.displayName})`, icon: "user", run: logout }
      : null,
  ]);
}

// This page outside the editor, in the current language: the live site when everything saved is
// published, otherwise the saved draft under /vorschau/ (with a bar that says so). The label names the
// target before the click. Unsaved changes are in neither; the preview bar says so, here a toast does.
function frontendMenuItem() {
  const target = frontendTarget({ route, locale: activeLocale, publication });
  const run = () => {
    open(target.url, "_blank", "noopener");
    if (target.kind === "live" && changeCount()) toast("Live-Seite geöffnet. Deine ungespeicherten Änderungen sind dort noch nicht enthalten.");
  };
  return target.kind === "live"
    ? { label: "Live ansehen", icon: "external-link", run }
    : { label: "Vorschau ansehen", hint: "nicht veröffentlicht", icon: "external-link", run };
}

// ---------------------------------------------------------------------------
// Navigation and selection
// ---------------------------------------------------------------------------
// Languages are real routes (/en/…, /nl/…). `route` always stays the German page the records belong to;
// the language is kept separately and only the iframe address carries the prefix.
function editorAddress() {
  const page = localizedPath(route, activeLocale);
  return "/editor/" + (page === "/" ? "" : "?page=" + encodeURIComponent(page));
}
function navigate(url, { reload = false, locale, keepPanel = false } = {}) {
  nextViewRecordId = null;
  stageInputs();
  send("mode", { preview, busy: true, outlines });
  try {
    frame.contentWindow.flyingstarsEditorFrame?.freeze();
  } catch {}
  ready = false;
  selection = null;
  if (!keepPanel) closePanel();
  closeMenu();
  const next = new URL(url, location.origin);
  const split = splitLocale(next.pathname);
  // A German address keeps the current language (page menu, "Auf der Seite ansehen", reload after saving).
  const target = locale || (split.locale !== "de" ? split.locale : activeLocale);
  route = normalizedRoute(split.path);
  if (target !== activeLocale) {
    activeLocale = target;
    if (target !== "de") lastForeignLocale = target;
  }
  next.pathname = localizedPath(split.path, target);
  next.searchParams.set("editor", "1");
  next.searchParams.set("_editorNavigation", crypto.randomUUID());
  if (reload) next.searchParams.set("_editorHead", state.head);
  expectedFrameURL = next.pathname + next.search;
  frame.src = expectedFrameURL + next.hash;
  $("#loading").hidden = false;
  history.replaceState(null, "", editorAddress());
  update();
  // A language switch from inside a panel redraws the same view in the new language at once (it stays
  // locked until the page has loaded, then it is drawn once more with the new page's markers).
  if (keepPanel) rerender();
}
function frameOffset() {
  const box = frame.getBoundingClientRect();
  return { x: box.left, y: box.top };
}
// ---------------------------------------------------------------------------
// Panel (anchored popover for context, docked sheet for records/settings)
// ---------------------------------------------------------------------------
function closePanel() {
  const panel = $("#panel");
  if (panel.hidden) return;
  const active = document.activeElement;
  if (active && panel.contains(active)) active.blur();
  for (const item of [...editing.values()]) if (!item.inline) stage(item.id, item.path, item.value);
  panel.hidden = true;
  overviewObserver?.disconnect();
  overviewObserver = null;
  currentInspector = null;
  panelStack = [];
}
function showPanel({ title, iconName, kind, anchor, docked = false, size = "compact" }) {
  closeMenu();
  const panel = $("#panel");
  $("#panel-icon").replaceChildren(icon(iconName || "settings"));
  $("#panel-title").textContent = title;
  $("#panel-kind").textContent = kind || "";
  panel.dataset.placement = docked || !anchor ? "docked" : "anchored";
  panel.dataset.size = size;
  panel.hidden = false;
}
// The panel is a floating window. It always opens at its natural height (as tall as its content, at
// most the free viewport) and moves instead of shrinking when it would not fit where it was clicked.
// Dragging the title bar pins it for the rest of the work; resizing an edge changes only its width.
// Both are remembered per size (compact element panel, wide record overview).
const panelGeometry = (() => {
  try {
    return JSON.parse(localStorage.getItem("fs-editor-panel") || "{}");
  } catch {
    return {};
  }
})();
const rememberPanel = () => {
  try {
    localStorage.setItem("fs-editor-panel", JSON.stringify(panelGeometry));
  } catch {}
};
const panelMargin = 12,
  dockSpace = 84;
const panelWidths = {
  compact: { initial: 360, min: 300, max: 720 },
  overview: { initial: 1080, min: 560, max: 1600 },
};
function panelFloor() {
  return innerHeight - dockSpace;
}
function panelWidth(size) {
  const limits = panelWidths[size] || panelWidths.compact;
  const sparse = size === "overview" && $("#panel").dataset.sparse === "true";
  const wanted = panelGeometry[size]?.width ?? (sparse ? 760 : limits.initial);
  return Math.round(Math.max(Math.min(limits.min, innerWidth - 2 * panelMargin), Math.min(wanted, limits.max, innerWidth - 2 * panelMargin)));
}
function placePanel(anchor, previous) {
  const panel = $("#panel");
  const pinned = panelGeometry[panel.dataset.size]?.left !== undefined;
  $("#panel-unpin").hidden = !pinned || innerWidth <= 640;
  if (innerWidth <= 640) {
    panel.style.left = panel.style.top = panel.style.width = panel.style.maxHeight = "";
    return;
  }
  const size = panel.dataset.size,
    floor = panelFloor(),
    width = panelWidth(size);
  panel.style.width = width + "px";
  // Measure the natural height with the whole free viewport available.
  panel.style.top = panelMargin + "px";
  panel.style.maxHeight = floor - panelMargin + "px";
  const height = panel.offsetHeight;
  const clampLeft = (x) => Math.max(panelMargin, Math.min(x, innerWidth - width - panelMargin));
  const clampTop = (y) => Math.max(panelMargin, Math.min(y, floor - height));
  let left, top;
  if (pinned) {
    left = clampLeft(panelGeometry[size].left);
    top = clampTop(panelGeometry[size].top);
  } else if (previous && previous.size === size && Number.isFinite(previous.left) && Number.isFinite(previous.top)) {
    // Back/forward inside the panel keeps it where it is; it only moves up if the new view is taller.
    left = clampLeft(previous.left);
    top = clampTop(previous.top);
  } else if (size === "overview" || panel.dataset.placement !== "anchored" || !anchor) {
    left = size === "overview" ? clampLeft((innerWidth - width) / 2) : clampLeft(innerWidth - width - 16);
    top = clampTop(16);
  } else {
    // Beside the clicked element so the panel never hides what is being edited; otherwise below or above it.
    const box = anchor.element,
      gap = 8;
    const fits = ([x, y]) => x >= panelMargin && x + width <= innerWidth - panelMargin && y >= panelMargin && y + height <= floor;
    const spots = box
      ? [
          [box.right + 12, clampTop(box.top)],
          [box.left - width - 12, clampTop(box.top)],
          [clampLeft(anchor.x), box.bottom + gap],
          [clampLeft(anchor.x), box.top - height - gap],
        ]
      : [];
    const spot = spots.find(fits);
    if (spot) [left, top] = spot;
    else {
      left = clampLeft(anchor.x);
      top = clampTop(anchor.y + gap);
    }
  }
  panel.style.left = left + "px";
  panel.style.top = top + "px";
  // Content that grows later (an added entry) scrolls inside instead of running under the dock.
  panel.style.maxHeight = floor - top + "px";
}
function panelPlace() {
  const panel = $("#panel");
  return { size: panel.dataset.size, left: parseFloat(panel.style.left), top: parseFloat(panel.style.top) };
}
// Title bar drag (pins the panel) and edge resize (width only).
function dragPanel(event) {
  const panel = $("#panel");
  if (event.button !== 0 || innerWidth <= 640 || event.target.closest("button")) return;
  event.preventDefault();
  const head = event.currentTarget,
    startX = event.clientX,
    startY = event.clientY,
    start = panelPlace();
  let moved = false;
  head.setPointerCapture(event.pointerId);
  const move = (e) => {
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
    moved = true;
    panel.classList.add("moving");
    const width = panel.offsetWidth,
      height = panel.offsetHeight;
    const left = Math.max(panelMargin, Math.min(start.left + e.clientX - startX, innerWidth - width - panelMargin));
    const top = Math.max(panelMargin, Math.min(start.top + e.clientY - startY, panelFloor() - Math.min(height, 120)));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.maxHeight = panelFloor() - top + "px";
  };
  const end = () => {
    head.removeEventListener("pointermove", move);
    head.removeEventListener("pointerup", end);
    head.removeEventListener("pointercancel", end);
    panel.classList.remove("moving");
    if (!moved) return;
    const place = panelPlace();
    panelGeometry[place.size] = { ...panelGeometry[place.size], left: place.left, top: place.top };
    rememberPanel();
    $("#panel-unpin").hidden = false;
  };
  head.addEventListener("pointermove", move);
  head.addEventListener("pointerup", end);
  head.addEventListener("pointercancel", end);
}
function resizePanel(event) {
  const panel = $("#panel");
  if (event.button !== 0 || innerWidth <= 640) return;
  event.preventDefault();
  const handle = event.currentTarget,
    edge = handle.dataset.edge,
    startX = event.clientX,
    start = panelPlace(),
    startWidth = panel.offsetWidth,
    limits = panelWidths[start.size] || panelWidths.compact;
  handle.setPointerCapture(event.pointerId);
  panel.classList.add("moving");
  const move = (e) => {
    const delta = (e.clientX - startX) * (edge === "left" ? -1 : 1);
    const room = edge === "left" ? start.left + startWidth - panelMargin : innerWidth - start.left - panelMargin;
    const width = Math.round(Math.max(limits.min, Math.min(startWidth + delta, limits.max, room)));
    panel.style.width = width + "px";
    if (edge === "left") panel.style.left = start.left + startWidth - width + "px";
  };
  const end = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    panel.classList.remove("moving");
    const place = panelPlace();
    const pinned = panelGeometry[place.size]?.left !== undefined;
    panelGeometry[place.size] = { ...panelGeometry[place.size], width: panel.offsetWidth, ...(pinned ? { left: place.left } : {}) };
    rememberPanel();
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}
function unpinPanel() {
  const panel = $("#panel");
  const size = panel.dataset.size;
  if (panelGeometry[size]) {
    delete panelGeometry[size].left;
    delete panelGeometry[size].top;
    rememberPanel();
  }
  placePanel(panelAnchor);
}
function group(title, ...children) {
  const items = children.flat().filter(Boolean);
  if (!items.length) return null;
  return el("section", { class: "group" }, title ? el("h3", { class: "group-title", text: title }) : null, items);
}
function actionGroup(title, actions) {
  const items = actions.filter(Boolean);
  if (!items.length) return null;
  return el("section", { class: "group actions" }, title ? el("h3", { class: "group-title", text: title }) : null, items);
}
function actionRow(label, run, iconName, { danger = false, confirm } = {}) {
  const row = button(label, confirm ? null : run, { icon: iconName, cls: "action" + (danger ? " danger" : "") });
  if (confirm) confirmInPlace(row, confirm, run);
  return row;
}

// Texts of content records have a translation per language; links, files and colours do not.
function isTranslatable(item,field){return field?.kind==='text'&&field['x-afe']?.translatable===true;}
// "Übersetzen" for one clicked text: in German it switches to the foreign view with that text focused on
// the page; in a foreign view it goes back to German and the panel stays.
function translateAction(item, field) {
  if (!isTranslatable(item, field)) return null;
  return activeLocale === "de"
    ? actionRow("Übersetzen", () => startTranslation({ id: item.id, path: field.path }), "languages")
    : actionRow("Zurück zu Deutsch", () => switchPanelLocale("de"), "languages");
}
// Set while a panel draws when it shows (or holds behind "Weitere Felder") a translatable text: then its
// head carries the one language control of the panel.
let panelTranslatable = false;
// One control per field kind. Text that is visible on the page is edited there, never here.
function fieldControl(item, field, { label } = {}) {
  const key = fieldKey(item.id, field.path),
    name = label || fieldLabel(field);
  const isChanged = () => !same(getPath(draft.base.get(item.id)?.data, field.path), value(item, field.path));
  const labelNode = el("span", { class: "row-label" + (isChanged() ? " changed" : ""), text: name });
  // Optional variants (not yet stored) show their schema default and are written on first change.
  const current = value(item, field.path) ?? field.template;

  // Technical source data the schema declares read-only (e.g. a prepared formation file): visible, not editable.
  if (field.readOnly)
    return el("label", { class: "stack" }, labelNode, el("input", { type: "text", value: String(current ?? ""), readOnly: true, "aria-label": name }));
  if (field.kind === "boolean") {
    const input = el("input", { type: "checkbox", class: "switch", role: "switch", "aria-label": name });
    input.checked = !!current;
    input.dataset.fieldKey = key;
    input.addEventListener("change", () => {
      changed(item.id, field.path, input.checked);
      labelNode.classList.toggle("changed", isChanged());
      afterPresentationChange();
    });
    return el("label", { class: "row" }, labelNode, input);
  }

  if (field.format === "color") return colorControl(item, field, { labelNode, name, key, isChanged });

  if (field.kind === "enum" && (field.choices || []).length && field.choices.length <= 4) {
    const stacked = name.length > 16 || field.choices.length > 3;
    const seg = el("div", { class: "seg", role: "group", "aria-label": name });
    for (const choice of field.choices) {
      const val = typeof choice === "object" ? choice.value : choice;
      const option = button(choiceLabel(choice,field), () => {
        if (busy) return;
        changed(item.id, field.path, val);
        for (const other of seg.children) other.setAttribute("aria-pressed", String(other === option));
        labelNode.classList.toggle("changed", isChanged());
        afterPresentationChange();
      });
      option.setAttribute("aria-pressed", String(equal(current, val)));
      seg.append(option);
    }
    return el("div", { class: stacked ? "stack" : "row" }, labelNode, seg);
  }

  let input;
  if (field.kind === "enum") {
    input = el("select", { "aria-label": name });
    for (const choice of field.choices || []) {
      const option = el("option", { text: choiceLabel(choice,field) });
      option.value = typeof choice === "object" ? choice.value : choice;
      input.append(option);
    }
  } else if (field.kind === "number") input = el("input", { type: "number", step: "any", "aria-label": name });
  else {
    const long = ["multiline","markdown"].includes(field.format);
    const isLink = field.format === "url";
    const markdown = field.format === "markdown";
    input = long
      ? el("textarea", { rows: markdown ? 10 : 3, class: markdown ? "markdown" : "", "aria-label": name })
      : el("input", { type: isLink ? "url" : "text", "aria-label": name });
  }
  input.dataset.fieldKey = key;
  input.value = current ?? "";
  const translatable = isTranslatable(item, field);
  if (translatable) panelTranslatable = true;
  if (translatable && activeLocale !== "de") {
    // In a foreign-language view this field edits its translation; the German text is the placeholder.
    // Its language pill switches the language of the whole panel (and the page) in place.
    input.value = translationText(item, field.path) ?? "";
    input.placeholder = current ?? "";
    labelNode.append(localeSwitch("locale-badge"));
    input.addEventListener("change", () => {
      if (input.value.trim()) writeTranslation(item.id, field.path, activeLocale, input.value);
    });
    return el("label", { class: "stack" }, labelNode, input);
  }
  const read = () => (field.kind === "number" ? (input.value.trim() === "" ? null : Number(input.value)) : input.value);
  let baseline;
  input.addEventListener("focus", () => (baseline = input.value));
  input.addEventListener("input", () => {
    editing.set(key, { id: item.id, path: field.path, value: read() });
    update();
  });
  const commit = () => {
    if (editing.has(key)) stage(item.id, field.path, read());
    labelNode.classList.toggle("changed", isChanged());
  };
  input.addEventListener("blur", commit);
  input.addEventListener("change", () => {
    if (field.kind === "enum") {
      editing.set(key, { id: item.id, path: field.path, value: read() });
      commit();
      afterPresentationChange();
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      // Escape first cancels a pending edit; on an untouched field it closes the panel.
      if (input.value === (baseline ?? "")) return;
      event.preventDefault();
      event.stopPropagation();
      input.value = baseline ?? "";
      editing.delete(key);
      update();
      input.blur();
    } else if (event.key === "Enter" && !event.shiftKey && input.tagName !== "TEXTAREA") {
      event.preventDefault();
      input.blur();
    }
  });
  input.disabled = busy;
  // {o}/{c} in formatted short texts are format marks, not placeholders.
  const placeholders = typeof current === "string" && field.format !== "inline" ? [...new Set(current.match(/\{\w+\}/g) || [])] : [];
  if (placeholders.length && !name.includes("{"))
    return el("label", { class: "stack" }, labelNode, input, el("span", { class: "note", text: `${placeholders.join(", ")} wird automatisch eingesetzt.` }));
  return el("label", { class: "stack" }, labelNode, input);
}
// Colour fields store a token id from the site's colour registry. Swatch + name open a labelled palette
// (grouped, selected one marked by a check and its pressed state, arrow keys move, Escape closes).
// Without the registry the stored value stays editable as text, with its swatch when it is a hex colour.
let colorRegistry = null;
function loadColorTokens() {
  return (colorRegistry ??= import("/editor/site-lib/color-tokens.mjs")
    .then((module) => (Array.isArray(module.COLOR_TOKENS) ? module.COLOR_TOKENS : null))
    .catch(() => null));
}
const isHexColor = (v) => typeof v === "string" && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim());
function colorControl(item, field, { labelNode, name, key, isChanged }) {
  const read = () => value(item, field.path) ?? field.template;
  const swatch = el("span", { class: "swatch", "aria-hidden": "true" });
  const label = el("span", { class: "color-name" });
  const trigger = el("button", { type: "button", class: "color-trigger", "aria-expanded": "false", "data-field-key": key }, swatch, label, icon("chevron-down"));
  const palette = el("div", { class: "color-palette", role: "group", "aria-label": `${name} wählen` });
  palette.hidden = true;
  const wrap = el("div", { class: "stack color-field" }, labelNode, trigger, palette);
  let tokens = null;
  const paint = () => {
    const current = read();
    const token = tokens?.find((t) => t.id === current);
    swatch.style.background = token ? token.value : isHexColor(current) ? current : "";
    swatch.classList.toggle("empty", !token && !isHexColor(current));
    label.textContent = token ? token.label : current || "Keine Farbe";
    trigger.setAttribute("aria-label", `${name}: ${label.textContent}`);
  };
  const close = (refocus) => {
    palette.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (refocus) trigger.focus({ preventScroll: true });
  };
  const choose = (token) => {
    if (busy) return;
    if (token.id !== read()) {
      changed(item.id, field.path, token.id);
      labelNode.classList.toggle("changed", isChanged());
      afterPresentationChange();
    }
    paint();
    close(true);
  };
  const build = () => {
    const current = read();
    // The schema may limit a field to some palette groups (an accent offers brand/project colours, not surfaces);
    // the stored colour stays selectable even if it lies outside them.
    const offered = field.palette?.length ? tokens.filter((t) => field.palette.includes(t.group) || t.id === current) : tokens;
    const groups = [...new Set(offered.map((t) => t.group || ""))];
    palette.replaceChildren(
      ...groups.map((groupName) =>
        el(
          "div",
          { class: "color-group" },
          groupName ? el("span", { class: "row-sublabel", text: groupName }) : null,
          el(
            "div",
            { class: "color-options" },
            offered
              .filter((t) => (t.group || "") === groupName)
              .map((token) => {
                const selected = token.id === current;
                const option = el(
                  "button",
                  { type: "button", class: "color-option", "aria-pressed": String(selected), "data-token": token.id, onclick: () => choose(token) },
                  el("span", { class: "swatch", style: `background:${token.value}`, "aria-hidden": "true" }),
                  el("span", { class: "color-option-label", text: token.label }),
                );
                if (selected) option.append(icon("check"));
                return option;
              }),
          ),
        ),
      ),
    );
  };
  trigger.addEventListener("click", () => {
    if (!tokens || busy) return;
    const opening = palette.hidden;
    if (!opening) return close(false);
    build();
    palette.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    const start = palette.querySelector('[aria-pressed="true"]') || palette.querySelector(".color-option");
    start?.focus({ preventScroll: true });
    revealInPanel(start);
  });
  palette.addEventListener("keydown", (event) => {
    const options = [...palette.querySelectorAll(".color-option")];
    const at = options.indexOf(document.activeElement);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (step && at >= 0) {
      event.preventDefault();
      const next = options[(at + step + options.length) % options.length];
      next.focus({ preventScroll: true });
      revealInPanel(next);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const edge = options[event.key === "Home" ? 0 : options.length - 1];
      edge?.focus({ preventScroll: true });
      revealInPanel(edge);
    }
  });
  paint();
  loadColorTokens().then((list) => {
    if (list) {
      tokens = list;
      paint();
      return;
    }
    // No registry (yet): the raw value, editable as text, with its swatch when it is a hex colour.
    const input = fieldControl(item, { ...field, format: undefined }, { label: name }).querySelector("input,textarea");
    trigger.replaceWith(el("div", { class: "color-raw" }, swatch, input || label));
    palette.remove();
    input?.addEventListener("input", () => {
      swatch.style.background = isHexColor(input.value) ? input.value : "";
      swatch.classList.toggle("empty", !isHexColor(input.value));
    });
  });
  return wrap;
}
function afterPresentationChange() {
  // Variants render immediately in the frame; the panel keeps its place.
  syncFrame();
  update();
}

// Images: preview, replace, alt text inherited from the media record with an explicit local override.
function mediaControl(item,path,options={}) {
 const container=containersFor(item).find(c=>equal(c.path,path));
 return siteWidgets[container?.['x-afe']?.widget]?.render?.(item,path,options,{value,record,el,openMedia,fieldLabel,button,fieldsFor,fieldControl,changed,rerender,navRow,pushView});
}
// How a list entry is named and pictured wherever it appears (row, drag handle, panel title, "Gehört zu"):
// an image by caption/alt/library title/file name with a thumbnail, an entry standing for another record
// by the declared item label and reference; an entry carrying an image can use its image summary.
function entrySummary(item, path, entry = value(item, path)) {
  const containers = containersFor(item);
  // A picker entry is named like its declared option.
  if (entry !== null && entry !== undefined && typeof entry !== "object") {
    const list = containers.find((c) => equal(c.path, path.slice(0, -1)));
    const option = list && choiceSource(item, list)?.options.find((o) => o.key === entry || o.alias === entry);
    if (option) return { label: inlinePlain(option.label), thumb: null };
  }
  const own = containers.find((c) => equal(c.path, path));
  const image = !!own && isMediaContainer(item, own);
  const child =
    !image && entry && typeof entry === "object"
      ? containers.find((c) => c.path.length === path.length + 1 && under(c.path, path) && value(item, c.path) && isMediaContainer(item, c))
      : null;
  const listNode=nodeAt(item.schema,item.data,path.slice(0,-1));
  const summary = itemSummary(entry, path.at(-1), { records: records(), image, imageChild: child ? value(item, child.path) : null, recordName,itemLabel:listNode?.['x-afe']?.array?.itemLabel,element:listNode?.element });
  return { label: inlinePlain(summary.label), thumb: summary.thumb };
}
function listLabel(item, path) {
  return entrySummary(item, path).label;
}
// Referenced records (team members, client logos): chosen ones first, in their shown order and
// reorderable by drag or arrow keys; the others below to tick on.
// Lists of ids that point at something else: referenced records (team members, client logos) or a
// package's own Leistungen on its homepage card. Chosen ones first, in their shown order and reorderable
// by drag or arrow keys; the others below to tick on. The text always stays with its owner.
function choiceSource(item, container) {
  const ref = nodeAt(item.schema,item.data,[...container.path,0])?.['x-afe']?.reference;
  const prefix = referencePrefix(ref);
  const all = ref ? referencedRecords(records(),ref) : [];
  if (ref) {
    return {
      noun: all[0]?.schema?.['x-afe']?.collection?.label||"Eintrag",
      empty: "Noch niemand ausgewählt.",
      create: recordTemplate(prefix) ? () => openCreate(prefix, { id: item.id, path: container.path }) : null,
      options: all.map((r) => ({ key: r.id.slice(prefix.length), alias: r.id, label: recordName(r), open: () => pushView({ id: r.id, path: [] }, "record") })),
    };
  }
  const widget=siteWidgets[container['x-afe']?.widget];
  if(widget?.choices)return widget.choices(item,container,{record,recordName,pushView,inlinePlain});
  return null;
}
// part: "all" (picker with candidates), "chosen" (what the card shows) or "candidates" (the rest to tick on).
function referenceControl(item, container, source, { part = "all" } = {}) {
  const listKey = fieldKey(item.id, container.path);
  const now = () => value(item, container.path) || [];
  const matches = (option, id) => option.key === id || option.alias === id;
  const chosen = now()
    .map((id) => source.options.find((option) => matches(option, id)))
    .filter(Boolean);
  const others = source.options.filter((option) => !chosen.includes(option));
  const write = (next, focusIndex) => {
    changed(item.id, container.path, next);
    if (focusIndex !== undefined) pendingFocus = `[data-list="${CSS.escape(listKey)}"] [data-index="${focusIndex}"] .grip`;
    rerender();
  };
  const moveTo = (from, to) => {
    stageInputs();
    const next = [...now()];
    if (from === to || to < 0 || to >= next.length) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    write(next, to);
  };
  const row = (option, index) => {
    const box = el("input", { type: "checkbox", "aria-label": `${option.label} anzeigen` });
    box.checked = index !== null;
    box.disabled = index===null?!listPolicy(container).insertable:!listPolicy(container).removable;
    box.addEventListener("change", () => {
      stageInputs();
      const next = now().filter((id) => !matches(option, id));
      if (box.checked) next.push(option.key);
      write(next);
    });
    const li = el("li", { "data-index": index === null ? "" : String(index), ...(index === null ? {} : { "data-entry-key": fieldKey(item.id, [...container.path, index]) }) });
    if (index !== null && chosen.length > 1 && listPolicy(container).reorderable) {
      const grip = button(`„${option.label}“ verschieben`, null, {
        icon: "grip-vertical",
        iconOnly: true,
        cls: "grip",
        title: "Ziehen oder mit Pfeiltasten verschieben",
      });
      grip.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          moveTo(index, index + (event.key === "ArrowUp" ? -1 : 1));
        }
      });
      grip.addEventListener("pointerdown", (event) => dragRow(event, chosenList, li, index, moveTo));
      li.append(grip);
    }
    const open = button(option.label, option.open, { cls: "row-open" });
    open.append(icon("chevron-right"));
    li.append(el("label", { class: "row-check" }, box), open);
    return li;
  };
  const chosenList = el("ul", { class: "rows", "data-list": listKey, "aria-label": fieldLabel(container) + " (angezeigt)" });
  chosen.forEach((option, index) => chosenList.append(row(option, index)));
  // Not shown yet: grouped like their owner (e.g. "Musik", "Service & Extras"). Named groups are
  // disclosures like entries: open in the record overview, closed in contextual panels, choice remembered.
  const groups = [...new Set(others.map((option) => option.group || ""))];
  const otherLists = groups.map((group) => {
    const members = others.filter((option) => (option.group || "") === group);
    const list = el("ul", { class: "rows muted", "aria-label": group || "Weitere" });
    members.forEach((option) => list.append(row(option, null)));
    if (!group) return [list];
    return [rememberedDisclosure(listKey + "#" + group, el("span", { text: `${group} (${members.length})` }), list, { cls: "ref-group" })];
  });
  const createButton = source.create
    ? button(source.createLabel || source.noun + " hinzufügen", source.create, { icon: source.createLabel ? "pencil" : "plus", cls: "inline-button" })
    : null;
  if (part === "candidates")
    return el("div", { class: "stack" }, el("span", { class: "row-label", text: `${fieldLabel(container)} · nicht angezeigt` }), otherLists.flat());
  return el(
    "div",
    { class: "stack" },
    el("span", { class: "row-label", text: fieldLabel(container) }),
    chosen.length ? chosenList : el("p", { class: "note", text: source.empty }),
    part === "all" && others.length ? el("span", { class: "note", text: "Nicht angezeigt" }) : null,
    part === "all" ? otherLists.flat() : null,
    createButton,
  );
}
const under = (path, prefix) => prefix.every((part, index) => path[index] === part);
function isMediaContainer(item, container) {
  return container.format === "image";
}
// Builds the "Inhalt" group for everything under prefix that the page cannot edit inline.
function contentControls(item, prefix, options = {}) {
  const { depthLimit = Infinity, skipKinds = [], includeInline = false } = options;
  const fieldDepth = options.fieldDepth ?? depthLimit + 1;
  const out = [];
  // The page's own section list is changed only through the section actions, which keep the frame in step.
  const containers = disclosedContainers(containersFor(item), item.data).filter(
    (c) =>
      under(c.path, prefix) &&
      c.path.length > prefix.length &&
      c.path.length - prefix.length <= depthLimit &&
      !(c.path.length === 1 && c.path[0] === "sections"),
  );
  const mediaPaths = containers.filter((c) => isMediaContainer(item, c)).map((c) => c.path);
  const arrayPaths = containers.filter((c) => c.kind === "array").map((c) => c.path);
  const insideHandled = (path) => [...mediaPaths, ...arrayPaths].some((p) => p.length < path.length && under(path, p));

  for (const c of containers) {
    if (insideHandled(c.path)) continue;
    if (isMediaContainer(item, c)) {
      // An absent optional image is offered once, as "Bild hinzufügen" below.
      if (value(item, c.path) !== undefined) out.push(mediaControl(item, c.path, { title: fieldLabel(c) }));
    } else if (c.kind === "array") {
      const source = choiceSource(item, c);
      out.push(source ? referenceControl(item, c, source) : listRows(item, c, { includeInline }));
    }
  }
  for (const field of fieldsFor(item)) {
    if (!under(field.path, prefix) || field.path.length <= prefix.length) continue;
    if (field.path.length - prefix.length > fieldDepth) continue;
    if (insideHandled(field.path) || mediaPaths.some((p) => under(field.path, p))) continue;
    if (skipKinds.includes(field.kind) || isTechnical(field)) continue;
    if (!includeInline && inlineKeys.has(fieldKey(item.id, field.path))) continue;
    const parent = field.path.length - prefix.length > 1 ? field.path.at(-2) : null;
    const label = parent && typeof parent !== "number" ? fieldLabel({ path: [parent] }) + " · " + fieldLabel(field) : fieldLabel(field);
    out.push(fieldControl(item, field, { label }));
  }
  const additions = [];
  for (const c of containers) {
    if (value(item, c.path) !== undefined || c.template === undefined || insideHandled(c.path)) continue;
    additions.push(
      button(
        fieldLabel(c) + " ergänzen",
        () => {
          changed(item.id, c.path, c.template);
          rerender();
        },
        { icon: "plus", cls: "inline-button" },
      ),
    );
  }
  for (const optional of optionalFieldsFor(item)) {
    if (!under(optional.path, prefix) || value(item, optional.path) !== undefined || insideHandled(optional.path) || isTechnical(optional)) continue;
    if (["boolean", "enum"].includes(optional.kind)) continue; // rendered as controls by optionalVariants()
    if (optional.path.length - prefix.length > depthLimit + 1) continue;
    const isImage = optional.format === "image";
    additions.push(
      button(
        isImage ? fieldLabel(optional) + " hinzufügen" : fieldLabel(optional) + " ergänzen",
        () => (isImage ? openMedia({ id: item.id, path: optional.path }) : (changed(item.id, optional.path, optional.template), rerender())),
        { icon: isImage ? "image" : "plus", cls: "inline-button" },
      ),
    );
  }
  if (additions.length) out.push(el("div", { class: "seg" }, additions));
  return out;
}

// Lists: drag handle to reorder (keyboard: arrow keys on the handle), the row itself opens the entry.
// Every write reads the current draft value, never a copy from when the panel opened.
// Small object entries (label + value, number + label) are edited as a table, one row per entry.
function tableColumns(item, container) {
  if(!siteWidgets[container['x-afe']?.widget]?.table)return null;
  const entries = value(item, container.path);
  if (!Array.isArray(entries) || !entries.length || entries.some((e) => !e || typeof e !== "object" || Array.isArray(e))) return null;
  const first = [...container.path, 0];
  const nested = containersFor(item).some((c) => c.path.length > first.length && under(c.path, first));
  if (nested) return null;
  const columns = fieldsFor(item).filter((f) => f.path.length === first.length + 1 && under(f.path, first) && !isTechnical(f));
  const max = $("#panel").dataset.size === "overview" ? 3 : 2;
  if (!columns.length || columns.length > max || columns.some((f) => !["text", "number"].includes(f.kind))) return null;
  return columns.map((f) => ({ key: f.path.at(-1), label: fieldLabel(f) }));
}
// Complex entries open in place as disclosures (no new panel): the summary row names and pictures the
// entry, the body edits it in a column grid. A record overview starts them open, contextual panels closed;
// an explicit toggle is remembered across redraws and follows the entry when it moves.
function disclosureOpen(key) {
  return openDisclosures.has(key) ? openDisclosures.get(key) : renderMode === "entity";
}
// A <details> group whose open state follows disclosureOpen() and survives redraws (also a language switch).
function rememberedDisclosure(key, summary, content, { cls = "", open = disclosureOpen(key) } = {}) {
  const details = el("details", { class: cls }, el("summary", {}, summary, icon("chevron-down")), content);
  details.open = open;
  details.addEventListener("toggle", () => openDisclosures.set(key, details.open));
  return details;
}
// permutation[newIndex] = oldIndex (missing old indexes were removed); nested keys move with their entry.
function remapDisclosures(id, listPath, permutation) {
  const moved = [];
  for (const [key, open] of openDisclosures) {
    const at = key.indexOf("/[");
    if (at < 0 || key.slice(0, at) !== id) continue;
    let path;
    try {
      path = JSON.parse(key.slice(at + 1));
    } catch {
      continue;
    }
    if (path.length <= listPath.length || !under(path, listPath) || typeof path[listPath.length] !== "number") continue;
    openDisclosures.delete(key);
    const next = permutation.indexOf(path[listPath.length]);
    if (next < 0) continue;
    const target = [...path];
    target[listPath.length] = next;
    moved.push([fieldKey(id, target), open]);
  }
  for (const [key, open] of moved) openDisclosures.set(key, open);
}
const range = (length) => Array.from({ length }, (_, i) => i);
function entryKeySelector(id, path) {
  return `[data-entry-key="${CSS.escape(fieldKey(id, path))}"]`;
}
function listRows(item, container, options = {}) {
  const listKey = fieldKey(item.id, container.path);
  const now = () => value(item, container.path) || [];
  const current = now();
  const columns = tableColumns(item, container);
  const rowSelector = (index) => `[data-list="${CSS.escape(listKey)}"] > [data-index="${index}"]`;
  const write = (next, focusIndex, permutation) => {
    if (permutation) remapDisclosures(item.id, container.path, permutation);
    changed(item.id, container.path, next);
    if (focusIndex !== undefined) pendingFocus = `${rowSelector(focusIndex)} .grip`;
    rerender();
    previewList(item, container.path);
  };
  const moveTo = (from, to) => {
    stageInputs();
    if (from === to || to < 0 || to >= now().length) return;
    const next = structuredClone(now());
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const permutation = range(now().length);
    permutation.splice(to, 0, permutation.splice(from, 1)[0]);
    write(next, to, permutation);
  };
  const removeAt = (index) => {
    stageInputs();
    const next = structuredClone(now());
    next.splice(index, 1);
    write(
      next,
      undefined,
      range(now().length).filter((i) => i !== index),
    );
  };
  const list = el("ul", { class: "rows" + (columns ? " table" : ""), "data-list": listKey, "aria-label": fieldLabel(container) });
  if (columns) list.style.setProperty("--cols", String(columns.length));
  current.forEach((entry, index) => {
    const entryPath = [...container.path, index];
    const primitive = entry === null || typeof entry !== "object";
    const summary = primitive ? null : entrySummary(item, entryPath, entry);
    const row = el("li", { "data-index": String(index), "data-entry-key": fieldKey(item.id, entryPath) });
    // Tags are a set: their order changes nothing on the page.
    const reorderable = current.length > 1 && listPolicy(container).reorderable;
    let grip = null;
    if (reorderable) {
      grip = button(`„${summary ? summary.label : String(entry ?? "")}“ verschieben`, null, {
        icon: "grip-vertical",
        iconOnly: true,
        cls: "grip",
        title: "Ziehen oder mit Pfeiltasten verschieben",
      });
      grip.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          moveTo(index, index + (event.key === "ArrowUp" ? -1 : 1));
        }
      });
      grip.addEventListener("pointerdown", (event) => dragRow(event, list, row, index, moveTo));
    }
    const removable = current.length > (container.min || 0) && listPolicy(container).removable;
    if (columns) {
      if (grip) row.append(grip);
      for (const column of columns) {
        const field = fieldsFor(item).find((f) => equal(f.path, [...entryPath, column.key]));
        const control = field && fieldControl(item, field, { label: `${column.label} ${index + 1}` });
        const input = control?.querySelector("input,textarea,select");
        row.append(input || el("span", { class: "row-text", text: String(entry[column.key] ?? "") }));
      }
      if (removable) row.append(button("Zeile entfernen", () => removeAt(index), { icon: "x", iconOnly: true, cls: "row-remove" }));
    } else if (primitive) {
      if (grip) row.append(grip);
      const field = fieldsFor(item).find((f) => equal(f.path, entryPath));
      const input = field && fieldControl(item, field, { label: `${fieldLabel(container)} ${index + 1}` }).lastChild;
      // A text entry left empty disappears again instead of being saved as a blank value.
      input?.addEventListener("blur", () => {
        if (listPolicy(container).removable && input.value.trim() === "" && now()[index] !== undefined && String(now()[index]).trim() === "") removeAt(index);
      });
      row.append(input || el("span", { class: "row-text", text: String(entry) }));
      if (removable) row.append(button("Entfernen", () => removeAt(index), { icon: "x", iconOnly: true, cls: "row-remove" }));
    } else {
      row.classList.add("entry");
      const key = fieldKey(item.id, entryPath),
        bodyId = "entry-body-" + ++disclosureSeq,
        open = disclosureOpen(key);
      const toggle = el("button", { type: "button", class: "entry-toggle", "aria-expanded": String(open), "aria-controls": bodyId });
      if (summary.thumb) toggle.append(el("img", { class: "entry-thumb", src: summary.thumb, alt: "", loading: "lazy", decoding: "async" }));
      toggle.append(el("span", { class: "entry-label", text: summary.label }), icon("chevron-down"));
      const body = el("div", { class: "entry-body", id: bodyId, role: "group", "aria-label": summary.label });
      body.hidden = !open;
      const fill = () => body.childElementCount || put(body, entryBody(item, entryPath, container, { removeAt, now, write }));
      if (open) fill();
      toggle.addEventListener("click", () => {
        const next = toggle.getAttribute("aria-expanded") !== "true";
        openDisclosures.set(key, next);
        if (next) fill();
        toggle.setAttribute("aria-expanded", String(next));
        body.hidden = !next;
      });
      row.append(el("div", { class: "entry-head" }, grip, toggle), body);
    }
    list.append(row);
  });
  const head = columns
    ? el("div", { class: "table-head", style: `--cols:${columns.length}` }, el("span"), columns.map((c) => el("span", { text: c.label })), el("span"))
    : null;
  const parts = [
    options.bare ? null : el("span", { class: "row-label", text: fieldLabel(container) }),
    current.length ? [head, list] : el("p", { class: "note", text: "Noch keine Einträge." }),
  ].flat().filter(Boolean);
  if (listPolicy(container).insertable && container.elementTemplate !== undefined && (container.max === undefined || current.length < container.max))
    parts.push(
      button(
        "Eintrag hinzufügen",
        () => {
          stageInputs();
          const template = structuredClone(container.elementTemplate);
          const isObject = template && typeof template === "object";
          // New text entries start empty and focused; the schema's placeholder text is not content.
          const next = [...now(), isObject ? template : typeof template === "string" ? "" : template];
          changed(item.id, container.path, next);
          previewList(item, container.path);
          const added = rowSelector(next.length - 1);
          // A new complex entry opens in place with its first field focused; the panel stays where it is.
          if (isObject && !columns) openDisclosures.set(fieldKey(item.id, [...container.path, next.length - 1]), true);
          pendingFocus = isObject && !columns ? `${added} .entry-body :is(input,textarea,select)` : `${added} input`;
          rerender();
        },
        { icon: "plus", cls: "inline-button" },
      ),
    );
  return el("div", { class: "stack list-field" }, parts);
}
// Keys the media control owns for an image usage.

// The body of an open entry: its fields, images and nested lists in schema order, then duplicate/remove.
function entryBody(item, path, container, { removeAt, now, write }) {
  const direct = fieldsFor(item).filter((f) => f.path.length === path.length + 1 && under(f.path, path) && !isTechnical(f));
  // In contextual panels a larger entry keeps its on-page texts on the page; small ones are edited whole.
  const skipInline = renderMode !== "entity" && direct.length > 4;
  const own = containersFor(item).find((c) => equal(c.path, path));
  // An image entry is edited like every image (preview, replace, inherited alt text), its caption beside it.
  const controls =
    own && isMediaContainer(item, own)
      ? [
          mediaControl(item, path, { untitled: true }),
          ...direct
            .filter((f) => !mediaUsageKeys.has(f.path.at(-1)) && !(skipInline && inlineKeys.has(fieldKey(item.id, f.path))))
            .map((f) => fieldControl(item, f)),
        ]
      : subtreeControls(item, path, { skipInline });
  const index = path.at(-1);
  const list = now();
  const actions = [];
  if (listPolicy(container).insertable || listPolicy(container).removable) {
    if (listPolicy(container).insertable && container.elementTemplate !== undefined && (container.max === undefined || list.length < container.max))
      actions.push(
        button(
          "Duplizieren",
          () => {
            stageInputs();
            const next = structuredClone(now());
            next.splice(index + 1, 0, structuredClone(next[index]));
            // The copy sits right below and opens; later entries keep their own open state.
            remapDisclosures(item.id, container.path, range(next.length).map((i) => (i <= index ? i : i === index + 1 ? -1 : i - 1)));
            openDisclosures.set(fieldKey(item.id, [...container.path, index + 1]), true);
            write(next);
            toast("Dupliziert.", { action: undoLast });
          },
          { icon: "copy", cls: "inline-button" },
        ),
      );
    if (listPolicy(container).removable && list.length > (container.min || 0)) {
      const remove = button("Entfernen", null, { icon: "trash-2", cls: "inline-button danger" });
      confirmInPlace(remove, "Wirklich entfernen?", () => {
        removeAt(index);
        toast("Entfernt.", { action: undoLast });
      });
      actions.push(remove);
    }
  }
  return [
    el("div", { class: "entry-grid" }, controls.length ? controls : el("p", { class: "note", text: "Hier gibt es nichts weiter einzustellen." })),
    actions.length ? el("div", { class: "entry-actions" }, actions) : null,
  ];
}
function dragRow(event, list, row, from, moveTo) {
  if (event.button !== 0) return;
  event.preventDefault();
  // Capture on the list: the dragged row itself moves in the DOM, which would drop a capture on it.
  list.setPointerCapture(event.pointerId);
  row.classList.add("dragging");
  let to = from;
  const move = (e) => {
    const rows = [...list.children].filter((r) => r !== row);
    const after = rows.find((r) => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
    if ((after || null) === row.nextElementSibling) return;
    flip([...list.children], () => (after ? list.insertBefore(row, after) : list.append(row)));
    to = [...list.children].indexOf(row);
  };
  const end = () => {
    list.removeEventListener("pointermove", move);
    list.removeEventListener("pointerup", end);
    list.removeEventListener("pointercancel", end);
    row.classList.remove("dragging");
    if (to !== from) moveTo(from, to);
  };
  list.addEventListener("pointermove", move);
  list.addEventListener("pointerup", end);
  list.addEventListener("pointercancel", end);
}
// Rows that change place glide there (FLIP) instead of jumping; skipped with reduced motion.
function flip(nodes, mutate) {
  if (reducedMotion()) return mutate();
  const before = new Map(nodes.map((node) => [node, node.getBoundingClientRect()]));
  mutate();
  for (const [node, rect] of before) {
    const after = node.getBoundingClientRect();
    const dx = rect.left - after.left,
      dy = rect.top - after.top;
    if (dx || dy) node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 160, easing: "cubic-bezier(.2,.7,.3,1)" });
  }
}
function previewList() {
  // Filled in by the instant-preview mechanism.
}
// Sections that list a collection by query (FAQ by tags, projects, blog) create a matching record.
function collectionActions(item, index) {
  const section = item.data.sections?.[index];
  const kinds = { faq: ["faq/", "Frage hinzufügen"], projectGrid: ["project/", "Projekt hinzufügen"], postList: ["post/", "Blogartikel hinzufügen"] };
  const kind = kinds[section?.type];
  if (!kind || !recordTemplate(kind[0])) return null;
  const [prefix, label] = kind;
  return button(
    label,
    () => {
      stageInputs();
      const section = record(item.id)?.data.sections?.[index] || {};
      const preset = {};
      if (prefix === "faq/") {
        // Same tags as the section filter, ordered last, so the question appears in this section.
        if (section.tags?.length) preset.tags = [...section.tags];
        preset.order =
          Math.max(
            0,
            ...records()
              .filter((r) => r.id.startsWith("faq/"))
              .map((r) => Number(r.data.order) || 0),
          ) + 1;
      }
      openCreate(prefix, null, preset, (id) => {
        pushView({ id, path: [] }, "record");
        const limit = section.limit;
        const shown = records().filter((r) => r.id.startsWith(prefix)).length;
        toast(
          limit && shown > limit
            ? `Angelegt. Dieser Abschnitt zeigt höchstens ${limit} Einträge; der neue erscheint eventuell nicht hier.`
            : "Angelegt. Er erscheint nach dem Speichern in diesem Abschnitt.",
        );
      });
    },
    { icon: "plus", cls: "inline-button" },
  );
}

// Records ordered by a numeric field (FAQ `order`, global across sections): the moved records swap their
// values among themselves, all others keep theirs. One undo step.
function reorderRecords(ids, field) {
  stageInputs();
  const items = ids.map(record).filter(Boolean);
  const values = items.map((r) => Number(getPath(r.data, [field]))).sort((a, b) => a - b);
  if (!items.length || values.some((v) => !Number.isFinite(v))) return;
  if (new Set(values).size === values.length) {
    draft.group(() => items.forEach((r, i) => draft.set(r.id, [field], values[i])));
  } else {
    // Equal values cannot be swapped: renumber the whole collection in steps of 10, keeping every other
    // record where it was and the moved ones in their new order.
    const prefix = items[0].id.split("/")[0] + "/";
    const all = records()
      .filter((r) => r.id.startsWith(prefix))
      .sort((a, b) => (Number(getPath(a.data, [field])) || 0) - (Number(getPath(b.data, [field])) || 0) || a.id.localeCompare(b.id));
    const moved = new Set(items.map((r) => r.id));
    let next = 0;
    const order = all.map((r) => (moved.has(r.id) ? items[next++] : r));
    draft.group(() => order.forEach((r, i) => getPath(r.data, [field]) !== (i + 1) * 10 && draft.set(r.id, [field], (i + 1) * 10)));
  }
  syncFrame();
  update();
  rerender();
}
// The questions a FAQ section shows, in the order the page renders them, reorderable like any list.
function orderedRecordsControl(item, index) {
  let shown = null;
  try {
    shown = frame.contentWindow.flyingstarsEditorFrame?.orderedRecords?.(item.id, index);
  } catch {}
  if (!shown?.ids.length) return null;
  const list = el("ul", { class: "rows", "aria-label": "Reihenfolge" });
  const moveTo = (from, to) => {
    if (from === to || to < 0 || to >= shown.ids.length) return;
    const ids = [...shown.ids];
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    try {
      frame.contentWindow.flyingstarsEditorFrame.orderRecords(item.id, index, ids);
    } catch {}
    pendingFocus = `.rows [data-index="${to}"] .grip`;
    reorderRecords(ids, shown.field);
  };
  shown.ids.forEach((id, i) => {
    const linked = record(id);
    if (!linked) return;
    const row = el("li", { "data-index": String(i) });
    const grip = button(`„${recordName(linked)}“ verschieben`, null, { icon: "grip-vertical", iconOnly: true, cls: "grip", title: "Ziehen oder mit Pfeiltasten verschieben" });
    grip.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveTo(i, i + (event.key === "ArrowUp" ? -1 : 1));
      }
    });
    grip.addEventListener("pointerdown", (event) => dragRow(event, list, row, i, moveTo));
    const open = button(recordName(linked), () => pushView({ id, path: [] }, "record"), { cls: "row-open" });
    open.append(icon("chevron-right"));
    row.append(grip, open);
    list.append(row);
  });
  return el("div", { class: "stack" }, el("span", { class: "row-label", text: kindOf(shown.ids[0])[0] === "FAQ" ? "Fragen in diesem Abschnitt" : "Einträge in diesem Abschnitt" }), list);
}
function optionalVariants(item, prefix, { exact = false } = {}) {
  return optionalFieldsFor(item)
    .filter(
      (f) => (f.kind === "boolean" || (f.kind === "enum" && f.choices?.length)) && under(f.path, prefix) && (!exact || f.path.length === prefix.length + 1),
    )
    .filter((f) => value(item, f.path) === undefined && !isTechnical(f) && optionalFieldAllowed(f))
    .map((f) => fieldControl(item, f));
}
function sectionTitle(item, index) {
  const section = item.data.sections?.[index];
  return state.templates?.sections?.find((t) => t.type === section?.type)?.title || section?.type || "Abschnitt";
}
function sectionActions(item, index) {
  const sections = item.data.sections || [];
  const template = state.templates?.sections?.find((t) => t.type === sections[index]?.type);
  const min = item.schema?.properties?.sections?.min || 0;
  return actionGroup("Abschnitt", [
    actionRow("Abschnitt darunter einfügen", () => openSections(item.id, index + 1), "plus"),
    template?.maxInstances === 1 ? null : actionRow("Duplizieren", () => mutateSections(item.id, index, "duplicate"), "copy"),
    index > 0 ? actionRow("Nach oben", () => mutateSections(item.id, index, "up"), "arrow-up") : null,
    index < sections.length - 1 ? actionRow("Nach unten", () => mutateSections(item.id, index, "down"), "arrow-down") : null,
    sections.length > min
      ? actionRow("Entfernen", () => mutateSections(item.id, index, "remove"), "trash-2", { danger: true, confirm: "Wirklich entfernen?" })
      : null,
  ]);
}
// ---------------------------------------------------------------------------
// Panel views. One object at a time: element → card → section / record, with Back.
// ---------------------------------------------------------------------------
let panelStack = [],
  panelAnchor = null,
  pendingFocus = null,
  // "entity" (record overview: everything open) or "compact" (contextual panels: entries start closed).
  renderMode = "compact",
  disclosureSeq = 0;
// Explicit open/closed choices of entry disclosures and "Weitere Felder", by record + path.
const openDisclosures = new Map();
function viewExists(view) {
  const item = record(view.context.id);
  const path = view.context.path || [];
  return !!item && (!path.length || view.scope === "element" || getPath(item.data, path) !== undefined);
}
function rerender() {
  if ($("#panel").hidden) return;
  panelStack = panelStack.filter(viewExists);
  if (panelStack.length) renderTop({ keepScroll: true });
  else closePanel();
}
function openInspector(context, scope = "element", anchor, { docked = false } = {}) {
  stageInputs();
  const item = record(context?.id) || currentPage();
  if (!item) return;
  context = structuredClone(context || { id: item.id, path: [] });
  if (!context.id) context.id = item.id;
  panelStack = [{ context, scope }];
  panelAnchor = docked ? null : anchor || null;
  renderTop();
}
function pushView(context, scope) {
  stageInputs();
  panelStack.push({ context: structuredClone(context), scope });
  renderTop({ keepPlace: true });
}
// A step within the same object (an entry → its parent entry, an element → its card) replaces the view in
// place instead of stacking another one; the target is revealed (opened, scrolled to, focused).
// Scrolls the panel body vertically only (scrollIntoView would also shift the panel sideways by the
// resize handles' overhang): the node's top stays visible, as much of the rest as fits.
function revealInPanel(node, { smooth = false } = {}) {
  const body = $("#panel-body");
  if (!node || !body.contains(node)) return;
  const box = body.getBoundingClientRect(),
    rect = node.getBoundingClientRect();
  let top = body.scrollTop;
  if (rect.top < box.top) top -= box.top - rect.top;
  else if (rect.bottom > box.bottom) top += Math.min(rect.bottom - box.bottom, rect.top - box.top);
  if (top !== body.scrollTop) body.scrollTo({ top, behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
}
function revealView(context, scope) {
  stageInputs();
  panelStack[panelStack.length - 1] = { context: structuredClone(context), scope };
  renderTop({ keepPlace: true });
}
function popView() {
  if (panelStack.length < 2) return closePanel();
  stageInputs();
  panelStack.pop();
  renderTop({ keepPlace: true });
}
function recordName(item) {
  return inlinePlain(recordTitle(item));
}
function navRow(label, run, iconName) {
  const row = button(label, run, { icon: iconName, cls: "action nav" });
  row.append(icon("chevron-right"));
  return row;
}
function sectionOf(context) {
  if (context.section) return context.section;
  const path = context.path || [];
  return path[0] === "sections" && Number.isInteger(path[1]) ? { id: context.id, index: path[1] } : null;
}
// Lists whose order is bound to something else (table cells follow their columns) never move or shrink alone.
function entryPrefixOf(item, path) {
  // Deepest array entry above the clicked field: sections,3,tiers,1,name → sections,3,tiers,1.
  let found = null;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof path[i + 1] !== "number") continue;
    if (path[i] === "sections" && i === 0) continue;
    found = path.slice(0, i + 2);
  }
  return found;
}
function parentLinks(item, context, { from }) {
  const path = context.path || [];
  const section = sectionOf(context);
  const sectionRecord = section && record(section.id);
  const rows = [];
  const stamped = (from === "element" || from === "media") && context.entry && record(context.entry.id) ? context.entry : null;
  const entryOwner = stamped ? record(stamped.id) : item;
  const entry = stamped ? stamped.path : from === "element" || from === "media" ? entryPrefixOf(item, path) : null;
  if (entry && getPath(entryOwner.data, entry) !== undefined) {
    const container = containersFor(entryOwner).find((c) => equal(c.path, entry.slice(0, -1)));
    rows.push(
      navRow(
        `${fieldLabel(container || { path: entry.slice(0, -1) })}: „${listLabel(entryOwner, entry)}“`,
        () => revealView({ id: entryOwner.id, path: entry, section, record: stamped?.record, reveal: path }, "entry"),
        "layers",
      ),
    );
  }
  const rendered = from === "entry" && context.record && record(context.record);
  if (rendered)
    rows.push(
      navRow(`${kindOf(rendered.id)[0]} „${recordName(rendered)}“ bearbeiten`, () => pushView({ id: rendered.id, path: [] }, "record"), kindOf(rendered.id)[1]),
    );
  const parentEntry = from === "entry" ? entryPrefixOf(item, path.slice(0, -1)) : null;
  if (parentEntry)
    rows.push(
      navRow(`„${listLabel(item, parentEntry)}“`, () => revealView({ id: item.id, path: parentEntry, section, reveal: path }, "entry"), "layers"),
    );
  const ownRecord = !item.id.startsWith("page/") && !item.id.startsWith("screen/");
  if (ownRecord && from !== "record")
    rows.push(navRow(`${kindOf(item.id)[0]} „${recordName(item)}“ bearbeiten`, () => pushView({ id: item.id, path: [] }, "record"), kindOf(item.id)[1]));
  if (sectionRecord && from !== "section")
    rows.push(
      navRow(
        `Abschnitt „${sectionTitle(sectionRecord, section.index)}“`,
        () => pushView({ id: section.id, path: ["sections", section.index] }, "section"),
        sectionIcon(sectionRecord.data.sections?.[section.index)?.type] || "panel-top",
      ),
    );
  return actionGroup(rows.length ? "Gehört zu" : null, rows);
}

// The title says what the panel is; the kind beside it is context. When the head gets tight (language
// control, narrow panel) the kind gives way first and is hidden rather than shrunk to "…".
function fitPanelHead() {
  const kind = $("#panel-kind");
  kind.hidden = false;
  kind.title = kind.textContent;
  if (kind.textContent && kind.scrollWidth > kind.clientWidth && kind.clientWidth < 64) kind.hidden = true;
}
new ResizeObserver(() => !$("#panel").hidden && fitPanelHead()).observe($(".panel-head"));
function renderTop({ keepScroll = false, keepPlace = false } = {}) {
  const view = panelStack.at(-1);
  const item = record(view.context.id);
  if (!item) return closePanel();
  const panel = $("#panel"),
    body = $("#panel-body"),
    scroll = keepScroll ? body.scrollTop : 0,
    previous = (keepPlace || keepScroll) && !panel.hidden && panel.style.left ? panelPlace() : null;
  currentInspector = { context: view.context, scope: view.scope, anchor: panelAnchor };
  selection = { ...view.context };
  renderMode = view.scope === "record" ? "entity" : "compact";
  // A revealed path opens every entry on the way to it (once, when the view is first drawn).
  const reveal = !keepScroll && Array.isArray(view.context.reveal) ? view.context.reveal : null;
  if (reveal)
    for (let i = 1; i <= reveal.length; i++)
      if (typeof reveal[i - 1] === "number" && i > (view.context.path || []).length) openDisclosures.set(fieldKey(item.id, reveal.slice(0, i)), true);
  body.replaceChildren();
  panel.scrollLeft = 0;
  $("#panel-actions").replaceChildren();
  overviewObserver?.disconnect();
  const head = (title, iconName, kind) =>
    showPanel({ title, iconName, kind, anchor: panelAnchor, docked: !panelAnchor, size: view.scope === "record" ? "overview" : "compact" });
  $("#panel").classList.remove("wide");
  const renderers = { element: elementView, entry: entryView, instance: instanceView, section: sectionView, media: mediaView, record: recordView, page: pageView, field: fieldView };
  panelTranslatable = false;
  (renderers[view.scope] || elementView)(body, item, view.context, head);
  if (panelTranslatable) $("#panel-actions").append(localeSwitch("panel-locale"));
  if (!body.children.length) put(body, group(null, el("p", { class: "note", text: "Hier gibt es nichts weiter einzustellen." })));
  $("#panel-back").hidden = panelStack.length < 2;
  update();
  placePanel(panelAnchor, previous);
  fitPanelHead();
  body.scrollTop = scroll;
  if (reveal && !pendingFocus) {
    let target = body.querySelector(`[data-field-key="${CSS.escape(fieldKey(item.id, reveal))}"]`);
    for (let i = reveal.length; i > 0 && !target; i--) target = body.querySelector(entryKeySelector(item.id, reveal.slice(0, i)));
    if (target) {
      revealInPanel(target);
      (target.matches("input,textarea,select,button") ? target : target.querySelector(".entry-toggle,input,textarea,select,button"))?.focus({ preventScroll: true });
      return;
    }
  }
  if (pendingFocus) {
    body.querySelector(pendingFocus)?.focus({ preventScroll: true });
    pendingFocus = null;
  } else if (!keepScroll) (panelStack.length > 1 ? $("#panel-back") : panel).focus({ preventScroll: true });
}

// Right-click on one element: only what belongs to that element, then where it belongs.
function elementView(body, item, context, head) {
  const path = context.path || [];
  const field = fieldsFor(item).find((f) => equal(f.path, path));
  const section = sectionOf(context);
  const sectionRecord = section && record(section.id);
  head(
    field ? fieldLabel(field) : "Element",
    field?.kind === "text" ? "type" : "settings",
    sectionRecord ? sectionTitle(sectionRecord, section.index) : recordName(item),
  );
  const controls = [];
  if (field && (context.derived || !inlineKeys.has(fieldKey(item.id, path)))) controls.push(fieldControl(item, field));
  if (context.derived) controls.push(el("p", { class: "note", text: "Gilt für alle Preisangaben dieses Pakets." }));
  // A field inside a small group (Button = Beschriftung + Link, Bild = Datei + Alt-Text) opens with its siblings.
  const parent = path.slice(0, -1);
  const groupFields = fieldsFor(item).filter((f) => f.path.length === path.length && under(f.path, parent));
  // Only small groups such as a button (label + link) open together; large objects are not "one element".
  const isGroup = parent.length > 0 && typeof parent.at(-1) !== "number" && !(parent.length === 2 && parent[0] === "sections") && groupFields.length <= 3;
  const groupContainer = isGroup && containersFor(item).find((c) => equal(c.path, parent));
  if (isGroup) {
    for (const sibling of fieldsFor(item))
      if (
        sibling.path.length === path.length &&
        under(sibling.path, parent) &&
        !equal(sibling.path, path) &&
        !isTechnical(sibling) &&
        !inlineKeys.has(fieldKey(item.id, sibling.path))
      )
        controls.push(fieldControl(item, sibling));
    controls.push(...optionalVariants(item, parent, { exact: true }));
  }
  put(body, group(null, controls));
  const actions = [translateAction(item, field)];
  if (groupContainer?.optional)
    actions.push(
      actionRow(`${fieldLabel(groupContainer)} entfernen`, () => removeOptional(item, parent), "trash-2", { danger: true, confirm: "Wirklich entfernen?" }),
    );
  else if (field?.optional)
    actions.push(actionRow(`${fieldLabel(field)} entfernen`, () => removeOptional(item, path), "trash-2", { danger: true, confirm: "Wirklich entfernen?" }));
  put(body, actionGroup(null, actions));
  put(body, parentLinks(item, context, { from: "element" }));
}
function removeOptional(item, path) {
  changed(item.id, path, undefined);
  closePanel();
  toast("Entfernt.", { action: undoLast });
}

// ---------------------------------------------------------------------------
// Instance: one card on the canvas. First what this card renders (read from the page's markers), its own
// values and, owned elsewhere, the shared record's (with a note); everything else of the card under one
// closed "Weitere Felder (N)". The complete record stays an explicit step ("… bearbeiten").
// ---------------------------------------------------------------------------
let lastInstanceMarkers = "";
// A card opened from the canvas; the clicked part is revealed (entries on the way to it open).
function instanceContext(data) {
  const focus = data.focus || null;
  return {
    id: data.id,
    path: data.path,
    record: data.record,
    section: data.section,
    occurrence: data.occurrence,
    focus,
    reveal: focus && focus.id === data.id ? focus.path : undefined,
  };
}
function occurrenceMarkers(context) {
  try {
    return frame.contentWindow.flyingstarsEditorFrame?.occurrenceMarkers?.(context.occurrence) || [];
  } catch {
    return [];
  }
}
const markersKey = (markers) => JSON.stringify(markers.map((m) => m.id + JSON.stringify(m.path)).sort());
function unitsOf(item, prefix) {
  const inPrefix = (path) => path.length > prefix.length && under(path, prefix);
  const containers = containersFor(item)
    .filter((c) => inPrefix(c.path) && !isTechnical(c))
    .map((c) => {
      const media = isMediaContainer(item, c);
      const source = c.kind === "array" && !media ? choiceSource(item, c) : null;
      const chosen = source ? value(item, c.path) || [] : [];
      const candidates = source ? source.options.filter((o) => !chosen.some((id) => o.key === id || o.alias === id)).length : 0;
      return { ...c, media, reference: !!source, candidates };
    });
  const fields = fieldsFor(item)
    .filter((f) => inPrefix(f.path) && !isTechnical(f))
    .map((f) => ({ ...f, inline: inlineKeys.has(fieldKey(item.id, f.path)) }));
  const optionalFields = optionalFieldsFor(item).filter((f) => inPrefix(f.path) && !isTechnical(f) && optionalFieldAllowed(f));
  return scopeUnits({ fields, containers, optionalFields, data: item.data, prefix });
}
// One control per unit; labels name the parent group for nested fields ("Link · Ziel").
function unitControl(item, unit, prefix) {
  const container = () => containersFor(item).find((c) => equal(c.path, unit.path)) || { path: unit.path };
  if (unit.kind === "field" || unit.kind === "variant") {
    const field = (unit.kind === "field" ? fieldsFor(item) : optionalFieldsFor(item)).find((f) => equal(f.path, unit.path));
    if (!field) return null;
    const parent = unit.path.length - prefix.length > 1 ? unit.path.at(-2) : null;
    return fieldControl(item, field, { label: parent !== null && typeof parent !== "number" ? fieldLabel({ path: [parent] }) + " · " + fieldLabel(field) : fieldLabel(field) });
  }
  if (unit.kind === "media") return mediaControl(item, unit.path, { title: fieldLabel(container()) });
  if (unit.kind === "array" || unit.kind === "candidates") {
    const c = container();
    const source = choiceSource(item, c);
    if (source) return referenceControl(item, c, source, { part: unit.kind === "candidates" ? "candidates" : unit.shown ? "chosen" : "all" });
    return listRows(item, c);
  }
  if (unit.kind === "add") {
    const optional = optionalFieldsFor(item).find((f) => equal(f.path, unit.path));
    const c = containersFor(item).find((x) => equal(x.path, unit.path));
    const template = c ? c.template : optional?.template;
    const isImage = (c || optional)?.format === "image";
    return button(
      fieldLabel(c || optional || { path: unit.path }) + (isImage ? " hinzufügen" : " ergänzen"),
      () => (isImage ? openMedia({ id: item.id, path: unit.path }) : (changed(item.id, unit.path, structuredClone(template)), rerender())),
      { icon: isImage ? "image" : "plus", cls: "inline-button" },
    );
  }
  return null;
}
// The clicked element's control comes first and is marked; focus moves there when the panel opens.
function placeFocus(units, focus, ownerId) {
  if (!focus || focus.id !== ownerId) return units;
  const index = units.findIndex((u) => u.path.length <= focus.path.length && under(focus.path, u.path));
  if (index < 0) return units;
  const marked = { ...units[index], focus: true };
  return [marked, ...units.slice(0, index), ...units.slice(index + 1)];
}
function moreDisclosure(item, units, prefix, key) {
  if (!units.length) return null;
  if (units.some((unit) => unit.kind === "field" && isTranslatable(item, fieldsFor(item).find((f) => equal(f.path, unit.path))))) panelTranslatable = true;
  const details = el("details", { class: "more" }, el("summary", {}, el("span", { text: `Weitere Felder (${units.length})` }), icon("chevron-down")));
  // Filled when first opened: the closed disclosure costs nothing to draw.
  const fill = () => details.querySelector(":scope > .group") || put(details, group(null, units.map((unit) => unitControl(item, unit, prefix))));
  if (openDisclosures.get(key) === true) {
    details.open = true;
    fill();
  }
  details.addEventListener("toggle", () => {
    if (openDisclosures.get(key) === details.open) return;
    openDisclosures.set(key, details.open);
    if (!details.open) return;
    fill();
    // The opened fields come into view below the summary that was clicked.
    revealInPanel(details.querySelector(":scope > .group"), { smooth: true });
  });
  return details;
}
function instanceView(body, item, context, head) {
  const path = context.path || [];
  const shared = context.record && context.record !== item.id ? record(context.record) : null;
  const markers = occurrenceMarkers(context);
  lastInstanceMarkers = markersKey(markers);
  const container = path.length ? containersFor(item).find((c) => equal(c.path, path.slice(0, -1))) : null;
  if (path.length) head(listLabel(item, path), "layers", fieldLabel(container || { path: path.slice(0, -1) }));
  else head(recordName(item), kindOf(item.id)[1], kindOf(item.id)[0]);
  // Small entries (a table row, a step) are edited whole, including their on-page texts.
  const units = unitsOf(item, path);
  const own = partitionUnits(units, markers, { id: item.id, path }, { includeInline: path.length > 0 && units.length <= 4 });
  const sharedShown = shared ? partitionUnits(unitsOf(shared, []), markers, { id: shared.id, path: [] }).shown : [];
  const focus = context.focus;
  const draw = (owner, units, prefix) =>
    placeFocus(units, focus, owner.id).map((unit) => {
      const control = unitControl(owner, { ...unit, shown: true }, prefix);
      if (control && unit.focus) control.classList.add("is-focus");
      return control;
    });
  put(body, group(null, draw(item, own.shown, path)));
  if (sharedShown.length)
    put(
      body,
      group(`${kindOf(shared.id)[0]} „${recordName(shared)}“`, draw(shared, sharedShown, []), el("p", { class: "note", text: `Gilt überall, wo ${recordName(shared)} erscheint.` })),
    );
  put(body, moreDisclosure(item, own.more, path, "more:" + fieldKey(item.id, path)));
  // The clicked text can be translated from its card as from its own element panel.
  const focusOwner = focus?.kind === "field" ? record(focus.id) : null;
  const translate = focusOwner ? translateAction(focusOwner, fieldsFor(focusOwner).find((f) => equal(f.path, focus.path))) : null;
  put(body, path.length ? entryActionGroup(item, path, container, [translate]) : actionGroup(null, [translate]));
  put(body, parentLinks(item, context, { from: "entry" }));
  // Keyboard focus goes to the clicked element once, when the card opens.
  if (focus && !context.focused) {
    context.focused = true;
    const target = body.querySelector(".is-focus");
    const row = focus.kind === "entry" ? target?.querySelector(entryKeySelector(focus.id, focus.path)) : null;
    const scope = row || target;
    const node = scope?.querySelector("input,textarea,select") || scope?.querySelector(".entry-toggle,button");
    if (node) {
      node.dataset.focusTarget = "true";
      pendingFocus = '[data-focus-target="true"]';
    }
  }
}
// Duplicate/remove of a card opened on its own (from the canvas).
function entryActionGroup(item, path, container, lead = []) {
  const list = value(item, path.slice(0, -1)) || [];

  const entry = value(item, path);
  return actionGroup(null, [
    ...lead,
    listPolicy(container).insertable && container?.elementTemplate !== undefined && (container.max === undefined || list.length < container.max)
      ? actionRow(
          "Duplizieren",
          () => {
            const next = structuredClone(list);
            next.splice(path.at(-1) + 1, 0, structuredClone(entry));
            changed(item.id, path.slice(0, -1), next);
            popView();
            toast("Dupliziert.", { action: undoLast });
          },
          "copy",
        )
      : null,
    listPolicy(container).removable && list.length > (container?.min || 0)
      ? actionRow(
          "Entfernen",
          () => {
            const next = structuredClone(list);
            next.splice(path.at(-1), 1);
            changed(item.id, path.slice(0, -1), next);
            popView();
            toast("Entfernt.", { action: undoLast });
          },
          "trash-2",
          { danger: true, confirm: "Wirklich entfernen?" },
        )
      : null,
  ]);
}

// One card / list entry: its variants, its images and lists, then remove; moving happens by drag in the list.
function entryView(body, item, context, head) {
  const path = context.path;
  const entry = value(item, path);
  const container = containersFor(item).find((c) => equal(c.path, path.slice(0, -1)));
  head(listLabel(item, path), "layers", fieldLabel(container || { path: path.slice(0, -1) }));
  const variants = fieldsFor(item).filter(
    (f) => f.path.length === path.length + 1 && under(f.path, path) && ["enum", "boolean"].includes(f.kind) && !isTechnical(f),
  );
  // A card showing another record (a package on the homepage) also offers that record's own switches,
  // e.g. the recommendation; they apply wherever the record appears, which the note says.
  const shown = context.record && context.record !== item.id ? record(context.record) : null;
  const shared = shown ? fieldsFor(shown).filter((f) => f.path.length === 1 && f.kind === "boolean" && !isTechnical(f)) : [];
  put(
    body,
    group(
      "Darstellung",
      variants.map((f) => fieldControl(item, f)),
      optionalVariants(item, path, { exact: true }),
      shared.map((f) => fieldControl(shown, f)),
      shared.length ? el("span", { class: "note", text: `Gilt überall, wo ${recordName(shown)} erscheint.` }) : null,
    ),
  );
  // A small entry (a table cell: label, text, rating) is edited as a whole, including its on-page text.
  const direct = fieldsFor(item).filter((f) => f.path.length === path.length + 1 && under(f.path, path) && !isTechnical(f));
  put(body, group("Inhalt", contentControls(item, path, { depthLimit: 1, skipKinds: ["enum", "boolean"], includeInline: direct.length <= 4 })));
  put(body, entryActionGroup(item, path, container));
  put(body, parentLinks(item, context, { from: "entry" }));
}

function sectionView(body, item, context, head) {
  const index = context.path[1];
  const base = ["sections", index];
  const section = item.data.sections?.[index];
  head(sectionTitle(item, index), sectionIcon(section?.type) || "panel-top", "Abschnitt");
  const variants = fieldsFor(item).filter((f) => f.path.length === 3 && under(f.path, base) && ["enum", "boolean"].includes(f.kind) && !isTechnical(f));
  put(
    body,
    group(
      "Darstellung",
      variants.map((f) => fieldControl(item, f)),
      optionalVariants(item, base, { exact: true }),
    ),
  );
  // Section-level settings only; text and links of single elements open from the element itself.
  put(
    body,
    group(
      "Inhalt",
      contentControls(item, base, { depthLimit: 1, fieldDepth: 1, skipKinds: ["enum", "boolean"] }),
      orderedRecordsControl(item, index),
      collectionActions(item, index),
    ),
  );
  put(body, sectionActions(item, index));
}
function mediaView(body, item, context, head) {
  const section = sectionOf(context);
  const sectionRecord = section && record(section.id);
  head("Bild", "image", sectionRecord ? sectionTitle(sectionRecord, section.index) : recordName(item));
  put(body, group(null, mediaControl(item, context.path, { untitled: true })));
  put(body, parentLinks(item, context, { from: "media" }));
}
// Record overview: everything of one record on one wide sheet. The groups come from the schema
// itself (direct fields first, then each object and list in schema order); a record that wraps nearly
// everything in one object (project → showcase) is grouped one level deeper. Long records get an index.
let overviewObserver = null;
function overviewGroups(item) {
  const all = fieldsFor(item);
  const fields = all.filter((f) => !isTechnical(f));
  const containers = containersFor(item).filter((c) => c.path.length && !(c.path.length === 1 && c.path[0] === "sections"));
  const editable = (c) => (c.kind === "object" || c.kind === "array") && !isMediaContainer(item, c) && !isTechnical(c);
  let base = [];
  for (;;) {
    const inner = containers.find(
      (c) =>
        c.kind === "object" &&
        !isMediaContainer(item, c) &&
        c.path.length === base.length + 1 &&
        under(c.path, base) &&
        fields.filter((f) => under(f.path, c.path)).length > fields.length * 0.6,
    );
    if (!inner) break;
    base = inner.path;
  }
  const parentIs = (c, p) => c.path.length === p.length + 1 && under(c.path, p);
  const roots = containers.filter((c) => editable(c) && (parentIs(c, []) || parentIs(c, base)) && !under(base, c.path));
  // Schema order: the position of the first field (or the container itself) in the depth-first listing.
  const rank = (path) => {
    const index = all.findIndex((f) => under(f.path, path));
    return index < 0 ? all.length + containersFor(item).findIndex((c) => equal(c.path, path)) : index;
  };
  roots.sort((a, b) => rank(a.path) - rank(b.path));
  const inRoot = (path) => roots.some((r) => under(path, r.path));
  const general = { title: "Allgemein", path: null, fields: fields.filter((f) => !inRoot(f.path) && !mediaPathOf(item, f.path)), media: [] };
  general.media = containers.filter((c) => isMediaContainer(item, c) && !inRoot(c.path) && value(item, c.path) !== undefined);
  return { base, general, roots };
}
function mediaPathOf(item, path) {
  return containersFor(item).some((c) => c.path.length < path.length && under(path, c.path) && isMediaContainer(item, c));
}
// Direct children of one object in schema order: fields, images, lists and nested objects (as subheadings).
function subtreeControls(item, prefix, { skipInline = false } = {}) {
  // A container's own explanation from the schema (help/hint) stands above its fields.
  const own = containersFor(item).find((c) => equal(c.path, prefix));
  const out = [own?.help, own?.hint].filter(Boolean).map((text) => el("p", { class: "note wide-row", text }));
  const children = [];
  const seen = new Set();
  const consider = (path, node) => {
    const key = pathKey(path.slice(0, prefix.length + 1));
    if (seen.has(key)) return;
    seen.add(key);
    children.push(node);
  };
  for (const f of fieldsFor(item)) {
    if (!under(f.path, prefix) || f.path.length <= prefix.length) continue;
    const childPath = f.path.slice(0, prefix.length + 1);
    const container = f.path.length > prefix.length + 1 ? containersFor(item).find((c) => equal(c.path, childPath)) : null;
    consider(childPath, container ? { container } : { field: f });
  }
  for (const c of containersFor(item))
    if (c.path.length === prefix.length + 1 && under(c.path, prefix)) consider(c.path, { container: c });
  for (const child of children) {
    if (child.field) {
      if (!isTechnical(child.field) && !(skipInline && inlineKeys.has(fieldKey(item.id, child.field.path)))) out.push(fieldControl(item, child.field));
      continue;
    }
    const c = child.container;
    if (isMediaContainer(item, c)) {
      if (value(item, c.path) !== undefined) out.push(mediaControl(item, c.path, { title: fieldLabel(c) }));
    } else if (c.kind === "array") {
      const source = choiceSource(item, c);
      out.push(source ? referenceControl(item, c, source) : listRows(item, c, { includeInline: true }));
    } else if (c.kind === "object" && value(item, c.path) !== undefined) {
      const inner = subtreeControls(item, c.path, { skipInline });
      if (inner.length) out.push(el("div", { class: "subgroup" }, el("h4", { class: "subgroup-title", text: fieldLabel(c) }), inner));
    }
  }
  const advanced = fieldsFor(item).filter((f) => f.path.length === prefix.length + 1 && under(f.path, prefix) && isTechnical(f));
  if (advanced.length) {
    const holder = el("div", { class: "wide-row" });
    appendAdvanced(holder, item, advanced);
    out.push(holder);
  }
  out.push(...optionalVariants(item, prefix, { exact: true }));
  const additions = additionButtons(item, prefix);
  if (additions.length) out.push(el("div", { class: "seg wide-row" }, additions));
  return out;
}
// What the schema allows to add directly under prefix but the record does not have yet.
function additionButtons(item, prefix) {
  const additions = [];
  for (const optional of optionalFieldsFor(item)) {
    if (optional.path.length !== prefix.length + 1 || !under(optional.path, prefix) || value(item, optional.path) !== undefined) continue;
    if (isTechnical(optional) || ["boolean", "enum"].includes(optional.kind)) continue;
    const isImage = optional.format === "image";
    additions.push(
      button(
        fieldLabel(optional) + (isImage ? " hinzufügen" : " ergänzen"),
        () => (isImage ? openMedia({ id: item.id, path: optional.path }) : (changed(item.id, optional.path, optional.template), rerender())),
        { icon: isImage ? "image" : "plus", cls: "inline-button" },
      ),
    );
  }
  return additions;
}
function recordView(body, item, context, head) {
  const [kindName, kindIcon] = kindOf(item.id);
  head(recordName(item), kindIcon, kindName);
  if (item.route) $("#panel-actions").append(button("Auf der Seite bearbeiten", () => editOnPage(item), { icon: "pencil", cls: "primary panel-action" }));
  const { base, general, roots } = overviewGroups(item);
  const blocks = [];
  // Flat fields can name their group in the schema (.meta({ group: "Einordnung" })); the rest is "Allgemein".
  const named = [...new Set(general.fields.map((f) => f.group).filter(Boolean))];
  const rootAdditions = [...additionButtons(item, []), ...(base.length ? additionButtons(item, base) : [])];
  const generalControls = [
    ...general.fields.filter((f) => !f.group).map((f) => fieldControl(item, f)),
    ...general.media.map((c) => mediaControl(item, c.path, { title: fieldLabel(c) })),
    ...optionalVariants(item, [], { exact: true }),
    rootAdditions.length ? el("div", { class: "seg wide-row" }, rootAdditions) : null,
  ].filter(Boolean);
  if (item.id.startsWith("media/")) generalControls.unshift(mediaRecordPreview(item));
  if (generalControls.length) blocks.push({ title: "Allgemein", controls: generalControls });
  for (const title of named) blocks.push({ title, controls: general.fields.filter((f) => f.group === title).map((f) => fieldControl(item, f)) });
  for (const root of roots) {
    let controls;
    if (root.kind === "array") {
      const source = choiceSource(item, root);
      controls = [source ? referenceControl(item, root, source) : listRows(item, root, { includeInline: true, bare: true })];
    } else controls = subtreeControls(item, root.path);
    if (controls.length) blocks.push({ title: fieldLabel(root), controls });
  }
  if (item.id.startsWith("media/")) blocks.push(mediaUsageBlock(item));
  const indexed = blocks.length >= 3;
  $("#panel").dataset.sparse = String(!indexed);
  const sections = blocks.map((block, i) =>
    el("section", { class: "ov-group", id: "ov-" + i }, el("h3", { class: "ov-title", text: block.title }), el("div", { class: "ov-grid" }, block.controls)),
  );
  const actions = recordActions(item);
  const main = el("div", { class: "ov-main" }, sections, actions);
  if (!indexed) return put(body, el("div", { class: "overview" }, main));
  const links = blocks.map((block, i) =>
    button(block.title, () => body.querySelector("#ov-" + i)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" }), {
      cls: "ov-link",
    }),
  );
  const nav = el("nav", { class: "ov-nav", "aria-label": "Bereiche" }, links);
  put(body, el("div", { class: "overview indexed" }, nav, main));
  // The index follows the scroll position (one observer at a time).
  overviewObserver?.disconnect();
  const observer = (overviewObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      const index = sections.indexOf(visible.target);
      links.forEach((link, i) => link.setAttribute("aria-current", String(i === index)));
    },
    { root: body, rootMargin: "0px 0px -70% 0px" },
  ));
  sections.forEach((section) => observer.observe(section));
  links[0]?.setAttribute("aria-current", "true");
}
function pageView(body, item, context, head) {
  const label = pageChoices().find((choice) => choice.value === route)?.label;
  head("Seiteneinstellungen", "settings", label);
  // Only what has no place on the canvas: headline and intro are edited on the page itself.
  const pageFields = fieldsFor(item).filter((f) => f.path[0] !== "sections" && !inlineKeys.has(fieldKey(item.id, f.path)));
  put(
    body,
    group(
      "Suchmaschinen & Teilen",
      pageFields.filter((f) => !isTechnical(f) && f.path.length === 1).map((f) => fieldControl(item, f)),
    ),
  );
  put(body, group("Inhalt", contentControls(item, [], { depthLimit: 1, skipKinds: ["text", "number", "enum", "boolean"] })));
  appendAdvanced(body, item, pageFields.filter(isTechnical));
}
function fieldView(body, item, context, head) {
  const field = fieldsFor(item).find((f) => equal(f.path, context.path));
  head(field ? fieldLabel(field) : "Feld", "settings", recordName(item));
  if (field) put(body, group(null, fieldControl(item, field)));
}
function appendAdvanced(body, item, fields) {
  if (!fields.length) return;
  const key = "advanced:" + fieldKey(item.id, fields[0].path.slice(0, -1));
  put(body, rememberedDisclosure(key, el("span", { text: "Erweitert" }), group(null, fields.map((f) => fieldControl(item, f))), { cls: "more", open: openDisclosures.get(key) === true }));
}
// A record with its own page is best edited there: offered at the top of its overview.
function editOnPage(item) {
  closePanel();
  if (draft.created.has(item.id)) return toast("Neue Seiten erscheinen nach dem Speichern.");
  if (normalizedRoute(item.route) === route) return toast("Du bist schon auf dieser Seite.");
  navigate(item.route);
}
function recordActions(item) {
  // An image still in use cannot be deleted; the usage list above says where to replace it first.
  const usedBy = item.id.startsWith("media/") ? mediaUsers(records(), item).length : 0;
  if (usedBy)
    return actionGroup(null, [el("p", { class: "note", text: `Löschen ist möglich, sobald das Bild nirgends mehr verwendet wird (${usedBy}× verwendet).` })]);
  return actionGroup(null, [
    !["page/", "screen/", "package/", "site/"].some((p) => item.id.startsWith(p))
      ? actionRow(
          kindOf(item.id)[0] + " löschen",
          () => {
            stageInputs();
            draft.remove(item.id);
            closePanel();
            syncFrame();
            update();
            toast("„" + item.title + "“ wird beim Speichern gelöscht.", { action: undoLast });
          },
          "trash-2",
          { danger: true, confirm: "Wirklich löschen?" },
        )
      : null,
  ]);
}

// ---------------------------------------------------------------------------
// Save, undo, discard, publish
// ---------------------------------------------------------------------------
async function save() {
  if (busy || !ready) return;
  stageInputs();
  if (!draft.size) return;
  closeMenu();
  const viewId = nextViewRecordId || currentPage()?.id,
    previousRoute = route,
    count = draft.size;
  busy = true;
  update();
  syncFrame();
  try {
    if (!retry) retry = draft.request(initialHead, crypto.randomUUID());
    const result = await api("/editor/api/save", retry);
    state = result;
    initialHead = result.head;
    rememberSavedHead();
    draft.accept(result.records);
    retry = null;
    editing.clear();
    pendingTranslations.clear();
    if (result.buildError) {
      toast("Gespeichert, aber die Seite konnte nicht neu aufgebaut werden. Bitte Eingaben prüfen und erneut speichern.", { error: true });
      console.error(result.buildError);
      return;
    }
    const nextRoute = savedRecordRoute(result.records, viewId),
      sameView = normalizedRoute(nextRoute) === previousRoute,
      scroll = sameView ? frame.contentWindow.scrollY : 0;
    try {
      if (sameView) frame.dataset.restoreTransient = JSON.stringify(frame.contentWindow.flyingstarsEditorFrame?.transient());
    } catch {}
    busy = false;
    navigate(nextRoute + (sameView ? frame.contentWindow.location.search + frame.contentWindow.location.hash : ""), { reload: true });
    frame.dataset.restoreScroll = String(scroll);
    toast(count === 1 ? "Änderung gespeichert." : `${count} Änderungen gespeichert.`);
    refreshPublishState();
  } catch (error) {
    if (error.status === 409) retry = null;
    toast(error.message || "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.", { error: true });
  } finally {
    busy = false;
    update();
    syncFrame();
  }
}
function undoLast() {
  if (busy || !ready) return;
  const operation = draft.history.at(-1)?.operation;
  if (!draft.undo()) return;
  editing.clear();
  const previous = restoredInspector(currentInspector, records(), operation);
  if (previous) rerender();
  else {
    closePanel();
    selection = null;
  }
  syncFrame();
  update();
  if (operation?.kind === "set" && operation.path.length === 1 && operation.path[0] === "sections")
    send("restore-structure", { id: operation.id, records: stagedRecords() });
  toast("Rückgängig gemacht.");
}
function discardAll() {
  draft.discard();
  editing.clear();
  pendingTranslations.clear();
  retry = null;
  navigate(route, { reload: true });
  toast("Ungespeicherte Änderungen verworfen.");
}
// Publication overview: changes grouped by the kind of content they belong to, newest first within a
// group. Code of the site (components, scripts, schemas) is one collapsed group at the end.
const changeKinds = [
  { test: (id) => /^(page|screen)\//.test(id), title: "Seiten", icon: "file-text" },
  { test: (id) => /^(project|post)\//.test(id), title: "Projekte & Blog", icon: "newspaper" },
  { test: (id) => id.startsWith("faq/"), title: "Häufige Fragen", icon: "circle-help" },
  { test: (id) => id.startsWith("package/"), title: "Pakete & Preise", icon: "package" },
  { test: (id) => /^(client|team)\//.test(id), title: "Kunden & Team", icon: "users" },
  { test: (id) => id.startsWith("site/"), title: "Website-Daten (Kontakt, Formular, Navigation, Texte)", icon: "building-2" },
  { test: (id) => id.startsWith("media/"), title: "Bilder & Medien", icon: "image" },
];
function since(at) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return new Date(at).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}
function changeGroups(files) {
  const groups = new Map();
  const add = (key, def, entry) => {
    if (!groups.has(key)) groups.set(key, { ...def, items: [] });
    groups.get(key).items.push(entry);
  };
  for (const entry of files) {
    const owner = records().find((r) => r.file && entry.file.endsWith(r.file));
    // A deleted content file has no record any more; it is still content, not code.
    if (!owner && entry.status === "D" && /^src\/content\/.+\.(json|ya?ml|md)$/.test(entry.file)) {
      add("deleted", { title: "Gelöschte Inhalte", icon: "trash-2", order: 9 }, { ...entry, title: entry.file.split("/").pop().replace(/\.(json|ya?ml|md)$/, "") });
      continue;
    }
    const id = owner?.id || "";
    if (id.startsWith("translation/")) {
      const source = record(owner.data.sourceId);
      const locale = owner.data.locale;
      const kindIndex = source ? changeKinds.findIndex((k) => k.test(source.id)) : 99;
      add("translation-" + locale, { title: `Übersetzungen ${localeNames[locale] || locale}`, icon: "languages", order: 8 }, { ...entry, title: source ? recordName(source) : owner.title, kindIndex });
      continue;
    }
    const kind = id && changeKinds.find((k) => k.test(id));
    if (kind) add(kind.title, { ...kind, order: changeKinds.indexOf(kind) }, { ...entry, title: recordName(owner) });
    else if (entry.file.startsWith("public/assets/")) add("Bilder & Medien", { ...changeKinds[6], order: 6 }, { ...entry, title: entry.file.split("/").pop() });
    else
      add("code", { title: "Darstellung der Website (Code)", icon: "layout-grid", order: 99, collapsed: true, note: "Komponenten, Skripte und Schemas der Website. Werden mit veröffentlicht." }, { ...entry, title: entry.file.replace(/^src\//, "") });
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map((g) => ({
      ...g,
      // Long groups start closed; their heading with the count is the overview.
      collapsed: g.collapsed || g.items.length > 8,
      items: g.items.sort((x, y) => (x.kindIndex ?? 0) - (y.kindIndex ?? 0) || (y.at || 0) - (x.at || 0) || x.title.localeCompare(y.title)),
    }));
}
async function review() {
  stageInputs();
  closeMenu();
  const d = dialog("Freigeben");
  const status = el("p", { class: "note", text: "Wird geprüft …" });
  d.body.append(status);
  if (draft.size) {
    status.textContent = "Bitte zuerst speichern. Freigegeben wird nur ein vollständig gespeicherter Stand.";
    return;
  }
  try {
    const result = await api("/editor/api/review");
    const files = result.changed || [];
    const groups = changeGroups(files);
    const count = groups.reduce((n, g) => n + g.items.length, 0);
    if (!count && !publishNeedsActivation(result)) {
      status.textContent = "Alles ist bereits veröffentlicht.";
      return;
    }
    status.textContent = count ? `Seit der letzten Freigabe geändert (${count}):` : "Die letzte Freigabe ist noch nicht aktiv.";
    for (const g of groups) {
      const rows = g.items.map((entry) =>
        el(
          "li",
          {},
          el("span", { class: "change-title", text: entry.title }),
          entry.status === "A" ? el("span", { class: "change-badge", text: "neu" }) : entry.status === "D" ? el("span", { class: "change-badge danger", text: "gelöscht" }) : null,
          el("span", { class: "change-meta", text: [entry.at ? since(entry.at) : "", entry.author || ""].filter(Boolean).join(" · ") }),
        ),
      );
      const list = el("ul", { class: "list changes" }, rows);
      d.body.append(
        g.collapsed
          ? el("details", { class: "change-group" }, el("summary", {}, icon(g.icon), el("span", { text: `${g.title} (${g.items.length})` }), icon("chevron-down")), g.note ? el("p", { class: "note", text: g.note }) : null, list)
          : el("section", { class: "change-group" }, el("h3", { class: "change-group-title" }, icon(g.icon), el("span", { text: `${g.title} (${g.items.length})` })), list),
      );
    }
    d.body.append(
      el("p", { class: "note", text: "Die Website wird neu aufgebaut und anschließend ausgetauscht. Bis dahin bleibt der bisherige Stand online." }),
    );
    const go = button(
      "Jetzt veröffentlichen",
      async () => {
        busy = true;
        go.disabled = true;
        update();
        try {
          const published = await api("/editor/api/publish", {
            expectedHead: result.draftHead,
            expectedPublishedHead: result.publishedHead,
            requestId: crypto.randomUUID(),
          });
          publishPending = false;
          const head = published.publishedHead;
          publication = { ...result, draftHead: head, publishedHead: head, activePublishedHead: head, changed: [], url: published.url || result.url };
          publishedState(d);
          refreshPublishState();
        } catch (e) {
          status.textContent = e.message;
          status.classList.add("error");
          go.disabled = false;
        } finally {
          busy = false;
          update();
        }
      },
      { icon: "globe", cls: "primary" },
    );
    d.foot.append(
      button("Abbrechen", () => d.close(), { cls: "secondary" }),
      go,
    );
  } catch (e) {
    status.textContent = e.message;
    status.classList.add("error");
  }
}

// After a publication the dialog stays as the confirmation, with a lasting link to this page live in
// the current language (the page the work was done on, not the homepage).
function publishedState(d) {
  const label = pageChoices().find((choice) => choice.value === route)?.label || "Diese Seite";
  d.querySelector(".dlg-head h2").textContent = "Veröffentlicht";
  const link = el("a", { class: "button primary", href: liveURL(route, activeLocale, publication.url), target: "_blank", rel: "noopener" }, icon("external-link"), el("span", { text: "Live ansehen" }));
  d.body.replaceChildren(
    el(
      "div",
      { class: "publish-done", role: "status" },
      el("span", { class: "publish-done-mark", "aria-hidden": "true" }, icon("check")),
      el("p", { class: "publish-done-title", text: "Die Website ist aktualisiert." }),
      el("p", { class: "note", text: `„${label}“${activeLocale === "de" ? "" : ` (${localeNames[activeLocale]})`} ist jetzt live.` }),
      link,
    ),
  );
  d.foot.replaceChildren(button("Schließen", () => d.close(), { cls: "secondary" }));
  link.focus();
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
function mutateSections(id, index, kind) {
  if (busy || !ready) return;
  stageInputs();
  const item = record(id),
    title = sectionTitle(item, index),
    next = sectionMutation(item.data.sections, index, kind);
  draft.set(id, ["sections"], next);
  send("sections", { id, index, action: kind, sections: next });
  selection = null;
  closePanel();
  syncFrame();
  update();
  const messages = {
    remove: `„${title}“ entfernt.`,
    duplicate: `„${title}“ dupliziert.`,
    up: `„${title}“ nach oben verschoben.`,
    down: `„${title}“ nach unten verschoben.`,
  };
  toast(messages[kind], { action: undoLast });
}
function dialog(title, { narrow = false, search } = {}) {
  stageInputs();
  closeMenu();
  const node = el("dialog", { class: "editor-ui dlg" + (narrow ? " narrow" : ""), "aria-label": title });
  const head = el("div", { class: "dlg-head" }, el("h2", { text: title }));
  const body = el("div", { class: "dlg-body" });
  const foot = el("div", { class: "dlg-foot" });
  if (search) head.append(search);
  head.append(button("Schließen", () => node.close(), { icon: "x", iconOnly: true }));
  node.append(head, body, foot);
  document.body.append(node);
  node.addEventListener("close", () => node.remove());
  node.showModal();
  new MutationObserver(() => (foot.hidden = !foot.children.length)).observe(foot, { childList: true });
  foot.hidden = true;
  return Object.assign(node, { body, foot, head });
}
function visibleSection() {
  try {
    return frame.contentWindow.flyingstarsEditorFrame?.visibleSection?.() || null;
  } catch {
    return null;
  }
}
function openSections(id = currentPage()?.id, index) {
  let item = record(id);
  if (item?.data.sections === undefined && item?.schema?.properties?.sections?.kind === "array") item = { ...item, data: { ...item.data, sections: [] } };
  if (!Array.isArray(item?.data.sections)) {
    toast("Diese Seite ist fest aufgebaut und hat keine frei wählbaren Abschnitte.", { error: true });
    return;
  }
  if (index === undefined) {
    const seen = visibleSection();
    index = seen && seen.id === item.id ? seen.index + 1 : item.data.sections.length;
  }
  const target = index;
  const after = target > 0 ? sectionTitle(item, target - 1) : null;
  const d = dialog("Abschnitt hinzufügen");
  d.body.append(el("p", { class: "note", text: after ? `Wird unter „${after}“ eingefügt.` : "Wird ganz oben eingefügt." }));
  const grid = el("div", { class: "library-grid" });
  const isFull = (template) => !!template.maxInstances && item.data.sections.filter((s) => s.type === template.type).length >= template.maxInstances;
  // Available building blocks first; ones already used up stay visible but at the end.
  for (const template of [...(state.templates?.sections || [])].sort((a, b) => isFull(a) - isFull(b))) {
    const full = isFull(template);
    const card = el(
      "button",
      {
        type: "button",
        class: "library-card",
        disabled: !!full,
        onclick: () => {
          const next = sectionMutation(item.data.sections, target, "insert", template.data);
          draft.set(item.id, ["sections"], next);
          send("sections", { id: item.id, index: target, action: "insert", sections: next, template });
          syncFrame();
          update();
          d.close();
          toast(`„${template.title || template.type}“ hinzugefügt.`, { action: undoLast });
        },
      },
      icon(sectionIcon(template.type) || "panel-top"),
      el("span", { class: "card-text" }, el("span", { text: template.title || template.type }), full ? el("small", { text: "Schon auf dieser Seite" }) : null),
    );
    grid.append(card);
  }
  d.body.append(grid);
}

// ---------------------------------------------------------------------------
// Records: create, library
// ---------------------------------------------------------------------------
function recordTemplate(prefix) {
  return state?.templates?.collections?.find((t) => t.prefix.replace(/\/?$/, "/") === prefix);
}
function openCreate(prefix, reference, preset = {}, after) {
  if (busy || !ready) return;
  const template = recordTemplate(prefix);
  if (!template) return toast("Für diesen Inhaltstyp ist das Anlegen nicht freigegeben.", { error: true });
  const d = dialog(template.title + " anlegen", { narrow: true });
  const name = el("input", { type: "text", required: true, "aria-label": "Name" });
  const quote = el("textarea", { rows: 3, "aria-label": "Kundenstimme" });
  const person = el("input", { type: "text", "aria-label": "Name der zitierenden Person" });
  const role = el("input", { type: "text", "aria-label": "Rolle" });
  const slug = el("input", { type: "text", "aria-label": "Dateiname" });
  const slugNote = el("span", { class: "note" });
  const stack = (label, input) => el("label", { class: "stack" }, el("span", { class: "row-label", text: label }), input);
  d.body.append(stack({ "page/": "Titel der Seite", "faq/": "Frage", "post/": "Titel", "project/": "Titel" }[prefix] || "Name", name));
  if (prefix === "team/") d.body.append(stack("Rolle", role));
  if (prefix === "client/") d.body.append(stack("Kundenstimme (optional)", quote), stack("Name der zitierten Person", person), stack("Rolle", role));
  d.body.append(el("details", { class: "more" }, el("summary", {}, slugNote, icon("chevron-down")), el("div", { class: "group" }, stack("Dateiname", slug))));
  const deriveSlug = () =>
    name.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  let slugTouched = false;
  slug.addEventListener("input", () => (slugTouched = true));
  const syncSlug = () => {
    if (!slugTouched) slug.value = deriveSlug();
    slugNote.textContent = "Dateiname: " + (slug.value || "–");
  };
  name.addEventListener("input", syncSlug);
  syncSlug();
  const error = el("p", { class: "note error", role: "alert" });
  d.body.append(error);
  const create = () => {
    try {
      if (!name.value.trim()) throw Error("Bitte einen Namen eingeben.");
      if (!slug.value.match(/^[a-z0-9][a-z0-9-]*$/)) throw Error("Der Dateiname darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.");
      const id = prefix + slug.value,
        data = Object.assign(
          newRecordData(prefix, template.data, name.value.trim(), { quote: quote.value, person: person.value, role: role.value }),
          structuredClone(preset),
        );
      if (prefix === "client/" && !quote.value.trim() && reference && getPath(record(reference.id).data, reference.path.slice(0, -1))?.type === "testimonials")
        throw Error("Für die Kundenstimmen bitte ein Zitat eingeben.");
      const exemplar = records().find((r) => r.id.startsWith(prefix));
      draft.group(() => {
        draft.create({
          id,
          title: name.value.trim(),
          file: id,
          revision: null,
          data,
          schema: structuredClone(template.schema || exemplar?.schema),
          fields: structuredClone(template.fields || exemplar?.fields || []),
          containers: structuredClone(template.containers || exemplar?.containers || []),
          optionalFields: structuredClone(template.optionalFields || exemplar?.optionalFields || []),
        });
        if (["page/", "post/", "project/"].includes(prefix)) nextViewRecordId = id;
        if (reference) {
          const owner = record(reference.id);
          draft.set(reference.id, reference.path, [...(getPath(owner.data, reference.path) || []), slug.value]);
        }
      });
      d.close();
      syncFrame();
      update();
      if (after) after(id);
      else if (reference) rerender();
      else openInspector({ id, path: [] }, "record", undefined, { docked: true });
      toast(`„${name.value.trim()}“ angelegt. Wird mit den anderen Änderungen gespeichert.`);
    } catch (e) {
      error.textContent = e.message;
    }
  };
  d.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName === "INPUT") {
      event.preventDefault();
      create();
    }
  });
  d.foot.append(
    button("Abbrechen", () => d.close(), { cls: "secondary" }),
    button("Anlegen", create, { cls: "primary" }),
  );
  name.focus();
}
// "Inhalte verwalten": one navigator over every record, grouped by content type (see content-navigator.mjs).
// Groups start closed (their heading with the count is the overview); a search opens every group with a
// hit. A record opens in its overview; its language versions are flags on its row and open the same
// overview in that language.
const navigatorOpen = new Set();
function navigatorName(item) {
  if (item.route && /^(page|screen)\//.test(item.id))
    return normalizedRoute(item.route) === "/" ? "Startseite" : String(inlinePlain(item.data?.title || item.title)).split(" – ")[0];
  return recordName(item);
}
function contentLibrary() {
  stageInputs();
  const search = el("input", { type: "search", placeholder: "Suchen …", "aria-label": "Inhalte durchsuchen", autocomplete: "off" });
  const d = dialog("Inhalte verwalten", { search });
  d.classList.add("navigator");
  const pane = el("div", { class: "nav-groups" });
  const openRecord = (id, locale) => {
    d.close();
    openInspector({ id, path: [] }, "record", undefined, { docked: true });
    if (locale && locale !== activeLocale) switchPanelLocale(locale);
  };
  const draw = () => {
    const query = search.value.trim();
    const groups = navigatorGroups(records(), { name: navigatorName, canCreate: (type) => !!recordTemplate(type + "/"), query });
    pane.replaceChildren();
    if (!groups.length) pane.append(el("p", { class: "note", text: "Keine Treffer." }));
    for (const g of groups) {
      const template = g.create && !query ? recordTemplate(g.type + "/") : null;
      const rows = el(
        "ul",
        { class: "record-list" },
        g.items.map((row) =>
          el(
            "li",
            {},
            button(row.title, () => openRecord(row.id), { icon: kindOf(row.id)[1], cls: "nav-record" }),
            row.locales.map((locale) => {
              const chip = button(locale.toUpperCase(), () => openRecord(row.id, locale), { cls: "nav-locale" });
              chip.prepend(flagIcon(locale));
              chip.setAttribute("aria-label", `${row.title} auf ${localeNames[locale] || locale} öffnen`);
              chip.title = localeNames[locale] || locale;
              return chip;
            }),
          ),
        ),
      );
      const create = template
        ? button(
            template.title + " anlegen",
            () => {
              d.close();
              openCreate(g.type + "/");
            },
            { icon: "plus", cls: "inline-button" },
          )
        : null;
      // Images are browsed in the media library (grid, collections, usage), not as a record list.
      const isMedia = g.type === "media";
      const library = isMedia
        ? button(
            "Mediathek öffnen",
            () => {
              d.classList.add("media-wide");
              pane.replaceChildren(mediaBrowser({ mode: "manage", dialog: d }));
              search.hidden = true;
            },
            { icon: "image", cls: "inline-button" },
          )
        : null;
      const count = query ? `${g.items.length} von ${g.total}` : String(g.total);
      const details = el(
        "details",
        { class: "nav-group" },
        el("summary", {}, icon(g.icon), el("span", { class: "nav-group-title", text: g.label }), el("span", { class: "nav-count", text: count }), icon("chevron-down")),
        el("div", { class: "nav-group-body" }, library || create, isMedia ? null : g.items.length ? rows : el("p", { class: "note", text: "Noch keine Einträge." })),
      );
      details.open = !!query || navigatorOpen.has(g.type);
      details.addEventListener("toggle", () => {
        if (query) return;
        if (details.open) navigatorOpen.add(g.type);
        else navigatorOpen.delete(g.type);
      });
      pane.append(details);
    }
  };
  search.addEventListener("input", draw);
  d.body.append(pane);
  draw();
  search.focus();
}

// ---------------------------------------------------------------------------
// Media library: one browser for choosing an image for a field ("pick") and for managing images
// ("manage", in Inhalte verwalten → Medien). Collections and usage come from the shared resolver
// (media-usage.mjs) over the current draft, so an unsaved image change counts at once; the server's
// /editor/api/media gives the same view of the saved draft.
// ---------------------------------------------------------------------------
const usageCountLabel = (n) => (n ? `${n}× verwendet` : "Nicht verwendet");
const isPhoto = (data) => /jpe?g/.test(data?.mime || "");
function mediaThumb(data, { lazy = true } = {}) {
  // Logos are mostly white on transparent: shown whole on the checkerboard, photos fill the tile.
  return el(
    "span",
    { class: "media-thumb" + (isPhoto(data) ? "" : " transparent") },
    el("img", { src: data.src, alt: "", loading: lazy ? "lazy" : null, decoding: "async" }),
  );
}
// One tab stop per group; arrow keys move (in a grid also by rows), Home/End jump to the ends.
function rovingFocus(container, selector, { grid = false } = {}) {
  container.addEventListener("keydown", (event) => {
    const items = [...container.querySelectorAll(selector)];
    const index = items.indexOf(document.activeElement);
    if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const columns = grid ? Math.max(1, items.filter((n) => n.offsetTop === items[0].offsetTop).length) : 1;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns, Home: -index, End: items.length - 1 - index }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    let target = index + step;
    // Down from the second-to-last row lands on the last tile when the last row is shorter.
    if (target >= items.length && event.key === "ArrowDown" && Math.floor(index / columns) < Math.floor((items.length - 1) / columns)) target = items.length - 1;
    if (target < 0 || target >= items.length) return;
    items.forEach((n) => (n.tabIndex = -1));
    items[target].tabIndex = 0;
    items[target].focus();
    items[target].scrollIntoView({ block: "nearest" });
  });
  container.addEventListener("focusin", (event) => {
    if (!event.target.matches(selector)) return;
    for (const n of container.querySelectorAll(selector)) n.tabIndex = n === event.target ? 0 : -1;
  });
}
function mediaBrowser({ mode, dialog: d, context = null }) {
  const picking = mode === "pick";
  const currentId = picking ? mediaSelection(value(record(context.id),context.path)) : null;
  let library = mediaLibrary(records());
  // Choosing a client logo starts in "Kunden", a team portrait in "Team" – when that collection exists.
  const start = picking ? collectionOf(context.id, records()) : null;
  let selected = library.collections.some((c) => c.id === start) ? start : ALL_MEDIA;
  let focusId = null;
  const search = el("input", { type: "search", placeholder: "Bilder suchen", "aria-label": "Bilder suchen" });
  const input = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", "aria-label": "Bild hochladen" });
  const upload = el("label", { class: "upload-button" }, icon("upload"), el("span", { text: "Hochladen" }), input);
  const nav = el("div", { class: "media-collections", role: "group", "aria-label": "Sammlungen" });
  const status = el("p", { class: "note media-status", role: "status" });
  const tiles = el("ul", { class: "media-tiles" });
  const root = el(
    "div",
    { class: "media-library" },
    el(
      "div",
      { class: "media-layout" },
      nav,
      el("div", { class: "media-main" }, el("div", { class: "media-tools" }, search, upload), el("div", { class: "media-scroll" }, status, tiles)),
    ),
  );
  const choose = (asset) => {
    const existing = value(record(context.id), context.path) || {};
    changed(context.id, context.path, selectedMedia(existing,asset));
    d.close();
    if (currentInspector) rerender();
    else openInspector(context, "media");
    toast("Bild übernommen.", { action: undoLast });
  };
  const openAsset = (asset) => {
    d.close();
    openInspector({ id: asset.id, path: [] }, "record", undefined, { docked: true });
  };
  const tile = (asset, tabbable) => {
    const current = asset.id === currentId;
    const node = el(
      "button",
      { type: "button", class: "media-tile", tabindex: tabbable ? "0" : "-1", "aria-current": current ? "true" : null, "data-asset": asset.id },
      mediaThumb(asset.data),
      current ? el("span", { class: "media-badge", text: "Aktuell" }) : null,
      el("span", { class: "media-title", text: asset.data.title || "Ohne Titel" }),
      el("span", { class: "media-meta", text: usageCountLabel(asset.usage.length) }),
    );
    node.addEventListener("click", () => (picking ? choose(asset) : openAsset(asset)));
    return node;
  };
  const select = (id) => {
    selected = id;
    drawNav();
    drawTiles();
  };
  const drawNav = () => {
    const hadFocus = nav.contains(document.activeElement);
    nav.replaceChildren(
      ...library.collections.map((c) =>
        el(
          "button",
          { type: "button", class: "media-collection", "aria-pressed": String(c.id === selected), tabindex: c.id === selected ? "0" : "-1", onclick: () => select(c.id) },
          el("span", { class: "media-collection-label", text: c.label }),
          el("span", { class: "media-count", text: String(c.count) }),
        ),
      ),
    );
    if (hadFocus) nav.querySelector('[aria-pressed="true"]')?.focus();
  };
  const drawTiles = () => {
    const term = search.value.trim().toLowerCase();
    const label = library.collections.find((c) => c.id === selected)?.label || "Alle";
    const shown = library.assets
      .filter((a) => selected === ALL_MEDIA || a.collections.includes(selected))
      .filter((a) => !term || [a.data.title, a.data.defaultAlt].join(" ").toLowerCase().includes(term))
      .sort((a, b) => String(a.data.title || "").localeCompare(String(b.data.title || ""), "de"));
    tiles.setAttribute("aria-label", "Bilder: " + label);
    const active = shown.find((a) => a.id === focusId) || shown.find((a) => a.id === currentId) || shown[0];
    tiles.replaceChildren(...shown.map((asset) => el("li", {}, tile(asset, asset === active))));
    status.replaceChildren();
    if (shown.length) return;
    const where = selected === ALL_MEDIA ? "" : ` in „${label}“`;
    status.append(el("span", { text: term ? `Keine Bilder zu „${search.value.trim()}“${where}.` : `Hier sind noch keine Bilder${where}.` }));
    if (term && selected !== ALL_MEDIA) status.append(button("In allen Bildern suchen", () => select(ALL_MEDIA), { cls: "inline-button" }));
  };
  rovingFocus(nav, ".media-collection");
  rovingFocus(tiles, ".media-tile", { grid: true });
  search.addEventListener("input", drawTiles);
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    input.disabled = true;
    status.className = "note media-status";
    status.textContent = "Bild wird geprüft und gespeichert …";
    try {
      const response = await fetch("/editor/api/media", {
        method: "POST",
        headers: {
          ...csrfHeader(),
          "Content-Type": file.type,
          "X-Filename": encodeURIComponent(file.name),
          "X-Expected-Head": state.head,
          "X-Request-Id": crypto.randomUUID(),
        },
        body: file,
      });
      const uploaded = await response.json().catch(() => ({}));
      if (response.status === 401) sessionExpired();
      if (!response.ok) throw Object.assign(Error(uploaded.error || "Hochladen fehlgeschlagen."), { status: response.status });
      state = uploaded.state;
      initialHead = state.head;
      for (const r of state.records) if (!draft.base.has(r.id)) draft.base.set(r.id, r);
      // The new image is not used anywhere yet: it waits in "Nicht verwendet", ready to be chosen.
      library = mediaLibrary(records());
      focusId = uploadedMediaId(uploaded);
      search.value = "";
      select(library.assets.find((a) => a.id === focusId)?.collections[0] || ALL_MEDIA);
      tiles.querySelector(`[data-asset="${CSS.escape(focusId)}"]`)?.focus();
      toast(uploaded.reused ? "Dieses Bild ist schon in der Mediathek – es wurde ausgewählt." : "Bild hochgeladen.");
    } catch (e) {
      status.textContent = e.message;
      status.classList.add("error");
    } finally {
      input.value = "";
      input.disabled = false;
    }
  });
  drawNav();
  drawTiles();
  // The image in use is in view when the picker opens.
  requestAnimationFrame(() => tiles.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" }));
  return root;
}
function openMedia(context) {
  const d = dialog("Bild wählen");
  d.classList.add("media-wide");
  d.body.append(mediaBrowser({ mode: "pick", dialog: d, context }));
  d.body.querySelector('input[type="search"]').focus();
}
// Media record panel: the image itself, then where it is used (each place opens its record).
function mediaRecordPreview(item) {
  const { width, height, mime } = item.data;
  const format = String(mime || "").replace(/^image\//, "").replace("jpeg", "JPEG").replace("png", "PNG").replace("webp", "WebP");
  return el("figure", { class: "media-record-preview" }, mediaThumb(item.data, { lazy: false }), el("figcaption", { class: "note", text: `${width} × ${height} px · ${format}` }));
}
function mediaPlace(owner, path, markdown) {
  const parts = [];
  let rest = path;
  if (path[0] === "sections" && Number.isInteger(path[1])) {
    parts.push(`Abschnitt „${sectionTitle(owner, path[1])}“`);
    rest = path.slice(2);
  }
  const containers = containersFor(owner);
  const offset = path.length - rest.length;
  const listAt = rest.findLastIndex((part) => Number.isInteger(part));
  if (listAt >= 0) {
    const listPath = path.slice(0, offset + listAt);
    parts.push(`${fieldLabel(containers.find((c) => equal(c.path, listPath)) || { path: listPath })} ${rest[listAt] + 1}`);
  } else if (rest.length) parts.push(fieldLabel(containers.find((c) => equal(c.path, path)) || { path }));
  if (markdown) parts.push("im Text");
  return parts.join(" · ");
}
// A page is named as in the page menu ("Startseite"), not by its SEO title.
const pageName = (page) => pageChoices().find((choice) => page.route && choice.value === normalizedRoute(page.route))?.label || recordName(page);
function mediaUsageBlock(item) {
  const usage = mediaLibrary(records()).assets.find((a) => a.id === item.id)?.usage || [];
  if (!usage.length) return { title: "Verwendet in", controls: [el("p", { class: "note", text: "Dieses Bild wird noch nirgends verwendet." })] };
  const rows = usage.map((use) => {
    const user = record(use.recordId);
    // A translation's image belongs to its source record.
    const owner = use.recordId.startsWith("translation/") ? record(user?.data.sourceId) || user : user;
    const ownPath = owner === user ? use.path : [];
    const pageImage = /^(page|screen)\//.test(owner.id) && !use.markdown && ownPath.length;
    const open = () => (pageImage ? pushView({ id: owner.id, path: ownPath }, "media") : pushView({ id: owner.id, path: [], reveal: ownPath.length ? ownPath : undefined }, "record"));
    return el(
      "button",
      { type: "button", class: "action nav media-usage", onclick: open },
      icon(kindOf(owner.id)[1]),
      el("span", { class: "media-usage-text" }, el("span", { class: "media-usage-name", text: /^(page|screen)\//.test(owner.id) ? pageName(owner) : recordName(owner) }), el("small", { text: [kindOf(owner.id)[0], mediaPlace(owner, ownPath, use.markdown)].filter(Boolean).join(" · ") })),
      icon("chevron-right"),
    );
  });
  return { title: `Verwendet in (${usage.length})`, controls: [el("div", { class: "media-usages" }, rows)] };
}

// ---------------------------------------------------------------------------
// Languages: the whole page switches instantly; in EN/NL, text is overwritten in place
// and stored as a translation draft. Untranslated text stays German and is marked dashed.
// ---------------------------------------------------------------------------
const localeNames = { de: "Deutsch", en: "English", nl: "Nederlands" };
let lastForeignLocale = "en",
  translationCapabilities = null;
const pendingTranslations = new Map();
const translationId = (ownerId, locale) => "translation/" + ownerId.replaceAll("/", "-") + "-" + locale;
// A translated field is current when its sourceHash matches the German text it was made from.
// Older values without a field hash fall back to the record-level hash.
function valueFresh(owner, translation, value) {
  if (!value || !owner) return false;
  const german = getPath(owner.data, value.path);
  if (typeof german !== "string") return false;
  // Fresh means exactly: written for the current German text. Old values without a field hash are not shown.
  return !!value.sourceHash && value.sourceHash === sha256(german);
}
function translationValue(owner, path, locale = activeLocale) {
  const translation = record(translationId(owner.id, locale));
  const value = translation?.data.values?.find((v) => same(v.path, path));
  return valueFresh(owner, translation, value) ? value : undefined;
}
function translationText(owner, path, locale = activeLocale) {
  return translationValue(owner, path, locale)?.text;
}
function writeTranslation(ownerId, path, locale, text) {
  const owner = record(ownerId);
  if (!owner?.revision || draft.local.has(owner.id)) {
    toast("Bitte zuerst den deutschen Stand speichern; Übersetzungen beziehen sich auf den gespeicherten Text.", { error: true });
    return false;
  }
  const id = translationId(owner.id, locale),
    existing = record(id),
    data = existing ? structuredClone(existing.data) : { sourceId: owner.id, locale, sourceHash: owner.revision, values: [] };
  if (data.sourceHash !== owner.revision) {
    // Values keep their own field hash, so they stay valid for German texts that did not change.
    data.values = data.values
      .filter((v) => getPath(owner.data, v.path) !== undefined)
      .map((v) => (v.sourceHash ? v : { ...v, sourceHash: sha256(""), reviewed: false }));
    data.sourceHash = owner.revision;
  }
  const index = data.values.findIndex((v) => same(v.path, path)),
    next = { path, text, reviewed: true, sourceHash: sha256(getPath(owner.data, path) ?? "") };
  if (index < 0) data.values.push(next);
  else data.values[index] = next;
  if (existing) draft.set(id, [], data);
  else {
    const t = recordTemplate("translation/");
    draft.create({
      id,
      title: owner.title + " · " + locale,
      file: id,
      revision: null,
      data,
      schema: t?.schema,
      fields: t?.fields || [],
      containers: t?.containers || [],
    });
  }
  retry = null;
  overlayLocale(locale);
  update();
  return true;
}
function overlayLocale(locale) {
  activeLocale = locale;
  const values = records()
    .filter((r) => r.id.startsWith("translation/") && r.data.locale === locale)
    .flatMap((r) => {
      const source = record(r.data.sourceId);
      return r.data.values.filter((v) => valueFresh(source, r, v)).map((v) => ({ ...v, sourceId: r.data.sourceId }));
    });
  send("translations", { locale, values });
}
// Machine translation of everything on this page that has no current translation yet.
// Machine translation: languages, this page or the whole site (all kinds of content ticked by default),
// costs before sending, a real progress bar while it runs, suggestions into the draft.
const translationKinds = [
  ["pages", "Seiten inkl. SEO-Titel und Beschreibung"],
  ["stories", "Projekte & Blog inkl. SEO"],
  ["faq", "Häufige Fragen"],
  ["packages", "Pakete & Preise"],
  ["people", "Kunden & Team"],
  ["site", "Website-Daten (Kontakt, Formular, Navigation, Texte)"],
];
const translationKindOf = (id) =>
  /^(page|screen)\//.test(id) ? "pages" : /^(project|post)\//.test(id) ? "stories" : id.startsWith("faq/") ? "faq" : id.startsWith("package/") ? "packages" : /^(client|team)\//.test(id) ? "people" : id.startsWith("site/") ? "site" : null;
// "Without review": every current suggestion in the chosen scope counts as reviewed, also older ones.
function acceptSuggestions(ownerIds, locales) {
  for (const ownerId of ownerIds)
    for (const locale of locales) {
      const owner = record(ownerId),
        translation = owner && record(translationId(owner.id, locale));
      if (!translation) continue;
      const data = structuredClone(translation.data);
      let changedAny = false;
      for (const v of data.values)
        if (!v.reviewed && valueFresh(owner, translation, v)) {
          v.reviewed = true;
          changedAny = true;
        }
      if (changedAny) draft.set(translation.id, [], data);
    }
}
function mergeTranslationRecords(items, accept) {
  draft.group(() => {
    for (const item of items) {
      const current = record(item.id);
      if (current) {
        // A reviewed, current translation in the draft is never replaced by a suggestion.
        const owner = record(item.data.sourceId);
        const data = structuredClone(current.data);
        for (const value of item.data.values) {
          const index = data.values.findIndex((v) => same(v.path, value.path));
          const existing = index >= 0 ? data.values[index] : null;
          if (existing?.reviewed && valueFresh(owner, current, existing)) continue;
          if (index < 0) data.values.push(value);
          else data.values[index] = value;
        }
        data.sourceHash = item.data.sourceHash;
        draft.set(item.id, [], data);
      } else {
        const t = recordTemplate("translation/");
        draft.create({ id: item.id, title: item.id, file: item.id, revision: null, data: item.data, schema: t?.schema, fields: t?.fields || [], containers: t?.containers || [] });
      }
    }
    if (accept) acceptSuggestions(accept.ids, accept.locales);
  });
}
async function translateMissing() {
  stageInputs();
  let pageIds = [];
  try {
    pageIds = frame.contentWindow.flyingstarsEditorFrame?.recordsOnPage?.() || [];
  } catch {}
  pageIds = [...new Set([currentPage()?.id, ...pageIds].filter(Boolean))];
  const d = dialog("Übersetzen");
  const choice = {
    locales: new Set(activeLocale === "de" ? ["en", "nl"] : [activeLocale]),
    scope: "page",
    kinds: new Set(translationKinds.map(([k]) => k)),
    accept: false,
  };
  const status = el("p", { class: "note" });
  const summary = el("div", { class: "tr-summary" });
  const kindsBox = el("div", { class: "tr-kinds" });
  const go = button("Übersetzen", () => run(), { icon: "languages", cls: "primary" });
  const check = (label, checked, onchange, extra) => {
    const box = el("input", { type: "checkbox" });
    box.checked = checked;
    box.addEventListener("change", () => onchange(box.checked));
    return el("label", { class: "tr-check" }, box, el("span", { text: label }), extra || null);
  };
  const radio = (label, value) => {
    const input = el("input", { type: "radio", name: "tr-scope", value });
    input.checked = choice.scope === value;
    input.addEventListener("change", () => ((choice.scope = value), refresh()));
    return el("label", { class: "tr-check" }, input, el("span", { text: label }));
  };
  d.body.append(
    el("section", { class: "tr-block" }, el("h3", { class: "tr-title", text: "Sprachen" }),
      el("div", { class: "tr-row" }, ...["en", "nl"].map((l) => { const row = check(localeNames[l], choice.locales.has(l), (on) => (on ? choice.locales.add(l) : choice.locales.delete(l), refresh())); row.querySelector("input").after(flagIcon(l)); return row; }))),
    el("section", { class: "tr-block" }, el("h3", { class: "tr-title", text: "Umfang" }),
      el("div", { class: "tr-row" }, radio("Diese Seite", "page"), radio("Ganze Website", "site")), kindsBox),
    el("section", { class: "tr-block" }, summary, status,
      check("Vorschläge ohne Durchsicht übernehmen (werden mit der nächsten Freigabe öffentlich)", false, (on) => (choice.accept = on))),
  );
  d.foot.append(button("Abbrechen", () => d.close(), { cls: "secondary" }), go);
  let planned = null,
    seq = 0;
  const request = () => ({
    locales: [...choice.locales],
    scope: choice.scope,
    ids: choice.scope === "page" ? pageIds : undefined,
    kinds: choice.scope === "site" ? [...choice.kinds] : undefined,
  });
  async function refresh() {
    const mine = ++seq;
    go.disabled = true;
    status.textContent = "Wird berechnet …";
    status.classList.remove("error");
    summary.replaceChildren();
    if (!choice.locales.size) return void (status.textContent = "Bitte mindestens eine Sprache wählen.");
    const ids = choice.scope === "page" ? pageIds : records().map((r) => r.id);
    if (ids.some((id) => draft.local.has(id) || draft.created.has(id)))
      return void (status.textContent = "Bitte zuerst speichern: Übersetzungen beziehen sich auf den gespeicherten deutschen Text.");
    try {
      planned = await api("/editor/api/translate-missing", { ...request(), dryRun: true });
      if (mine !== seq) return;
      // Kinds of content (whole site): ticked by default, each with what it would cost.
      kindsBox.replaceChildren(
        ...(choice.scope === "site"
          ? translationKinds.map(([kind, label]) => {
              const counts = planned.kinds?.[kind];
              const tag = el("span", { class: "tr-tag", text: counts ? `${counts.fields} Texte · ${counts.chars.toLocaleString("de-DE")} Zeichen` : "aktuell" });
              return check(label, choice.kinds.has(kind), (on) => (on ? choice.kinds.add(kind) : choice.kinds.delete(kind), refresh()), tag);
            })
          : []),
      );
      if (!planned.provider) return void (status.textContent = "Kein Übersetzungsdienst eingerichtet.");
      if (!planned.fields) {
        status.textContent = "Alles ist in den gewählten Sprachen übersetzt.";
        const ids = choice.scope === "page" ? pageIds : records().map((r) => r.id).filter((id) => choice.kinds.has(translationKindOf(id)));
        const open = ids.flatMap((id) => [...choice.locales].flatMap((l) => {
          const owner = record(id), t = owner && record(translationId(id, l));
          return t ? t.data.values.filter((v) => !v.reviewed && valueFresh(owner, t, v)) : [];
        })).length;
        if (open)
          summary.append(button(`${open} ungeprüfte Vorschläge übernehmen`, () => {
            draft.group(() => acceptSuggestions(ids, [...choice.locales]));
            d.close();
            if (activeLocale !== "de") overlayLocale(activeLocale);
            update();
            toast(`${open} Vorschläge übernommen. Gespeichert wird mit „Speichern“.`);
          }, { icon: "check", cls: "secondary" }));
        return;
      }
      summary.append(
        el("ul", { class: "list" },
          el("li", {}, el("span", { text: `${planned.fields} Texte ohne aktuelle Übersetzung` })),
          el("li", {}, el("span", { text: `${planned.chars.toLocaleString("de-DE")} Zeichen an ${planned.providerLabel}` })),
          planned.cachedChars ? el("li", {}, el("span", { text: `${planned.cachedChars.toLocaleString("de-DE")} Zeichen aus dem Übersetzungsspeicher (kostenlos)` })) : null,
          planned.budget && planned.chars > planned.budget * choice.locales.size
            ? el("li", {}, el("span", { text: `Höchstens ${planned.budget.toLocaleString("de-DE")} Zeichen je Sprache und Lauf – der Rest folgt mit „Weiter übersetzen“` }))
            : null,
        ),
      );
      status.textContent = "Die Vorschläge erscheinen gelb gestrichelt als ungeprüft. Gespeichert wird mit „Speichern“.";
      go.disabled = false;
    } catch (error) {
      if (mine !== seq) return;
      status.textContent = error.message;
      status.classList.add("error");
    }
  }
  async function run() {
    go.disabled = true;
    for (const input of d.querySelectorAll(".tr-block input")) input.disabled = true;
    const bar = el("div", { class: "tr-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" }, el("div", { class: "tr-progress-fill" }));
    const label = el("p", { class: "note tr-progress-label" }, Object.assign(icon("loader-circle"), { classList: "spin" }), el("span", { text: "Wird übersetzt …" }));
    summary.replaceChildren(bar, label);
    status.textContent = "";
    const show = (sent, total, locale) => {
      const pct = total ? Math.min(100, Math.round((sent / total) * 100)) : 0;
      bar.firstChild.style.width = pct + "%";
      bar.setAttribute("aria-valuenow", String(pct));
      label.lastChild.textContent = `${localeNames[locale] || ""}: ${sent.toLocaleString("de-DE")} von ${total.toLocaleString("de-DE")} Zeichen`;
    };
    try {
      const response = await fetch("/editor/api/translate-missing", {
        method: "POST",
        headers: { "content-type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ ...request(), accept: choice.accept }),
      });
      if (response.status === 401) sessionExpired();
      if (!response.ok) throw Error((await response.json().catch(() => ({}))).error || "Übersetzung fehlgeschlagen.");
      let result = null;
      if (response.headers.get("content-type")?.includes("ndjson")) {
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const event = JSON.parse(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            if (event.type === "progress") show(event.sent, event.total, event.locale);
            else if (event.type === "error") throw Error(event.error);
            else if (event.type === "done") result = event;
          }
        }
      } else result = await response.json();
      if (!result) throw Error("Übersetzung abgebrochen.");
      const scopeIds = choice.scope === "page" ? pageIds : records().map((r) => r.id).filter((id) => choice.kinds.has(translationKindOf(id)));
      mergeTranslationRecords(result.records || [], choice.accept ? { ids: scopeIds, locales: [...choice.locales] } : null);
      d.close();
      const target = choice.locales.has(activeLocale) ? activeLocale : [...choice.locales][0];
      if (activeLocale !== target) setLocale(target);
      else overlayLocale(target);
      update();
      const done = result.fields - (result.skippedFields || 0);
      const cost = result.billedCharacters ? ` (${result.billedCharacters.toLocaleString("de-DE")} Zeichen berechnet)` : "";
      if (result.budgetExhausted)
        toast(`${done} von ${result.fields} Texten übersetzt${cost}. Der Rest passt nicht mehr in diesen Lauf.`, { action: translateMissing, actionLabel: "Weiter übersetzen" });
      else
        toast(
          result.skippedFields
            ? `${done} von ${result.fields} Texten übersetzt; ${result.skippedFields} später erneut versuchen (${result.errors?.[0] || "Anbieterfehler"}).`
            : `${done} Texte übersetzt${cost}. Gespeichert wird mit „Speichern“.`,
          { error: !!result.skippedFields },
        );
    } catch (error) {
      summary.replaceChildren();
      status.textContent = error.message;
      status.classList.add("error");
      go.disabled = false;
      for (const input of d.querySelectorAll(".tr-block input")) input.disabled = false;
    }
  }
  refresh();
}
// Switching the language loads the real language route (html lang, head, scripts); the scroll position stays.
function setLocale(locale, { keepPanel = false } = {}) {
  if (locale === activeLocale) return;
  stageInputs();
  try {
    frame.dataset.restoreScroll = String(frame.contentWindow.scrollY);
  } catch {}
  const search = new URLSearchParams(frame.contentWindow?.location.search || "");
  for (const key of ["editor", "_editorNavigation", "_editorHead"]) search.delete(key);
  navigate(route + (search.size ? "?" + search : ""), { locale, keepPanel });
  if (locale !== "de" && !setLocale.hinted) {
    setLocale.hinted = true;
    toast(`${localeNames[locale]}: Texte direkt auf der Seite überschreiben. Noch nicht übersetzte Texte sind gestrichelt markiert.`);
  }
}
// The language control of a panel: in its head (one per panel, when it shows translatable text) and as the
// pill on every foreign-language field. Same languages and flags as the dock; switching keeps the panel
// (same record, scroll position and open groups) and the page follows (setLocale, as from the dock).
function localeSwitch(cls) {
  const node = el(
    "button",
    { type: "button", class: cls, "aria-haspopup": "menu", "aria-expanded": "false", "aria-label": "Sprache wechseln, aktuell " + localeNames[activeLocale], title: "Sprache wechseln" },
    cls === "panel-locale" ? flagIcon(activeLocale) : null,
    el("span", { text: activeLocale.toUpperCase() }),
    icon("chevron-down"),
  );
  node.addEventListener("click", (event) => {
    // Inside a field label the click must not reach the input.
    event.preventDefault();
    event.stopPropagation();
    openMenu(
      node,
      [{ heading: "Sprache der Ansicht" }, ...Object.entries(localeNames).map(([code, label]) => ({ label, flag: code, current: code === activeLocale, run: () => switchPanelLocale(code) }))],
      { keepPanel: true },
    );
  });
  return node;
}
let focusLocaleSwitch = false;
function switchPanelLocale(locale) {
  if (locale === activeLocale) return;
  if ($("#panel").hidden) return setLocale(locale);
  focusLocaleSwitch = true;
  setLocale(locale, { keepPanel: true });
}
function startTranslation(context) {
  closePanel();
  setLocale(activeLocale === "de" ? lastForeignLocale : "de");
  if (context) send("focus-field", { id: context.id, path: context.path });
}
// Fresh machine suggestions for the records on this page in the current language.
// Only fields that are actually visible on this page (a project card does not confirm the article body).
function unconfirmedOnPage() {
  if (activeLocale === "de") return [];
  let shown = [];
  try {
    shown = frame.contentWindow.flyingstarsEditorFrame?.renderedFields?.() || [];
  } catch {}
  const visible = new Set(shown.map((f) => fieldKey(f.id, f.path)));
  return [...new Set(shown.map((f) => f.id))].flatMap((ownerId) => {
    const owner = record(ownerId),
      translation = owner && record(translationId(owner.id, activeLocale));
    return translation
      ? translation.data.values
          .filter((v) => !v.reviewed && valueFresh(owner, translation, v) && visible.has(fieldKey(ownerId, v.path)))
          .map((v) => ({ ownerId, value: v }))
      : [];
  });
}
function confirmAllOnPage() {
  const pending = unconfirmedOnPage();
  let done = 0;
  draft.group(() => pending.forEach(({ ownerId, value }) => (done += writeTranslation(ownerId, value.path, activeLocale, value.text) ? 1 : 0)));
  if (done) toast(`${done} Vorschläge bestätigt${done < pending.length ? `, ${pending.length - done} nicht (erst den deutschen Text speichern)` : ""}. Gespeichert wird mit „Speichern“.`);
}
function languageMenu() {
  openMenu($("#language"), [
    { heading: "Sprache der Ansicht" },
    ...Object.entries(localeNames).map(([code, label]) => ({ label, flag: code, current: code === activeLocale, run: () => setLocale(code) })),
    "-",
    { label: "Übersetzen …", icon: "languages", run: translateMissing },
    unconfirmedOnPage().length
      ? { label: `Alle Vorschläge dieser Seite bestätigen (${unconfirmedOnPage().length})`, icon: "check", run: confirmAllOnPage }
      : null,
  ]);
}

// ---------------------------------------------------------------------------
// Frame messages
// ---------------------------------------------------------------------------
function anchorFrom(data) {
  const offset = frameOffset();
  const element = data?.rect && {
    left: offset.x + data.rect.left,
    right: offset.x + data.rect.right,
    top: offset.y + data.rect.top,
    bottom: offset.y + data.rect.bottom,
  };
  if (data?.point) return { x: offset.x + data.point.x, y: offset.y + data.point.y, element };
  if (data?.rect) return { x: offset.x + data.rect.left, y: offset.y + data.rect.bottom, top: offset.y + data.rect.top };
  return undefined;
}
// The browser's back/forward buttons move the iframe without the shell. A page that announces itself
// and is really the one the iframe shows becomes the current page (route, address bar, reload).
function adoptFrame(frameURL) {
  let shown;
  try {
    shown = frame.contentWindow.location.pathname + frame.contentWindow.location.search;
  } catch {
    return false;
  }
  if (shown !== frameURL || !new URLSearchParams(frameURL.split("?")[1] || "").has("editor")) return false;
  // Panel input that was still being typed is kept, not dropped.
  for (const item of [...editing.values()]) stage(item.id, item.path, item.value);
  closePanel();
  closeMenu();
  selection = null;
  nextViewRecordId = null;
  const split = splitLocale(frameURL.split("?")[0]);
  route = normalizedRoute(split.path);
  activeLocale = split.locale;
  expectedFrameURL = frameURL;
  previewBaselineFor = null;
  history.replaceState(null, "", editorAddress());
  return true;
}
window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.source !== "flyingstars-frame") return;
  if (event.data.frameURL !== expectedFrameURL && !(event.data.type === "ready" && adoptFrame(event.data.frameURL))) return;
  const data = event.data;
  if (data.type === "ready") {
    ready = true;
    $("#loading").hidden = true;
    syncFrame();
    update();
    // A panel kept across a language switch is redrawn with the new page (card markers, inline texts).
    if (!$("#panel").hidden) {
      rerender();
      if (focusLocaleSwitch) $("#panel .panel-locale")?.focus({ preventScroll: true });
    }
    focusLocaleSwitch = false;
    startPreview();
    if (activeLocale !== "de") overlayLocale(activeLocale);
    if (frame.dataset.restoreTransient) {
      try {
        send("restore-transient", { value: JSON.parse(frame.dataset.restoreTransient) });
      } catch {}
      delete frame.dataset.restoreTransient;
    }
    if (frame.dataset.restoreScroll) {
      send("scroll", { y: Number(frame.dataset.restoreScroll) });
      delete frame.dataset.restoreScroll;
    }
  } else if (data.type === "coverage") {
    inlineKeys = new Set(data.keys || []);
  } else if (data.type === "pointerdown") {
    closeMenu();
    if ($("#panel").dataset.placement === "anchored") closePanel();
  } else if (data.type === "stage-translation" && !busy && ready) {
    pendingTranslations.delete(fieldKey(data.id, data.path) + "@" + data.locale);
    writeTranslation(data.id, data.path, data.locale, data.value);
  } else if (data.type === "input-translation" && !busy && ready) {
    pendingTranslations.set(fieldKey(data.id, data.path) + "@" + data.locale, data);
    update();
  } else if (data.type === "confirm-translation" && !busy && ready) {
    if (writeTranslation(data.id, data.path, data.locale, data.value)) toast("Übersetzung bestätigt.");
  } else if (data.type === "reorder-records" && !busy && ready) {
    reorderRecords(data.ids || [], data.field);
  } else if (data.type === "set-field" && !busy && ready) {
    changed(data.id, data.path, data.value);
    rerender();
  } else if (data.type === "reorder" && !busy && ready) {
    stageInputs();
    const item = record(data.id);
    const list = structuredClone(getPath(item?.data, data.path) || []);
    if (data.from >= 0 && data.to >= 0 && data.from < list.length && data.to < list.length) {
      const [moved] = list.splice(data.from, 1);
      list.splice(data.to, 0, moved);
      changed(data.id, data.path, list);
      rerender();
    }
  } else if (data.type === "inspect-instance") {
    openInspector(instanceContext(data), "instance", anchorFrom(data));
  } else if (data.type === "preview-applied") {
    // The page was redrawn: a card may render more or less now (a Leistung ticked on), so the open card
    // panel re-reads its markers; it stays put while someone types in it.
    const view = panelStack.at(-1);
    if (view?.scope === "instance" && !$("#panel").hidden && !$("#panel").contains(document.activeElement?.matches?.("input,textarea,select") ? document.activeElement : null))
      if (markersKey(occurrenceMarkers(view.context)) !== lastInstanceMarkers) rerender();
  } else if (data.type === "inspect-entry") {
    openInspector({ id: data.id, path: data.path, section: data.section, record: data.record }, "entry", anchorFrom(data));
  } else if (data.type === "inspect-record") {
    openInspector({ id: data.id, path: [], section: data.section }, "record", anchorFrom(data));
  } else if (data.type === "select") {
    selection = { id: data.id, path: data.path, derived: data.derived, rich: !!data.rich, inspectionContext: data.inspectionContext };
    if (data.derived && data.instance) openInspector(instanceContext(data.instance), "instance", anchorFrom(data));
    else if (data.derived) openInspector({ id: data.id, path: data.path, derived: true, section: data.section }, "element", anchorFrom(data));
  } else if (data.type === "select-media") {
    selection = { id: data.id, path: data.path, media: true };
  } else if (data.type === "input" && !busy && ready) {
    editing.set(fieldKey(data.id, data.path), { id: data.id, path: data.path, value: data.value, inline: true });
    update();
  } else if (data.type === "stage" && !busy && ready) stage(data.id, data.path, data.value);
  else if (data.type === "cancel") {
    editing.delete(fieldKey(data.id, data.path));
    pendingTranslations.delete(fieldKey(data.id, data.path) + "@" + data.locale);
    update();
  } else if (data.type === "navigate") {
    // A link on the page means exactly its address: /kontakt/ is German, /en/kontakt/ English (site language switch).
    navigate(data.url, { locale: splitLocale(new URL(data.url, location.origin).pathname).locale });
  }
  else if (data.type === "hint") toast(data.text);
  else if (data.type === "save") save();
  else if (data.type === "undo") undoLast();
  else if (data.type === "inspect") openInspector(data, "element", anchorFrom(data));
  else if (data.type === "section") openInspector({ id: data.id, path: ["sections", data.index] }, "section", anchorFrom(data));
  else if (data.type === "media") openInspector({ id: data.id, path: data.path, section: data.section, entry: data.entry }, "media", anchorFrom(data));
  else if (data.type === "translate") startTranslation(data);
});

// ---------------------------------------------------------------------------
// Chrome events
// ---------------------------------------------------------------------------
$("#panel-close").addEventListener("click", closePanel);
$("#page-button").addEventListener("click", pageMenu);
$("#more").addEventListener("click", moreMenu);
$("#language").addEventListener("click", languageMenu);
$("#panel-back").addEventListener("click", popView);
$("#panel-unpin").append(icon("pin-off"));
$("#panel-unpin").addEventListener("click", unpinPanel);
$(".panel-head").addEventListener("pointerdown", dragPanel);
$(".panel-head").addEventListener("dblclick", (event) => {
  if (!event.target.closest("button")) unpinPanel();
});
for (const handle of document.querySelectorAll(".panel-resize")) handle.addEventListener("pointerdown", resizePanel);
$("#add-section").addEventListener("click", () => openSections());
$("#save").addEventListener("click", save);
// A text field in the frame stages on blur via postMessage; let that land first so Undo reverts it.
$("#undo").addEventListener("click", () => setTimeout(undoLast, 0));
$("#publish").addEventListener("click", review);
$("#mode").addEventListener("click", () => {
  stageInputs();
  preview = !preview;
  closePanel();
  closeMenu();
  syncFrame();
  update();
});
document.addEventListener("pointerdown", (event) => {
  if (openMenuState && !openMenuState.node.contains(event.target) && !openMenuState.trigger.contains(event.target)) closeMenu();
  const panel = $("#panel");
  if (!panel.hidden && panel.dataset.placement === "anchored" && !panel.contains(event.target) && !event.target.closest("dialog,.menu,#toast,#undo"))
    closePanel();
});
document.addEventListener("keydown", (event) => {
  const typing = event.target.matches?.("input,textarea,select,[contenteditable]");
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    save();
  } else if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z" && !typing) {
    event.preventDefault();
    undoLast();
  } else if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
    if (openMenuState) closeMenu({ restoreFocus: true });
    else if (!$("#panel").hidden) {
      closePanel();
      frame.focus();
      try {
        frame.contentWindow.flyingstarsEditorFrame?.refocus();
      } catch {}
    }
  }
});
window.addEventListener("pagehide", () => {
  try {
    localStorage.removeItem("fs-editor-unsaved");
  } catch {}
});
window.addEventListener("beforeunload", (event) => {
  if (draft.size || pendingCount() || pendingTranslations.size) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("resize", () => {
  send("rect-request");
  closeMenu();
  if (!$("#panel").hidden) placePanel(panelAnchor, panelPlace());
});

(async () => {
  try {
    await loadSession();
    state = await api("/editor/api/state");
    initialHead = state.head;
    rememberSavedHead();
    draft.reset(state.records);
    if (state.activeHead && state.activeHead !== state.head)
      toast("Der letzte gespeicherte Stand konnte nicht aufgebaut werden. Die Seite zeigt einen früheren Stand.", { error: true });
    const requested = splitLocale(new URL(location.href).searchParams.get("page") || "/");
    const initial = normalizedRoute(requested.path);
    navigate(navigationChoices(records()).some((choice) => choice.value === initial) ? initial : "/", { locale: requested.locale });
    refreshPublishState();
  } catch (error) {
    loadError = true;
    $("#loading").textContent = "Seite konnte nicht geladen werden. " + error.message;
    toast(error.message, { error: true });
  } finally {
    update();
  }
})();

window.flyingstarsEditorLayout = () =>
  [...document.querySelectorAll("#panel:not([hidden]),dialog[open]")].map((element) => ({
    surface: element.id || "dialog",
    ...inspectHorizontalLayout(element),
  }));
