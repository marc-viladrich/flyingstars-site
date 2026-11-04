# Schritt 7 / I01: gemeinsame Werte und Übersetzungen

Entwurf für Claude als Lead, 4. November 2026. Von Claude als Lead geprüft und freigegeben; Entscheidungen und Teilumsetzung siehe unten. Grundlage ist `origin/main` nach Fetch, `3e42814570eaf13ba227f4b5beb3af0ee7665e80`. Arbeitsort `/tmp/fs-i18n-design`, Branch `codex/i18n-design`. Parallel laufende Inhaltsänderungen sind ausdrücklich nicht enthalten. Vor einer Umsetzung muss die Bestandsaufnahme auf dem dann freigegebenen Inhaltsstand wiederholt werden.

## Empfehlung

Für Schritt 7 empfehle ich **Variante c: volle Sprachdateien als automatisch geprüfte Projektionen gemeinsamer Felder behalten**. Die Feldzuständigkeit kommt aus dem bestehenden Zod-Schema. Ein gemeinsames Modul berechnet Synchronisierung, Übersetzungsbedarf und Quellstand. Damit entfällt die manuelle Nachpflege technischer Werte, ohne gleichzeitig das Speichermodell des Editors auszuwechseln.

Das entfernt zunächst **Pflegekopien, keine physischen Kopien**. Die 2.766 gleichen Blattwerte verschwinden dadurch nicht aus einem erneuten Rohscan. Erfolg bedeutet hier: Ein gemeinsamer Wert ist nur an seinem Besitzer editierbar, beide Sprachprojektionen entstehen automatisch, und reine technische Änderungen verlangen keine Übersetzungsfreigabe. Wenn auch die Dateien selbst kleiner werden sollen, ist **a das Zielmodell**, mit einem gesonderten AFE-Speicherumbau. b bietet dafür aktuell keinen ausreichenden Zusatznutzen.

Nur den Hash zu verkleinern reicht bei keiner Variante. Heute sind Identitätszuordnung und Review-Nachweis ebenfalls zu grob. Diese beiden Probleme müssen im selben Vorhaben gelöst werden.

## Neu gezählter Bestand

Ausgeführt im unveränderten Quellstand mit Node 22.22.1 nach `npm ci`:

```sh
node docs/dupes-inventory-r20/tools/scan.mjs
node docs/dupes-inventory-r20/tools/build-inventory.mjs
```

Der Scanner vergleicht gleiche Blattpfade in DE gegen EN und NL, jeweils als eigenen Treffer. Er zählt keine Übersetzungswörter. Markdown-Bodies, `translationSourceHash`, Kommentare und `null` gehören nicht zu `localeCopies`. Fehlende Pfade werden separat gezählt. Regel: `docs/dupes-inventory-r20/tools/scan.mjs:111–125`.

| Heuristische Kategorie | Früher | Jetzt EN | Jetzt NL | Jetzt gesamt | Veränderung |
| --- | ---: | ---: | ---: | ---: | ---: |
| URLs | 402 | 195 | 195 | 390 | −12 |
| Typisierte Werte | 544 | 226 | 226 | 452 | −92 |
| IDs / Enums | 532 | 236 | 236 | 472 | −60 |
| Referenzen / Filter | 156 | 78 | 78 | 156 | 0 |
| Medienmetadaten | 28 | 14 | 14 | 28 | 0 |
| Text / Eigennamen / Rest | 819 | 625 | 643 | 1.268 | +449 |
| Gesamt | 2.481 | 1.374 | 1.392 | **2.766** | **+285** |

Es bleiben 66 DE-Quellen und 132 Sprachfassungen. 2.288 Blattvergleiche sind verschieden, 0 Vergleichspfade fehlen. Die gleichen Werte verteilen sich auf Seiten 1.515, Projekte 1.023, FAQ 160 und Posts 68. 1.404 verschiedene DE-Blattadressen sind mindestens in einer Zielsprache gleich. Die 132 bestehenden Raw-Dateihashes sind aktuell, durch den ausgeführten i18n-Test geprüft.

Beispiele am aktuellen Quellstand:

| Kategorie | Konkreter DE-Wert | Fundstelle |
| --- | --- | --- |
| URL | Poster-URL `https://flyingstars.art/wp-content/uploads/2025/07/Heiratsantrag_Headerbild.jpg` | `src/content/pages/drohnenshow-hochzeit.yaml:27`, `sections[0].poster.src` |
| Typisiert | `order: 10` | `src/content/faq/ablauf.md:4` |
| Identität | `type: landingHero` | `src/content/pages/drohnenshow-hochzeit.yaml:18` |
| Filter | `tags[0]: planung` | `src/content/faq/ablauf.md:3` |
| Medien | `alt: PUMA` | `src/content/pages/drohnenshow-werbung.yaml:42` |
| Rest | `{{offer.film.priceSuffix}}` | `src/content/pages/drohnenshow-hochzeit.yaml:75` |
| Rest, tatsächlich Referenz | `fact: earlyBookingPercent`, `display: discount` | `src/content/pages/drohnenshow-hochzeit.yaml:76` |
| Rest, tatsächlich Struktur | `variant: outdoor`, `zone: safety` | `src/content/pages/drohnenshow-hochzeit.yaml:89`, `:101` |

