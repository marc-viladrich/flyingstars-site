# Himmel

Stand 15.11.2026. Fester Bestandteil der Seite seit dem Abschluss des Schrift-Labors (Runden 1–3, 13.11.2026; Stand in der
Git-Historie, Commit `b31d7c9`). Verbindliche Regeln: `docs/DESIGN.md` → „Himmel“.

## Was dazugehört

- **Schwarm:** ein Schwarm aus 300 Drohnen begleitet den Besuch von Bühne zu Bühne. Bilder stehen, Wechsel sind dunkel.
- **Himmelszeile:** eingefügt direkt nach `#kundinnen` (Startseite): ein Stück Himmel über die Inhaltsbreite und eine Eingabe.
- **Punktübergänge** zwischen `.section.alt` und dem Grundton.
- **Lichtlauf der H1**, einmal beim Laden, nur über Helligkeit.

## Bühnenplan

Eine Bühne spielt nur, wenn ihre ID im DOM steht und neben dem Section-Kopf Platz ist (`free()`); sonst passiert dort nichts.

| Seite | Bühne | Bild | Reaktion |
|---|---|---|---|
| Start | Himmelszeile nach `#kundinnen` | Worte und Katalogbilder im Wechsel | Eingabe als Formation, genanntes Motiv („Herz“) folgt als Bild |
| Start | `#anlaesse` | Anstoßende Gläser | Zeigen auf eine Karte: Unternehmen → Sportwagen, Agenturen → Handschlag, Gemeinden → Förderturm, Konzerte & Festivals → Mikrofon, Privat → Doppelherz, Indoor → Diskokugel. Zuordnung über Kartenkicker, dann Link-Ziel, dann Kartentitel |
| Start | `#warum-drohnen` | Feuerwerksblüte, danach die Show-Folge (siehe unten), auch unter 900 px | keine |
| Start | `#projekte` | Galaxie | keine |
| Start | `#preise` | mit Paketkarten Wasserball, ohne Sonne; steht dort der Konfigurator (eigene Formation), bleibt der Himmel leer | Zeigen auf ein Paket: SPARK Stern, HORIZON Wasserball, ODYSSEY Atom → Mandala → Welle |
| Start | `#ueber` | Lachendes Gesicht | keine |
| alle | Formular `#inquiry-form` | „EURE SHOW“ | Anlass → Motiv, Ort → Schrift, Datum → Schrift und „NOCH n TAGE“, Paket → Drohnenzahl, `flyingstars:lead-confirmed` → „DANKE <Vorname>“, dann Stern |
| Hochzeit | `#choreografie` | Doppelherz | keine |
| Indoor | `#unterschied` | Diskokugel, höchstens 260 px | keine |
| Marken & Werbung | `#marketing`, `#agenturen` | Sportwagen, Handschlag | keine |

Ohne Bild: `#darum`, `#sicherheit`, `#nachhaltigkeit`, `#ablauf`, `#faq`. Die Show endet am Formular.
Unter 900 px spielen nur Himmelszeile, `#warum-drohnen`, `#preise` und Formular.

## Show-Folge bei `#warum-drohnen` (Runde 3, 17.11.2026)

Marc, 15.11.: „quasi never-ending loop … Spark-Horizon-Odyssey-Transformationen und -Eskalationen“. 17.11.: „Die Motive müssen
viel schneller a) sich bewegen und b) rotieren … Das Feuerwerk-Finale kann gerne am Anfang kommen. Aber dann relativ schnell
eskalieren in diese großen, beeindruckenden Sachen.“ Glühbirne raus, dazu eine feste Wunschliste. Code: `src/scripts/himmel/folge.js`.

- **Auftakt:** Der Schwarm kommt wie bisher als Feuerwerksblüte an (der Knall von gestern, gut 1 s) und übergibt seine 300 Drohnen
  an die Show-Folge, die mit der Engine des Konfigurators spielt (`show-field.js`, `show-scenes.js`, `scenes/`). Beim ersten Besuch
  folgt unser Feuerwerk (Finale aus dem Konfigurator, gut 4 s), nach etwa 7,5 s dreht sich die Maske der Bokkenrijders, danach
  das Logo flach und als Körper. Wer zurückkommt, sieht die Blüte und dann das nächste Stück.
