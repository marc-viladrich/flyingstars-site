# Vierzehnte Fassung, Teil B: Motive und ihre Bewegung (30.10.2026)

Grundlage ist Marcs Rückmeldung vom 30.10.2026 abends. Bedienung und Engine hat parallel Worker A überarbeitet, das steht in `docs/show-konfigurator.md`. Dieser Teil behandelt die Motive.

## 1. Keine Finten mehr

Marc: „mega kacke … bitte überall raus“. Eine Finte ist eine Bewegung, die erst ausholt (Anlauf, Gegenbewegung) oder über ihr Ziel hinausschießt und dann zurückkommt.

### Der Wächter `scripts/show-finte.test.mjs`

Der Test braucht keinen Browser. `scripts/show-sim.mjs` spielt mit der echten Engine `show-field.js` in Node jede Show einmal ganz ab. Canvas, `matchMedia` und `requestAnimationFrame` sind dabei Attrappen. Geprüft werden alle Anlässe × Pakete an den Bereichsgrenzen (100/190, 200/290, 300/600), in drei Teilen:

1. **Flug:** Für jeden Bildwechsel und jede Drohne wird die Bahn bis zur Ankunft gegen die Netto-Verschiebung gemessen. Eine Finte liegt vor, wenn die Drohne mehr als 0,03 Anzeigeeinheiten und mehr als 12 % der Strecke rückwärts fliegt oder über ihr Ziel hinaus. Drohnen in der lebendigen Wolke sind ausgenommen, weil ihre gekrümmte Bahn gewollt ist. Ihr Rückwärtsanteil wird aber gemeldet (`FINTE_REPORT=1 FINTE_CLOUD=1`).
2. **Eigenbewegung:** Zuerst wird die gemeinsame Bewegung eines Teils abgezogen (robuste affine Abbildung: Drehen, Gleiten, Kippen). Übrig bleibt, was sich innerhalb des Teils bewegt, etwa ein Bein, ein Flügel oder ein Rocksaum. Darin wird nach einem kurzen Gegenlauf vor oder nach einem langen gesucht. Gleichmäßiges Pendeln und Kreisen zählt nicht. Ein Ausholen aus dem Stand zählt immer.
3. **Teile:** Der Schwerpunkt jedes benannten Teils innerhalb eines Bildes wird gemessen. Damit ein Kreis als Kreisen zählt, wird die Bahn 8 s davor und danach mitgelesen.

Ausgenommen ist das Schreiben der Feder im Buch (`writes: ["quill"]`), denn das Hin und Her der Zeilen ist hier der Inhalt. Auf dem Stand vor dieser Runde findet der Wächter 168 Treffer, jetzt 0. Darunter sind alle von Marc genannten Stellen außer dem QR-Übergang, der in einer Wolke lag (siehe unten). Aufruf mit Liste: `FINTE_REPORT=1 node --test scripts/show-finte.test.mjs`. Laufzeit etwa 30 s.

### Ursachen und Behebung

