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
 const expected=['cut17-av1-960','cut17-h264-960','cut17-av1-1280','cut17-h264-1280','cut17-av1-1440','cut17-h264-1440','cut17-mobile-av1-640','cut17-mobile-h264-640'];
 assert.deepEqual(actual.map(v=>v.id).sort(),expected.sort());
 for(const v of actual){assert.equal(v.duration,16.72);assert.equal(v.edit,'ground-ford-paced-16_72-v4');assert.ok(v.src.endsWith('-v4.mp4'));}
});
test('Inter retains Regular and every reviewed glyph/feature while its served axis is restricted',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-2/font.json',import.meta.url)));
 const css=fs.readFileSync(new URL('../styles/fonts.css',import.meta.url),'utf8');
 assert.ok(css.includes('font-weight: 400 700;'));assert.ok(css.includes('/fonts/inter-latin-400-700-v1.woff2'));
 const bytes=fs.readFileSync(new URL('../../'+report.output,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),report.outputSha256);assert.ok(bytes.length<report.sourceBytes);assert.equal(report.sameCmap,true);assert.equal(report.sameGlyphOrder,true);
});

test('The current edit encodes source motion without appended clone or padding frames',()=>{
 const records=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-4/encodes.json',import.meta.url)));
 const master=records.find(r=>r.role==='lossless-edit-master');
 assert.equal(master.holdFrames,0);
 assert.ok(!master.command.join(' ').includes('tpad'));
 assert.equal(master.segments.reduce((n,[,a,b])=>n+b-a,0),418);
 assert.deepEqual(master.segments,[['ground-cube-qr',0,158],['nfl-plane-ford-flyingstars',387,647]]);
});

test('Every approved file has 28 different decoded ending frames tied to its actual file hash',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-4/end-motion.json',import.meta.url)));
 for(const video of approved()){
  const proof=report.find(r=>r.id===video.id);
  assert.equal(proof.sha256,video.sha256);assert.equal(proof.frames,28);assert.equal(proof.uniqueDecodedFrames,28);
 }
});

test('The paced master preserves the complete ground/cube/QR intro and NFL/Ford/brand ending',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-4/source-lineage.json',import.meta.url)));
 assert.equal(proof.introFramesMatchOriginal,true);assert.equal(proof.closingFramesMatchOriginal,true);
 assert.deepEqual(proof.sourcePassages,[[0,158],[387,647]]);
 assert.equal(proof.matchingDecodedFrames,418);assert.equal(proof.extraInsertedCuts,1);
});
