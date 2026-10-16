// Translations kept in the site's own records (language records, language containers) or none at all: the
// browser side of editor/core/locale-translations.mjs, and the default for every site without overlays.
// There are no translation records: the page in a language shows that language's own content. Machine
// results arrive as field patches of existing records and go into the draft, where saving is the review.
export const contentTranslations={
 type:'content',orphanLabel:'Übersetzungen',
 isRecord:()=>false,metadata:()=>null,id:()=>null,
 value:()=>undefined,find:()=>undefined,fresh:()=>false,suggested:()=>false,
 owner:user=>user,overlay:()=>[],pending:()=>[],
 write(){throw Error('Texte in einer anderen Sprache werden direkt auf der Seite dieser Sprache bearbeitet.');},
 accept(){},
 merge(items,accept,{draft}){draft.group(()=>{for(const item of items)for(const patch of item.patches||[])draft.set(item.id,patch.path,patch.value);});},
};
