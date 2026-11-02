# I2: Content-Modell für den Inline-Editor

Stand: 14. Oktober 2026. Branch `content/draft`. Alle Implementierungscommits verwenden den angeforderten Autor und den Co-Author-Trailer. Es wurde nichts gepusht. Änderungen außerhalb von `relaunch/source` wurden nicht angewendet. Keine `.env`-Dateien gelesen.

## A. Navigation und Footer

Commit `8719450`.

`site/navigation` besitzt Header, Footer-Seiten, soziale Netzwerke, rechtliche Links und Footer-Überschriften. Die bestehenden Werte und Reihenfolgen sind unverändert übernommen. Header und Footer haben eigene Arrays. Der Anfrage-Button und die drei zusätzlichen mobilen Links liegen ebenfalls im Datensatz. Alle Listen haben direkte DOM-Geschwister und echte JSON-Eintragspfade. `site.config.ts` enthält keine Navigationswerte mehr.

Keine Store-Registrierung nötig: `NativeStore.init()` lädt `siteSchemas` dynamisch; `siteRecord()` lädt alle Site-JSON-Dateien per Glob.

Geänderte Dateien:

- `src/content/site/navigation.json`
- `src/layouts/Base.astro`
- `src/schemas/editorial-source.test.mjs`
- `src/schemas/site-schema.mjs`
- `src/site.config.ts`

## B. Paketleistungen und Auswahl

Commit `c67a0dc`.

Alle 22 Leistungen der drei Pakete sind nun Objekte mit `id` und `text`. Die IDs wurden einmalig aus dem Text erzeugt: Kleinbuchstaben, ASCII, Bindestriche, höchstens 40 Zeichen, eindeutig im Paket. Eine Schema-Prüfung verhindert doppelte IDs. Weitere Textänderungen erzeugen keine neuen IDs.

Alle sechs Preiskarten in `index.yaml` und `leistungen.yaml` verwenden `packageId` (`spark`, `horizon`, `odyssey`) und eine geordnete `featureIds`-Auswahl. Die bisherigen Auswahlen waren leer und bleiben leer. `name`, `price`, `unit`, `orb`, `features`, `badge`, `description` und `highlight` sind aus den Tier-Daten und dem Tier-Schema entfernt. Die bestehenden Darstellungssteuerungen `showOrb` und `cta` bleiben erhalten.

Die Karten lesen Name, Preis, Einheit, Formation, Badge, Beschreibung und Hervorhebung aus dem Paket. Deshalb erscheinen auf Startseite und Leistungsseite jetzt auch die bestehenden Paketbeschreibungen sowie die SPARK-/ODYSSEY-Badges. Das ist die sichtbare Folge der angeforderten Eigentümerschaft.

Verworfene abweichende Werte: **keine**. Die tatsächlich vorhandenen `badge`-/`highlight`-Werte stimmen mit dem Paket überein; Tier-Beschreibungen waren nicht gepflegt. Fehlende optionale Tier-Werte wurden nicht als abweichende Texte interpretiert. Die entfernten Preis-/Einheit-/Orb-Kopien entsprachen den Paketwerten.

`PackageDetails` liest `items[].text`; die Paketverwaltung validiert Objekte statt Strings. `show-packages.ts` reicht weiterhin die vollständigen validierten Paketdaten durch. Die Konfigurator-Daten verwenden keine `featureGroups[].items`-Strings und benötigen dafür keine zusätzliche Projektion.

`selectedPackageFeatures()` liefert Text und kanonischen Textpfad zusammen. Unbekannte IDs brechen den Build mit Paketname und ID ab. Der Listenmarker verweist auf die Seiten-Auswahl, der Textmarker auf `package/<id>` und `featureGroups.i.items.j.text`.

Geänderte Dateien:

- `src/components/pricing/PackageDetails.astro`
- `src/components/sections/Pricing.astro`
- `src/content/package-features.mjs`
- `src/content/package-ownership.mjs`
- `src/content/package-schema.mjs`
- `src/content/packages/horizon.json`
- `src/content/packages/odyssey.json`
- `src/content/packages/spark.json`
- `src/content/pages/index.yaml`
- `src/content/pages/leistungen.yaml`
- `src/schemas/editorial-source.test.mjs`
- `src/schemas/page-schema.mjs`

## C. Globale FAQ-Reihenfolge

