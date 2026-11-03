# FlyingStars Video-Lab

Reviewbranch `codex/video-vergleich-2026-11-03`, Ausgangspunkt `feat/designsprache-poc` auf `a4909c7`. Die normale Hero-Auswahl wurde nicht auf einen neuen Codec oder eine geringere Auflösung umgestellt.

## Vorschauen

- `/poc/video-lab/`: 16 Dateien mit echten Metadaten, Original/Kandidat nebeneinander, gemeinsamer Start und Seek. Erst nach „Vergleich laden“ werden Medien angefordert.
- `/poc/video-lab/<id>/`: jede Fassung im bestehenden FlightHero und derselben responsiven Darstellung. Feste Auswahl ohne unbemerkten Codec-Fallback.
- `/poc/video-lab/auto/`: konservative Auswahlprobe über Media Capabilities. Moderne 1080p-Fassungen nur bei `supported && smooth && powerEfficient`; andernfalls H.264. Auch bei einem tatsächlichen Wiedergabefehler zurück auf H.264, sichtbar bezeichnet.
- `/poc/video-lab/inter/`: vorhandene Inter-Verwendung und Space-Grotesk-Vergleich. Vollständige 20-Fälle-Inventur in `inter-inventur.md` und `src/data/inter-inventory.json`.

Die Prüfseiten sind noindex. Sie aktivieren keine Google-Tags, auch wenn im Preview-Build öffentliche Google-IDs gesetzt sind. Die native Wiedergabe und die normale Bewegungssteuerung bleiben verfügbar.

## Dateien und Qualität

`src/data/video-lab.json` enthält pro Datei Codec, tatsächliche Auflösung, Laufzeit, Bytezahl, SHA-256, MIME und Vergleichsausschnitt. Dateimetadaten wurden mit ffprobe gelesen. Originalquelle ist die registrierte FlyingStars-Showreel-Datei mit SHA-256 `3ac827bd54aa2febfe1d422f230ff2d5463b871772e3da48da704a3a3339214d`, H.264, 1918 × 1080, 25 fps, 25,88 s und ohne Audio. Die unveränderte Referenz liegt im Lab selbst.

Zu den neun früheren lokalen Transcodes kommen 1600/1440px H.264 und 480/640px H.264 mit voller sowie kurzer Laufzeit. Die vorhandene 960px-Mobilvorschau ist ebenfalls enthalten. Neue FFmpeg-Befehle stehen in `encodes.json`; die ursprüngliche vollständige Versuchsreihe ist im Geschäftshub unter `notes/flying-stars/optimierung-2026-11-03/video/` gesichert.

480/640 meint Breite, die Höhen sind 270/360. Die kurzen Dateien zeigen den zusammenhängenden Ausschnitt 10–22 Sekunden und sind keine redaktionell abgestimmte neue Schnittfassung. Der Referenzplayer beginnt dafür bei Sekunde 10. Die gemeinsame Position ist eine praktische Vergleichshilfe, kein framegenauer Messaufbau. Die neuen Dateien sind Transcodes einer bereits verlustbehafteten Quelle. Ein späterer Export sollte aus dem besten verfügbaren Master erfolgen.

Die Auswahlprobe ist kein endgültiger Produktionsalgorithmus. Globale Browseranteile sagen nichts Sicheres über die konkreten Geräte der Websitebesucher. `canPlayType()` prüft vor allem Typ-/Codec-Unterstützung, `MediaCapabilities.decodingInfo()` zusätzlich Auflösung, Bitrate und die vom Browser eingeschätzte Wiedergabe. `powerEfficient` ist keine Strommessung. Ein User-Agent- oder Modellkatalog wird nicht gepflegt. Eine neue Produktionsauswahl braucht nach der visuellen Entscheidung eine eigene Abnahme auf Safari/iOS, Android und älteren Geräten.

## Weitere Änderungen dieses Branches

- HTML-Entwicklerkommentare werden zu Astro-Quellkommentaren; kein blindes Entfernen funktionaler Marker nach dem Build.
- Die 290er-Herzgeometrie wird im statischen Astro-Endpoint aus `pricing-formations.js` projiziert. Teaser und neuer Konfigurator laden 3.393 Byte JSON statt des vollständigen 484-KB-Moduls. Der alte variable Regler kann die vollständige Quelle weiterhin benutzen. Node-/SSR-Aufrufe leiten dieselbe Projektion direkt aus der Quelle ab.
- Browserübersetzungen werden pro Sprache als statische JS-Datei aus dem vorhandenen Wörterbuch erzeugt. `ui.mjs` behält Fehlerbehandlung, Interpolation und Editoradresse. Globale Bewegungsschalter erhalten ihre beiden lokalisierten Labels im bestehenden Markup. Das Impressum braucht dadurch kein Browserwörterbuch nur für den Pausenknopf.
- Keine globale Fontumstellung, keine zweite Übersetzungsquelle und kein neuer Section-Typ. CSS-Reorganisation, Änderung des Formular-Ladezeitpunkts, Aufteilung aller Anlass-Builder und Logoersatz sind weitere Entscheidungen; sie wurden nicht neben der Videofreigabe pauschal vorgenommen.

## Teaser-Ladepfad

Am 03.11. im aktuellen veröffentlichten WIP bei Desktop und 390px Mobil geprüft: der kleine Entry `ConfiguratorTeaser...js` lädt anfänglich; `show-teaser...js` und `show-scenes...js` bleiben zunächst aus. Mobil bei 1.243px Abstand zur oberen Viewportkante und 844px Viewporthöhe kein Engineimport; bei 1.127px beginnt er, entsprechend dem 300px-Vorlauf. Es wurde kein früher Engineimport im Hero reproduziert. Ein früher sichtbarer Entry ist nicht automatisch die gesamte Engine.

## Prüfung

`astro check`: 0 Fehler, 0 Warnungen, vorhandene Hinweise gesondert. Statischer Build erfolgreich. 15 gezielte Node-Tests für i18n, Geometriegleichheit, fehlende Referenzen, Codec-Fallback, Dateihashes, Headerlängen und Kommentare erfolgreich.

Im nativen T3-Browser wurden AV1 im Vergleich und im Hero tatsächlich decodiert und abgespielt, ohne Fallback. Galerieinitialisierung ohne Medienrequest, gemeinsame Wiedergabe und Metadaten wurden geprüft. Die automatische Demo wählte auf diesem Rechner eine energieeffizient gemeldete alternative Fassung. Keine geräteübergreifende Kompatibilitätszusage.

Die T3-Bildabfrage scheiterte zweimal mit `Preview automation snapshot timed out after 15000ms`; der alternative CUA-Browser war nicht verfügbar. DOM-/Wiedergabeprüfung blieb möglich. Zusätzlich wurde die gebaute Galerie mit eingebetteten Styles/Fonts im HTML-Preview auf 390 und 900px visuell geprüft. Unbenutzte Viewporthöhenregeln wurden nur für dieses statische Prüfbild in Pixel umgerechnet; die eigentliche Website nutzt ihre regulären Regeln. Keine Browser-Suite und keine Bildschirmaufnahme.

Die `_headers`-Regeln gelten für den aktuellen Cloudflare-Previewhost und bewahren bekannte Response-Längen für WebKit. Die statischen Videodateien und generierten JSON-/JS-Dateien brauchen auf Hetzner keinen Cloudflare-Dienst. Geeignete MIME-Typen, Range-Antworten und Cacheheader sind am späteren Apache-Host zu prüfen. Hetzner-Produktionsbetrieb ist nicht Gegenstand dieser Review-Preview.
