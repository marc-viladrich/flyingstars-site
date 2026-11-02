import {routeTools} from '../extensions/flyingstars/web/routing.mjs';
const kinds={'page/':['Seite','file-text','Seiten'],'post/':['Blogartikel','newspaper','Blog'],'project/':['Projekt','folder-open','Projekte'],'faq/':['Frage','circle-help','FAQ']};
const name=record=>`${record.title} · ${/^\w+\/(en|nl)\//.exec(record.id)?.[1]?.toUpperCase()||'DE'}`;
const group=id=>id.split('/')[0];
export default [{name:'flyingstars/design',contractVersion:'1.0',hooks:{
 routeTools:()=>routeTools,recordKinds:()=>kinds,navigatorOrder:()=>['page','post','project','faq'],
 languages:()=>({source:'de',locales:{}}),localeNames:()=>({de:'Deutsch',en:'English',nl:'Nederlands'}),
 pageChoices:records=>records.filter(r=>r.route).map(r=>({value:r.route,label:name(r),group:r.type==='post'?'Blog':r.type==='project'?'Projekte':'Seiten'})),
 pageGroups:()=>['Seiten','Projekte','Blog'],currentPage:(records,slug)=>records.find(r=>r.id==='page/'+slug)||records.find(r=>r.route===slug),navigatorName:name,
 navigation:records=>records.filter(r=>r.route).map(r=>({value:r.route,label:name(r)})),
 changeKinds:()=>Object.entries(kinds).map(([key,value])=>({test:id=>id.startsWith(key),title:value[2],icon:value[1]})),recordGroup:group,
 optionalFieldAllowed:()=>true,canDelete:()=>false,isPage:item=>item.type==='page',
 inlineCodec:()=>'flyingstars/design-plain',
},codecs:{'flyingstars/design-plain':{decode:String,encode:String,plainText:String,html:text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;'),fromDOM:node=>node.textContent,supportsDOM:()=>false}}}];
