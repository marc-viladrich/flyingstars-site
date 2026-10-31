# Motiv-Inventar des Show-Konfigurators (zur Prüfung durch FlyingStars)

Stand: 30.10.2026, vierzehnte Fassung. Diese Tabelle listet jedes Motiv des Konfigurators in jedem Paket. Sie geht an FlyingStars mit einer Bitte: Tragt in der Spalte „Machbar?“ ein, ob ihr das Motiv so fliegen könnt und ab wie vielen Drohnen es am Himmel gut lesbar ist. Die Vorschau im Konfigurator ist ein Verkaufsbild und kein Flugplan.

## So ist die Tabelle zu lesen

- **Drohnen für gute Lesbarkeit:** unsere Schätzung, ab welcher Zahl das Motiv am Himmel klar zu erkennen ist. Die Schätzung beruht auf der Vorschau, auf Vergleichen mit euren Shows (Hugenpoet, Eisenhüttenstadt, Frühlingsnacht) und auf der Referenzbibliothek.
- **Teile:** benannte Teile, die im Ablauf ihre Drohnen behalten, etwa Rakete, Spur, Welt und Sterne. Bei einem einzelnen Bild steht hier 1.
- **3D:** Tiefe im Verhältnis zur Breite. „flach“ heißt unter 0,05. „leicht“ heißt bis 0,3, etwa ein gekipptes Bild. „Körper“ heißt darüber, etwa ein Gitterkörper, der sich dreht.
- **Bewegung:** was sich bewegt. Effekte aus Licht stehen extra.
- **Akte / Dauer:** Bilder einer Geschichte und ungefähre Dauer in der Vorschau. Die Vorschau läuft etwa dreimal so schnell wie eine echte Show.
- **Stufe:**
  1. **Bild:** eine Linienzeichnung in einer Ebene. Bewegt wird nur Licht oder ein kleines Stück, etwa Wiegen, Drehen oder Zeiger.
  2. **Körper:** ein 3D-Körper oder eine Figur mit Gelenken, die sich selbst bewegt. Ein Bild.
  3. **Geschichte:** mehrere Akte. Benannte Teile wandern von Bild zu Bild, im selben Bildausschnitt.
  4. **Große Geschichte:** viele Teile (vier oder mehr), mehrere Bildausschnitte oder eine sehr große Formation.
- **Ab (Konfigurator):** ab dieser Drohnenzahl spielt die Vorschau das Motiv. Das ist ein Platzhalter, bis ihr die Tabelle geprüft habt.

## Freischaltung (vorläufig, Platzhalter)

Wir arbeiten mit zwei Schwellen (`UNLOCK` in `src/content/show-configurator.js`, Feld `minDrones` am Motiv):

- **300, der Einstieg in ODYSSEY:** Diese Motive gibt es nur als erzählte Geschichte. Beim Wechsel von HORIZON zu ODYSSEY kommen sie in jedem Anlass dazu (Lotusblüten, Kopfsprung, Mondlandung, Bokkenrijders, Sektkorken, Drache).
- **450, die großen Geschichten:** Sie haben drei Bildausschnitte, mehrere Teile und eine Hand als Linienzeichnung. Bisher liegt nur der Antrag hier.

Dafür gelten drei Regeln, die der Test `scripts/show-clouds.test.mjs` prüft:
- ODYSSEY zeigt bei jeder Drohnenzahl jedes Motiv, das HORIZON zeigt. Jedes davon läuft als Geschichte.
- Bei 300 Drohnen zeigt ODYSSEY mehr Motive als HORIZON.
- Was SPARK spielt, spielt auch HORIZON.

Geändert gegenüber der dreizehnten Fassung: Dort lagen Ring, Fußball, Rakete, Masken, Uhr und Reise bei 450 und QR-Code, Kopfsprung, Lotus und Musik bei 520. Dadurch zeigte ODYSSEY mit 300 Drohnen weniger Motive als HORIZON. QR-Code und Kopfsprung sind dabei nicht komplex (Marc). Lotusblüten, Kopfsprung und Drache gibt es jetzt nur noch in ODYSSEY. Ihre HORIZON-Fassungen spielen nicht mehr, der Code dafür liegt aber noch in `scenes/`.

## Hochzeit

