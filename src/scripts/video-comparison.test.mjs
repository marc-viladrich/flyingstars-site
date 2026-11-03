import test from 'node:test';
import assert from 'node:assert/strict';
import videos from '../data/video-lab.json' with {type:'json'};
import {comparisonSet,comparisonStartTime} from './video-comparison.mjs';
test('Both codec comparisons use the same moving edit and the three requested resolutions',()=>{
 for(const codec of ['h264','av1']){
  const set=comparisonSet(videos,codec);assert.deepEqual(set.map(v=>v.width),[1918,1600,1440,1280]);assert.ok(set.every(v=>v.duration===15));assert.ok(set.every(v=>v.edit===set[0].edit));
 }
 assert.throws(()=>comparisonSet(videos.filter(v=>v.width!==1440)),/1440/);
});

test('Review links can start near the loop boundary and reject invalid URL positions',()=>{
 assert.equal(comparisonStartTime('14',15),14);
 assert.equal(comparisonStartTime('999',15),14.96);
 for(const value of [null,'NaN','Infinity','-2',''])assert.equal(comparisonStartTime(value,15),0);
});
