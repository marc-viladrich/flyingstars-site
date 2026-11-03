import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {heroVideoSources} from '../lib/hero-video-sources.ts';
test('Both hero layouts use the approved moving edit, with 640 px mobile H264 fallback',()=>{
 const sources=heroVideoSources();
 for(const [layout,pair]of Object.entries(sources)){
  assert.equal(pair.preferred.codec,'av1');assert.equal(pair.fallback.codec,'h264');
  for(const video of Object.values(pair)){assert.equal(video.duration,13.88);assert.equal(video.edit,'qr-logo-motion-13_88-v3');assert.equal(video.width,layout==='mobile'?640:1440);assert.ok(video.src.endsWith('-v3.mp4'));}
 }
});
test('Inter retains Regular and every reviewed glyph/feature while its served axis is restricted',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-2/font.json',import.meta.url)));
 const css=fs.readFileSync(new URL('../styles/fonts.css',import.meta.url),'utf8');
 assert.ok(css.includes('font-weight: 400 700;'));assert.ok(css.includes('/fonts/inter-latin-400-700-v1.woff2'));
 const bytes=fs.readFileSync(new URL('../../'+report.output,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),report.outputSha256);assert.ok(bytes.length<report.sourceBytes);assert.equal(report.sameCmap,true);assert.equal(report.sameGlyphOrder,true);
});

test('The current edit encodes source motion without appended clone or padding frames',()=>{
 const records=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-3/encodes.json',import.meta.url)));
 const master=records.find(r=>r.role==='lossless-edit-master');
 assert.equal(master.holdFrames,0);
 assert.ok(!master.command.join(' ').includes('tpad'));
 assert.equal(master.segments.reduce((n,[,a,b])=>n+b-a,0),347);
});

test('Every approved file has 28 different decoded ending frames tied to its actual file hash',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-3/end-motion.json',import.meta.url)));
 const sources=heroVideoSources();
 for(const pair of Object.values(sources))for(const video of Object.values(pair)){
  const proof=report.find(r=>r.id===video.id);
  assert.equal(proof.sha256,video.sha256);assert.equal(proof.frames,28);assert.equal(proof.uniqueDecodedFrames,28);
 }
});
