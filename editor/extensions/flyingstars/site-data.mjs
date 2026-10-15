const getPath=(data,path)=>path.reduce((value,key)=>value?.[key],data);
/** Same proposals as the existing linked contact input. Applied only by an explicit caller. */
export function contactProposals({path,value,data}) {
 if(path.at(-1)!=='value'||typeof value!=='string')return undefined;
 const hrefPath=[...path.slice(0,-1),'href'],href=getPath(data,hrefPath);
 if(typeof href!=='string')return undefined;
 if(href.startsWith('mailto:'))return [{path:hrefPath,value:'mailto:'+value.trim()}];
 if(href.startsWith('tel:')){const digits=value.replace(/[^\d+]/g,'');return [{path:hrefPath,value:'tel:'+(digits.startsWith('+')?digits:digits.startsWith('0')?'+49'+digits.slice(1):digits)}];}
 return undefined;
}
