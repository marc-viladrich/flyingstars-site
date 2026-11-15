# Schriftlabor Runde 2: geprüfte Fontdateien

Stand: 13. November 2026. Fakten und Dateien; keine Designentscheidung.

## Methode

- **fonttools:** 4.53.1

- **woff2:** Google-Fonts-TTF verlustfrei in volle WOFF2 konvertiert, als original gekennzeichnet; Commit Mono/Monaspace Original-WOFF2 vom Autor.

- **subset:** fontTools.subset.Subsetter, Options.layout_features=[*], name_IDs=[*], keine Achseninstanzierung; U+0000–00FF plus explizite Liste inkl. ẞ, ĳ und Pfeile. Unbenutzte Layout-Regeln können trotz Erhalt aller Feature-Tags wegfallen.

- **metrics:** Vorschub n,m,0 an jeder einzelnen Achsengrenze bei Defaults der anderen Achsen; keine vollständige kombinatorische Prüfung aller Ecken; keine Kerning-/Shaping-Laufweite gemessen.

- **grid:** Dateigeometrie H oder Projektbeschreibung; Moduldeckung ist notwendige, keine hinreichende Bedingung für scharfe Darstellung. DPR, Pixelursprung, Zoom und Browser-Rasterizer wirken zusätzlich. Keine visuellen Lesbarkeitsurteile oder Browserprüfung.

- **threshold:** 60 KB = 60000 Bytes; DE vollständig = ÄÖÜäöüßẞ; Gesamtzeichenliste separat.

- **qualification:** Strenge Liste: DE vollständig, OFL, eine Datei ≤60000 B, nicht rastergebunden. Rasterfonts haben keine belegte Pixeldeckung für alle verlangten 11/13/16 px und werden separat eingeschränkt geführt.


## Übersicht aller Kandidaten

Alle heruntergeladenen Dateien: OFL 1.1, Selfhosting/Subsetting/öffentliches Git erlaubt mit beiliegender Lizenz und Copyright. Geschützte Namen wurden in drei Subsets ersetzt. Fehlende Zeichen sind einzeln aufgeführt; „keine“ bedeutet die gesamte verlangte Liste. Tabellenwerte für Breiten beziehen sich auf n/m/0, Details darunter.

| Kandidat / Designer | Achsen min / default / max | Original / Subset B | Fehlende Zeichen | Breiten konstant? | tnum / zero | Raster / Status |

|---|---|---:|---|---|---|---|

