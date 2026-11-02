# Komponenten-Konsolidierung

Stand: 2. November 2026. Ausgangspunkt `f6b9f26`, Analyse `bbe8153:docs/dupes-report.md`. Zielbranch auf GitHub: `codex/konsolidierung`. Kein Push auf `main`, kein Merge und kein Deployment durch diese Umsetzung. Keine `.env`-Datei wurde gelesen.

## Umsetzung

| Bereich | Vorher → nachher | Besitzer und Verbraucher |
| --- | --- | --- |
| Paketmodell | Drei handgepflegte Leistungslisten → 18 Leistungen mit stabilen IDs, Kategorie, Paketstatus und redaktionellen Kurz-/Langfassungen. Kernpunkte, Kartengruppen, „Immer inklusive“ und Matrix sind Projektionen daraus. Preise, Mengen und Farben bleiben bei ihrer bisherigen Quelle. | `src/content/package-details.ts`, `src/content/show-packages.ts` |
| Paketkarten | Zwei Äste in Packages plus eigener Pricing-Renderer → `PackageCard`, Varianten `summary` und `detailed`. Fachfremde Angebote behalten `OfferCard`. Optionale Seitentexte erscheinen nur, wenn die Seite sie liefert. | `src/components/PackageCard.astro`, `sections/Packages.astro`, `sections/Pricing.astro`, `pricing/OfferCard.astro` |
| Altbestand | `pricing/PackageDetails.astro` ohne Import oder Route → entfernt. Vorherige Suche über `src` bestätigte, dass kein Renderer oder Template die Datei einbindet. | Löschung von `src/components/pricing/PackageDetails.astro` |
| Vergleiche | Zwei Tabellen mit je eigener Handy-Ausgabe → `ComparisonMatrix` und `ComparisonCell`. Dieselben Zeilen/Zellen speisen Tabelle und MobileTabs. Die bereits vorhandene LandingSite-Tabelle übernimmt denselben Zeichenrenderer. | `src/components/ComparisonMatrix.astro`, `ComparisonCell.astro`, `src/lib/comparison.ts`; `sections/Comparison.astro`, `templates/PricingPage.astro`, `landing/LandingSite.astro` |
| Video | Drei eigene Observer-/Play-Steuerungen → eine Motion-/Sichtbarkeits-Policy und ein Controller mit `ambient`, `manual`, `hover`. Hintergrund-Tab, globale Pause, reduced motion, Save-Data, Fehler und verspätete Play-Promises werden gemeinsam behandelt. Explizites manuelles Play darf reduced motion/Save-Data überstimmen, globale Pause und Hintergrund-Tab bleiben verbindlich. | `src/scripts/motion-policy.ts`, `video-controller.ts`; `hero-reel.ts`, `landing/LandingHero.astro`, `projects/ProjectCard.astro` |
| CSS | Verstreute überstimmte Vorgaben und 62 unbenutzte Regelblöcke → ein wirksamer Besitzer je Selektor/Eigenschaft und Media-/Supports-Kontext. Alte Karten-, Inclusive-, Timeline-, FAQ-Abschluss-, Referenzfilter- und Sprachwahlreste entfallen. Die späte Rec-Basis reaktiviert bei reduced motion keine Animation mehr. Responsive Unterschiede und der vh/svh-Fallback bleiben erhalten. | `src/styles/global.css`; Fakten und Karten haben eigene Besitzer in `facts.css` und `media-card.css` |
| Auswahl/Formulare | Eigene Referenz-Pills und Textstil-Zustände → `.chips` mit Größen-/Farbvariablen. Hover verändert ausgewählte Pills nicht. Drei Select-Pfeile/Optionslisten → `.native-select`. Die alte `.field`-Inputbasis überschreibt keine aktiven Controls mehr. | `src/styles/global.css`; `sections/References.astro`, `sections/ContactForm.astro`, `configurator/ShowConfigurator.astro` |
| Fakten | Neun dt/dd-/Kennzahl-Darstellungen → `FactList` mit benannten Varianten und gemeinsamer Semantik. Werte bleiben unverändert, Count-up und Eco-Scrolly bleiben Erweiterungen. Vier Metrics-Zellen bekommen die korrekten inneren Trennlinien. | `src/components/FactList.astro`, `src/styles/facts.css`, `src/lib/lists.ts`; Metrics, Tempo, CaseStudy, LandingHero, LandingStories, LandingSpotlight, Sustainability, FlightHero |
| Prozesse | Steps, Timeline, LandingFlow und MetroLine mit eigenen Listenschleifen/Farben → `ProcessList`, gemeinsame Einträge, Nummerierung und Farbvergabe für beliebige Itemzahlen. MetroLine behält Express und seine Darstellung. Steps verwendet die Eintragszahl statt fester fünf Spalten. | `src/components/ProcessList.astro`, `src/lib/lists.ts`; `sections/Steps.astro`, `sections/Timeline.astro`, `landing/LandingFlow.astro`, `MetroLine.astro` |
| Case-Story | Globale Suche nach `[data-step]` zählte auch Punktbilder und CTA-Gesichter → `[data-story-step]` ausschließlich unter `.c-story`. Fortschritt und Szenen beziehen sich nur auf die Geschichte. | `src/components/projects/CaseStudy.astro`, `projects/case.js` |
| Köpfe | Eigene Kicker-/Heading-Renderer → SectionHead mit `default`, `embedded`, `contents`, `display`. Nutzen-Headlines und Texte bleiben erhalten. | `src/components/SectionHead.astro`; FAQ, ContactForm, TextMedia, Sustainability, LogoBar, ShowConfigurator und Case-Abschnitte zusätzlich zu bisherigen Verbrauchern |
| Icon-Inhalte | Eigene Icons/Titel/Texte in Schutzmaßnahmen, Umwelt, Qualität usw. → IconFeature, normale Icons 36 px, kompakte Belege 18 px, echte Überschriften. Logo-Freigabe bleibt bei LogoBar, Extra-Auswahl beim Extra-Adapter. | `src/components/IconFeature.astro`; LandingSite, Sustainability, LogoBar, Included, LandingBento, Extras |
| Medien | Wiederholte Kartenrahmen, Badges und Hover-Ziele → MediaCard für ProjectCard, PostCard, LandingStories, Occasions und Referenz-Platzhalter. Zwei Eckenkonstruktionen → MediaFrame mit `content`, `inset`, `none`. | `src/components/MediaCard.astro`, `MediaFrame.astro`, `src/styles/media-card.css`; FlightHero/LandingHero und genannte Kartenadapter |