Der Anstieg belegt keinen höheren redaktionellen Pflegebedarf. Im Rest stecken allein 236 gleiche `project`- und 236 gleiche `field`-Blätter, außerdem 88 interne `todo`-Notizen, 22 Anker-`href` und weitere Referenzwerte. Nur acht vollständige gleiche Strings enthalten `{{…}}`; Platzhalter innerhalb unterschiedlich übersetzter Sätze sind keine gleichen Blattwerte. Die alten sechs Kategorien bleiben zum Vergleich erhalten. Sie sind **keine Migrationspolicy**. Insbesondere `alt: PUMA` bleibt ein kontextuelles Übersetzungsfeld, auch wenn die aktuelle Übersetzung gleich lautet.

Reproduzierbarkeit: 607 operative Textdateien, 21.265 extrahierte Blätter; `evidence.inputSha256 = dbaa49e57512871146121804e6ed22155a0c2fa83dea5e491eef8170295dbafc`. Achtung: Der vorhandene Scanner schreibt in `base` hart `cd1ea13`, siehe `tools/scan.mjs:175`. `inventory.sourceCommit` übernimmt diesen historischen Wert. Für diese Messung gilt der oben genannte tatsächliche HEAD. `evidence.json` und `inventory.json` bleiben gitignored. Der Generator überschreibt auch das versionierte `groups.md`; diese erzeugte Änderung gehört nicht zur Lieferung und wurde zurückgenommen.

## Was der Editor heute tatsächlich garantiert

Alle Angaben zum Paket beziehen sich auf das installierte `astro-frontend-editor`, npm-Alias für `@marc-viladrich/astro-frontend-editor@0.3.0`. Pfade mit `node_modules/` sind Belege dieses gepinnten Pakets, keine geplanten Änderungen daran.

1. **Vollständige einzelne Sprachdatensätze.** Astro lädt alle YAML-/Markdown-Dateien direkt und prüft sie gegen dasselbe vollständige Schema: `src/content.config.ts:41–44`. Der Adapter ergänzt bei Markdown `body`, registriert `page/en/…` und `page/nl/…` als eigene Dateien: `editor/flyingstars-adapter.mjs:15–25`, `:36`. AFE decodiert zuerst die konkrete Datei und führt sofort `schema.parse` aus: `node_modules/astro-frontend-editor/src/runtime/native-store.mjs:37`, `:50`; der aktive Datei-Adapter wählt genau einen Dokumentinhalt: `src/runtime/legacy-source-adapter.mjs:75–83` im Paket. Ein bloßer Render-Loader macht sparse Dateien deshalb noch nicht editorfähig.
2. **Der Full-file-Vertrag kommt wesentlich von der Site.** `editor/design/locale-transactions.mjs:39–46` verlangt bei jeder DE-Inhaltsänderung beide Zielrecords im selben Save und übernimmt die Byte-Revision des DE-Kandidaten als Hash. Das ist kein generelles Overlay-Verbot des AFE-Produkts. Dennoch kann der vorhandene Hook nicht einfach weitere Records hinzufügen: `node_modules/astro-frontend-editor/src/runtime/native-store.mjs:66–75` akzeptiert Vorschläge nur für bereits in `seen` enthaltene und aktualisierte Records. Auch c muss deshalb beide Ziele automatisch in den Speicherauftrag aufnehmen, einschließlich ihrer erwarteten Revisionen.
3. **Die Browserprüfung ist eine Heuristik.** `editor/design/locale-review.mjs:4` erkennt Strukturstrings über Namen und URL-Syntax. `:9–20` ordnet Arrays über Gleichheit, `id`, Typ und zuletzt Position zu. `:30–55` erzeugt vor dem Speichern synchronisierte Zielrecords und zeigt Textfelder samt Übersetzungsvorschlägen. `editor/design/browser-site.mjs:11`, `:18` aktiviert dafür den eigenen Dialog, ohne das generische Locale-Overlay im Browser zu registrieren.
4. **Aktualität ist heute Raw-SHA.** Build `src/i18n/content.ts:23–25`, Tests `scripts/i18n.test.mjs:44–67`, CLI `editor/translate-missing.mjs:11` und SEO-Bericht `scripts/seo-fallback-report.mjs:15–19` berechnen denselben vollständigen DE-Dateihash jeweils selbst. Vorschauen ersetzen ihn in temporären Dateien, `editor/design/locale-transactions.mjs:14–18`. Das ist keine persistente Review-Aktion.
5. **Provenienz trennt aktuell nicht sauber.** `editor/design/locale-transactions.mjs:27–34` schreibt bei geänderten Strings pauschal `editor-revised` und `editorReviewed: true`, auch für technische URLs. Das darf eine automatische Synchronisierung künftig nicht fortführen. Das generische Paketmodul wäre kein Ersatz für Aktualitätsprüfung: `node_modules/astro-frontend-editor/src/runtime/core/locale-translations.mjs:10–11`, `:35–40` behandelt vorhandenen Zieltext als aktuell und reviewed. Diese Semantik ist nicht der benötigte neue Review-Vertrag.
6. **Eine neue Annotation allein kommt nicht im Browser an.** `node_modules/astro-frontend-editor/src/runtime/native-schema.mjs:3–5` serialisiert nur bestimmte Metadaten. Probe mit `schemaDescription(z.string().meta({'x-i18n':{mode:'shared'}}))` verliert `x-i18n`; `x-afe.translatable: false` bleibt erhalten. Die Site kann einen einzigen Annotation-Helper verwenden, der die serverseitige Policy und das vorhandene `x-afe.translatable` konsistent setzt. Zusätzliche Policy-Details brauchen eine explizite, getestete Übertragung; kein zweiter handgepflegter Browser-Feldkatalog.