Commit `e3eb620`.

`nativeOrder('order')` setzt im Editor-Build `data-native-order-field="order"` am FAQ-Container. Dessen direkte Kinder sind weiterhin die FAQ-`details` mit ihrem jeweiligen `data-native-record`. Filter, globaler relativer Sortierschlüssel, Limit und Ausgabe bleiben erhalten.

Alle neun bestehenden FAQ-Dateien besaßen bereits die numerischen Werte 1 bis 9. Daher war keine Inhaltsmigration nötig.

Geänderte Dateien:

- `src/components/sections/Faq.astro`
- `src/lib/native-editor.ts`
- `src/schemas/collection-schema.mjs`
- `src/schemas/editorial-source.test.mjs`

## D. Nachhaltigkeitskennzahlen

Commit `8a01c84`.

Die gemeinsame `show()`-Funktion synchronisiert `fact.inert` mit `on` und `past`, auch bei der initialen Scroll-Auswertung. Unsichtbare Fakten können keine Klicks abfangen. Ohne JavaScript, bei reduzierter Bewegung und ohne IntersectionObserver wird der animierte Modus nicht aktiviert; dann wird kein Fakt inert.

`tone` heißt im Schema nun „Darstellung der Kennzahl“. Die technischen Werte `o` und `g` bleiben erhalten.

Geänderte Dateien:

- `src/schemas/editorial-source.test.mjs`
- `src/schemas/page-schema.mjs`
- `src/scripts/site.ts`

## E. Leichte Inline-Formatierung

Commit `e1fc344`.

`inlineHtml()` maskiert HTML vor der Konvertierung. Unterstützt werden ausschließlich `**fett**`, `*kursiv*`, `~~gestrichen~~`, `{o}Kontur{/o}` und `{c}Großbuchstaben{/c}`, einschließlich Verschachtelung. Unvollständige Marker bleiben als Text erhalten. `inlinePlain()` verwendet dieselbe Syntax und entfernt erkannte Formatierungen. Großbuchstaben sind eine CSS-Darstellung; `inlinePlain()` verändert die Buchstaben nicht.

`InlineText.astro` rendert ohne zusätzliches Wrapper-Element. Der vorhandene Besitzer des Feldmarkers bekommt `data-native-inline="true"`, ausschließlich in Editor-Builds. Die Outline verwendet `var(--stroke, var(--text))`, damit transparente Textfarbe den Strich nicht unsichtbar macht. Der Strich ist 0,03 em breit. Outline- und Großbuchstabenregeln verändern unmarkierte Texte nicht. Bestehende Selektoren für einzelne Hero-Zeilen gelten jetzt ausdrücklich nur für direkte Kinder, damit verschachtelte Inline-Spans nicht versehentlich zu eigenen Zeilen werden.

Opt-in-Felder: alle Section-Headlines, Hero-Wörter, Nachhaltigkeits-Überschriftszeilen und Faktenwert/-label, Anlass-Kartentitel, Schritttitel, Paket-Anzeigenamen als Titel der Preiskarten, Projekt-Kartentitel, Projekt-Hero-Titelzeilen und die beiden Systemseiten-Headlines. Es gibt im aktuellen Schema keinen eigenständigen Section-Typ `features`; es wurde keiner hinzugefügt. Meta-Titel, Beschreibungen, Slugs, Alt-Texte und Buttonlabels bleiben ohne Format-Opt-in.

ARIA-Beschriftungen, Rotations-Reintextdaten, Paketoptionen, Rechner-Readouts und Anfragetexte verwenden `inlinePlain()`, wenn sie ein formatiertes Feld wiedergeben. Die restlichen Meta-/OG-/Sitemap-/JSON-LD-Ausgaben verwenden keine der freigeschalteten Felder. Die Wortrotation verwendet vorgerenderte sichere Templates und aktualisiert den Wortindex im Feldmarker. Formatierte animierte Faktenwerte behalten ihre Darstellung und werden nicht durch den numerischen Zähler überschrieben.

Zod-Version lokal: 4.6.5. `.meta({format:'inline'})` funktioniert und bleibt nach `.min()`/`.max()` sowie im inneren Schema nach `.optional()` erhalten. Der optionale Wrapper selbst liefert keine Metadaten; der Editor muss wie bisher zum inneren Schema entpacken.

