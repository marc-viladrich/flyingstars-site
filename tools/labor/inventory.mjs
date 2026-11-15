import { chromium } from '@playwright/test';
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const path of process.argv.slice(2)) {
  await page.goto('http://localhost:4560' + path, { waitUntil: 'load' }); await page.waitForTimeout(500);
  const rows = await page.evaluate(() => {
    const seen = new Map();
    for (const el of document.querySelectorAll('main *, header *, footer *')) {
      if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el); if (!cs.fontFamily.startsWith('"Space Grotesk"')) continue;
      const sec = el.closest('section,[data-section],header,footer'); 
      const key = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}|${Math.round(parseFloat(cs.fontSize))}|${cs.fontWeight}|${cs.textTransform === 'uppercase' ? 'UC' : ''}|${parseFloat(cs.letterSpacing)||0 > 0 ? 'tr+' : ''}`;
      const e = seen.get(key) || { n: 0, t: el.textContent.trim().slice(0, 34), p: (el.parentElement?.className || '').toString().slice(0, 30), s: (sec?.id || sec?.className || '').toString().slice(0, 24) };
      e.n++; seen.set(key, e);
    }
    return [...seen].map(([k, v]) => `${k} ×${v.n}  «${v.t}»  parent:${v.p}  sec:${v.s}`);
  });
  console.log('\n== ' + path + '\n' + rows.join('\n'));
}
await browser.close();
