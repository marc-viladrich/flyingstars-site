# Himmel

Stand 15.11.2026. Fester Bestandteil der Seite seit dem Abschluss des Schrift-Labors (Runden 1–3, 13.11.2026; Stand in der
Git-Historie, Commit `b31d7c9`). Verbindliche Regeln: `docs/DESIGN.md` → „Himmel“.

## Was dazugehört

- **Schwarm:** ein Schwarm aus 300 Drohnen begleitet den Besuch von Bühne zu Bühne. Bilder stehen, Wechsel sind dunkel.
- **Zeiger:** Wer mit der Maus über ein stehendes Bild fährt, verdrängt die Drohnen im Raum, eine Feder holt sie weich zurück
  (dieselbe Mechanik wie die Punktwolke der Nachhaltigkeits-Scrollstory, `effects/eco-scrolly.js`). Bis Runde 4 leuchteten sie
  stattdessen auf; Marc, 18.11.: „zu cheap-looking“. Runde 6 (Marc: „a bit too strong“): Wirkradius 44–84 px nach Bühnengröße,
  der schnelle Stoß sättigt weich bei gut einem Viertel des Radius (Schriftzug rund 13 px), zurück kritisch gedämpft ohne Nachschwingen.
- **Punktübergänge** an jeder Grenze zweier Sections mit unterschiedlicher Hintergrundfarbe, auf allen Seiten (siehe unten).
- **Schriftstärke der Verlaufsworte:** der markierte Begriff jeder Überschrift wird beim Hineinscrollen einmal von 300 zur
  Stärke der Überschrift dicker (seit Runde 7, 19.11.2026; ersetzt den Lichtlauf der H1). Regeln: `docs/DESIGN.md` → Himmel.

## Bühnenplan

Eine Bühne spielt nur, wenn ihre ID im DOM steht und neben dem Section-Kopf Platz ist (`free()`); sonst passiert dort nichts.

| Seite | Bühne | Bild | Reaktion |
|---|---|---|---|
| Start | `#anlaesse` | Anstoßende Gläser | Zeigen auf eine Karte: Unternehmen → Sportwagen, Agenturen → Handschlag, Gemeinden → Kölner Dom (Runde 14, statt Förderturm), Konzerte & Festivals → Mikrofon, Privat → Doppelherz, Indoor → Diskokugel. Zuordnung über Kartenkicker, dann Link-Ziel, dann Kartentitel |
| Start | `#warum-drohnen` | Feuerwerksblüte, danach die Show-Folge (siehe unten), auch unter 900 px | keine |
| Start | `#projekte` | Maske der Bokkenrijders (Kundenformation aus dem ersten Referenzbild, statt der Galaxie: Marc, 18.11.: Spirale „zu lame“). Runde 5 („größer und eingedrehter“): Dreiviertelansicht (0,38 rad), schwenkt in 9 s um ±0,22 rad, Augen glühen; Bühne wächst bis 190 px über den Kopf, `#projekte` hat dafür ab 900 px 6 rem mehr Luft oben (`himmel.css`). Rund 375 statt 245 px hoch | keine |
| Start | `#preise` | mit Paketkarten Wasserball, ohne Sonne; steht dort der Konfigurator (eigene Formation), bleibt der Himmel leer | Zeigen auf ein Paket: SPARK Stern, HORIZON Wasserball, ODYSSEY Atom → Mandala → Welle |
| Start | `#ueber` | Lachendes Gesicht; seit Runde 14 (Team als Collage neben dem Text) ohne freien Platz, die Stelle bleibt leer | keine |
| alle | Formular `#inquiry-form` | „EURE SHOW“, einmal je Seitenaufruf mit Auftakt (siehe unten) | Anlass → Motiv (Gemeinden → Kölner Dom), Ort → Schrift, Datum → Schrift und „NOCH n TAGE“, Paket → Drohnenzahl, `flyingstars:lead-confirmed` → „DANKE <Vorname>“, dann Stern |
| Hochzeit | `#choreografie` | Doppelherz | keine |
| Indoor | `#unterschied` | Indoor-Reihe (eigene Bühne, siehe unten); die Diskokugel des Schwarms findet dort keinen Platz mehr | keine |
| Marken & Werbung | `#agenturen` | Handschlag (`#marketing` ohne Schwarm, dort stehen die Logo-Shows als Bildleiter, Marc Runde 7) | keine |

Ohne Bild: `#darum`, `#sicherheit`, `#nachhaltigkeit` (dort spielt seit Runde 14 eine eigene Bühne mit den Figuren der früheren
Scrollstory, `variant: "eco"`, siehe unten), `#ablauf`, `#faq`. Die Show endet am Formular.
Unter 900 px spielen nur `#warum-drohnen`, `#preise` und Formular.

Die Himmelszeile (Eingabefeld nach `#kundinnen`, Besucher tippen ein Wort, der Schwarm schreibt es) ist seit Runde 5 entfernt
(Marc, 18.11.: „bringt erstmal nicht so viel“; dort ruckelte der Wechsel zur nächsten Section am stärksten, siehe Performance).

## Formular: Auftakt und Kirche für Gemeinden (Runde 14, 21.11.2026)

- **Auftakt** (Marc: man soll sofort sehen, dass der Text variabel ist): Steht das Himmelsfenster des Formulars ganz im Blick,
  spielt der Schwarm einmal je Seitenaufruf EURE SHOW → EUER TAG → das heutige Datum → EURE SHOW und steht dann (Standzeit
  1,8 s, danach je 2,6 s, Wechsel wie jeder andere im Fenster). Datum je Sprache: 21.11.26, 21 NOV 2026, 21 NOV 2026 (NL mit
  MRT, MEI, OKT); dieselbe Schreibweise gilt seit Runde 14 für das gewählte Datum. Jede Eingabe im Formular beendet den Auftakt
  sofort; reduzierte Bewegung und Pause zeigen nur EURE SHOW. Das Fenster ist `aria-hidden`, kein `aria-live`: Screenreader
  hören die Rotation nicht. Code: `himmel-texte.js` (Worte, Datum), `schwarm.ts` (Einmal-Folge `seq` mit `once`: Standzeit
  zählt nur, solange das Bild ganz im Blick steht; das nächste Bild lädt erst beim Wechsel). EUER TAG liegt vorberechnet in
  `texte-*.json`, das Datum rechnet der Textplaner im Worker (`textFormationAsync`), sobald der Auftakt läuft, ebenso jeder
  getippte Ort und jedes gewählte Datum (vorher im Hauptthread). Wächter: `scripts/himmel-formular-auftakt.test.mjs`,
  `tests/himmel-formular-auftakt.spec.ts` (welches Bild das Fenster trägt, steht in `data-himmel`).
