# Editor auf dem aktuellen Dateimodell

Stand 02.11.2026, Branch `codex/afe-030`: Der Main-Stand `24675f4` und die Editor-Migration sind im Arbeitsbranch zusammengeführt. Das private Produkt ist auf Main mit Tag `v0.3.0` (`265a25d`). Der reguläre Bezug erfolgt ausschließlich als Alias `npm:@marc-viladrich/astro-frontend-editor@0.3.0`. Produktquellen, Tarballs und lokale Paketpfade gehören nicht ins öffentliche Site-Repository. Registry- und Prüfbelege stehen im [Migrationsbericht](editor-migration-2026-11.md).

Der Adapter liest vollständige DE-/EN-/NL-Dateien der vier Astro-Collections. Section-Katalog, verschachtelte Felder und Listenaktionen stammen aus den gemeinsamen Zod-Definitionen. Die Renderintegration verfolgt CollectionEntry-Eigentümer durch tatsächliche Astro-Props und Array-Indizes. Unaufgelöste Ausdrücke erhalten keine erratene Bindung. `Accent`, Markdown und Bilder deklarieren ihre Renderform direkt am Renderer.

`src/content/show-packages.json` enthält die Paketfakten und die konsolidierten 18 Leistungen mit stabilen IDs, Paketstatus, Kartenprojektionen und „Immer inklusive“. `package-details.ts` projiziert daraus unverändert die bisherigen Ansichten. Die vorhandenen Wörterbuchreferenzen behalten `src/i18n/ui.json` als Textquelle; eigene Leistungstexte können als vollständiges DE-/EN-/NL-Objekt hinterlegt werden. Die bestehenden Preisformeln bleiben in `show-packages.ts`; `null` bedeutet dort unbegrenzte Obergrenze. `src/content/navigation.json` besitzt Links und Menüstruktur. Beschriftungen verweisen auf das vorhandene Wörterbuch oder enthalten feste Namen. Beide Dateien werden beim Astro-Start durch ihre gemeinsamen Zod-Schemas validiert. Das Wörterbuch bleibt `src/i18n/ui.json`.

Eine deutsche Speicherung öffnet die gemeinsame EN-/NL-Prüfung. Verschobene Einträge behalten ihre bisherigen Übersetzungen, neue Einträge müssen geprüft werden. Erst die bestätigte Transaktion schreibt Sprachdateien, die aus den tatsächlichen deutschen Codec-Ausgabebytes berechneten Quellhashes und den Herkunftsnachweis gemeinsam in Git. Eine alleinige DE-API-Speicherung bleibt gesperrt. EN-/NL-Korrekturen allein verändern die deutschen Bytes nicht. Private ungespeicherte Vorschauen erneuern Hashes nur in ihrer Wegwerf-Arbeitskopie.

Die Mediathek leitet vorhandene Bilder aus ihren tatsächlichen Verwendungen ab. Uploads durchlaufen die bestehende Rasterbildprüfung und Metadatenbereinigung und erhalten eine Datei unter `public/assets/<sha256>.<ext>` sowie Katalogmetadaten unter `src/content/editor-media/`. Inhaltsfelder speichern weiterhin ihr eigenes Bildobjekt mit Alternativtext und bestätigten Maßen, ohne `assetId`-Cache.

Die frühere `translate-missing`-CLI schreibt keine Overlay-Dateien mehr. `--dry-run` prüft fehlende oder veraltete vollständige Sprachdateien. Die gemeinsame Sprachprüfung bietet für jedes geänderte Textfeld „Übersetzung vorschlagen“ und anschließend „Vorschlag übernehmen“. Ein Abruf ersetzt keine Eingabe und speichert nichts an der Site. Erst die menschliche Übernahme und „Geprüft speichern“ führen durch dieselbe atomare Datei-/Hash-/Provenienztransaktion. Interne `todo`-Felder, IDs und URLs werden nicht übersetzt.

Der Produktdienst verwendet die historischen Anbieter und `translation-memory.json` im ausdrücklich gewählten State-Ordner. Ohne Konfiguration bleibt er mit einer sichtbaren Erklärung deaktiviert; manuelles Prüfen funktioniert weiter. Die bisherige selbst betriebene LibreTranslate-Architektur wird über `AFE_TRANSLATION_PROVIDER=libretranslate`, `AFE_TRANSLATION_URL` und gegebenenfalls `AFE_TRANSLATION_KEY` eingerichtet. Die Instanz muss bewusst zum vereinbarten EU-Betrieb passen. Der vorhandene DeepL-Adapter benötigt `AFE_TRANSLATION_PROVIDER=deepl` und `AFE_DEEPL_API_KEY`. Keine Schlüssel wurden gelesen oder verändert. Die Browsernachweise verwenden ausschließlich `fake`; ein echter Anbieterruf wurde nicht geprüft.

## Lokaler Entwicklungsbetrieb

Nur ausdrücklich gesetzten Test-State verwenden. Mit Node 24.15 oder neuer im PATH:

```sh
npm ci
AFE_STATE_DIR=/tmp/flyingstars-editor-test AFE_GIT_REMOTE=off npm run editor
```

Konten im angegebenen Test-State über `node editor/manage-accounts.mjs --state-dir /tmp/flyingstars-editor-test ...` verwalten. `AFE_AUTH=off` ist ausschließlich für isolierte lokale Funktionsprüfungen vorgesehen. Ein Test sollte eine Wegwerf-Kopie der Site verwenden, weil Speichern echte Inhaltscommits erzeugt.

Prüfbefehl ohne Übersetzungsdienst oder private Übersetzungsspeicher:

```sh
node editor/translate-missing.mjs --locale en --dry-run --state-dir /tmp/flyingstars-i18n-audit
```

Prüfungen, Nachweise und Betriebsbefehle stehen im [Migrationsbericht](editor-migration-2026-11.md). Abschluss: 404/404 Editor-Tests, 123/123 Site-Unit-Tests, echte Klicknachweise in Chromium und WebKit. Layoutprüfung: 660 Kombinationen ohne Befund; 28 visuelle Seitenpaare entsprechen Main. Vier unveränderte Mobile-WebKit-Konfiguratorfälle scheitern auch im Main-Gegenlauf und sind im Migrationsbericht ausgewiesen.

Die Installation wird zusätzlich am tatsächlichen `node_modules/astro-frontend-editor/package.json` und an der Registry-Integrität des Lockfiles geprüft.
