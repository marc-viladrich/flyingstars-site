# I3: Öffentliche EN-/NL-Routen und Übersetzungen

Stand: 14. Oktober 2026. Implementiert auf `content/draft`, ohne Push. Die I18n-Prüfungen bestehen; die komplette Repository-Suite ist ausdrücklich **nicht grün**. Editor-Shell und Editor-Server wurden nicht geändert. Keine `.env`-Inhalte gelesen und keine Zugangsdaten ausgegeben. Nur `relaunch/source` wurde committed; Änderungen an Übersetzungswerkzeugen und neue Tests außerhalb dieses Git-Repos bleiben uncommitted.

## Ergebnis

- Deutsch bleibt ohne Präfix, Englisch liegt unter `/en/`, Niederländisch unter `/nl/`. Alle bestehenden Slugs bleiben erhalten. Alle Seitentypen werden ausdrücklich statisch erzeugt, einschließlich Blog, Projekte, Showcase-Aliasse, Preise, Konfigurator und rechtlicher Seiten.
- `src/lib/content.ts` ist die einzige redaktionelle Lesestelle. Sie kapselt Collections, JSON-Globs, Validierung, Medienauflösung, Entwurfsfilter und Übersetzungen. Seiten und Komponenten lesen keine redaktionellen Dateien direkt mehr. `editorial-records.ts` exportiert nur noch Kompatibilitätsnamen. Ein permanenter Architekturtest prüft diese Grenze.
- `localize.mjs` klont Datensätze und übernimmt ausschließlich schema-abgeleitete Textpfade. Öffentlich sind ein passender SHA-256-Feldhash und `reviewed: true` erforderlich. Privat werden zusätzlich frische ungeprüfte Werte angezeigt. Fehlende, veraltete und Legacy-Werte ohne Feldhash fallen auf Deutsch zurück. IDs, Referenzen, URLs und Struktur bleiben unverändert.
- Übersetzungen werden aus `src/content/translations/*.json` geladen. Doppelte Besitzer-/Sprachkombinationen brechen den Build ab. Das echte Source-Repo enthält weiterhin keine erzeugten Fake-Übersetzungen; sämtliche Testübersetzungen und simulierten Freigaben liegen in isolierten Git-Fixtures. Öffentliche Sprachrouten zeigen bis zur tatsächlichen menschlichen Freigabe die deutsche Fassung.
- `<html lang>`, Canonicals und alternierende Links für de/en/nl sowie x-default sind vorhanden. Header und mobiles Menü haben DE/EN/NL-Links zur entsprechenden Seite. Interne Links einschließlich Markdown und Anfrage-URLs erhalten das Präfix; Medien, Downloads, API, Editor und externe Ziele behalten ihren Pfad. Sprachlinks erhalten im Browser aktuelle Suchparameter und Fragmente.
- Showcase-Aliasse behalten ihre entsprechenden sprachabhängigen Canonicals. Die Sitemap enthält Sprachalternativen und x-default, aber keine Noindex-Seiten oder Showcase-Aliasse. Ausschlüsse werden aus den gebauten HTML-Dateien abgeleitet.
- Deutsche Markdown-Collection-Bodies behalten den Astro-Renderer. EN/NL-Bodies und TextMedia verwenden validiertes `marked`, weil der vorkompilierte Astro-Eintrag keine ersetzte Body-Zeichenfolge rendert. Rohes HTML, ausführbare Links und nicht freigegebene Markdown-Bilder werden beim Speichern von Übersetzungen und beim Rendern abgelehnt. Der Body-Hash nutzt den exakt gleichen Rohtext einschließlich abschließender Leerzeichen/Zeilenumbrüche wie NativeStore. Inline-Formate durchlaufen weiterhin `inlineHtml` auf dem lokalisierten Wert.
- `site/ui` besitzt gruppierte Oberflächentexte mit deutschen Schema-Beschreibungen. 156 verbliebene statische Fragmente des Audits wurden extrahiert; bereits in Phase I2 ausgelagerte Navigations-/Footer-Texte bleiben in `site/navigation`. Weitere Standardüberschriften, Vorlagen und Browsertexte sind ebenfalls als UI-Felder modelliert. Preis-FAQ und JSON-LD verwenden dieselben Werte. JSON-LD maskiert HTML-Begrenzer, auch bei manuell bestätigtem Text.
- Preisrechner, Konfigurator und Projektanimation lesen lokalisierte Laufzeittexte aus gerenderten Datenattributen. Paketinformationen stammen ebenfalls aus diesen Daten, nicht aus zusätzlichen Browser-Inhaltsimporten. Konfigurator-Anlässe, Motive und ihre Paketbeschreibungen gehören jetzt zu `screen/show-konfigurator`. Daten-/Zahlenformatierung verwendet de-DE, en-GB und nl-NL.
- Das Kontaktformular liest `site/inquiry`; Fehlercodes werden auf lokale Texte abgebildet. Netzwerkfehler zeigen keine beliebigen Browser-/Serverdetails. Erfolgreiche Einsendungen ohne JavaScript leiten zu `/danke/`, `/en/danke/` oder `/nl/danke/` um.
- Deutsche Section-Textfallbacks erhalten `lang="de"`; frische Vorschläge in Section-Feldern erhalten privat `data-native-machine="true"`. Alle Besitzer- und Feldmarker verweisen weiter auf deutsche Quelldatensätze. Für verknüpfte Datensätze übernimmt weiterhin der vorhandene Editor-Overlay die vollständigen Prüfindikatoren.