- **Kirche für Gemeinden** (Marc: jede Gemeinde hat eine Kirche, damit identifiziert man sich eher; kein neues Motiv, der
  Kölner Dom aus dem Konfigurator): `public/media/himmel/dom-100.json`, vorberechnet aus der Linienzeichnung
  `scenes/wahrzeichen.js → SHAPES.dom` (Stufe 1 mit Portal und Kreuzblumen) mit `tools/himmel/motive-vorberechnen.mjs`.
  100 Drohnen, weil die Dichte zählt: Der Dom ist schmal und hoch, bei 150 verschmolzen die Lichter im Formularfenster zu
  einem Strich (3,6 px Abstand, Nachbarmotive 5–8 px). Zuordnung an beiden Stellen in `anlass-motiv.js`; `FORM_OCCASION`
  nutzt seitdem die heutigen Formularwerte (vorher alte Schlüssel, NL „Bedrijven“ und „Privé“ bekamen den Stern). Der
  Förderturm bleibt im Konfigurator. Wächter: `scripts/himmel-anlass-motiv.test.mjs`.

## Show-Folge bei `#warum-drohnen` (Runde 3, 17.11.2026; Runden 4 und 5, 18.11.2026)

Marc, 15.11.: „quasi never-ending loop … Spark-Horizon-Odyssey-Transformationen und -Eskalationen“. 17.11.: „Die Motive müssen
viel schneller a) sich bewegen und b) rotieren … Das Feuerwerk-Finale kann gerne am Anfang kommen. Aber dann relativ schnell
eskalieren in diese großen, beeindruckenden Sachen.“ Glühbirne raus, dazu eine feste Wunschliste. 18.11. zur Umdrehung: „Das muss
nicht, das nimmt dem ganzen voll die Dynamik weg, dauert zu lange … Und das Riesenrad in 3D kann sich gerne drehen wie im
Konfigurator“; zu den Wechseln: „Können auch etwas schneller sein.“ Runde 5: Bühne „on a big screen … noch um einiges größer“,
Funkwellen am Fernsehturm, Kolibri mit Blüte, QR schneller, Feuerregen zurück, Leistung über die Zeit. Code:
`src/scripts/himmel/folge.js`.

- **Auftakt:** Der Schwarm kommt wie bisher als Feuerwerksblüte an (der Knall von gestern, gut 1 s) und übergibt seine 300 Drohnen
  an die Show-Folge, die mit der Engine des Konfigurators spielt (`show-field.js`, `show-scenes.js`, `scenes/`). Beim ersten Besuch
  folgt unser Feuerwerk (Finale aus dem Konfigurator), dann die Maske der Bokkenrijders, danach das Logo flach und als Körper. Wer
  zurückkommt, sieht die Blüte und dann das nächste Stück.
- **Stücke** (Repertoire = Marcs Wunschliste, `PIECES` in `folge.js`), drei Arten:
  - *raum* – ein räumliches Bild: Maske der Bokkenrijders (`devilStory`, echte 3D-Formation) schwenkt an; die Kugel
    (`sphere3d`, `scenes/kugel.js`) dreht sich um ihre eigene Achse
  - *esc* – erst flach (SPARK, ~100 Drohnen, 1 s), dann fliegen dieselben Drohnen in den Körper (HORIZON), der anschwenkt;
    die hinzukommenden steigen dunkel von unten auf und leuchten erst an ihrem Platz: Logo (`logo` → `logo3d`), Fernsehturm
    (`tower` → `towerStory` Akt 1–2: der Turm sendet, die Funkwellen laufen nacheinander nach außen; ohne Brandenburger Tor),
    Schneeflocke → räumliche Schneeflocke (Runde 6, `snow3d` in `scenes/schnee.js`: drei Flocken-Ebenen um die gemeinsame
    Hochachse falten sich aus der flachen Flocke auf und drehen sich) → Lichterbaum, Wappen mit Stern → Wappen „125“ mit wehender Fahne (`shield` → `shield3d`, 300),
    Riesenrad (`wheel2d` 150 → `wheel3d` 300, dreht sich um die Nabe, kein Schwenk)
  - *story* – eine Geschichte in Akten (ODYSSEY, 300), gerafft auf etwa 1,3 s je Akt: QR-Code (`qrStory`, Runde 5 auf 3 s Show-Zeit
    gestrafft, real gut 4 s), Delfine (`dolphinStory` ab dem Sprung), Buch (`bookStory`), Musik (`harpStory`: Harfe, Noten),
    Tänzerin (`dancerStory`), Kolibri (`hummingbirdStory`: fliegt zur Blüte, trinkt, steigt auf, die Knospen blühen; Runde 5 statt
    flach → 3D), Feuerwerk (`fireworkStory` ganz, `whole`: Leuchtspur, Stern, Wellen, Finale und Goldregen; der Regen steht 3 s)
  - Auftakt beim ersten Besuch: `fireworkFinale` (Finale und Goldregen, der Regen steht 2,6 s; Runde 4 war er nach gut 1 s weg)
- **Schwenk statt Umdrehung (Runde 4):** `restage()` legt das letzte Bild eines räumlichen Stücks auf eine eigene `steadyClock`:
  Es kommt bei −20° an und schwenkt in seiner Standzeit in einer Richtung nach +20° (`SWING`), langsam an und aus, keine Finte.
  Standzeit 1,5 s plus Anlauf und Bremsen (vorher 2,6 s mit einer ganzen Umdrehung). Das Riesenrad nutzt die Drehung aus
  `festival.js` (`turnWheel`, Gondeln bleiben hängend) mit 2,6-fachem Tempo und steht dafür 3,4 s.
