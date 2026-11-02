import * as fields from './site-adapter.mjs';
import {recordKinds} from './record-kinds.mjs';
import * as media from './media-usage.mjs';
import {routeTools} from './routing.mjs';
import * as navigation from './navigation.mjs';
import {translationStorage} from './translations.mjs';
import {COLOR_TOKENS} from '../../../../src/lib/color-tokens.mjs';
import * as frame from './frame.mjs';
import {prepareClonedSection} from './prepare-cloned-section.mjs';
import {isRuntime,attributePolicy} from './preview.mjs';
import {inlineText,inlineSupported} from './inline-format.mjs';
import {inlineHtml,inlinePlain} from '../../../../src/lib/inline-text.mjs';
import {packageOwnedPagePath} from '../../../../src/content/package-ownership.mjs';
import {newRecordData,uniqueSection} from './factories.mjs';
import {queryFor} from '../queries.mjs';
import {contactProposals} from '../site-data.mjs';
const extension=(name,hooks)=>({name:'flyingstars/'+name,contractVersion:'1.0',hooks});
export const inlineCodec={decode:source=>String(source),encode:value=>{if(typeof value!=='string')throw Error('Inline text must be a string.');return value;},html:inlineHtml,plainText:inlinePlain,fromDOM:inlineText,supportsDOM:inlineSupported,markSelector:'span.t-outline, span.t-caps',marks:{outline:'t-outline',caps:'t-caps'},buttons:[['type-outline','Kontur (hohle Schrift)','outline'],['case-upper','Versalien','caps']]};
const queries={faq:{name:'flyingstars/faq',prefix:'faq/',label:'Frage hinzufügen',orderLabel:'Fragen in diesem Abschnitt'},projectGrid:{name:'flyingstars/projects',prefix:'project/',label:'Projekt hinzufügen'},postList:{name:'flyingstars/posts',prefix:'post/',label:'Blogartikel hinzufügen'}};
export default [
 extension('fields',{
  resolveReference:fields.resolveReference,
  omitOwnedField:fields.omitOwnedField,
  omitRecordField:fields.omitRecordField,
  mediaRecordFor:fields.mediaRecordFor,
  imageSummary:fields.imageSummary,
  mediaSource:fields.mediaSource,
  mediaControl:fields.mediaControl,
  siteChange:fields.siteChange,
  mediaSelection:fields.mediaSelection,
  selectedMedia:fields.selectedMedia,
  uploadedMediaId:fields.uploadedMediaId,
  referencePrefix:fields.referencePrefix,
  optionalFieldAllowed:fields.optionalFieldAllowed,
  referencedRecords:fields.referencedRecords,
  mediaUsageKeys:()=>[...fields.mediaUsageKeys],derivedPath:packageOwnedPagePath,
 }),
 {...extension('widgets',{}),widgets:fields.siteWidgets},
 {...extension('inline',{inlineCodec:()=>'flyingstars/inline'}),codecs:{'flyingstars/inline':inlineCodec}},
 extension('creation',{createRecord:newRecordData,uniqueSection,creationForm:navigation.creationForm,validateCreation:navigation.validateCreation,newPage:()=>({prefix:'page/',label:'Neue Seite anlegen'}),isPage:item=>/^(page|screen)\//.test(item.id),navigateCreated:navigation.navigateCreated,canDelete:navigation.canDelete}),
 extension('queries',{orderedQuery:({ids,field})=>field==='order'&&ids?.length&&ids.every(id=>id.startsWith('faq/'))?queryFor('flyingstars/faq'):undefined,query:queryFor,sectionQuery:section=>{const spec=queries[section?.type];return spec?{...spec,...queryFor(spec.name)}:undefined;}}),
 extension('contact',{normalize:contactProposals}),
 extension('translations',{ownerless:id=>id.startsWith('translation/'),translationStorage:()=>translationStorage}),
 extension('navigation',{routeTools:()=>routeTools,languages:()=>({source:'de',locales:{en:'English',nl:'Nederlands'}}),localeNames:()=>({de:'Deutsch',en:'English',nl:'Nederlands'}),colorTokens:()=>COLOR_TOKENS,
  recordKinds:()=>recordKinds,navigatorOrder:()=>['page','screen','post','project','package','extra','client','team','faq','media','site'],sortNavigatorByRoute:type=>type==='page',
  navigation:navigation.navigationChoices,pageChoices:navigation.pageChoices,pageGroups:()=>['Seiten','Projekte','Blog'],currentPage:navigation.currentPage,navigatorName:navigation.navigatorName,
  changeKinds:()=>navigation.changeKinds,translationKinds:()=>navigation.translationKinds,recordGroup:navigation.translationKindOf,
 }),
 extension('media',{mediaUsage:media.mediaUsage,mediaCollection:media.collectionOf,mediaLibrary:media.mediaLibrary,mediaUsers:media.mediaUsers,isMedia:item=>item.id.startsWith('media/'),isPhoto:data=>/jpe?g/.test(data?.mime||''),mediaSearchText:r=>r.id.startsWith('media/')?r.data?.defaultAlt:'',mediaAssetSearch:a=>[a.data.title,a.data.defaultAlt,a.id.split('/').slice(1).join('/')]}),
 extension('frame',{attributePolicy,isRuntime,prepareClone:prepareClonedSection,...frame}),
];