| Motiv | Paket | Fassung in der Vorschau | Drohnen für gute Lesbarkeit | Teile | 3D | Bewegung | Akte / Dauer | Stufe | Ab (Konfigurator) | Machbar? (FlyingStars bestätigt) | Frage an FlyingStars |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Ringe | SPARK | Zwei Eheringe mit Innen- und Außenkontur, Stein funkelt | 100 | 1 | flach | Licht läuft um die Reifen | 1 / 5 s | 1 – Bild, euer Standard-Motiv | 100 | | Stimmt die Stein-Gruppe mit etwa 12 Drohnen? |
| Ringe | HORIZON | Solitär: Torus-Band und Brillant, dreht sich | 180–200 | 1 | Körper | Drehung, Funkeln im Stein | 1 / 6 s | 2 – Körper | 200 | | Ist ein Brillantschliff mit etwa 50 Drohnen lesbar? |
| Ringe | ODYSSEY | Zwei Eheringe verschlingen sich in 3D, dann ein Solitär | 260–300 | 2 | Körper | Drehung, wandernder Schein | 2 / 14 s | 3 – Geschichte | 300 | | Zwei verschlungene Tori: lesbar oder zu dicht? |
| Herz | SPARK | Herz-Umriss, ein Schein wandert über die Linie | 60–100 | 1 | flach | Wiegen, Licht | 1 / 6 s | 1 – Bild | 100 | | – |
| Herz | HORIZON | Tunnel aus fünf Herzen in die Tiefe | 200 | 1 | Körper | Licht fließt nach hinten, leichtes Pendeln | 1 / 6 s | 2 – Körper | 200 | | Herztunnel in der Tiefe: Wie groß muss der Abstand der Ebenen sein? |
| Herz | ODYSSEY | Euer 3D-Herz, Amors Pfeil bleibt darin stecken, zwei Herzen umkreisen sich mit einer Lichtbahn | 290–300 | 2 | Körper | Pfeil fliegt als ein Stück, Kreisen | 3 / 16 s | 3 – Geschichte | 300 | | Fliegt ein starrer Pfeil in ein 3D-Herz hinein, ohne dass sich Bahnen kreuzen? |
| Lotusblüten | ODYSSEY | Zwei Knospen blühen auf, drehen sich ineinander, verdrillte Kugel mit goldenem Herz | 300+ | 3 | Körper | Aufblühen, Drehen, Kugel aus Bändern | 4 / 22 s | 3 – Geschichte, volumetrisch | 300 | | Die Kugel aus sechs verdrillten Bändern: ab welcher Zahl lesbar? |
| Schmetterling | SPARK | Linienfalter, feiner Schein wandert über die Flügel | 100 | 1 | flach | Licht, kaum sichtbarer Flügelschlag | 1 / 6 s | 1 – Bild | 100 | | – |
| Schmetterling | HORIZON | Falter in 3D, Dreiviertelprofil, Flügelschlag | 200 | 1 | Körper | Flügelschlag ±0,3 rad | 1 / 6 s | 2 – Körper | 200 | | Flügelschlag in 2,6 s: realistisch? |
| Schmetterling | ODYSSEY | Großer 3D-Falter fliegt zu einer Lotusblüte, landet, öffnet und schließt die Flügel; aus der Blüte wird euer 3D-Herz | 300 | 2 | Körper | Flug auf einer Bahn, Flügel, Teil-Umbau | 3 / 20 s | 3 – Geschichte | 300 | | Landung auf der Blüte: Wie nah dürfen sich zwei Formationen kommen? |
| Sektgläser | SPARK | Zwei Gläser stoßen an, ein Schein wandert über das Glas | 100 | 1 | flach | Anstoßen, Licht | 1 / 6 s | 1 – Bild | 100 | | – |
| Sektgläser | HORIZON | Gläser in 3D, Perlen steigen als Licht | 200 | 1 | leicht | Anstoßen, Licht | 1 / 6 s | 2 – Körper | 200 | | – |
| Sektgläser | ODYSSEY | Gläser stoßen an, die Perlen steigen als Herz auf | 300 | 3 | leicht | Gläser als ein Stück, Perlen werden Herz | 3 / 14 s | 3 – Geschichte | 300 | | – |
| Antrag | ODYSSEY | Ringkästchen öffnet sich, der Ring fliegt zur Hand und gleitet auf den Ringfinger, Herz. Die Hand ist eure eigene aus der Antrags-Show (Foto von Marc, 30.10.2026: Hand mit Armband, Ring am Finger, daneben eine kleine Ringformation), Punkt für Punkt aus dem Foto gelesen | 450 | 3 | leicht bis Körper | Deckel um ein Scharnier, Ring als starres Teil, Hand aus der Wolke | 4 / 29 s | 4 – Große Geschichte, drei Bildausschnitte | 450 | | Im Foto stehen etwa 210 Lichter (Hand rund 120, Armband 46, Ring 3, Ringformation 42); wir verteilen die Linien der Hand auf die verfügbaren Drohnen neu (bei 450 rund 300). Wie viele Drohnen hatte eure Formation, und dürfen wir sie so zeigen? Fliegt ein Ring auf einen Finger, ohne Kontur zu schneiden? |

