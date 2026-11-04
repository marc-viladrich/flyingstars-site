import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {sectionSchema} from '../src/schemas/content-schema.mjs';
const hero=sectionSchema.options.find(s=>s.shape.type.value==='hero');
const data={_key:'hero_test',type:'hero',headline:'Bild',image:{src:'https://flyingstars.art/image.jpg',alt:'Eine Drohnenshow',width:100,height:50}};
test('Images use the actual inline object and reject the old asset cache fields',()=>{assert.equal(hero.safeParse(data).success,true);assert.equal(hero.safeParse({...data,image:{...data.image,width:0}}).success,false);assert.equal(hero.safeParse({...data,image:{...data.image,alt:''}}).success,false);});
test('A hash-addressed local upload is valid; arbitrary local paths and executable sources are rejected',()=>{assert.equal(hero.safeParse({...data,image:{...data.image,src:'/assets/'+'a'.repeat(64)+'.png'}}).success,true);for(const src of ['/private/key.png','../escape.png','javascript:alert(1)'])assert.equal(hero.safeParse({...data,image:{...data.image,src}}).success,false);});
test('All real image objects expose source, alt and dimensions to the schema-derived panel',()=>{let count=0;for(const r of records){const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;if(v.src&&'alt'in v&&v.width&&v.height){count++;for(const key of ['alt','width','height'])assert.ok(r.fields.some(f=>JSON.stringify(f.path)===JSON.stringify([...path,key])),r.id+path);}Object.entries(v).forEach(([k,x])=>walk(x,[...path,Array.isArray(v)?Number(k):k]));};walk(r.data);}assert.ok(count>100);});

test('Case-study photographs use the same upload source and image widget without invented dimensions',async()=>{const {projectShowcaseSchema}=await import('../src/schemas/project-showcase.mjs'),photo=projectShowcaseSchema.shape.gallery.unwrap().element;assert.equal(photo.safeParse({src:'/assets/'+'b'.repeat(64)+'.png',alt:'Show am Abend',caption:'Bildunterschrift'}).success,true);assert.equal(photo.meta().format,'image');assert.equal(photo.meta()['x-afe'].widget,'flyingstars/image');assert.equal(photo.safeParse({src:'/private/x.png',alt:'X',caption:'X'}).success,false);});