`docs/DESIGN.md` dokumentiert die neuen Besitzer. CTA, MobileTabs, die Zuständigkeitstabelle, Metro-Express, optionale Kontakt-Chips und das mobile Hero-Video waren bereits vorhanden und wurden nicht erneut gebaut. Es gibt keinen neuen Section-Typ und keine neue Abhängigkeit.

Keine Änderung an deutschen, englischen oder niederländischen YAML-Dateien, am Content-Schema oder an redaktionellen Leistungszusagen. Deshalb keine Hash-/Provenienz-Aktualisierung erforderlich. Die vorhandenen IDs und Übersetzungsprüfungen bleiben gültig.

## Dauerhafte Guards

13 neue Tests, im regulären Node-Testbefehl enthalten:

- `scripts/consolidation.test.mjs`: acht Modell-/Quell-/CSS-Tests. Leistungs-IDs und alle Projektionen in DE/EN/NL, Kartenbesitzer und entfernten Altbestand, gemeinsame Desktop-/Mobil-Zellen, gemeinsame Video-Initialisierung, CSS-Eigenschaftsbesitzer einschließlich importierter Dateien, Auswahl-/Select-Basis, Fakten-/Prozessdelegation und die Kopf-/Icon-/Medienbesitzer. Optionale Paketprosa bekommt keinen stillen Fallback. Karten-Styles bleiben bei der Medienkarte; verlinkte Karten verbieten Aktionslink-Slots.
- `scripts/lists.test.mjs`: ein Test mit 1–6 Einträgen, unbekannten Werten, Nummerierung, wiederholten Jahren, Freigabe, Express ohne Standarddauer und Farb-Endpunkten. Zusätzlich schützt der Quelltest die dynamische Steps-Spaltenzahl und die abgegrenzte Story-Abfrage.
- `src/scripts/video-controller.test.mjs`: vier Tests für alle Startarten/Policies, Lazy-Loading, doppelte Play-Anfragen, verspätete Promises nach Pause/neuem Wunsch/Dispose, abgelehntes Play, Medienfehler sowie gemeinsame Listener und vollständige Abmeldung.

## Bewusste Grenzen

