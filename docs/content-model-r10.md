# Inhaltsmodell R10

Die Oberflächentexte folgen Seite → sichtbarer Abschnitt → Textrolle. Feldlabels benennen die Rolle und bleiben bei redaktionellen Änderungen stabil. Gleichartige Leistungen und Preisfragen sind Listen mit sprechenden Eintragslabels. `src/schemas/ui-schema.mjs` ist die Quelle für Gruppen und Rollen. Vorhandene, bereits unbenutzte Fragmente tragen dort einen `unused`-Grund, erscheinen nur in der erweiterten Bearbeitung mit einem entsprechenden Hinweis und behalten ihre Übersetzungen.

```text
site/ui
├── base
│   ├── navigation
│   └── footer
├── prices
│   ├── included → label, headline, intro, items[{label,title,text}]
│   ├── extras → label, headline, intro
│   ├── promise → label, headline, text, buttonText
│   ├── faq → label, headline, intro, buttonText, items[{question,answer}]
│   ├── cta → headline, text, buttonText
│   └── packages → label, headline, intro, price
├── configurator
│   ├── preview
│   ├── steps
│   ├── ownText
│   ├── result
│   ├── textStyles
│   ├── summary
│   └── fallback
├── blog → index
├── calculator
│   ├── hero
│   ├── controls
│   ├── ownText
│   ├── result
│   ├── readout
│   ├── selection
│   ├── notes
│   ├── ownTextStatus
│   └── motifs
├── caseStudy
│   ├── labels
│   ├── formation
│   ├── gallery
│   ├── setlist
│   ├── media
│   └── next
└── components
    ├── flightHero
    ├── logoBar
    ├── projectGrid
    ├── team
    ├── logo
    ├── video
    ├── faq
    ├── postList
    └── comparison
```

## Paket-Upgrades

`extras` enthält sechs stabile IDs: `express`, `film`, `behoerden`, `sondergenehmigung`, `indoor`, `schweiz`. Jedes Upgrade hat `name`, `title`, `text`, `priceNote` und `order`. Die vier Texte sind übersetzbar. Zwei Registrierungszeilen in der vorhandenen Editor-Typtabelle und Navigator-Reihenfolge benennen die neue Collection als „Paket-Upgrades“. Die Preisseite fragt die Collection ab und sortiert nach `order`, bei Gleichstand nach ID. Jede Ausgabe markiert den eigenen Upgrade-Datensatz für den Editor.

Die bisherige Paketleistungsgruppe „Service & Extras“ bleibt bestehen. Ein optionales `extraId` verknüpft eine entsprechende Leistung mit einem Upgrade; der paketbezogene Leistungstext bleibt erhalten, weil sein Wortlaut vom Überschrift-/Beschreibungstext des Upgrades abweicht.

| Paketleistung | Bezug zum Upgrade | Modellentscheidung |
| --- | --- | --- |
| ODYSSEY: Professionelle Videodokumentation (Rohmaterial) | `film`: Rohaufnahmen für Aftermovie und Social Media; laut Preisnotiz bei ODYSSEY inklusive | `extraId: film`. Identischer Gegenstand, paketbezogener Wortlaut bleibt erhalten. |
| HORIZON: Komplexere Genehmigungen, z. B. in Flughafennähe | `sondergenehmigung`: Kontrollzonen und Flughafennähe | Inhaltliche Überschneidung. Keine eindeutige Aussage, ob genau dasselbe zusätzliche Verfahren enthalten ist. Keine Referenz ohne diese Klärung. |
| SPARK: Standard-Genehmigungsverfahren | `behoerden` und `sondergenehmigung` | Standardverfahren ist weder komplette Behördenkommunikation noch Sondergenehmigung. Getrennt. |
| SPARK: Freigabe, Team, Sicherheitskonzept/Haftpflicht | Abschnitt „Immer inklusive“ | Gemeinsame Basisleistung, kein zusätzlich buchbares Upgrade. |
| HORIZON: Kreativ-Workshop, Video-Vorschau/Feedback, Eigentümerzustimmung | Kein entsprechendes Upgrade | Getrennt. |
| ODYSSEY: Feedbackschleifen, Projektmanager, Vor-Ort-Termin | Kein entsprechendes Upgrade | Getrennt. |

