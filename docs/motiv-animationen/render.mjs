// Deterministic contact sheets from the real catalogue builder/live functions; no browser or invented frames.
import '../../scripts/show-node-env.mjs';
import { catalogScene, CATALOG } from '../../src/scripts/scenes/catalog.js';
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const data={};
for(const key of ['smiley','handschlag','konfetti','anstossen']) {
 const variants=key==='anstossen'||key==='konfetti'?CATALOG[key].variants:[CATALOG[key].variants[0]];
 const frames=[];
 for(const v of variants) {
 const beat=(await catalogScene(key,'SPARK',v.points,key)).beats[0];
 const times=key==='smiley'?[0,.5,1,1.4,1.8,2.6]:[0,.7,1.5,2.3,3.3,4.5];
 const fit=beat.fitPts, x0=Math.min(...fit.map(p=>p[0]))-.2,x1=Math.max(...fit.map(p=>p[0]))+.2,y0=Math.min(...fit.map(p=>p[1]))-.25,y1=Math.max(...fit.map(p=>p[1]))+.15;
 const scale=Math.min(280/(x1-x0),255/(y1-y0));
 for(const [i,t] of times.entries()) {
 const points=beat.pts.map((p,j)=>{const o=[...p.slice(0,3),1];beat.live(p,j,t,o); return [...o,...p.slice(3)];});
 frames.push(`<g transform="translate(${i*320},${(variants.indexOf(v))*320})"><text x="12" y="23" fill="#fff" font-size="14">${key} · ${v.points} · ${t.toFixed(1)} s</text>${points.filter(p=>p[3]>.015).map(p=>`<circle cx="${160+(p[0]-(x0+x1)/2)*scale}" cy="${165-(p[1]-(y0+y1)/2)*scale}" r="2.3" fill="rgb(${p.slice(4)})" opacity="${Math.min(1,p[3])}"/>`).join('')}</g>`);
 }
 data[`${key}/${v.id}`]={times,points:beat.pts.length};
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="${variants.length*320}"><rect width="100%" height="100%" fill="#080d1b"/>${frames.join('')}</svg>`;
 await sharp(Buffer.from(svg)).png().toFile(new URL(`./${key}.png`,import.meta.url).pathname);
}
await writeFile(new URL('./frames.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