### Ausgeführte kleine Proben

Die vorhandenen `scripts/i18n.test.mjs` und `editor/i18n-values.test.mjs` liefen zusammen mit **16/16 bestandenen Tests**. Zusätzlich lief ein echter `NativeStore.save` über `i18nFixture(null)`, in einer ausschließlich temporären Quellkopie mit `remote:false`. Effektiver `AFE_STATE_DIR` war `<temporäre Fixture>/state`. Die Fixture schließt `.env*` aus und deaktiviert Astros Env-Verzeichnis, `editor/i18n-test-fixture.mjs:14–19`, `:51–56`.

- Nur `page/index.sections[0].video` geändert: **409**, Meldung "Bitte beide Sprachfassungen gemeinsam prüfen und mitspeichern …". Der Git-Head bleibt unverändert.
- Dieselbe URL in DE/EN/NL eingereicht: Save erfolgreich, Fixture danach sauber. Für beide Sprach-URLs entsteht `editorReviewed: true`, `revision: afe-full-files`. Damit ist die Vermischung von Sync und Review ausgeführt belegt.
- `contentSchemas.pages.safeParse({title, description})` aus echten Seitendaten: **abgelehnt**, fehlendes `sections`. Sparse Speicherung ist mit dem aktuellen Schema nicht kompatibel.
- `synchronize` mit zwei gleichartigen Hero-Einträgen, die zugleich verschoben und textlich geändert werden: Ohne IDs bleibt die Reihenfolge der englischen Texte A/B, obwohl B/A gemeint ist. Mit stabilen IDs folgt korrekt B/A. Reiner Reorder unveränderter Objekte besteht schon heute, das schwierigere Gegenbeispiel fehlt im bisherigen Guard.

Der letzte Fall ist reproduzierbar, ohne Runtime oder private Zustände:

```js
import {synchronize} from './editor/design/locale-review.mjs';
const before = [{type:'hero', headline:'A'}, {type:'hero', headline:'B'}];
const after = [{type:'hero', headline:'B geändert'}, {type:'hero', headline:'A geändert'}];
const en = [{type:'hero', headline:'English A'}, {type:'hero', headline:'English B'}];
console.log(synchronize(before, after, en)); // A/B, Zuordnung nicht beweisbar
```

Die neuen Speicher-/Hashvarianten wurden nicht implementiert. Ihre Eignung ist ein Entwurf, kein bestandener Integrationstest. Ein Browserlauf und der Vorher-/Nachher-Nachweis aller Seiten gehören zur Umsetzung. `npm ci` war erfolgreich; es meldet für AFE allerdings Node `>=24.15.0`, während der beauftragte Node-22-Lauf die genannten Proben bestand. Der spätere CI-/Runtime-Nachweis muss auch die deklarierte Paket-Engine erfüllen.

## Gemeinsames Fachmodell für alle Varianten

**Besitzer** ist DE für gemeinsame Seitenstruktur oder der bereits vorhandene Datensatz für Kontakt, Personen und Fakten. **Sprachprojektion** ist der vollständige Inhalt einer Sprache, den Renderer und Editor sehen. **Übersetzung** ist ein ausdrücklich gespeicherter lokalisierter Wert. **Review** ist die menschliche Bestätigung eines konkreten Quell- und Zielstands. **Quellstand** misst Übersetzungsbedarf; **Dateirevision** schützt die Speicherung vor konkurrierenden Änderungen. Diese beiden Hashes dürfen nicht mehr gleichgesetzt werden.

Die Policy sitzt an den bestehenden Schemazweigen, einschließlich Medien, Referenz-Unions und Markdown-Body. Vorgeschlagene Modi sind `shared` und `translatable`; Rollen wie `identity`, `reference`, `context-alt` erklären die Bedeutung. Standard bei unbekannter Zuständigkeit ist ein Fehler im Policy-Guard, keine Wert-/Regex-Heuristik. Ein gleicher Markenname ist weiterhin eine explizite Übersetzung, solange das Feld keine fachlich freigegebene gemeinsame Identität ist.

- `type`, interne Identität, Layout, Maße und Filter sind in der Regel shared. `href` wird als gemeinsamer kanonischer Link erst vom vorhandenen `localizedHref` sprachlich geroutet. Sprachspezifische externe Ziele müssen ausdrücklich modelliert werden; keine allgemeine URL-Regex als Policy.
- Headline, Prosa, SEO-Text, Markdown-Body, Bild-Alt und Bildunterschrift sind translatable. Ein reiner Fakten-Token in einem solchen Feld kann gleich sein, bleibt aber eine ausdrücklich gespeicherte Sprachentscheidung. Ein strukturierter `{project, field, display}`-Zweig ist shared; sein zentraler lokalisierter Wert wird weiterhin vom bestehenden Faktenmodul aufgelöst.
- `draft`, `noindex`, Veröffentlichungsdatum und ähnliche Steuerfelder werden nicht wegen ihres Datentyps pauschal eingefroren. Der heutige Strukturtest verlangt gleiche nichtsprachliche Werte. Diesen Gleichlauf zunächst beibehalten; getrennte Sprachveröffentlichung wäre ein eigener Produktentscheid.