Bestehende Inhalte erhielten keine Formatmarkierungen. Alle neuen Tests liegen in der bereits vom Repository-Befehl erfassten `src/schemas/editorial-source.test.mjs`.

Geänderte Dateien:

- `src/components/InlineText.astro`
- `src/components/pricing/Calculator.astro`
- `src/components/pricing/PackageDetails.astro`
- `src/components/projects/CaseStudy.astro`
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
- `src/content/package-features.mjs`
- `src/content/package-schema.mjs`
- `src/content/screen-schema.mjs`
- `src/lib/inline-text.mjs`
- `src/lib/inline-text.ts`
- `src/lib/native-editor.ts`
- `src/pages/show-konfigurator.astro`
- `src/schemas/editorial-source.test.mjs`
- `src/schemas/inline-text.mjs`
- `src/schemas/page-schema.mjs`
- `src/schemas/project-showcase.mjs`
- `src/scripts/pricing.js`
- `src/scripts/show-configurator.js`
- `src/scripts/site.ts`
- `src/styles/global.css`

## C. Prüfkorrektur für neue FAQs

Commit `d215d3b`.

Bei der Gesamtprüfung wurde der bisherige numerische Standard `order: 100` für neue FAQs wiederhergestellt. Der Store persistiert bei einer Neuanlage bereits das geparste Objekt inklusive Standard. Damit bleiben bestehende Erstellungsaufrufe kompatibel, während alle gespeicherten FAQ-Daten weiterhin numerisch sortierbar sind.

Geänderte Dateien:

- `src/schemas/collection-schema.mjs`
- `src/schemas/editorial-source.test.mjs`

## Prüfungen

- Source-Tests: **15/15 bestanden**. Enthalten sind Schema-/Referenzprüfungen, eindeutige Feature-IDs, globale FAQ-Werte, Markerbesitz, tatsächliche Laufzeit-Ausführung des Scroll-Skripts inklusive Reduced-Motion-Fallback, Parser-/HTML-Sicherheit, Verschachtelung aller Formate, Metadaten und Wortrotation.
- `npx --no-install astro check`, Node 22: **0 Fehler, 0 Warnungen, 207 Hinweise**, 125 Dateien. Log: `/tmp/i2-check-final.log`.
- Reguläres `npx --no-install astro build`: **fehlgeschlagen** beim bestehenden Remote-Bild `https://flyingstars.art/wp-content/uploads/2024/10/NATURSTROM-Logo_weiss.png`. Die Sandbox kann dessen Bildmaße nicht abrufen. Log: `/tmp/i2-build.log`. Es wurde keine Netzwerkausnahme angefordert und kein Produktionscode für diesen Umgebungsfehler geändert.
- Vollständiger Repository-Befehl: **147/157 bestanden**, 10 Fehler. Während der Arbeit kamen parallel neue Auth-Tests hinzu, daher ist die Testzahl höher als die genannte Ausgangszahl. Log: `/tmp/i2-suite-final.log`.
- Davon sind **3** veraltete Modell-Erwartungen in `native-operations.test.mjs` und `native-store.test.mjs`: Feature-Einträge sind Objekte, Textpfade enden jetzt auf `text`, Karten referenzieren Pakete über `packageId` und besitzen keine Schattenfelder mehr. Der fertige Patch liegt in `docs/i2-editor-test-updates.patch`. Er wurde ausschließlich auf temporäre Kopien unter `/tmp/i2-relaunch-tests` angewendet. Diese beiden aktualisierten Testdateien bestehen **33/33** Tests. Log: `/tmp/i2-patched-tests.log`. Die Originaldateien außerhalb von `relaunch/source` bleiben unverändert.
- Weitere **4** Fehler betreffen Builds, **2** neu hinzugekommene Auth-Tests scheitern an `rev-parse main` in ihren Fixtures, **1** Server-Test an `listen EPERM 127.0.0.1`. Diese Fehler wurden nicht durch Änderungen an fremden Arbeitsständen umgangen.
- Ergänzender Offline-Prüfbuild: **21 öffentliche Seiten**, **22 Editor-Seiten** kompiliert. Remote-Metadaten wurden ausschließlich für diesen Test durch Bildheader aus den eingecheckten Breiten/Höhen ersetzt; vorhandene Bildcaches wurden teilweise wiederverwendet. Einige Bilddateien sind dadurch Platzhalter. Das ist **kein erfolgreicher regulärer Build, keine visuelle Bildprüfung und kein Release-Artefakt**. Logs: `/tmp/i2-offline-build.log`, `/tmp/i2-private-build.log`.
- DOM-Prüfung dieser Artefakte: öffentliche Ausgabe ohne `data-native-*`; direkte Geschwister in den Navigationslisten; neun FAQ-Kinder; zwei ausgewählte Features in vorgegebener Reihenfolge mit korrekt getrennten Besitzern; verschachtelte Inline-Ausgabe; HTML-Injection bleibt Text; ARIA und Paketoptionen ohne Formatmarkierungen. Prüfskript: `/tmp/i2-verify-html.py`.
- Vergleich mit dem Stand vor Teil A: **21/21 öffentliche DOM-Strukturen gleich**, nach Ausschluss der explizit geänderten Preiskarten, des unsichtbaren Rotationstemplates sowie gebündelter Asset-Referenzen. Bilder und Pixel wurden damit nicht verglichen.
- Negativer echter Astro-Prüfbuild mit `featureIds: ['unbekannte-leistung']` in einer temporären Inhaltskopie: Abbruch mit `Paket SPARK: unbekannte Leistungskennung „unbekannte-leistung“ in featureIds.` Log: `/tmp/i2-invalid-build.log`.
- `git diff --check` sauber. Der für schreibbare Caches temporär umgebogene `node_modules`-Symlink ist wieder auf sein ursprüngliches Ziel zurückgesetzt. Gemeinsame Abhängigkeiten außerhalb des Schreibbereichs wurden nicht verändert.

