# Editor auf dem aktuellen Dateimodell

Arbeitsstand auf `codex/editor-migration`. Die Integration benötigt die noch unveröffentlichte Produkt-Erweiterung auf `codex/design-file-editor` im privaten AFE-Repo. Für eine veröffentlichte Installation ist ein AFE-Release 0.3.0 vorgesehen. Die Site bindet weiterhin 0.2.4; weder ein `file:`-Verweis noch Produktquellen oder ein Tarball gehören in diesen öffentlichen Branch.

Der Adapter liest vollständige DE-/EN-/NL-Dateien der vier Astro-Collections. Section-Katalog, verschachtelte Felder und Listenaktionen stammen aus den gemeinsamen Zod-Definitionen. Die Renderintegration verfolgt CollectionEntry-Eigentümer durch tatsächliche Astro-Props und Array-Indizes. Unaufgelöste Ausdrücke erhalten keine erratene Bindung. `Accent`, Markdown und Bilder deklarieren ihre Renderform direkt am Renderer.

`src/content/show-packages.json` enthält die bisherigen Paketfakten. Die bestehenden Preisformeln bleiben in `show-packages.ts`; `null` bedeutet dort unbegrenzte Obergrenze. `src/content/navigation.json` besitzt Links und Menüstruktur. Beschriftungen verweisen auf das vorhandene Wörterbuch oder enthalten feste Namen. Beide Dateien werden beim Astro-Start durch ihre gemeinsamen Zod-Schemas validiert. Das Wörterbuch bleibt `src/i18n/ui.json`.

Eine deutsche Speicherung öffnet die gemeinsame EN-/NL-Prüfung. Verschobene Einträge behalten ihre bisherigen Übersetzungen, neue Einträge müssen geprüft werden. Erst die bestätigte Transaktion schreibt Sprachdateien, die aus den tatsächlichen deutschen Codec-Ausgabebytes berechneten Quellhashes und den Herkunftsnachweis gemeinsam in Git. Eine alleinige DE-API-Speicherung bleibt gesperrt. EN-/NL-Korrekturen allein verändern die deutschen Bytes nicht. Private ungespeicherte Vorschauen erneuern Hashes nur in ihrer Wegwerf-Arbeitskopie.

Die Mediathek leitet vorhandene Bilder aus ihren tatsächlichen Verwendungen ab. Uploads durchlaufen die bestehende Rasterbildprüfung und Metadatenbereinigung und erhalten eine Datei unter `public/assets/<sha256>.<ext>` sowie Katalogmetadaten unter `src/content/editor-media/`. Inhaltsfelder speichern weiterhin ihr eigenes Bildobjekt mit Alternativtext und bestätigten Maßen, ohne `assetId`-Cache.

Die frühere `translate-missing`-CLI schreibt keine Overlay-Dateien mehr. `--dry-run` prüft fehlende oder veraltete vollständige Sprachdateien. Automatische Übersetzungsvorschläge aus dem alten Overlay-Workflow sind kein bestätigter Funktionsumfang dieses Migrationsstands.

## Lokaler Entwicklungsbetrieb

Nur ausdrücklich gesetzten Test-State verwenden. Mit Node 24.15 oder neuer im PATH:

```sh
# Im privaten Produkt-Worktree
npm link
# Im Site-Worktree, Manifest und Lockfile bleiben unverändert
npm link astro-frontend-editor --no-save --package-lock=false
AFE_STATE_DIR=/tmp/flyingstars-editor-test AFE_GIT_REMOTE=off npm run editor
```

Konten im angegebenen Test-State über `node editor/manage-accounts.mjs --state-dir /tmp/flyingstars-editor-test ...` verwalten. `AFE_AUTH=off` ist ausschließlich für isolierte lokale Funktionsprüfungen vorgesehen. Ein Test sollte eine Wegwerf-Kopie der Site verwenden, weil Speichern echte Inhaltscommits erzeugt.

Prüfbefehl ohne Übersetzungsdienst oder private Übersetzungsspeicher:

```sh
node editor/translate-missing.mjs --locale en --dry-run --state-dir /tmp/flyingstars-i18n-audit
```

Prüfungen, Nachweise und Betriebsbefehle stehen im [Migrationsbericht](editor-migration-2026-11.md). Für die reguläre Paketinstallation stehen das private Produktrelease 0.3.0 und die Site-Versionsanhebung aus.