| Ursache | betroffen | Behebung |
|---|---|---|
| **Strömung mit Sockel.** `along()` gab jeder Drohne eine Seitwärtsbewegung von mindestens 0,04 × Strömungsfeld, auch bei Strecke 0. Drohnen, die stehen bleiben sollten, wackelten bei jedem Bildwechsel bis 0,07 hinaus und zurück; kurze Wege liefen erst rückwärts. | Weihnachtsbaum, Feuerwerk (ODYSSEY), Reise (Stadt legt sich flach, Karte, Route), Buch, Masken, Delfin, Pfeil | `src/scripts/show-flight.js`, `along()`: Die Strömung wirkt nur quer zur Flugrichtung und wächst ohne Sockel mit der Strecke im Bild (x, y) |
| **Schwung in den nächsten Flug.** Ein Flügelschlag, ein Sprung oder eine Drehung lief bis zum Bildwechsel weiter. Die Engine übernimmt die Geschwindigkeit (physikalisch richtig), also flog die Drohne erst weiter und dann zurück. | Drache nach dem Delfin (bis 0,5 rückwärts), Pokal nach dem Kopfsprung, Turm nach dem Schuss, Delfin nach dem Kolibri, Torus, Tänzerin | `steadyClock()` in `show-motion.js`, eingesetzt in `buildSequence` (`steady()` in `show-scenes.js`). Jedes Bild, das sich bewegt, steht im Anflug, läuft sanft an und kommt vor dem Wechsel zum Stehen. Die geplante Handlung bleibt gleich lang, das Bild steht dafür 0,9 s länger. |
| **Ausholen im Motiv** | Fußball: Bein zog nach hinten; Ball kehrte in einer Schleife zurück | `KICK`, `lob` in `scenes/jubilaeum.js` |
| | Raketenstart: Die Spur schoss erst nach unten und zog dann mit der Rakete hoch | `plumeAt` in `rocketStory` (`show-scenes.js`): Die Spur spannt sich zwischen Düse und Rampe und bewegt sich nur nach oben |
| | Mondlandung: Die Flaggen-Drohnen sanken mit der Flamme und stiegen wieder | warten dunkel an ihrem Platz |
| | Reise: Die Kompassnadel schwang über Norden hinaus und zurück und drehte am Periodenende wieder weg | `needleAngle` in `scenes/festival.js`: dreht in eine Richtung auf Norden |
| | Reise: Die Route sank vor dem letzten Pin ab | `PINS` steigen stetig |
| | Drache: Der Kreis endete mit einem Ausflug nach rechts, die Landung lag links | Kreis endet links (`A1`, `S3`) |
| | Kolibri: Der Anflug tauchte unter die Blüte | Kontrollpunkt von `IN` |
| | Delfin: Das Bild endete mitten im Fallen | Sprung endet im höchsten Punkt |
| | Musik: Noten stiegen über ihr Ziel und fielen zurück | Bogen nur bis zur Zielhöhe, jede Note eigenes Teil |
| | Herz (ODYSSEY): Der Pfeil flog hindurch und hinaus, seine Drohnen kamen als Funkenring zurück | Pfeil bleibt im Herz stecken |
| | Feder: hob vor jeder Zeile kurz an | gleitet zurück |
| | Antrag: Der Ring holte nach links unten aus | flacher Bogen |
| **Wolke beim QR-Code.** Der Teil-Umbau „Nachrichten werden zum Code“ lief durch die Wolke. Dabei flogen 24 % der Drohnen über ihren zufälligen Mittelpunkt erst zurück. | QR-Code (ODYSSEY) | Wolke für diesen Umbau entfernt (`scenes/launch.js`) |

**Offen (Engine, Worker A):** Auch in allen anderen Wolken fliegen 5 bis 20 % der Drohnen erst ein Stück zurück. Der Mittelpunkt der Bézier-Bahn wird in `show-field.js` (`startBeat`) zufällig in alle Richtungen versetzt. Vorschlag: den Anteil des Versatzes entlang der Flugrichtung auf [0, Strecke] begrenzen. Die Wolke bleibt dann gekrümmt, nur die Rückwärtsbewegung verschwindet.

## 2. Teile leben

`drift()` in `show-motion.js` lässt jede Drohne in eigenem, langsamem Takt (9–16 s) um ihren Platz treiben. Weil die Bewegung keine Richtung hat, entsteht keine Finte. Eingesetzt bei den Sternen von Rakete (Startklar), Orbit und Planet, beim Sternenhimmel im Buch, bei den Sternen um das Ringkästchen und beim Sternenhimmel im Fußball.

## 3. Grazile Hand (Antrag)

`HAND_OUTLINE`, `HAND_LINES` und `ringFingerAt` in `scenes/hochzeit.js`. Die Hand ist eine eigene Linienzeichnung: eine rechte Hand, Handrücken vorn, die Finger liegen aneinander und hängen locker. Statt Lücken zwischen den Fingern trennt sie je eine feine Linie. Der Daumen liegt schmal unter dem Zeigefinger, am Handgelenk sitzt ein Armband. Angeregt ist die Zeichnung von FlyingStars' Händen (Hugenpoet, „Heimlich“, ausgewertet in `anker-runde-2/codex-hand-ring.md`) und von den Handmotiven der Referenzbibliothek (FSR-002, FSR-021). Übernommen ist kein Pfad: Die Bibliothek ist „reference-only“, und ihre Bedingungen untersagen, Modelle aus den Vorschauen nachzubauen. Kontaktbögen vorher/nachher liegen in `/tmp/fs-konfig-r4b/` (nicht im Repo).

## 4. ODYSSEY sichtbar hochwertiger