Die Gesamt-Suite ist noch nicht grün. Ein regulärer Build mit erreichbaren Medien sowie eine Bedienprüfung im integrierten Editor stehen aus. Es wurde kein Computer-Use-Video erstellt: Es war kein Browser-Tab an Computer Use angebunden und lokale HTTP-Listener werden in dieser Sandbox mit EPERM blockiert. Die DOM-/Skriptprüfungen werden nicht als aufgezeichnete Bedienprüfung ausgegeben.

## Exakt benötigte Editor-Anpassungen

### Store und serialisiertes Schema

1. `relaunch/native-store.mjs`: **keine zusätzliche Site-Registrierung**. `siteSchemas.navigation` wird bereits dynamisch gefunden. Dasselbe gilt für `siteRecord()` auf der Source-Seite.
2. `relaunch/native-schema.mjs`: in `describeSchema()` und `schemaDescription()` das Format aus dem entpackten Zod-Schema übernehmen, z. B. `schema.meta?.()?.format ?? node.meta?.()?.format`, zusätzlich zum bestehenden Markdown-Sonderfall für `body`. Optional-Wrapper enthalten die Metadaten nur im inneren Schema. Dadurch bekommen gespeicherte und neu angelegte Felder konsistent `format: 'inline'`.
3. Optional, aber für verständliche Speicherrückmeldungen sinnvoll: `NativeStore.validateReferences()` soll für jedes `pricing`-Objekt in Seiten-/Artikel-/Projekt-Sections das Paket anhand von `packageId` laden und `selectedPackageFeatures(package.data, tier.featureIds)` aus `src/content/package-features.mjs` aufrufen. Auch beim Ändern eines Pakets alle konsumierenden Sections prüfen. Aktuell verhindert der Source-Build ungültige Feature-Referenzen; der Store lehnt sie noch nicht vor dem Speichern ab.
4. Die drei absichtlich geänderten Test-Erwartungen mit dem beiliegenden Patch aktualisieren. Er kann vom Projektordner aus geprüft werden: `git apply --check relaunch/source/docs/i2-editor-test-updates.patch`. Der Patch wurde nicht auf den gemeinsamen Arbeitsstand angewendet.

### Panel und Feldbezeichnungen