## Jubiläum

| Motiv | Paket | Fassung in der Vorschau | Drohnen für gute Lesbarkeit | Teile | 3D | Bewegung | Akte / Dauer | Stufe | Ab (Konfigurator) | Machbar? (FlyingStars bestätigt) | Frage an FlyingStars |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Wappen | SPARK | Eigenes Vereinswappen mit Fluss, Fahne, Stern | 100–150 | 1 | flach | Fahne weht | 1 / 6 s | 1 – Bild | 100 | | – |
| Wappen | HORIZON | 3D-Wappen mit Zahl | 200 | 1 | leicht | Fahne weht in der Tiefe | 1 / 6 s | 2 – Körper | 200 | | – |
| Wappen | ODYSSEY | Aus dem Stern wird die Zahl, Krone und Sternenkranz | 300 | 4 | leicht | Kranz kreist | 3 / 15 s | 3 – Geschichte | 300 | | – |
| Fußball | SPARK | Spieler in Schusspose, Muster im Ball dreht sich | 100 | 1 | flach | Ball dreht sich | 1 / 6 s | 1 – Bild | 100 | | – |
| Fußball | HORIZON | Gelenkfigur schießt (ohne Ausholen), Ball fliegt im Bogen nach vorn | 200 | 2 | flach | Bein als Gelenk, Ball als ein Stück | 1 / 9 s | 2 – Figur mit Gelenken | 200 | | Ein Bein, das sich als Gelenk bewegt: fliegt ihr so etwas? |
| Fußball | ODYSSEY | Spieler schießt ins Tor, Lichtspur, Tor!, Ball wird zur Zahl | 300 | 5 | leicht (Netz) | Schuss, Ball fliegt, Netz glüht | 4 / 24 s | 3 – Geschichte | 300 | | – |
| Wahrzeichen | SPARK | Berliner Fernsehturm, Warnlicht | 100 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | Für Kunden: jedes Wahrzeichen als eigene Zeichnung? |
| Wahrzeichen | HORIZON | Fernsehturm in 3D, Licht um die Kugel | 200 | 1 | Körper | Drehung | 1 / 6 s | 2 – Körper | 200 | | – |
| Wahrzeichen | ODYSSEY | Turm sendet, wird zum Brandenburger Tor | 300 | 1 | leicht | Wellen aus Licht | 3 / 18 s | 3 – Geschichte | 300 | | – |
| Pokal | SPARK | Pokal, Sterne funkeln | 100 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | – |
| Pokal | HORIZON | Pokal in 3D, Licht gleitet | 200 | 1 | Körper | Drehung | 1 / 6 s | 2 – Körper | 200 | | – |
| Pokal | ODYSSEY | Sockel, der Pokal wächst, die Zahl steigt heraus, Konfetti | 300 | 3 | Körper | Wachsen, Zahl fliegt | 3 / 15 s | 3 – Geschichte | 300 | | – |
| Kopfsprung | ODYSSEY | Sprungbrett, Absprung, Eintauchen, Ringe, Medaille mit Zahl | 250–300 | 3 | leicht | Gelenkfigur, Brett federt, Ringe | 5 / 31 s | 3 – Geschichte (einfache Formen, viele Akte) | 300 | | Bei SPARK wurde der Springer zum Strich. Ab wie vielen Drohnen ist ein Springer im Bogen lesbar? |