- Die ausführlichen Paketkarten behalten ihre bisherigen Gruppen und Texte. Ihre Kürzung wäre eine redaktionelle Änderung der sichtbaren Preisseite. Die Daten werden bereits gemeinsam abgeleitet; dafür braucht es keine zweite Liste.
- Hero-H1 und Artikelkopf bleiben Fachadapter. Split-Hero, Anlass-Hero und Case mit Breadcrumbs haben unterschiedliche Anordnung und Semantik. Eine universelle Hero-Komponente würde mehr Schalter als gemeinsame Struktur schaffen. Video, Fakten und Aufnahme-Ecken sind bereits geteilt.
- Kein zusätzlicher Universal-Grid-, Button-, Avatar-, Dialog- oder Carousel-Umbau aus den weiteren P2/P3-Vorschlägen des Berichts. Die Unterschiede betreffen hier eigenständige Aufgaben wie Dragging, Navigation oder Einwilligung. Dieser zusätzliche Umbau würde die Interaktionsfläche über die sieben beauftragten Konsolidierungen hinaus vergrößern.
- Die unbenutzten Altkomponenten `pricing/Calculator.astro`, `Video.astro` und `scripts/pricing.js` sowie explizite PoC-Demos bleiben getrennt. Sie sind keine aktiven zweiten Renderer. Ein vollständiger Archival-Purge samt ihren verbleibenden Legacy-Styles ist nicht Teil dieser Konsolidierung.
- Keine automatischen FAQ-/Blog-Umschreibungen oder neuen Standort-/Kostenversprechen. Dafür wären fachliche und redaktionelle Entscheidungen nötig.
- Keine neue Aufzeichnung und kein echter Mailversand. Gefordert waren Screenshots und Browser-Tests; die Interaktionsbelege verwenden echte Klicks/Hover/Scrollen und Zustandsprüfungen. Hintergrund-Tab und spät eintreffende Play-Promises sind deterministisch durch die Policy-/Playback-Tests abgedeckt; kein erfundener Betriebssystem-Nachweis.

## Sichtprüfung

Vorher und nachher jeweils Home, Preise, PUMA, Hochzeit und Über uns bei 1440 und 390 px, als vollständige Seite und obere Ansicht. Beide Fassungen wurden geöffnet und verglichen. Die T3-Snapshot-Funktion scheiterte wiederholt mit „Preview automation snapshot timed out after 15000ms.“; die Aufnahmen entstanden deshalb über Playwright gegen den lokalen Build. Zusätzlich geprüft: Leistungsreiter, Zuständigkeiten, Fakten, Prozess, Nachhaltigkeit sowie tatsächlich laufendes und pausiertes Hero-Video.

Beabsichtigte sichtbare Unterschiede:

1. Vergleichsstatus nutzt Lucide Check, X und CircleHelp samt Text. Nicht enthaltene Preisleistungen zeigen X statt Gedankenstrich; Zuständigkeiten behalten ✓/◐/–.
2. Normale Icon-Features haben einheitlich 36 px und echte Überschriften. Dadurch ändern sich lokal Schriftgröße, Umbruch und Abstand bei Qualität/Schutzmaßnahmen/Umweltpfeilern. Kompakte Belege bleiben 18 px.
3. Die Nachhaltigkeits-Einleitung steht unter der großen Überschrift. Das folgt der verbindlichen Regel für Section-Köpfe und verändert dort die Abschnittshöhe.
4. Metro-Stationen verteilen sich über die gemeinsame Palette bis Cyan statt nach dem dritten/fünften fest codierten Kind aufzuhören. Vier Steps nutzen vier Spalten, vier Metrics-Zellen haben drei innere Trennlinien.
5. Referenz-Pills und Textstile erben die gemeinsamen Auswahl-/Fokuszustände; Selects teilen denselben Pfeil. Gewählte Filter bleiben beim Hover lesbar.
6. PUMA-Fortschritt zählt vier Story-Stationen statt acht fachfremder `[data-step]`-Elemente. Die Bildzuordnung folgt ausschließlich den Story-Schritten. Animationen zeigen in Einzelaufnahmen unterschiedliche Zeitpunkte; das ist keine Änderung ihrer Bilddaten.

Die Sichtprüfung fand zwei unbeabsichtigte Änderungen: zusätzliche Langtexte auf kompakten Paketkarten und zusätzliche Kicker-Abstände in Case-Schritten. Beide sind behoben. Medienkarte und Platzhalter haben ihre Styles beim gemeinsamen Besitzer; so gehen Astro-Scope-Attribute nicht als unbeabsichtigte Gestaltungsabhängigkeit verloren.

### Belege

