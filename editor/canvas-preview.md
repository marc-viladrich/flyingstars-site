# Canvas-Einstellungen in der Live-Vorschau

`src/scripts/canvas-runtime.mjs` registriert native Controller. Ein erfolgreich initialisiertes Canvas erhält `data-native-live="true"`. Der Preview-Patcher darf dessen `data-*`-Attribute ändern; Bitmapmaße und Laufzeitstyles bleiben beim Controller. Nicht registrierte Canvases und Strukturänderungen erfordern weiterhin den Ersatz des Abschnitts.

Jeder Controller benennt seine Einstellungsattribute. Der MutationObserver übernimmt einen vollständigen Patch-Batch, beendet den bisherigen Controller und liest die gerenderten Einstellungen erneut. Rechner und Konfigurator beobachten zusätzlich `data-runtime` an ihrem Abschnitt. `native:canvas-update` am Canvas löst denselben Ablauf aus. Die Registrierung erkennt eingefügte und entfernte Canvases; reine DOM-Verschiebungen behalten den Controller. Frames, Listener, Observer und asynchrone Arbeit werden beim Austausch beendet. Besucherentscheidungen bleiben bei Settings-Updates im Rechner und Konfigurator erhalten.

Paket-Orbs, Preisrechner, Konfigurator, Case-Study-Formationen und Nachhaltigkeitsanimation verwenden diese Registrierung. Der Editor enthält keine Formationslogik. Neue Canvas-Controller müssen sich ebenfalls registrieren und ihre Ressourcen über den Lebenszyklus freigeben.

Bei einem Ersatz mit verfügbarer Live-Vorschau entfernt `prepareClonedSection` Laufzeitmarker und einen alten Hinweis. Die Registrierung startet die verbundenen Canvases. Serverseitiges `hidden`, etwa `showOrb: false`, bleibt gültig. Ohne Live-Vorschau zeigt die Kopie den Hinweis zum Speichern und Neuladen. `.pack > div` steht explizit in Spalte 2 und Zeile 1, auch beim mobilen 72px-Raster sowie ohne Canvas. Die übrigen Canvas-Layouts sind vertikal oder positionieren ihr Canvas absolut; sie besitzen keine vergleichbare freie Textspalte.

Prüfung mit Node 22:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
node --test editor/canvas-runtime.test.mjs editor/preview-apply.test.mjs editor/prepare-cloned-section.test.mjs
node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs' src/schemas/editorial-source.test.mjs
node --test scripts/*.test.mjs
npx astro check
FLYINGSTARS_OFFLINE_MEDIA=1 npx astro build
node --test editor/canvas-preview.browser.mjs
```

Der separate Browsertest benötigt den bereits installierten Playwright-Chromium und einen lokalen HTTP-Listener auf einem freien, zufällig gewählten Port. Er prüft die wirklichen DOM-Patches, den Orb-Controller, Ersatz und Listener-Aufräumen sowie die berechnete Textspalte bei 1200px und 390px. Er gehört nicht zum Node-Unit-Glob, damit reine Unit-Läufe keinen Browser starten. Seine Ausführung ist im Codex-Sandboxprofil dieser Umsetzung durch `listen EPERM` und Chromium-Mach-Port-Rechte blockiert. Er wurde dort nicht erfolgreich ausgeführt. Das ist keine bestätigte Browserabnahme.

## Vollständig leere Spark-Karte

Der belegte Fehler versteckt alle Orbs und lässt den Text in die kleine Rasterspalte rutschen. Er löscht den Text nicht. Die EN-Karte wird weiterhin aus `package/spark` gerendert, während Horizon-Einstellungen `package/horizon` ändern.

Für die separate Browserreproduktion sind diese Hypothesen zu unterscheiden:

1. Der Text ist im DOM vorhanden, aber durch das alte schmale Raster, Ausschnitt, Scrollposition oder einen darüberliegenden Editorbereich nicht sichtbar. Beleg: Der alte Clone-Pfad setzt ausschließlich Canvas-`hidden`; das alte Raster platziert den verbleibenden Text automatisch in Spalte 1. Zusätzlich streckt das äußere `.packs`-Raster die Karten auf gemeinsame Höhe; `.pack` zentriert seine Kinder mit `align-items: center`. Unterschiedliche Texthöhen können den kürzeren Spark-Inhalt unter den sichtbaren Ausschnitt verschieben. Das wäre eine optisch leere Karte bei weiterhin vorhandenem DOM-Inhalt. Begrenzung: Die konkrete Differenz zwischen Karten- und Text-Bounding-Rect ist im Browser noch zu messen; aktuelle Homepage-Tiers haben keine ausgewählten Feature-Listen. Kein aktueller CSS-Pfad versteckt durch `hidden` am Canvas den gesamten Textcontainer.
2. Ein Sprach-Overlay überschreibt einzelne Texte mit leeren Werten. `frame.js` nimmt in `translationOverlay()` `translated?.text ?? currentValue(c) ?? ""`; ein expliziter Leerstring gewinnt. Die gespeicherten EN-Übersetzungen für Spark und Horizon enthalten aktuell keine leeren `text`-Werte. `showText()` schreibt ebenfalls unmittelbar in Text/HTML. Begrenzung: Die Preis- und Mengentexte sind abgeleitete Werte, und der unmarkierte Textcontainer selbst wird nicht gebunden. Das erklärt allein keine vollständig leere Karte.
3. Der Screenshot zeigt einen älteren oder gemischten Build-/Frame-Stand mit anderen Markern. Aktuell gehören `data-native-path`-Marker einzelnen Texten und nicht dem umgebenden `.pack > div`. `bind()`/`showText()` auf einem fälschlich markierten Elternknoten könnte dessen Kinder entfernen. Dafür gibt es im aktuellen Pricing-Template keinen Beleg. Beim Reproduzieren Build-Head, Frame-Version und das tatsächliche Karten-HTML sichern.
4. Ein anderer Draft oder ein zeitlich versetzter Preview-Response enthält bereits leere oder entfernte Spark-Inhalte. `applyPreview()` übernimmt servergerenderte Blätter/Strukturen. Die Änderung `Horizon.orbShape` selbst verändert weder Spark-Record noch Spark-Markup. Vorher-/Nachher-Preview-HTML und Sprachwerte sichern. `requestPreview()` verwirft über `previewSeq` bereits überholte normale Antworten; ein bloß verspäteter Request reicht daher als Erklärung nicht aus. Diese Hypothese ist nicht bestätigt.

Beim Reproduzieren zuerst `.pack > div` mit `textContent`, `innerHTML`, Bounding-Rect und berechneter Sichtbarkeit erfassen. So lässt sich ein Anzeigeproblem von einer tatsächlichen DOM-Leerung trennen. EN-Startseite, Horizon-Panel offen, Torus auswählen; danach DE und ein zweites Paketvorkommen vergleichen.
