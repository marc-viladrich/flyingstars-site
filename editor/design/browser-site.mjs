import {inlineCodec} from './inline.mjs';
import {imageControl,selectImage,library,mediaUsage,mediaUsers,collectionOf} from './media-browser.mjs';
import {reviewLocales,uniqueSection} from './locale-review.mjs';
import {routeTools} from '../extensions/flyingstars/web/routing.mjs';
const kinds={'media/':['Bild','image','Mediathek'],'page/':['Seite','file-text','Seiten'],'post/':['Blogartikel','newspaper','Blog'],'project/':['Projekt','folder-open','Projekte'],'site/':['Website-Daten','settings','Website-Daten'],'faq/':['Frage','circle-help','FAQ']};
const name=record=>`${record.title} · ${/^\w+\/(en|nl)\//.exec(record.id)?.[1]?.toUpperCase()||'DE'}`;
const group=id=>id.split('/')[0];
export default [{name:'flyingstars/design',contractVersion:'1.0',hooks:{
 routeTools:()=>routeTools,recordKinds:()=>kinds,navigatorOrder:()=>['page','post','project','faq','media','site'],
 languages:()=>({source:'de',locales:{}}),localeNames:()=>({de:'Deutsch',en:'English',nl:'Nederlands'}),
 pageChoices:records=>records.filter(r=>r.route).map(r=>({value:r.route,label:name(r),group:r.type==='post'?'Blog':r.type==='project'?'Projekte':'Seiten'})),
 pageGroups:()=>['Seiten','Projekte','Blog'],currentPage:(records,slug)=>records.find(r=>r.id==='page/'+slug)||records.find(r=>r.route===slug),navigatorName:name,
 navigation:records=>records.filter(r=>r.route).map(r=>({value:r.route,label:name(r)})),
 changeKinds:()=>Object.entries(kinds).map(([key,value])=>({test:id=>id.startsWith(key),title:value[2],icon:value[1]})),recordGroup:group,
 mediaLibrary:library,mediaUsage,mediaUsers,mediaCollection:collectionOf,isMedia:r=>r.type==='media',mediaSource:v=>v?.src,imageSummary:v=>({label:v?.alt||'Bild',thumb:v?.src}),mediaSelection:v=>v?.src,selectedMedia:selectImage,uploadedMediaId:uploaded=>uploaded.assetId,mediaUsageKeys:()=>['src','alt','width','height'],
 resolveReference:(records,value,reference)=>records.find(r=>r.address?.collection===reference?.collection&&r.address.id===value),referencePrefix:reference=>reference?.collection==='projects'?'project/':null,referencedRecords:(records,reference)=>records.filter(r=>r.address?.collection===reference?.collection),mediaAssetSearch:asset=>[asset.data.title,asset.data.defaultAlt,asset.data.src],mediaSearchText:r=>r.data?.defaultAlt,
 beforeSave:reviewLocales,uniqueSection,optionalFieldAllowed:()=>true,canDelete:()=>false,isPage:item=>item.type==='page',
 omitRecordField:(_item,_data,path)=>path[0]==='translationSourceHash',inlineCodec:()=>'flyingstars/design-plain',
},widgets:{'flyingstars/image':{render:imageControl}},codecs:{'flyingstars/design-plain':inlineCodec}}];
