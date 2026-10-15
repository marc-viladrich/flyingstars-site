import {failure} from './native-store.mjs';

/** The existing upload boundary decodes, re-encodes and strips metadata before Git. */
export async function uploadNativeMedia(store,{bytes,name,requestId,expectedHead,actor}){
 const policy=store.site.extensions.require('mediaPolicy');
 if(!Buffer.isBuffer(bytes)||bytes.length>policy.maxBytes)throw failure('Bilder dürfen höchstens 5 MB groß sein.',413);
 if(!/^[a-f0-9]{40}$/.test(expectedHead||''))throw failure('Der Ausgangsstand fehlt.');
 const {asset,output}=await policy.normalize({name,requestId,base64:bytes.toString('base64')});
 const {id,data,file}=policy.write(asset,requestId);
 // The file name is the hash of the normalised bytes: the same image uploaded again reuses its media record.
 const current=await store.state(),existing=policy.find(current.records,data);
 // A retried request (same id) stays a replay of its own commit; a new request for the same file reuses it.
 if(existing&&existing.id!==id)return policy.response(current,existing.id,true);
 const saved=await store.save({expectedHead,requestId,changes:[],creates:[{id,data}]},{actor,binaryWrites:[{file,bytes:output}]});
 return policy.response(saved,id);
}
