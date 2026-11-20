# Wahrzeichen und Jahreszahl fürs Stadtfest (Runde 10, 20.11.2026)

## Warum

Marc: „Beim Stadtfest brauchen wir auf jeden Fall noch mehr (oder überhaupt) Wahrzeichen-Motive, wie z. B. Fernsehturm,
Brandenburger Tor, Elbphilharmonie-Silhouette, Kölner Dom, Wuppertaler Schwebebahn, dieser Düsseldorf Tower, Bremer
Stadtmusikanten, Großer Stern, Frankfurter Skyline, Bremer Schlüssel, Berliner Bär, etc. … Solche allgemein bekannten
Motive brauchen wir in jeder Detailstufe, also 100, 150, 200, 250, 300 Drohnen und 2D vs 3D vs 3D+. Und auch so Sachen wie
30 Jahre, 125 Jahre … Ansonsten wirken die Motive beim Stadtfest aktuell einfach zu random, insbesondere bei 100 Drohnen.“

## Machbarkeit und Priorität

Bewertet nach: Ist die Silhouette bei 100 Drohnen als Linienzeichnung (ohne Füllfläche) eindeutig? Trägt ein Körper in 3D
etwas bei? Gibt es eine Bewegung, die das Wahrzeichen selbst hat (für 3D+)?

| Wahrzeichen | 2D bei 100 | 2D 150–300 | 3D | 3D+ | Priorität | Stand |
|---|---|---|---|---|---|---|
| Berliner Fernsehturm | sehr gut (Kugel auf dem Schaft) | gut, Turmkorb, Fensterband, Fußbau | Rotationskörper | Kugel dreht sich, Warnlicht | 1 | gebaut |
| Kölner Dom | sehr gut (zwei Helme) | gut, Portal, Fenster, Kreuzblumen | Fassade vorn und hinten, Helme als Pyramiden | achteckige Helme mit Kranz, Licht steigt in Wellen | 1 | gebaut |
| Brandenburger Tor | gut (sechs Säulen, Attikastufe, Quadriga als Umriss) | gut, Gebälk, vier Pferdeköpfe, Kranz | Säulenhalle als Körper | zweite Säulenreihe, Durchgänge, Licht fährt hindurch | 1 | gebaut |
| Elbphilharmonie | gut (Wellenkrone mit Spitzen auf dem Sockel) | gut, Fensterbänder im Backstein | Glasbau mit Graten, Sockel | alle Grate, die Elbe davor, Licht wogt | 1 | gebaut |
| Rheinturm Düsseldorf | gut (Kanzel mit Glaskegel) | gut, Lichtzeituhr auf dem Schaft | Rotationskörper | die Lichtzeituhr zählt die Sekunden | 2 | gebaut |
| Wuppertaler Schwebebahn | mittel (Träger, Böcke, hängender Wagen) | gut, Pfosten, Fenster | Wagen als Röhre unter dem Träger | der Wagen fährt ein und hält | 2 | gebaut |
| Jahreszahl („125 Jahre“) | sehr gut (nur die Zahl) | gut, JAHRE darunter | Lichtkranz kreist | Licht schreibt die Zahl, zwei Kränze | 1 | gebaut |
| Frankfurter Skyline | zerfasert, darum erst ab 150 | gut: eine Silhouette mit Messeturm-Pyramide, Westend-Krone, Commerzbank mit Antenne, Main Tower, Trianon | Silhouette vorn, Dächer in die Tiefe (gestaffelte Einzelquader waren Punktsalat) | Pyramide als Körper, runder Main Tower, Licht steigt Etage für Etage | 2 | gebaut, ab 150 |
| Siegessäule (Großer Stern) | Viktoria bei 100 ein Goldklumpen, darum erst ab 150 (am Bogen ab 150 lesbar, eine Stufe früher als zuerst geschätzt) | gut, Sockel mit Pfeilern, drei Goldringe | Säule als Rotationskörper auf Sockelquadern | Licht steigt bis zur Viktoria | 2 | gebaut, ab 150 |
| Berliner Bär | schwach bei 100 (Umriss mit vielen Ecken), ab 200 gut | gut | wenig Gewinn (Tier mit Gliedern = 3D+) | läuft | 3 | offen |
| Bremer Schlüssel | gut: Bart als Rautenraster, Reide mit vier Kreisen (Marc: der Logo-Modus schafft ihn mit 214 Drohnen) | Haken ab 200, Mäander ab 280, Ornament | dreht sich um den Schaft wie im Schloss | weiter gedreht, Licht zeichnet ihn | 2 | gebaut, ab 100 |
| Bremer Stadtmusikanten | nicht bei 100 (vier gestapelte Tiere), ab 250 als Umriss | mittel | vier Tiere = 3D+, viel Aufwand | Tiere bewegen sich | 4 | offen |

