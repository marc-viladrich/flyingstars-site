import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {builtRoutes} from './server.mjs';

test('built routes list every page of a build, nested and localized, without redirect stubs or asset folders',async t=>{
 const site=await fs.mkdtemp(path.join(os.tmpdir(),'built-routes-'));t.after(()=>fs.rm(site,{recursive:true,force:true}));
 const page=async(dir,html='<h1>x</h1>')=>{await fs.mkdir(path.join(site,dir),{recursive:true});await fs.writeFile(path.join(site,dir,'index.html'),html);};
 await page('');await page('sortiment');await page('en/products');await page('alt',`<meta http-equiv="refresh" content="0;url=/neu/">`);await page('_astro');await fs.writeFile(path.join(site,'404.html'),'');
 assert.deepEqual(await builtRoutes(site),['/','/en/products/','/sortiment/']);
});
