# Schrift-Labor · Der Schwarm („Himmel“)

Stand 13.11.2026, Runde 3. Ersetzt die Musterschicht aus Runde 1 (Punktlinie, Startfeld-Ecken, Wolke hinter Kästen),
die Marc als Tapete auf funktionalen Elementen abgelehnt hat. Runde 3 nach Marcs Rückmeldung zu Runde 2: „Weniger ist
mehr“, alle Zugaben „seamless, tasteful and subtle“.

## Idee

Die Seite ist eine Show. Ein Schwarm aus 300 Drohnen begleitet den Besuch vom Seitenkopf bis zur Anfrage.

1. **Ein Schwarm, viele Bilder.** Dieselben Drohnen bilden jedes Bild. Nichts entsteht, nichts verschwindet.
2. **Bilder stehen, Wechsel sind dunkel.** Neben dem Text steht das Bild still. Unterwegs fliegt der Schwarm gedimmt,
   etwa jede zehnte Drohne funkelt, das Licht geht am Ziel an (Regeln aus `docs/DESIGN.md`: lebendige Wolke, kein
   Einrasten, keine Finten).
3. **Die Seite antwortet mit dem Himmel.** Eingaben und Zeigen ändern das Bild.
4. **Nur echte Formationen.** Motive aus dem Katalog (`src/content/catalog-motifs.json`,
   `public/media/katalog/`), Schrift aus dem Einstrich-Textplaner (`src/scripts/text-formation.js`).
5. **Funktion bleibt still.** Linien, Rahmen, Raster und Icons werden nicht mit Punkten überzogen.
6. **Das Bild spricht allein.** Keine Namen, Drohnenzahlen oder Maße an den Bildern (Marc, Runde 3: Die Oberfläche ist
   voll genug).
7. **Nur mit Luft.** Ein Bild steht neben einem Section-Kopf nur, wenn es mit 40 px Abstand nichts berührt, was Blicke
   bindet (`free()` in `himmel.ts`). Zweispaltige Köpfe wie `#freigabe` bekommen deshalb kein Bild.

## Wo der Schwarm spielt

| Stelle | Bild | Reaktion (Fassung „antwortet“) |
|---|---|---|
| Himmelszeile, eingefügt nach dem Seitenkopf | Worte und Katalogbilder im Wechsel | Eingabe schreibt das Wort mit 300 Drohnen; nennt sie ein Katalogmotiv („Herz“, „Stern“, „Leuchtturm“), folgt auf das Wort das Bild. „Damit anfragen“ nimmt das Wort mit ins Formular |
| `#anlaesse` | Anstoßende Gläser | Zeigen auf eine Karte: Doppelherz, Sportwagen, Handschlag, Förderturm, Diskokugel, Mikrofon, Sektflasche |
| `#pakete` | Wasserball (HORIZON) | SPARK: Stern, 100, flach. HORIZON: Wasserball, 186, dreht sich. ODYSSEY: Atom, Mandala, Welle als Folge |
| `#projekte`, `#team` | Galaxie, Lachendes Gesicht | keine |
| Marken & Werbung: `#referenzen`, `#orte` | Sportwagen, Leuchtturm | keine |
| Formular `#inquiry-form` | „EURE SHOW“ | Anlass: Motiv. Ort: als Schrift. Datum: als Schrift, danach „NOCH n TAGE“. Paket: Drohnenzahl. Abgeschickt (`flyingstars:lead-confirmed`): „DANKE <Vorname>“, danach der Stern |

Auf schmalen Bildschirmen spielen nur Himmelszeile, Pakete (über die Reiter) und Formular.
Die Show endet am Formular; im Footer steht kein Bild.

## Schalter

`?himmel=aus | steht | fliegt | antwortet` (Leiste: „Schwarm“).

- `steht`: jede Bühne zeigt ihr Bild, nichts bewegt sich (statische Fassung, auch der Stand bei reduzierter Bewegung).
- `fliegt`: ein Schwarm wechselt beim Scrollen von Bühne zu Bühne. Er fliegt los, sobald die nächste Bühne ins Bild
  kommt (der Blick eilt dem Scrollen um 16 % der Bildschirmhöhe voraus), und startet nie weiter als rund 200 px außerhalb
  des Bildes. Flugdauer 1,4 bis 2,5 s.
- `antwortet`: zusätzlich Himmelszeile, Reaktion auf Zeigen und Eingaben, Licht am Mauszeiger, Mitnahme beim Seitenwechsel.

## Übergänge zwischen Sections

`?kante=linie | punkte` (Leiste: „Übergänge“). Wo `.section.alt` an den Grundton grenzt, ersetzt eine Punktauflösung die
Haarlinie: oben lösen sich Punkte der Fläche auf, unten tauchen Punkte des Grundtons ein. Die Maske
`public/media/labor/uebergang.svg` (576 × 128 px, 1056 Punkte, 3,7 KB gzip) entsteht mit `node tools/labor/uebergang.mjs [seed]`;
die Farben kommen aus den Tokens `--surface` und `--ground`. Folgen zwei `.alt`-Sections aufeinander, bleibt dort die Linie.

## Technik

- `src/scripts/labor/himmel.ts`, `src/styles/labor-himmel.css`. Start über `initHimmel()` in `src/scripts/labor/index.ts`.
- Ein Canvas in Seitenkoordinaten (`position: absolute`), das mit dem Inhalt scrollt. Im Flug 1,7 Bildschirmhöhen groß,
  im Stand nur so groß wie die Bühne. Stehende flache Bilder zeichnen nur beim Lichtlauf (alle 9 s) neu.
- Der Textplaner (rund 43 KB gzip) lädt, sobald eine Schrift-Formation gebraucht wird; mit der Himmelszeile ist das
  kurz nach dem Seitenstart.
- Pixeldichte höchstens 1,5, vorgerenderte Lichtpunkte, `html.motion-paused` und reduzierte Bewegung werden beachtet.
- Messung (Chromium, 1440 px, 8 s Stillstand, Einzelläufe mit Streuung): 6 bis 14 ms Skriptzeit je Sekunde mit Schwarm,
  1 bis 2 ms ohne. Werkzeug: `tools/labor/perf.mjs`.

## Offen

- Die Himmelszeile ist ein neuer Abschnitt mit eigenem Text (Entwurf, nicht mit Moritz abgestimmt). Dasselbe gilt für
  „NOCH n TAGE“ und „DANKE <Vorname>“.
- Zuordnung Anlass → Motiv und die Motive je Section sind ein Vorschlag.
- Nicht geprüft: echtes Safari 18.6, EN/NL, Seiten außer Startseite und Marken & Werbung. Der Dank am Himmel ist nur
  über das Testereignis `hm:finale` geprüft (Knopf „Anfrage-Finale“ in der Leiste), nicht mit einem echten Versand.
- Bewegte Inhalte über 5 s (drehende 3D-Motive, Lichtlauf alle 9 s): Die Pause-Taste im Seitenkopf hält sie an; ob das für
  WCAG 2.2.2 reicht, ist nicht geprüft.
- Kein Wächter-Test für den Schwarm. `docs/DESIGN.md` nennt Space Grotesk und verbietet weitere Webfonts und den
  „Lichtlauf durch Schriftachsen“; das Labor weicht davon bewusst ab und ändert das Designdokument nicht.
