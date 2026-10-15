// Applies a server render of the unsaved draft to the live page.
// Regions are the children of <main>. Unchanged regions are left alone. Regions whose client
// scripts hold state (canvas animations, marquees, forms) are patched in place — classes, attributes
// and leaf text — so running animations survive; any other region is replaced by the new render.
import {extensions} from './site-adapter.mjs';

export function regionKey(node, index) {
  return node.dataset?.nativeSectionIndex !== undefined ? "s" + node.dataset.nativeSectionIndex : "i" + index;
}
export function regions(root) {
  const main = root.querySelector("main");
  const map = new Map();
  if (main) [...main.children].forEach((node, index) => map.set(regionKey(node, index), node));
  // Site header and footer show shared data too (contact details, navigation).
  for (const tag of ["header", "footer"]) {
    const node = root.querySelector(`body > ${tag}`);
    if (node) map.set(tag, node);
  }
  return map;
}
export function isRuntime(node) {
  return extensions.some('isRuntime',node);
}
export function sameStructure(a, b) {
  if (a.tagName !== b.tagName || a.children.length !== b.children.length) return false;
  for (let i = 0; i < a.children.length; i++) if (!sameStructure(a.children[i], b.children[i])) return false;
  return true;
}
function sameTagIndex(node) {
  let index = 0;
  for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) if (sibling.tagName === node.tagName) index++;
  return index;
}
function nthOfTag(parent, tagName, index) {
  let seen = 0;
  for (const child of parent.children) if (child.tagName === tagName && seen++ === index) return child;
  return null;
}
// Three-way patch: only what differs between the previous and the new server render is applied,
// so classes and attributes that client scripts added to the live node stay.
export function patchInPlace(live, before, after, report = { unsafe: false, changed: 0 }) {
  if (!sameStructure(before, after)) { report.unsafe = true; return report; }
  return patchNode(live, before, after, report);
}
function patchNode(live, before, after, report) {
  const names = new Set([...before.getAttributeNames(), ...after.getAttributeNames()]);
  for (const name of names) {
    const was = before.getAttribute(name),
      now = after.getAttribute(name);
    if (was === now) continue;
    const policy=extensions.first('attributePolicy',live,name);
    if(policy==='skip')continue;
    if(policy==='unsafe'){report.unsafe=true;continue;}
    report.changed++;
    if (name === "class") {
      const old = new Set((was || "").split(/\s+/).filter(Boolean)),
        next = new Set((now || "").split(/\s+/).filter(Boolean));
      for (const token of old) if (!next.has(token)) live.classList.remove(token);
      for (const token of next) if (!old.has(token)) live.classList.add(token);
    } else if (now === null) live.removeAttribute(name);
    else live.setAttribute(name, now);
  }
  // Text sitting directly beside child elements (a button label next to its arrow icon).
  if (before.children.length) {
    const texts = (node) => [...node.childNodes].filter((child) => child.nodeType === 3);
    const was = texts(before),
      now = texts(after),
      target = texts(live);
    if (was.length === now.length && target.length === was.length)
      was.forEach((text, i) => {
        if (text.data !== now[i].data && target[i].data === text.data) {
          target[i].data = now[i].data;
          report.changed++;
        }
      });
  }
  if (!before.children.length && !after.children.length && before.textContent !== after.textContent) {
    const doc = live.ownerDocument;
    if (live !== doc.activeElement && !live.contains(doc.activeElement)) {
      live.textContent = after.textContent;
      report.changed++;
    }
  }
  for (let i = 0; i < before.children.length; i++) {
    const was = before.children[i],
      target = nthOfTag(live, was.tagName, sameTagIndex(was));
    if (target) patchNode(target, was, after.children[i], report);
  }
  return report;
}
