import './test/register-browser-site.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {prepareClonedSection} from 'astro-frontend-editor/web/prepare-cloned-section.mjs';
function node(classes=[],attributes=[]){const tokens=new Set(classes);return {dataset:{},hidden:false,children:[],classList:{contains:c=>tokens.has(c),add:c=>tokens.add(c),remove:c=>tokens.delete(c)},hasAttribute:name=>attributes.includes(name),querySelectorAll:()=>[],querySelector:()=>null,prepend(child){this.children.unshift(child);},ownerDocument:{createElement:()=>node()},tokens};}
test('only the draft copy reveals observer-dependent content; live source classes and controllers remain intact',()=>{const original=node(['member','pre']);original.controller={running:true};const copy=node(),member=node(['member','pre']),group=node(['pre'],['data-reveal-group']);copy.querySelectorAll=selector=>selector==='canvas'?[]:[member,group];const result=prepareClonedSection(copy);assert.equal(result.revealedNodes,2);assert.equal(member.tokens.has('pre'),false);assert.equal(member.tokens.has('shown'),true);assert.equal(group.tokens.has('pre'),false);assert.equal(original.tokens.has('pre'),true);assert.equal(original.controller.running,true);});
test('a canvas copy is explicitly pending until real Astro initialization, never reported as a running animation',()=>{const copy=node(),canvas=node();canvas.dataset.running='true';copy.querySelectorAll=selector=>selector==='canvas'?[canvas]:[];const result=prepareClonedSection(copy);assert.equal(result.pendingCanvases,1);assert.equal(copy.tokens.has('native-copy-pending'),true);assert.equal(canvas.hidden,true);assert.equal(canvas.dataset.running,undefined);assert.equal(copy.children[0].textContent,'Live-Vorschau nicht verfügbar. Animationen erscheinen nach dem Speichern und Neuladen.');});

test('live preview copies keep canvases visible and have no pending note; explicit hidden settings survive', () => {
  const copy = node(['native-copy-pending']), visible = node(), hidden = node();
  hidden.hidden = true; visible.dataset.canvasLive = 'true'; visible.dataset.running = 'true';
  copy.querySelectorAll = selector => selector === 'canvas' ? [visible, hidden] : [];
  const result = prepareClonedSection(copy, { livePreview: true });
  assert.equal(result.pendingCanvases, 0);
  assert.equal(copy.tokens.has('native-copy-pending'), false);
  assert.equal(visible.hidden, false);
  assert.equal(hidden.hidden, true);
  assert.equal(visible.dataset.canvasLive, undefined);
  assert.equal(visible.dataset.running, undefined);
  assert.equal(copy.children.length, 0);
});

test('live preview removes an obsolete runtime note instead of duplicating it', () => {
  const copy = node(['native-copy-pending']); let removed = false;
  copy.querySelector = () => ({ remove() { removed = true; } });
  copy.querySelectorAll = () => [];
  prepareClonedSection(copy, { livePreview: true });
  assert.equal(removed, true); assert.equal(copy.children.length, 0);
});
