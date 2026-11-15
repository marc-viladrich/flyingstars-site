import { chromium, webkit } from '@playwright/test';
const out='public/fonts/labor2/pixel-zwei';
for (const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:4560/fonts/labor2/pixel-zwei/probe.html');
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`${out}/${name}-probe.png`,fullPage:true});
 for(const [label,id] of [['filled','fill-100-rond-100'],['dots','fill-0-rond-100'],['middle','fill-50-rond-100'],['step1','fill-None-rond-100']])
  await page.locator(`#${id}`).screenshot({path:`${out}/${name}-${label}.png`});
 console.log(name,await page.evaluate(()=>({fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),height:document.body.scrollHeight})),errors);
 await browser.close();
}