## Beziehungen und gespeicherte Schreibweise

Native Editor-Dateien speichern Referenzen als IDs mit `x-afe.reference.encoding: id`. `astroReferences()` leitet aus derselben Annotation an der Astro-Collection-Grenze echte `reference()`-Schemas ab und erhält bestehende Validierungen. Astro liefert `{collection,id}`; Editor-Dateien bleiben ID-basiert. Die bestehende Medienauflösung behält ihr eigenes Präfix-ID-Format.

- `project.client`: optional, `clients`. NFL → `nfl`, Puma → `puma`, Ford → `ford`.
- Bokkenrijders und Beispielprojekt haben keinen Kunden-Datensatz. Die Beziehung bleibt leer. Keine Kundendaten wurden ergänzt.
- `project.package`: optional, `packages`, nur erweiterte interne Bearbeitung. Alle Werte bleiben mangels Zuordnungsdaten leer; keine öffentliche Ausgabe.
- `project.showcase.nextProject`: `projects`. Ersetzt `nextRoute`. Die vier bisherigen Nachfolger bleiben identisch.
- Paketleistung `extraId`: optional, `extras`. Bisher nur ODYSSEYs Rohmaterial-Dokumentation → `film`.

Alle acht deutschen Hero-Titelzeilen speichern `{c}…{/c}`. Bestehende Konturmarken bleiben darin verschachtelt. Die CSS-Großschreibung am umgebenden `.c-name` entfällt; Laufweite und übrige Geometrie bleiben unverändert. Renderer und Editor-Serializer unterstützen Caps/Kontur in beiden Verschachtelungsrichtungen.

## Übersetzungen und Prüfungen

212 EN- und 181 NL-UI-Übersetzungen wurden auf die neuen Pfade bzw. Upgrade-Datensätze verteilt. Der bisher gemeinsam benutzte Preishinweis wurde pro Sprache in beide Upgrade-Datensätze kopiert; dadurch entstehen 213 bzw. 182 Zielwerte. Text, `reviewed` und Feldhash bleiben identisch. Die 16 übersetzten Titelzeilen enthalten dieselben Caps-Marken wie die Quelle; ihre Quellhashes werden mit der bestehenden UTF-8-SHA256-Funktion neu berechnet. Alle Review-Flags bleiben erhalten.

Permanente Guards in `src/schemas/editorial-source.test.mjs` prüfen Rollenlabels, maximal zehn direkte Felder je Objektgruppe, Verbrauch oder explizite Unbenutzt-Begründung, Beziehungen und Runtime-Textpfade. Weitere Guards prüfen die Übersetzungspfade und Feldhashes sowie Caps in allen deutschen und übersetzten Titelzeilen. Ein weiterer Test prüft die Astro-Referenzumwandlung einschließlich der weiterhin wirksamen Paketvalidierung. Die Serializer-Matrix in `editor/inline-format.test.mjs` prüft beide Verschachtelungsrichtungen.

Der einmalige HTML-Vergleich liegt mit ausführbarem Prüfskript unter `/tmp/cx14/a/`: `parity.py`, `html-parity.json`, `audit-translations.mjs`, `translation-audit.json` und beide Build-Ausgaben. Er vergleicht alle 52 HTML-Dateien mit dem Ausgangs-Commit `0a91b9d`. Erlaubte Normalisierungen sind Asset-Dateihashes, reine Leerraumknoten aus Listenschleifen, die verschobenen Runtime-Pfade, das neue Paketleistungs-Referenzfeld in Runtime-Daten und die beabsichtigten Caps-Spans. Sonstige Attribute, Links, Markup und Textknoten werden verglichen.

Die visuelle Prüfung bei 1440/390 und das Computer-Use-Video sind offen: Der Sandbox-Prozess darf Chromium nicht starten (`MachPortRendezvousServer: Permission denied`); Computer Use meldet keinen verfügbaren Browser. HTML-/CSS- und Serializer-Prüfungen ersetzen diesen visuellen Nachweis nicht.

Offene redaktionelle Frage: Deckt die HORIZON-Leistung in Flughafennähe exakt das Upgrade „Kontrollzonen & Flughafennähe“ ab, oder gelten dafür zusätzliche Bedingungen?
