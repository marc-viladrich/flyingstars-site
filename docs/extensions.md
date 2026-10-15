# Serverseitige Site-Extensions

PR 7 trennt Site-Regeln vom Editor-Runtime-Code. Der Vertrag steht als JSDoc in `editor/core/extensions.mjs`. Eine Extension hat einen eindeutigen Namen mit Namespace, `contractVersion: '1.0'` und optionale `hooks`.

```js
/** @type {import('../editor/core/extensions.mjs').Extension} */
const policy = {
  name: 'example/approval',
  contractVersion: '1.0',
  hooks: {
    validateRecords(records) {
      // Bei einem Verstoß werfen. Der Store schreibt dann keinen Commit.
    },
  },
};
```

## Registrierung und Aufruf

`createFlyingStarsAdapter(siteRoot)` registriert die Site-Definitionen aus `editor/extensions/flyingstars/index.mjs` in einer eigenen Registry. `startNativeServers` setzt am Composition Root eine Registry aus diesen Definitionen und `RuntimeOptions.extensions` zusammen. Einbettende Aufrufer können eigene Definitionen über `resolveRuntimeOptions({values: {extensions: [...]}})` übergeben. Es gibt keine globale Registry und keine Registrierung durch Requests oder Browser-Modulpfade. Direkte Store-Aufrufer übergeben einen Site-Adapter mit einer bereits zusammengestellten Registry.

```js
import {createExtensionRegistry} from '../editor/core/extensions.mjs';

const extensions = createExtensionRegistry([policy]);
extensions.run('validateRecords', records);
const route = extensions.first('route', record) ?? null;
```

Die Registry kopiert und friert Definitionen und Hook-Zuordnungen ein. Sie prüft alle Namen, Hook-Funktionen und Vertragsversionen vor dem ersten Hook-Aufruf. Doppelte Namen, unbekannte Hooks und jede andere Vertragsversion werden abgewiesen. Versionsbereiche und Browser-Manifeste kommen mit der Produktintegration hinzu.

Die Ausführung folgt der aufsteigenden Zeichenreihenfolge der Extension-Namen, unabhängig von der Reihenfolge der Registrierung:

| Aufruf | Verhalten ohne Hook | Verhalten mit Hooks |
| --- | --- | --- |
| `first(name, ...args)` | `undefined` | Erster Wert, der weder `null` noch `undefined` ist |
| `require(name, ...args)` | Fehler | Wie `first`, verlangt mindestens einen registrierten Hook |
| `some(name, ...args)` | `false` | Erster wahrer Wert beendet die Suche |
| `collect(name, ...args)` | `[]` | Hängt Ergebnislisten in Ausführungsreihenfolge aneinander |
| `run(name, ...args)` | Kein Eingriff | Führt jeden synchronen Validator einmal aus |
| `runRequired(name, ...args)` | Fehler | Führt jeden Validator aus und ignoriert Rückgabewerte |
| `runAsync(name, ...args)` | Kein Eingriff | Wartet nacheinander auf jeden Validator |

Ein Fehler beendet den Aufruf. Synchrone Aufrufe akzeptieren keine Promise-Ergebnisse. Rekursive Aufrufe derselben Registry sind verboten; unabhängige parallele Requests haben getrennte Aufrufkontexte. Die Registry stellt keine Schreibmethode bereit.

## Hooks und FlyingStars-Beispiele

Die Signaturen und Rückgabetypen sind im JSDoc-Vertrag definiert. Ein Resolver gibt `undefined` oder `null` zurück, wenn er nicht zuständig ist. Validatoren werfen bei einem Verstoß.

