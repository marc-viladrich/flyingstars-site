import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {contact,legalContactDrift} from '../src/content/contact.mjs';
export function legalDocuments(root=fileURLToPath(new URL('../',import.meta.url))){
 return ['','en/','nl/'].flatMap(locale=>['impressum','datenschutz'].map(name=>{
  const file=`src/content/pages/${locale}${name}.yaml`;
  return {file,text:readFileSync(resolve(root,file),'utf8')};
 }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const drift=legalContactDrift(legalDocuments(),contact);
 console.log(JSON.stringify({legalContactDrift:drift},null,2));
 process.exitCode=drift.length?1:0;
}