- **Reihenfolge:** beim ersten Besuch fest (Runde 6: QR-Code direkt nach dem Logo, Marc: typischer Einsatz), danach gemischt ohne Zurücklegen: nie dieselbe Art hintereinander und keine
  Formfamilie (rund, hoch, Tier, Gesicht …) aus den beiden Stücken davor. Gemessen (18.11., Dev-Server, Chromium 1440 × 900,
  Sekunden ab dem Scrollen zur Section, Rechner stark ausgelastet, eher etwas langsamer als real): Blüte 1,4 · Feuerwerk-Finale
  3,2 · Maske 6,7 · Logo 9,2 (Körper 10,8) · Kugel 13,3 · Delfine 15,9 · Fernsehturm 24,2 · QR 28,4 · Wappen 34,8 („125“ 36,5) ·
  Musik 39,0 · Kolibri 47,3 · Buch 51,4 · Lichterbaum 59,8 · Tänzerin 64,0 · Riesenrad 72,4 (3D 74,0) · Feuerwerk 78,1 · ab 84,6
  gemischt. Runde 3 brauchte für alle 14 rund 115 s.
- **Nicht mehr dabei:** flache Katalogbilder als Füllung, Worte („WOW“), Glühbirne, Medaille „25“ (Runde 4: „Jubiläum mit dem
  Button“ ist das Wappen „125“), Katalog-Kugel (150 Punkte, las sich schwach), Pokal, Fußball, Drache, Ringe, Herz, Lotus,
  Vorhang, Theatermasken, Uhr, Sekt, Klee, Rakete, Kompass.
- **Tempo** (Werte in `folge.js`): Wechsel laufen mit Show-Uhr-Tempo 4,2 (`flightRate`), und kein Anflug dauert länger als 0,6 s
  (`flightMax`, ein weiter Weg läuft entsprechend schneller): Wechsel in etwa 0,5–0,6 s (Runde 3: 0,6–1,2 s). Die lose Punktwolke
  beim Wechsel 2D → 3D bleibt behoben (`joinLate`, gesichtet in den Kontaktbögen). Räumliche Bilder bewegen sich 1,6-mal so
  schnell wie im Konfigurator, Geschichten mindestens 2-mal so schnell. Stehen bleibt nichts länger als gut 3 s außer dem
  Riesenrad.
- **Größe (Runde 5):** Breit die ganze Fläche rechts vom Text (Abstand 5 % der Fensterbreite, 64–112 px) bis zur Content-Kante und
  über die Höhe der Section bis 24 px an ihre Kanten (`folgeBox()` in `schwarm.ts`, mit `free()`); oben hat die Section dafür
  weniger Polster (`himmel.css`, 80–104 statt 140 px). Gemessen: 1440 px etwa 458 × 614, 1920 px etwa 900 × 740, 2560 px etwa
  885 × 740 px (Runde 4: höchstens 720 × 500). Jedes Motiv wird so gezoomt, dass es die Bühne in Breite oder Höhe zu 90 % füllt; bei Bildern mit eigener Uhr (Schwenk,
  Riesenrad, Kugel) nach dem, was sie in ihrer Standzeit wirklich überstreichen (neun Zeitpunkte gemessen). Unter 900 px spielt
  die Folge in einer Fläche unter dem Text; deren Höhe reserviert `himmel.css` von Anfang an (`#warum-drohnen::after`, nur mit
  `html.reveal` bzw. `html.motion-paused`).
- **Übergabe:** Das Feld der Folge (eigenes Canvas in der Himmel-Ebene) stellt seine Blüte unsichtbar bereit; der Schwarm fliegt
  genau auf deren Punkte und in deren Lichtgröße, dann schaltet die Folge sichtbar. Wird eine andere Bühne dran, übernimmt der
  Schwarm Lage, Licht und Farbe jeder Drohne und fliegt weiter.
- **Rücksicht:** Das Feld zeichnet nur, solange sein Canvas im Bild ist, und steht, sobald der Schwarm übernommen hat. Pause
  (`html.motion-paused`) und reduzierte Bewegung: Die Folge geht aus, der Schwarm zeigt dort stehend den Stern. Das Modul lädt
  erst, wenn die Section näher als gut eine Bildschirmhöhe ist (`rootMargin: 120%`); bis dahin (oder wenn es nicht lädt) gilt das alte Verhalten.
- **Vorbereitung in kleinen Stücken:** Zum Einstieg wird nur das erste Stück gebaut (beim ersten Besuch das Feuerwerk). Jedes
  weitere Bild entsteht in einem eigenen Task (`requestIdleCallback`, Safari `setTimeout`), ebenso die Lichtlauf-Reihenfolge je
  Bild; vorgebaut wird ein Stück, solange die Bühne nicht spielt, zwei, wenn sie spielt. Die „125“ des Wappens liegt vorberechnet
  in `folge.js` (`primeTextFormation()` in `text-formation.js`; `words()` in `show-scenes.js` lädt den Textplaner nur, wenn die
  Zahl nicht vorliegt).
- **Gemessen** (17.11.2026, Produktions-Build, Chromium, 390 × 844, CPU 4× gedrosselt, `PerformanceObserver('longtask')` und
  `long-animation-frame`, 30 s ab Scrollbeginn bis zur Bühne, je 3 Läufe): vorher 630 / 717 / 514 ms Long Tasks, längster
  363–522 ms; nachher 103 / 174 / 50 ms, längster 50–60 ms. Runde 4 siehe unten.
