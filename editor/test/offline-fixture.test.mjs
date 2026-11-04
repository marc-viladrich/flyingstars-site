import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {i18nFixture} from '../i18n-test-fixture.mjs';

test('offline pipeline fixture needs no cached npm registry metadata', async t => {
  const cache=await mkdtemp(path.join(os.tmpdir(),'fs-empty-npm-cache-'));
  t.after(()=>rm(cache,{recursive:true,force:true}));
  const previous=process.env.npm_config_cache;
  process.env.npm_config_cache=cache;
  try {
    const fixture=await i18nFixture(t,{forCI:true});
    fixture.store.sync.close();
  } finally {
    if(previous===undefined)delete process.env.npm_config_cache;
    else process.env.npm_config_cache=previous;
  }
});