## Übersetzungswerkzeuge

Der Provider `fake` liefert `[EN] ` beziehungsweise `[NL] ` plus Ausgangstext, erhält geschützte Tokens und berechnet `text.length`. Er ist ausschließlich für Tests und Offline-Demos vorgesehen, nicht für echte Website-Übersetzungen. Auswahl per `EDITOR_TRANSLATION_PROVIDER=fake` oder `--provider fake`.

`translate-missing.mjs` unterstützt `--all`, `--max-chars` pro Anbieter-Batch und `--budget-chars` für den gesamten Lauf. Fertige Teilstücke werden zwischengespeichert und bei Wiederaufnahme nicht erneut bezahlt. Es werden nur vollständige, tokenintakte Werte gespeichert; beschädigte Markierungen verhindern Übernahme und bleiben erneut anfragbar. Historische nicht mehr translatierbare Pfade werden beim Zusammenführen entfernt. Speichervorgänge werden auf die NativeStore-Grenze von 50 Datensätzen aufgeteilt. `--source` und `--memory-file` erlauben vollständig isolierte Tests.

Aktuelles Inventar ohne Translation Memory: **1.053 Felder, 35.693 Zeichen, 38 Besitzer pro Sprache**. Die frühere Schätzung von etwa 25.000 Zeichen ist nach den UI- und Konfigurator-Datensätzen nicht mehr aktuell. Beispiel für einen konfigurierten echten Anbieter:

```sh
/opt/homebrew/opt/node@22/bin/node relaunch/translate-missing.mjs --locale en --all --provider deepl --max-chars 3000 --budget-chars 50000
```

Der Aufruf speichert Vorschläge als ungeprüfte Content-Commits. `--dry-run` zeigt das Inventar ohne Generierung/Speicherung. `--print` erzeugt und cached Vorschläge, speichert sie aber nicht als Content-Records. Ein unveränderter vollständiger Wiederholungslauf plant null Felder. Ein Budgetstopp wird im Ergebnis ausgewiesen; derselbe Aufruf setzt danach fort.

## Was noch Deutsch bleibt