- **Leistung über die Zeit (Runde 5):** Marc: „Je weiter man in der Animation drin ist, ab irgendwann scheint es ein Performance-
  Problem zu geben.“ Ursache: Wechselt die Folge ihr Stück aus dem Bild heraus (`onTick` → `show()` → `sync()`), startete
  `show-field.js` eine zweite Zeichenschleife, ohne die laufende zu beenden; nach jedem Wechsel lief eine mehr. Behoben: `frame`
  steht während eines Bildes auf −1, `sync()` merkt sich dann nur, dass weitergezeichnet werden soll. Gemessen (Dev-Server,
  Chromium 1440 × 900, CPU 4× gedrosselt, 300 s, je 30 s): vorher Frame-Zeit p50 16,7 → 83 ms, p95 16,8 → 117 ms, Long Tasks
  0 → 300 je 30 s, rAF-Aufrufe je Frame 3,5 → 50, Heap 19 → 46 MB; nachher in allen zehn Abschnitten p50 16,7 / p95 16,8 ms,
  0–6 Long Tasks je 30 s, ein rAF-Aufruf je Frame, Heap 19–30 MB ohne Trend. Außerhalb des Bildes: 0 Frames. Werkzeug:
  `/private/tmp/claude-501/fs-r5/show/tools/longrun.mjs` (nicht im Repo). Runde 6: Misslingt ein Stück viermal (Fehler im Motiv,
  Netz), versucht `prepare()` es nicht mehr sofort erneut (vorher eine endlose Wiederholung). Die Zeiten der Runde-4-Zeitleiste waren durch den
  Fehler zu kurz; neu gemessen (1920 × 1080, ohne Drosselung): Feuerwerk-Finale mit Goldregen 2,3 · Maske 8,4 · Logo 10,9 ·
  Kugel 15,0 · Delfine 17,5 · Fernsehturm 25,9 · QR 32,9 · Wappen 37,5 · Musik 41,6 · Kolibri 50,0 · Buch 58,3 ·
  Lichterbaum 66,8 · Tänzerin 70,9 · Riesenrad 79,2 · Feuerwerk 85,1 · ab 97 gemischt.
- **Engine (additiv, Konfigurator und Teaser setzen nichts davon):** `show-field.js` – `outside`, `drones(n)`/`radius()`
  (Übergabe), `flightRate` (Tempo der Show-Uhr nur in Übergängen), `flightMax` (längster Anflug in echten Sekunden), `joinLate`
  (dunkel hinzukommende Drohnen leuchten erst kurz vor ihrem Platz), `lightScale` (größere Lichter, Indoor), `data-flight` am
  Canvas (Anflugdauer in Show-Sekunden, für Prüfwerkzeuge). `text-formation.js` – `primeTextFormation()`/`hasTextFormation()`.
  `scenes/kugel.js` (`sphere3d`), `scenes/indoor.js` (Indoor-Motive).

### Indoor-Reihe bei `#unterschied` (Runde 4, 18.11.2026)

Marc zur leeren Icon-Karte neben „Faszinierend wie Feuerwerk, sicher wie Laser“: „Hier würde eigentlich auch eine Animations-Reihe
wie auf der Startseite sehr gut passen.“ Dieselbe Technik, `createFolge(canvas, { variant: "indoor" })`, kein zweites System.

- **Motive** (`scenes/indoor.js`, 20 bis 50 Drohnen wie eine echte Indoor-Show). Runde 10 (Marc, 20.11.2026: „Bei
  Indoor-Shows ist das eher ein Business-Event … Smiley und Herz ist mir zu doll … Der Ring ist wieder weird … Mehr solche
  geometrischen Formen, die man mit 20 bis 50 Drohnen machen kann“): Herz, lachendes Gesicht, Initialen und Ring sind raus.
  Reihe, flach und räumlich im Wechsel: Welle (läuft durch die Linie, 50), Würfel (8 Ecken, je 3 Drohnen pro Kante, dreht
  sich, 44), Stern (50), Doppelhelix (50), Formen (36 Drohnen laufen Kreis → Dreieck → Quadrat → Sechseck; 36 ist durch 3, 4
  und 6 teilbar, jede Ecke trägt eine Drohne), Raster (5 × 10 als Fläche im Raum, ein Wellenring läuft aus der Mitte, 50),
  Diamant (50), Tetraeder (dreht sich, 28), zwei Achtelnoten (50), liegende Acht (40 Drohnen laufen auf ihr um, sie kippt
  sacht), Krone (50; Marcs „Wahrzeichen“, sie liest sich als Burg-Silhouette). Standzeit 1,4 s, Motive mit eigener Handlung
  länger (Würfel 2,2, Formen 3,4, Raster 2,4, Tetraeder 2,0, Acht 2,4 s), festgelegt in `INDOOR_ROW` (`folge.js`). Was ein Bild
  nicht braucht, fliegt dunkel unter die Bühne (`joinLate`). Wächter: `scripts/indoor-motive.test.mjs` (Reihe = Motive, keine
  Liebesmotive, 20–50 Drohnen, keine zwei Drohnen aufeinander über die Standzeit). Verworfen im Kontaktbogen: Würfel mit
  2 Drohnen je Kante (zerfiel in Einzelpunkte), räumliche Lissajous-Figur 3 : 2 mit 40 Drohnen (zu lang, Punktwolke).
  Ein Brillantschliff im Raum las sich mit 50 Punkten nur als Punktwolke; das FlyingStars-Zeichen las sich mit 50 Punkten nicht.
- **Bühne:** `show: indoor` am Abschnitt (`Sustainability.astro`), ohne Rahmen und Punktmuster. Runde 6: Indoor-Reihe und
  Chopper-Szene (Hochzeit, `scene: chopper-play`) teilen einen Mechanismus, das Grid `.eco-staged` mit den Bereichen `head`,
  `copy`, `stage`: ab breitem Desktop stehen Kopf und Text links (5fr), die Bühne spannt rechts (7fr) beide Zeilen bis zur
  Content-Kante; schmal untereinander. Keine Minus-Ränder, kein Messskript. Benannte Größen an der Komponente: `--stage-min`
  (Mindesthöhe, 20–34 rem, schmal 15–22 rem) und `--stage-bleed` (so weit reicht das Canvas der Reihe über die Bühne hinaus).
  Die Motive füllen die Bühne zu 90 % (vorher 74 %). Ohne JavaScript bleibt die Bühne weg, der Text steht einspaltig. Das Canvas
  reicht oben und unten über die Bühne hinaus (CSS), Lichter 1,6-mal so groß wie auf der Startseite (`lightScale`). Weil das
  Canvas bis neben die Überschrift reicht, findet der Schwarm dort keinen freien Platz mehr (`free()`); die frühere Diskokugel bei
  `#unterschied` entfällt damit, es gibt nur ein bewegtes Element in der Section.
