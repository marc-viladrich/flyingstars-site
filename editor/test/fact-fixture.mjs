import {reviewedRequest} from './requests.mjs';
import path from 'node:path';
import {NativeBuilder} from 'astro-frontend-editor/runtime';
import {i18nFixture} from '../i18n-test-fixture.mjs';

export async function factFixture(t){
 const {source:dir,store}=await i18nFixture(t);
 t.after(()=>store.sync.close());
 return {dir,store,async save(id,values){const state=await store.state(),record=state.records.find(r=>r.id===id);return store.save(reviewedRequest(state,Object.entries(values).map(([key,value])=>[id,[key],value])));},async build(head){const builder=new NativeBuilder(store,path.join(dir,'artifacts'),{editor:true,origin:'https://flyingstars.art',env:{...process.env,AFE_STATE_DIR:path.join(dir,'build-state'),FLYINGSTARS_OFFLINE_MEDIA:'1'}});return builder.prepare(head);}};
}