### Identitäten vor Hashoptimierung

In den 66 DE-Frontmattern/YAML-Dateien wurden **197 Arrays mit 647 Elementen** gezählt. 454 Elemente sind Objekte, davon haben nur 52 ein nichtleeres `id`; 191 Elemente sind Strings. Das ist eine Reichweitenmessung, keine Forderung nach 647 neuen IDs. Reine shared Filter-/Monatslisten benötigen keine Übersetzungsidentität.

Jedes verschiebbare Element mit lokalisierten Nachkommen braucht dagegen eine unveränderliche interne Kennung, etwa `_key`, die pro Liste eindeutig ist. Öffentliche `id`-Anker bleiben unverändert. Keine Kennung aus Titel, Typ, Bild-URL, aktuellem Index oder übersetzbarem Text ableiten. Die Migration vergibt Kennungen einmal und weist die heutigen Sprachwerte bei gleicher Struktur explizit zu. Danach erzeugt Duplizieren eine neue Kennung, Verschieben behält sie; fehlende/doppelte Kennungen werden abgelehnt. Das Paket kann einen einteiligen Listenschlüssel bereits lesen, `node_modules/astro-frontend-editor/src/runtime/native-schema.mjs:7–8`; die Site-Heuristik muss ihn ebenfalls verwenden.

Primitive übersetzbare Listen brauchen entweder ein Objekt `{_key, text}` mit einer gezielten Projektion für bestehende Renderer oder einen nachweislich stabilen fachlichen Schlüssel. Auch verschachtelte Listen zählen. Indexbasierte Fallbacks sind nach der Migration verboten. Markdown-Body bleibt zunächst ein einziges Übersetzungsfeld. Zeilenoffsets sind keine dauerhaften Textidentitäten.

### Quellstand, Abhängigkeiten und Review

Ein gemeinsames Modul, vorgeschlagener Ort `src/i18n/contract.mjs`, bildet ein kleines Interface für Build, Editor und CLI: `project(schema, source, target, locale, dependencies)` liefert Sprachprojektion, gemeinsame Abweichungen, benötigte Übersetzungsadressen, Review-Bedarf und Quellstand. `dependencies` enthält den explizit eingelesenen Stand der referenzierten Fakten. Die Implementation läuft durch die echten Schemazweige und löst interne IDs zu aktuellen Dateipfaden auf. Keine parallele Liste von Section-Typen oder Feldnamen.

Der neue Quellstand ist SHA-256 einer kanonischen, versionierten Darstellung der **übersetzbaren DE-Felder samt stabilen Adressen und notwendigen Review-Abhängigkeiten**. Objektschlüssel und Adressen werden sortiert; reine Listenreihenfolge bei unveränderten Kennungen ändert ihn nicht. Text-Whitespace bleibt relevant. Pflicht-/Optionalstatus und vorhandene Übersetzungsadressen werden mitgeprüft, auch bei leeren optionalen Feldern. Hinzufügen und Löschen eines Textfeldes ändern die benötigte Adressmenge. Ein reiner shared Reorder tut das nicht.

`translationSourceHash` kann als Name bleiben, erhält aber zwingend einen Formatmarker, etwa `translationContractVersion: 2`. Die bisherigen 64 Hexzeichen verraten die Hashsemantik nicht. Raw-Byte-Revisionen für `expectedRevision`, Konflikterkennung und Git bleiben vollständig erhalten. Ein Quellenwechsel zwischen Laden und Speichern führt zu 409; bei sprachabhängigen Overlays müssen zusätzlich alle gelesenen DE-/Policy-Abhängigkeiten in diese Prüfung eingehen.

Faktenabhängigkeiten kommen aus den existierenden Referenzen und Token-Resolvern, nicht aus einer Suche nach zufällig gleichen Zahlen. Nur den deutschen Text vor der Tokenauflösung zu hashen übersieht Änderungen an referenzierten Namen, Einheiten oder Aussagen. Umgekehrt würde ein Hash des gesamten aufgelösten Satzes jede Preisänderung erneut zur Übersetzungsaufgabe machen.

Deshalb zunächst konservativ: Änderungen referenzierter Bedeutungen invalidieren betroffene Textreviews. Nachgewiesen rein parametrische Änderungen dürfen ausgenommen werden, etwa ein Betrag in einem vollständig sprachbewussten Preisrenderer. Einheit, Qualifikator und Grammatik bleiben Review-Abhängigkeiten. Nicht klassifizierte Faktänderungen verlangen Review. Ein neuer Bildinhalt kann den Alt-Text ungültig machen; ein geänderter CTA-Link kann dessen Beschriftung betreffen. Reine URL-Umschreibung darf nur dort ohne Review passieren, wo keine solche semantische Abhängigkeit besteht. Ein neuer Referenzbesitzer ist ebenfalls mehr als eine technische ID-Änderung.