- **Chopper-Spielszene** (Hochzeit, `scene: chopper-play`, Runde 10; Marc: „Die Illustration könnte ein ganzes Stück größer
  sein … Punkte überall an den Kleidern, die Arme so dicht besiedelt und die Beine so wenig … Das Gesicht kann man nicht richtig
  erkennen“). Ursache: Die Kinder waren gefüllte SVG-Flächen, abgetastet wie ein Logo, mit fester Drohnenzahl je Teil statt
  nach Linienlänge. Jetzt `effects/chopper-play.js` nach der Methode der Katalogfiguren (`catalog-3d/kit.js`): nur Umrisse,
  Drohnen in gleichem Abstand entlang der Linien, verdeckte Linien fallen weg; Kopf als Kreis, Haare als Fläche, die dem Kopf
  folgt (eine eigene Kappe las sich als Mütze), Augen und Lächeln als einzelne Lichter. Chopper ist ein Umriss aus seiner echten
  Geometrie (gleiche Ellipsen, Beine, Ohr, Schwanz, Mütze). Runde 10b (Marc: „Chopper kann ruhig auch in der 404-Seite und
  woanders ohne filling dots erscheinen“): eine Quelle in `chopper.js` (`chopperParts`, 226 Drohnen) für 404, Danke-Seite, Team
  und Spielszene; Standbilder `play.webp` und `happy.webp` neu. Abstand Kind ↔ Chopper (Runde 10b, Marc: „Die Kinder brauchen
  nur etwas mehr Abstand zu Chopper“): Die Schwanzspitze schlug beim Wedeln in die Hand des wartenden Kindes, der Wurfarm reichte
  an den Hund. Jetzt wedelt der Schwanz höher, Chopper steht mittig, die Arme der Kinder sind 10 % kürzer (Hand an der Hüfte)
  und die Kinder stehen dafür weiter außen; kleinster Abstand über die Schleife 0,12 / 0,10 statt 0,064 / 0,033 Einheiten,
  Rahmen und Größe unverändert. Größe: Die Szene setzt `sw.scale` je Frame aus ihrem über eine Schleife gemessenen Rahmen
  (`PLAY_BOX` 2,44 × 1,08 Einheiten, die breiteste Stelle ist der Jubelarm in der Waagerechten); bei 1440 px sind die Kinder
  rund 260 statt 200 px hoch, bei 1920 px rund 355 px. Standbilder ohne JavaScript neu aus dem Renderer:
  `node tools/chopper-standbild.mjs <basis-url>`. Wächter: `scripts/chopper-play.test.mjs` (Linienabstand je Körperteil ±30 %,
  keine Füllung im Oberkörper, Gesicht mit zwei Augen und Mund und nichts Fremdem, Hund gleich dicht und ohne Füllung aus einer
  Quelle, jede Drohne über eine ganze Schleife im Rahmen, Mindestabstand Kind ↔ Chopper 0,095).
- **Start:** Modul lädt, wenn die Bühne näher als 300 px ist (`whenNear`); das erste Motiv entsteht in Leerlauf-Tasks; los geht es,
  wenn ein Drittel der Bühne im Bild ist: Die Drohnen steigen dunkel von unten auf und bilden das Herz. Pause-Taste und reduzierte
  Bewegung: das Herz steht. Ohne JavaScript bleibt die Bühne weg, der Text steht allein.

### Nachhaltigkeit der Startseite bei `#nachhaltigkeit` (Runde 14, 21.11.2026)

Statt der Scrollstory eine kompakte Section mit eigener Bühne (`show: eco` am Abschnitt, `createFolge(canvas, { variant: "eco" })`),
dieselbe Technik und derselbe Aufbau wie die Indoor-Reihe (`mountFolge`, Bühnen-Grid `.eco-staged`). Figuren in
`scenes/eco.js` (Schallwelle, geparkte Flotte, Blitz; 120 Drohnen, Logoverlauf), Reihe `ECO_ROW` in `folge.js`, Standzeiten
3,2 / 2,6 / 2,4 s, Füllgrad 85 %. Die Bühne ist niedriger als die der Indoor-Reihe (`--stage-min` 18–28 rem, gestapelt 2 : 1).
Start, Pause, reduzierte Bewegung und Ladezeitpunkt wie bei der Indoor-Reihe. Wächter: `scripts/eco-motive.test.mjs`.
Regeln: `docs/DESIGN.md` → „Startseite: Nachhaltigkeit kompakt, Team als Collage“.

## Technik

- `src/scripts/himmel/index.ts` startet `staerke.ts` (Schriftstärke der Verlaufsworte) und lädt `schwarm.ts` (Bühnenplan in `plan()`) erst nach dem ersten Bild
  nach (siehe Performance); `src/styles/himmel.css`.
- Zwei feste Canvas in Seitenkoordinaten (`position: absolute`, Lage per `transform`), die mit dem Inhalt scrollen: die Flugfläche
  (Seitenbreite × 1,7 Bildschirmhöhen, Pixeldichte 1) und die Bühnenfläche (nur so groß wie das stehende Bild, Pixeldichte bis
  1,5). Neu angelegt wird eine Fläche nur bei neuer Pixelgröße. Stehende flache Bilder zeichnen nur beim Lichtlauf (alle 9 s),
  unter dem Zeiger und an der Maske (Schwenk) neu.
- Feste Worte liegen vorberechnet in `public/media/himmel/texte-*.json` (`tools/himmel/texte-vorberechnen.mjs`); der Textplaner
  (rund 43 KB gzip) lädt erst, wenn im Formular Ort oder Datum eingetragen werden oder der Auftakt beim Datum ankommt
  (Runde 14), und rechnet im Worker (`text-worker.js`).
- Vorgerenderte Lichtpunkte; Lichtgröße in CSS-Pixeln, jede Fläche rechnet in ihre Pixeldichte um. Pause und reduzierte
  Bewegung: jede Bühne zeigt ihr Bild, nichts fliegt; die Umschaltung greift ohne Neuladen.
- Seitenwechsel: Lage und Farbe der Drohnen bleiben für einige Sekunden in `sessionStorage` (`flyingstars:himmel`), damit der
  Schwarm auf der nächsten Seite von dort weiterfliegt. Sonst wird kein Zustand gespeichert.
