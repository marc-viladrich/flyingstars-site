# Schrift-Labor · Geist Pixel mit weichen Ecken („FS Pixel Weich“)

Stand 13.11.2026, Runde 3. Demo, keine fertige Schrift.

## Anlass

Marc entscheidet zwischen Space Grotesk und Geist Pixel. Geist Pixel hat mehr Charakter, endet im gefüllten, lesbaren
Zustand aber in harten Pixelkanten; FlyingStars steht für runde Lichtpunkte. Frage: Lässt sich „ein Regler“ drehen, der
die Kanten glättet?

## Befund

- Geist Pixel bringt die Achse `ELSH` mit (1 Quadrat, 20 Kreis, 40 Raster, 60 Dreieck, 80 Linie). Sie formt jeden Pixel
  einzeln um. Runde Einzelpunkte gibt es also schon; die gefüllte Form bleibt eckig.
- Die Ableitung rundet die Ecken der **zusammengefügten** Buchstabenform: Pixel je Zeichen auf dem Raster einsammeln
  (Modul 38 Einheiten bei 1000 UPM), zu Flächen vereinen, jede Ecke mit einem Bogen ersetzen. Achse `ROND` 0–100
  (0 sieht aus wie das Quadrat von Geist Pixel, 100 = Radius eines halben Moduls).
- Ergebnis: `public/fonts/labor/pixel-weich/fs-pixel-weich.woff2`, 15,6 KB (Geist Pixel variabel: 29,5 KB), 407 Zeichen,
  gleiche Laufweiten und Zeichenbelegung wie die Quelle. Bauskript: `tools/labor/weich/build.py`.

## Im Labor

`?schrift=pixel-weich` (Leiste: „Geist Pixel, weiche Ecken“), `?ecken=halb | voll`. Der Auftritt der Schlagzeilen beginnt in
Geist Pixel (Linien, Punkte, gefüllt) und wechselt im gefüllten Zustand unsichtbar die Datei, danach werden die Ecken weich
(`@keyframes lab-weich` in `src/styles/labor.css`). Dafür lädt die Seite heute beide Dateien.

## Lizenz

Geist Pixel steht unter der SIL Open Font License 1.1. Ableitungen sind erlaubt und müssen unter derselben Lizenz
weitergegeben werden; `OFL.txt` liegt bei. Die Ableitung trägt einen eigenen Namen.

## Offen

- Eine Datei mit beiden Zuständen (Einzelpunkte und weich gefüllt) ist gebaut, aber nicht eingebunden: Achsen `FILL` und
  `ROND`, Bauskript `tools/labor/zwei/build.py`, Ergebnis 96 KB (je Pixel eine eigene Kontur, 408.852 Punkte). Das ist
  mehr als doppelt so viel wie die beiden Dateien zusammen (16 + 29 KB), und WebKit zeigt bei 150 px feine Zacken an den
  Außenkanten. Der Weg mit zwei Dateien bleibt deshalb der bessere; ohne Auftritt reichen die 16 KB allein.
- Jedes Zeichen einzeln ansehen (Diagonalen, Akzente, kleine Öffnungen bei e, a, ß); bisher Stichproben in der Probe
  `public/fonts/labor2/geist-pixel-weich/probe.html` (Ordner nicht im Repository).
- Hinting und Darstellung in Marcs Safari 18.6 und unter Windows.
- `docs/DESIGN.md` nennt den „Lichtlauf durch Schriftachsen“ unter „Bewusst nicht (mehr)“; das Labor weicht bewusst ab.
