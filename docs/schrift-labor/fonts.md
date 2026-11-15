# Schriftlabor: geprüfte Fontdateien

Stand: 13. November 2026. Prüfung der Originaldateien mit fontTools; Glyphenprüfung zusätzlich an jeder fertigen WOFF2. Keine Instanzierung variabler Fonts.

Subset: `U+0000-007F,U+0080-00FF,U+0100-017F,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2193,U+00D7,U+2212`, alle Layoutfeatures erhalten. **U+1E9E (ẞ) liegt außerhalb des verlangten Subsets** und fehlt daher in den erzeugten Subsets auch bei vorhandener Originalglyphe. Array bleibt aufgrund seiner Lizenz unverändert. Metriken stammen aus OS/2, Verhältnisse beziehen sich auf unitsPerEm; bei variablen Fonts gelten sie für die Defaultposition. Monospace: post.isFixedPitch und tatsächliche Vorschubbreiten werden getrennt ausgewiesen.


## Doto

Óliver Lalan. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/doto).

Lizenz: SIL Open Font License 1.1. Kommerzielles Selfhosting: erlaubt unter den genannten Bedingungen. [Lizenzquelle](https://github.com/google/fonts/blob/main/ofl/doto/OFL.txt).

> The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves.

Google-Fonts-Original aus ofl/doto; beide variablen Achsen erhalten.


### doto-variable.woff2

Name-Table-Familie: `Doto Black`. Stil: Black. Gewicht: 100 900. 7208 Bytes. UPM: 1000; Versalhöhe: 700; x-Höhe: 500; Verhältnisse: 0.7 / 0.5.

Monospaced laut post: True; ASCII-Vorschubbreiten: [600].

Achsen: `{"ROND": {"min": 0.0, "default": 0.0, "max": 100.0}, "wght": {"min": 100.0, "default": 900.0, "max": 900.0}}`. Benannte Instanzen: `[{"name": "Thin", "coordinates": {"ROND": 0.0, "wght": 100.0}}, {"name": "ExtraLight", "coordinates": {"ROND": 0.0, "wght": 200.0}}, {"name": "Light", "coordinates": {"ROND": 0.0, "wght": 300.0}}, {"name": "Regular", "coordinates": {"ROND": 0.0, "wght": 400.0}}, {"name": "Medium", "coordinates": {"ROND": 0.0, "wght": 500.0}}, {"name": "SemiBold", "coordinates": {"ROND": 0.0, "wght": 600.0}}, {"name": "Bold", "coordinates": {"ROND": 0.0, "wght": 700.0}}, {"name": "ExtraBold", "coordinates": {"ROND": 0.0, "wght": 800.0}}, {"name": "Black", "coordinates": {"ROND": 0.0, "wght": 900.0}}]`.

Fehlende Zeichen im Original: ĳ Ĳ →. In WOFF2: ẞ ĳ Ĳ →.

```css

@font-face {
  font-family: "Doto";
  src: url("/fonts/labor/doto/doto-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

```


## Array

Frode Helland / Indian Type Foundry. [Originalquelle](https://www.fontshare.com/fonts/array).

Lizenz: ITF Free Font License (FFL) 2.0, 17.08.2026. Kommerzielles Selfhosting: erlaubt unter den genannten Bedingungen. [Lizenzquelle](https://api.fontshare.com/v2/fonts/download/array).

> Self-hosting by end users is permitted and recommended for greater control, reliability and performance.

Kein Subsetting und keine Konvertierung: FFL §02 verbietet beides ausdrücklich. Offizielle WOFF2 unverändert übernommen. Kommerzielle Nutzung und Selfhosting laut §01 erlaubt; Kunde muss eigene Kopie direkt von Fontshare beziehen (§02/04). Keine Weitergabe als allgemeine Fontbibliothek. Kostenlos, keine Triallizenz. Designer aus name-ID 9. Alte eingebettete Lizenzmetadaten weichen von der aktuellen Paketlizenz ab; maßgeblich hier die mitgelieferte FFL 2.0.


### array-bold.woff2

Name-Table-Familie: `Array`. Stil: Bold. Gewicht: 700. 26396 Bytes. UPM: 1600; Versalhöhe: 1000; x-Höhe: 800; Verhältnisse: 0.625 / 0.5.

Monospaced laut post: False; ASCII-Vorschubbreiten: [500, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1700, 1800, 2200].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: ẞ →. In WOFF2: ẞ →.

```css

@font-face {
  font-family: "Array";
  src: url("/fonts/labor/array/array-bold.woff2") format("woff2");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

```


### array-bold-wide.woff2

Name-Table-Familie: `Array Bold Wide`. Stil: Bold Wide. Gewicht: 700. 26532 Bytes. UPM: 1600; Versalhöhe: 1000; x-Höhe: 800; Verhältnisse: 0.625 / 0.5.

Monospaced laut post: False; ASCII-Vorschubbreiten: [600, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2300].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: ẞ →. In WOFF2: ẞ →.

```css

@font-face {
  font-family: "Array Wide";
  src: url("/fonts/labor/array/array-bold-wide.woff2") format("woff2");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

```


### array-regular.woff2

Name-Table-Familie: `Array`. Stil: Regular. Gewicht: 400. 17912 Bytes. UPM: 1600; Versalhöhe: 1000; x-Höhe: 800; Verhältnisse: 0.625 / 0.5.

Monospaced laut post: False; ASCII-Vorschubbreiten: [300, 500, 600, 700, 800, 900, 1000, 1100, 1300, 1400, 1500].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: ẞ →. In WOFF2: ẞ →.

```css

@font-face {
  font-family: "Array";
  src: url("/fonts/labor/array/array-regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


### array-semibold.woff2

Name-Table-Familie: `Array Semibold`. Stil: Semibold. Gewicht: 500. 21980 Bytes. UPM: 1600; Versalhöhe: 1000; x-Höhe: 800; Verhältnisse: 0.625 / 0.5.

Monospaced laut post: False; ASCII-Vorschubbreiten: [400, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1600, 1700].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: ẞ →. In WOFF2: ẞ →.

```css

@font-face {
  font-family: "Array";
  src: url("/fonts/labor/array/array-semibold.woff2") format("woff2");
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}

```


### array-semibold-wide.woff2

Name-Table-Familie: `Array Semibold Wide`. Stil: Semibold Wide. Gewicht: 500. 22120 Bytes. UPM: 1600; Versalhöhe: 1000; x-Höhe: 800; Verhältnisse: 0.625 / 0.5.

Monospaced laut post: False; ASCII-Vorschubbreiten: [500, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1700, 1800].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: ẞ →. In WOFF2: ẞ →.

```css

@font-face {
  font-family: "Array Wide";
  src: url("/fonts/labor/array/array-semibold-wide.woff2") format("woff2");
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}

```


### array-wide.woff2

Name-Table-Familie: `Array Wide`. Stil: Wide. Gewicht: 400. 17948 Bytes. UPM: 1600; Versalhöhe: 1000; x-Höhe: 800; Verhältnisse: 0.625 / 0.5.

Monospaced laut post: False; ASCII-Vorschubbreiten: [400, 600, 700, 800, 900, 1000, 1100, 1200, 1500, 1600].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: ẞ →. In WOFF2: ẞ →.

```css

@font-face {
  font-family: "Array Wide";
  src: url("/fonts/labor/array/array-wide.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


## Geist Pixel

Andrés Briganti in Zusammenarbeit mit Vercel. [Originalquelle](https://github.com/vercel/geist-font).

Lizenz: SIL Open Font License 1.1. Kommerzielles Selfhosting: erlaubt unter den genannten Bedingungen. [Lizenzquelle](https://github.com/vercel/geist-font/blob/main/OFL.txt).

> The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves.

Variable ELSH-Datei und alle fünf offiziellen statischen Varianten erfasst. ELSH wählt Pixelformen; keine Gewichtsachse.


### geist-pixel-circle.woff2

Name-Table-Familie: `Geist Pixel Circle`. Stil: Circle. Gewicht: 400. 21332 Bytes. UPM: 1000; Versalhöhe: 722; x-Höhe: 532; Verhältnisse: 0.722 / 0.532.

Monospaced laut post: False; ASCII-Vorschubbreiten: [152, 190, 228, 266, 304, 342, 380, 418, 456, 494, 532, 570, 608, 646, 684, 760, 836, 912].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: keine. In WOFF2: ẞ.

```css

@font-face {
  font-family: "Geist Pixel Circle";
  src: url("/fonts/labor/geist-pixel/geist-pixel-circle.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


### geist-pixel-grid.woff2

Name-Table-Familie: `Geist Pixel Grid`. Stil: Grid. Gewicht: 400. 21276 Bytes. UPM: 1000; Versalhöhe: 722; x-Höhe: 532; Verhältnisse: 0.722 / 0.532.

Monospaced laut post: False; ASCII-Vorschubbreiten: [152, 190, 228, 266, 304, 342, 380, 418, 456, 494, 532, 570, 608, 646, 684, 760, 836, 912].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: keine. In WOFF2: ẞ.

```css

@font-face {
  font-family: "Geist Pixel Grid";
  src: url("/fonts/labor/geist-pixel/geist-pixel-grid.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


### geist-pixel-line.woff2

Name-Table-Familie: `Geist Pixel Line`. Stil: Line. Gewicht: 400. 13024 Bytes. UPM: 1000; Versalhöhe: 722; x-Höhe: 532; Verhältnisse: 0.722 / 0.532.

Monospaced laut post: False; ASCII-Vorschubbreiten: [152, 190, 228, 266, 304, 342, 380, 418, 456, 494, 532, 570, 608, 646, 684, 760, 836, 912].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: keine. In WOFF2: ẞ.

```css

@font-face {
  font-family: "Geist Pixel Line";
  src: url("/fonts/labor/geist-pixel/geist-pixel-line.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


### geist-pixel-square.woff2

Name-Table-Familie: `Geist Pixel Square`. Stil: Square. Gewicht: 400. 21132 Bytes. UPM: 1000; Versalhöhe: 722; x-Höhe: 532; Verhältnisse: 0.722 / 0.532.

Monospaced laut post: False; ASCII-Vorschubbreiten: [152, 190, 228, 266, 304, 342, 380, 418, 456, 494, 532, 570, 608, 646, 684, 760, 836, 912].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: keine. In WOFF2: ẞ.

```css

@font-face {
  font-family: "Geist Pixel Square";
  src: url("/fonts/labor/geist-pixel/geist-pixel-square.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


### geist-pixel-triangle.woff2

Name-Table-Familie: `Geist Pixel Triangle`. Stil: Triangle. Gewicht: 400. 20796 Bytes. UPM: 1000; Versalhöhe: 722; x-Höhe: 532; Verhältnisse: 0.722 / 0.532.

Monospaced laut post: False; ASCII-Vorschubbreiten: [152, 190, 228, 266, 304, 342, 380, 418, 456, 494, 532, 570, 608, 646, 684, 760, 836, 912].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: keine. In WOFF2: ẞ.

```css

@font-face {
  font-family: "Geist Pixel Triangle";
  src: url("/fonts/labor/geist-pixel/geist-pixel-triangle.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


### geist-pixel-variable.woff2

Name-Table-Familie: `Geist Pixel`. Stil: Regular. Gewicht: 400. 29488 Bytes. UPM: 1000; Versalhöhe: 722; x-Höhe: 532; Verhältnisse: 0.722 / 0.532.

Monospaced laut post: False; ASCII-Vorschubbreiten: [152, 190, 228, 266, 304, 342, 380, 418, 456, 494, 532, 570, 608, 646, 684, 760, 836, 912].

Achsen: `{"ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}}`. Benannte Instanzen: `[{"name": "Regular", "coordinates": {"ELSH": 0.0}}, {"name": "Square", "coordinates": {"ELSH": 1.0}}, {"name": "Circle", "coordinates": {"ELSH": 20.0}}, {"name": "Grid", "coordinates": {"ELSH": 40.0}}, {"name": "Triangle", "coordinates": {"ELSH": 60.0}}, {"name": "Line", "coordinates": {"ELSH": 80.0}}]`.

Fehlende Zeichen im Original: keine. In WOFF2: ẞ.

```css

@font-face {
  font-family: "Geist Pixel";
  src: url("/fonts/labor/geist-pixel/geist-pixel-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


## Fontlab

Bryce Wilner. [Originalquelle](https://github.com/brycewilner/Fontlab-Font).

Lizenz: SIL Open Font License 1.1. Kommerzielles Selfhosting: ungeklärt wegen widersprüchlicher Metadaten. [Lizenzquelle](https://github.com/brycewilner/Fontlab-Font/blob/master/README.md).

> The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves.

Autor nennt die Schrift Fontlab Font; name-ID 1 lautet Fontlab. README weist OFL zu. Die OTF enthält abweichend „Copyright 2014 Adobe Systems Incorporated. All rights reserved.“ und keine Lizenz-name-IDs 13/14. Dieser Metadatenwiderspruch ist ungeklärt; kommerziellen Einsatz vor Klärung mit Autor zurückstellen.


### fontlab-regular.woff2

Name-Table-Familie: `Fontlab`. Stil: Regular. Gewicht: 400. 25872 Bytes. UPM: 1000; Versalhöhe: 789; x-Höhe: 578; Verhältnisse: 0.789 / 0.578.

Monospaced laut post: False; ASCII-Vorschubbreiten: [189, 200, 214, 221, 225, 228, 300, 301, 303, 383, 387, 391, 398, 402, 403, 422, 425, 458, 459, 472, 492, 493, 496, 503, 508, 509, 511, 513, 517, 520, 521, 523, 524, 544, 549, 554, 557, 558, 562, 567, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 581, 583, 585, 586, 595, 598, 602, 603, 610, 624, 625, 626, 627, 628, 632, 635, 637, 643, 647, 659, 670, 672, 675, 678, 679, 695, 699, 711, 726, 732, 744].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: ẞ ĳ Ĳ →. In WOFF2: ẞ ĳ Ĳ →.

```css

@font-face {
  font-family: "Fontlab";
  src: url("/fonts/labor/fontlab-font/fontlab-regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


## ADAXI

Kollektiv des Bari Città Aperta XYZ-Workshops, La Scuola Open Source, 2025. [Originalquelle](https://github.com/lascuolaopensource/bca-font-Adaxi).

Lizenz: SIL Open Font License 1.1. Kommerzielles Selfhosting: erlaubt unter den genannten Bedingungen. [Lizenzquelle](https://github.com/lascuolaopensource/bca-font-Adaxi/blob/main/OFL.txt).

> The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves.

Beta / Work in progress laut Original-README; alternative Formen über stylistic sets.


### adaxi-regular.woff2

Name-Table-Familie: `ADAXI`. Stil: Regular. Gewicht: 400. 10640 Bytes. UPM: 2000; Versalhöhe: 1400; x-Höhe: 1000; Verhältnisse: 0.7 / 0.5.

Monospaced laut post: False; ASCII-Vorschubbreiten: [475, 570, 600, 650, 665, 760, 855, 1045, 1140, 1235, 1236, 1330, 1395, 1425, 1520, 1615, 1625, 1900, 2090, 2375].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: Ä Ö Ü ä ö ü ß ẞ ê ë ï ó ç ĳ Ĳ € – — „ “ ‚ ‘ ’ « » … · × → % # + /. In WOFF2: Ä Ö Ü ä ö ü ß ẞ ê ë ï ó ç ĳ Ĳ € – — „ “ ‚ ‘ ’ « » … · × → % # + /.

```css

@font-face {
  font-family: "ADAXI";
  src: url("/fonts/labor/adaxi/adaxi-regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


## Departure Mono

Helena Zhang. [Originalquelle](https://github.com/rektdeckard/departure-mono).

Lizenz: SIL Open Font License 1.1. Kommerzielles Selfhosting: erlaubt unter den genannten Bedingungen. [Lizenzquelle](https://github.com/rektdeckard/departure-mono/blob/main/public/assets/LICENSE).

> The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves.

Font unter OFL; MIT im Repository-Root gilt für die Website. Version 1.500 gewählt. Autor empfiehlt Schriftgrößen in 11-px-Schritten.


### departure-mono-regular.woff2

Name-Table-Familie: `Departure Mono`. Stil: Regular. Gewicht: 400. 8080 Bytes. UPM: 550; Versalhöhe: 400; x-Höhe: 300; Verhältnisse: 0.7272727272727273 / 0.5454545454545454.

Monospaced laut post: True; ASCII-Vorschubbreiten: [350].

Achsen: `{}`. Benannte Instanzen: `[]`.

Fehlende Zeichen im Original: keine. In WOFF2: ẞ.

```css

@font-face {
  font-family: "Departure Mono";
  src: url("/fonts/labor/departure-mono/departure-mono-regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

```


Array Wide erhält im CSS den separaten Familiennamen `Array Wide`, damit breite und normale Schnitte desselben Gewichts einander nicht überschreiben.