## Launch

| Motiv | Paket | Fassung in der Vorschau | Drohnen für gute Lesbarkeit | Teile | 3D | Bewegung | Akte / Dauer | Stufe | Ab (Konfigurator) | Machbar? (FlyingStars bestätigt) | Frage an FlyingStars |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Rakete | SPARK | Rakete mit flackernder Flamme | 100 | 1 | flach | Flamme aus Licht | 1 / 6 s | 1 – Bild | 100 | | – |
| Rakete | HORIZON | Rakete als Körper (Silhouette in zwei Ebenen, Reifen, Finnen) | 200 | 1 | Körper | Schweben, Drehen | 1 / 6 s | 2 – Körper | 200 | | – |
| Rakete | ODYSSEY | Startklar auf der Rampe, Zündung (Rampe fällt weg, Spur wächst nach oben), Orbit um einen Planeten | 300 | 4 | Körper (Planet) | Rakete als ein Stück, Spur, Sterne treiben | 3 / 29 s | 4 – Große Geschichte, zwei Bildausschnitte | 300 | | Rakete als starres Teil, die eine Umlaufbahn fliegt: geht das? |
| Mondlandung | ODYSSEY | Aus dem Orbit landet die Rakete auf dem Mond, Staub und eine wehende Flagge | 300 | 4 | Körper (Planet) | Landung, Flagge weht | 2 / 23 s | 3 – Geschichte | 300 | | – |
| Logo | SPARK | Beispiel-Logo, Lichtlauf | je nach Logo 100–150 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | Ab welcher Detailtiefe lehnt ihr ein Logo ab oder vereinfacht es? |
| Logo | HORIZON | Logo in zwei Ebenen | 200 | 1 | leicht | Schimmer | 1 / 6 s | 2 – Körper | 200 | | – |
| Logo | ODYSSEY | Logo wird zum Ring aus Licht in 3D | 300 | 1 | Körper | Ring dreht sich | 2 / 13 s | 3 – Geschichte | 300 | | – |
| Glühbirne | SPARK | Glühbirne, Faden glimmt | 100 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | – |
| Glühbirne | HORIZON | Glühbirne in 3D | 200 | 1 | Körper | Drehung | 1 / 6 s | 2 – Körper | 200 | | – |
| Glühbirne | ODYSSEY | Faden glimmt, Glas entsteht aus der Wolke, Strahlen | 300 | 3 | Körper | Teil-Umbau, Drehung | 3 / 14 s | 3 – Geschichte | 300 | | – |
| QR-Code | SPARK | Finder-Quadrate und Scanrahmen (nicht scannbar) | 100 | 1 | flach | Scanlicht | 1 / 5 s | 1 – Bild | 100 | | – |
| QR-Code | HORIZON | Echter Code (21 × 21, 198 Module), baut sich Zeile für Zeile auf | mindestens 200 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild, aber viele Punkte | 200 | | Ist ein echter, scannbarer Code am Himmel realistisch? Bei welchem Abstand und welcher Fläche? |
| QR-Code | ODYSSEY | Handy mit Nachrichten, die Nachrichten werden zum Code im Display, „SCAN ME“, eine Scanlinie fährt von oben nach unten über den Code (wie in HORIZON) | 300 | 2 | flach | Nachrichten fliegen in den Code | 3 / 18 s | 3 – Geschichte (einfach) | 300 | | – |
| Spirale | SPARK | Flache Spirale, Licht läuft nach innen | 100 | 1 | flach | Drehung, Licht | 1 / 6 s | 1 – Bild | 100 | | – |
| Spirale | HORIZON | Konische Helix | 200 | 1 | Körper | Farbwelle steigt | 1 / 6 s | 2 – Körper | 200 | | – |
| Spirale | ODYSSEY | Helix wird zum Torus, der sich durch sich selbst dreht, dann Möbius-Schleife | 300 | 1 | Körper | Strömen durch den Torus | 4 / 29 s | 3 – Geschichte, volumetrisch | 300 | | – |

## Kultur

