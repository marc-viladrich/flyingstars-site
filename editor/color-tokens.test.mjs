import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {sectionSchema} from '../src/schemas/content-schema.mjs';
test('Pricing orb colours follow the current RGB schema, not removed token identities',()=>{
 const schema=sectionSchema.options.find(s=>s.shape.type.value==='pricing');
 const base={type:'pricing',headline:'Preise',tiers:[{name:'SPARK',price:'ab 7.900 €',orb:{shape:'ring',color:'255,158,41',count:100}}]};
 assert.equal(schema.safeParse(base).success,true);
 for(const color of ['neon-orange','javascript:alert(1)','rgb(1,2,3)'])assert.equal(schema.safeParse({...base,tiers:[{...base.tiers[0],orb:{...base.tiers[0].orb,color}}]}).success,false);
});
test('Every existing colour field is described from its actual schema and value',()=>{let count=0;for(const r of pages)for(const field of r.fields.filter(f=>f.path.at(-1)==='color')){count++;assert.equal(typeof field.value,'string');assert.equal(field.kind,'text');}assert.ok(count);});
