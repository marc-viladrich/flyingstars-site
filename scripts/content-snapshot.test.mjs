// Inhaltsprüfung einmal je Inhaltsstand (src/i18n/content-snapshot.mjs, Audit 2 N8): einmal je Build für alle
// Routendateien, neu nach einer Änderung (Dev-Server), und ein Fehler stoppt jeden Aufrufer desselben Stands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contentFingerprint, oncePerSnapshot } from '../src/i18n/content-snapshot.mjs';

test('eine Prüfung je Stand, auch bei gleichzeitigen Aufrufern', async () => {
  let runs = 0, state = 'a';
  const check = oncePerSnapshot(async () => { runs++; await new Promise((resolve) => setTimeout(resolve, 5)); }, () => state);
  await Promise.all(Array.from({ length: 6 }, check)); // sechs Routendateien
  await check();
  assert.equal(runs, 1);
  state = 'b';
  await Promise.all([check(), check()]);
  assert.equal(runs, 2, 'ein geänderter Stand wird neu geprüft');
});

test('ein ungültiger Stand stoppt jeden Aufrufer, ein korrigierter wird wieder geprüft', async () => {
  let runs = 0, state = 'kaputt';
  const check = oncePerSnapshot(async () => { runs++; if (state === 'kaputt') throw new Error('Missing translation: pages/en/danke'); }, () => state);
  const results = await Promise.allSettled(Array.from({ length: 6 }, check));
  assert.deepEqual(results.map((r) => r.status), Array(6).fill('rejected'));
  await assert.rejects(check(), /Missing translation/);
  assert.equal(runs, 1);
  state = 'repariert';
  await check();
  assert.equal(runs, 2);
});

test('der Fingerabdruck folgt Inhalt, neuen Dateien und dem UI-Wörterbuch', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-snapshot-'));
  try {
    const file = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
    file('src/content/pages/danke.yaml', 'title: Danke\n');
    file('src/content/pages/en/danke.yaml', 'title: Thanks\n');
    file('src/schemas/content-schema.mjs', 'export {}\n');
    file('src/i18n/ui.json', '{}\n');
    const first = contentFingerprint(root);
    assert.equal(contentFingerprint(root), first, 'unverändert');
    assert.match(first, /src\/content\/pages\/en\/danke\.yaml/);
    file('src/content/pages/en/danke.yaml', 'title: Thank you\n');
    const edited = contentFingerprint(root);
    assert.notEqual(edited, first, 'Inhalt geändert');
    file('src/content/pages/nl/danke.yaml', 'title: Bedankt\n');
    assert.notEqual(contentFingerprint(root), edited, 'neue Datei');
    const before = contentFingerprint(root);
    file('src/i18n/ui.json', '{"a":1}\n');
    assert.notEqual(contentFingerprint(root), before, 'UI-Wörterbuch');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