| Hook | Eingabe und Ergebnis | FlyingStars |
| --- | --- | --- |
| `validateRecord` | Source, geparste Daten → Prüfung | Paketname und Dateiname müssen dieselbe Identität haben |
| `validateWrite` | Source, vorherige und vorgeschlagene Daten → Prüfung | Ein Medienverweis darf verwaltete Bildwerte nicht unabhängig ändern |
| `validateRecords` | Vollständiger Kandidatenindex → Prüfung | Bildverweise, kanonische Bildquelle und effektiver Alternativtext |
| `prepareTransaction` | Baseline, Kandidatenindex, berührte IDs, explizite Änderungen, `sourceFor` → `{id, data}[]` | Bei gleichzeitig bearbeitetem Quelltext und Overlay den Review-Stand neu verankern |
| `validateTransaction` | Kandidatenindex und Site-/Source-Zugriff → Prüfung | Nur erlaubte Textpfade; geprüfte Übersetzungen müssen zum aktuellen Quelltext gehören |
| `validateCreation` | Store, Source und Erstellung → asynchrone Prüfung | Reservierte Seitenpfade und bereits vorhandene Astro-Seiten sperren |
| `validateBinaryWrite` | Dateipfad und normalisierte Bytes → Prüfung | Nur Repository-Assets mit passender SHA-256-Adresse |
| `omitField` | Source, Daten, Feldpfad → Boolean | Verwaltete Paket- und Medienwerte aus der Feldauswahl nehmen und direkte Patches sperren |
| `readOnlyPaths` | Source, Daten → Pfadliste | Verwaltete Bildwerte als schreibgeschützt ausweisen |
| `preventDelete` | Datensatz-ID → Boolean | Startseite behalten |
| `title` | Source und Daten → Titel | Paketidentität und Overlay-ID als Titel |
| `route` | Datensatz, optional aktiver Adapter → Route | Bestehenden Resolver der Site nutzen; injizierte Resolver bleiben unterstützt |
| `resolveReference` | Index, Wert, Referenzmetadaten → Datensatz | Bestehende kurze und vollständige IDs zur Astro-Adresse auflösen |
| `references` | Index, Löschziel → verwendende IDs | Mediennutzung in Bildobjekten und Markdown sowie Overlay-Quellen |
| `templates` | Store, Index, Wertepool → Section- und Collection-Katalog | Bestehende Beispiele, Schema-Defaults und Testimonial-Fallback beibehalten |
| `createRecord` | Präfix, Vorlage, Name, Optionen → neue Daten | Vorlagen von echten Kunden-, Projekt- und Provenienzangaben bereinigen |
| `uniqueSection` | Section und bestehende Sections → Section | Beim Duplizieren eine freie Abschnitts-ID vergeben |
| `normalize` | Datensatz-ID, Daten, Pfad und Wert → Feldvorschläge | Sichtbare E-Mail-/Telefonwerte mit ihrem `mailto:`-/`tel:`-Link koppeln |
| `query` | Query-Name → `list`, `create`, optional `reorder` | `flyingstars/faq`, `flyingstars/projects`, `flyingstars/posts` |
| `codec` | Codec-Name → `decode`, `encode`, `plainText` | `flyingstars/inline` nutzt das gespeicherte Markierungsformat und den kanonischen Renderer |
| `translationStorage` | Keine → Overlay-Service | Eigentümerauswahl, bestehendes Overlay finden, Vorschläge zusammenführen und explizit akzeptieren |
| `recordGroup` | Datensatz-ID → Änderungsgruppe | Übersetzungsplanung nach Seiten, Stories, Paketen, Personen und Website-Daten |
| `languages` | Keine → Quellsprache und Zielsprachen | Deutsch als Quelle, Englisch und Niederländisch als Ziele |
| `navigation` | Index, Locale → Menüvorschläge | Bestehende feste Einstiege und datensatzbasierte Routen |
| `mediaPolicy` | Keine → Upload-Service | Größen-/MIME-Grenze, Rasterbereinigung, Datensatz-/Dateivorschlag, Wiederverwendung und API-Antwort |
| `mediaLibrary` | Index → Collections und Assets mit Nutzung | Bestehende Bibliotheksgruppen und Verwendung je Bild |
| `buildEnvironment` | Modus, Origin, optional Bildcache → Umgebungswerte | Pilotvariablen für private Builds, Preview, Origin und Bildcache |

## Schreibgrenze und unveränderte Formate

