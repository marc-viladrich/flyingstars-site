import test from 'node:test';
import assert from 'node:assert/strict';
import {criticalShell} from '../src/lib/critical-css.mjs';

test('critical shell retains responsive/menu states and transitive variable fallbacks without lower-page owners', () => {
  const source=':root{--ink:white;--alias:var(--ink);--unused:red;color-scheme:dark}.nav{color:var(--alias)}.footer{padding:4rem}@media(max-width:40em){.nav{display:flex}.team{display:grid}}.nav-drop:focus-within>a{color:var(--ink)}.lead{font-size:var(--missing,var(--ink))}';
  const css=criticalShell(source);
  assert.match(css,/--ink:white/);assert.match(css,/--alias:var\(--ink\)/);
  assert.match(css,/color-scheme:dark/);assert.match(css,/@media/);assert.match(css,/:focus-within/);
  assert.doesNotMatch(css,/--unused|\.footer|\.team/);
});
test('hero/frame dependencies select their tokens even when absent from shell declarations', () => {
  const css=criticalShell(':root{--hero:var(--accent);--accent:orange;--other:red}.nav{display:flex}', ['.hero{color:var(--hero)}']);
  assert.match(css,/--hero:/);assert.match(css,/--accent:/);assert.doesNotMatch(css,/--other:/);
});

test('subpage structural rules stay in the normal blocking delivery path', () => {
 const css=criticalShell('.page-top>:first-child:not(.todo-note){padding-top:var(--hero-top)}:root{--hero-top:7rem}');
 assert.doesNotMatch(css,/padding-top|--hero-top/);
});

test('next-section spacing prevents its unstyled children entering the critical viewport', () => {
 const css=criticalShell(':root{--section:5rem;--unused:red}.section{padding:var(--section) 1rem}.post-body{color:red}');
 assert.match(css,/\.section\{padding/);assert.match(css,/--section:5rem/);assert.doesNotMatch(css,/--unused|post-body/);
});

test('enhancement canvases retain their containing block and never participate in flow', () => {
 const css=criticalShell('[data-dot-img]{position:relative}.dot-cv{position:absolute;inset:0;width:100%;height:100%}.dot-pending>img{opacity:0}@supports(color:oklab(0 0 0)){:root{--unused:red}}');
 assert.match(css,/\[data-dot-img\]\{position:relative/);assert.match(css,/\.dot-cv\{position:absolute/);assert.match(css,/dot-pending/);assert.doesNotMatch(css,/@supports/);
});

test('off-screen tables retain their scroll container so mobile fixed UI keeps the real viewport width', () => {
 const css=criticalShell('.table-wrap{overflow-x:auto}.post-body{color:red}');
 assert.match(css,/\.table-wrap\{overflow-x:auto/);assert.doesNotMatch(css,/post-body/);
});