Der Persistenznachweis braucht pro Sprachfeld eine stabile Adresse, Quellfingerprint, Zielfingerprint und expliziten Review-Status. `origin`, `editorFile` und frühere `editorReviewed`-Angaben bleiben als Herkunft erhalten. Bestehende Flags werden nicht nachträglich zu einer neuen menschlichen Freigabe umgedeutet. Migration bestätigt nur den unverändert übernommenen Stand des bisherigen Vertrags; automatischer Sync schreibt einen getrennten Sync-Nachweis. Maschinenvorschläge sind ungeprüft. Nur die explizite Review-Aktion bestätigt betroffene Quell-/Zielfingerprints. Der Build verlangt weiterhin vollständige und aktuelle Übersetzungen, ohne dadurch sämtliche historische Copy als sprachlich freigegeben auszugeben.

Für c lässt sich zunächst die vorhandene Bedeutung des koordinierten Full-file-Save beibehalten: Bei Textänderungen bestätigt „Geprüft speichern“ sämtliche vom Server ermittelten betroffenen Textfelder in beiden Zielrecords. Ein reiner Shared-Save bestätigt keines. Direkte EN-/NL-Korrekturen bestätigen nur die tatsächlich geänderten Zieltexte und dürfen einen schon veralteten Quellstand nicht beiläufig freigeben. Selektive Einzelbestätigungen innerhalb desselben Saves wären ein zusätzlicher Vertrag mit ausdrücklichen Review-Adressen und Fingerprints im Auftrag; die heutigen `prepareTransaction`-Argumente transportieren keinen solchen separaten Review-Beleg. Diese Erweiterung ist für die erste c-Etappe nicht erforderlich.

## Drei Lösungsvarianten

### a. Schema-Policy und reduzierte Sprachdateien

DE enthält Struktur und gemeinsame Werte. EN/NL enthalten nur übersetzbare Felder plus die zur Zuordnung nötigen Kennungen und Review-Metadaten. Verschachtelte Objekte bleiben erkennbar; Arrays werden über Kennungen auf die DE-Reihenfolge abgebildet. Es gibt kein `target ?? de` für übersetzbare Felder. Fehlende Übersetzungen und verwaiste Kennungen sind Fehler. Das ist ein anderes Speicherformat, nicht lediglich `.partial()` am bisherigen Schema.

**Astro.** Ein Loader materialisiert alle vier Collections vor der vollständigen Zod-Prüfung. IDs wie `en/index`, Markdown-Body, `render(entry)`, Dateibezug und bestehende Marker müssen erhalten bleiben. `src/content.config.ts:41–44` und die Datei-Leser für Coverage/SEO müssen umgestellt werden. Nur `localizedCollection()` zu ändern erreicht direkte `getCollection`-Verbraucher nicht.

**AFE.** Der Editor zeigt weiterhin einen vollständigen Sprachdatensatz. Gemeinsame Werte sind als solche erkennbar und führen zum Besitzer; nur Übersetzungen werden in EN/NL geschrieben. Lesen muss aus derselben Git-Revision DE plus Sprachdatei materialisieren, Schreiben in das reduzierte Format zurückprojizieren. Der heutige `decode(source,text)` bekommt nur eine Datei; `computeState` cached nach Git-Head, `encode` und `commit` müssen wieder dasselbe Speicherformat schreiben. Deshalb reicht ein kleiner Codec-Wrapper nicht. Ein geeigneter Source-Adapter muss Lesen, Revisionen, Writeback und Preview konsistent abdecken. Bis dahin ist diese Variante **nicht AFE-kompatibel**. Übersetzungsvorschläge verwenden dieselben aufgelösten Textadressen; Review bestätigt nur diese Felder.

**Provenienz / Build / Arrays.** Numerische Altpfade werden nach der einmaligen Migration auf stabile Adressen abgebildet. Der alte Pfad bleibt historischer Nachweis. Der Loader lehnt fehlende Texte, fremde Shared-Felder, verwaiste Keys und stale Reviews ab. Ein DE-Reorder braucht keine Overlay-Umschreibung. Neue Elemente bleiben unvollständig, bis EN/NL vorliegen.

**Aufwand / Risiko.** L / hoch. Physische Kopien entfallen wirklich. Zusätzliche Risiken sind Marker auf nicht mehr physisch vorhandene Felder, vergessene DE-Abhängigkeiten in Revisionen und ein nicht reversibler Writeback. Vorteil gegenüber b ist die für Menschen besser lesbare Nähe zur vorhandenen Inhaltsstruktur.

### b. Übersetzungs-Overlays mit stabilen Feldadressen

Eine Sprachdatei enthält eine Map aus Adresse und Text, beispielsweise `sections/@hero-7/headline`. Gemeinsame Struktur existiert ausschließlich in DE. Die Adresse ist eine strukturierte, validierte Folge aus Eigenschaft und Item-Kennung, kein frei ausgeführter JSON-Pfad. Das alte historische Overlayformat wird nicht ungeprüft reaktiviert.

