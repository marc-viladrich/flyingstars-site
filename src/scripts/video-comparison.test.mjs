import test from 'node:test';
import assert from 'node:assert/strict';
import videos from '../data/video-lab.json' with {type:'json'};
import {comparisonSet} from './video-comparison.mjs';
test('Both codec comparisons use the same moving edit and the three requested resolutions',()=>{
 for(const codec of ['h264','av1']){
  const set=comparisonSet(videos,codec);assert.deepEqual(set.map(v=>v.width),[1918,1600,1440,1280]);assert.ok(set.every(v=>v.duration===13.88));assert.ok(set.every(v=>v.edit===set[0].edit));
 }
 assert.throws(()=>comparisonSet(videos.filter(v=>v.width!==1440)),/1440/);
});
