import {normalizeUpload} from './media-upload.mjs';
import {failure} from './native-store.mjs';

/** The existing upload boundary decodes, re-encodes and strips metadata before Git. */
export async function uploadNativeMedia(store,{bytes,name,requestId,expectedHead,actor}){
 if(!Buffer.isBuffer(bytes)||bytes.length>5*1024*1024)throw failure('Bilder dürfen höchstens 5 MB groß sein.',413);
 if(!/^[a-f0-9]{40}$/.test(expectedHead||''))throw failure('Der Ausgangsstand fehlt.');
 const {asset,output}=await normalizeUpload({name,requestId,base64:bytes.toString('base64')});
 const {id,data,file}=store.site.mediaWrite(asset,requestId);
 // The file name is the hash of the normalised bytes: the same image uploaded again reuses its media record.
 const current=await store.state(),existing=current.records.find(record=>record.id.startsWith('media/')&&record.data?.src===data.src);
 if(existing)return{state:current,assetId:existing.id,reused:true};
 const saved=await store.save({expectedHead,requestId,changes:[],creates:[{id,data}]},{actor,binaryWrites:[{file,bytes:output}]});
 return{state:saved,assetId:id};
}