**Astro.** Materialisierung und vollständige Validierung wie a. Die Overlaydatei ist keine normale vollständige Content-Collection. Markdown-Bodies und alle Textfelder werden durch dasselbe Modul aufgelöst. Fehlende oder unbekannte Adressen brechen den Build; es gibt keinen deutschen Text-Fallback.

**AFE.** Zwei Wege wären möglich: vollständige virtuelle Locale-Records mit neuem Source-Adapter wie a oder editorseitige Overlay-Records samt neuer Marker-/Feldzuordnung. Der erste hält die heutige Bedienung stabil, hat aber denselben Speicheraufwand wie a. Der zweite greift zusätzlich in Navigation, Browser-Drafts und Inline-Bindungen ein. Das Paket besitzt Übersetzungsfunktionen, doch die aktive Site schaltet diesen Weg ausdrücklich aus. Paketverfügbarkeit beweist hier keine Integration. Vorschläge müssen Textwerte und stabile Adressen liefern, keine Index-Patches; der Reviewstatus darf nicht aus bloßer Textanwesenheit entstehen.

**Provenienz / Build / Arrays.** Gute natürliche Zuordnung von Fingerprints zu Textadressen. Der alte `content-provenance.json` wird migriert und historisch erhalten. Reorder bleibt lokal zu DE; Löschen erzeugt einen expliziten Fehler für verwaiste Overlayadressen. Feldumbenennungen und Verschieben zwischen Listen benötigen eine nachvollziehbare Adressmigration, sonst wird eine bestehende Übersetzung als neu behandelt.

**Aufwand / Risiko.** L / hoch bis sehr hoch. Die kleinste Textspeicherung und gute Eignung für feldweises Review, aber schlechter manuell lesbar und eine zusätzliche Adresssprache. Für 66 Quellen derzeit kein überzeugender Vorteil gegenüber a; der frühere Bestand ist kein Grund zur Rückkehr.

### c. Volle Dateien und automatische Synchronisierung

DE bleibt struktureller Besitzer. EN/NL bleiben vollständige, versionierte Dokumente. Shared-Felder sind darin abgeleitete Projektionen. Eine Änderung am Besitzer erzeugt genau einen atomaren Speicherauftrag mit beiden Sprachprojektionen. Ein expliziter idempotenter CLI-Befehl bietet denselben Vorgang für Inhaltsänderungen außerhalb des Editors. Der Build prüft und schreibt niemals Dateien nach.

**Astro.** Die vorhandenen Collections, Eintrags-IDs, Markdown-Bodies und Marker können bleiben. Coverage und Hashprüfer verwenden das gemeinsame Modul. Zusätzlich bricht der Build bei einer abweichenden Shared-Projektion ab. Dadurch kann ein Entwickler keinen EN-Sonderwert einschleusen, nur weil der kleinere Text-Hash noch passt.

**AFE.** DE zeigt die gemeinsame Bearbeitung mit Hinweis auf EN/NL-Auswirkungen. EN/NL zeigen gemeinsame Werte als abgeleitet und bieten einen Weg zum Besitzer. Der Browser nimmt die beiden Zielrecords automatisch in den Save auf, auch ohne Textprüfung; der Server berechnet und prüft die erlaubte Projektion selbst. Ganze Objekt-/Array-Patches dürfen die Shared-Regel nicht umgehen. Kein neues Sprachreview für reine technische Änderungen. Textänderungen öffnen weiterhin den gemeinsamen Dialog mit Übersetzungsvorschlägen; Abbrechen persistiert nichts. Direkte EN-/NL-Textkorrekturen bleiben möglich und ändern DE nicht. Ein bloßer Shared-Sync schreibt keinen Reviewstatus und zieht keinen stale Text-Hash nach.

**Provenienz / Build / Arrays.** Derselbe neue Hash-/Review-Vertrag wie a/b. Stabile Item-Kennungen sind auch hier nötig, weil die bestehende Reorder-Heuristik bei kombinierten Änderungen versagt. CLI und Browser materialisieren Listen in DE-Reihenfolge mit den zugehörigen Sprachtexten. Nach Löschung werden Nachweise ausdrücklich archiviert oder als gelöscht markiert, nicht dem nächsten numerischen Index zugeordnet.

**Aufwand / Risiko.** Gesamt L, in mehrere M-Schritte teilbar; Risiko mittel. Kein Umbau des AFE-Source-Adapters erforderlich, aber Locale-Dialog, serverseitige Transaktionspolicy und alle Raw-Hash-Verbraucher müssen gemeinsam angepasst werden. Die Anzahl versionierter Kopien und der gemeinsame Schreibzugriff auf drei Dateien bleiben. Deshalb nur auf einem freigegebenen Stand migrieren, nicht parallel zum Inhaltsagenten.

## Umsetzungsfolge und Abnahme

S/M/L sind relative Größen, keine Zeitzusagen. Jeder Schritt ist einzeln reviewbar. Die Hashaktivierung erfolgt erst, wenn alle Verbraucher denselben Vertrag nutzen. Bis dahin bleibt Raw-SHA verbindlich. Keine automatisch gemergte Inhaltsmigration.

