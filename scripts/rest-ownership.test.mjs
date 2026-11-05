import {readStyles,styleFiles} from './test-support/styles.mjs';
// Quellprüfung ist hier Absicht: der Vertrag ist ein gemeinsamer CSS-Besitzer, nicht nur derselbe berechnete Wert.
import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {read} from './test-support/read.mjs';
const css=postcss.parse(readStyles());
const declarations=(selector)=>{const result={};css.walkRules(selector,rule=>rule.walkDecls(d=>{result[d.prop]=d.value;}));return result;};
test('K02: Blog- und Projektraster teilen den Spaltenabstand und behalten ihre Raster',()=>{
 assert.equal(declarations(':root')['--card-grid-gap'],'clamp(var(--space-4), 2vw, var(--space-7))');
 assert.equal(declarations('.projects').gap,'var(--card-grid-gap)');
 assert.ok(read('src/components/blog/PostGrid.css').includes('var(--card-grid-gap)'));
});
test('K03: Slider und Schließknopf teilen Geometrie, Zustände bleiben am Slider',()=>{
 const shared=declarations('.reel-close, .slider-btn');
 assert.equal(shared.width,'2.75rem');assert.equal(shared.height,shared.width);
 assert.equal(shared['place-items'],'center');
 assert.ok(!('width' in declarations('.slider-btn')));
 assert.equal(declarations('.slider-btn:disabled').cursor,'default');
});
test('K08: Passive Badges teilen Typografie, keine Auswahl-Chips',()=>{
 const shared=declarations('.chip, .tier .badge');
 assert.equal(shared.font,'500 0.65625rem/1 var(--mono)');
 for(const selector of ['.chip','.tier .badge'])assert.ok(!('font' in declarations(selector)));
 assert.ok(declarations('.chips span')['min-height']);
});
