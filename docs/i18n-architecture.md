# I3: Architektur und Arbeitsstand

- [x] Bestand und Datenfluss erfassen.
- [x] Zwei Ansätze vergleichen: eigener Dateileser oder Adapter um Astro-Collections.
- [x] Schnittstellen festlegen, ohne zusätzlichen Freigabeschritt.
- [x] Content-Adapter, Sprachrouten und gemeinsame UI-Texte implementieren.
- [x] Gespeicherte öffentliche und private Artefakte prüfen.

`content.ts` ist der einzige Lesezugriff auf redaktionelle Inhalte. Aufrufer verwenden `getPages(locale)`, `getPosts(locale)`, `getProjects(locale)`, `getFaq(tags, locale)`, `siteRecord(name, locale)`, `getPackages(locale)` und `getScreen(name, locale)`. Die Sprache wird ausdrücklich übergeben; es gibt keinen global veränderlichen Sprachzustand.

Der Adapter behält Astro-Validierung, Datumswerte und die deutsche Markdown-Pipeline. Ein eigener Dateileser würde YAML-, Frontmatter- und Collection-Verhalten duplizieren. Deshalb bleiben die Datenquellen hinter dem Adapter, bis ein Anfrage-Snapshot sie ersetzt. `localize.mjs` besitzt keine Datenquelle: Es klont einen Datensatz und ersetzt ausschließlich schema-abgeleitete Textpfade mit frischem Feldhash. Öffentlich ist zusätzlich `reviewed: true` erforderlich.

Alle Sprachrouten verwenden dieselben Seitenansichten und dieselben deutschen Besitzer-/Feldmarker. Browser-Skripte erhalten lokalisierte Daten aus gerenderten Attributen, keine zusätzlichen Inhaltsimporte.