| Schritt | Aufwand | Konkretes Ergebnis und Guard |
| --- | --- | --- |
| 0. Inhaltsstand fixieren | S | Nach Abschluss der parallelen Copy-Arbeit auf neuen HEAD aufsetzen, erneut zählen, Dateihashes und vollständigen DE/EN/NL-Ausgabestand sichern. Abweichender Ausgangsstand stoppt die Migration. |
| 1. Feldpolicy ergänzen | M | Bestehende Zod-Definitionen einschließlich Imports und Body annotieren, reine Klassifikation zunächst ohne Speicheränderung. Guard für jeden realen und möglichen Union-Zweig: eindeutige Policy, Browser-/Server-Übereinstimmung, unbekanntes Feld stoppt. Keine Heuristik aus dem Inventar übernehmen. |
| 2. Stabile Zuordnung migrieren | M | Interne Keys nur für Listen mit lokalisierten Nachkommen, inklusive primitiver Textlisten. Alte Pfade einmalig zuordnen, öffentliche Anker erhalten. Guard für Reorder plus Änderung, Duplikat, Insert/Delete, wiederholte Typen, verschachtelte Listen, doppelte/fehlende Keys. Ausgabevergleich muss null Differenzen liefern. |
| 3. Gemeinsamen Vertrag vorbereiten | M | Projektion, kanonischer Text-/Abhängigkeitsfingerprint und versionierte Nachweise implementieren, zunächst zusätzlich zum alten Hash prüfen. Herkunft unverändert übernehmen; keine neue Freigabe erfinden. Guard: URL/Maße/Kommentar erzeugen keinen Textreview, Prosa/Alt/Name und semantische Faktänderungen schon. |
| 4. Variante c atomar aktivieren | M | Browser und CLI erzeugen gemeinsame Werte, Server verifiziert sie; Preview nutzt dieselbe Projektion. Formatmarker/Hashdefinition und sämtliche Prüfer in einem kohärenten Änderungssatz umstellen. Guards gegen Shared-Schreiben aus EN/NL, Root-Patch-Umgehung, reine DE-Änderung ohne gültige Ziele, stale Texte trotz neuem Shared-Wert. |
| 5. Review und Ausgabe abnehmen | M | Explizite Review-Aktion bestätigt nur betroffene Textfelder. Vorschlag, Abbruch, Sync und Preview erzeugen keine Freigabe. Echter Save/Reload, EN-Korrektur, Retry, konkurrierende Änderung und Buildfehler müssen atomar korrekt reagieren. Gesamter Seitennachweis wie unten. |
| Optional 6. a separat erproben | L | Nur falls physisches Entfernen beschlossen ist: ein echtes Seiten- und ein Markdown-Triplett durch reversiblen AFE-Source-Adapter lesen, ändern, speichern, neu laden und privat/öffentlich bauen. Mehrdatei-Abhängigkeiten, Marker und Konflikte ausführen, bevor Inhalte umgestellt werden. |
| Optional 7. a je Collection migrieren | L | Erst nach erfolgreicher Probe sparse Dateien pro Collection erzeugen und bisherige Shared-Kopien im selben Schritt entfernen. Dieselbe Policy, gleiche Quellfingerprints und Nachweise weiterverwenden. Vollständiger Rendervergleich und Rückmigration sichern. |

Zu den Raw-Hash-Verbrauchern gehören mindestens `src/i18n/content.ts`, `editor/design/locale-transactions.mjs`, `editor/translate-missing.mjs`, `scripts/seo-fallback-report.mjs` und deren Tests. Auch `scripts/production-seo.test.mjs:28–29`, `editor/translation-core.test.mjs`, `editor/native-store.test.mjs`, `editor/design.browser.mjs` und `editor/native-operations.test.mjs` enthalten heutige Byte-Hash-Annahmen. Diese Tests erhalten neue fachliche Erwartungen; Byte-Revisionstests bleiben bestehen. `scripts/check-i18n-build.mjs` bleibt als Routing-/SEO-Guard und wird nicht als Textgleichheitsnachweis ausgegeben.

### Nachweis „alle Seiten textgleich in DE/EN/NL“

Gemeint ist jede Sprache **vorher gegen dieselbe Sprache nachher**, nicht gleiche Texte zwischen den Sprachen. Vorher und nachher werden aus exakt demselben freigegebenen Inhaltsstand gebaut, jeweils öffentlich und mit Editor-Markern. Keine Screenshots einzelner Startseiten als Ersatz für den vollständigen Vergleich.