- Skriptzeit messen: `node tools/himmel/perf.mjs <url> <selector>`. Übergangsmasken neu erzeugen: `node tools/himmel/uebergang.mjs [seed]`.

## Performance (Runde 4, 18.11.2026)

Abnahmekriterium (Marc, 18.11.): Startseite mobil nicht langsamer als `main`. Ausgangslage: Lighthouse mobil `main` 99 Punkte,
LCP 1,1–1,9 s; Vorschau 96 Punkte, LCP 2,7 s.

- **Ursache:** Mit der neuen, kürzeren Schlagzeile ist auf dem Handy nicht mehr die H1, sondern das Hero-Video das größte Element
  (LCP). Dessen erstes Einzelbild kommt erst nach dem Laden der Videodatei, und der Start des Videos wartete zusätzlich auf
  Schwarm, Show-Folge und sechs Formationen (rund 100 KB JavaScript und 6 JSON-Abrufe vor dem Video).
- **Standbild ist das erste Bild:** Das Video bleibt auf dem Handy per `clip-path: inset(var(--space-0-25) …)` 1 px kleiner
  als das Standbild darunter (`FlightHero.astro`). Chrome meldet ein späteres Element nur, wenn es größer ist; so bleibt das
  Standbild (`fetchpriority="high"`, 720er-Fassung per `srcset`) das LCP-Element. Das Video trägt kein `poster` mehr: Es ist erst
  sichtbar, wenn es spielt, und das `poster` lud ein zweites Standbild im kritischen Pfad.
- **Schwarm nach dem ersten Bild:** `index.ts` lädt `schwarm.ts` per `import()` erst nach `load` und dem ersten Bild des
  Hero-Videos (spätestens 2,5 s nach `load`, Seiten ohne Video 1,5 s), dann im Leerlauf; wer vorher scrollt, bekommt ihn sofort.
  Motive lädt der Schwarm erst, wenn ihre Bühne näher als gut eine Bildschirmhöhe ist. (Die Himmelszeile stand dafür sofort im
  Markup; seit Runde 5 entfernt.)
- **CLS beim Scrollen:** Das Schwarm-Canvas wanderte per `left/top` mit und zählte bei jedem Schritt als Layout-Verschiebung
  (beim Durchscrollen der Startseite CLS 5,7 bei 390 px und 7,7 bei 1440 px; Lighthouse scrollt nicht und sah es nie, echte
  Besucher:innen schon). Jetzt per `transform`: 0,011 bzw. 0,027 wie `main`.
- **Gemessen** (Lighthouse 13.6, mobil, simuliert gedrosselt, lokal statisch ausgeliefert, `main` und Zweig abwechselnd, Median
  aus 5–7 Läufen):

  | Seite | `main` | vorher (`1f4a879`) | nachher |
  |---|---|---|---|
  | Start mobil | 99 · LCP 2,12 s (H1) · TBT 0 · CLS 0,0007 | 89 · 3,72 s (Video) · 0 · 0 | 99 · 2,12 s (Standbild) · 0 · 0 |
  | Start Desktop | 100 · 0,52 s | 100 · 0,63 s | 100 · 0,53 s |
  | `/drohnenshow-werbung/` mobil | 97 · 2,41 s (Bild) | 96 · 2,52 s (H1) | 97 · 2,53 s (H1) |
  | `/drohnenshow-preise/` mobil | 99 · 1,98 s (Text) | 98 · 2,21 s (Bild) | 98 · 2,2–2,4 s (Konfigurator-H1) |

  Lokale Absolutwerte liegen höher als deployt (`main` deployt am 18.11.: 1,93 s), die Abstände sind vergleichbar. Werbeseite:
  Das Hero-Bild steht im Zweig tiefer, darum ist die H1 LCP und hängt am Schriftladen (+0,1 s, im Rahmen). Preisseite (im Umbau,
  Konfigurator als Einstieg): LCP ist die Konfigurator-Überschrift; ihr erstes Bild fällt hinter den früh geladenen
  Konfigurator-Code (rund 60 KB) und ein drittes render-blockierendes Stylesheet (`show-configurator.css`).
- **Wächter:** `scripts/himmel-perf.test.mjs` (Teil von `npm run test:unit`, Millisekunden) prüft die Quelltext-Regeln oben.
  `npm run build && npm run perf:start` (`tools/himmel/perf-start.mjs`, gut eine Minute) prüft am Build im Handy-Profil: LCP ist
  nie das Video, vor dem LCP lädt kein Schwarm-, Folge- oder Katalogcode (Preisseite: nur Himmel), Durchscrollen der Startseite
  bleibt unter 0,1 CLS. Lighthouse-Vergleich von Hand: `lighthouse <url> --only-categories=performance`, `main` und Zweig
  abwechselnd, Median; unter Last streuen Einzelläufe um 0,3–1 s.

## Ruckeln an den Section-Grenzen (Runde 5, 18.11.2026)

Marc: „Wenn ich wechsle von diesem Input-Field zu der Anlass-Section … ist die Performance mega kacke“, ebenso Team → Formular.

- **Messung:** `node tools/himmel/grenzen.mjs [dist|url] --engines chromium,webkit --widths 1440,1920 --runs 3` scrollt die Seite
  zeitgesteuert (600 px/s) und ordnet jeden Frame und Long Task der Grenze zu, die gerade im Bild ist. Chromium mit echter GPU
  (Metal), Pixeldichte 2, CPU 4×, dazu der Compositor-Trace; WebKit ungedrosselt (Playwright kann WebKit nicht drosseln).
  `--block <regex>` sperrt ein Modul, `--css` spielt CSS ein, um einen Effekt einzeln abzuschalten.
- **Befund:** Chromium zeigt in keinem Stand Ruckeln (alle Grenzen p95 16,8 ms, keine Long Tasks). WebKit, das wie Safari auf dem
  Hauptthread malt, ruckelte unter Last (andere Prozesse, wie auf Marcs Mac): `hm-zeile → anlaesse` p95 61 / max 138–330 ms,
  `(anlaesse)` bis 730 ms, `ueber → anfrage` p95 132 / max 267 ms. Mit gesperrtem Schwarm verschwanden diese Spitzen, ohne Show-Folge
  und ohne Punktübergänge nicht. Ursache im Schwarm: Er legte sein Canvas bei jedem Abflug, jeder Landung und jedem Mitwandern neu an
  (`cv.width = …`), die Flugfläche seitenbreit × 1,7 Bildschirmhöhen in Pixeldichte 1,5 (5,0 Mio. Pixel bei 1440 px, 7,9 bei 1920).
  Gezählt beim Durchscrollen der Startseite: 9 bzw. 13 Neuanlagen mit zusammen 33 bzw. 70 Mio. Pixeln.
