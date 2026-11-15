// Kommt der Schwarm rechtzeitig am Formular an? Scrollt in menschlichem Tempo von weiter oben heran und fotografiert,
// sobald das Himmelsfenster des Formulars ins Bild kommt. node tools/labor/ankunft.mjs <outDir> [px pro Sekunde=1100] [path=/]
import { chromium } from '@playwright/test';
const [out, speed = '1100', path = '/'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { try { localStorage.setItem('flyingstars:labor:bar', 'zu'); } catch {} });
await p.goto(`http://localhost:4560${path}?schrift=geist-pixel&einsatz=alles&himmel=antwortet`, { waitUntil: 'load' }); await p.waitForTimeout(900);
const top = await p.evaluate(() => document.querySelector('.hm-own-form').getBoundingClientRect().top + scrollY);
// 2,5 Bildschirme vorher beginnen, damit der Schwarm irgendwo oben steht
let y = 0; while (y < top - 3200) { y += 500; await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(70); }
await p.waitForTimeout(2500);
const step = +speed / 30; let shot = 0; const t0 = Date.now();
while (y < top - 230) {
  y += step; await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(33);
  const into = y + 900 - top; // so weit ragt das Himmelsfenster schon ins Bild
  if (into > 60 && shot === 0) { await p.screenshot({ path: `${out}/ankunft-${speed}-1-kante.png` }); shot = 1; console.log('Fenster kommt ins Bild nach', Date.now() - t0, 'ms'); }
  if (into > 400 && shot === 1) { await p.screenshot({ path: `${out}/ankunft-${speed}-2-mitte.png` }); shot = 2; console.log('Fenster 400 px im Bild nach', Date.now() - t0, 'ms'); }
}
await p.screenshot({ path: `${out}/ankunft-${speed}-3-ziel.png` }); console.log('am Ziel nach', Date.now() - t0, 'ms');
await b.close();
