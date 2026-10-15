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

Die Registry kopiert und friert Definitionen und Hook-Zuordnungen ein. Sie prüft alle Namen, Hook-Funktionen und Vertragsversionen vor dem ersten Hook-Aufruf. Doppelte Namen, unbekannte Hooks und jede andere Vertragsversion werden abgewiesen. Versionsbereiche kommen mit der Produktintegration hinzu; der Browservertrag von PR 7b steht weiter unten.

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

Die Overlay-Ablage behält `sourceId`, `sourceHash`, `values` und die bisherigen IDs bei. Die kollisionsfreie Tupelidentität und eine Formatmigration gehören zu PR 10. Maschinenübersetzungen bleiben ungeprüft, bis sie explizit akzeptiert werden. Der Inline-Codec arbeitet auf dem gespeicherten Stringformat, erhält dessen Bytes beim Roundtrip und bietet zusätzlich den kanonischen HTML-Renderer an. Die DOM-Serialisierung liegt in der registrierten Browser-Extension.

## Browser-Registry, PR 7b

`editor/web/extensions.mjs` definiert eine browserfähige Registry ohne Node- oder Site-Imports. `editor/web/site-adapter.mjs` lädt beim Modulstart die Definitionen aus `../browser-site.mjs` und erstellt genau eine Registry pro JavaScript-Realm. Der Site-Adapter liefert dieses Modul unter `/browser-site.mjs` aus. Die Node-Komposition und der ausgelieferte Browser verwenden denselben Modulgraphen. Alle weiteren Modulpfade stehen explizit in `adapter.browserFiles`; ein Request kann keine Extension registrieren.

```js
const extensions = createBrowserExtensionRegistry([{
  name: 'example/catalog',
  contractVersion: '1.0',
  hooks: {
    query: name => name === 'example/products' ? productsQuery : undefined,
    createRecord: (prefix, template, name, options) => factory(template, name, options),
  },
  widgets: {'example/picker': {choices: (item, container, ui) => choices}},
  codecs: {'example/short': {decode, encode, plainText, html, fromDOM, supportsDOM}},
}]);

const query = extensions.require('query', 'example/products');
const ids = query.list({records, section, editor: true});
```

Die Registrierung prüft Namen, exakte Vertragsversion, bekannte Hook-Namen, Hook-Funktionen, Widget- und Codec-Mitglieder sowie doppelte Capability-IDs vor dem ersten Aufruf. Definitionen, Hook-Tabellen und Capability-Beschreibungen werden kopiert und eingefroren. Die Dispatch-Methoden `first`, `require`, `some`, `collect`, `run`, `runRequired` und `runAsync` entsprechen den Servermethoden. Extension-Namen bestimmen die Reihenfolge. Fehler beenden den Aufruf; synchrone Resolver lehnen Promises ab. Während eines Hook-Aufrufs ist erneuter Dispatch verboten. Asynchrone Hooks werden nacheinander erwartet; Browsercode besitzt keinen Node-AsyncLocalStorage-Kontext über `await` hinweg.

| Bereich | Browservertrag |
| --- | --- |
| Widgets | `widgets[id]`: `render(item, path, options, ui)`, `choices(item, container, ui)`, `table` oder `layout`. Der Schlüssel kommt aus `x-afe.widget`. |
| Erstellung | `createRecord(prefix, template, name, options)` und `uniqueSection(section, existing)` liefern Daten. `creationForm(prefix)` beschreibt Zusatzinputs; `validateCreation(context)` prüft vor dem Anlegen im Draft. |
| Queries | `query(name)` und `sectionQuery(section)` liefern `list({records, section, editor})`, `create({records, section})` und optional `reorder({records, ids})`. Reorder liefert dieselben Feldpatches wie auf dem Server. `orderedQuery({ids, field})` bindet das Canvas-Protokoll an die Query. |
| Feldvorschläge | `normalize({id, data, path, value})` liefert Zusatzpatches; `siteChange(id, path, value, {record, draft})` bündelt zusammengehörige Änderungen. Der NativeStore validiert jeden späteren Save weiterhin vollständig. |
| Navigation | `navigation(records)`, `pageChoices(records)`, `pageGroups()`, `currentPage(records, slug)`, `navigatorName(record)`, `recordKinds()`, `navigatorOrder()`, `changeKinds()`, `recordGroup(id)`, `languages()`, `localeNames()` und `routeTools()` liefern Routen, Gruppen und Sprachen. |
| Inline-Codec | `inlineCodec()` wählt eine registrierte Codec-ID. `extensions.inlineCodec` liefert deren geprüfte Beschreibung einschließlich DOM-Serializer und optionaler Markierungsbuttons. Die gespeicherten Bytes und Outline-/Caps-Darstellung bleiben erhalten. |
| Frame | `presentFrame({document, records, mediaBaselines, initialMediaSource})`, `prepareClone(copy, options)`, `isRuntime(node)` und `attributePolicy(node, attribute)` kapseln Selektoren, Bild-/Canvas-Vorschau und Controller-Regeln. |
| Transienter Zustand | `snapshotFrame(context)`, `restoreFrame(state, context)` und `ownsTransientInput(node, state)` sind Hooks. Die gleichnamigen Registry-Methoden sammeln bzw. verteilen den Zustand nach Extension-Namen, damit mehrere Controller unabhängig bleiben. |
| Referenzen, Medien und Übersetzungen | Resolver für deklarierte Referenzen, Medienbibliothek/-auswahl/-nutzung und `translationStorage()` kapseln die bisherigen Site-Formate. Die spätere Übersetzungsmigration gehört weiter zu PR 10. |

`window.afeExtensions` ist die einzige Editor-Globale. Die bereits vorhandene Frame-Brücke und die Layoutdiagnose liegen unter `registry.frame` bzw. `registry.layout` und werden einmal mit `connect()` angeschlossen. Inhaltsänderungen durchlaufen weiterhin den Draft und die Server-Schreibgrenze.

Die FlyingStars-Registrierung und alle Site-Regeln liegen in `editor/extensions/flyingstars/web/`. Server und Browser verwenden dieselben Record-/Section-Factories, Queries, Kontaktvorschläge und Medienresolver. Generische Browsermodule enthalten keine FlyingStars-IDs, Inhaltsfeldnamen oder Site-Selektoren. Ein Guard scannt alle `.mjs`- und `.js`-Dateien unter `editor/web/`.

Die gewählte Schnittstelle trennt UI-Mechanik und Site-Regeln. Eine Alternative wäre gewesen, alle Browsermodule in einen Site-Controller mit Zugriff auf den gesamten Editorzustand zu verschieben. Das hätte weniger Hooks benötigt, aber der Site die generische Inspector-, Draft- und Navigationslogik übertragen. Die Registry erhält diese Zuständigkeiten im Editor und nimmt nur Datenvorschläge und klar begrenzte DOM-Lifecycles entgegen.

## Verifikation

`editor/core/extensions.test.mjs` prüft Registrierung, Versionen, Defaults, Reihenfolge, Fehler, Rekursion und parallele Aufrufe. `editor/extensions.test.mjs` prüft die Site-APIs und die Git-Schreibgrenze. Der bestehende Core-Semantiktest in `editor/metadata.test.mjs` scannt zusätzlich alle Runtime-Servermodule einschließlich Core und Deployment. Test-/Proof-/Fixture-Code, Site-CI, Browsercode und die Extension-Implementierung werden getrennt behandelt. Nur die benannten Composition Roots dürfen den Pilot-Adapter importieren; ihre übrigen Anweisungen bleiben Teil des Scans.