- **Änderung:** zwei feste Flächen (Flug in Pixeldichte 1, Bühne bis 1,5), Lage nur per `transform`, neu angelegt nur bei neuer
  Pixelgröße. Danach: 5 bzw. 4 Neuanlagen mit 5,1 bzw. 6,9 Mio. Pixeln, größte Fläche 2,2 bzw. 3,5 Mio. Pixel. Dazu ist die
  Himmelszeile entfernt. Der Textplaner war dort schon vorberechnet und kein Faktor.
- **Gemessen nachher** (WebKit, Median aus 3 Läufen, vorher und nachher abwechselnd unter derselben Last): 1440 px `(anlaesse)` max
  59 → 15 ms, `anlaesse → warum-drohnen` max 50 → 21 ms; 1920 px fiel der alte Stand ab `warum-drohnen` dauerhaft auf halbe Bildrate
  (p50 33 ms bis zum Seitenende), der neue hält überall p50 17 / p95 18 ms. Damals unverändert (behoben, Abschnitt „Konfigurator-Teaser“ unten): `ablauf → preise` max 93–141 ms auch ohne
  Schwarm; die Spitze kommt vom Konfigurator-Teaser in `#preise`.
- **Wächter:** `npm run perf:start` misst die Grenzen der Startseite (Chromium, GPU, 4×, 1440 px): je Grenze p95 ≤ 17,5 ms, höchstens
  ein ausgelassener Frame (max ≤ 34 ms, bei 60 Hz ist 33,4 ms genau ein Frame zu spät), keine Long Tasks > 50 ms.
  `scripts/himmel-perf.test.mjs` wacht über die Quelltext-Regeln (zwei Flächen, Neuanlegen nur bei neuer Größe, Verdrängung statt
  Aufleuchten, keine Himmelszeile).
- **Startseite Lighthouse** nach Runde 5 (mobil, lokal, `astro preview`, je 6 Läufe abwechselnd mit dem Runde-4-Stand `dababaf`):
  beide 99 Punkte, LCP 2,112 s (Standbild), TBT 0, CLS 0.

## Konfigurator-Teaser und Preisseite: Ruckeln beim Eintritt (Nachtrag Runde 5, 18.11.2026)

- **Messwerkzeug korrigiert:** `grenzen.mjs` scrollte mit `scrollTo(0, y)`; die Seite hat `html { scroll-behavior: smooth }`.
  Chromium startete damit je Frame eine neue weiche Bewegung und kam kaum vom Fleck (Ziel 6000 px, Ist 911 px), die Frames wurden
  der Zielposition zugeordnet. Alle früheren Chromium-Werte für Grenzen unterhalb des ersten Bildschirms sind deshalb ungültig
  („Chromium zeigt in keinem Stand Ruckeln“). Jetzt `scrollTo({ top, behavior: 'instant' })`; WebKit folgte schon vorher. Damit
  misst auch `perf:start` die Startseite erstmals wirklich bis zum Ende.
- **Teaser (`#preise`, `ablauf → preise`):** Ursache war der Schriftzug FLYINGSTΛRS (Logo ab 450 Drohnen), den der Textplaner beim
  Eintritt am Stück setzte (rund 120 ms in Node, ein Frame von 95–105 ms in WebKit). Die beiden Formationen liegen jetzt
  vorberechnet in `src/data/teaser-lettering.json` (`node tools/himmel/teaser-schriftzug.mjs`, über `primeTextFormation`), der
  Planer lädt im Teaser nicht mehr. Dazu lädt der Teaser mit 1500 px Vorlauf statt 300 px, baut jedes Bild in einem eigenen Task,
  und `buildSequence` gibt den Hauptthread frei, sobald es 8 ms am Stück gerechnet hat.
- **Preisseite, Start (Chromium 4×):** Das Konfigurator-Modul wird in Stufen ausgewertet (Intl-Daten, Engine, Szenen, Inhalte,
  Bedienung, je ein Task); die Standbild-Prüfung liest die Leinwand nicht mehr zurück (`data-lit` statt `getImageData`); Sections
  unter dem Konfigurator mit `content-visibility: auto`. Die Drohnen-Zuordnung beim Bildwechsel (`assign`, show-flight.js) startet
  mit der Spaltenreduktion nach Jonker-Volgenant (gleich viele Drohnen und Plätze, Ergebnis bleibt optimal,
  `scripts/show-assign.test.mjs`); der erste Bildwechsel war bei 200 Drohnen ein Long Task von 62–83 ms.
- **Bildkarten (`warum-drohnen → projekte`):** Die Lichtpunkt-Ebenen (`dotimage.js`) entstanden im Leerlauf als ein Block je Karte
  (60–75 ms bei 4×); jetzt in Schritten von höchstens etwa 8 ms. Erst mit dem korrigierten Werkzeug sichtbar geworden.
- **Gemessen** (1440 px, Median aus 3 Läufen, vorher = Stand d3335a6): WebKit `ablauf → preise` max 105 → 17–21 ms; Chromium 4×
  `ablauf → preise` 3 Long Tasks (längster 223 ms) → keiner, `warum-drohnen → projekte` 1 (63 ms) → keiner. Werbung WebKit
  `standort → preise` max 115 → 23 ms. Preisseite Start: Long Tasks 60–84 ms in jedem Lauf → in 3 von 3 Läufen keiner.
- **Offen:** Bildwechsel des laufenden Teasers zwischen sehr verschiedenen Formen (QR, Rakete, Logo mit Schriftzug, bis 600 Drohnen)
  kosten die optimale Zuordnung auch ungedrosselt 15–90 ms; in Chromium 4× bleibt in `(preise)` ein Long Task von rund 60 ms (vorher
  62 ms), WebKit max 28–36 ms. Abhilfe wäre, die Zuordnung des nächsten Bildes während des Haltens im Leerlauf vorzurechnen.

