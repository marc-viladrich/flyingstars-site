# FlyingStars – Designsprache

Stand 31.10.2026 (Feedbackrunde 6: näher an den Vercel-Prototyp), davor abgeleitet aus vier Bewertungsrunden der Designsprache-Probe (`/poc/designsprache/`, Branch `feat/designsprache-poc`). Grundlage ist der erste Prototyp (Branch `fix/minimal-fonts`); die Elevation „Lichtpunkt“ ist als Designrichtung verworfen, ihre Inhalte und Fakten bleiben gültig. Belege und Bewertungsverlauf: Kundenordner `freelance/clients/flyingstars/17-designsprache-poc-2026-10-30/README.md`.

## Was die Marke trägt (nicht verhandelbar)

Persönlichkeit, Kreativität und Innovation sind laut Fragebogen und Moritz' Notizen das Alleinstellungsmerkmal: „weniger ernst, genauso professionell“. Diese Elemente bleiben und werden auf neue Seiten übertragen, nicht zurückgenommen:

- **Lichtpunkte und Formationen** als Bildsprache: Drohnen-Formationen (2D, sparsam 3D), Bilder, die zu Lichtpunkten werden, Chopper.
- **Der Logoverlauf** amber `#ff9e29` → orchid `#db64e8` → cyan `#33edf2` (`--grad`) gezielt: einzelne Wörter in Headlines, Verlaufsränder (hervorgehobenes Paket, Preisversprechen), Linien (Zeitstrahl, Fortschritt), „Kein Müll.“.
- **Das warme Orange** aus dem Logo (`--accent`, `#f5a73c`) ist die Akzentfarbe für Texte und Icons: Kicker, Links, Kartenkicker, Icons. Marc, 31.10.: „Mir fehlt ein Schuss Farbe, den hatten wir durch die Eyebrow-Headings.“
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

**Section-Köpfe (alle Seiten):** eine Komponente, `src/components/SectionHead.astro`
- Kicker in Orange (Space Grotesk, Versalien, gesperrt) über der Headline, wie im Vercel-Prototyp. Jede Section bekommt einen (`kicker` im YAML)
- Headline einspaltig, kein Fülltext rechts daneben
- Ein Satz darunter nur, wenn er eine Information trägt, die sonst fehlt

**Inhaltsbreite:** `--content-max: 1792px` (= 1920 − 2 × 64). Horizontaler Innenabstand jeder Section, der Navigation und des Footers ist `var(--gutter)`, nie `var(--pad)`: Ab 1920 px Fensterbreite wächst der Inhalt nicht weiter, Flächen laufen vollflächig.

**Links:** `.link` in Orange mit orangefarbener Unterlinie, Linie nur so breit wie der Text (`width: fit-content`), nie über die ganze Spalte.