1. Alle nicht bestätigten, fehlenden oder veralteten Übersetzungen. Das ist die vorgeschriebene öffentliche Freigaberegel, keine unbemerkte Teilübersetzung.
2. Gemeinsame Medien-Alternativtexte aus `media/*.json`. `media` gehört nach der vorgegebenen Translation-Schema-/Besitzerliste nicht zu den Übersetzungsbesitzern. Lokale `altOverride`-Felder können übersetzt werden. Eigennamen, Postaladressen, IDs, URLs und Referenzen bleiben bewusst erhalten.
3. Einzelne Aktbeschreibungen der Animation in `scripts/show-scenes.js` und `scripts/scenes/*.js`, einschließlich Zwischenbildern. Sie werden im Screenreader-Livetext der Konfigurator-Vorschau verwendet und besitzen noch keinen redaktionellen Datensatz. Anlass-, Motiv- und Paketbeschreibungen sind dagegen lokalisiert. Die Akttexte liegen außerhalb der 163 gezählten Astro-Fragmente; ihre zusätzliche Modellierung wurde hier nicht in die Animationsmodule ausgedehnt.
4. Vom Formationswerkzeug gelieferte Schriftstil-/Diagnosebezeichnungen, z. B. Einstrich/Umriss. Die umgebenden Preisrechner-Meldungen und Vorlagen sind lokalisiert. Technische Szenenkennungen bleiben unverändert.
5. Die technische `detail`-Zeichenfolge des Kontakt-API-Problems bleibt Deutsch. Das JavaScript-Frontend zeigt stattdessen lokalisierte Texte anhand von `code`; nicht erfolgreiche Einsendungen ohne JavaScript erhalten weiter die bestehende JSON-Fehlerantwort. Erfolgreiche Weiterleitungen sind lokalisiert.
6. Das ungenutzte deutsche Standard-`description`-Feld in `site.config.ts` wurde nicht in einen zweiten SEO-Datensatz übertragen. Tatsächlich gerenderte Beschreibungen kommen aus den lokalisierten Seiten, Screens oder `site/ui` für den Blog.

Von den verbliebenen statischen Astro-Fragmenten des Audits ist kein deutscher UI-Text absichtlich fest im Markup belassen. Neutraler Blog-Name, Marken-/Firmennamen und Social-Network-Namen bleiben erhalten. Inaktive DE-Anzeigen wurden durch echte Sprachlinks ersetzt.

## Exakte Editor-Übergabe

Die folgenden Punkte betreffen die unangetasteten Dateien unter `relaunch/web` und gegebenenfalls den Preview-Aufruf. Der Stand wurde am Ende erneut gelesen, weil diese Dateien parallel geändert werden.

