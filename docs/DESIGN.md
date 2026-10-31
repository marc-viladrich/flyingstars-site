# FlyingStars – Designsprache

Stand 30.10.2026, abgeleitet aus vier Bewertungsrunden der Designsprache-Probe (`/poc/designsprache/`, Branch `feat/designsprache-poc`). Grundlage ist der erste Prototyp (Branch `fix/minimal-fonts`); die Elevation „Lichtpunkt“ ist als Designrichtung verworfen, ihre Inhalte und Fakten bleiben gültig. Belege und Bewertungsverlauf: Kundenordner `freelance/clients/flyingstars/17-designsprache-poc-2026-10-30/README.md`.

## Was die Marke trägt (nicht verhandelbar)

Persönlichkeit, Kreativität und Innovation sind laut Fragebogen und Moritz' Notizen das Alleinstellungsmerkmal: „weniger ernst, genauso professionell“. Diese Elemente bleiben und werden auf neue Seiten übertragen, nicht zurückgenommen:

- **Lichtpunkte und Formationen** als Bildsprache: Drohnen-Formationen (2D, sparsam 3D), Bilder, die zu Lichtpunkten werden, Chopper.
- **Der Logoverlauf** amber `#ff9e29` → orchid `#db64e8` → cyan `#33edf2` (`--grad`) offensiv: Verlauf auf einzelnen Wörtern in Headlines, Linien, Icons, Nummern.
- **Space Grotesk** als Display-Schrift (mit durchgestrichener Null), Inter für Fließtext.
- **Bewegung**: lebendige Wolke, Lichtlauf, Vorhang-Reveals, Laufband. Ruhig und magisch, nie hektisch.

## Grundlagen

**Farben** (dunkler Grund `--ground #0f0d0c`):
- Headlines `--head #ede6da` (warm, knapp unter Weiß)
- Fließtext `--muted #a89c8b` (7,2:1)
- Metatexte `--faint #968b7b` (5,4:1)
- Abstand Headline zu Text mindestens wie im Prototyp
- `--grad` für Text und Linien, `--grad-soft` (135°, in oklab, mit Fallback) für kleine Flächen wie Nummernkreise, damit keine Bänder sichtbar sind

**Schrift:**
- Space Grotesk aus `public/fonts/space-grotesk-0.woff2` (Version 2.000, mit `zero`), auf der ganzen Seite `font-feature-settings: 'zero'`
- Keine weiteren Ziffern-Varianten, kein Stilset, keine weiteren Webfonts (der Font-Wächter in `tests/network-allowlist.spec.ts` erlaubt genau Inter und Space Grotesk)
- Kein Lichtlauf durch Schriftachsen
- Hervorhebung = Verlauf auf einzelnen Begriffen (`.grad`)

**Section-Köpfe (alle Seiten):**
- Nur die Headline, einspaltig
- Keine Eyebrow/Kicker
- Kein Fülltext rechts daneben
- Ein Satz darunter nur, wenn er eine Information trägt, die sonst fehlt

**Sprache:** du/ihr, nie Sie. Gendern mit Doppelpunkt (Pilot:innen). Keine pauschalen Umweltversprechen (EmpCo). Moritz verantwortet die Texte, Entwürfe sind als solche zu kennzeichnen.

## Bewegung

**Lebendige Wolke** als Übergang:
- Drohnen fliegen gedimmt auf gekrümmten Bahnen, etwa 10 % funkeln, die Form schaltet beim Ankommen ein
- Statische, leuchtende Zwischenwolken sind verboten

**Kein Einrasten:**
- Übergänge sind an Start und Ziel stetig, also kein Sprung der Position, Punktgröße oder Helligkeit
- Messbar: Verschiebung je Frame ≈ 0 beim Start

**Keine Finten:** keine Ausholbewegung, Gegenbewegung oder Überschwingen. Wächter: `scripts/show-finte.test.mjs`.

**Lichtlauf:**
- Nur zusätzliche Helligkeit, die Form bleibt voll hell
- Startet an der Ankunft vor der Form, blendet weich ein
- Reihenfolge `lightOrder()` (Nächster-Nachbar-Weg, `src/scripts/formation/index.js`), nie die Hilbert-Kurve
- Sparsam: Text, Logos, Linienformen

**Tempo:**
- Übergänge langsam wie in echt (ca. 5 s)
- Logos stehen 5 s, Motive 2 s

**Text als Formation:**
- Immer über FlyingStars' Einstrich-Textplaner (`text-formation.js`, `formwerk`), nie abgetastete Pixelschrift
- Schriftzug „FLYINGSTARS“ mit A ohne Querstrich: Text `'FLYINGSTΛRS'`

**Reduzierte Bewegung und globale Pause** (`html.motion-paused`) werden überall respektiert.

## Komponenten

