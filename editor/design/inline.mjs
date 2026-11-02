const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const inlineHtml=text=>String(text).split(/\*([^*]+)\*/).map((part,i)=>i%2?'<span class="grad">'+escape(part)+'</span>':escape(part)).join('');
export const inlinePlain=text=>String(text).replace(/\*([^*]+)\*/g,'$1');
export function inlineText(node){if(!node.tag)return node.text||'';const text=(node.children||[]).map(inlineText).join('');return node.tag==='span'&&node.attributes?.class?.split(/\s+/).includes('grad')?'*'+text+'*':node.tag==='br'?'\n':text;}
export const inlineSupported=node=>!node.tag||['span','br'].includes(node.tag)&&(node.children||[]).every(inlineSupported);
export const inlineCodec={decode:String,encode:String,plainText:inlinePlain,html:inlineHtml,fromDOM:inlineText,supportsDOM:inlineSupported,markSelector:'span.grad',marks:{accent:'grad'},baseButtons:false,buttons:[['sparkles','Akzent','accent']]};
