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

## Show-Folge bei `#warum-drohnen` (16.11.2026)

Marc, 15.11.: „deutlich nicere Animationen und viiiiel mehr Auswahl … quasi never-ending loop … unsere
Spark-Horizon-Odyssey-Transformationen und -Eskalationen sollten hier gut sichtbar werden.“ Code: `src/scripts/himmel/folge.js`.

- **Auftakt:** Der Schwarm kommt wie bisher als Feuerwerksblüte an (der Knall von gestern, gut 1 s). Dann übergibt er seine 300
  Drohnen an die Show-Folge, die mit der Engine des Konfigurators spielt (`show-field.js`, `show-scenes.js`, `scenes/catalog.js`):
  dieselben Motive, Übergänge (lebendige Wolke, Flug mit Objektpermanenz, kein Einrasten, keine Finten), Motivaktionen
  (Smiley zwinkert, Handschlag, Konfettikanone, Gläser stoßen an) und Paketfarben (weiße Drohnen leuchten im Paketton des Akts).
- **Runden** (je etwa 40–45 s), jedes Mal mit anderen Motiven:
  - SPARK (~100 Drohnen): zwei flache Katalogbilder, jede zweite Runde eines davon ein Wort, dann das SPARK-Bild des Leitmotivs
  - HORIZON (~200): das Leitmotiv wird zum Körper (dieselben Drohnen fliegen um, 100 steigen von unten dazu), danach ein räumliches
    Katalogmotiv, das sich dreht
  - ODYSSEY (300): das Leitmotiv als erzählte Geschichte in Akten aus dem Konfigurator, höchstens etwa 14 s
  - danach sinken 200 Drohnen nach unten und gehen aus, die nächste Runde beginnt klein
- **Auswahl:** 38 flache Katalogmotive für SPARK (nach Sichtung bei ~100 Drohnen lesbar), 8 räumliche für HORIZON, 22 Leitmotive
  aus dem Konfigurator (Rakete, Glühbirne, Pokal, Fußball, Fernsehturm, Kompass, Kolibri, Riesenrad, Delfin, Drache, Ringe, Herz,
  Lotus, Buch, Vorhang, Masken, Noten, Tanz, Uhr, Lichterbaum, Sekt, Klee), Worte „WOW“, „HALLO“, „PSST“ (en: „HELLO“, „SHH“).
  Nicht dabei: Feuerwerk (die Section sagt, das war gestern), Wappen und Logo, Motive ab 450 Drohnen, Zahlen („30 Jahre“), Halloween.
- **Mischen mit Regeln:** je Gruppe ziehen ohne Zurücklegen (kein Motiv zweimal, bevor alle dran waren), kein Bild mit demselben
  Thema wie eines der beiden davor (Thema je Motiv in `folge.js`). Die Reihenfolge ist bei jedem Besuch neu.
- **Tempo:** Bilder stehen gut 3 s, Wechsel 1,3–2 s (Tempo 1,25 gegenüber dem Konfigurator, Wolke 0,5). Geschichten laufen
  schneller, wenn sie sonst länger als 14 s dauern würden.
- **Größe:** Breit rechts neben dem Text, 64 px Abstand, mit `free()`: bei 1440 px etwa 465 × 445 px, bei 1920 px bis 690 px breit.
  Jedes Motiv wird so gezoomt, dass es die Bühne in Breite oder Höhe zu 86 % füllt (das Feld des Konfigurators passt sonst alles in
  ein Querformat, hohe Motive blieben klein). Unter 900 px spielt die Folge in einer Fläche unter dem Text; deren Höhe reserviert
  `himmel.css` von Anfang an (`#warum-drohnen::after`, nur mit `html.reveal` bzw. `html.motion-paused`), es springt nichts.
- **Übergabe:** Das Feld der Folge (eigenes Canvas in der Himmel-Ebene) stellt seine Blüte unsichtbar bereit; der Schwarm fliegt
  genau auf deren Punkte und in deren Lichtgröße, dann schaltet die Folge sichtbar. Wird eine andere Bühne dran, übernimmt der
  Schwarm Lage, Licht und Farbe jeder Drohne und fliegt weiter (Farbe und Lichtgröße wandern im Flug). Wer zurückkommt, sieht
  wieder die Blüte und dann eine neue Runde.
- **Rücksicht:** Das Feld zeichnet nur, solange sein Canvas im Bild ist, und steht, sobald der Schwarm übernommen hat. Pause
  (`html.motion-paused`) und reduzierte Bewegung: Die Folge geht aus, der Schwarm zeigt dort stehend den Stern. Das Modul lädt
  erst, wenn die Section näher als zwei Bildschirmhöhen ist; bis dahin (oder wenn es nicht lädt) gilt das alte Verhalten:
  Blüte, die einmal zum Stern wird.
- **Gemessen** (`tools/himmel/perf.mjs`, Chromium, 1440 px, Stand mit HEAD vom 15.11.): bei laufender Folge 14,7 ms Skriptzeit je
  Sekunde (Task 80 ms/s), zum Vergleich der Konfigurator-Teaser bei `#preise` 35 ms/s (157 ms/s).
- **Engine:** `show-field.js` hat dafür zwei additive Optionen bekommen, die Konfigurator und Teaser nicht nutzen: `outside`
  (woher hinzukommende Drohnen kommen; hier von unten als lockerer Schwarm, eine Reihe läse sich als Fremdkörper) und
  `drones(n)`/`radius()` (Lage, Licht, Farbe und Lichtgröße für die Übergabe).

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
- Show-Folge: Auswahl, Themen und die Worte sind Entwürfe. Die von unten aufsteigenden Drohnen sind beim Übergang SPARK → HORIZON
  kurz als lockere Punktwolke unter dem Bild zu sehen (gewollt: sie fliegen dazu); falls das stört, später heller erst ab halber
  Strecke. Die Folge ist nur auf der deutschen Startseite gesichtet; en/nl nutzen dieselbe Engine mit übersetzten Worten.