1. `editor.js:setLocale()` setzt aktuell nur Overlay/Ansicht und ruft `rerender()`. Es muss auf `localizedHref(sourcePath(currentIframePath), locale)` vollständig navigieren. Staged Translation-Dateien müssen im Preview-Snapshot vorhanden bleiben. Vollnavigation ist für Sprache, Meta-Angaben, Canonical, Attribute und initial geladene Browserdaten erforderlich.
2. `editor.js:currentPage()`, `navigate()`, `adoptFrame()` sowie `view-state.mjs:normalizedRoute()` müssen deutsche Datensatzroute und sichtbaren Sprachpfad auseinanderhalten. Die Besitzerauflösung erfolgt nach Entfernen von `/en` oder `/nl`; `activeLocale` folgt bei Navigation den realen Sprachpfaden. Sprache darf nie Bestandteil von `page/...`, `project/...` oder Markerpfaden werden.
3. `save()` erhält vom Store die deutsche `savedRecordRoute`. Vor dem Reload muss diese mit der aktiven Sprache präfixiert werden; Suchparameter, Fragment, Seitenauswahl und Scrollposition müssen erhalten bleiben. Alle Navigationsaktionen, z. B. „Auf der Seite ansehen“, müssen dieselbe Zuordnung verwenden.
4. Der Request an `/editor/api/preview` muss die reale Sprachroute tragen. Das bestehende DOM-Patching einschließlich Header/Footer reicht nicht für `<head>` und `<html>` oder bei Initialisierung gelesene Datenattribute. Ein Sprachwechsel braucht deshalb die Vollnavigation aus Punkt 1.
5. `editor.js:valueFresh()` akzeptiert aktuell noch Legacy-Werte anhand des Record-Hashes. Diese Ausnahme entfernen. Frische bedeutet ausschließlich `value.sourceHash === sha256(currentGermanString)`; andernfalls fällt auch die private Sprachroute auf Deutsch zurück.
6. **Der Bestätigungsbutton existiert inzwischen bereits.** `frame.js:confirmButton` sendet `confirm-translation`; `editor.js` verarbeitet dies mit `writeTranslation()`, setzt `reviewed:true` und den Feldhash. Auch `confirmAllOnPage()` ist vorhanden. Keine zweite Aktion hinzufügen. Diese vorhandenen Aktionen an echte Sprachrouten und die strengere Frischeprüfung anschließen und im Browser prüfen. Der neue automatisierte Test simuliert genau das Speichern einer bestätigten `values`-Liste, ohne eine Texteingabe zu erzwingen.
7. `site/ui` und die Konfigurator-Screen-Felder sind über NativeStore-Schemas verfügbar. Statische UI-Textbesitzer besitzen nach Möglichkeit eigene Marker, Attribute und aus Vorlagen zusammengesetzte Texte sind im Datensatzpanel zu bearbeiten. Für noch nicht direkt gestempelte verknüpfte Felder bleibt das Overlay für gelbe Prüfindikatoren zuständig.
8. Der Server verwendet für „Fehlende Texte übersetzen“ weiterhin den einzelnen `execute()`-Budgetpfad. Für eine gesamte Sprache beziehungsweise Seiten mit vielen referenzierten Werten künftig `executeBatched()` mit explizitem Laufbudget verwenden. CLI und Tests verwenden diesen Pfad bereits; der Server wurde ausdrücklich nicht geändert.

## Prüfungen

- **43/43 gezielte Tests bestanden**, keine übersprungene Seite oder Assertion. Befehl: `node --test relaunch/i18n-*.test.mjs relaunch/translation-core.test.mjs relaunch/source/src/schemas/editorial-source.test.mjs relaunch/source/scripts/show-geometry.test.mjs`. Log `/tmp/i3-focused-final.log`. Enthalten sind die tatsächliche CLI, Wiederaufnahme nach Budgetende, beide Sprachrouten, Git-Save mit Review, öffentlich/private Ausgabe, veraltete Übersetzungen nach Quelltextänderung, Markdown, Canonicals/Aliasse, Sitemap, JSON-LD-Injection, Source-Marker, Preisrechner-Laufzeit mit wirklich gerendertem JSON und Kontaktformular-Skript/Weiterleitung.
- Nach einer kleinen URL-Randfallkorrektur zusätzlich **9/9 Resolver-/Policy-Tests bestanden**. Log `/tmp/i3-values-last.log`.
- `npx --no-install astro check`: **0 Fehler, 0 Warnungen, 207 Hinweise**, 142 Dateien. Log `/tmp/i3-check-last.log`.
- `FLYINGSTARS_OFFLINE_MEDIA=1 npx --no-install astro build`: **63 öffentliche HTML-Seiten**, erfolgreich. Log `/tmp/i3-offline-build-final.log`. Das Flag nutzt geprüfte Medienmaße und einen Noop-Image-Service, ohne Bildabrufe/Optimierung. Es ist keine visuelle Bildprüfung und kein Release-Artefakt. Standardbetrieb optimiert Medien unverändert.
- Reguläres `npx --no-install astro build`: **nicht erfolgreich**. Erneut fehlende Remote-Maße für das bestehende naturstrom-Logo; `FailedToFetchRemoteImageDimensions`. Log `/tmp/i3-standard-build-final.log`. Der erfolgreiche Offline-Build wird ausdrücklich nicht als erfolgreicher regulärer Build ausgegeben.
- Vollständiger angeforderter Repository-Befehl: **171/183 bestanden, 12 Fehler**. Log `/tmp/i3-full-suite-final.log`. Vier Buildtests scheitern am Aufbau; ein Server-Test scheitert mit `listen EPERM`. Die Auth-Gruppe enthält fünf fehlschlagende Untertests und deshalb auch einen fehlschlagenden Eltern-Test: vier Requests liefern 403 statt 200, die Session-Projektion enthält zusätzlich `username`. Ein Native-Operations-Test scheitert am bestehenden Vergleich eines Schemas mit seiner JSON-Serialisierung: neu vorhandene `format: undefined`-/`group: undefined`-Eigenschaften verschwinden in JSON. Diese fremden Auth-/Schema-Dateien und vorhandenen Tests wurden nicht geändert.
- `git diff --check` sauber. Kein Push, kein Deploy und keine Veröffentlichung. Fake-Daten, Translation Memory und Test-Commits liegen ausschließlich in isolierten temporären Repos. Kein aufgezeichneter Browsertest; der angeforderte automatisierte Offline-Nachweis prüft die echten Artefakte und realen UI-Funktionen, mit Canvas-/DOM-Stubs für die für Text/Links irrelevante Animation.

