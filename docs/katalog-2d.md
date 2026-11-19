# 2D-Katalogmotive: saubere Linien statt Auffüllung (Runde 7, 19.11.2026)

## Warum

Marc (19.11.2026): „alle deine ‚Auffüllungen‘ der 2D FlyingStars shapes sehen komplett scheiße aus“, „du solltest dich
weniger exakt an der von FlyingStars vorgegebenen Shape orientieren, sondern primär darauf achten, dass die Shapes alle von
sich aus gut und natürlich aussehen“. Die Runden 5/6 hatten zusätzliche Drohnen zwischen die Katalogpunkte gesetzt und
Innenflächen mit einem Raster gefüllt. Dabei wurden die Unregelmäßigkeiten des Katalogs verstärkt (Peace-Zeichen schief,
Hochzeitstorte unlesbar, Herz mit Initialen zerrissen, Eheringe mit Strahlen).

## Methode

Wie beim Logo-Konverter (`src/scripts/logo-v10/`): erst Linien, dann gleichmäßig abtasten, die Liniendichte folgt der
Drohnenzahl.

1. **Linien vorberechnen** (`scripts/catalog-2d-lines.mjs`, einmal je Variante, Ergebnis in
   `public/media/katalog/linien/<id>.json`):
   - Katalogpunkte und ihre Nachbarkanten als Tinte rastern, kleine Löcher füllen.
   - Flächen (Tinte tiefer als ein Strich, z. B. Blätter, Doppelreihen) werden hohl: Es bleibt die Kontur.
   - Mittellinie (Zhang-Suen), Liniengraph mit Knoten an Enden, Kreuzungen und Ecken; kurze Sporne fallen weg.
   - Glätten, dann idealisieren: fast gerade wird gerade, fast runde Schleifen werden Kreise, gleichmäßige Bögen echte
     Bögen, Bögen auf demselben Kreis ein Kreis, Geraden, die sich an einem Knoten fortsetzen, eine Gerade.
   - Hinweise je Motiv (`HINTS`):
     - `shape`: von Hand idealisierte Form, an den Katalogpunkten vermessen. Das gilt für Peace-Zeichen, Hochzeitstorte (drei
       Stöcke und ein Herz), Herz mit Initialen (Herzkurve, A & T auf gemeinsamer Grundlinie, eine Farbe je Buchstabe),
       Eheringe (zwei gleich große Ellipsen), Unendlich (Lemniskate), Lachendes Gesicht (Kreis, zwei Augenbögen, lachender
       Mund; das rechte Auge liegt im Zwinkerbereich von catalog-actions.js) und Doppelherz (zwei Herzkurven).
     - `keep`: Flächen- und Rastermotive bzw. Zeichnungen, die als Linien nicht sauber werden. Sie behalten FlyingStars'
       Punkte, weitere Drohnen bleiben dunkel. Regel (Marc, Nachrunde 19.11.2026): Kein Motiv darf nach dem Umbau schlechter
       aussehen als seine Katalogpunkte. Jedes Motiv wurde auf dem Kontaktbogen einzeln entschieden; die Liste steht in
       `HINTS` (45 Motive, u. a. Fahnen, Regenbogen, Sonne, Gläser, Blüten, Kuh und UFO, Lebensbaum, Elefant, Glocke, Tor).
   - Stern zeichnet immer aus der 100er-Variante (die 143er hat doppelte Binnenlinien), `LINE_SOURCE` in `scenes/catalog.js`.
2. **Abtasten zur Laufzeit** (`lineSample()` in `scenes/catalog-resample.js`): Jeder Knoten bekommt genau eine Drohne,
   dazwischen gleiche Abstände; der Abstand ist der kleinste, bei dem die Drohnenzahl reicht, aber nie enger als
   `DENSE_SPACING` (0,021 Motivgrößen, etwa 48 Drohnen über die Breite). Kein Paar steht enger als `CLEAR` (0,55)
   Linienabstände. Was übrig bleibt, wartet dunkel in Reserve.
3. **Farbe und Bewegung** (`attach()`): Jede Drohne erbt Farbe und Bewegungsgruppe vom nächsten Katalogpunkt (bei
   idealisierten Formen die Farbe der Linie). Profile (Räder, Nadel, Flügel, Ballons …) rechnen mit der eigenen Lage und der
   Gruppe des Elternpunkts. Zwinkern und Handschlag lesen nur Lagen und laufen direkt auf den neuen Drohnen. Anstoßen und
   Konfetti verschieben jede Drohne wie ihren Elternpunkt. Die Szene trägt dafür `parents`.
4. **Ab 400 Drohnen 3D** (`TWO_D_LIMIT`, `artForDrones()` in `content/show-packages.ts`): Wer im Konfigurator 2D gewählt
   hat und 400 oder mehr Drohnen einstellt, bekommt die Show-Art 3D. Darunter springt die Art wieder auf 2D, solange sie
   nicht selbst gewählt wurde. Wer bei 400+ Drohnen 2D wählt, landet bei 390. Der Preis ändert sich dabei nicht, weil 3D
   gegenüber 2D keinen Aufpreis hat. Motive ohne eigene 3D-Fassung zeigen in 3D ihre saubere 2D-Fassung.

Räumliche Katalogmotive (Kugel, Atom, Spirale …) in der Show-Art 2D sind davon unberührt (Runde 6: Linien nachzeichnen bis
200 Drohnen, `analyse()`/`resample()`).

## Prüfen

```sh
node scripts/catalog-2d-lines.mjs                                   # Linien neu (nach Änderung an Methode oder Hinweisen)
node scripts/catalog-2d-sheet.mjs /tmp/bogen.json 100,200,300,390    # Kontaktbogen aller 2D-Motive (oder Motive nennen)
python3 scripts/catalog-2d-sheet.py /tmp/bogen.json /tmp/bogen.png 8 # 8 Motive je Bild, braucht numpy + Pillow
node --test scripts/catalog-resample.test.mjs src/scripts/scenes/catalog-actions.test.mjs
```

Jeden Bogen ansehen: Ist ein Motiv verzerrt, verfüllt oder zerrissen? Gibt es Klumpen an Kreuzungen oder Punkte neben der
Linie? Der Wächter prüft, dass die Linien-Dateien aktuell sind, höchstens n Drohnen auf einer Linie stehen, der Mindestabstand
eingehalten wird, abgeleitete Linien beim Katalogbild bleiben und die Rechenzeit stimmt.
