// Runde 8 (Marc: „die Drohnen … bleiben dann irgendwie hängen“, „Framerate-Drop bei der Transition“). Ursache: frame() plante
// keinen Frame mehr, sobald die Zielbühne außer Sicht lag, auch mitten im Flug; das Formular wird gut eine Bildschirmhöhe
// vorher angesteuert. Der Flug lief nur bei Scroll-Ereignissen weiter und sprang dann. Die Browser-Probe dazu ist
// tools/himmel/flug-probe.mjs (gegen einen Build); hier wacht ein Quelltext-Test über die Bedingung, weil die Klasse Himmel
// an DOM, Canvas und Scrollen hängt und keinen Unit-Zugang hat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/scripts/himmel/schwarm.ts', import.meta.url), 'utf8');
const frame = src.slice(src.indexOf('  frame(now: number) {'), src.indexOf('  /** Die Show-Folge gibt ihre Drohnen zurück'));

test('Außer Sicht ruht der Schwarm nur, wenn er nicht fliegt', () => {
  assert.ok(frame.length > 500, 'frame() nicht gefunden');
  assert.doesNotMatch(frame, /if \(!seen\) return;/, 'Rückkehr ohne kick() mitten im Flug');
  assert.match(frame, /if \(!seen && !flying\) return;/);
});
