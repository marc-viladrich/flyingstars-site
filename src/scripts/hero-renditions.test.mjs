import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {heroVideoSources} from '../lib/hero-video-sources.ts';
test('Both hero layouts use the approved 15s edit, with 640px mobile H264 fallback',()=>{
 const sources=heroVideoSources();
 for(const [layout,pair]of Object.entries(sources)){
  assert.equal(pair.preferred.codec,'av1');assert.equal(pair.fallback.codec,'h264');
  for(const video of Object.values(pair)){assert.equal(video.duration,15);assert.equal(video.edit,'qr-logo-15-v2');assert.equal(video.width,layout==='mobile'?640:1918);assert.ok(video.src.endsWith('-v2.mp4'));}
 }
});
test('Inter retains Regular and every reviewed glyph/feature while its served axis is restricted',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-2/font.json',import.meta.url)));
 const css=fs.readFileSync(new URL('../styles/fonts.css',import.meta.url),'utf8');
 assert.ok(css.includes('font-weight: 400 700;'));assert.ok(css.includes('/fonts/inter-latin-400-700-v1.woff2'));
 const bytes=fs.readFileSync(new URL('../../'+report.output,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),report.outputSha256);assert.ok(bytes.length<report.sourceBytes);assert.equal(report.sameCmap,true);assert.equal(report.sameGlyphOrder,true);
});