Vorbild ist der Kolibri: SPARK 2D, HORIZON 3D, ODYSSEY 3D mit Geschichte drumherum.

- **Herz:** Die Geschichte spielt durchgehend mit FlyingStars' 3D-Herz. Vorher begann sie mit einem 2D-Umriss. Amors Pfeil bleibt stecken, dann umkreisen sich zwei 3D-Herzen mit einer Lichtbahn.
- **Schmetterling:** Ein großer 3D-Falter mit 60 % der Drohnen, so detailreich wie in HORIZON. Vorher waren es zwei kleine Falter mit je 40 %. Er fliegt zu einer Lotusblüte, landet und öffnet und schließt langsam die Flügel, über die der Schein wandert. Aus der Blüte wird dann das 3D-Herz.
- **Ringe:** In ODYSSEY verschlingen sich zwei Eheringe als 3D-Körper und werden zum Solitär. Die große Geschichte mit Kästchen und Hand heißt jetzt **Antrag** und ist ein eigenes Motiv ab 450 Drohnen.

## 5. Der wandernde Schein

`wander()` in `show-motion.js` ist eine Glocke ohne Kante mit langem Schweif. Sie hellt nur auf und folgt der Linienreihenfolge `lightRank()`. Neu bei SPARK: Herz und Sektgläser. In ODYSSEY bei den Eheringen, beim Herz und beim Falter. Die Stärke liegt bei 0,35–0,45, ähnlich wie der Lichtlauf der dreizehnten Fassung.

## 6. Eigener Text

`reveal()` und `textLight()` in `scenes/text.js`. Alle Drohnen stehen zunächst dunkel. Dann leuchten sie nacheinander in Schreibreihenfolge auf (`lightRank()` = `lightOrder()` aus `formation/`), danach wandert ein sanfter Schein. `trace()` hat jetzt einen weichen Kopf ohne harte Kante. Die Haltezeit nach dem Schreiben beträgt 3,2 s statt 9 s, für A's Text-Durchlauf. Im ODYSSEY-Text trägt das Bild „…werden zu euren Initialen“ `tour: false`.

## 7. Freischaltung und Inventar

Siehe `docs/show-motive-inventar.md`. Dort steht die Tabelle für FlyingStars mit allen Motiven je Anlass × Paket. Neue Motive, die es nur in ODYSSEY gibt:

- **Lotusblüten, Kopfsprung, Drache:** Ihre HORIZON-Fassungen spielen nicht mehr.
- **Mondlandung, Bokkenrijders, Sektkorken:** Sie sind aus den Schlussakten von Rakete, Masken und Uhr herausgelöst (`slice` in `buildBeats`).
- **Antrag:** ab 450 Drohnen.

`minDrones` steht am Motiv und an seiner ODYSSEY-Fassung. `buildSequence` und `playable()` lesen es am Motiv, A's `minDronesOf()` an der Fassung. `UNLOCK = [300, 450]`.

## 8. Weitere Folgen der Engine-Änderungen von A

- Der Rücksprung zum Anfang läuft immer durch die Wolke. Deshalb gibt es keine Figur mehr vor dem Neustart (`transitions()`), und das erste Bild zählt in `planClouds()` als Wolke.
- Damit keine zwei Wolken direkt hintereinander kommen, darf eine Geschichte nicht mit einer Wolke enden. Beim Pokal entfällt deshalb die Wolke für Zahl und Konfetti. Die Reihenfolge der Motive ist umgestellt:
  - Hochzeit: Ringe, Herz, Lotus, Schmetterling, Gläser, Antrag
  - Jubiläum: Pokal vor Kopfsprung
  - Launch: Rakete, Mondlandung, Logo, Glühbirne, QR-Code, Spirale
  - Silvester: Uhr, Sektkorken, Lichterbaum, Feuerwerk, Kleeblatt

## Wie prüfen

- `node --test scripts/show-finte.test.mjs scripts/show-clouds.test.mjs scripts/show-counts.test.mjs scripts/show-geometry.test.mjs scripts/show-flight.test.mjs`
- `tests/show-physics.spec.ts` (Browser)
- Ansehen: `?anlass=hochzeit&paket=ODYSSEY&drohnen=450&motiv=antrag` für die Hand, `?anlass=hochzeit&paket=ODYSSEY&motiv=falter` für den Falter.
