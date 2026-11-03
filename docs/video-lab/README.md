# FlyingStars Video-Lab

Reviewbranch `codex/video-vergleich-2026-11-03`, Ausgangspunkt `feat/designsprache-poc` auf `a4909c7`. Auf Marcs Folgeauftrag nutzt die normale Startseite dieses Reviewbranches jetzt den neuen 15s-Schnitt: Desktop 1918px, Mobil 640px, jeweils AV1 bei positiver Effizienzauskunft und sonst H.264. Die ursprüngliche WIP bleibt unverändert.

## Vorschauen

- `/poc/video-lab/gross/?start=1`: browserhoher A/B-Vergleich desselben 15s-Schnitts. Tasten 1–4 oder Pfeile wechseln Referenz/1600/1440/1280 bei gleicher Position. Optional zwei Filme nebeneinander, echte Vollbildtaste und ausblendbare Bedienung. H.264 und AV1 getrennt wählbar.
- `/poc/video-lab/`: 27 Dateien mit echten Metadaten, Original/Kandidat nebeneinander, gemeinsamer Start und Seek. Erst nach „Vergleich laden“ werden Medien angefordert.
- `/poc/video-lab/<id>/`: jede Fassung im bestehenden FlightHero und derselben responsiven Darstellung. Feste Auswahl ohne unbemerkten Codec-Fallback.
- `/poc/video-lab/auto/`: dieselbe responsive Auswahl wie im regulären Hero. AV1 nur bei `supported && smooth && powerEfficient`; fehlende, negative, fehlerhafte oder länger als 250ms offene Auskunft führt zu H.264. Auch bei einem tatsächlichen AV1-Wiedergabefehler zurück auf H.264, sichtbar bezeichnet.
- `/poc/video-lab/inter/`: vorhandene Inter-Verwendung und Space-Grotesk-Vergleich. Vollständige 20-Fälle-Inventur in `inter-inventur.md` und `src/data/inter-inventory.json`.

Die Prüfseiten sind noindex. Sie aktivieren keine Google-Tags, auch wenn im Preview-Build öffentliche Google-IDs gesetzt sind. Die native Wiedergabe und die normale Bewegungssteuerung bleiben verfügbar.

## Dateien und Qualität

`src/data/video-lab.json` enthält pro Datei Codec, tatsächliche Auflösung, Laufzeit, Bytezahl, SHA-256, MIME und Vergleichsausschnitt. Dateimetadaten wurden mit ffprobe gelesen. Originalquelle ist die registrierte FlyingStars-Showreel-Datei mit SHA-256 `3ac827bd54aa2febfe1d422f230ff2d5463b871772e3da48da704a3a3339214d`, H.264, 1918 × 1080, 25 fps, 25,88 s und ohne Audio. Die unveränderte Referenz liegt im Lab selbst.

Zu den neun früheren lokalen Transcodes kommen 1600/1440px H.264 und 480/640px H.264 mit voller sowie kurzer Laufzeit. Die vorhandene 960px-Mobilvorschau ist ebenfalls enthalten. Neue FFmpeg-Befehle stehen in `encodes.json`; die ursprüngliche vollständige Versuchsreihe ist im Geschäftshub unter `notes/flying-stars/optimierung-2026-11-03/video/` gesichert.

480/640 meint Breite, die Höhen sind 270/360. Die kurzen Dateien zeigen den zusammenhängenden Ausschnitt 10–22 Sekunden und sind keine redaktionell abgestimmte neue Schnittfassung. Der Referenzplayer beginnt dafür bei Sekunde 10. Die gemeinsame Position ist eine praktische Vergleichshilfe, kein framegenauer Messaufbau. Die neuen Dateien sind Transcodes einer bereits verlustbehafteten Quelle. Ein späterer Export sollte aus dem besten verfügbaren Master erfolgen.

Die aktuelle Auswahl ist im Reviewbranch integriert; eine geräteübergreifende Produktionsfreigabe ist damit nicht erteilt. Globale Browseranteile sagen nichts Sicheres über die konkreten Geräte der Websitebesucher. `canPlayType()` prüft vor allem Typ-/Codec-Unterstützung, `MediaCapabilities.decodingInfo()` zusätzlich Auflösung, Bitrate und die vom Browser eingeschätzte Wiedergabe. `powerEfficient` ist keine Strommessung. Ein User-Agent- oder Modellkatalog wird nicht gepflegt. Eine neue Produktionsauswahl braucht nach der visuellen Entscheidung eine eigene Abnahme auf Safari/iOS, Android und älteren Geräten.

## Weitere Änderungen dieses Branches