## Punktübergänge (Runde 6, 18.11.2026)

Marc: „Not well crafted, I can see very clearly a straight line“, „not being applied consistently“, Trennlinien „really break the
effect“, Punkte zu klein (sollen wie beim Lichtpunkt-Hover auf Bildern sein), Muster in der Breite zu regelmäßig („factory built“).

- **Prinzip.** Jede Fläche mit eigener Hintergrundfarbe (`.section.alt`, `.c-setlist`, `.team-sec`) läuft
  mit `::before` nach oben und `::after` (gespiegelt, versetzt) nach unten in Punkten über ihre Kante aus. Die Punkte tragen die
  Farbe der Fläche selbst (`background-color: inherit`); der Übergang braucht die Farbe des Nachbarn nicht und ist zwischen
  gleichfarbigen Flächen unsichtbar. Liegt unter einer Farbfläche eine andere Farbfläche, deckt diese das untere Band ab und ihr
  oberes übernimmt. Gleichfarbige Flächen gehen ohne Linie ineinander über. Die Nachhaltigkeitskomponente nutzt
  `.section.alt` auf allen Seiten. Ihr warmer Verlauf setzt unter der Oberkante ein.
- **Muster.** `node tools/himmel/uebergang.mjs` erzeugt die breite Maske mit 960 × 125 und die schmale mit
  480 × 55 Kachelpixeln. Die finalen Werte sind Radius 5,8, Größenvarianz 32 %, Abstand 1,1, Kantenwelle 12 und 5,
  Wellenunruhe 59 %, Punktraster mit Chaos 0 % und Seed 11. Die periodische Kante ist auch in ihrer Steigung nahtlos.
- **Deckkraft:** Der quadratische Verlauf mit neun Stützstellen maskiert die gesamte fertige Punktfläche im SVG.
  Bei 100 % Verlauf und 100 % Ansatz reicht er von transparent an der Spitze bis voll deckend am Ansatz. Beide Werte
  kommen aus demselben Generator wie die Dashboard-Kurve. Die Maske bleibt statisch.
- **Höhe.** Das CSS zeigt 7,0625 rem breit und 3,125 rem schmal. Die intrinsische SVG-Höhe enthält zusätzlich die Welle.
  Beide Masken werden proportional auf die jeweilige Anzeigehöhe skaliert, auch in der Dashboard-Vorschau.
- **Footer** (Runde 7, 19.11.2026; Marc: „keine Divider-Line, sondern unsere Dot-Divider“): eigene Fläche `--night`, dunkler als
  Seite und Alt-Flächen, darum ist die Kante über jeder letzten Section eindeutig. Er steht in der Liste in `himmel.css` und läuft
  mit demselben `::before` (gleiche `--ueb-h`/`--ueb-maske`, also auch jede spätere Reglereinstellung) nach oben aus; ein unteres
  Band hat er nicht. Als positionierte Fläche deckt er das untere Band der letzten Section. Die Linie über dem Footer ist entfernt.
- **Keine Trennlinien an Farbwechseln:** Borders von `.section.alt`, `.c-setlist`, `.team-sec` und über dem Footer entfernt
  (`global.css`). Der Lichtschein der Team-Section setzt erst unter der Kante ein
  (sonst eigene gerade Kante).
- **Fallstrick:** `content-visibility: auto` (Preisseite) bedeutet Paint-Containment und schneidet die Bänder ab;
  Farbflächen sind dort ausgenommen (`PricingPage.astro`).
- **Wächter.** `npm run check:uebergaenge` (`tools/himmel/uebergaenge-pruefen.mjs`) prüft alle Seiten aus `dist/`. Ein Farbwechsel,
  auch bei einem reinen Verlauf, braucht sichtbare Punkte. Trennlinien an Section-Grenzen und Punkte über Inhalten gelten
  als Befund. `npm run perf:start` prüft sechs typische Seiten bei 390 und
  1440 px, `scripts/himmel-perf.test.mjs` die Quelltext-Regeln. Stand 18.11.: 77 Seiten, 368 Grenzen, 171 Farbwechsel, bei 390,
  1440 und 1920 px ohne Befund (vorher: 33 Farbwechsel ohne Übergang, 45 mit Trennlinie, Preisseite 5 abgeschnitten).
- **Karten sind keine Section-Flächen** (Runde 10, 20.11.2026, von Marc bestätigt): Eine gerahmte Fläche (Rahmen oder runde
  Ecken), die seitlich eingerückt ist, also nicht die volle Breite ihres Elternelements einnimmt, ist ein Objekt auf der Seite.
  Ihre Farbe zählt nicht als Section-Farbe, ihr Rahmen nicht als Trennlinie, sie deckt kein Band ab; es zählt die Fläche
  dahinter (`isCard()` im Prüfwerkzeug, Tests in `scripts/uebergaenge-paare.test.mjs`). Betraf die Formation der Fallstudien
  (`.c-play`, je Seite `c-story → c-play` und `c-play → c-reel`, 24 Befunde auf 12 Seiten). Keine Klassenausnahme: Eine neue
  Karte dieser Art ist automatisch erfasst, eine eingerückte Fläche ohne Rahmen bleibt eine eigene Fläche.

## Offen

- „EURE SHOW“, „EUER TAG“, „NOCH n TAGE“ und „DANKE <Vorname>“ sind Entwürfe, nicht mit FlyingStars abgestimmt; ebenso die
  Zuordnung Anlass → Motiv.
- Bewegte Inhalte über 5 s (drehende 3D-Motive, Lichtlauf alle 9 s): Die Pause-Taste im Seitenkopf hält sie an; ob das für
  WCAG 2.2.2 reicht, ist nicht geprüft.
- Kein Wächter-Test für Bewegung und Bilder von Schwarm und Show-Folge (für die Ladezeit siehe Performance).
- Show-Folge: Auswahl und Reihenfolge sind Entwürfe, nicht mit FlyingStars abgestimmt.
  Gesichtet auf der deutschen Startseite; en/nl nutzen dieselben Stücke (die Folge enthält keine Worte mehr).