Die Gesamt-Suite benötigt Arbeiten außerhalb des I3-Bereichs. Für existierende NativeBuilder-Buildtests insbesondere das explizite Offline-Medienflag an den Child-Prozess weitergeben oder dieselbe isolierte Medien-Fixture verwenden; NativeBuilder filtert aktuell dieses Flag aus. Der Schema-Serializer muss optionale Metadaten ohne `undefined` serialisieren. Die Auth-Erwartungen beziehungsweise Request-Origin-/CSRF-Daten müssen mit der parallel geänderten Auth-Implementierung abgestimmt werden.

## Gemessener Build-Vergleich

Identische isolierte Offline-Fixtures, einmal ohne und einmal mit I3; deutsche Inhalte identisch. Messung unter paralleler Testlast, daher Einzelmessungen und keine belastbare Geschwindigkeitsgarantie.

| Stand | Öffentliche Seiten | Astro gemeldet | NativeBuilder-Wandzeit |
|---|---:|---:|---:|
| Vor I3, `1b5c3b3` | 21 | 6,14 s | 11,55 s |
| Nach I3 | 63 | 7,09 s | 9,85 s |

Messdaten: `/tmp/i3-build-metrics.json`, Skript `/tmp/i3-measure.mjs`. Der spätere Source-Build unter gesamter Testlast meldete 10,37 s für 63 Seiten; diese Messung ist nicht mit dem isolierten Vorher-Wert vergleichbar. Optimierte Medienproduktion wurde bei keiner Offline-Messung bewertet.

## Code-Commits

Alle auf `content/draft`, Autor `FlyingStars Editor (Codex) <hey@marcviladrich.com>`, jeweils mit `Co-Authored-By: Codex (GPT-6.1 Sol) <noreply@openai.com>`.

- `05cd736` Sprachauflösung und zentrale Inhaltszugriffe ergänzen
- `2118eba` EN- und NL-Seiten mit gemeinsamer Oberfläche ausgeben
- `5d2966e` Sprachmetadaten und Sprachwechsel im Layout integrieren
- `3ccd010` Sprachstatus und dynamische Beschriftungen konsistent halten
- `1b28a71` Geprüfte FAQ-Texte sicher in JSON-LD ausgeben

Die abschließende Dokumentation und URL-Randfallkorrektur werden gemeinsam in einem weiteren kleinen Commit gespeichert. Die vollständige Commitliste ist mit `git log 1b5c3b3..content/draft` abrufbar.

## Dateien

Source-Dateien gegenüber dem Ausgangsstand; zusätzlich dieses Dokument und `docs/i18n-architecture.md`:

