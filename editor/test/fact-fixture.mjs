import {reviewedRequest} from './requests.mjs';
import {mkdtemp,symlink,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {NativeStore,NativeBuilder,git} from 'astro-frontend-editor/runtime';
import {createSite} from '../flyingstars-adapter.mjs';
import {resolveRuntimeOptions} from '../server.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export async function factFixture(t){
 const dir=await mkdtemp(path.join(os.tmpdir(),'fs-fact-proof-'));
 await git(root,['clone','--quiet','--no-hardlinks',root,dir]);
 await git(dir,['checkout','-B','content/draft']);
 await symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'));
 const site=await createSite(dir),runtime=resolveRuntimeOptions({env:{},values:{siteRoot:dir,stateDir:path.join(dir,'state')}});
 const store=await new NativeStore(dir,{remote:false,site,runtime}).init();
 t.after(async()=>{store.sync.close();await rm(dir,{recursive:true,force:true});});
 return {dir,store,async save(id,values){const state=await store.state(),record=state.records.find(r=>r.id===id);return store.save(reviewedRequest(state,Object.entries(values).map(([key,value])=>[id,[key],value])));},async build(head){const builder=new NativeBuilder(store,path.join(dir,'artifacts'),{editor:true,origin:'https://flyingstars.art',env:{...process.env,AFE_STATE_DIR:path.join(dir,'build-state'),FLYINGSTARS_OFFLINE_MEDIA:'1'}});return builder.prepare(head);}};
}
