# Editor R9: Zurück überall, gegliederte Übersichten, ruhige Karten-Panels

Stand 15.10.2026. Antwort auf Marcs Feedback zu „Inhalte verwalten“, Mediathek, Datensatz-Übersicht und „Weitere Felder“.

## Entscheidungen

**Ein Zurück-Stapel für alle Oberflächen.** `editor/web/nav-stack.mjs` ersetzt den Panel-eigenen Stapel. Dialog-Ansichten („Inhalte verwalten“, „Mediathek“, „… anlegen“) und Panel-Ansichten (Datensatz, Bild, Abschnitt, Eintrag) liegen auf demselben Stapel. Jede gestapelte Ansicht zeigt links neben dem Titel einen Pfeil „Zurück zu „…““. Zurück zeigt die vorige Ansicht so, wie sie verlassen wurde: Suche, offene Gruppen, Scrollposition, Sammlung, Fokus auf dem Element, das geöffnet wurde. X und Escape schließen den ganzen Stapel. Alt+← und ⌘[ gehen ebenfalls zurück, solange kein Eingabefeld den Fokus hat. Die Browser-Historie wird bewusst nicht benutzt: `history.replaceState` trägt die Seitenadresse des Editors, zusätzliche Einträge blieben nach X verwaist.

- Datensätze und Bilder aus einer Dialog-Ansicht öffnen immer über `openFromDialog`. Deshalb führt Zurück vom Datensatz in den Navigator und vom Bild in die Mediathek.
- Ein neu angelegter Datensatz ersetzt das Formular auf dem Stapel. Zurück führt in den Navigator, nicht ins leere Formular.
- Wird der geöffnete Datensatz gelöscht, kommt die Ansicht zurück, aus der er geöffnet wurde.
- Der Bildwähler eines Feldes bleibt ein eigener Dialog über dem Panel. Escape bricht dort nur die Auswahl ab.

**Navigator-Zeilen.** Die allgemeine Regel `.record-list button { width: 100% }` galt auch für die Sprach-Chips. Dadurch schrumpfte der Titel auf 26 px, die Chips wuchsen auf je 328 px. Jetzt hat der deutsche Titel die Zeile, die Chips sind kompakt (53 px) und benannt („Englische Fassung öffnen“). Offene Gruppen gelten für eine Öffnung des Navigators. Beim nächsten Öffnen ist alles zu.

**Suche in die Mediathek.** Eine im Navigator getippte Suche geht in die Mediathek mit. Beide nutzen `matchesQuery` aus `content-navigator.mjs`, deshalb findet die Mediathek dieselben Bilder, die der Navigator unter „Medien“ zählt.

**Mediathek scrollt.** Die Höhenkette Dialog → Body → Bibliothek → Kachelraster ist geschlossen (`flex: 1; min-height: 0`). Nur das Kachelraster und die Sammlungsliste scrollen. Fokus wird mit `preventScroll` gesetzt, Sichtbarmachen geht über `revealInScroller` statt `scrollIntoView`, damit der Dialog-Body nie verrutscht und die Sammlungen sichtbar bleiben.

**Übersichten nach Schema gegliedert.** `editor/web/overview-plan.mjs` leitet die Blöcke einer Datensatz-Übersicht nur aus dem Schema ab. Ein `x-afe.group` fasst Felder, Bilder, Listen und Objekte zu einem Block zusammen. Ungruppierte Felder bilden „Allgemein“, ungruppierte Listen und Objekte jeweils einen eigenen Block. Die Reihenfolge folgt dem ersten Mitglied im Schema. `editor.js` kennt keine Datensatztypen.

- Gruppen setzt `inGroup(gruppe, schema)` aus `src/schemas/afe-meta.mjs`. Ein verketteter `.meta()`-Aufruf ersetzt das ganze `x-afe`-Objekt, der Helfer behält die übrigen Angaben (z. B. die Medien-Policy eines optionalen Bildes).
- Gesetzt für Show-Pakete (Name & Darstellung, Drohnen & Dauer, Preis, Leistungen, Show-Konfigurator), Projekte (Projektkarte, Seitenauftakt), Anfrageformular (Ablauf, Angaben zur Show, Kontaktdaten) und die gemeinsamen Oberflächentexte (vier Bereiche).
- Die Abschnittsliste einer Seite (`x-afe.array.role: "blocks"`) ist ein Mitglied: eine Zeile je Abschnitt, die das Abschnitts-Panel öffnet. Vorher landeten rund 250 Abschnittsfelder der Startseite flach in „Allgemein“.
- Jede Liste startet zugeklappt, in der Übersicht wie im Karten-Panel. Die Zeile nennt den Eintrag und zählt seine Unterlisten („Leistungen: 2“). Ein Objekt neben anderen Mitgliedern eines Blocks und gruppierte Auswahllisten nutzen dasselbe Akkordeon (`fold`) im Look eines Listeneintrags. Das ersetzt die Regel „in der Datensatz-Übersicht offen“ aus R8.

**„Weitere Felder“ bleibt stehen.** Die Aufteilung eines Karten-Panels in Hauptbereich und „Weitere Felder“ wird beim ersten Zeichnen festgehalten (`stablePartition`, Gedächtnis am Stapel-Eintrag) und erst beim nächsten Öffnen neu bestimmt. Eine angehakte Leistung erscheint auf der Karte, ihr Häkchen bleibt aber dort, wo geklickt wurde. Auswahllisten halten ihre Zeilen genauso fest (`pinnedChoices`). Verschieben ordnet nur die sichtbaren gewählten Zeilen um (`reorderVisible`). Der Bereich hat einen sehr leichten Grauton, innen gelten dieselben Akkordeons wie überall.

## Prüfen

- Unit: `editor/nav-stack.test.mjs`, `editor/content-navigator.test.mjs` (Suchregel, Chip-Bezeichnungen), `editor/overview-plan.test.mjs` (Gruppenableitung, Wächter über alle echten Datensätze: kein Block über zehn Mitglieder, keine Abschnittsfelder im Blatt), `editor/stable-layout.test.mjs`.
- Browser (Chromium und WebKit, echte Maus, Tastatur und Mausrad, isolierte Instanz): `/tmp/fs-ux/r9n/nav.mjs`, `entity.mjs`, `card.mjs`, `more.mjs`, `latency.mjs`.