1. Pricing-Tier: `packageId` ist die Paketwahl. `featureIds` ist eine Referenzauswahl aus **diesem** Paket, über alle `featureGroups[].items`. Die Beschriftung kommt aus `item.text`, die gespeicherte Auswahl aus `item.id`; die Array-Reihenfolge ist die Kartenreihenfolge. Kein freies String-Eingabefeld für neue Leistungen erzeugen. Bei Paketwechsel Auswahl ausdrücklich neu auswählen oder auf im neuen Paket vorhandene IDs begrenzen.
2. Kanonische Leistungen im Paketpanel als Objekte mit `id` und `text` behandeln. IDs sind dauerhafte Referenzen und dürfen bei Textänderungen nicht automatisch neu generiert werden. Die Source validiert Slug-Form, Länge und Eindeutigkeit im Paket.
3. Navigation/Footer: Arrays und Feldnamen aus `site/navigation` und dessen Schema ableiten. `label` direkt im Canvas bearbeiten, `href` im Panel am selben Linkobjekt. Header-/Footer-Reihenfolge unabhängig halten. Keine parallele Linkliste im Editor pflegen.
4. Nachhaltigkeits-`tone`: Schema-Beschreibung „Darstellung der Kennzahl“ verwenden; für dieses Feld `o → Kontur`, `g → Farbverlauf`. Nicht global den Vergleichs-`tone` mit seinen Werten `y/n/p` umbenennen.

### Frame und Roundtrip

1. `data-native-entry-record` bei jedem Listenwerkzeug verwenden. Beispiel für eine Karte auf der Startseite: sichtbarer Text besitzt `data-native-record="package/spark"` und `data-native-path='["featureGroups",2,"items",1,"text"]'`; dieselbe `li` besitzt `data-native-entry='["sections",3,"tiers",0,"featureIds",0]'` und `data-native-entry-record="page/index"`. Verschieben/Entfernen ändert `featureIds`, Textänderung ändert das Paket. Nicht aus dem Textpfad eine Paketliste zum Umsortieren ableiten.
2. `data-native-order-field="order"`: die direkten FAQ-Record-Kinder als global geordnete Collection behandeln. Eine Reihenfolgeänderung muss numerische `order`-Patches auf die betroffenen FAQ-Datensätze übertragen, atomar speichern und auf allen betroffenen Seiten neu rendern. Bei gefilterten/limitierten Listen die nicht sichtbaren Datensätze und ihre relative Reihenfolge berücksichtigen; keine erfundenen Array-Pfade ergänzen. Die Reihenfolge gilt absichtlich global.
3. `data-native-inline="true"` erlaubt die erzeugten `strong`, `em`, `s`, `span.t-outline` und `span.t-caps` innerhalb des Feldes. Die bisherige Prüfung `node.children.length === 0` darf diese Felder nicht ausschließen. Die bestehende Platzhaltererkennung `/\{\w+\}/` muss Inline-Felder ausnehmen, sonst wird `{o}` oder `{c}` als Formularplatzhalter behandelt.
4. Beim Binden/Preview eines Inline-Feldes die fünf Formate mit dem sicheren Renderer darstellen; niemals die gespeicherte Markersyntax per `textContent` als Anzeige einsetzen. Beim Eingeben/Pasten/Auslesen die erlaubten DOM-Tags zurück in genau diese Syntax serialisieren. `span.t-outline → {o}…{/o}`, `span.t-caps → {c}…{/c}`. Keine weiteren Markdown-Funktionen, HTML-Tags, Klassen oder Attribute aus Paste übernehmen. Verschachtelung, Cursor und Auswahl erhalten.
5. Formataktionen für Fett/Kursiv/Durchgestrichen/Kontur/Großbuchstaben auf die Auswahl innerhalb genau eines solchen Feldes beschränken. Die Voll-Markdown-Funktion für Artikeltexte unverändert eigenständig behandeln. Der bestehende Markdown-Serializer unterstützt die beiden Span-Klassen noch nicht.
6. Hero-Rotation: der Source aktualisiert `data-native-path` auf das jeweils dargestellte Wort. Bindings bei Fokus/Input aus dem aktuellen Marker erneut lesen, damit Wort 1 nicht versehentlich Wort 0 überschreibt.

## Offene Punkte

Der Rendering- und Datenmodellteil ist umgesetzt. Die obigen Editor-Anpassungen wurden auftragsgemäß nicht implementiert. Alte Übersetzungswerte für `featureGroups.i.items.j` müssen bei Bedarf auf `featureGroups.i.items.j.text` migriert beziehungsweise neu erzeugt und geprüft werden. Die aktuellen Source-Dateien enthalten keine solchen Paketübersetzungen. Für die neuen Website-Daten und umgezogenen Paketfelder Übersetzungen aus den neuen kanonischen Pfaden erzeugen, ohne veraltete `sourceHash`-Prüfungen zu übernehmen.
