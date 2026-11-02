# Editor R10: Sprache im Kopf, ausgerichtete Raster, wachsende Textfelder, gruppierte Leistungen, Verknüpfungen

Stand 15.10.2026. Antwort auf Marcs Feedback zu Sprachwechsel, Feldrastern, Meldungen, Flaggen, Paketleistungen und Beziehungen.

## Entscheidungen

**Sprache nur im Panelkopf.** Die Sprach-Pillen an einzelnen Feldern sind entfernt; sie verschwanden auf Deutsch, so dass schnelles Hin- und Herschalten abriss. Der Kopf zeigt den Schalter, sobald das Panel übersetzbaren Text betrifft (auch wenn der geklickte Text auf der Seite bearbeitet wird), in jeder Sprache gleich. Ein fremdsprachiges Feld trägt nur ein stilles Sprachkürzel; leer ist es gestrichelt wie unübersetzter Text auf der Seite. „Zurück zu Deutsch“ im Elementpanel entfällt.

**Flaggen füllen ihren Rahmen.** `.panel-locale svg:last-child` traf auch das svg der Flagge (14×14 im 20×15-Rahmen). Die Regel gilt jetzt nur dem direkten Kind, `.flag > svg` füllt überall.

**Raster mit Label- und Steuerzeile.** In `.ov-grid`, `.entry-grid` und `.subgroup` belegt jedes Element zwei Zeilen; ein Feld (Label + Steuerelement) übernimmt sie als Subgrid. Steuerelemente einer Rasterzeile beginnen damit auf gleicher Höhe, auch wenn ein Label umbricht. Schalterzeilen liegen in der Steuerzeile (gleicher innerer Abstand 6 px). Platzhalter-Hinweise stehen in der Labelzeile.

**Ein Textsteuerelement für jede Länge.** Text- und Link-Felder sind Textareas, eine Zeile hoch, solange der Wert passt, und wachsen mit (`field-sizing`, sonst Skript bei Eingabe und Breitenänderung). Einzeilige Felder bleiben einzeilig: Enter übernimmt, eingefügte Umbrüche werden Leerzeichen. Fließtextformate (multiline, markdown) nehmen die ganze Zeile. Ein langer Kurztext bricht in seiner Spalte um, statt rechts abgeschnitten zu werden. Eine Längenschwelle wurde verworfen: Das Panel ist in der Breite veränderbar.

**Schema-Gruppen innerhalb eines Objekts.** Ein Feld in einem Objekt mit `x-afe.group` (über `inGroup`) steht unter dieser Zwischenüberschrift, Reihenfolge nach dem ersten Mitglied. `directChildren`/`chunkByGroup` in `overview-plan.mjs` teilen sich Übersicht und Wächter. Anfrageformular → Meldungen: „Fehlermeldungen“ (6) und „Versand“ (2). Die Buttons heißen nicht mehr wie ihr Wert („Weiter“), sondern „Button zum nächsten Schritt“ usw. Weitere Felder eines Karten-Panels mit mehr als zehn Einträgen werden nach den Blöcken der Datensatz-Übersicht gegliedert; verschachtelte Felder tragen das Schema-Label ihres Objekts statt des Schlüssels.

**Paketleistungen gruppiert.** Die Startseitenkarte (`Pricing.astro`) zeigt gewählte Leistungen unter ihren Gruppentiteln, Gruppen in Paketreihenfolge, innerhalb in gewählter Reihenfolge. Die Auswahl im Karten-Panel hat dieselbe Gliederung (`groupedChoices`, `groupedSelection`, `moveChoice` in `view-state.mjs`): Zeilen bleiben beim Anhaken stehen, gewählte Zeilen verschieben sich per Ziehen oder Pfeiltasten innerhalb ihrer Gruppe; gespeichert wird, was zu sehen ist.

**Zeile klickt an, Öffnen ist eine eigene Taste.** In jeder Auswahl (Datensätze wie Leistungen) ist die ganze Zeile das Label der Checkbox. Öffnen ist ein benannter Knopf am Zeilenende; bei Leistungen „Text im Show-Paket bearbeiten“: Das Paket öffnet mit der Leistung aufgeklappt, im oberen Drittel, fokussiert und kurz markiert (Ring blendet aus; bei reduzierter Bewegung statisch).

**Verknüpft mit.** Die Übersicht eines Datensatzes listet schreibgeschützt die Datensätze, die auf ihn verweisen (Name, Typ, Stelle), jeweils als Sprung mit Zurück. Abgeleitet aus `x-afe.reference` über alle Entwurfsdatensätze (`linked-records.mjs`), ohne Code pro Typ; künftige Referenzen (Projekt → Kunde) erscheinen von selbst. Bilder behalten „Verwendet in“.

**Kleinere Funde aus dem Rundgang.** Der Index markiert oben den ersten, am Ende den letzten Block; Index-Namen brechen um statt abgeschnitten zu werden; die Typangabe steht immer direkt hinter dem Titel; Tabellenzellen behalten Trennlinie und Höhe.

## Prüfen

- Unit: `editor/panel-guard.test.mjs` (alle echten Datensätze: keine sichtbare Gruppe über zehn Steuerelemente, jedes Feld mit Schema-Label, kein Label gleich Wert; `site/ui` als „pending“ gelistet, bis Codex A ui.json neu gegliedert hat; der Eintrag muss danach entfernt werden), `editor/linked-records.test.mjs`, `editor/view-state.test.mjs` (gruppierte Auswahl), `editor/metadata.test.mjs`.
- Browser (isolierte Instanz, echte Maus/Tastatur, Chromium und WebKit): `/tmp/fs-ux/r10u/lang.mjs`, `grid.mjs`, `grow.mjs`, `card.mjs`, `linked.mjs`, Rundgang `sweep.mjs`/`sweep2.mjs` (1440 und 820).