| Motiv | Paket | Fassung in der Vorschau | Drohnen für gute Lesbarkeit | Teile | 3D | Bewegung | Akte / Dauer | Stufe | Ab (Konfigurator) | Machbar? (FlyingStars bestätigt) | Frage an FlyingStars |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Buch | SPARK | Offenes Buch, Licht liest die Zeilen | 100 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | – |
| Buch | HORIZON | Buch öffnet sich, eine Seite wendet sich | 200 | 1 | Körper | Seite wendet sich | 1 / 6 s | 2 – Körper | 200 | | – |
| Buch | ODYSSEY | Buch öffnet sich, eine Feder schreibt drei Zeilen, die Zeilen werden ein Stern | 300 | 5 | leicht | Deckel, Feder als ein Stück, Teil-Umbau | 4 / 30 s | 4 – Große Geschichte, zwei Bildausschnitte | 300 | | Eine Feder, die schreibt: Licht läuft hinter der Feder mit. Geht das in dieser Feinheit? |
| Vorhang | SPARK | Vorhang im Luftzug | 100 | 1 | flach | Stoff wiegt | 1 / 6 s | 1 – Bild | 100 | | – |
| Vorhang | HORIZON | Vorhang öffnet sich, 3D-Stern löst sich | 200 | 2 | leicht | Öffnen, Teil-Umbau | 2 / 12 s | 3 – kleine Geschichte | 200 | | – |
| Vorhang | ODYSSEY | Vorhang auf, Goldregen, ein Stern steigt auf | 300 | 3 | leicht | Öffnen, Regen aus Licht | 3 / 18 s | 3 – Geschichte | 300 | | – |
| Masken | SPARK | Komödie und Tragödie wiegen sich | 100 | 1 | flach | Wiegen | 1 / 6 s | 1 – Bild | 100 | | – |
| Masken | HORIZON | Masken in 3D | 200 | 1 | leicht | Wiegen | 1 / 6 s | 2 – Körper | 200 | | – |
| Masken | ODYSSEY | Komödie, die Tragödie tritt dazu, beide verbinden sich zum Theaterzeichen | 300 | 2 | leicht | Masken als starre Teile | 3 / 13 s | 3 – Geschichte | 300 | | – |
| Bokkenrijders | ODYSSEY | Der Teufel aus eurer Show Bokkenrijders | 300 (eure Formation hat 600) | 1 | Körper | Wiegen, Augen aus Licht | 1 / 7 s | 4 – große Formation | 300 | | Dürfen wir die Formation öffentlich als Beispiel zeigen? Unter welcher Zahl wirkt sie nicht mehr? |
| Musik | SPARK | Zwei Noten wiegen sich | 100 | 1 | flach | Wiegen | 1 / 6 s | 1 – Bild | 100 | | – |
| Musik | HORIZON | Harfe, Licht zupft die Saiten | 200 | 1 | leicht | Saiten schwingen (klein) | 1 / 6 s | 2 – Körper | 200 | | – |
| Musik | ODYSSEY | Glissando, fünf Noten fliegen im Bogen davon, Notenlinien mit Violinschlüssel | 300 | 7 | flach | jede Note als eigenes Teil | 4 / 26 s | 4 – Große Geschichte, drei Bildausschnitte | 300 | | – |
| Tanz | SPARK | Tänzerin, Rocksaum wiegt | 100–150 | 1 | flach | Saum | 1 / 6 s | 1 – Bild | 100 | | – |
| Tanz | HORIZON | Drehung, Rock als Kegel | 200 | 1 | Körper | Drehung | 1 / 6 s | 2 – Körper | 200 | | – |
| Tanz | ODYSSEY | Drehung, Rock wird Blüte, Blüte wird Fächer | 300 | 2 | Körper | Drehung, Umbau | 4 / 24 s | 3 – Geschichte | 300 | | – |

## Winter & Silvester

