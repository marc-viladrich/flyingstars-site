import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {sectionSchema} from '../src/schemas/content-schema.mjs';
test('Pricing orb colours follow the current RGB schema, not removed token identities',()=>{
 const schema=sectionSchema.options.find(s=>s.shape.type.value==='pricing');
 const base={_key:'section_test',type:'pricing',headline:'Preise',tiers:[{_key:'tier_test',name:'SPARK',price:'ab 7.900 €',orb:{shape:'ring',color:'255,158,41',count:100}}]};
 assert.equal(schema.safeParse(base).success,true);
 for(const color of ['neon-orange','javascript:alert(1)','rgb(1,2,3)'])assert.equal(schema.safeParse({...base,tiers:[{...base.tiers[0],orb:{...base.tiers[0].orb,color}}]}).success,false);
});
test('Current package RGB tuples expose all three numeric channels from the authoritative JSON schema',()=>{const packages=record('package/configuration');let count=0;for(const f of packages.fields.filter(f=>f.path.includes('color'))){count++;assert.equal(f.kind,'number');assert.ok(f.value>=0&&f.value<=255);}assert.equal(count,9);});
