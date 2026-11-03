import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {heroVideoSources} from '../lib/hero-video-sources.ts';
function renditions(value) {
 if(!value||typeof value!=='object')return [];
 if(typeof value.src==='string'&&typeof value.codec==='string')return [value];
 return Object.values(value).flatMap(renditions);
}
const approved=()=>[...new Map(renditions(heroVideoSources()).map(v=>[v.id,v])).values()];
test('Every adaptive hero tier uses the same paced edit and its matching H264 fallback',()=>{
 const actual=approved();
 const expected=['cut15d-av1-960','cut15d-h264-960','cut15d-av1-1280','cut15d-h264-1280','cut15d-av1-1440','cut15d-h264-1440','cut15d-mobile-av1-640','cut15d-mobile-h264-640'];
 assert.deepEqual(actual.map(v=>v.id).sort(),expected.sort());
 for(const v of actual){assert.equal(v.duration,15.16);assert.equal(v.edit,'dynamic-ending-no-cube-15_16-v7');assert.ok(v.src.endsWith('-v7.mp4'));}
});
test('Inter retains Regular and every reviewed glyph/feature while its served axis is restricted',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-2/font.json',import.meta.url)));
 const css=fs.readFileSync(new URL('../styles/fonts.css',import.meta.url),'utf8');
 assert.ok(css.includes('font-weight: 400 700;'));assert.ok(css.includes('/fonts/inter-latin-400-700-v1.woff2'));
 const bytes=fs.readFileSync(new URL('../../'+report.output,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),report.outputSha256);assert.ok(bytes.length<report.sourceBytes);assert.equal(report.sameCmap,true);assert.equal(report.sameGlyphOrder,true);
});

test('The current edit encodes source motion without appended clone or padding frames',()=>{
 const records=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-7/encodes.json',import.meta.url)));
 const master=records.find(r=>r.role==='lossless-edit-master');
 assert.equal(master.holdFrames,0);
 assert.ok(!master.command.join(' ').includes('tpad'));
 assert.equal(master.segments.reduce((n,[,a,b])=>n+b-a,0),379);
 assert.deepEqual(master.segments,[['ground-flight',0,41],['qr-zoom-without-cube',94,158],['hummingbird-puma-brockenriders-catch',240,387],['nfl-single-logo',408,434],['ford-to-dynamic-flyingstars',463,564]]);
});

test('Every approved file has 28 different decoded ending frames tied to its actual file hash',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-7/end-motion.json',import.meta.url)));
 for(const video of approved()){
  const proof=report.find(r=>r.id===video.id);
  assert.equal(proof.sha256,video.sha256);assert.equal(proof.frames,28);assert.equal(proof.uniqueDecodedFrames,28);
 }
});

test('The current master preserves the reviewed motif choices and requested omissions',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-7/source-lineage.json',import.meta.url)));
 assert.equal(proof.allFramesMatchOriginal,true);
 assert.deepEqual(proof.sourcePassages,[[0,41],[94,158],[240,387],[408,434],[463,564]]);
 assert.equal(proof.matchingDecodedFrames,379);assert.equal(proof.extraInsertedCuts,4);
});

test('The incoming QR zoom survives continuously after all Cube frames are omitted',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-7/source-lineage.json',import.meta.url)));
 assert.deepEqual(proof.qrZoom.sourceFrames,[94,118]);
 assert.deepEqual(proof.qrZoom.outputFrames,[41,65]);
 assert.equal(proof.qrZoom.matchingDecodedFrames,24);
 assert.equal(proof.qrZoom.matchesOriginal,true);
});

test('No Cube footage or later static logo shot can return to the active edit',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-7/source-lineage.json',import.meta.url)));
 assert.equal(proof.omissions.cubeFramesAbsent,true);
 assert.equal(proof.omissions.staticLogoFramesAbsent,true);
 assert.equal(proof.omissions.lastSourceFrame,563);
 for(const [a,b] of proof.sourcePassages)for(let frame=a;frame<b;frame++){
  assert.ok(frame<41||frame>=94,'Cube frame '+frame);
  assert.ok(frame<564,'Later logo frame '+frame);
 }
});