Der Store behält Schema-Parsing, Metadatenberechtigungen, Revisionen, Referenzprüfung, Sperren, Replay und den atomaren Git-Commit. `prepareTransaction` erhält Kopien der Kandidatendaten. Seine Vorschläge dürfen nur bereits im Auftrag berührte Datensätze ersetzen. Mehrere Vorschläge für dieselbe ID und Vorschläge für unberührte oder gelöschte Datensätze werden abgewiesen. Jeder Vorschlag durchläuft erneut Shape-, Metadaten-, Ownership-, Markdown- und Identitätsprüfung sowie das authoritative Zod-Parsing. Anschließend prüft der Store den vollständigen Kandidaten. Ein Fehler lässt Arbeitsdateien und Git-Revision unverändert.

Die Vergleichstabellen- und Singleton-Invarianten bleiben in den tatsächlichen Zod-Schemas. Extensions führen dafür kein zweites Inhaltsmodell ein. Der generische Schemawalker kennt keine Collection-Namen; er erzeugt strukturelle Vorlagen und Deskriptoren aus dem übergebenen Schema. Die Site entscheidet, welche Beispiele und Records ihren Erstellungskatalog speisen. `native-publisher.mjs` war bereits frei von Site-Regeln und bleibt unverändert.

Uploads werden weiterhin dekodiert und neu kodiert, bevor Daten und Bytes gemeinsam gespeichert werden. Speicherpfad, Medienrecord und Wiederverwendung stammen aus der registrierten Medienpolicy. Host-Aliase, Buildvariablen und bestehende private Dateinamen liegen in `runtime-compatibility.mjs`. Der Runtime-Composition-Root reicht diese Kompatibilitätswerte weiter; bestehende Locks und Leases behalten ihre Namen.

Die Overlay-Ablage behält `sourceId`, `sourceHash`, `values` und die bisherigen IDs bei. Die kollisionsfreie Tupelidentität und eine Formatmigration gehören zu PR 10. Maschinenübersetzungen bleiben ungeprüft, bis sie explizit akzeptiert werden. Der Inline-Codec arbeitet auf dem gespeicherten Stringformat, erhält dessen Bytes beim Roundtrip und bietet zusätzlich den kanonischen HTML-Renderer an. Die DOM-Serialisierung bleibt vorerst im Browser.

## Browser-Folgerunde

Kein File unter `editor/web/` wird in PR 7 geändert. Folgende Anbindungen stehen noch aus:

- Widget-Registrierung für Paketleistungen, Vergleichstabellen, kompakte Tabellen und Mediennutzung.
- Erstellung und Duplizierung über `createRecord` und `uniqueSection`; Kontaktinputs über die Vorschläge von `normalize`.
- Query-Listen, Erstellungspresets und FAQ-Reorder über die registrierten Queries.
- Navigationsauswahl, Record-Gruppen und Locale-Menüs über die Serverdeskriptoren.
- Registrierung des Inline-Codecs einschließlich DOM-Serialisierung; bestehende Outline-/Caps-Darstellung beibehalten.
- Frame-Lifecycles und bisherige Selector-/Preview-Sonderfälle in Browser-Extensions überführen.

Bis dahin bleiben die bisherigen Browserfunktionen und die unabhängigen serverseitigen Medienhelfer bestehen. Paritätstests vergleichen Erstellung, Kontaktvorschläge und die reale Medienbibliothek mit den unveränderten Browserfunktionen. Diese Zwischenstufe beansprucht noch keinen vollständig generischen Browser.

## Verifikation

`editor/core/extensions.test.mjs` prüft Registrierung, Versionen, Defaults, Reihenfolge, Fehler, Rekursion und parallele Aufrufe. `editor/extensions.test.mjs` prüft die Site-APIs und die Git-Schreibgrenze. Der bestehende Core-Semantiktest in `editor/metadata.test.mjs` scannt zusätzlich alle Runtime-Servermodule einschließlich Core und Deployment. Test-/Proof-/Fixture-Code, Site-CI, Browsercode und die Extension-Implementierung werden getrennt behandelt. Nur die benannten Composition Roots dürfen den Pilot-Adapter importieren; ihre übrigen Anweisungen bleiben Teil des Scans.
