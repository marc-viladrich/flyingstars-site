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
 const expected=['cut17b-av1-960','cut17b-h264-960','cut17b-av1-1280','cut17b-h264-1280','cut17b-av1-1440','cut17b-h264-1440','cut17b-mobile-av1-640','cut17b-mobile-h264-640'];
 assert.deepEqual(actual.map(v=>v.id).sort(),expected.sort());
 for(const v of actual){assert.equal(v.duration,16.76);assert.equal(v.edit,'motif-diversity-16_76-v5');assert.ok(v.src.endsWith('-v5.mp4'));}
});
test('Inter retains Regular and every reviewed glyph/feature while its served axis is restricted',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-2/font.json',import.meta.url)));
 const css=fs.readFileSync(new URL('../styles/fonts.css',import.meta.url),'utf8');
 assert.ok(css.includes('font-weight: 400 700;'));assert.ok(css.includes('/fonts/inter-latin-400-700-v1.woff2'));
 const bytes=fs.readFileSync(new URL('../../'+report.output,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),report.outputSha256);assert.ok(bytes.length<report.sourceBytes);assert.equal(report.sameCmap,true);assert.equal(report.sameGlyphOrder,true);
});

test('The current edit encodes source motion without appended clone or padding frames',()=>{
 const records=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-5/encodes.json',import.meta.url)));
 const master=records.find(r=>r.role==='lossless-edit-master');
 assert.equal(master.holdFrames,0);
 assert.ok(!master.command.join(' ').includes('tpad'));
 assert.equal(master.segments.reduce((n,[,a,b])=>n+b-a,0),419);
 assert.deepEqual(master.segments,[['ground-flight',0,41],['qr-scan-me',100,158],['hummingbird-puma-brockenriders-catch',240,387],['nfl-single-logo',408,434],['ford-overhead-transitions-flyingstars',463,610]]);
});

test('Every approved file has 28 different decoded ending frames tied to its actual file hash',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-5/end-motion.json',import.meta.url)));
 for(const video of approved()){
  const proof=report.find(r=>r.id===video.id);
  assert.equal(proof.sha256,video.sha256);assert.equal(proof.frames,28);assert.equal(proof.uniqueDecodedFrames,28);
 }
});

test('The current master includes every requested motif and excludes the Cube, second NFL logo and ground-level Ford scene',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../../docs/video-lab/round-5/source-lineage.json',import.meta.url)));
 assert.equal(proof.allFramesMatchOriginal,true);
 assert.deepEqual(proof.sourcePassages,[[0,41],[100,158],[240,387],[408,434],[463,610]]);
 assert.equal(proof.matchingDecodedFrames,419);assert.equal(proof.extraInsertedCuts,4);
});
