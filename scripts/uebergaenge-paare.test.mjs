// Übergangswächter (tools/himmel/uebergaenge-pruefen.mjs): welche Blöcke als Nachbarn mit Farbkante gelten. Codex-Audit
// 18.11.2026 (P2): überlappende Flächen (Preisversprechen mit negativem Rand) fielen durch, weil nur Kanten mit höchstens
// 2 px Abstand gezählt wurden. Die Browserprüfung selbst: npm run check:uebergaenge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pairBlocks, isCard } from '../tools/himmel/uebergaenge-pruefen.mjs';

test('berührende Blöcke sind ein Paar ohne Überlappung', () => {
  assert.deepEqual(pairBlocks([{ top: 0, bottom: 1593 }, { top: 1594, bottom: 2121 }]), [[0, 1, 0]]);
});

test('überlappende Fläche ist ein Paar, die Farbkante liegt an ihrer Oberkante', () => {
  // Stand b18c90c bei 1440 px: Preisversprechen beginnt 72 px vor dem Ende des Konfigurators
  assert.deepEqual(pairBlocks([{ top: 0, bottom: 1593 }, { top: 1521, bottom: 2121 }]), [[0, 1, 72]]);
});

test('Blöcke mit Lücke, Hüllen und eingeschlossene Blöcke sind kein Paar', () => {
  assert.deepEqual(pairBlocks([{ top: 0, bottom: 500 }, { top: 540, bottom: 900 }]), [], 'Lücke');
  assert.deepEqual(pairBlocks([{ top: 0, bottom: 900 }, { top: 0, bottom: 400 }]), [], 'Hülle mit gleicher Oberkante');
  assert.deepEqual(pairBlocks([{ top: 0, bottom: 900 }, { top: 300, bottom: 600 }]), [], 'liegt ganz im Vorgänger');
});

test('die Browserprüfung nutzt dieselbe Paarbildung', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../tools/himmel/uebergaenge-pruefen.mjs', import.meta.url), 'utf8');
  assert.match(src, /page\.evaluate\(`\(\$\{inspect\}\)\(\$\{pairBlocks\}, \$\{isCard\}\)`\)/);
  assert.doesNotMatch(src, /Math\.abs\(b\.r\.top - a\.r\.bottom\)/, 'alte Abstandsregel ohne Überlappung');
});

// Runde 10 (Marc, 20.11.2026): eingerückte Karten mit Rahmen (Formation der Fallstudien) sind keine Section-Fläche. Die Regel
// ist allgemein (Lage und Rahmen), keine Klassenausnahme.
test('eingerückte, gerahmte Fläche ist eine Karte, keine Section-Fläche', () => {
  const page = { left: 0, right: 1440 };
  // .c-play bei 1440 px: margin 0 var(--gutter), 1 px Rahmen, Radius 18 px
  assert.equal(isCard({ left: 48, right: 1392 }, page, { border: true, radius: 18 }), true, 'Rahmen und Radius');
  assert.equal(isCard({ left: 48, right: 1392 }, page, { border: false, radius: 18 }), true, 'nur runde Ecken');
  assert.equal(isCard({ left: 48, right: 1440 }, page, { border: true, radius: 0 }), true, 'nur einseitig eingerückt');
});

test('volle Breite oder ohne Rahmen bleibt eine Section-Fläche', () => {
  const page = { left: 0, right: 1440 };
  assert.equal(isCard({ left: 0, right: 1440 }, page, { border: true, radius: 18 }), false, 'volle Breite mit Rahmen');
  assert.equal(isCard({ left: 0.5, right: 1439.5 }, page, { border: true, radius: 0 }), false, 'Rundung unter 1 px');
  assert.equal(isCard({ left: 48, right: 1392 }, page, { border: false, radius: 0 }), false, 'eingerückt, aber ohne Rahmen: eigene Fläche');
});

test('die Browserprüfung wendet die Kartenregel auf Farbe, Linie und Abdeckung an', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../tools/himmel/uebergaenge-pruefen.mjs', import.meta.url), 'utf8');
  assert.match(src, /if \(framed\(e\)\) continue;/, 'Farbe: Fläche dahinter');
  assert.match(src, /const line = \(el, side\) => \{ if \(framed\(el\)\) return null;/, 'Rahmen ist keine Trennlinie');
  assert.match(src, /covers = !framed\(b\.el\)/, 'Karte deckt kein Band ab');
  assert.doesNotMatch(src, /c-play/, 'keine Klassenausnahme');
});
