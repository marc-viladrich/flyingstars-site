import './test/register-browser-site.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {site,records,pages,record,root} from './test/design-data.mjs';
import {readFile} from 'node:fs/promises';
import {instrument} from 'astro-frontend-editor/astro/markers';
test('The source compiler binds the actual section props and preserves its native canvas script',async()=>{const source=await readFile(root+'src/components/sections/FlightHero.astro','utf8'),out=await instrument(source);assert.match(out,/__afeAttrs\(__afe\["text"\]\)/);assert.match(out,/scripts\/hero-reel/);assert.ok(out.includes('data-reel-host'));});
test('Repeated array entries bind by their runtime index without a selector or text search',async()=>{const out=await instrument('---\nconst {items}=Astro.props;\n---\n{items.map(item=><p>{item.label}</p>)}');assert.match(out,/item,__afeIndex0/);assert.match(out,/__afeChild\(__afeChild\(__afe\["items"\],__afeIndex0\),"label"\)/);assert.doesNotMatch(out,/querySelector|textContent/);});
test('All current section components compile through one instrumentation path',async()=>{const {readdir}=await import('node:fs/promises');for(const dir of ['sections','landing'])for(const file of(await readdir(root+'src/components/'+dir)).filter(f=>f.endsWith('.astro'))){const source=await readFile(root+'src/components/'+dir+'/'+file,'utf8');assert.equal(typeof await instrument(source),'string',file);}});
