import {createHash} from 'node:crypto';
import {MAX_MEDIA_BYTES,normalizeUpload} from 'astro-frontend-editor/runtime/extensions';
import {mediaUsage,mediaUsers,collectionOf} from '../extensions/flyingstars/web/media-usage.mjs';
export {mediaUsage,mediaUsers,collectionOf};
// Existing images are derived from actual usages. Uploads have a catalogue entry, while content
// continues to store the image object defined by its Zod schema, without a shadow assetId.
export {library} from './media-browser.mjs';
import {library} from './media-browser.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const mediaHooks={mediaLibrary:library,mediaPolicy:()=>({maxBytes:MAX_MEDIA_BYTES,mime:/^image\/(png|jpeg|webp)$/,normalize:normalizeUpload,
 write:(asset,id)=>({id:'media/'+id,data:{title:asset.title,src:'/'+asset.src,defaultAlt:'',width:asset.width,height:asset.height,mime:asset.mime},file:'public/'+asset.src}),
 find:(records,data)=>records.find(r=>r.type==='media'&&r.data.src===data.src),response:(state,id,reused=false)=>({state,assetId:id,reused})}),
 validateBinaryWrite(write){if(!/^public\/assets\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(write.file)||write.file.split('/').at(-1).split('.')[0]!==hash(write.bytes))throw Error('Ungültiges Medienobjekt.');},
 references:(records,target)=>target.id.startsWith('media/')?mediaUsers(records,target):[],
};
