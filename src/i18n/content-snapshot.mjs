// Die Vertragsprüfung aller Inhalte (Schema, EN/NL-Nachweise, Fakten) läuft einmal je Inhaltsstand, nicht einmal je
// Routendatei: jede Routenart hat eine eigene Datei unter src/pages/ (eigenes CSS-Bündel), alle rufen dieselbe Prüfung.
// Der Stand ist der Fingerabdruck der Dateien, die das Ergebnis bestimmen; im Dev-Server erneuert eine redaktionelle
// Änderung ihn, ohne Neustart. Eine fehlgeschlagene Prüfung gilt für jeden Aufrufer desselben Stands, der Build bricht.
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** Inhalte, Schemas und UI-Wörterbuch, relativ zur Projektwurzel. */
export const SNAPSHOT_SOURCES = ['src/content', 'src/schemas', 'src/i18n/ui.json'];

/** Pfad, Größe und Änderungszeit jeder Quelldatei. Billig (nur stat), deshalb bei jedem Aufruf neu. */
export function contentFingerprint(root, sources = SNAPSHOT_SOURCES) {
  const entries = [];
  for (const source of sources) {
    const full = path.join(root, source);
    const files = statSync(full).isDirectory() ? readdirSync(full, { recursive: true }).map((file) => path.join(full, String(file))) : [full];
    for (const file of files) {
      const stat = statSync(file);
      if (stat.isFile()) entries.push(`${path.relative(root, file)}\t${stat.size}\t${stat.mtimeMs}`);
    }
  }
  return entries.sort().join('\n');
}

/** `check` genau einmal je Fingerabdruck; gleichzeitige und spätere Aufrufer desselben Stands teilen das Ergebnis. */
export function oncePerSnapshot(check, fingerprint) {
  let key, result;
  return () => {
    const next = fingerprint();
    if (next !== key) { key = next; result = Promise.resolve().then(check); }
    return result;
  };
}
