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
     - `anchor` (Runde 9, `KEEP`/`FIELD` in `HINTS`, 45 Motive): FlyingStars' Punkte bleiben exakt an ihrer Stelle
       (Anker). Neue Drohnen entstehen nur auf den Kanten des Nachbarschaftsgraphen zwischen benachbarten Katalogpunkten
       derselben Linie, höchstens 1,6 × der Punktabstand vor Ort (gedeckelt auf 1,5 Katalog-Punktabstände). Größere
       Lücken sind im Katalog gewollt und bleiben offen. Liegt eine Kante mitten in einer Linie (beide Enden mit genau zwei
       Nachbarn, Knick unter 60°), folgt sie dem Bogen durch die Nachbarn (Catmull-Rom), damit Räder und Ballons rund
       bleiben; der Bogen weicht höchstens 0,12 Punktabstände von der Sehne ab. Verworfen in Runde 9: neu verfolgte Ketten
       (verformten Räder und Kabinen) und Flächenraster (Auffüllung, von Marc in Runde 7 abgelehnt). Auch Flächenmotive
       (Fahnen, Sektflasche, Golfer) laufen über die Anker, ohne Innenfüllung.
       Nachrunde: verdichtet wird nur, was Linie ist (`lineEdges()`): Kanten, deren beide Enden höchstens zwei Nachbarn
       haben, oder Kanten am Rand einer Fläche (auf einer Seite kein Katalogpunkt). Naben, Speichen und Kanten zwischen
       Innenpunkten einer Fläche (Golfer-Körper, Kettenlaufwerk) bleiben unverdichtet, ihre Punkte stehen einzeln.
     - Rastermotive (`grid`, `gridOf()`): Ist das Katalogbild selbst ein Gitter (wehende Fahne, 9 × 13), wird im Gitter
       bilinear verfeinert, Zeilen und Spalten im selben Verhältnis, r · c ≤ n. Regelmäßig, die Welle bleibt; die paar
       übrigen Drohnen bleiben dunkel.
     - Bild-Varianten (`bild-*`, aus Fotos ausgelesen): Punkte unter 0,6 der mittleren Helligkeit sind Auslese-Reste (Straße
       unter dem Feuerwehrauto, Schatten unter Rädern, Streupunkte neben der Blume). Sie fallen weg (`drop` in der
       Linien-Datei) und sind keine Elternpunkte; `bright()` hätte sie sonst auf volle Helligkeit gehoben.
   - Stern zeichnet immer aus der 100er-Variante (die 143er hat doppelte Binnenlinien), `LINE_SOURCE` in `scenes/catalog.js`.