**Icons:** nur über `src/components/Icon.astro` (Lucide, ISC, https://lucide.dev/icons; ergänzt um `eu` und `whatsapp`), einfarbig in `--accent` (`class="g"`), kein Verlauf. Keine selbst gezeichneten Icons mehr (Marc, 31.10.2026).

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
- Bilder mit Interaktion (Anlass-Karten, Referenzen, Team-Porträts, Gesichter an der Anfrage) werden beim Hovern zu Lichtpunkten: Eine organische Welle läuft direkt über das Foto (0,7 s, zurück 0,45 s), danach glüht es ruhig weiter, beim Verlassen zurück zum Foto (`src/scripts/effects/dotimage.js`). Auslöser ist die ganze Karte (`data-dot-host`), nicht nur das Bild
- Abgetastet wird immer eine Kopie der geladenen Datei ohne `srcset`: bei `srcset` meldet `naturalWidth` die Größe geteilt durch die Pixeldichte, `drawImage` schneidet aber in echten Pixeln aus. Mit `naturalWidth` landete ein vergrößerter Ausschnitt auf der Karte (Bug 31.10.)
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

**Nummerierte Schritte:** kleine Nummer „01“ in Orange über dem Titel wie im Prototyp, keine Verlaufskreise (Marc 31.10.: „over the top“). Kennzahlen-Raster tragen keine Nummern.

**Ablauf auf der Startseite** (`tempo`, `Tempo.astro`): Zeitstrahl in Zahlen statt Prozessschritten, wie schnell es gehen kann (48 h Antwort, Express in 1–2 Wochen, ideal 1–2 Monate, 3 h Aufbau), darunter Kennzahlen.

**Anlass-Karten:** Kicker = Zielgruppe in Orange, Titel = Nutzen. Bei mehr als vier Karten ein Slider: vier sichtbar, der Rest läuft bis an den Fensterrand und blendet aus; Saisonkarten (`season`, z. B. Silvester im November/Dezember) rücken nach vorn. Keine Karte nur zum Auffüllen des Rasters.

**Paket-Kurzfassung (Startseite):** unter dem Preis 3–4 Kernpunkte, die Drohnenzahl als erster Punkt in der Paketfarbe. HORIZON trägt das Badge „Bestseller“. Klick auf eine Karte wählt das Paket im Formular vor; im Formular ist sonst nichts vorausgewählt.

**CTA-Kästen:** schmal (max. 860 px), zentriert, Verlaufsrand, Gesichter oben bei allem, was zur Anfrage führt (`.promise`).

**Referenzen mit Video:** Karten mit Showvideo zeigen das Video wie im Prototyp: die erste Karte spielt, sobald sie im Bild ist, die anderen beim Zeigen auf die Karte (Touch: im Bild). Kein Lichtpunkt-Hover auf Videokarten.

**Hero:** Showreel rechts, nach links weich ins Schwarz ausgeblendet (`.hero.side`; `?hero=voll` zeigt die vollflächige Fassung), „Showreel ansehen“ öffnet ein Overlay mit Schließen-Knopf. Showreel läuft stumm im Hintergrund (ab 701 px, nicht bei reduzierter Bewegung, Pause oder Datensparmodus), „Showreel ansehen“ spielt es mit Ton. Kicker „Drohnenshows seit 2022 · DE · AT · CH · Benelux“.

**Presse und Qualität:** weiter unten (nach dem Ablauf). Logos von LBA, EASA und naturstrom tragen; TÜV-Gutachten und Haftpflicht stehen klein als Textzeile darunter (`secondary: true`).

**404:** Chopper, der Bürohund, fliegt als Drohnenformation mit Propellermütze (`src/components/Chopper404.astro`). Er wendet per lebendiger Wolke und fliegt nie rückwärts.

**Konfigurator:**
- Details in `docs/show-konfigurator.md`
- Steht direkt oben auf der Preisseite (`ShowConfigurator.astro`, Anker `#konfigurator`); `/show-konfigurator/` leitet dorthin weiter
- Startseite: minimal interaktiver Teaser (`ConfiguratorTeaser.astro`) statt Text-Banner, damit man sofort sieht, warum der Konfigurator interessant ist
- Logo-Upload und eigener Text gehören dorthin
- Hinweis am Upload: „Lade nur Logos hoch, die du verwenden darfst, zum Beispiel dein eigenes. Die Datei bleibt in deinem Browser: Wir speichern und übertragen sie nicht.“

## Bewusst nicht (mehr)

- Drei Titelschnitte (voll/Kontur/Verlauf) als AI-Tell
- Meilensteine als wachsender Schwarm („wirkt cheap“): Meilensteine als ruhige Timeline
- Interaktive 3D-Demos
- Lichtlauf durch Schriftachsen, Hubot Sans und Geologica
- Hover-Lupe mit Drohnen
- Scrollstory nur gezielt: Nachhaltigkeit auf der Startseite (aus dem Prototyp zurückgeholt, Marc 31.10.: „das Scrollytelling finde ich ganz nice“), einmal Über uns nach persönlicher Vorstellung und frühem CTA
- Rechter Fülltext, Microcopy, die nur wiederholt, was man sieht (Eyebrows sind seit 31.10. wieder Pflicht, siehe Section-Köpfe)
- Verlaufskreise um Schrittnummern, bunte Verlaufs-Icons
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
