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
| Start | `#warum-drohnen` | Feuerwerksblüte, wird einmal je Besuch der Section zum Stern | keine |
| Start | `#projekte` | Galaxie | keine |
| Start | `#preise` | mit Paketkarten Wasserball, ohne Sonne; steht dort der Konfigurator (eigene Formation), bleibt der Himmel leer | Zeigen auf ein Paket: SPARK Stern, HORIZON Wasserball, ODYSSEY Atom → Mandala → Welle |
| Start | `#ueber` | Lachendes Gesicht | keine |
| alle | Formular `#inquiry-form` | „EURE SHOW“ | Anlass → Motiv, Ort → Schrift, Datum → Schrift und „NOCH n TAGE“, Paket → Drohnenzahl, `flyingstars:lead-confirmed` → „DANKE <Vorname>“, dann Stern |
| Hochzeit | `#choreografie` | Doppelherz | keine |
| Indoor | `#unterschied` | Diskokugel, höchstens 260 px | keine |
| Marken & Werbung | `#marketing`, `#agenturen` | Sportwagen, Handschlag | keine |

Ohne Bild: `#darum`, `#sicherheit`, `#nachhaltigkeit`, `#ablauf`, `#faq`. Die Show endet am Formular.
Unter 900 px spielen nur Himmelszeile, `#preise` und Formular.

**Feuerwerk → Stern:** Der Schwarm kommt als Blüte an (22 Strahlen, zu den Spitzen dichter und leicht hängend). Steht das Bild
gut anderthalb Sekunden ganz im Blick, ordnet er sich einmal zum Stern und bleibt so. Wer die Section verlässt und wiederkommt, sieht es
noch einmal; kein Dauerloop. Bei reduzierter Bewegung steht gleich der Stern.

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
- Kein Wächter-Test für den Schwarm.
