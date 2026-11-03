# Runde 3: bewegtes Ende und freigegebene Auflösung

Marc hat am 03.11.2026 den angehängten Freeze abgelehnt und die Desktopbreite 1440px freigegeben. Der Schnitt behält dieselben Originalsegmente aus Runde 2, entfernt aber sämtliche 28 angehängten Holdframes. Ergebnis: 347 Frames bei 25fps, exakt 13,88s. FlyingStars bleibt mit den letzten 97 Originalframes 3,88s im Film. Es wird kein neues Standbild und keine zusätzliche Szene eingefügt.

Alle elf aktuellen Vergleichsdateien wurden aus demselben bewegten Schnitt neu erzeugt. Sie tragen `cut14-` und `-v3.mp4`; die Metadaten verwenden `edit=qr-logo-motion-13_88-v3`. Historische v1/v2-Dateien bleiben unverändert nachvollziehbar; die aktive Galerie und große Ansicht verwenden die neuen motion-Gruppen.

Freigegebener Hero: Desktop 1440×810, Mobil640×360. AV1 nur bei positiv gemeldeter Unterstützung, flüssiger und energieeffizienter Decodierung. Sonst H.264, mit einmaligem tatsächlichem Medienfehler-Rückfall. Consent und Bewegungssteuerung sind unverändert.

## Tatsächliche Dateien

| Fassung | Byte |
|---|---:|
| 13,88s · Referenz, volle Auflösung | 11.613.549 |
| 13,88s · H.264 · 1918 px | 3.247.600 |
| 13,88s · AV1 · 1918 px | 1.793.289 |
| 13,88s · H.264 · 1600 px | 2.509.417 |
| 13,88s · AV1 · 1600 px | 1.572.811 |
| 13,88s · H.264 · 1440 px | 2.125.629 |
| 13,88s · AV1 · 1440 px | 1.375.768 |
| 13,88s · H.264 · 1280 px | 1.580.265 |
| 13,88s · AV1 · 1280 px | 1.178.197 |
| 13,88s · Mobil H.264 · 640 px | 648.984 |
| 13,88s · Mobil AV1 · 640 px | 542.437 |

Die unveränderte Originalquelle hat weiterhin SHA-256 `3ac827bd54aa2febfe1d422f230ff2d5463b871772e3da48da704a3a3339214d`. FFmpeg-Befehle und ffprobe-Werte liegen in `encodes.json`. `encode.py` erzeugt die Dateien und Endbewegungsnachweise erneut.

## Nachweis gegen erneutes Einfrieren

`end-motion.json` erfasst für alle vier freigegebenen Hero-Dateien die tatsächlich decodierten letzten 1,12s. Alle vier zeigen 28 unterschiedliche Frames von28; Dateihashes verbinden den Nachweis mit den ausgelieferten Assets. Der fokussierte Guard prüft diese Bindung und die Schnittvorlage ohne tpad. Ein Raster bei11,2/12,5/13,8s wurde lokal angesehen. Keine Bildschirmaufnahme oder Browsersuite.

35 fokussierte Node-Tests inklusive bestehender no-px- und Consent-Guards bestanden. Astrocheck0Fehler/0Warnungen,237Hinweise; Build erfolgreich. Der letzte vollständige CI-Lauf auf265a614 war ausschließlich im unveränderten Offline-Pipeline-Fixture rot, npmERESOLVE. Keine Regel wird gelockert, kein Pflichtcheck umgangen.

## Veröffentlichung

Marc hat ausdrücklich die bestehende Pages-/WIP-Adresse als Ziel bestätigt: `https://feat-designsprache-poc.flyingstars-site.pages.dev/`. Kein Relaunch auf flyingstars.art. Der vorhandene manuelle Previewworkflow erhält dafür eine feste zusätzliche Pages-Zielauswahl `feat-designsprache-poc`; Standard bleibt `manual-preview`. Beide sind Previewbranches. Der Main-/Hetzner-Produktionsworkflow wird nicht geändert. Diese kleine Erweiterung ist notwendig, damit der beauftragte bestehende WIP-Link aktualisiert werden kann.

Der Git-Branch heißt weiterhin `feat/designsprache-poc`. Der bestehende Pages-Branch/Alias lautet dagegen `feat-designsprache-poc`. Cloudflare erzeugte bei Verwendung des Git-Refs einen zusätzlichen Alias mit Suffix. Der veröffentlichte Link muss daher explizit auf den Pages-Slug zeigen; ein YAML-Guard prüft sämtliche angebotenen Vorschauziele auf reine Slugs und sichert das bestehende Ziel ab. Die erste HTTP-Prüfung des bestehenden Links erkannte die falsche Zielzuordnung.
