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
| Start | `#projekte` | Maske der Bokkenrijders (Kundenformation aus dem ersten Referenzbild, statt der Galaxie: Marc, 18.11.: Spirale „zu lame“) | keine |
| Start | `#preise` | mit Paketkarten Wasserball, ohne Sonne; steht dort der Konfigurator (eigene Formation), bleibt der Himmel leer | Zeigen auf ein Paket: SPARK Stern, HORIZON Wasserball, ODYSSEY Atom → Mandala → Welle |
| Start | `#ueber` | Lachendes Gesicht | keine |
| alle | Formular `#inquiry-form` | „EURE SHOW“ | Anlass → Motiv, Ort → Schrift, Datum → Schrift und „NOCH n TAGE“, Paket → Drohnenzahl, `flyingstars:lead-confirmed` → „DANKE <Vorname>“, dann Stern |
| Hochzeit | `#choreografie` | Doppelherz | keine |
| Indoor | `#unterschied` | Indoor-Reihe (eigene Bühne, siehe unten); die Diskokugel des Schwarms findet dort keinen Platz mehr | keine |
| Marken & Werbung | `#marketing`, `#agenturen` | Sportwagen, Handschlag | keine |

Ohne Bild: `#darum`, `#sicherheit`, `#nachhaltigkeit`, `#ablauf`, `#faq`. Die Show endet am Formular.
Unter 900 px spielen nur Himmelszeile, `#warum-drohnen`, `#preise` und Formular.

## Show-Folge bei `#warum-drohnen` (Runde 3, 17.11.2026; Runde 4, 18.11.2026)

Marc, 15.11.: „quasi never-ending loop … Spark-Horizon-Odyssey-Transformationen und -Eskalationen“. 17.11.: „Die Motive müssen
viel schneller a) sich bewegen und b) rotieren … Das Feuerwerk-Finale kann gerne am Anfang kommen. Aber dann relativ schnell
eskalieren in diese großen, beeindruckenden Sachen.“ Glühbirne raus, dazu eine feste Wunschliste. 18.11. zur Umdrehung: „Das muss
nicht, das nimmt dem ganzen voll die Dynamik weg, dauert zu lange … Und das Riesenrad in 3D kann sich gerne drehen wie im
Konfigurator“; zu den Wechseln: „Können auch etwas schneller sein.“ Code: `src/scripts/himmel/folge.js`.

- **Auftakt:** Der Schwarm kommt wie bisher als Feuerwerksblüte an (der Knall von gestern, gut 1 s) und übergibt seine 300 Drohnen
  an die Show-Folge, die mit der Engine des Konfigurators spielt (`show-field.js`, `show-scenes.js`, `scenes/`). Beim ersten Besuch
  folgt unser Feuerwerk (Finale aus dem Konfigurator), dann die Maske der Bokkenrijders, danach das Logo flach und als Körper. Wer
  zurückkommt, sieht die Blüte und dann das nächste Stück.
- **Stücke** (Repertoire = Marcs Wunschliste, `PIECES` in `folge.js`), drei Arten:
  - *raum* – ein räumliches Bild: Maske der Bokkenrijders (`devilStory`, echte 3D-Formation) schwenkt an; die Kugel
    (`sphere3d`, `scenes/kugel.js`) dreht sich um ihre eigene Achse
  - *esc* – erst flach (SPARK, ~100 Drohnen, 1 s), dann fliegen dieselben Drohnen in den Körper (HORIZON), der anschwenkt;
    die hinzukommenden steigen dunkel von unten auf und leuchten erst an ihrem Platz: Logo (`logo` → `logo3d`), Fernsehturm,
    Kolibri, Schneeflocke → Lichterbaum, Wappen mit Stern → Wappen „125“ mit wehender Fahne (`shield` → `shield3d`, 300),
    Riesenrad (`wheel2d` 150 → `wheel3d` 300, dreht sich um die Nabe, kein Schwenk)
  - *story* – eine Geschichte in Akten (ODYSSEY, 300), gerafft auf etwa 1,3 s je Akt: QR-Code (`qrStory`), Delfine (`dolphinStory`
    ab dem Sprung), Buch (`bookStory`), Musik (`harpStory`: Harfe, Noten), Tänzerin (`dancerStory`), Feuerwerk (`fireworkStory`)
- **Schwenk statt Umdrehung (Runde 4):** `restage()` legt das letzte Bild eines räumlichen Stücks auf eine eigene `steadyClock`:
  Es kommt bei −20° an und schwenkt in seiner Standzeit in einer Richtung nach +20° (`SWING`), langsam an und aus, keine Finte.
  Standzeit 1,5 s plus Anlauf und Bremsen (vorher 2,6 s mit einer ganzen Umdrehung). Das Riesenrad nutzt die Drehung aus
  `festival.js` (`turnWheel`, Gondeln bleiben hängend) mit 2,6-fachem Tempo und steht dafür 3,4 s.
