# Editor R8: Sprache im Panel, Inhalte verwalten, Frontend-Link, Freigabe

## Entscheidungen

**Sprache im Panel.** Ein Panel mit übersetzbaren Texten (auch hinter „Weitere Felder“) trägt im Kopf genau ein Sprach-Steuerelement (Flagge + Kürzel). Die EN/NL-Pille an fremdsprachigen Feldern öffnet dasselbe Menü. Deutsche Felder bekommen keine eigene Pille, weil die Sprache eine Eigenschaft der ganzen Ansicht ist und nicht des einzelnen Felds. Der Wechsel läuft über `setLocale(locale, { keepPanel: true })`, also denselben Weg wie das Dock. Das Panel bleibt offen und wird sofort in der neuen Sprache gezeichnet (gleicher Datensatz, gleiche Scrollposition, gleiche offenen Gruppen). Nach dem Laden der Seite wird es noch einmal gezeichnet, damit die Karten-Marker der neuen Seite gelten. Escape in diesem Menü schließt nur das Menü.

**Karten-Panel.** „Übersetzen“ bzw. „Zurück zu Deutsch“ für den angeklickten Text. Element- und Karten-Panel nutzen dazu dieselben Funktionen `isTranslatable` und `translateAction`.

**Gruppen.** Gruppierte Auswahllisten (Leistungen eines Pakets nach Gruppe) sind gemerkte Aufklappgruppen (`rememberedDisclosure`). In Kontext-Panels sind sie zu, in der Datensatz-Übersicht offen, wie die Listeneinträge. (Überholt durch R9: alle Listen und Gruppen starten zugeklappt, siehe `docs/editor-r9-nav.md`.) „Erweitert“ behält seinen Zustand über Neuzeichnungen.

**Inhalte verwalten.** Ein Navigator statt Tabs und „Alle Inhaltsfelder (Experten)“. Die Gruppen kommen aus `record.type` (`editor/web/content-navigator.mjs`). Die Tabelle dort benennt und sortiert nur. Übersetzungen erscheinen als Flaggen am Ursprungsdatensatz und öffnen dessen Übersicht in der jeweiligen Sprache. Übersetzungen ohne Ursprung bekommen eine eigene Gruppe, damit nichts unerreichbar wird. Suche ohne Rücksicht auf Groß-/Kleinschreibung und Umlaute, über Titel, Adresse, Dateiname und Typ.

**Seite im Frontend ansehen.** Ein Resolver (`editor/web/frontend-url.mjs`) baut aus Route und aktiver Sprache die Adresse:
- Gespeicherter Entwurf = aktiv veröffentlichter Stand (`draftHead === activePublishedHead`): Menüpunkt „Live ansehen“, öffnet die öffentliche Seite.
- Sonst „Vorschau ansehen · nicht veröffentlicht“: `/vorschau/<Pfad>` auf dem Editor-Host. Das ist der gespeicherte Editor-Build als normale Seite, ohne `frame.js` und ohne Editor-Oberfläche, mit demselben Login. Die Weiterleitung in den Editor in `editor/entry.mjs` nimmt `/vorschau` aus, und der Login führt dorthin zurück.

Eine Änderungserkennung pro Seite gibt es bewusst nicht. Pakete, Medien, Übersetzungen und Navigation werden in viele Seiten gerendert, ein vollständiges Abhängigkeitsverzeichnis fehlt. Verglichen wird deshalb der ganze gespeicherte Stand.

Die Vorschau hat oben eine schmale Leiste in `--ui-accent-ink`: „Vorschau · noch nicht veröffentlicht“ oder „· entspricht der Live-Version“ und ein Link „Live ansehen“ (lokalisiert). Gibt es die Seite live noch nicht, steht dort „Diese Seite ist noch nicht live.“. Ungespeicherte Änderungen im Editor meldet die Leiste live über `localStorage` (`fs-editor-unsaved`). Ein neuer gespeicherter Stand erscheint als „Neuer Stand gespeichert · neu laden“ (`fs-editor-head`). Feste und klebende Elemente mit `top: 0` rücken unter die Leiste. Seitenlinks bleiben in der Vorschau.

**Die öffentliche Seite bekommt keine Leiste.** Jede Besucherin würde sie sehen, und live gibt es nichts zu erklären. Ungespeicherte Änderungen beim Öffnen der Live-Seite meldet stattdessen ein Hinweis im Editor.

**Freigabe.** Nach erfolgreicher Veröffentlichung bleibt der Dialog als Bestätigung offen. Er enthält einen dauerhaften Link auf die aktuelle Seite in der aktuellen Sprache. Den 7-Sekunden-Toast zur Startseite gibt es nicht mehr.

## Prüfen

- Unit: `editor/frontend-url.test.mjs`, `editor/entry.test.mjs`, `editor/preview-page.test.mjs`, `editor/content-navigator.test.mjs` (Durchlauf über alle echten Datensätze) und `editor/auth.test.mjs` (`/vorschau` nur mit Login, Login kehrt zurück, Leiste je Zustand, kein `frame.js`).
- Browser (Chromium und WebKit, echte Maus und Tastatur, isolierte Instanz): `/tmp/fs-ux/r8n/a-nav.mjs`, `c-keep.mjs`, `b-preview.mjs <engine> <locale>`, `d-mobile.mjs`.