- `/tmp/fs-konsolidierung/screenshots/before/{home,pricing,case,hochzeit,about}-{1440,390}.png`: vollständige Ausgangsseiten. `-top.png`: obere Ansichten.
- `/tmp/fs-konsolidierung/screenshots/after/`: dieselben zehn Seiten-/Breitenkombinationen, obere Ansichten und Detailaufnahmen, darunter `mobile-pricing-tabs.png`, `mobile-responsibilities.png`, `hero-mobile-playing.png`, `hero-mobile-paused.png`.
- `/tmp/fs-konsolidierung/{home,pricing,case,hochzeit,about}-full-pair.png`: geöffnete Vorher-/Nachher-Seitenpaare; `before-contact.png`, `after-contact.png`: Übersicht der oberen Ansichten.
- `/tmp/fs-konsolidierung/browser-proof.json`: fünf bestandene Browser-Szenarien mit realen Videos, Play/Pause, Resize, globaler Pause, Hover, Scroll-Sichtbarkeit, Story-Fortschritt und kontrollierter Save-Data-Policy.
- `/tmp/fs-konsolidierung/{before,after}.json`, `details.json`: erfasste Seiten und Details. Statische Vergleiche verwenden reduzierte Bewegung und warten auf geladene Bilder/Teaser.

## Verifikation

Node 22.22.1. `npm ci` erfolgreich, keine Änderung an Paketdateien.

- Astro Check: **0 Fehler, 0 Warnungen**, 235 Hinweise; Build: **74 Seiten**, erfolgreich.
- Vollständige Node-Suite (`node --test --test-concurrency=2 'scripts/*.test.mjs' 'src/scripts/effects/*.test.mjs' 'src/scripts/*.test.mjs'`): **121/121 bestanden**, 0 Skips, 0 Fehler; ca. 164 Sekunden. Die begrenzte Parallelität schont die gemeinsam genutzte Maschine. Zwei Zwischenläufe mit Standardparallelität trafen das bestehende Zeitlimit der unveränderten Drohnen-Zuordnung: 264 bzw. 287 ms. Im finalen Lauf bestand sie in ca. 22 ms. Kein Limit wurde gelockert. Die 13 Konsolidierungs-Guards wurden auf dem finalen Quellstand erneut geprüft und bestehen.
- i18n-Buildcheck: **32 deutsche Routen**, **48 lokalisierte Inhaltsrouten**, **16 lokalisierte Weiterleitungen**, zwei explizit ausgenommene PoCs bestätigt.
- Die neun angeforderten Playwright-Dateien gegen Astro Preview auf **4399**, ausschließlich `--workers=2`: **1.057 bestanden, 0 fehlgeschlagen, 51 planmäßige Skips**. Davon 44 Consent-Dummy-Fälle im normalen OFF-Build sowie sieben Browser-/Viewport-Ausnahmen. Die Show-Physics-Spec wurde nie gestartet.
- Zusätzlich dokumentierter Consent-Dummy-Build: **44 bestanden, 0 fehlgeschlagen**, vier OFF-Build-Tests planmäßig übersprungen. Alle Fremdanfragen werden durch den vorhandenen Test abgefangen. Danach wieder normaler Build ohne Dummy-IDs.
- Layout-Audit DE und EN in Chromium bei **390/940/1440/1920**, WebKit bei **390/1440**: pro Lauf **22 Seiten, 0 Befunde**, insgesamt **264 Seiten-/Breiten-/Browserkombinationen**. Keine Kriterien oder Ausnahmen verändert.
- Fünf zusätzliche Browser-Szenarien bestanden. Sichtprüfung der genannten Screenshots abgeschlossen.

Logs liegen unter `/tmp/fs-konsolidierung-*.log`, insbesondere `final-check`, `final-build`, `final-unit`, `final-guards`, `playwright-final`, `consent-playwright`, `layout-{de,en}-{chromium,webkit}` und `i18n-build`.

## Arbeitskopie und Übergabe

Im anfänglich gemeinsam genutzten Checkout wurde während der Umsetzung ein fremder Consent-Merge begonnen. Die eigenen uncommitteten Änderungen wurden separat gesichert, in `/tmp/fs-konsolidierung/worktree` auf dem eigenen letzten Commit wiederhergestellt und aus dem fremden Checkout entfernt. Der fremde Merge wurde weder aufgelöst noch zurückgesetzt. Dieser Arbeitsstand basiert weiter auf dem beauftragten `f6b9f26`; inzwischen gelandete fremde Main-Änderungen wurden nicht stillschweigend integriert.

Die sieben priorisierten Schritte sind eigene deutsche Commits; ein weiterer Commit hält die Korrekturen aus der Sichtprüfung fest. Der Bericht ist separat dokumentiert. Das isolierte Worktree-HEAD wird ausschließlich nach `refs/heads/codex/konsolidierung` gepusht. Der lokale gleichnamige Branch im fremd benutzten Checkout wird nicht zurückgesetzt.