- **Stücke** (Repertoire = Marcs Wunschliste, `PIECES` in `folge.js`), drei Arten:
  - *spin* – ein räumliches Bild, das sich in seiner Standzeit (2,6 s) einmal ganz um die Hochachse dreht, langsam an und aus:
    Maske der Bokkenrijders (`devilStory`, echte 3D-Formation), Medaille „25“ mit Band (`medalStory`, dreht sich wie eine Münze),
    Kugel (Katalog, HORIZON)
  - *esc* – erst flach (SPARK, ~100 Drohnen, 1,3 s), dann fliegen dieselben Drohnen in den Körper (HORIZON, 200), der sich dreht;
    die 100 hinzukommenden steigen dunkel von unten auf und leuchten erst an ihrem Platz: Logo (`logo` → `logo3d`), Fernsehturm,
    Kolibri, Riesenrad, Schneeflocke → Lichterbaum
  - *story* – eine Geschichte in Akten (ODYSSEY, 300), gerafft auf etwa 1,6 s je Akt: QR-Code (`qrStory`), Delfine (`dolphinStory`
    ab dem Sprung), Buch (`bookStory`), Musik (`harpStory`: Harfe, Noten), Tänzerin (`dancerStory`), Feuerwerk (`fireworkStory`)
- **Reihenfolge:** beim ersten Besuch fest (Feuerwerk, Maske, Logo, Kugel, Delfine, Fernsehturm, QR, Medaille, Musik, Kolibri,
  Buch, Baum, Tänzerin, Riesenrad, Feuerwerk; alle 14 in rund 115 s), danach gemischt ohne Zurücklegen: nie dieselbe Art
  hintereinander und keine Formfamilie (rund, hoch, Tier, Gesicht …) aus den beiden Stücken davor.
- **Nicht mehr dabei:** flache Katalogbilder als Füllung, Worte („WOW“), Glühbirne, Pokal, Fußball, Drache, Ringe, Herz, Lotus,
  Vorhang, Theatermasken, Uhr, Sekt, Klee, Rakete, Kompass.
- **Tempo** (Werte in `folge.js`): Wechsel laufen mit Show-Uhr-Tempo 2,4 (`flightRate`), also in etwa 0,6–0,9 s statt 1,3–2 s.
  Räumliche Bilder bewegen sich 1,6-mal so schnell wie im Konfigurator und drehen sich zusätzlich einmal ganz (`spin()`, eigene
  `steadyClock`, keine Finten). Geschichten laufen mindestens 1,8-mal so schnell. Stehen bleibt nichts länger als gut 3 s.
- **Größe:** Breit rechts neben dem Text, 64 px Abstand, mit `free()`: bei 1440 px etwa 465 × 445 px, bei 1920 px bis 690 px breit.
  Jedes Motiv wird so gezoomt, dass es die Bühne in Breite oder Höhe zu 86 % füllt; drehende Motive nach ihrem größten Abstand zur
  Drehachse, damit sie in der Drehung nicht anstoßen. Unter 900 px spielt die Folge in einer Fläche unter dem Text; deren Höhe
  reserviert `himmel.css` von Anfang an (`#warum-drohnen::after`, nur mit `html.reveal` bzw. `html.motion-paused`).
- **Übergabe:** Das Feld der Folge (eigenes Canvas in der Himmel-Ebene) stellt seine Blüte unsichtbar bereit; der Schwarm fliegt
  genau auf deren Punkte und in deren Lichtgröße, dann schaltet die Folge sichtbar. Wird eine andere Bühne dran, übernimmt der
  Schwarm Lage, Licht und Farbe jeder Drohne und fliegt weiter.
- **Rücksicht:** Das Feld zeichnet nur, solange sein Canvas im Bild ist, und steht, sobald der Schwarm übernommen hat. Pause
  (`html.motion-paused`) und reduzierte Bewegung: Die Folge geht aus, der Schwarm zeigt dort stehend den Stern. Das Modul lädt
  erst, wenn die Section näher als zwei Bildschirmhöhen ist; bis dahin (oder wenn es nicht lädt) gilt das alte Verhalten.
- **Vorbereitung in kleinen Stücken:** Zum Einstieg wird nur das erste Stück gebaut (beim ersten Besuch das Feuerwerk). Jedes
  weitere Bild entsteht in einem eigenen Task (`requestIdleCallback`, Safari `setTimeout`), ebenso die Lichtlauf-Reihenfolge je
  Bild; vorgebaut wird ein Stück, solange die Bühne nicht spielt, zwei, wenn sie spielt. Die „25“ der Medaille liegt vorberechnet
  in `folge.js` (`primeTextFormation()` in `text-formation.js`); ohne sie lädt der Textplaner und rechnet 0,3–0,5 s am Stück.