- **Reihenfolge:** beim ersten Besuch fest, danach gemischt ohne Zurücklegen: nie dieselbe Art hintereinander und keine
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
- **Größe:** Breit rechts neben dem Text, 64 px Abstand, mit `free()`: bei 1440 px etwa 465 × 445 px, bei 1920 px bis 690 px breit.
  Jedes Motiv wird so gezoomt, dass es die Bühne in Breite oder Höhe zu 86 % füllt; bei Bildern mit eigener Uhr (Schwenk,
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
- **Engine (additiv, Konfigurator und Teaser setzen nichts davon):** `show-field.js` – `outside`, `drones(n)`/`radius()`
  (Übergabe), `flightRate` (Tempo der Show-Uhr nur in Übergängen), `flightMax` (längster Anflug in echten Sekunden), `joinLate`
  (dunkel hinzukommende Drohnen leuchten erst kurz vor ihrem Platz), `lightScale` (größere Lichter, Indoor), `data-flight` am
  Canvas (Anflugdauer in Show-Sekunden, für Prüfwerkzeuge). `text-formation.js` – `primeTextFormation()`/`hasTextFormation()`.
  `scenes/kugel.js` (`sphere3d`), `scenes/indoor.js` (Indoor-Motive).

### Indoor-Reihe bei `#unterschied` (Runde 4, 18.11.2026)

Marc zur leeren Icon-Karte neben „Faszinierend wie Feuerwerk, sicher wie Laser“: „Hier würde eigentlich auch eine Animations-Reihe
wie auf der Startseite sehr gut passen.“ Dieselbe Technik, `createFolge(canvas, { variant: "indoor" })`, kein zweites System.

- **Motive** (`scenes/indoor.js`, 50 Drohnen wie eine echte Indoor-Show): Herz (Herzschlag aus Licht), Welle (läuft durch die
  Linie), Initialen „L ♥ M“ (Lichtlauf schreibt nach), Stern (dreht sich in der Bildebene), Ring mit Stein (schwenkt, zeigt die
  Tiefe), zwei Achtelnoten (wiegen sich). Feste Runde, je etwa 2 s Standzeit, Wechsel durch die lebendige Wolke in etwa 0,5 s.
  Das FlyingStars-Zeichen las sich mit 50 Punkten nicht und ist darum nicht dabei.
- **Bühne:** `show: indoor` am Abschnitt (`Sustainability.astro`), rechts neben dem Text, ohne Rahmen und Punktmuster. Das Canvas
  reicht oben und unten über die Bühne hinaus (CSS), Lichter 1,6-mal so groß wie auf der Startseite (`lightScale`). Weil das
  Canvas bis neben die Überschrift reicht, findet der Schwarm dort keinen freien Platz mehr (`free()`); die frühere Diskokugel bei
  `#unterschied` entfällt damit, es gibt nur ein bewegtes Element in der Section.
- **Start:** Modul lädt, wenn die Bühne näher als 300 px ist (`whenNear`); das erste Motiv entsteht in Leerlauf-Tasks; los geht es,
  wenn ein Drittel der Bühne im Bild ist: Die Drohnen steigen dunkel von unten auf und bilden das Herz. Pause-Taste und reduzierte
  Bewegung: das Herz steht. Ohne JavaScript bleibt die Bühne weg, der Text steht allein.

## Technik

- `src/scripts/himmel/index.ts` setzt die Himmelszeile (`zeile.ts`), startet `lichtlauf.ts` und lädt `schwarm.ts` (Bühnenplan in
  `plan()`) erst nach dem ersten Bild nach (siehe Performance); `src/styles/himmel.css`.
- Ein Canvas in Seitenkoordinaten (`position: absolute`), das mit dem Inhalt scrollt. Im Flug 1,7 Bildschirmhöhen groß, im Stand nur
  so groß wie die Bühne. Stehende flache Bilder zeichnen nur beim Lichtlauf (alle 9 s) neu.
- Feste Worte liegen vorberechnet in `public/media/himmel/texte-*.json` (`tools/himmel/texte-vorberechnen.mjs`); der Textplaner
  (rund 43 KB gzip) lädt erst für eigene Eingaben (Himmelszeile, Formular).
- Pixeldichte höchstens 1,5, vorgerenderte Lichtpunkte. Pause und reduzierte Bewegung: jede Bühne zeigt ihr Bild, nichts fliegt;
  die Umschaltung greift ohne Neuladen.
- Seitenwechsel: Lage und Farbe der Drohnen bleiben für einige Sekunden in `sessionStorage` (`flyingstars:himmel`), damit der
  Schwarm auf der nächsten Seite von dort weiterfliegt. Sonst wird kein Zustand gespeichert.
- Skriptzeit messen: `node tools/himmel/perf.mjs <url> <selector>`. Übergangsmaske neu erzeugen: `node tools/himmel/uebergang.mjs [seed]`.

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
  Motive lädt der Schwarm erst, wenn ihre Bühne näher als gut eine Bildschirmhöhe ist. Die Himmelszeile (`zeile.ts`, gut 1 KB)
  steht weiter sofort, damit beim späteren Laden nichts springt.
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

## Offen

- Texte der Himmelszeile, „NOCH n TAGE“ und „DANKE <Vorname>“ sind Entwürfe, nicht mit FlyingStars abgestimmt; ebenso die
  Zuordnung Anlass → Motiv.
- Die Himmelszeile entsteht per Skript (`zeile.ts`, sofort beim Start, vor dem Schwarm); ohne JavaScript fehlt sie (gewollt),
  mit JavaScript verschiebt sie den Inhalt darunter einmal beim Start (unterhalb des ersten Bildschirms, ohne CLS gemessen).
- Bewegte Inhalte über 5 s (drehende 3D-Motive, Lichtlauf alle 9 s): Die Pause-Taste im Seitenkopf hält sie an; ob das für
  WCAG 2.2.2 reicht, ist nicht geprüft.
- Kein Wächter-Test für Bewegung und Bilder von Schwarm und Show-Folge (für die Ladezeit siehe Performance).
- Show-Folge: Auswahl und Reihenfolge sind Entwürfe, nicht mit FlyingStars abgestimmt. Indoor-Reihe: Initialen „L ♥ M“ sind
  ein Beispiel, keine echten Kundeninitialen.
  Gesichtet auf der deutschen Startseite; en/nl nutzen dieselben Stücke (die Folge enthält keine Worte mehr).
