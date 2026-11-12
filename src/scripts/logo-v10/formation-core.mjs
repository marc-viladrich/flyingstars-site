// Normalised configurator coordinates; source anchors remain in pass-one raster coordinates.
export function toFormation(points, margin=.03) {
 if(!points.length)return [];
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),cx=(x0+x1)/2,cy=(y0+y1)/2,k=2/(Math.max(x1-x0,y1-y0,1e-6)*(1+2*margin));
 const out=points.map(p=>({x:(p.x-cx)*k,y:(p.y-cy)*k,c:[p.r,p.g,p.b],wt:1,e:p.e,cg:p.cg}));
 Object.defineProperty(out,'scale',{value:k});Object.defineProperty(out,'frame',{value:{sx:k,sy:k,ox:-cx*k,oy:-cy*k}});return out;
}
export async function fitToShow(result,n) {
 const pts=toFormation(result.points),wanted=Math.max(result.points.length,result.meta?.budget?.wanted||0);
 pts.meta={...result.meta,n,wanted,over:result.meta?.budget?.over===true||result.points.length>n,simplified:(result.meta?.simplified||[]).length>0,spacing:result.spacing* (pts.scale||1)};
 return pts;
}
