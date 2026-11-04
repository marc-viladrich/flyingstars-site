import messages from '../src/i18n/ui.json' with {type:'json'};
import {marked} from 'marked';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {factText} from '../src/content/show-extras.mjs';
const root=new URL('../src/content/',import.meta.url);
test('Alle ausdrücklichen Dauer-/Angebotsreferenzen der tatsächlichen Inhaltsdateien sind auflösbar',()=>{
 for(const file of readdirSync(root,{recursive:true}).filter(file=>/\.(yaml|md|json)$/.test(file))){
  const text=readFileSync(new URL(file,root),'utf8');
  for(const locale of ['de','en','nl'])assert.doesNotMatch(factText(text,locale),/\{\{(?:duration|offer)\.[^}]+\}\}/,file);
 }
});
test('Migrierte operative Aussagen enthalten keine zweite Dauer-, Indoor- oder Filmpreisquelle',()=>{
 for(const locale of ['','en/','nl/']){
  for(const file of [`pages/${locale}index.yaml`,`pages/${locale}drohnenshow-indoor.yaml`,`faq/${locale}indoor-moeglich.md`,`faq/${locale}indoor-raum.md`,`faq/${locale}indoor-kosten.md`]){
   const text=readFileSync(new URL(file,root),'utf8').split('\n').filter(line=>!line.startsWith('#')).join('\n');
   assert.doesNotMatch(text,/20(?:–| (?:bis|to|tot) )50|5(?:–| (?:bis|to|tot) )8|15[.,]000|(?:mindestens|minimaal|at least|ab|from|vanaf) 3 [mM]/i,file);
  }
  for(const file of [`pages/${locale}drohnenshow-hochzeit.yaml`,`pages/${locale}drohnenshow-werbung.yaml`]){
   const text=readFileSync(new URL(file,root),'utf8').split('\n').filter(line=>!line.startsWith('#')).join('\n');
   assert.doesNotMatch(text,/(?<![\d.,])900 €|€\s?900(?!\d)/,file);
  }
 }
});

test('Projizierte UI-Fakten bleiben im Markdown Text und können weder HTML noch Links einschleusen',async()=>{
 const before=messages['price.fromApproxGuide'].de;
 try{
  messages['price.fromApproxGuide'].de='<img src=x onerror=alert(1)> *stark* [Link](javascript:alert(1))';
  const html=await marked.parse(factText('{{offer.indoor.priceGuide}}','de',{markdown:true}));
  assert.doesNotMatch(html,/<(?:img|a|em)\b/);
  assert.ok(html.includes('&lt;img'));
 }finally{messages['price.fromApproxGuide'].de=before;}
});