2. **Abtasten zur Laufzeit** (`lineSample()` in `scenes/catalog-resample.js`): Jeder Knoten bekommt genau eine Drohne,
   dazwischen gleiche Abstände. Runde 9 (Marc: „dass die aber halt jetzt nicht nach 300 Drohnen aussehen … da brauchen wir
   mehr Consistency“): Der Abstand wird auf die gewählte Zahl gelöst, es gibt keine Dichtegrenze mehr. Ein 2D-Motiv zeigt bei
   n Drohnen sichtbar n (gemessen: 217 von 244 Fällen genau, sonst höchstens 2 weniger) und wirkt so dicht wie ein 3D-Motiv
   derselben Zahl. Kein Paar steht enger als `CLEAR` (0,55) Linienabstände; die letzten Drohnen kommen in die größten
   Lücken (`topUp()`). Kurze Lücken zwischen einem Linienende und einer Nachbarlinie werden bei dichter Abtastung überbrückt
   (`bridgesOf()`, nur bei abgeleiteten Linien, nie bei Ankermotiven). Ankermotive (`anchorSample()`) behalten alle
   Katalogpunkte; die übrigen Drohnen verteilen sich so auf die Ankerkanten, dass die Summe genau n ergibt.
   Stehen die Zwischenpunkte enger als `DOT_MERGE` (0,009 Motivgrößen, gemessen an der 3D-Geburtstagstorte bei 300), setzt
   die Szene `drones` für die Lichtgröße höher (`dotDrones()`), die Lichter werden kleiner (show-field begrenzt auf 0,76).
   Reicht auch die kleinste Lichtgröße nicht (`DOT_MAX`, `stageSample()`), leuchten nur so viele Drohnen, wie die Linien
   tragen, der Rest wartet dunkel: Blume ab 190, Unendlich ab 350, Zuckerstange ab 370, Marienkäfer ab 390 Drohnen.
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
node scripts/catalog-2d-sheet.mjs /tmp/b.json 100,200,300,399 --3d=geburtstag   # mit 3D-Vergleichszeile
python3 scripts/catalog-2d-sheet.py /tmp/b.json /tmp/raster.png raster:300           # alle Motive bei 300 als Raster
node scripts/catalog-2d-audit.mjs                                    # Artefakt-Prüfung aller 2D-Motive (Tabelle)
node --test scripts/catalog-resample.test.mjs src/scripts/scenes/catalog-actions.test.mjs
```

`scripts/catalog-2d-audit.mjs` prüft jede Szene so, wie der Konfigurator sie zeigt (Show-Art 2D, Aktionsmotive in ihrem
Endbild), bei 100/200/300/399 Drohnen auf: sichtbare Zahl, Klumpen mit einer neuen Drohne (zwei Katalogpunkte, die
schon im Katalog dicht stehen, bleiben als Anker und zählen getrennt), Lücken und Streupunkte (gewollte Einzelpunkte des
Katalogs ausgenommen), offene Linienenden mit sichtbarem Loch und Drohnen abseits des Katalogbilds. Für Ankermotive prüft
`catalog-resample.test.mjs` zusätzlich: jeder Katalogpunkt exakt erhalten, jeder neue Punkt höchstens 0,15
Punktabstände neben einer Ankerkante, keine Kante über eine gewollte Lücke, genau n Drohnen. Der Handschlag dedupliziert
seine Zielkonturen (`catalog-actions.js`, Runde 9): Die Finger liefen hin und zurück, dort lagen Drohnen doppelt.

Jeden Bogen ansehen: Ist ein Motiv verzerrt, verfüllt oder zerrissen? Gibt es Klumpen an Kreuzungen oder Punkte neben der
Linie? Der Wächter prüft, dass die Linien-Dateien aktuell sind, höchstens n Drohnen auf einer Linie stehen, der Mindestabstand
eingehalten wird, abgeleitete Linien beim Katalogbild bleiben und die Rechenzeit stimmt.

## Bewegung in 2D (Runde 10b, 20.11.2026)

Marc: „Bei den 2D-Animationen, z. B. bei Marketing, wirken Sachen, die sich drehen oder bewegen, einfach nicht so nice. Es
wirkt falsch oder kaputt.“ Alle bewegten 2D-Motive wurden als Frame-Folge angesehen und klassifiziert. Gemeinsame Ursache:
Drehpunkte und bewegte Teile kamen aus groben Schätzungen beim Import (`scripts/import-catalog.mjs groupsFor`) oder es
drehte sich ein ganzes flaches Bild, das dafür nicht taugt.

| Motiv | Vorher | Jetzt |
|---|---|---|
| Drehzahlmesser | Drehpunkt war das Nadelende neben der Nabe: die Nadel eierte um 0,1 Bildbreiten, Schwenk nur 52° | Drehpunkt = Mitte des Nabenrings (`needleHub`, Kreis durch die Nadelpunkte); Nadel dreht wie in 3D (`ease` über 6,5 s) von der Ruhelage bis 12° rechts oben und zurück, Skala steht, Striche leuchten unter der Nadel |
| Zahnräder | das ganze Katalogbild (ein Rad, zwei angeschnittene Räder, die wie ein Kabel aussehen) drehte sich als ein Stück | eigene Form wie die 3D-Fassung: zwei Räder (unter 170 Drohnen) oder drei, Achsabstand = Summe der Teilkreise, Zahn greift in Lücke (`gearPhases`), gegenläufig, Drehzahl ∝ 1/Zähne; jede Drohne fährt starr mit |
| Galaxie | schon im Katalog gestaucht (in ihrer Ebene 2 : 1,3, dazu 25° gekippt); ein Oval, das sich dreht, eiert | rund gezogen (`roundingMap`: kurze Hauptachse auf die Länge der langen, Linien und Katalogpunkte gleich abgebildet), ruhige Drehung in der Bildebene (0,14 rad/s wie 3D) |
| Handschlag | Konturen morphten aus der offenen Katalogpose in den Händedruck | zwei starre Hände (die beiden Konturen des Endbilds), erst getrennt, gleiten über 3,5 s (`smooth5`) ineinander, schütteln zweimal; wo die hintere Hand verdeckt ist, gehen ihre Drohnen aus (`hidden`, höchstens 8 %) |
| Traktor, Golfcaddy, Sportwagen | Radmitte = Schwerpunkt eines angeschnittenen Rings (zu tief), Gruppe nur aus der unteren Bildhälfte: der obere Radbogen stand still, Punkte flogen vom Rad | Radmitte = Kreis durch die Radpunkte (`wheelRing`), zum Rad gehört jede Drohne auf dem Ring (nach Lage) und die Nabe |
| Blume (am Stiel) | drehte sich als Bild um die Mitte, der Stiel kreiste mit | wiegt sich um den Fuß des Stiels (Profil `stem`) |

Unverändert, weil sie sich richtig lesen: Mandala, Sonne, Basketball (rund, drehen sich in der Bildebene), Peace (rund; ob
es sich drehen soll, ist eine offene Frage an Marc), Blüten, Ballons, Palme, Schiff, Glocke, Tor, Fledermäuse, Fahnen,
Gläser, Konfetti, Zwinkern. Das Tor schwenkt seine Flügel räumlich auf (Katalogclip „Tor“), das verkürzt sie bewusst.

Eigene Formen (Zahnräder, Hände, rund gezogene Galaxie) tragen `beat.ownForm`; das Artefakt-Audit misst sie nicht am
Katalogbild („abseits“), prüft aber Zahl, Klumpen und Lücken. `beat.parts` nennt das starre Teil jeder Drohne.

Wächter: `src/scripts/scenes/catalog-2d-motion.test.mjs` über alle 2D-Motive aus `catalog-motifs.json`:
starre Teile statt Morphing (jede Drohne behält zu einem Nachbarn ihren Abstand; Ausnahmen mit Grund: Fahnen, Konfetti,
Sektflasche, Gläser-Funken, Zwinkern), ganze Radringe drehen auf der Stelle, Nadel um die Nabe wie in 3D, Zahnräder ohne
Durchdringung über 12 s und mit richtigem Übersetzungsverhältnis, Handschlag starr/getrennt/ineinander in allen Show-Arten,
was sich als Ganzes dreht, ist rund.

```sh
node --test src/scripts/scenes/catalog-2d-motion.test.mjs src/scripts/scenes/catalog-actions.test.mjs
```