| Motiv | Paket | Fassung in der Vorschau | Drohnen für gute Lesbarkeit | Teile | 3D | Bewegung | Akte / Dauer | Stufe | Ab (Konfigurator) | Machbar? (FlyingStars bestätigt) | Frage an FlyingStars |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Uhr | SPARK | Zeiger laufen auf zwölf | 100 | 1 | flach | Zeiger | 1 / 6 s | 1 – Bild | 100 | | – |
| Uhr | HORIZON | 3D-Uhr, Zeiger laufen | 200 | 1 | leicht | Zeiger, Wiegen | 1 / 6 s | 2 – Körper | 200 | | – |
| Uhr | ODYSSEY | Fünf vor zwölf, Funken schwärmen aus, schreiben das neue Jahr, kreisen um die Uhr | 300 | 2 | Körper (Bahnen) | Funken kreisen | 4 / 24 s | 3 – Geschichte | 300 | | Jahreszahl aus „Funken“: echte Schrift oder eure Schriftplanung? |
| Sektkorken | ODYSSEY | Sektflasche, der Korken knallt und fliegt im Bogen, Schaum folgt | 300 | 3 | Körper (Flasche) | Korken als starres Teil | 1 / 8 s | 3 – Geschichte, ein kleines Teil fliegt (wie bei #BöllerCiao) | 300 | | Wie in #BöllerCiao: dauert der Korkenflug etwa 2,5 s? |
| Lichterbaum | SPARK | Schneeflocke dreht sich | 100 | 1 | flach | Drehung | 1 / 6 s | 1 – Bild | 100 | | – |
| Lichterbaum | HORIZON | Spiralbaum, Licht steigt | 200 | 1 | Körper | Licht | 1 / 6 s | 2 – Körper | 200 | | – |
| Lichterbaum | ODYSSEY | Flocke wird Baum, Licht zeichnet ihn, Stern, Lichterkette | 300 | 2 | Körper | Drehung, Lichterkette | 4 / 23 s | 3 – Geschichte | 300 | | – |
| Feuerwerk | SPARK | Sterne leuchten nacheinander auf | 100 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | – |
| Feuerwerk | HORIZON | Sechs Sterne blühen und verglühen | 200 | 1 | leicht | nur Licht | 1 / 6 s | 1 – Bild aus Licht | 200 | | – |
| Feuerwerk | ODYSSEY | Leuchtspur, 3D-Stern, Wellen, Finale, Goldregen | 300 | 3 | Körper | Licht | 5 / 31 s | 3 – Geschichte aus Licht | 300 | | Ist ein Stern in unter 0,1 s komplett da (Frühlingsnacht)? |
| Kleeblatt | SPARK | Glücksklee dreht sich | 100 | 1 | flach | Drehung | 1 / 6 s | 1 – Bild | 100 | | – |
| Kleeblatt | HORIZON | Klee in 3D | 200 | 1 | leicht | Drehung | 1 / 6 s | 2 – Körper | 200 | | – |
| Kleeblatt | ODYSSEY | Drei Blätter, ein viertes kommt dazu, Funken | 300 | 2 | Körper | Umbau | 3 / 14 s | 3 – Geschichte | 300 | | – |

## Stadtfest

| Motiv | Paket | Fassung in der Vorschau | Drohnen für gute Lesbarkeit | Teile | 3D | Bewegung | Akte / Dauer | Stufe | Ab (Konfigurator) | Machbar? (FlyingStars bestätigt) | Frage an FlyingStars |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Reise | SPARK | Kompass, die Nadel dreht auf Norden | 100 | 1 | flach | Nadel | 1 / 6 s | 1 – Bild | 100 | | – |
| Reise | HORIZON | Kompass in 3D, die Nadel dreht auf Norden | 200 | 1 | leicht | Nadel | 1 / 6 s | 2 – Körper | 200 | | – |
| Reise | ODYSSEY | Altstadt, wird zur Karte, Pins, Route, Papierflieger, Kompass mit kreisendem Flieger | 300 | 4 | leicht | Stadt kippt, Flieger als starres Teil | 6 / 38 s | 4 – Große Geschichte (sechs Akte) | 300 | | Für Städte: eigene Skyline und echte Orte? |
| Kolibri | SPARK | Kolibri, Flügel schwirren aus Licht | 100 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | – |
| Kolibri | HORIZON | Kolibri in 3D, Flügelschlag | 200 | 1 | Körper | Flügel | 1 / 6 s | 2 – Körper | 200 | | – |
| Kolibri | ODYSSEY | Anflug, schwebt vor der Blüte, trinkt, steigt auf, Knospen blühen | 300 | 4 | leicht | Vogel als starres Teil, Blüten öffnen sich | 4 / 25 s | 3 – Geschichte (Marcs Vorbild für die Abstufung) | 300 | | – |
| Delfin | SPARK | Delfin über einer Welle | 100 | 1 | flach | nur Licht | 1 / 5 s | 1 – Bild | 100 | | – |
| Delfin | HORIZON | Delfin springt im Kreis, unter Wasser gedimmt | 200 | 3 | leicht | Sprung | 1 / 6 s | 2 – Körper | 200 | | Darf ein Sprung durch die Wasserlinie gedimmt werden (Drohnen fliegen dunkel weiter)? |
| Delfin | ODYSSEY | Wellen, Sprung, Eintauchen, Ringe, zwei Delfine bilden ein Herz | 300 | 3 | leicht | Sprünge | 5 / 33 s | 3 – Geschichte | 300 | | – |
| Drache | ODYSSEY | Drache steigt auf einer Spirale auf, kreist, speit ein Feuerwerk | 300 | 2 | Körper (Bahn) | Flügelschlag, Flug auf einer Bahn | 3 / 26 s | 4 – Große Geschichte, große Figur | 300 | | Wie in Leipzig (Drache): Wie viele Drohnen hatte die Figur, und darf sie über die ganze Bühne fliegen? |

## Eigener Text (alle Anlässe)

| Paket | Fassung | Drohnen für gute Lesbarkeit | Stufe | Frage an FlyingStars |
|---|---|---|---|---|
| SPARK | Text zeichnet sich aus dem Nichts in Schreibreihenfolge, danach wandert ein Schein | etwa 8–10 Drohnen je Buchstabe in Druckschrift | 1 – Bild | Wie viele Zeichen sind bei 100 Drohnen sinnvoll? |
| HORIZON | wie SPARK, dazu schwebt der Schriftzug, Ornamente | wie SPARK | 2 | – |
| ODYSSEY | Licht schreibt, Buchstaben schwingen in 3D, Ring aus Licht, Wechsel in Initialen oder Schreibschrift | wie SPARK plus etwa 70 für den Ring | 3 | Schreibschrift aus einem Strich (EMS Allure): Fliegt ihr so etwas? |

## Was wir von FlyingStars brauchen

1. Die Spalte „Machbar?“: ja / nein / mit Änderung.
2. Eine eigene Zahl in „Drohnen für gute Lesbarkeit“, wo unsere Schätzung nicht passt.
3. Welche Motive ihr nur ab einer bestimmten Paketgröße anbieten würdet. Daraus setzen wir `minDrones` endgültig.
4. Die Fragen in der letzten Spalte.
5. **Wann soll der Preis springen?** (Marc, 30.10.2026) Der Regler geht in 10er-Schritten, der Preis aber nicht überall: Bei SPARK steigt er alle 10 Drohnen (bis 150 um 900 €, von 160 bis 190 um 700 €, unser Platzhalter), bei HORIZON je angefangene 50 um 4.900 €, bei ODYSSEY je angefangene 100 um 9.900 € (die Formel der Preisseite). Dazwischen ändert sich nichts. Gerechnet mit `configuratorPrice()` in `src/content/show-packages.ts`:

   | Drohnen | Preis (netto) | Drohnen | Preis (netto) |
   |---|---|---|---|
   | 100 | 7.900 € | 200 | 15.900 € |
   | 110 … 150 | je +900 € bis 12.400 € | 210–250 | 20.800 € (gleich) |
   | 160 … 190 | je +700 € bis 15.200 € | 260–290 | 25.700 € (gleich) |
   | 300 | 34.900 € | 310–400 | 44.800 € (gleich) |
   | 410–500 | 54.700 € (gleich) | 510–600 | 64.600 € (gleich) |

   Fragen: Soll der Preis bei jeder Drohnenzahl steigen, die man wählen kann (dann bräuchten wir einen Preis je 10 Drohnen auch für HORIZON und ODYSSEY), oder sollen nur die Stufen wählbar sein, an denen sich der Preis ändert (dann rastet der Regler bei HORIZON in 50er-, bei ODYSSEY in 100er-Schritten)? Und sind 900 € je 10 Drohnen bei SPARK, 4.900 € je 50 bei HORIZON und 9.900 € je 100 bei ODYSSEY die richtigen Aufpreise? Bis zur Antwort bleibt alles, wie es ist.
