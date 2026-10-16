import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileBytes} from '../../core/source-registry.mjs';
import {MAX_MEDIA_BYTES} from '../../core/media-limits.mjs';
import {policies} from './policies.mjs';
import {templates,newRecordData,uniqueSection} from './templates.mjs';
import {prepareOverlays,validateOverlays,translationStorage} from './translations.mjs';
import {mediaLibrary} from './media.mjs';
import {queryFor} from './queries.mjs';
import {contactProposals} from './site-data.mjs';
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
const extension=(name,hooks)=>({name:'flyingstars/'+name,contractVersion:'1.0',hooks});

/** Site registration only. Schema parsing still owns comparison-table and section invariants. */
export function createFlyingStarsExtensions(site) {
 return [
  extension('policies',policies(site)),
  extension('creation',{
   templates,createRecord:newRecordData,uniqueSection,
   preventDelete:id=>id==='page/index',
   async validateCreation({store,source,creation}){
    if(source.prefix!=='page')return;
    const slug=creation.id.slice(5);
    if(['index','editor','admin'].includes(slug)||await fileBytes(path.join(store.root,'src/pages',slug+'.astro'))!==null||await fileBytes(path.join(store.root,'src/pages',slug,'index.astro'))!==null)throw failure('Dieser Seitenpfad ist bereits reserviert.',409);
   },
  }),
  extension('routing',{
   route:(record,adapter=site)=>adapter.recordRoute(record),
   recordGroup:id=>/^(page|screen)\//.test(id)?'pages':/^(project|post)\//.test(id)?'stories':id.startsWith('faq/')?'faq':/^(package|extra)\//.test(id)?'packages':/^(client|team)\//.test(id)?'people':id.startsWith('site/')?'site':null,
   languages:()=>({source:'de',locales:{en:'English',nl:'Nederlands'}}),
   navigation(records,locale='de'){
    const prefix=locale==='de'?'':'/'+locale;
    const routes=new Map([['/','Startseite'],['/drohnenshow-preise/','Preise & Pakete'],['/show-konfigurator/','Show-Konfigurator']]);
    for(const record of records){const route=site.recordRoute(record);if(route)routes.set(route,record.title);}
    return [...routes].map(([route,label])=>({value:prefix+route,label}));
   },
  }),
  extension('queries',{query:queryFor}),
  extension('site-data',{normalize:contactProposals}),
  extension('inline',{codec:name=>name==='flyingstars/inline'?site.inlineCodec:undefined}),
  extension('translations',{prepareTransaction:prepareOverlays,validateTransaction:validateOverlays,translationStorage:()=>translationStorage(site.translatableFields,site.sourceFor)}),
  extension('media',{
   mediaLibrary,
   mediaPolicy:()=>({
    maxBytes:MAX_MEDIA_BYTES,mime:/^image\/(png|jpeg|webp)$/,
    normalize:async upload=>(await import('../../media-upload.mjs')).normalizeUpload(upload),
    write(asset,requestId){return{id:'media/'+requestId,data:{title:asset.title,src:'/'+asset.src,defaultAlt:'',width:asset.width,height:asset.height,mime:asset.mime},file:'public/'+asset.src};},
    find:(records,data)=>records.find(record=>record.id.startsWith('media/')&&record.data?.src===data.src),
    response:(state,id,reused=false)=>({state,assetId:id,...reused?{reused:true}:{}}),
   }),
   validateBinaryWrite(write){if(!/^public\/assets\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(write.file)||path.basename(write.file).split('.')[0]!==createHash('sha256').update(write.bytes).digest('hex'))throw failure('Ungültiges Medienobjekt.');},
  }),
  extension('build',{buildEnvironment:({editor,origin,imageCache})=>({...imageCache?{FLYINGSTARS_IMAGE_CACHE_DIR:imageCache}:{},...editor?{AFE_MODE:'editor'}:{},SITE_URL:origin})}),
 ];
}