- HTML-Entwicklerkommentare werden zu Astro-Quellkommentaren; kein blindes Entfernen funktionaler Marker nach dem Build.
- Die 290er-Herzgeometrie wird im statischen Astro-Endpoint aus `pricing-formations.js` projiziert. Teaser und neuer Konfigurator laden 3.393 Byte JSON statt des vollständigen 484-KB-Moduls. Der alte variable Regler kann die vollständige Quelle weiterhin benutzen. Node-/SSR-Aufrufe leiten dieselbe Projektion direkt aus der Quelle ab.
- Browserübersetzungen werden pro Sprache als statische JS-Datei aus dem vorhandenen Wörterbuch erzeugt. `ui.mjs` behält Fehlerbehandlung, Interpolation und Editoradresse. Globale Bewegungsschalter erhalten ihre beiden lokalisierten Labels im bestehenden Markup. Das Impressum braucht dadurch kein Browserwörterbuch nur für den Pausenknopf.
- Inter bleibt Inter, wird aber auf die tatsächlich benötigte variable Achse 400–700 begrenzt: 36.220 statt 48.432 Byte. Regular 400 bleibt für Fließtext notwendig; Glyphen und Layoutfeatures sind unverändert geprüft. Keine zweite Übersetzungsquelle und kein neuer Section-Typ. CSS-Reorganisation, Änderung des Formular-Ladezeitpunkts, Aufteilung aller Anlass-Builder und Logoersatz sind weitere Entscheidungen; sie wurden nicht neben der Videofreigabe pauschal vorgenommen.

## Teaser-Ladepfad

Am 03.11. im aktuellen veröffentlichten WIP bei Desktop und 390px Mobil geprüft: der kleine Entry `ConfiguratorTeaser...js` lädt anfänglich; `show-teaser...js` und `show-scenes...js` bleiben zunächst aus. Mobil bei 1.243px Abstand zur oberen Viewportkante und 844px Viewporthöhe kein Engineimport; bei 1.127px beginnt er, entsprechend dem 300px-Vorlauf. Es wurde kein früher Engineimport im Hero reproduziert. Ein früher sichtbarer Entry ist nicht automatisch die gesamte Engine.

## Prüfung

`astro check`: 0 Fehler, 0 Warnungen, vorhandene Hinweise gesondert. Statischer Build erfolgreich. 19 gezielte Node-Tests für i18n, Geometriegleichheit, fehlende Referenzen, Codec-Fallback, Dateihashes, Headerlängen und Kommentare erfolgreich.

Im nativen T3-Browser wurden AV1 im Vergleich und im Hero tatsächlich decodiert und abgespielt, ohne Fallback. Galerieinitialisierung ohne Medienrequest, gemeinsame Wiedergabe und Metadaten wurden geprüft. In Runde 2 spielte der reguläre Desktophero auf diesem Browser H.264; AV1 wurde in der manuellen großen Ansicht tatsächlich abgespielt. Die Automatik behauptet keine Hardwareerkennung bestimmter Modellnamen. Keine geräteübergreifende Kompatibilitätszusage.

Die T3-Bildabfrage scheiterte zweimal mit `Preview automation snapshot timed out after 15000ms`; der alternative CUA-Browser war nicht verfügbar. DOM-/Wiedergabeprüfung blieb möglich. Zusätzlich wurde die gebaute Galerie mit eingebetteten Styles/Fonts im HTML-Preview auf 390 und 900px visuell geprüft. Unbenutzte Viewporthöhenregeln wurden nur für dieses statische Prüfbild in Pixel umgerechnet; die eigentliche Website nutzt ihre regulären Regeln. Keine Browser-Suite und keine Bildschirmaufnahme.

Die `_headers`-Regeln gelten für den aktuellen Cloudflare-Previewhost und bewahren bekannte Response-Längen für WebKit. Die statischen Videodateien und generierten JSON-/JS-Dateien brauchen auf Hetzner keinen Cloudflare-Dienst. Geeignete MIME-Typen, Range-Antworten und Cacheheader sind am späteren Apache-Host zu prüfen. Hetzner-Produktionsbetrieb ist nicht Gegenstand dieser Review-Preview.

## Runde 2: 15 Sekunden und große Ansicht

[Erzeugung und aktuelle Prüfgrenzen](round-2/README.md), [FFmpeg-Befehle und Probes](round-2/encodes.json), [Audioaudit aller sechs Originaldateien](round-2/audio-audit.json), [Fontprüfung](round-2/font.json). Die 16 älteren Dateien bleiben als frühere Experimente erhalten; die elf neuen Dateien tragen `cut15-` und `-v2.mp4`.

Der neue Schnitt enthält QR/„Scan Me“, Fisch, Puma, Performance, NFL, Runway und fünf Sekunden FlyingStars-Abschluss. Die neue hochqualitative 15s-Referenz ist ein H.264-Transcode desselben Schnitts, keine verlustfreie oder unveränderte Originaldatei. Das unveränderte 25,88s-Original bleibt separat verlinkt. Vergleiche von Dateigrößen mit dem Original enthalten sowohl Schnitt- als auch Codec-/Qualitätsänderungen.
