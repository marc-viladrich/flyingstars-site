import {normalizeUpload} from './media-upload.mjs';
import {failure} from './native-store.mjs';

/** The existing upload boundary decodes, re-encodes and strips metadata before Git. */
export async function uploadNativeMedia(store,{bytes,name,requestId,expectedHead,actor}){
 if(!Buffer.isBuffer(bytes)||bytes.length>5*1024*1024)throw failure('Bilder dürfen höchstens 5 MB groß sein.',413);
 if(!/^[a-f0-9]{40}$/.test(expectedHead||''))throw failure('Der Ausgangsstand fehlt.');
 const {asset,output}=await normalizeUpload({name,requestId,base64:bytes.toString('base64')});
 const id='media/'+requestId;
 const data={title:asset.title,src:'/'+asset.src,defaultAlt:'',width:asset.width,height:asset.height,mime:asset.mime};
 const saved=await store.save({expectedHead,requestId,changes:[],creates:[{id,data}]},{actor,binaryWrites:[{file:'public/'+asset.src,bytes:output}]});
 return{state:saved,assetId:id};
}