1. Alle HTML-Routen aus beiden Builds vergleichen, inklusive Sprachvarianten, Blog-/Projektseiten, 404, Weiterleitungen und Noindex-Seiten. Keine neue oder entfallene Route. Einstieg ist `python3 docs/dupes-inventory-r20/tools/compare-builds.py <vorher> <nachher>`; das vorhandene Werkzeug prüft Text, Links, SEO und einen Teil der Formularverträge.
2. Seine Lücken bewusst ergänzen: geordnete Textknoten, `alt`, `title`, ARIA-Namen/-Referenzen, Placeholder, Button-/Select-/Textarea-Werte, Formularlabels, Sprungmarken und Medienziele vergleichen. Nur generierte Asset-Dateinamen und ausdrücklich technische Marker-Bytes normalisieren. Kein Entfernen ganzer DOM-Teilbäume, das Textverlust verstecken könnte.
3. Dynamische Texte nicht aus HTML allein ableiten. Im Browser je Sprache Sprachwechsel, Formularfehler, Konfigurator-Auswahl/Zusammenfassung, Zahlen-/Preisformatierung und Dialoge mit gleichen Eingaben durchlaufen. Relevante zugängliche Namen und Texte vorher/nachher vergleichen. Im privaten Build zusätzlich jede Inline-Bindung zum richtigen sprachlichen Feld bzw. gemeinsamen Besitzer verfolgen.
4. Reale AFE-Szenarien in einer Fixture mit temporärem `AFE_STATE_DIR`: Shared-Wert einmal ändern, Text ändern und Vorschlag annehmen/verwerfen, Prüfung abbrechen, direkt EN korrigieren, Reorder plus Textänderung, neue/gelöschte Elemente, Save/Reload, wiederholter Request und extern veränderte DE-/Sprachdatei. Kandidatenbuild schlägt fehl: kein Teilcommit, keine vorgezogene Review-Markierung. Aufnahme und Sichtprüfung des Editor-Durchlaufs als Abnahmebeleg vor der Umsetzungsfreigabe.

Permanente Mutationsmatrix: CTA-URL und Maße folgen ohne unnötigen Textreview; Bildwechsel invalidiert betroffenen Alt-Text; gleicher Markenname bleibt explizite Übersetzung; Name oder Zahl im Fließtext macht betroffene Übersetzung stale; rein parametrisierter Preis folgt seinem geprüften Formatvertrag; fehlender Token oder Fremdreferenz bricht ab; reine Reihenfolge erhält die Textzuordnung; unbekannte/fehlende Übersetzung und verwaister Nachweis brechen ab. Den angenommenen sicheren Fall jeweils am echten Modul ausführen. Das jetzige Gegenbeispiel wird zum Regressionsguard.

## Entscheidungen für Claude / Marc

1. **Abnahmeziel für Schritt 7:** Reicht das Entfernen manueller Mehrfachpflege mit c, oder müssen die gemeinsamen Werte bereits physisch aus EN/NL verschwinden? Empfehlung c; für das zweite Ziel a einschließlich Source-Adapter beauftragen. Das verändert Aufwand und Lieferumfang wesentlich.
2. **Fachlich unveränderliche Textwerte:** Welche marken-/projektspezifischen Anzeigenamen sollen künftig tatsächlich einen gemeinsamen Besitzer haben? Bis zur Freigabe bleiben gleichlautende Namen, Alt-Texte und Labels übersetzbar. Es braucht keine Entscheidung pro Rohscan-Treffer, sondern nur für die bewusst zentralisierten Identitätsfelder.
3. **Umgang mit neuer menschlicher Freigabe:** Soll die reine technische Migration den bisherigen vollständigen Stand als übernommen dokumentieren, ohne neue sprachliche Freigabe, oder ist zugleich eine erneute menschliche Prüfung aller Sprachtexte gewünscht? Empfehlung ersteres; die bestehende Provenienz enthält maschinelle und teilweise historisch fehlerhafte Review-Angaben. Die Architektur darf daraus keine zusätzliche Freigabe ableiten.

Keine offene technische Grundsatzfrage sind Index-Fallbacks, das automatische Setzen von reviewed oder ein stiller deutscher Ersatztext. Diese Wege verletzen den geforderten Erhalt von Zuordnung, Herkunft und Sprachabdeckung. Getrennte Veröffentlichung nach Sprache bleibt außerhalb dieses Schritts; der heutige Gleichlauf wird beibehalten.


## Entscheidungen 04.11.

Verbindliche Freigabe von Claude für die Umsetzung:

1. Variante c wird umgesetzt: volle Sprachdateien, deren gemeinsame Felder automatisch synchronisiert werden. Varianten a/b und die optionalen Schritte 6/7 entfallen.
2. Keine zusätzlichen gemeinsamen Anzeigenamen. Gleichlautende Namen, Alt-Texte und Labels bleiben übersetzbar. Zentral bleiben ausschließlich die vorhandenen Datensätze für Kontakt, Personen, Projekt-/Showfakten und Faktenplatzhalter.
3. Migration ohne neue menschliche Freigabe. Der bisherige Stand wird als übernommen dokumentiert. Historische `editorReviewed`-Angaben bleiben Herkunft und werden nicht als neue Freigabe ausgelegt.
4. Keine Videoaufnahme als Abnahmebeleg. Editor-Szenarien werden mit temporärem `AFE_STATE_DIR` getestet. Die frühere Aufnahmeforderung in diesem Entwurf ist damit aufgehoben.

Dieser Teilauftrag umfasst ausschließlich Schritt 1 und die Vorbereitung aus Schritt 3, auf `origin/main` bei `3e42814`. Keine Inhaltsmigration, keine stabilen Keys, keine Änderung an bestehenden Nachweisen und keine Aktivierung des neuen Hashs. Die Raw-SHA-Prüfer bleiben verbindlich. Parallel ergänzte Schemafelder aus `codex/t02-shared-blocks` werden nach dessen Merge annotiert.

Umsetzung, Schnittstellen, Bestandsabweichungen und Prüfergebnisse: [Teil 1: Feldpolicy und Vertrag](teil-1-umsetzung.md).