- **Gemessen** (17.11.2026, Produktions-Build, Chromium, 390 × 844, CPU 4× gedrosselt, `PerformanceObserver('longtask')` und
  `long-animation-frame`, 30 s ab Scrollbeginn bis zur Bühne, je 3 Läufe): vorher 630 / 717 / 514 ms Long Tasks, längster
  363–522 ms (Textplaner für das Wort der alten Runde, plus 55–124 ms Katalog); nachher 103 / 174 / 50 ms, längster 50–60 ms
  (Frames des Feldes beim Start eines Bildes, nicht die Vorbereitung). Früherer Wert für die laufende Folge
  (`tools/himmel/perf.mjs`, 15.11.): 14,7 ms Skriptzeit je Sekunde, Teaser bei `#preise` 35 ms/s.
- **Engine (additiv, Konfigurator und Teaser setzen nichts davon):** `show-field.js` – `outside` (woher hinzukommende Drohnen
  kommen), `drones(n)`/`radius()` (Übergabe), `flightRate` (Tempo der Show-Uhr nur in Übergängen), `joinLate` (dunkel
  hinzukommende Drohnen leuchten erst kurz vor ihrem Platz, überzählige gehen gleich zu Beginn des Rückflugs aus; behebt die
  lose Punktwolke unter dem Bild beim Wechsel 2D → 3D). `text-formation.js` – `primeTextFormation()`/`hasTextFormation()`;
  `scenes/jubilaeum.js` lädt den Textplaner nur, wenn die Zahl nicht vorliegt.

## Technik

- `src/scripts/himmel/index.ts` startet `schwarm.ts` (Bühnenplan in `plan()`) und `lichtlauf.ts`; `src/styles/himmel.css`.
- Ein Canvas in Seitenkoordinaten (`position: absolute`), das mit dem Inhalt scrollt. Im Flug 1,7 Bildschirmhöhen groß, im Stand nur
  so groß wie die Bühne. Stehende flache Bilder zeichnen nur beim Lichtlauf (alle 9 s) neu.
- Der Textplaner (rund 43 KB gzip) lädt, sobald eine Schrift-Formation gebraucht wird; mit der Himmelszeile kurz nach dem Start.
- Pixeldichte höchstens 1,5, vorgerenderte Lichtpunkte. Pause und reduzierte Bewegung: jede Bühne zeigt ihr Bild, nichts fliegt;
  die Umschaltung greift ohne Neuladen.
- Seitenwechsel: Lage und Farbe der Drohnen bleiben für einige Sekunden in `sessionStorage` (`flyingstars:himmel`), damit der
  Schwarm auf der nächsten Seite von dort weiterfliegt. Sonst wird kein Zustand gespeichert.
- Skriptzeit messen: `node tools/himmel/perf.mjs <url> <selector>`. Übergangsmaske neu erzeugen: `node tools/himmel/uebergang.mjs [seed]`.

## Offen

- Texte der Himmelszeile, „NOCH n TAGE“ und „DANKE <Vorname>“ sind Entwürfe, nicht mit FlyingStars abgestimmt; ebenso die
  Zuordnung Anlass → Motiv.
- Die Himmelszeile entsteht per Skript; ohne JavaScript fehlt sie (gewollt), mit JavaScript verschiebt sie den Inhalt darunter
  einmal beim Start.
- Bewegte Inhalte über 5 s (drehende 3D-Motive, Lichtlauf alle 9 s): Die Pause-Taste im Seitenkopf hält sie an; ob das für
  WCAG 2.2.2 reicht, ist nicht geprüft.
- Kein Wächter-Test für den Schwarm und die Show-Folge.
- Show-Folge: Auswahl und Reihenfolge sind Entwürfe, nicht mit FlyingStars abgestimmt. „Jubiläum mit dem Button“ ist als Medaille
  „25“ mit Band gedeutet (nicht bestätigt). Riesenrad und Kugel lesen sich bei 200 Drohnen schwächer als die übrigen Stücke.
  Gesichtet auf der deutschen Startseite; en/nl nutzen dieselben Stücke (die Folge enthält keine Worte mehr).