- `astro.config.mjs`
- `functions/api/contact.ts`
- `scripts/show-geometry.test.mjs`
- `src/components/Logo.astro`
- `src/components/Picture.astro`
- `src/components/SectionRenderer.astro`
- `src/components/Video.astro`
- `src/components/pages/BlogIndex.astro`
- `src/components/pages/ConfiguratorPage.astro`
- `src/components/pages/ContentPage.astro`
- `src/components/pages/PostPage.astro`
- `src/components/pages/PricesPage.astro`
- `src/components/pages/ProjectPage.astro`
- `src/components/pages/ShowcasePage.astro`
- `src/components/pricing/Calculator.astro`
- `src/components/pricing/PackageDetails.astro`
- `src/components/projects/CaseStudy.astro`
- `src/components/projects/case.js`
- `src/components/sections/Comparison.astro`
- `src/components/sections/ContactForm.astro`
- `src/components/sections/Cta.astro`
- `src/components/sections/Faq.astro`
- `src/components/sections/FlightHero.astro`
- `src/components/sections/Hero.astro`
- `src/components/sections/LogoBar.astro`
- `src/components/sections/Metrics.astro`
- `src/components/sections/Occasions.astro`
- `src/components/sections/PostList.astro`
- `src/components/sections/Pricing.astro`
- `src/components/sections/ProjectGrid.astro`
- `src/components/sections/Steps.astro`
- `src/components/sections/Sustainability.astro`
- `src/components/sections/Team.astro`
- `src/components/sections/Testimonials.astro`
- `src/components/sections/TextMedia.astro`
- `src/content/screen-schema.mjs`
- `src/content/screens/show-konfigurator.json`
- `src/content/show-configurator.js`
- `src/content/show-packages.ts`
- `src/content/site/inquiry.json`
- `src/content/site/ui.json`
- `src/layouts/Base.astro`
- `src/lib/content.ts`
- `src/lib/editorial-records.ts`
- `src/lib/json-script.mjs`
- `src/lib/localize.mjs`
- `src/lib/localize.ts`
- `src/lib/localized-routes.mjs`
- `src/lib/localized-routes.ts`
- `src/lib/markdown-policy.mjs`
- `src/lib/media.ts`
- `src/lib/native-editor.ts`
- `src/lib/translatable-fields.mjs`
- `src/lib/ui-runtime.mjs`
- `src/pages/[...slug].astro`
- `src/pages/[case].astro`
- `src/pages/[locale]/[...path].astro`
- `src/pages/blog/[slug].astro`
- `src/pages/blog/index.astro`
- `src/pages/drohnenshow-preise.astro`
- `src/pages/projekte/[slug].astro`
- `src/pages/show-konfigurator.astro`
- `src/schemas/site-schema.mjs`
- `src/schemas/ui-schema.mjs`
- `src/scripts/contact.ts`
- `src/scripts/pricing.js`
- `src/scripts/show-configurator.js`
- `src/scripts/site.ts`
- `src/styles/global.css`

Außerhalb des Source-Git-Repos geändert oder neu, bewusst uncommitted:

- `relaunch/translation-core.mjs`
- `relaunch/translation-providers.mjs`
- `relaunch/translate-missing.mjs`
- `relaunch/native-store.mjs`, ausschließlich Übersetzungsvalidierung
- `relaunch/i18n-values.test.mjs`
- `relaunch/i18n-cli.test.mjs`
- `relaunch/i18n-contact.test.mjs`
- `relaunch/i18n-e2e.test.mjs`
- `relaunch/i18n-test-fixture.mjs`
- `relaunch/i18n-runtime-proof.mjs`

Astro-Routing und Sitemap-Konfiguration folgen der [offiziellen I18n-Dokumentation](https://docs.astro.build/en/guides/internationalization/) und der [Sitemap-Dokumentation](https://docs.astro.build/en/guides/integrations-guide/sitemap/).
