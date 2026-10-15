import {extensions} from './site-adapter.mjs';
export const recordKinds=extensions.first('recordKinds')??{};
const fallback=['Inhalt','file-text','Inhalte'];
export const kindOf=id=>recordKinds[String(id).split('/')[0]+'/']||fallback;
export const kindPlural=prefix=>(recordKinds[prefix]||fallback)[2];
