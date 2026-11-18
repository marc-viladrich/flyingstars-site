// Übergangswächter (tools/himmel/uebergaenge-pruefen.mjs): welche Blöcke als Nachbarn mit Farbkante gelten. Codex-Audit
// 18.11.2026 (P2): überlappende Flächen (Preisversprechen mit negativem Rand) fielen durch, weil nur Kanten mit höchstens
// 2 px Abstand gezählt wurden. Die Browserprüfung selbst: npm run check:uebergaenge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pairBlocks } from '../tools/himmel/uebergaenge-pruefen.mjs';

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
  assert.match(src, /page\.evaluate\(`\(\$\{inspect\}\)\(\$\{pairBlocks\}\)`\)/);
  assert.doesNotMatch(src, /Math\.abs\(b\.r\.top - a\.r\.bottom\)/, 'alte Abstandsregel ohne Überlappung');
});
