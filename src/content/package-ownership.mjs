import{PACKAGE_KEYS}from'./package-ids.mjs';
export const packageForTier=tier=>PACKAGE_KEYS.find(name=>name.toLowerCase()===tier?.packageId)??null;
// Package facts no longer exist in the section schema. Keep rejecting legacy fact writes.
export function packageOwnedPagePath(data,path){if(path[0]!=='sections'||path[2]!=='tiers')return false;const section=data.sections?.[path[1]],tier=section?.tiers?.[path[3]];return section?.type==='pricing'&&!!packageForTier(tier)&&['name','price','unit','orb','badge','description','highlight','features'].includes(path[4]);}
