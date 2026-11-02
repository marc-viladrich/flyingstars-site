import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// These slots render complete marks at a fixed, small height. They deliberately use one transform.
export const singleImageReasons = Object.freeze({
 'logo-marquee':'Kundenlogo, feste Höhe 56 oder 80 px',
 'logo-testimonial':'Kundenlogo, maximal 56 px hoch',
 'logo-proof':'Nachhaltigkeitslogo, feste Höhe 30 px',
 'logo-footer':'Naturstrom-Logo im Footer, 160 px breite Variante',
});
export async function checkContentImages(dist) {
 const counts={pages:0,img:0,srcset:0,sizes:0,exempt:0};const failures=[];
 async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name.endsWith('.html')){
   counts.pages++;const html=await fs.readFile(file,'utf8');
   for(const [tag]of html.matchAll(/<img\b[^>]*>/gi)){
    counts.img++;const attr=name=>tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
    const srcset=attr('srcset'),sizes=attr('sizes'),exemption=attr('data-media-single');
    if(srcset)counts.srcset++;if(sizes)counts.sizes++;
    if(exemption&&Object.hasOwn(singleImageReasons,exemption)&&Number(attr('width'))>0&&Number(attr('width'))<=640&&Number(attr('height'))>0&&Number(attr('height'))<=160){counts.exempt++;continue;}
    if(!srcset||!sizes)failures.push(`${path.relative(dist,file)}: ${attr('src')}: srcset/sizes fehlen oder ungültige Ausnahme`);
   }
  }
 }}await walk(dist);
 if(failures.length)throw new Error(failures.join('\n'));
 return counts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await checkContentImages(path.resolve(process.argv[2]||'dist')),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