**Bilder:**
- Beim Scrollen öffnen sie sich von unten (Vorhang wie im Prototyp, `.pre`-Klasse, Startzustand vor dem ersten Bild setzen)
- Bilder mit Interaktion (Anlass-Karten, Referenzen, Team-Porträts, Gesichter an der Anfrage) werden beim Hovern zu Lichtpunkten: Eine organische Welle läuft direkt über das Foto, danach glüht es ruhig weiter, beim Verlassen zurück zum Foto (`src/scripts/effects/dotimage.js`)
- Kein Foto-Zoom gleichzeitig
- Auf Touch-Geräten nur der Reveal

**Kundenlogos:**
- Laufband ohne Hover-Effekt, nur bekannte Marken
- Saubere SVGs mit etwas Luft, sonst Live-PNGs
- Optische Größen: breite Wortmarken flacher, Bildmarken höher
- Assets und Auswahl: `src/pages/poc/designsprache.astro`, `public/poc/logos/`

**Presse:**
- „Unsere Shows waren zu sehen in“ mit Logos, ohne Beitragszeile
- Live nur mit schriftlicher Freigabe, sonst fällt die Zeile automatisch auf Text zurück
- Namentlich belegt sind bisher nur ntv und WAZ

**Qualität und Sicherheit:**
- Betriebsgenehmigung des LBA (Signet)
- Schallschutz-Gutachten vom TÜV Nord (Icon, kein TÜV-Zeichen)
- Haftpflicht bis 1,3 Mio. € (Icon)
- Ökostrom von naturstrom (Logo nur nach Freigabe)
- Icons im Verlauf

**Anfrage:**
- Headline oben bündig mit dem Formular
- Darunter Satz, Gesichter der drei Geschäftsführer:innen, Kontaktwege mit Verlaufs-Icons (E-Mail, Telefon, Videocall, WhatsApp)
- Formular in genau zwei Schritten: Schritt 1 „Deine Show“ (Anlass, Ort, Datum oder „noch offen“, Paket, Idee), Schritt 2 „Du“ (Name, E-Mail, Telefon, Firma, Quelle, Datenschutzhinweis)

**Team:** große Porträts mit Vorhang-Reveal und Lichtpunkt-Hover.

**FAQ:**
- Gruppen: Planung und Ablauf, Ort und Genehmigung, Sicherheit, Wetter und Umwelt, Kosten, Indoor
- Abschluss: „Eure Frage ist nicht dabei?“ mit Anrufen/Schreiben und Foto der drei

**Vergleich** Drohne/Feuerwerk/Laser bleibt farbig, die Drohnen-Spalte ist hervorgehoben.

**Nummerierte Schritte:** Zahl im Kreis mit `--grad-soft`.

**404:** Chopper, der Bürohund, fliegt als Drohnenformation mit Propellermütze (`src/components/Chopper404.astro`). Er wendet per lebendiger Wolke und fliegt nie rückwärts.

**Konfigurator:**
- Eigenständig, siehe `docs/show-konfigurator.md`
- Logo-Upload und eigener Text gehören dorthin
- Hinweis am Upload: „Lade nur Logos hoch, die du verwenden darfst, zum Beispiel dein eigenes. Die Datei bleibt in deinem Browser: Wir speichern und übertragen sie nicht.“

## Bewusst nicht (mehr)

- Drei Titelschnitte (voll/Kontur/Verlauf) als AI-Tell
- Meilensteine als wachsender Schwarm („wirkt cheap“): Meilensteine als ruhige Timeline
- Interaktive 3D-Demos
- Lichtlauf durch Schriftachsen, Hubot Sans und Geologica
- Hover-Lupe mit Drohnen
- Scrollstory für Nachhaltigkeit
- Scrollstory nur gezielt: einmal Startseite, einmal Über uns nach persönlicher Vorstellung und frühem CTA
- Eyebrows, rechter Fülltext, Microcopy, die nur wiederholt, was man sieht
- Kundenlogos als Drohnenformation

## Leistung

- Seiten im Build schlank halten: Probe-Seite 362 KB inklusive Bilder, JavaScript im zweistelligen KB-Bereich
- Effekte starten erst kurz vor Sichtbarkeit
- Rechnen im Web Worker (`shape-worker.js`)
- Zeichnen mit vorgerenderten Lichtern
- Pixeldichte 1,5 (Bild-Hover 1×)
- Messwerte: `performance-befund.md` im Kundenordner

## Prüfung

- Seiten-Gates `tests/a11y.spec.ts`, `tests/html.spec.ts`, `tests/network-allowlist.spec.ts` grün auf allen Routen (Desktop und Mobil)
- Chromium und WebKit ohne Konsolenfehler und ohne horizontalen Überlauf bei 390 und 1440 px
- `npx astro check` ohne Fehler
