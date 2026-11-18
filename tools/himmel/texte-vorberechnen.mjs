// Feste Worte des Himmels (Start im Formular, „EURE SHOW“) als fertige Punktlisten. Der Textplaner kostet im Browser rund
// 1,2 s Rechenzeit am Stück (Messung 17.11.2026, mobil gedrosselt); mit diesen Dateien lädt er erst, wenn jemand im Formular
// Ort oder Datum einträgt. Die Himmelszeile mit ihren Beispielworten ist seit Runde 5 (18.11.2026) entfernt. Nach Änderungen an SKY in src/scripts/himmel/schwarm.ts neu laufen lassen:
//   node tools/himmel/texte-vorberechnen.mjs
import { writeFileSync } from 'node:fs';
import { loadTextEngine, textFormation } from '../../src/scripts/text-formation.js';

// Muss zu SKY.start und zur Drohnenzahl des Starts (200) in schwarm.ts passen.
const TEXTS = { de: { start: 'EURE SHOW' }, en: { start: 'YOUR SHOW' }, nl: { start: 'JULLIE SHOW' } };
await loadTextEngine();
const r2 = (v) => Math.round(v * 100) / 100;
for (const [lang, t] of Object.entries(TEXTS)) {
  const out = {};
  const add = (text, count) => {
    const f = textFormation(text, count);
    if (!f || !f.pts.length) throw new Error(`Keine Formation: ${text} (${count})`);
    out[`t:${text}:${count}`] = f.pts.map((p) => [r2(p[0]), r2(p[1])]);
  };
  add(t.start, 200);
  const file = new URL(`../../public/media/himmel/texte-${lang}.json`, import.meta.url);
  writeFileSync(file, JSON.stringify(out));
  console.log(lang, Object.keys(out).length, 'Formationen', JSON.stringify(out).length, 'Bytes');
}
