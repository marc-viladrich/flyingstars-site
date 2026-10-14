import {escapeHTML} from './editorial-text.mjs';

const formats={
 '**':['<strong>','</strong>'], '*':['<em>','</em>'], '~~':['<s>','</s>'],
 '{o}':['<span class="t-outline">','</span>'], '{c}':['<span class="t-caps">','</span>'],
};
// A stack keeps all five formats nestable without recognising links, blocks or raw HTML.
// Incomplete marks remain literal, so unfinished editor input never loses text.
function render(text, html) {
 const stack=[{mark:'',text:''}];
 const append=value=>{stack[stack.length-1].text+=value;};
 const open=mark=>stack.push({mark,text:''});
 const close=()=>{const node=stack.pop(),tags=formats[node.mark];append(html?tags[0]+node.text+tags[1]:node.text);};
 for(let i=0;i<text.length;){
  // A backslash keeps the next mark character literal (\* \~ \{ \\), written by the editor for typed asterisks.
  if(text[i]==='\\'&&/[\\*~{]/.test(text[i+1]||'')){append(text[i+1]);i+=2;continue;}
  const brace=/^\{(\/?[oc])\}/.exec(text.slice(i));
  if(brace){const token=brace[0];if(token[1]==='/'){const mark='{'+token[2]+'}';if(stack.at(-1).mark===mark)close();else append(token);}else open(token);i+=token.length;continue;}
  if(text[i]==='*'){
   let end=i;while(text[end]==='*')end++;
   let remaining=end-i;const canClose=i>0&&!/\s/.test(text[i-1]),canOpen=end<text.length&&!/\s/.test(text[end]);
   while(remaining){const mark=stack.at(-1).mark;
    if(canClose&&(mark==='*'||mark==='**')&&mark.length<=remaining){close();remaining-=mark.length;}
    else if(canOpen){const next=remaining>=2?'**':'*';open(next);remaining-=next.length;}
    else{append('*'.repeat(remaining));remaining=0;}
   }
   i=end;continue;
  }
  if(text.startsWith('~~',i)){
   if(stack.at(-1).mark==='~~'&&i>0&&!/\s/.test(text[i-1]))close();
   else if(i+2<text.length&&!/\s/.test(text[i+2]))open('~~');else append('~~');
   i+=2;continue;
  }
  append(text[i++]);
 }
 while(stack.length>1){const node=stack.pop();append(node.mark+node.text);}
 return stack[0].text;
}
export const inlineHtml=text=>render(escapeHTML(text??''),true);
export const inlinePlain=text=>render(String(text??''),false);
