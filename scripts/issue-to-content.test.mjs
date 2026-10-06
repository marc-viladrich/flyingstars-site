import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./issue-to-content.mjs', import.meta.url));
const body = `### Titel

Testflug: Wie eine Drohnenshow entsteht

### Beschreibung

Ein Blick hinter die Kulissen: von der ersten Skizze über die Genehmigung bis zur Landung. Testbeitrag für den Intake-Flow.

### Datum

2026-10-06

### Kurzbeschreibung

Eine Drohnenshow entsteht aus Planung, Genehmigung und einem gemeinsamen Testflug.

### Frage

Wie entsteht eine Drohnenshow?

### Antwort

Durch Planung, Genehmigung und Testflug.

### Text

Dies ist ein **Testbeitrag**, der den deterministischen Intake prüft.
`;

for (const type of ['blogpost', 'projekt', 'faq']) {
  test(`${type}: PR-Inhalt ist ohne zweiten Freigabeschritt veröffentlichbar`, () => {
    const cwd = mkdtempSync(join(tmpdir(), 'intake-publication-'));
    try {
      const result = spawnSync(process.execPath, [script, type, '1'], { cwd, input: body, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const content = readFileSync(join(cwd, result.stdout.trim()), 'utf8');
      assert.match(content, /^draft: false$/m);
      assert.match(content, /^sourceIssue: 1$/m);
      assert.match(content, /Testflug/i);
      const again = spawnSync(process.execPath, [script, type, '1'], { cwd, input: body, encoding: 'utf8' });
      assert.equal(again.status, 1);
      assert.match(again.stderr, /Datei existiert bereits/);
      assert.equal(readFileSync(join(cwd, result.stdout.trim()), 'utf8'), content);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
}