Gebaut sind neun Wahrzeichen und die Jahreszahl: acht Motive ab 100 Drohnen, Frankfurter Skyline und Siegessäule ab 150
(Marc 20.11.: „Ja“). Der Bremer Schlüssel ist eine eigene Linienzeichnung nach dem Wappenbild (Kopie zum Abgleich:
`docs/katalog-wahrzeichen/bremen-key-mark.svg`, Wikimedia Commons, gemeinfrei), nicht die Abtastung des Logo-Modus: Die legte
bei 214 Drohnen Punkte doppelt, wo Konturen des SVG eng nebeneinanderlaufen. Offen: Berliner Bär und Stadtmusikanten (Tiere,
erst ab 200 bzw. 250 sinnvoll).

## Code

- `src/scripts/scenes/wahrzeichen.js`: Zeichnungen (je Wahrzeichen eine Funktion mit Detailstufe 0/1/2), 2D-Abtastung,
  Szenen aller Fassungen (`<key>2d`, `<key>3d`, `<key>Plus`) und die Jahreszahl (`jahre2d/3d/Plus`). Registriert in
  `scenes/index.js`.
- `src/scripts/scenes/catalog-3d/wahrzeichen.js`: die Körper (Baukasten `kit.js`: `revolve`, `ellipsoid`, `tube`,
  `curves`, `assemble`), Lichtzeituhr.
- `src/content/show-configurator.js`: zehn Motive im Stadtfest (IDs `fernsehturm`, `brandenburgertor`, `koelnerdom`,
  `elbphilharmonie`, `rheinturm`, `schwebebahn`, `jahreszahl`, `bremerschluessel`, `frankfurtskyline`, `siegessaeule`), Stufe je Motiv in `catalog-3d/stufen.js` (`STUFE_EIGEN`).

## Methode

1. **Maße an der echten Silhouette.** Fernsehturm, Rheinturm, Kölner Dom und Elbphilharmonie sind an Referenzansichten
   auf Wikimedia Commons vermessen (nur zum Abgleich, nichts im Repo). Brandenburger Tor (keine Frontansicht abrufbar)
   und Schwebebahn sind nach bekannten Maßen bzw. einem Foto gezeichnet, nicht vermessen. Abweichungen sind gewollt und im
   Code benannt: Fernsehturm-Kugel r 0,13 statt 0,107, Schaft etwas breiter (sonst stehen die beiden Schaftlinien enger
   als ein Drohnenabstand); Tor-Säulen gestaucht; die Elbphilharmonie in der Ansicht von der Elbe auf die Westspitze (die
   fünfzackige Wellenkrone ist das Erkennungszeichen, die Seitenansicht ohne sie war bei 100 Drohnen zerklüftet).
2. **Detailstufe je Drohnenzahl** (`level()`): 0 bis 149, 1 bis 249, 2 ab 250 (der Schlüssel hat eigene Schwellen in
   `LEVELS`: Raster bis 199, Haken bis 279, Mäander ab 280). Bei 100 Drohnen hat die Zeichnung nur so
   viele Ecken, wie die Linien tragen; jede Ecke bekommt eine Drohne, und zu viele Ecken ließen die Linien dazwischen dünn
   werden. Mehr Drohnen bringen mehr Linien (Fenster, Portal, Pfosten), nicht nur dichtere.
3. **Abtastung wie die 2D-Katalogmotive** (`lineSample()`/`stageSample()` aus `catalog-resample.js`): Ecken, Linienenden
   und Kreuzungen genau eine Drohne, dazwischen gleiche Abstände, kein Paar enger als `CLEAR`, genau n Drohnen. Tragen die
   Linien nicht alle Drohnen, ohne dass die Lichter verschmelzen (Fernsehturm bei 350: 317), warten die übrigen offstage.
   Keine Füllflächen, keine Punkte neben der Linie. Spitze Winkel vermeiden: Das Fachwerk der Schwebebahn hat Pfosten statt
   Diagonalen (an den Diagonalen standen Drohnen eng).
4. **3D schlicht, 3D+ aufwendiger.** 3D: wenige Grundkörper, der Körper schwenkt (Türme frontal, Tor und Dom aus 0,3 rad,
   Elbphilharmonie und Schwebebahn aus 0,5 rad), Licht läuft. 3D+: zwei Akte wie die Katalogkörper (Licht zeichnet den
   Körper, dann seine eigene Bewegung) mit mehr Teilen. Bis 480 Drohnen tragen alle den Körper, darüber warten die übrigen
   offstage (wie `LIT_MAX`).
