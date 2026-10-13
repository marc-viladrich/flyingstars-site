import{PACKAGE_KEYS}from'./package-ids.mjs';
export const packageForTier=tier=>PACKAGE_KEYS.includes(tier?.name)?tier.name:null;
// These legacy YAML facts are computed from the referenced package by Pricing.
export function packageOwnedPagePath(data,path){if(path[0]!=='sections'||path[2]!=='tiers')return false;const section=data.sections?.[path[1]],tier=section?.tiers?.[path[3]];return section?.type==='pricing'&&!!packageForTier(tier)&&['name','price','unit','orb'].includes(path[4]);}