| [Handjet](https://github.com/google/fonts/tree/main/ofl/handjet) / Rosetta, David Březina | wght: 100.0/400.0/900.0; ELGR: 1.0/1.0/2.0; ELSH: 0.0/2.0/16.0 | 49772 / 21848 | ↗ | True | False / False | rastergebunden |

| [Bitcount](https://github.com/google/fonts/tree/main/ofl/bitcount) / Petr van Blokland | wght: 100.0/400.0/900.0; ELXP: 0.0/0.0/100.0; ELSH: 0.0/0.0/100.0; slnt: -8.0/0.0/0.0; CRSV: 0.0/0.5/1.0 | 33580 / 20992 | → ↗ ĳ | True | False / True | rastergebunden |

| [Bitcount Prop Single](https://github.com/google/fonts/tree/main/ofl/bitcountpropsingle) / Petr van Blokland | wght: 100.0/400.0/900.0; ELXP: 0.0/0.0/100.0; ELSH: 0.0/0.0/100.0; slnt: -8.0/0.0/0.0; CRSV: 0.0/0.5/1.0 | 55120 / 32804 | → ↗ ĳ | True | True / True | rastergebunden |

| [Bitcount Prop Double](https://github.com/google/fonts/tree/main/ofl/bitcountpropdouble) / Petr van Blokland | wght: 100.0/400.0/900.0; ELXP: 0.0/0.0/100.0; ELSH: 0.0/0.0/100.0; slnt: -8.0/0.0/0.0; CRSV: 0.0/0.5/1.0 | 38060 / 24224 | → ↗ ĳ | True | True / True | rastergebunden |

| [Bitcount Single](https://github.com/google/fonts/tree/main/ofl/bitcountsingle) / Petr van Blokland | wght: 100.0/400.0/900.0; ELXP: 0.0/0.0/100.0; ELSH: 0.0/0.0/100.0; slnt: -8.0/0.0/0.0; CRSV: 0.0/0.5/1.0 | 44476 / 26256 | → ↗ ĳ | True | False / True | rastergebunden |

| [Bitcount Grid Double](https://github.com/google/fonts/tree/main/ofl/bitcountgriddouble) / Petr van Blokland | wght: 100.0/400.0/900.0; ELXP: 0.0/0.0/100.0; ELSH: 0.0/0.0/100.0; slnt: -8.0/0.0/0.0; CRSV: 0.0/0.5/1.0 | 24156 / 17276 | → ↗ ĳ | True | False / True | rastergebunden |

| [Bitcount Grid Single](https://github.com/google/fonts/tree/main/ofl/bitcountgridsingle) / Petr van Blokland | wght: 100.0/400.0/900.0; ELXP: 0.0/0.0/100.0; ELSH: 0.0/0.0/100.0; slnt: -8.0/0.0/0.0; CRSV: 0.0/0.5/1.0 | 30704 / 20176 | → ↗ ĳ | True | False / True | rastergebunden |

| [Geist Pixel](https://github.com/google/fonts/tree/main/ofl/geistpixel) / Andrés Briganti, Evil Rabbit, Guillermo Rauch | ELSH: 0.0/0.0/100.0 | 39056 / 26264 | keine | True | False / False | rastergebunden |

| [Geist](https://github.com/google/fonts/tree/main/ofl/geist) / Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, Facundo Santana | wght: 100.0/400.0/900.0 | 69100 / 30972 | keine | False | True / False | Outline |

| [Geist Mono](https://github.com/google/fonts/tree/main/ofl/geistmono) / Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, Facundo Santana | wght: 100.0/400.0/900.0 | 70968 / 32264 | ĳ | True | False / False | Outline |

| [Pixelify Sans](https://github.com/google/fonts/tree/main/ofl/pixelifysans) / Stefie Justprince | wght: 400.0/400.0/700.0 | 23060 / 11668 | → ↗ | False | False / False | rastergebunden |

| [Jersey 10](https://github.com/google/fonts/tree/main/ofl/jersey10) / Sarah Cadigan-Fried | statisch | 20400 / 12164 | → ↗ | True | True / False | rastergebunden |

| [Jersey 15](https://github.com/google/fonts/tree/main/ofl/jersey15) / Sarah Cadigan-Fried | statisch | 25172 / 15400 | → ↗ | True | True / False | rastergebunden |

| [Jersey 20](https://github.com/google/fonts/tree/main/ofl/jersey20) / Sarah Cadigan-Fried | statisch | 28504 / 17992 | → ↗ | True | True / False | rastergebunden |

| [Jersey 25](https://github.com/google/fonts/tree/main/ofl/jersey25) / Sarah Cadigan-Fried | statisch | 32252 / 19392 | → ↗ | True | True / False | rastergebunden |

| [Tiny5](https://github.com/google/fonts/tree/main/ofl/tiny5) / Stefan Schmidt | wght: 100.0/400.0/900.0; wdth: 50.0/100.0/200.0; ROND: 0.0/0.0/100.0; BLED: 0.0/0.0/100.0; JITT: 0.0/0.0/100.0 | 72908 / 9352 | keine | False | False / False | rastergebunden |

| [Micro 5](https://github.com/google/fonts/tree/main/ofl/micro5) / Sarah Cadigan-Fried | statisch | 13000 / 8064 | → ↗ | True | True / False | rastergebunden |

| [Raleway Dots](https://github.com/google/fonts/tree/main/ofl/ralewaydots) / Matt McInerney, Pablo Impallari, Rodrigo Fuenzalida, Brenda Gallo | statisch | 62416 / 45084 | ẞ → ↗ | True | False / False | Outline |

| [Codystar](https://github.com/google/fonts/tree/main/ofl/codystar) / Neapolitan | statisch | 42056 / 37936 | ẞ → ↗ ĳ | True | False / False | Outline |

| [Sixtyfour](https://github.com/google/fonts/tree/main/ofl/sixtyfour) / Jens Kutílek | SCAN: -53.0/0.0/100.0; BLED: 0.0/0.0/100.0 | 9064 / 5652 | ẞ ↗ ĳ | True | False / False | rastergebunden |

| [Workbench](https://github.com/google/fonts/tree/main/ofl/workbench) / Jens Kutílek | SCAN: -53.0/0.0/100.0; BLED: 0.0/0.0/100.0 | 5416 / 4760 | ẞ → ↗ ĳ | True | False / False | rastergebunden |

| [Kode Mono](https://github.com/google/fonts/tree/main/ofl/kodemono) / Isa Ozler | wght: 400.0/400.0/700.0; wdth: 75.0/100.0/125.0; ROND: 0.0/0.0/100.0 | 102764 / 72508 | keine | False | False / False | Outline |

| [Martian Mono](https://github.com/google/fonts/tree/main/ofl/martianmono) / Roman Shamin, Evil Martians | wght: 100.0/400.0/800.0; wdth: 75.0/112.5/112.5 | 63400 / 36544 | ↗ | False | False / False | Outline |

| [Xanh Mono](https://github.com/google/fonts/tree/main/ofl/xanhmono) / Yellow Type, Lâm Bảo, Duy Dao | statisch | 24332 / 16516 | → ↗ ĳ | True | False / False | Outline |

| [Space Mono](https://github.com/google/fonts/tree/main/ofl/spacemono) / Colophon Foundry | statisch | 34948 / 18060 | keine | True | False / False | Outline |

| [Big Shoulders Stencil](https://github.com/google/fonts/tree/main/ofl/bigshouldersstencil) / Patric King | wght: 100.0/100.0/900.0; opsz: 10.0/72.0/72.0 | 129872 / 76188 | ĳ | False | False / False | Outline |

| [Oxanium](https://github.com/google/fonts/tree/main/ofl/oxanium) / Severin Meyer | wght: 200.0/200.0/800.0 | 18940 / 12900 | → ↗ ĳ | False | False / True | Outline |

| [Chakra Petch](https://github.com/google/fonts/tree/main/ofl/chakrapetch) / Cadson Demak | statisch | 25220 / 8840 | ↗ | True | False / False | Outline |

| [DotGothic16](https://github.com/google/fonts/tree/main/ofl/dotgothic16) / Fontworks Inc. | statisch | 501380 / 16508 | ẞ ↗ ĳ | True | False / True | rastergebunden |

| [Commit Mono](https://github.com/eigilnikolajsen/commit-mono) / Eigil Nikolajsen | wght: 200.0/200.0/700.0; ital: 0.0/0.0/1.0 | 86768 / 37552 | ẞ ↗ | True | False / False | Outline |

| [Monaspace Neon](https://github.com/githubnext/monaspace) / GitHub Next / Lettermatic | wght: 200.0/200.0/800.0; wdth: 100.0/100.0/125.0; slnt: -11.0/0.0/0.0 | 510832 / 99132 | keine | True | False / False | Outline |

| [PP NeueBit](https://pangrampangram.com/products/bitmap-neuebit) / Steve Marchal | ungeprüft | — / — | nicht gemessen | — | — / — | not_downloaded_paid |

| [PP Mondwest](https://pangrampangram.com/products/bitmap-mondwest) / Steve Marchal | ungeprüft | — / — | nicht gemessen | — | — / — | not_downloaded_paid |


## Handjet

Rosetta, David Březina. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/handjet). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/handjet/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### handjet/handjet.woff2

Original-WOFF2: 49772 Bytes; Subset: 21848 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 8160; Versalhöhe: 5280; x-Höhe: 3840. Dateigeometrie H: ELGR=1 Modul 480 FU, UPM 8160 → 17 px; ELGR=2 Teilmodul 240 FU → 34 px. Konturmittelpunkte am Default in y: 240,720,1200,…; ELGR=2: 240,480,720,… . 11–16 px / DPR 1: Modul <1 Pixel. Formen bleiben elementbasiert; ELGR erhöht die Auflösung, schaltet nicht zu normaler Sans um.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [960, 1440, 1920, 2160, 2400, 2640, 2880, 3120, 3360, 3600, 3840, 4080, 4320, 4800, 5280].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "ELGR": {"min": 1.0, "default": 1.0, "max": 2.0}, "ELSH": {"min": 0.0, "default": 2.0, "max": 16.0}}`. Benannte Instanzen: `[{"name": "Thin", "coordinates": {"wght": 100.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "ELGR": 1.0, "ELSH": 2.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "ELGR": 1.0, "ELSH": 2.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 3360, "m": 5280, "0": 3360}, "wght_min": {"n": 3360.0, "m": 5280.0, "0": 3360.0}, "wght_max": {"n": 3360.0, "m": 5280.0, "0": 3360.0}, "ELGR_min": {"n": 3360.0, "m": 5280.0, "0": 3360.0}, "ELGR_max": {"n": 3360.0, "m": 5280.0, "0": 3360.0}, "ELSH_min": {"n": 3360.0, "m": 5280.0, "0": 3360.0}, "ELSH_max": {"n": 3360.0, "m": 5280.0, "0": 3360.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ↗. Im Subset: ↗.

Ziffernvorschübe Default: `{"0": 3360, "1": 3360, "2": 3360, "3": 3360, "4": 3360, "5": 3360, "6": 3360, "7": 3360, "8": 3360, "9": 3360}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss06", "ss07", "ss08", "ss09"]. Alle Features: ["aalt", "case", "ccmp", "cpsp", "dlig", "dnom", "fina", "frac", "init", "kern", "liga", "locl", "mark", "medi", "mkmk", "numr", "ordn", "rlig", "sinf", "ss06", "ss07", "ss08", "ss09", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/handjet/Handjet%5BELGR%2CELSH%2Cwght%5D.ttf); SHA-256 der Quelle: `9262749e8bb0b73ebcae0e20428689c3c59576eebeb6c4e1020300d2d41bdf4d`.

[Google-Fonts-Projektbeschreibung](https://github.com/google/fonts/blob/main/ofl/handjet/DESCRIPTION.en_us.html) warnt vor möglichen Darstellungsartefakten unter macOS. [Rosetta](https://github.com/rosettatype/handjet) beschreibt die elementbasierte Konstruktion.


## Bitcount

Petr van Blokland. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/bitcount). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcount/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### bitcount/bitcount.woff2

Original-WOFF2: 33580 Bytes; Subset: 20992 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 600; x-Höhe: 500. 5×7-Grundraster; Modul = 1/10 em laut Projektbeschreibung; 1 Modul = 1 Gerätepixel bei 10 CSS px / DPR 1 (bzw. 5 px / DPR 2). 11–16 px bei DPR 1 nicht ganzzahlig. Form/Gewicht verändert die Elementkontur.

monospaced; post.isFixedPitch=False; ASCII-Breiten: [600].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "ELXP": {"min": 0.0, "default": 0.0, "max": 100.0}, "ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}, "slnt": {"min": -8.0, "default": 0.0, "max": 0.0}, "CRSV": {"min": 0.0, "default": 0.5, "max": 1.0}}`. Benannte Instanzen: `[{"name": "Thin Italic", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Thin", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraLight Italic", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Light Italic", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Italic", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Medium Italic", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "SemiBold Italic", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Bold Italic", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraBold Italic", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Black Italic", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_max": {"n": 600.0, "m": 600.0, "0": 600.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 600, "1": 600, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: False; zero: True. zero vorhanden Stylistic sets: ["ss01", "ss02", "ss03", "ss05", "ss08", "ss09"]. Alle Features: ["c2sc", "calt", "liga", "mark", "mkmk", "rvrn", "smcp", "ss01", "ss02", "ss03", "ss05", "ss08", "ss09", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcount/Bitcount%5BCRSV%2CELSH%2CELXP%2Cslnt%2Cwght%5D.ttf); SHA-256 der Quelle: `c7931919e67faa0e9cea2118f47d8f96383c580cc5cb6a3cef9aa1233ba3923e`.


## Bitcount Prop Single

Petr van Blokland. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/bitcountpropsingle). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountpropsingle/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### bitcount-prop-single/bitcount-prop-single.woff2

Original-WOFF2: 55120 Bytes; Subset: 32804 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 600; x-Höhe: 500. 5×7-Grundraster; Modul = 1/10 em laut Projektbeschreibung; 1 Modul = 1 Gerätepixel bei 10 CSS px / DPR 1 (bzw. 5 px / DPR 2). 11–16 px bei DPR 1 nicht ganzzahlig. Form/Gewicht verändert die Elementkontur.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [200, 300, 400, 500, 600, 700, 900, 1000, 1100].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "ELXP": {"min": 0.0, "default": 0.0, "max": 100.0}, "ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}, "slnt": {"min": -8.0, "default": 0.0, "max": 0.0}, "CRSV": {"min": 0.0, "default": 0.5, "max": 1.0}}`. Benannte Instanzen: `[{"name": "Thin Italic", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Thin", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraLight Italic", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Light Italic", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Italic", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Medium Italic", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "SemiBold Italic", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Bold Italic", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraBold Italic", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Black Italic", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 1000, "0": 700}, "wght_min": {"n": 600.0, "m": 1000.0, "0": 700.0}, "wght_max": {"n": 600.0, "m": 1000.0, "0": 700.0}, "ELXP_min": {"n": 600.0, "m": 1000.0, "0": 700.0}, "ELXP_max": {"n": 600.0, "m": 1000.0, "0": 700.0}, "ELSH_min": {"n": 600.0, "m": 1000.0, "0": 700.0}, "ELSH_max": {"n": 600.0, "m": 1000.0, "0": 700.0}, "slnt_min": {"n": 600.0, "m": 1000.0, "0": 700.0}, "slnt_max": {"n": 600.0, "m": 1000.0, "0": 700.0}, "CRSV_min": {"n": 600.0, "m": 1000.0, "0": 700.0}, "CRSV_max": {"n": 600.0, "m": 1000.0, "0": 700.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 700, "1": 500, "2": 700, "3": 700, "4": 700, "5": 700, "6": 700, "7": 700, "8": 700, "9": 700}`. tnum: True; zero: True. zero vorhanden Stylistic sets: ["ss01", "ss02", "ss03", "ss04", "ss07", "ss08", "ss09"]. Alle Features: ["c2sc", "calt", "dnom", "frac", "kern", "liga", "mark", "mkmk", "numr", "onum", "rvrn", "smcp", "ss01", "ss02", "ss03", "ss04", "ss07", "ss08", "ss09", "tnum", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountpropsingle/BitcountPropSingle%5BCRSV%2CELSH%2CELXP%2Cslnt%2Cwght%5D.ttf); SHA-256 der Quelle: `e6f39bb11077484a1becaf94b712331b5c2d169a27b4a4591f6ab70c901a8405`.


## Bitcount Prop Double

Petr van Blokland. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/bitcountpropdouble). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountpropdouble/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### bitcount-prop-double/bitcount-prop-double.woff2

Original-WOFF2: 38060 Bytes; Subset: 24224 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 600; x-Höhe: 500. 5×7-Grundraster; Modul = 1/10 em laut Projektbeschreibung; 1 Modul = 1 Gerätepixel bei 10 CSS px / DPR 1 (bzw. 5 px / DPR 2). 11–16 px bei DPR 1 nicht ganzzahlig. Form/Gewicht verändert die Elementkontur.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [200, 300, 400, 500, 600, 700, 800, 900].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "ELXP": {"min": 0.0, "default": 0.0, "max": 100.0}, "ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}, "slnt": {"min": -8.0, "default": 0.0, "max": 0.0}, "CRSV": {"min": 0.0, "default": 0.5, "max": 1.0}}`. Benannte Instanzen: `[{"name": "Thin Italic", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Thin", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraLight Italic", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Light Italic", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Italic", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Medium Italic", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "SemiBold Italic", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Bold Italic", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraBold Italic", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Black Italic", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 900, "0": 600}, "wght_min": {"n": 600.0, "m": 900.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 900.0, "0": 600.0}, "ELXP_min": {"n": 600.0, "m": 900.0, "0": 600.0}, "ELXP_max": {"n": 600.0, "m": 900.0, "0": 600.0}, "ELSH_min": {"n": 600.0, "m": 900.0, "0": 600.0}, "ELSH_max": {"n": 600.0, "m": 900.0, "0": 600.0}, "slnt_min": {"n": 600.0, "m": 900.0, "0": 600.0}, "slnt_max": {"n": 600.0, "m": 900.0, "0": 600.0}, "CRSV_min": {"n": 600.0, "m": 900.0, "0": 600.0}, "CRSV_max": {"n": 600.0, "m": 900.0, "0": 600.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 600, "1": 500, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: True; zero: True. zero vorhanden Stylistic sets: ["ss01", "ss02", "ss03", "ss05", "ss08", "ss09"]. Alle Features: ["c2sc", "calt", "dnom", "frac", "kern", "liga", "mark", "mkmk", "numr", "onum", "rvrn", "smcp", "ss01", "ss02", "ss03", "ss05", "ss08", "ss09", "tnum", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountpropdouble/BitcountPropDouble%5BCRSV%2CELSH%2CELXP%2Cslnt%2Cwght%5D.ttf); SHA-256 der Quelle: `c88b385f2f6083ca95b4108dac6b667f12e23c2b9738ec49d97332eeecfcef72`.


## Bitcount Single

Petr van Blokland. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/bitcountsingle). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountsingle/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### bitcount-single/bitcount-single.woff2

Original-WOFF2: 44476 Bytes; Subset: 26256 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 600; x-Höhe: 500. 5×7-Grundraster; Modul = 1/10 em laut Projektbeschreibung; 1 Modul = 1 Gerätepixel bei 10 CSS px / DPR 1 (bzw. 5 px / DPR 2). 11–16 px bei DPR 1 nicht ganzzahlig. Form/Gewicht verändert die Elementkontur.

monospaced; post.isFixedPitch=False; ASCII-Breiten: [600].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "ELXP": {"min": 0.0, "default": 0.0, "max": 100.0}, "ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}, "slnt": {"min": -8.0, "default": 0.0, "max": 0.0}, "CRSV": {"min": 0.0, "default": 0.5, "max": 1.0}}`. Benannte Instanzen: `[{"name": "Thin Italic", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Thin", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraLight Italic", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Light Italic", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Italic", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Medium Italic", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "SemiBold Italic", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Bold Italic", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraBold Italic", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Black Italic", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_max": {"n": 600.0, "m": 600.0, "0": 600.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 600, "1": 600, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: False; zero: True. zero vorhanden Stylistic sets: ["ss01", "ss02", "ss03", "ss04", "ss07", "ss08", "ss09"]. Alle Features: ["c2sc", "calt", "liga", "mark", "mkmk", "onum", "rvrn", "smcp", "ss01", "ss02", "ss03", "ss04", "ss07", "ss08", "ss09", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountsingle/BitcountSingle%5BCRSV%2CELSH%2CELXP%2Cslnt%2Cwght%5D.ttf); SHA-256 der Quelle: `007608c704d41cfff140892070b71f31971ec6d85b9f8ad5fdd0d2625f517c70`.


## Bitcount Grid Double

Petr van Blokland. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/bitcountgriddouble). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountgriddouble/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### bitcount-grid-double/bitcount-grid-double.woff2

Original-WOFF2: 24156 Bytes; Subset: 17276 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 600; x-Höhe: 500. 5×7-Grundraster; Modul = 1/10 em laut Projektbeschreibung; 1 Modul = 1 Gerätepixel bei 10 CSS px / DPR 1 (bzw. 5 px / DPR 2). 11–16 px bei DPR 1 nicht ganzzahlig. Form/Gewicht verändert die Elementkontur.

monospaced; post.isFixedPitch=False; ASCII-Breiten: [600].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "ELXP": {"min": 0.0, "default": 0.0, "max": 100.0}, "ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}, "slnt": {"min": -8.0, "default": 0.0, "max": 0.0}, "CRSV": {"min": 0.0, "default": 0.5, "max": 1.0}}`. Benannte Instanzen: `[{"name": "Thin Italic", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Thin", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraLight Italic", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Light Italic", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Italic", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Medium Italic", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "SemiBold Italic", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Bold Italic", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraBold Italic", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Black Italic", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_max": {"n": 600.0, "m": 600.0, "0": 600.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 600, "1": 600, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: False; zero: True. zero vorhanden Stylistic sets: ["ss03", "ss05", "ss08"]. Alle Features: ["c2sc", "calt", "liga", "mark", "mkmk", "onum", "rvrn", "smcp", "ss03", "ss05", "ss08", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountgriddouble/BitcountGridDouble%5BCRSV%2CELSH%2CELXP%2Cslnt%2Cwght%5D.ttf); SHA-256 der Quelle: `8827445e53172735959d8ba11db8442ec5ffc8d8dc1b778781e9b5be5e20ffb2`.


## Bitcount Grid Single

Petr van Blokland. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/bitcountgridsingle). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountgridsingle/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### bitcount-grid-single/bitcount-grid-single.woff2

Original-WOFF2: 30704 Bytes; Subset: 20176 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 600; x-Höhe: 500. 5×7-Grundraster; Modul = 1/10 em laut Projektbeschreibung; 1 Modul = 1 Gerätepixel bei 10 CSS px / DPR 1 (bzw. 5 px / DPR 2). 11–16 px bei DPR 1 nicht ganzzahlig. Form/Gewicht verändert die Elementkontur.

monospaced; post.isFixedPitch=False; ASCII-Breiten: [600].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "ELXP": {"min": 0.0, "default": 0.0, "max": 100.0}, "ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}, "slnt": {"min": -8.0, "default": 0.0, "max": 0.0}, "CRSV": {"min": 0.0, "default": 0.5, "max": 1.0}}`. Benannte Instanzen: `[{"name": "Thin Italic", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Thin", "coordinates": {"wght": 100.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraLight Italic", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Light Italic", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Italic", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Medium Italic", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "SemiBold Italic", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Bold Italic", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "ExtraBold Italic", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}, {"name": "Black Italic", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": -8.0, "CRSV": 1.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "ELXP": 0.0, "ELSH": 0.0, "slnt": 0.0, "CRSV": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELXP_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ELSH_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "slnt_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "CRSV_max": {"n": 600.0, "m": 600.0, "0": 600.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 600, "1": 600, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: False; zero: True. zero vorhanden Stylistic sets: ["ss03", "ss04", "ss06", "ss07", "ss08"]. Alle Features: ["c2sc", "calt", "liga", "mark", "mkmk", "onum", "rvrn", "smcp", "ss03", "ss04", "ss06", "ss07", "ss08", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/bitcountgridsingle/BitcountGridSingle%5BCRSV%2CELSH%2CELXP%2Cslnt%2Cwght%5D.ttf); SHA-256 der Quelle: `f28e3429f64e9f27b32c6819a7f7b0d58164cf2716fdb9c3df8a5b35187d41a4`.


## Geist Pixel

Andrés Briganti, Evil Rabbit, Guillermo Rauch. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/geistpixel). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/geistpixel/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### geist-pixel/geist-pixel.woff2

Original-WOFF2: 39056 Bytes; Subset: 26264 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 722; x-Höhe: 532. Dateigeometrie H: Modul 38 FU, UPM 1000; 19 Module Versalhöhe (722 FU). 1 Modul = 1 Gerätepixel bei 26,315789 CSS px / DPR 1. Bei 11/13/16 px: 0,418/0,494/0,608 Pixel pro Modul; DPR 2: 0,836/0,988/1,216. Keine verlässlich ganzzahlige Pixeldeckung über 11–16 px; ELSH ändert Form, nicht Rasterauflösung.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [152, 190, 228, 266, 304, 342, 380, 418, 456, 494, 532, 570, 608, 646, 684, 760, 836, 912].

Achsen (aus fvar): `{"ELSH": {"min": 0.0, "default": 0.0, "max": 100.0}}`. Benannte Instanzen: `[{"name": "Regular", "coordinates": {"ELSH": 0.0}}, {"name": "Square", "coordinates": {"ELSH": 1.0}}, {"name": "Circle", "coordinates": {"ELSH": 20.0}}, {"name": "Grid", "coordinates": {"ELSH": 40.0}}, {"name": "Triangle", "coordinates": {"ELSH": 60.0}}, {"name": "Line", "coordinates": {"ELSH": 80.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 570, "m": 760, "0": 570}, "ELSH_min": {"n": 570.0, "m": 760.0, "0": 570.0}, "ELSH_max": {"n": 570.0, "m": 760.0, "0": 570.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: keine. Im Subset: keine.

Ziffernvorschübe Default: `{"0": 570, "1": 494, "2": 646, "3": 608, "4": 684, "5": 570, "6": 646, "7": 570, "8": 646, "9": 646}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss09"]. Alle Features: ["aalt", "ccmp", "dlig", "dnom", "frac", "kern", "liga", "locl", "mark", "mkmk", "numr", "ordn", "ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss09", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/geistpixel/GeistPixel%5BELSH%5D.ttf); SHA-256 der Quelle: `dcde0e2ae59aad779e71ee3fa45ade3a7146c2498024fdbb79c8cb619e60a238`.


## Geist

Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, Facundo Santana. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/geist). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/geist/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### geist/geist.woff2

Original-WOFF2: 69100 Bytes; Subset: 30972 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 710; x-Höhe: 530. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [178, 201, 213, 244, 248, 260, 264, 267, 270, 274, 297, 346, 347, 379, 384, 389, 392, 395, 419, 426, 430, 455, 478, 480, 520, 523, 524, 536, 537, 540, 544, 546, 551, 552, 557, 558, 559, 561, 573, 575, 576, 580, 581, 585, 590, 593, 594, 595, 597, 603, 604, 606, 613, 615, 619, 620, 626, 629, 640, 650, 663, 667, 668, 672, 680, 689, 694, 700, 703, 713, 733, 739, 743, 802, 819, 877, 906, 945].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}}`. Benannte Instanzen: `[{"name": "Thin", "coordinates": {"wght": 100.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0}}, {"name": "Light", "coordinates": {"wght": 300.0}}, {"name": "Regular", "coordinates": {"wght": 400.0}}, {"name": "Medium", "coordinates": {"wght": 500.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0}}, {"name": "Bold", "coordinates": {"wght": 700.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0}}, {"name": "Black", "coordinates": {"wght": 900.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 581, "m": 877, "0": 663}, "wght_min": {"n": 556.0, "m": 846.0, "0": 648.0}, "wght_max": {"n": 631.0, "m": 915.0, "0": 713.0}}`. Verändernde Achsen: wght.

Fehlende Zeichen im Original: keine. Im Subset: keine.

Ziffernvorschübe Default: `{"0": 663, "1": 384, "2": 619, "3": 613, "4": 615, "5": 626, "6": 593, "7": 524, "8": 604, "9": 593}`. tnum: True; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08", "ss09", "ss10", "ss11"]. Alle Features: ["aalt", "case", "ccmp", "dlig", "dnom", "frac", "kern", "liga", "locl", "mark", "mkmk", "numr", "ordn", "pnum", "sinf", "ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08", "ss09", "ss10", "ss11", "subs", "sups", "tnum"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/geist/Geist%5Bwght%5D.ttf); SHA-256 der Quelle: `73894e0448cae90a92b6c2f8732b7bb9acb7b94c418bff559dad4a18e1de9659`.


## Geist Mono

Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, Facundo Santana. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/geistmono). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### geist-mono/geist-mono.woff2

Original-WOFF2: 70968 Bytes; Subset: 32264 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 710; x-Höhe: 530. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

monospaced; post.isFixedPitch=True; ASCII-Breiten: [600].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}}`. Benannte Instanzen: `[{"name": "Thin", "coordinates": {"wght": 100.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0}}, {"name": "Light", "coordinates": {"wght": 300.0}}, {"name": "Regular", "coordinates": {"wght": 400.0}}, {"name": "Medium", "coordinates": {"wght": 500.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0}}, {"name": "Bold", "coordinates": {"wght": 700.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0}}, {"name": "Black", "coordinates": {"wght": 900.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ĳ. Im Subset: ĳ.

Ziffernvorschübe Default: `{"0": 600, "1": 600, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02", "ss03", "ss04", "ss06", "ss07", "ss08", "ss09", "ss10", "ss11"]. Alle Features: ["aalt", "case", "ccmp", "dnom", "frac", "locl", "mark", "mkmk", "numr", "ordn", "sinf", "ss01", "ss02", "ss03", "ss04", "ss06", "ss07", "ss08", "ss09", "ss10", "ss11", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/GeistMono%5Bwght%5D.ttf); SHA-256 der Quelle: `d00e590b8eb3a59acc329b2d044fd143ae935090b7da33199ebee27cc7de8196`.


## Pixelify Sans

Stefie Justprince. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/pixelifysans). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### pixelify-sans/pixelify-sans.woff2

Original-WOFF2: 23060 Bytes; Subset: 11668 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 700; x-Höhe: 450. Raster-/modulbasiert; genaue Modulgröße zur em nicht unabhängig belegt; keine Pixeldeckung bei 11–16 px behauptet.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [222, 266, 267, 333, 374, 404, 442, 464, 465, 495, 529, 576, 586, 600, 677, 767, 867].

Achsen (aus fvar): `{"wght": {"min": 400.0, "default": 400.0, "max": 700.0}}`. Benannte Instanzen: `[{"name": "Regular", "coordinates": {"wght": 400.0}}, {"name": "Medium", "coordinates": {"wght": 500.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0}}, {"name": "Bold", "coordinates": {"wght": 700.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 586, "m": 767, "0": 586}, "wght_min": {"n": 586.0, "m": 767.0, "0": 586.0}, "wght_max": {"n": 603.0, "m": 779.0, "0": 603.0}}`. Verändernde Achsen: wght.

Fehlende Zeichen im Original: → ↗. Im Subset: → ↗.

Ziffernvorschübe Default: `{"0": 586, "1": 404, "2": 586, "3": 586, "4": 586, "5": 586, "6": 586, "7": 586, "8": 586, "9": 586}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "case", "ccmp", "dlig", "frac", "kern", "liga", "locl", "mark", "mkmk", "ordn", "sinf", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/PixelifySans%5Bwght%5D.ttf); SHA-256 der Quelle: `9ba86cd010a4de309d263ceff8e8044092c9db7efda869620cb9ff1c4389e8a5`.


## Jersey 10

Sarah Cadigan-Fried. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/jersey10). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey10/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### jersey-10/jersey-10.woff2

Original-WOFF2: 20400 Bytes; Subset: 12164 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1400; Versalhöhe: 750; x-Höhe: 600. Projektbeschreibung: Versalhöhe 10 Module; OS/2-Versalhöhe 750 FU; daraus 75 FU/Modul, UPM 1400 → 18.6667 CSS px bei DPR 1. Rechteckige Strickmodule; Verhältnis horizontal/vertikal und alle Glyphenkanten nicht vollständig geprüft. Nicht pixelgenau für beliebige 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [225, 300, 375, 450, 525, 600, 675, 750, 825, 900].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 825, "0": 525}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗. Im Subset: → ↗.

Ziffernvorschübe Default: `{"0": 525, "1": 300, "2": 600, "3": 600, "4": 525, "5": 525, "6": 600, "7": 525, "8": 600, "9": 600}`. tnum: True; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "case", "ccmp", "locl", "mark", "ordn", "pnum", "tnum"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey10/Jersey10-Regular.ttf); SHA-256 der Quelle: `db9cbd091617048a145d249daa2b815fe7083be6ab66ac26626e21a4e01c3e82`.


## Jersey 15

Sarah Cadigan-Fried. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/jersey15). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey15/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### jersey-15/jersey-15.woff2

Original-WOFF2: 25172 Bytes; Subset: 15400 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1350; Versalhöhe: 750; x-Höhe: 550. Projektbeschreibung: Versalhöhe 15 Module; OS/2-Versalhöhe 750 FU; daraus 50 FU/Modul, UPM 1350 → 27 CSS px bei DPR 1. Rechteckige Strickmodule; Verhältnis horizontal/vertikal und alle Glyphenkanten nicht vollständig geprüft. Nicht pixelgenau für beliebige 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 850, 900].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 850, "0": 550}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗. Im Subset: → ↗.

Ziffernvorschübe Default: `{"0": 550, "1": 350, "2": 600, "3": 600, "4": 550, "5": 550, "6": 600, "7": 550, "8": 600, "9": 600}`. tnum: True; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "case", "ccmp", "locl", "mark", "ordn", "pnum", "tnum"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey15/Jersey15-Regular.ttf); SHA-256 der Quelle: `dbe00479d62bb3b9fcf0d28f88a021ffc4bd7b01d6ad5c6f74b5fa371bb210ed`.


## Jersey 20

Sarah Cadigan-Fried. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/jersey20). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey20/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### jersey-20/jersey-20.woff2

Original-WOFF2: 28504 Bytes; Subset: 17992 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1292; Versalhöhe: 760; x-Höhe: 570. Projektbeschreibung: Versalhöhe 20 Module; OS/2-Versalhöhe 760 FU; daraus 38 FU/Modul, UPM 1292 → 34 CSS px bei DPR 1. Rechteckige Strickmodule; Verhältnis horizontal/vertikal und alle Glyphenkanten nicht vollständig geprüft. Nicht pixelgenau für beliebige 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [266, 304, 380, 418, 456, 494, 532, 570, 608, 646, 684, 722, 798, 836, 912].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 608, "m": 798, "0": 570}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗. Im Subset: → ↗.

Ziffernvorschübe Default: `{"0": 570, "1": 380, "2": 608, "3": 608, "4": 570, "5": 608, "6": 608, "7": 570, "8": 608, "9": 608}`. tnum: True; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "case", "ccmp", "locl", "mark", "ordn", "pnum", "tnum"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey20/Jersey20-Regular.ttf); SHA-256 der Quelle: `76670d7e8826860e3d2f2846b88bc1652135b8d54b6adfa5a87649b9fa4bd3b4`.


## Jersey 25

Sarah Cadigan-Fried. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/jersey25). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey25/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### jersey-25/jersey-25.woff2

Original-WOFF2: 32252 Bytes; Subset: 19392 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1230; Versalhöhe: 750; x-Höhe: 570. Projektbeschreibung: Versalhöhe 25 Module; OS/2-Versalhöhe 750 FU; daraus 30 FU/Modul, UPM 1230 → 41 CSS px bei DPR 1. Rechteckige Strickmodule; Verhältnis horizontal/vertikal und alle Glyphenkanten nicht vollständig geprüft. Nicht pixelgenau für beliebige 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630, 660, 690, 750, 780, 810, 840, 870, 930].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 570, "m": 780, "0": 570}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗. Im Subset: → ↗.

Ziffernvorschübe Default: `{"0": 570, "1": 390, "2": 600, "3": 600, "4": 570, "5": 600, "6": 600, "7": 570, "8": 600, "9": 600}`. tnum: True; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "case", "ccmp", "locl", "mark", "ordn", "pnum", "tnum"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey25/Jersey25-Regular.ttf); SHA-256 der Quelle: `4d4acdd89a748e9548041a3046d95536c500e1a7be9197c6aeef7d980f79d370`.


## Tiny5

Stefan Schmidt. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/tiny5). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/tiny5/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### tiny5/tiny5.woff2

Original-WOFF2: 72908 Bytes; Subset: 9352 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1024; Versalhöhe: 640; x-Höhe: 512. Dateigeometrie H: 128 FU/Modul, UPM 1024, Versalhöhe 5 Module. 1 Modul = 1 Gerätepixel bei 8 CSS px / DPR 1; 16 px = 2 Pixel. Default wdth=100,ROND=BLED=JITT=0. Bei 11/13 px keine ganzzahlige Moduldeckung; Achsen können Rasterbindung verändern.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [256, 384, 512, 640, 768].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 900.0}, "wdth": {"min": 50.0, "default": 100.0, "max": 200.0}, "ROND": {"min": 0.0, "default": 0.0, "max": 100.0}, "BLED": {"min": 0.0, "default": 0.0, "max": 100.0}, "JITT": {"min": 0.0, "default": 0.0, "max": 100.0}}`. Benannte Instanzen: `[{"name": "Thin", "coordinates": {"wght": 100.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "wdth": 100.0, "ROND": 0.0, "BLED": 0.0, "JITT": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 512, "m": 768, "0": 512}, "wght_min": {"n": 512.0, "m": 768.0, "0": 512.0}, "wght_max": {"n": 512.0, "m": 768.0, "0": 512.0}, "wdth_min": {"n": 256.0, "m": 384.0, "0": 256.0}, "wdth_max": {"n": 1024.0, "m": 1536.0, "0": 1024.0}, "ROND_min": {"n": 512.0, "m": 768.0, "0": 512.0}, "ROND_max": {"n": 512.0, "m": 768.0, "0": 512.0}, "BLED_min": {"n": 512.0, "m": 768.0, "0": 512.0}, "BLED_max": {"n": 512.0, "m": 768.0, "0": 512.0}, "JITT_min": {"n": 512.0, "m": 768.0, "0": 512.0}, "JITT_max": {"n": 512.0, "m": 768.0, "0": 512.0}}`. Verändernde Achsen: wdth.

Fehlende Zeichen im Original: keine. Im Subset: keine.

Ziffernvorschübe Default: `{"0": 512, "1": 512, "2": 512, "3": 512, "4": 512, "5": 512, "6": 512, "7": 512, "8": 512, "9": 512}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["ccmp", "kern", "mark", "mkmk"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/tiny5/Tiny5%5BBLED%2CJITT%2CROND%2Cwdth%2Cwght%5D.ttf); SHA-256 der Quelle: `588626f2c1b164f55927c0d8123f4bc134651aad7d257da68fc19b0824b0d8fa`.


## Micro 5

Sarah Cadigan-Fried. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/micro5). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/micro5/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### micro-5/micro-5.woff2

Original-WOFF2: 13000 Bytes; Subset: 8064 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1650; Versalhöhe: 750; x-Höhe: 600. Projektbeschreibung: Versalhöhe 5 Module; OS/2-Versalhöhe 750 FU; daraus 150 FU/Modul, UPM 1650 → 11 CSS px bei DPR 1. Rechteckige Strickmodule; Verhältnis horizontal/vertikal und alle Glyphenkanten nicht vollständig geprüft. Nicht pixelgenau für beliebige 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [300, 450, 600, 750, 900, 1050].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 900, "0": 600}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗. Im Subset: → ↗.

Ziffernvorschübe Default: `{"0": 600, "1": 450, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: True; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "case", "ccmp", "locl", "mark", "ordn", "pnum", "tnum"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/micro5/Micro5-Regular.ttf); SHA-256 der Quelle: `08a08c0d10129d2ecd869ff2f8914fcbf32487d3cbee3568b2a2957866dfdac8`.


## Raleway Dots

Matt McInerney, Pablo Impallari, Rodrigo Fuenzalida, Brenda Gallo. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/ralewaydots). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/ralewaydots/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen. Subset intern umbenannt: FS Research RD Dots.

### raleway-dots/raleway-dots.woff2

Original-WOFF2: 62416 Bytes; Subset: 45084 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 710; x-Höhe: 520. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [143, 171, 189, 194, 205, 208, 221, 225, 230, 236, 247, 306, 312, 327, 333, 395, 415, 426, 432, 444, 473, 476, 480, 482, 484, 486, 505, 512, 515, 518, 523, 524, 531, 532, 534, 537, 541, 543, 549, 559, 567, 568, 580, 581, 589, 590, 591, 592, 593, 605, 606, 607, 608, 610, 611, 616, 617, 622, 624, 625, 628, 629, 649, 652, 662, 663, 679, 682, 689, 698, 718, 728, 736, 759, 764, 778, 800, 821, 885, 909, 1042].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 568, "m": 909, "0": 616}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ẞ → ↗. Im Subset: ẞ → ↗.

Ziffernvorschübe Default: `{"0": 616, "1": 395, "2": 515, "3": 524, "4": 531, "5": 549, "6": 605, "7": 537, "8": 592, "9": 589}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02"]. Alle Features: ["aalt", "dlig", "kern", "liga", "lnum", "onum", "salt", "smcp", "ss01", "ss02"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/ralewaydots/RalewayDots-Regular.ttf); SHA-256 der Quelle: `a35582c11e29d5d40bf5ed263f4be18c42264376b51b6b8a7a1b79252b853e09`.


## Codystar

Neapolitan. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/codystar). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/codystar/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen. Subset intern umbenannt: FS Research CS.

### codystar/codystar.woff2

Original-WOFF2: 42056 Bytes; Subset: 37936 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1024; Versalhöhe: 761; x-Höhe: 753. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [138, 139, 178, 180, 202, 224, 225, 227, 261, 292, 316, 327, 365, 376, 419, 444, 457, 480, 481, 492, 510, 516, 520, 534, 538, 540, 541, 543, 544, 549, 561, 562, 564, 579, 580, 589, 601, 603, 607, 608, 614, 624, 627, 637, 647, 650, 654, 666, 669, 710, 714, 753, 782, 794, 801, 811, 821, 824, 889, 892, 932].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 824, "m": 889, "0": 589}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ẞ → ↗ ĳ. Im Subset: ẞ → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 589, "1": 316, "2": 520, "3": 538, "4": 544, "5": 510, "6": 603, "7": 516, "8": 564, "9": 601}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: [].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/codystar/Codystar-Regular.ttf); SHA-256 der Quelle: `99f059a3e31afdaf3fea53d39bc62b15df38a5d882104ae1d1a5ca2df547c10a`.


## Sixtyfour

Jens Kutílek. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/sixtyfour). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/sixtyfour/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### sixtyfour/sixtyfour.woff2

Original-WOFF2: 9064 Bytes; Subset: 5652 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1024; Versalhöhe: 896; x-Höhe: 640. Dateigeometrie H: vertikale Zeilenteilung 128 FU bei UPM 1024 → 8 px pro 1 Gerätepixel/Zeile. Default-Tintenstreifen 100 FU hoch (y=14…114); SCAN/BLED verändern Konturen. Ganzzahlige Zeilenteilung allein garantiert keine scharfen Streifenkanten.

monospaced; post.isFixedPitch=True; ASCII-Breiten: [1024].

Achsen (aus fvar): `{"SCAN": {"min": -53.0, "default": 0.0, "max": 100.0}, "BLED": {"min": 0.0, "default": 0.0, "max": 100.0}}`. Benannte Instanzen: `[{"name": "Delicate", "coordinates": {"SCAN": -53.0, "BLED": 0.0}}, {"name": "Slight", "coordinates": {"SCAN": -45.0, "BLED": 0.0}}, {"name": "Evenly", "coordinates": {"SCAN": -27.0, "BLED": 0.0}}, {"name": "Close", "coordinates": {"SCAN": 0.0, "BLED": 0.0}}, {"name": "Touching", "coordinates": {"SCAN": 21.0, "BLED": 0.0}}, {"name": "Overlapping", "coordinates": {"SCAN": 37.0, "BLED": 0.0}}, {"name": "Overexposed", "coordinates": {"SCAN": 67.0, "BLED": 0.0}}, {"name": "Maximum", "coordinates": {"SCAN": 100.0, "BLED": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 1024, "m": 1024, "0": 1024}, "SCAN_min": {"n": 1024.0, "m": 1024.0, "0": 1024.0}, "SCAN_max": {"n": 1024.0, "m": 1024.0, "0": 1024.0}, "BLED_min": {"n": 1024.0, "m": 1024.0, "0": 1024.0}, "BLED_max": {"n": 1024.0, "m": 1024.0, "0": 1024.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ẞ ↗ ĳ. Im Subset: ẞ ↗ ĳ.

Ziffernvorschübe Default: `{"0": 1024, "1": 1024, "2": 1024, "3": 1024, "4": 1024, "5": 1024, "6": 1024, "7": 1024, "8": 1024, "9": 1024}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02", "ss03", "ss04"]. Alle Features: ["aalt", "salt", "ss01", "ss02", "ss03", "ss04"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/sixtyfour/Sixtyfour%5BBLED%2CSCAN%5D.ttf); SHA-256 der Quelle: `3d5a3bb3257a491124347bac83ca7f0c8c77a9961270f353b498f3153e751c68`.


## Workbench

Jens Kutílek. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/workbench). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/workbench/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### workbench/workbench.woff2

Original-WOFF2: 5416 Bytes; Subset: 4760 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1024; Versalhöhe: 896; x-Höhe: 640. Dateigeometrie H: vertikale Zeilenteilung 128 FU bei UPM 1024 → 8 px pro 1 Gerätepixel/Zeile. Default-Tintenstreifen 100 FU hoch (y=14…114); SCAN/BLED verändern Konturen. Ganzzahlige Zeilenteilung allein garantiert keine scharfen Streifenkanten.

monospaced; post.isFixedPitch=True; ASCII-Breiten: [512].

Achsen (aus fvar): `{"SCAN": {"min": -53.0, "default": 0.0, "max": 100.0}, "BLED": {"min": 0.0, "default": 0.0, "max": 100.0}}`. Benannte Instanzen: `[{"name": "Delicate", "coordinates": {"SCAN": -53.0, "BLED": 0.0}}, {"name": "Slight", "coordinates": {"SCAN": -45.0, "BLED": 0.0}}, {"name": "Evenly", "coordinates": {"SCAN": -27.0, "BLED": 0.0}}, {"name": "Close", "coordinates": {"SCAN": 0.0, "BLED": 0.0}}, {"name": "Touching", "coordinates": {"SCAN": 21.0, "BLED": 0.0}}, {"name": "Overlapping", "coordinates": {"SCAN": 37.0, "BLED": 0.0}}, {"name": "Overexposed", "coordinates": {"SCAN": 67.0, "BLED": 0.0}}, {"name": "Maximum", "coordinates": {"SCAN": 100.0, "BLED": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 512, "m": 512, "0": 512}, "SCAN_min": {"n": 512.0, "m": 512.0, "0": 512.0}, "SCAN_max": {"n": 512.0, "m": 512.0, "0": 512.0}, "BLED_min": {"n": 512.0, "m": 512.0, "0": 512.0}, "BLED_max": {"n": 512.0, "m": 512.0, "0": 512.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ẞ → ↗ ĳ. Im Subset: ẞ → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 512, "1": 512, "2": 512, "3": 512, "4": 512, "5": 512, "6": 512, "7": 512, "8": 512, "9": 512}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/workbench/Workbench%5BBLED%2CSCAN%5D.ttf); SHA-256 der Quelle: `027940fb7aea63f260fb367957e419c08f904f357b384c819f99eb06e7af17d6`.


## Kode Mono

Isa Ozler. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/kodemono). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/kodemono/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### kode-mono/kode-mono.woff2

Original-WOFF2: 102764 Bytes; Subset: 72508 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 700; x-Höhe: 500. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

monospaced; post.isFixedPitch=True; ASCII-Breiten: [600].

Achsen (aus fvar): `{"wght": {"min": 400.0, "default": 400.0, "max": 700.0}, "wdth": {"min": 75.0, "default": 100.0, "max": 125.0}, "ROND": {"min": 0.0, "default": 0.0, "max": 100.0}}`. Benannte Instanzen: `[{"name": "Regular", "coordinates": {"wght": 400.0, "wdth": 100.0, "ROND": 0.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "wdth": 100.0, "ROND": 0.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "wdth": 100.0, "ROND": 0.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "wdth": 100.0, "ROND": 0.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "wdth_min": {"n": 450.0, "m": 450.0, "0": 450.0}, "wdth_max": {"n": 750.0, "m": 750.0, "0": 750.0}, "ROND_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ROND_max": {"n": 600.0, "m": 600.0, "0": 600.0}}`. Verändernde Achsen: wdth.

Fehlende Zeichen im Original: keine. Im Subset: keine.

Ziffernvorschübe Default: `{"0": 600, "1": 600, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02"]. Alle Features: ["aalt", "calt", "ccmp", "dnom", "frac", "locl", "mark", "mkmk", "numr", "ordn", "sinf", "ss01", "ss02", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/kodemono/KodeMono%5BROND%2Cwdth%2Cwght%5D.ttf); SHA-256 der Quelle: `bd7b11b37524e03e270c7a1726f08cc52cb17e8ebc3f664f9d323dfd9277b311`.


## Martian Mono

Roman Shamin, Evil Martians. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/martianmono). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/martianmono/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### martian-mono/martian-mono.woff2

Original-WOFF2: 63400 Bytes; Subset: 36544 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 800; x-Höhe: 600. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

monospaced; post.isFixedPitch=True; ASCII-Breiten: [750].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 400.0, "max": 800.0}, "wdth": {"min": 75.0, "default": 112.5, "max": 112.5}}`. Benannte Instanzen: `[{"name": "Thin", "coordinates": {"wght": 100.0, "wdth": 100.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "wdth": 100.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "wdth": 100.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "wdth": 100.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "wdth": 100.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "wdth": 100.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "wdth": 100.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "wdth": 100.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 750, "m": 750, "0": 750}, "wght_min": {"n": 750.0, "m": 750.0, "0": 750.0}, "wght_max": {"n": 750.0, "m": 750.0, "0": 750.0}, "wdth_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wdth_max": {"n": 750.0, "m": 750.0, "0": 750.0}}`. Verändernde Achsen: wdth.

Fehlende Zeichen im Original: ↗. Im Subset: ↗.

Ziffernvorschübe Default: `{"0": 750, "1": 750, "2": 750, "3": 750, "4": 750, "5": 750, "6": 750, "7": 750, "8": 750, "9": 750}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "calt", "case", "ccmp", "cv01", "cv02", "dnom", "frac", "locl", "mark", "mkmk", "numr", "ordn", "rvrn", "sinf", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/martianmono/MartianMono%5Bwdth%2Cwght%5D.ttf); SHA-256 der Quelle: `c3467843ec1c2574b05fbcfd7147c7bfbcf63ddca8fc2bcb9d117f1bfb1b22e7`.


## Xanh Mono

Yellow Type, Lâm Bảo, Duy Dao. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/xanhmono). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/xanhmono/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### xanh-mono/xanh-mono.woff2

Original-WOFF2: 24332 Bytes; Subset: 16516 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 740; x-Höhe: 540. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

monospaced; post.isFixedPitch=True; ASCII-Breiten: [500].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 500, "m": 500, "0": 500}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 500, "1": 500, "2": 500, "3": 500, "4": 500, "5": 500, "6": 500, "7": 500, "8": 500, "9": 500}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "ccmp", "dnom", "frac", "locl", "mark", "mkmk", "numr", "ordn", "sinf", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/xanhmono/XanhMono-Regular.ttf); SHA-256 der Quelle: `33e64b43fdcb40bd0141853601c7aaffd5be15ebd3cf56340d2473ff8be8e69c`.


## Space Mono

Colophon Foundry. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/spacemono). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### space-mono/space-mono.woff2

Original-WOFF2: 34948 Bytes; Subset: 18060 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 700; x-Höhe: 496. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

monospaced; post.isFixedPitch=True; ASCII-Breiten: [612].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 612, "m": 612, "0": 612}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: keine. Im Subset: keine.

Ziffernvorschübe Default: `{"0": 612, "1": 612, "2": 612, "3": 612, "4": 612, "5": 612, "6": 612, "7": 612, "8": 612, "9": 612}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02"]. Alle Features: ["aalt", "case", "ccmp", "dlig", "dnom", "frac", "locl", "mark", "mkmk", "numr", "onum", "ordn", "sinf", "ss01", "ss02", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/SpaceMono-Regular.ttf); SHA-256 der Quelle: `95837e182baeeada83368f7748db28357f0a1b75c6b84ff7065b5edf933c8e18`.


## Big Shoulders Stencil

Patric King. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/bigshouldersstencil). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/bigshouldersstencil/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### big-shoulders-stencil/big-shoulders-stencil.woff2

Original-WOFF2: 129872 Bytes; Subset: 76188 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 2000; Versalhöhe: 1600; x-Höhe: 1200. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [250, 280, 316, 342, 360, 378, 390, 392, 400, 422, 424, 428, 450, 462, 468, 478, 484, 488, 492, 496, 512, 514, 515, 517, 518, 521, 525, 528, 535, 540, 541, 545, 548, 549, 554, 556, 559, 560, 569, 570, 572, 580, 583, 585, 586, 590, 596, 597, 600, 610, 618, 650, 652, 720, 732, 764, 768, 770, 772, 782, 788, 814, 828, 896, 928, 1312].

Achsen (aus fvar): `{"wght": {"min": 100.0, "default": 100.0, "max": 900.0}, "opsz": {"min": 10.0, "default": 72.0, "max": 72.0}}`. Benannte Instanzen: `[{"name": "Thin", "coordinates": {"wght": 100.0, "opsz": 72.0}}, {"name": "ExtraLight", "coordinates": {"wght": 200.0, "opsz": 72.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "opsz": 72.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "opsz": 72.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "opsz": 72.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "opsz": 72.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "opsz": 72.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "opsz": 72.0}}, {"name": "Black", "coordinates": {"wght": 900.0, "opsz": 72.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 586, "m": 896, "0": 596}, "wght_min": {"n": 586.0, "m": 896.0, "0": 596.0}, "wght_max": {"n": 1006.0, "m": 1540.0, "0": 1014.0}, "opsz_min": {"n": 708.0, "m": 1052.0, "0": 695.0}, "opsz_max": {"n": 586.0, "m": 896.0, "0": 596.0}}`. Verändernde Achsen: wght, opsz.

Fehlende Zeichen im Original: ĳ. Im Subset: ĳ.

Ziffernvorschübe Default: `{"0": 596, "1": 316, "2": 618, "3": 590, "4": 652, "5": 600, "6": 585, "7": 492, "8": 580, "9": 583}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01"]. Alle Features: ["aalt", "c2sc", "case", "ccmp", "dlig", "dnom", "frac", "kern", "liga", "locl", "mark", "mkmk", "numr", "ordn", "salt", "sinf", "smcp", "ss01", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/bigshouldersstencil/BigShouldersStencil%5Bopsz%2Cwght%5D.ttf); SHA-256 der Quelle: `758ec880296a8bdaf736a31fc57e90fa16673d8c357efc3c36bdb6582d625f0a`.


## Oxanium

Severin Meyer. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/oxanium). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/oxanium/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### oxanium/oxanium.woff2

Original-WOFF2: 18940 Bytes; Subset: 12900 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 690; x-Höhe: 515. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [194, 215, 230, 238, 249, 251, 288, 315, 348, 349, 353, 356, 361, 362, 373, 486, 492, 495, 496, 497, 498, 500, 505, 526, 537, 558, 562, 569, 575, 577, 578, 579, 580, 581, 582, 588, 595, 598, 599, 602, 605, 608, 625, 635, 639, 650, 665, 675, 683, 695, 709, 760, 795, 843, 847, 891, 898].

Achsen (aus fvar): `{"wght": {"min": 200.0, "default": 200.0, "max": 800.0}}`. Benannte Instanzen: `[{"name": "ExtraLight", "coordinates": {"wght": 200.0}}, {"name": "Light", "coordinates": {"wght": 300.0}}, {"name": "Regular", "coordinates": {"wght": 400.0}}, {"name": "Medium", "coordinates": {"wght": 500.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0}}, {"name": "Bold", "coordinates": {"wght": 700.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 581, "m": 891, "0": 578}, "wght_min": {"n": 581.0, "m": 891.0, "0": 578.0}, "wght_max": {"n": 598.0, "m": 908.0, "0": 578.0}}`. Verändernde Achsen: wght.

Fehlende Zeichen im Original: → ↗ ĳ. Im Subset: → ↗ ĳ.

Ziffernvorschübe Default: `{"0": 578, "1": 578, "2": 578, "3": 578, "4": 578, "5": 578, "6": 578, "7": 578, "8": 578, "9": 578}`. tnum: False; zero: True. zero vorhanden Stylistic sets: []. Alle Features: ["ccmp", "kern", "mark", "pnum", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/oxanium/Oxanium%5Bwght%5D.ttf); SHA-256 der Quelle: `2ce01d946e1e1ffc8d7eecfffbda8623bedd63eaf811a20488c4b69af45babb0`.


## Chakra Petch

Cadson Demak. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/chakrapetch). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/chakrapetch/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### chakra-petch/chakra-petch.woff2

Original-WOFF2: 25220 Bytes; Subset: 8840 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 700; x-Höhe: 498. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

proportional / semi-mono (siehe Breiten); post.isFixedPitch=False; ASCII-Breiten: [196, 206, 234, 240, 244, 246, 259, 309, 340, 344, 358, 376, 385, 390, 402, 422, 465, 474, 480, 482, 488, 498, 512, 524, 532, 534, 537, 540, 550, 551, 552, 555, 556, 560, 561, 562, 567, 568, 569, 570, 573, 578, 579, 580, 582, 590, 592, 598, 603, 604, 613, 614, 617, 620, 622, 626, 628, 631, 636, 638, 646, 651, 652, 664, 673, 674, 676, 687, 707, 777, 811, 826, 837, 863].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 568, "m": 837, "0": 628}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ↗. Im Subset: ↗.

Ziffernvorschübe Default: `{"0": 628, "1": 358, "2": 550, "3": 579, "4": 555, "5": 582, "6": 598, "7": 498, "8": 614, "9": 603}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: []. Alle Features: ["aalt", "ccmp", "frac", "kern", "liga", "locl", "mark", "mkmk", "ordn", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/chakrapetch/ChakraPetch-Regular.ttf); SHA-256 der Quelle: `98fcd638baa5c81ff0316b7538ce330ee3b23b1302726de3526d5933a8ecf986`.


## DotGothic16

Fontworks Inc.. [Originalquelle](https://github.com/google/fonts/tree/main/ofl/dotgothic16). [Lizenzquelle](https://raw.githubusercontent.com/google/fonts/main/ofl/dotgothic16/OFL.txt).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### dotgothic16/dotgothic16.woff2

Original-WOFF2: 501380 Bytes; Subset: 16508 Bytes. Verlustfrei aus vollständiger Google-Fonts-TTF konvertiert; keine offizielle Original-WOFF2 geliefert.

UPM: 1000; Versalhöhe: 787; x-Höhe: 540. Raster-/modulbasiert; genaue Modulgröße zur em nicht unabhängig belegt; keine Pixeldeckung bei 11–16 px behauptet.

monospaced; post.isFixedPitch=False; ASCII-Breiten: [500].

Achsen (aus fvar): `{}`. Benannte Instanzen: `[]`.

Vorschübe in Font-Units: `{"default": {"n": 500, "m": 500, "0": 500}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ẞ ↗ ĳ. Im Subset: ẞ ↗ ĳ.

Ziffernvorschübe Default: `{"0": 500, "1": 500, "2": 500, "3": 500, "4": 500, "5": 500, "6": 500, "7": 500, "8": 500, "9": 500}`. tnum: False; zero: True. zero vorhanden Stylistic sets: []. Alle Features: ["dlig", "expt", "fwid", "halt", "hwid", "jp04", "jp78", "liga", "nlck", "pwid", "trad", "vert", "vhal", "vrt2", "zero"].

[Quelldatei](https://raw.githubusercontent.com/google/fonts/main/ofl/dotgothic16/DotGothic16-Regular.ttf); SHA-256 der Quelle: `3ad9af88726d42b40f7f365f0dcac785af73cf20ea6f1d5b44e57cc21150b8f1`.


## Commit Mono

Eigil Nikolajsen. [Originalquelle](https://github.com/eigilnikolajsen/commit-mono). [Lizenzquelle](https://raw.githubusercontent.com/eigilnikolajsen/commit-mono/main/LICENSE-FONT).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen.

### commit-mono/commit-mono.woff2

Original-WOFF2: 86768 Bytes; Subset: 37552 Bytes. Offizielle WOFF2 unverändert.

UPM: 1000; Versalhöhe: 700; x-Höhe: 540. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

monospaced; Breitenachse kann Vorschübe ändern; post.isFixedPitch=True; ASCII-Breiten: [600].

Achsen (aus fvar): `{"wght": {"min": 200.0, "default": 200.0, "max": 700.0}, "ital": {"min": 0.0, "default": 0.0, "max": 1.0}}`. Benannte Instanzen: `[{"name": "200 Regular", "coordinates": {"wght": 200.0, "ital": 0.0}}, {"name": "200 Italic", "coordinates": {"wght": 200.0, "ital": 1.0}}, {"name": "225 Regular", "coordinates": {"wght": 225.0, "ital": 0.0}}, {"name": "225 Italic", "coordinates": {"wght": 225.0, "ital": 1.0}}, {"name": "250 Regular", "coordinates": {"wght": 250.0, "ital": 0.0}}, {"name": "250 Italic", "coordinates": {"wght": 250.0, "ital": 1.0}}, {"name": "275 Regular", "coordinates": {"wght": 275.0, "ital": 0.0}}, {"name": "275 Italic", "coordinates": {"wght": 275.0, "ital": 1.0}}, {"name": "300 Regular", "coordinates": {"wght": 300.0, "ital": 0.0}}, {"name": "300 Italic", "coordinates": {"wght": 300.0, "ital": 1.0}}, {"name": "325 Regular", "coordinates": {"wght": 325.0, "ital": 0.0}}, {"name": "325 Italic", "coordinates": {"wght": 325.0, "ital": 1.0}}, {"name": "350 Regular", "coordinates": {"wght": 350.0, "ital": 0.0}}, {"name": "350 Italic", "coordinates": {"wght": 350.0, "ital": 1.0}}, {"name": "375 Regular", "coordinates": {"wght": 375.0, "ital": 0.0}}, {"name": "375 Italic", "coordinates": {"wght": 375.0, "ital": 1.0}}, {"name": "400 Regular", "coordinates": {"wght": 400.0, "ital": 0.0}}, {"name": "400 Italic", "coordinates": {"wght": 400.0, "ital": 1.0}}, {"name": "425 Regular", "coordinates": {"wght": 425.0, "ital": 0.0}}, {"name": "425 Italic", "coordinates": {"wght": 425.0, "ital": 1.0}}, {"name": "450 Regular", "coordinates": {"wght": 450.0, "ital": 0.0}}, {"name": "450 Italic", "coordinates": {"wght": 450.0, "ital": 1.0}}, {"name": "475 Regular", "coordinates": {"wght": 475.0, "ital": 0.0}}, {"name": "475 Italic", "coordinates": {"wght": 475.0, "ital": 1.0}}, {"name": "500 Regular", "coordinates": {"wght": 500.0, "ital": 0.0}}, {"name": "500 Italic", "coordinates": {"wght": 500.0, "ital": 1.0}}, {"name": "525 Regular", "coordinates": {"wght": 525.0, "ital": 0.0}}, {"name": "525 Italic", "coordinates": {"wght": 525.0, "ital": 1.0}}, {"name": "550 Regular", "coordinates": {"wght": 550.0, "ital": 0.0}}, {"name": "550 Italic", "coordinates": {"wght": 550.0, "ital": 1.0}}, {"name": "575 Regular", "coordinates": {"wght": 575.0, "ital": 0.0}}, {"name": "575 Italic", "coordinates": {"wght": 575.0, "ital": 1.0}}, {"name": "600 Regular", "coordinates": {"wght": 600.0, "ital": 0.0}}, {"name": "600 Italic", "coordinates": {"wght": 600.0, "ital": 1.0}}, {"name": "625 Regular", "coordinates": {"wght": 625.0, "ital": 0.0}}, {"name": "625 Italic", "coordinates": {"wght": 625.0, "ital": 1.0}}, {"name": "650 Regular", "coordinates": {"wght": 650.0, "ital": 0.0}}, {"name": "650 Italic", "coordinates": {"wght": 650.0, "ital": 1.0}}, {"name": "675 Regular", "coordinates": {"wght": 675.0, "ital": 0.0}}, {"name": "675 Italic", "coordinates": {"wght": 675.0, "ital": 1.0}}, {"name": "700 Regular", "coordinates": {"wght": 700.0, "ital": 0.0}}, {"name": "700 Italic", "coordinates": {"wght": 700.0, "ital": 1.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}, "ital_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "ital_max": {"n": 600.0, "m": 600.0, "0": 600.0}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: ẞ ↗. Im Subset: ẞ ↗.

Ziffernvorschübe Default: `{"0": 600, "1": 600, "2": 600, "3": 600, "4": 600, "5": 600, "6": 600, "7": 600, "8": 600, "9": 600}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02", "ss03", "ss04", "ss05"]. Alle Features: ["cv01", "cv02", "cv03", "cv04", "cv05", "cv06", "cv07", "cv08", "cv09", "cv10", "cv11", "ss01", "ss02", "ss03", "ss04", "ss05"].

[Quelldatei](https://raw.githubusercontent.com/eigilnikolajsen/commit-mono/main/src/fonts/fontlab/CommitMonoV143-VF.woff2); SHA-256 der Quelle: `f342ca6c3f2597e6c0fcd84b3f3ed64d3ce5bdb6d0af19d190d645a558b1cf29`.


## Monaspace Neon

GitHub Next / Lettermatic. [Originalquelle](https://github.com/githubnext/monaspace). [Lizenzquelle](https://raw.githubusercontent.com/githubnext/monaspace/main/LICENSE).

SIL Open Font License 1.1. > This Font Software is licensed under the SIL Open Font License, Version 1.1.

Selfhosting, Subsetting und öffentliches Git: erlaubt. OFL und Copyright beilegen; kein Einzelverkauf; Derivate unter OFL; geschützte Namen für modifizierte Dateien ersetzen. Subset intern umbenannt: FS Research MN Neon.

### monaspace-neon/monaspace-neon.woff2

Original-WOFF2: 510832 Bytes; Subset: 99132 Bytes. Offizielle WOFF2 unverändert.

UPM: 2000; Versalhöhe: 1460; x-Höhe: 1000. Nicht rastergebunden (Outline); keine garantierte Pixeldeckung bei 11–16 px.

monospaced; Breitenachse kann Vorschübe ändern; post.isFixedPitch=False; ASCII-Breiten: [1240].

Achsen (aus fvar): `{"wght": {"min": 200.0, "default": 200.0, "max": 800.0}, "wdth": {"min": 100.0, "default": 100.0, "max": 125.0}, "slnt": {"min": -11.0, "default": 0.0, "max": 0.0}}`. Benannte Instanzen: `[{"name": "ExtraLight", "coordinates": {"wght": 200.0, "wdth": 100.0, "slnt": 0.0}}, {"name": "Light", "coordinates": {"wght": 300.0, "wdth": 100.0, "slnt": 0.0}}, {"name": "Regular", "coordinates": {"wght": 400.0, "wdth": 100.0, "slnt": 0.0}}, {"name": "Medium", "coordinates": {"wght": 500.0, "wdth": 100.0, "slnt": 0.0}}, {"name": "SemiBold", "coordinates": {"wght": 600.0, "wdth": 100.0, "slnt": 0.0}}, {"name": "Bold", "coordinates": {"wght": 700.0, "wdth": 100.0, "slnt": 0.0}}, {"name": "ExtraBold", "coordinates": {"wght": 800.0, "wdth": 100.0, "slnt": 0.0}}, {"name": "ExtraLight Italic", "coordinates": {"wght": 200.0, "wdth": 100.0, "slnt": -11.0}}, {"name": "Light Italic", "coordinates": {"wght": 300.0, "wdth": 100.0, "slnt": -11.0}}, {"name": "Italic", "coordinates": {"wght": 400.0, "wdth": 100.0, "slnt": -11.0}}, {"name": "Medium Italic", "coordinates": {"wght": 500.0, "wdth": 100.0, "slnt": -11.0}}, {"name": "SemiBold Italic", "coordinates": {"wght": 600.0, "wdth": 100.0, "slnt": -11.0}}, {"name": "Bold Italic", "coordinates": {"wght": 700.0, "wdth": 100.0, "slnt": -11.0}}, {"name": "ExtraBold Italic", "coordinates": {"wght": 800.0, "wdth": 100.0, "slnt": -11.0}}, {"name": "SemiWide ExtraLight", "coordinates": {"wght": 200.0, "wdth": 112.5, "slnt": 0.0}}, {"name": "SemiWide Light", "coordinates": {"wght": 300.0, "wdth": 112.5, "slnt": 0.0}}, {"name": "SemiWide Regular", "coordinates": {"wght": 400.0, "wdth": 112.5, "slnt": 0.0}}, {"name": "SemiWide Medium", "coordinates": {"wght": 500.0, "wdth": 112.5, "slnt": 0.0}}, {"name": "SemiWide SemiBold", "coordinates": {"wght": 600.0, "wdth": 112.5, "slnt": 0.0}}, {"name": "SemiWide Bold", "coordinates": {"wght": 700.0, "wdth": 112.5, "slnt": 0.0}}, {"name": "SemiWide ExtraBold", "coordinates": {"wght": 800.0, "wdth": 112.5, "slnt": 0.0}}, {"name": "SemiWide ExtraLight Italic", "coordinates": {"wght": 200.0, "wdth": 112.5, "slnt": -11.0}}, {"name": "SemiWide Light Italic", "coordinates": {"wght": 300.0, "wdth": 112.5, "slnt": -11.0}}, {"name": "SemiWide Italic", "coordinates": {"wght": 400.0, "wdth": 112.5, "slnt": -11.0}}, {"name": "SemiWide Medium Italic", "coordinates": {"wght": 500.0, "wdth": 112.5, "slnt": -11.0}}, {"name": "SemiWide SemiBold Italic", "coordinates": {"wght": 600.0, "wdth": 112.5, "slnt": -11.0}}, {"name": "SemiWide Bold Italic", "coordinates": {"wght": 700.0, "wdth": 112.5, "slnt": -11.0}}, {"name": "SemiWide ExtraBold Italic", "coordinates": {"wght": 800.0, "wdth": 112.5, "slnt": -11.0}}, {"name": "Wide ExtraLight", "coordinates": {"wght": 200.0, "wdth": 125.0, "slnt": 0.0}}, {"name": "Wide Light", "coordinates": {"wght": 300.0, "wdth": 125.0, "slnt": 0.0}}, {"name": "Wide Regular", "coordinates": {"wght": 400.0, "wdth": 125.0, "slnt": 0.0}}, {"name": "Wide Medium", "coordinates": {"wght": 500.0, "wdth": 125.0, "slnt": 0.0}}, {"name": "Wide SemiBold", "coordinates": {"wght": 600.0, "wdth": 125.0, "slnt": 0.0}}, {"name": "Wide Bold", "coordinates": {"wght": 700.0, "wdth": 125.0, "slnt": 0.0}}, {"name": "Wide ExtraBold", "coordinates": {"wght": 800.0, "wdth": 125.0, "slnt": 0.0}}, {"name": "Wide ExtraLight Italic", "coordinates": {"wght": 200.0, "wdth": 125.0, "slnt": -11.0}}, {"name": "Wide Light Italic", "coordinates": {"wght": 300.0, "wdth": 125.0, "slnt": -11.0}}, {"name": "Wide Italic", "coordinates": {"wght": 400.0, "wdth": 125.0, "slnt": -11.0}}, {"name": "Wide Medium Italic", "coordinates": {"wght": 500.0, "wdth": 125.0, "slnt": -11.0}}, {"name": "Wide SemiBold Italic", "coordinates": {"wght": 600.0, "wdth": 125.0, "slnt": -11.0}}, {"name": "Wide Bold Italic", "coordinates": {"wght": 700.0, "wdth": 125.0, "slnt": -11.0}}, {"name": "Wide ExtraBold Italic", "coordinates": {"wght": 800.0, "wdth": 125.0, "slnt": -11.0}}]`.

Vorschübe in Font-Units: `{"default": {"n": 1240, "m": 1240, "0": 1240}, "wght_min": {"n": 1240, "m": 1240, "0": 1240}, "wght_max": {"n": 1240, "m": 1240, "0": 1240}, "wdth_min": {"n": 1240, "m": 1240, "0": 1240}, "wdth_max": {"n": 1240, "m": 1240, "0": 1240}, "slnt_min": {"n": 1240, "m": 1240, "0": 1240}, "slnt_max": {"n": 1240, "m": 1240, "0": 1240}}`. Verändernde Achsen: keine im n/m/0-Test.

Fehlende Zeichen im Original: keine. Im Subset: keine.

Ziffernvorschübe Default: `{"0": 1240, "1": 1240, "2": 1240, "3": 1240, "4": 1240, "5": 1240, "6": 1240, "7": 1240, "8": 1240, "9": 1240}`. tnum: False; zero: False. Kein zero-Tag; durchgestrichene Standardnull / Zuordnung der ss-Sets nicht visuell verifiziert. Stylistic sets: ["ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08", "ss09", "ss10"]. Alle Features: ["aalt", "calt", "case", "ccmp", "cv01", "cv02", "cv10", "cv11", "cv12", "cv13", "cv30", "cv31", "cv32", "cv33", "cv60", "cv61", "cv62", "dnom", "fina", "frac", "fwid", "init", "ital", "liga", "locl", "medi", "numr", "ordn", "rlig", "sinf", "ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08", "ss09", "ss10", "subs", "sups"].

[Quelldatei](https://raw.githubusercontent.com/githubnext/monaspace/main/fonts/Web%20Fonts/Variable%20Web%20Fonts/Monaspace%20Neon/Monaspace%20Neon%20Var.woff2); SHA-256 der Quelle: `6569968f448ae856ab5b57dff1f13b109b220ca8e3f664169e135fcb5c4f0721`.


## PP NeueBit

Steve Marchal. [Originalquelle](https://pangrampangram.com/products/bitmap-neuebit). [Lizenzquelle](https://pangrampangram.com/pages/eula).

Proprietär: Pangram Pangram EULA. > To use a Font on a website, the Licensee needs to purchase a Web License

Zwei statische Schnitte Regular 400 / Bold 700 laut Produktseite; OTF/TTF/WOFF/WOFF2; keine fvar/cmap/Größenmessung ohne Download.

Konkreter Webpreis nicht verifiziert. Produkt-JSON liefert 0 für Stilvarianten, ist kein Weblizenzpreis; Auswahl abhängig von Gewichten, Nutzung und Pageviews.

EULA 2.1: 1 Jahr; FAQ nennt unbefristete Lizenz für Einzelpersonen/Freelancer. Für Kundenunternehmen passende Laufzeit klären.

Selfhosting: Ja mit bezahlter Weblizenz, Domain/Subdomain und monatliche Pageviews beachten. Subsetting: Nicht ohne schriftliche Freigabe: EULA 3.6 verbietet direkte Fontdatei-Modifikation. Öffentliches Git: nein. Bitmap; genaue Modulgröße ohne Datei ungeklärt.


## PP Mondwest

Steve Marchal. [Originalquelle](https://pangrampangram.com/products/bitmap-mondwest). [Lizenzquelle](https://pangrampangram.com/pages/eula).

Proprietär: Pangram Pangram EULA. > To use a Font on a website, the Licensee needs to purchase a Web License

Zwei statische Schnitte Regular 400 / Bold 700 laut Produktseite; OTF/TTF/WOFF/WOFF2; keine fvar/cmap/Größenmessung ohne Download.

Konkreter Webpreis nicht verifiziert. Produkt-JSON liefert 0 für Stilvarianten, ist kein Weblizenzpreis; Auswahl abhängig von Gewichten, Nutzung und Pageviews.

EULA 2.1: 1 Jahr; FAQ nennt unbefristete Lizenz für Einzelpersonen/Freelancer. Für Kundenunternehmen passende Laufzeit klären.

Selfhosting: Ja mit bezahlter Weblizenz, Domain/Subdomain und monatliche Pageviews beachten. Subsetting: Nicht ohne schriftliche Freigabe: EULA 3.6 verbietet direkte Fontdatei-Modifikation. Öffentliches Git: nein. Bitmap; genaue Modulgröße ohne Datei ungeklärt.


## Geist: Geschwister und kleine Größen

Vercel nennt vertikale Abstimmung, semi-mono horizontale Metriken. Pixel ELSH und Sans/Mono wght sind getrennte Dateien, kein Morphing zwischen ihnen in einer VF. Dateimetriken der gewählten GF-Versionen unten; gleiche vertikale Designabsicht bedeutet nicht identische Vorschübe.

[Vercel-Beleg](https://vercel.com/blog/introducing-geist-pixel). Gemessene Daten: `{"Geist Pixel": {"upm": 1000, "cap_height": 722, "x_height": 532, "advance_n_m_0": {"default": {"n": 570, "m": 760, "0": 570}, "ELSH_min": {"n": 570.0, "m": 760.0, "0": 570.0}, "ELSH_max": {"n": 570.0, "m": 760.0, "0": 570.0}}}, "Geist": {"upm": 1000, "cap_height": 710, "x_height": 530, "advance_n_m_0": {"default": {"n": 581, "m": 877, "0": 663}, "wght_min": {"n": 556.0, "m": 846.0, "0": 648.0}, "wght_max": {"n": 631.0, "m": 915.0, "0": 713.0}}}, "Geist Mono": {"upm": 1000, "cap_height": 710, "x_height": 530, "advance_n_m_0": {"default": {"n": 600, "m": 600, "0": 600}, "wght_min": {"n": 600.0, "m": 600.0, "0": 600.0}, "wght_max": {"n": 600.0, "m": 600.0, "0": 600.0}}}}`.


## Weitere Recherche

- [TINY 5×3](https://velvetyne.fr/fonts/tiny/): Primärseite leitet auf /greve/ (Streikseite) um. Keine unabhängig belegte Fontdatei/Lizenz beschafft; nicht mit Tiny5 gleichsetzen.

- [https://uncut.wtf/](https://uncut.wtf/): Katalog geprüft; frei für kommerzielle Nutzung ist kein generelles Subsetting-/Redistributionsrecht. Kein zusätzlicher Kandidat mit belegter Verbesserung und Datei beschafft.

- [https://www.fontshare.com/fonts/array](https://www.fontshare.com/fonts/array): Runde-1-Beleg: Array FFL 2.0 verbietet Subsetting/Konvertierung und allgemeine Weitergabe; daher keine erneute Beschaffung fürs öffentliche Repo.


## Technisch geeignet für durchgängigen Einsatz H1–UI

Strenge Vorauswahl nach den oben definierten harten Kriterien; keine Bestätigung subjektiver Lesbarkeit oder Designpassung.

- **Geist**: 30972 Bytes, DE vollständig, OFL, nicht rastergebunden. Weitere Lücken: keine.

- **Geist Mono**: 32264 Bytes, DE vollständig, OFL, nicht rastergebunden. Weitere Lücken: ĳ.

- **Martian Mono**: 36544 Bytes, DE vollständig, OFL, nicht rastergebunden. Weitere Lücken: ↗.

- **Xanh Mono**: 16516 Bytes, DE vollständig, OFL, nicht rastergebunden. Weitere Lücken: → ↗ ĳ.

- **Space Mono**: 18060 Bytes, DE vollständig, OFL, nicht rastergebunden. Weitere Lücken: keine.

- **Oxanium**: 12900 Bytes, DE vollständig, OFL, nicht rastergebunden. Weitere Lücken: → ↗ ĳ.

- **Chakra Petch**: 8840 Bytes, DE vollständig, OFL, nicht rastergebunden. Weitere Lücken: ↗.


Rasterkandidaten mit Einschränkungen: **Tiny5** ist vollständig und klein, bei 16 px/Default geometrisch passend, bei 11/13 px aber nicht pixelgenau. **Bitcount** ist klein und hat DE vollständig, sein 10-px-Modulraster passt nicht gleichmäßig zu 11–16 px; →/↗/ĳ fehlen. **Handjet** hat DE vollständig und konstante n/m/0-Breiten, aber kein ganzzahliges Modulraster unter 17 px/DPR 1. **Geist Pixel** hat vollständige Abdeckung, aber Subpixelmodule bei 11–16 px/DPR 1.


## Offene Punkte

Exakter PP-Weblizenzpreis bleibt offen (kein belastbarer Checkoutpreis ohne Nutzungsparameter); widersprüchlich formulierte Modifikationsrechte und Laufzeit im Einzelfall mit Anbieter klären. TINY-Primärquelle ist umgeleitet. Modulgröße von Pixelify Sans/Raleway Dots/Codystar/DotGothic16 nicht vollständig hergeleitet. zero-Tag wurde geprüft, tatsächliche Standardnull und ss-Zuordnung nicht visuell bewertet. Keine Browser-/DPR-Rasterizerprüfung durchgeführt. Original-WOFF2 für Google-Fonts-Kandidaten wurde aus vollständiger TTF erzeugt; keine Größe einer offiziellen GF-WOFF2 behauptet. Monaspace wurde repräsentativ als Neon beschafft, andere vier Familien nicht einzeln vermessen.