5. **Jahreszahl** in FlyingStars' Schrift über `textFormationAsync()` (dieselbe wie Wappen, Pokal, Medaille, eigener Text).
   Der Wert kommt aus der Fassung (`version.value`), sonst `JAHRE_STANDARD` = 125. JAHRE steht erst ab 150 Drohnen
   darunter, bei 100 trügen die Buchstaben nichts Lesbares.

## Prüfen

```sh
node --test scripts/wahrzeichen.test.mjs                 # Wächter (10 Tests, ~3 s)
node scripts/wahrzeichen-sheet.mjs /tmp/w.json "2d:100,2d:150,2d:200,2d:250,2d:300"
node scripts/wahrzeichen-sheet.mjs /tmp/w3.json "3d:200,3d:300@5,plus:300@0,plus:300@7,plus:600@9"
python3 scripts/wahrzeichen-sheet.py /tmp/w.json /tmp/w.png 250   # braucht numpy + Pillow
```

Spalten: `<art>:<Drohnen>[@<Zeit>[@<Blickwinkel>]]`, Art `2d`, `3d` oder `plus`. Der Wächter prüft: jede Fassung bei jeder
einstellbaren Drohnenzahl genau n (sichtbar + offstage); 2D ohne Klumpen (CLEAR), ohne Streupunkte, mindestens 90 % der
Drohnen im gleichmäßigen Abstand; mehr Linien je Detailstufe; 3D ohne Klumpen (0,4 × Median) und ohne Streupunkte;
Tempo und Beschleunigung unter den Drohnengrenzen und kein Sprung bei t = 0; Aufbau < 25 ms; Lichtzeituhr; Jahreszahl;
Einbindung ins Stadtfest (2D ab 100, 3D ab 200, 3D+ ab 300, Stufe 3D).

## Offene Punkte

- Jahreszahl: fest 125 (Marc 20.11.: „einfach hardcoden, passt schon so“); die Szenen lesen trotzdem `version.value`.
- Berliner Bär, Bremer Stadtmusikanten: siehe Tabelle.
- 3D-Schwächen, die Marc erst selbst sehen will (nicht geändert): Tor dicht, kurze helle Tiefenkanten an den Kronenenden der
  Elbphilharmonie und an den Dachecken der Skyline, der Lichtkranz der Jahreszahl läuft vor den Ziffern durch.
- Das ältere Jubiläums-Motiv `wahrzeichen` (Fernsehturm aus `show-shapes.js`) bleibt unverändert; es könnte auf die neuen
  Szenen umgestellt werden.

## Runde 10b: Fernsehturm und Rheinturm (Marc: „noch nicht besonders nice/erkennbar“)

- **Fernsehturm, Mischung aus altem und neuem.** Vom älteren Jubiläums-Turm (`tower` in `show-shapes.js`): die große Kugel
  und der kompakte Umriss, daran erkennt man ihn sofort. Von der vermessenen Fassung: Turmkorb, Fußbau, goldenes Fensterband,
  feine Antenne mit Querstreben. Kugel r 0,19 auf 2,18 Höhe (echt 0,107 auf 2,3, alt 0,225 auf 2,2), Kugelmitte bei 58 % der
  Höhe. **Funkwellen** (`FT_WAVES`, `waveArcs()`, `waveLight()`): links und rechts der Kugel kurze Bögen (±24°), bei 100
  Drohnen einer je Seite, ab 150 zwei, ab 250 drei; ein Lichtpuls läuft nach außen und verblasst, keine Bewegung, keine
  Ringe. In 3D liegen sie in der Bildebene und schwenken nicht mit.
- **Jubiläum:** Das Motiv `wahrzeichen` spielt jetzt `fernsehturm2d/3d/Plus` (Wächter in `wahrzeichen.test.mjs`). Die alten
  Szenen `tower`/`tower3d`/`towerStory` bleiben nur für die Show-Folge der Startseite (`himmel/folge.js`).
- **Rheinturm, neu vermessen.** Der Schaft stimmte (halbe Breite unten 0,099, oben 0,07). Es fehlte die Kanzel: Glasschale
  (bis 0,171), darüber zwei flache Teller (0,148 und 0,127) mit Einzügen, darauf die lange Antenne. Die Kanzel ist als
  Erkennungszeichen um 1,3 vergrößert (`POD_SCALE`), ihre Maße untereinander bleiben vermessen; bis 249 Drohnen die schlichte
  Kanzel mit sieben Ecken je Seite, ab 250 die volle mit Telleroberseiten. Lichtzeituhr als Punktreihe: leuchtende Ziffern
  hell, übrige kaum, Trenner dunkel; Start 23:58:47, damit die Reihe gut gefüllt ist (um 20:15 leuchteten nur wenige Punkte).
