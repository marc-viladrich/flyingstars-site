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
- Kicker in Orange (Space Grotesk, Versalien, gesperrt) über der Headline, wie im Vercel-Prototyp. Jede Section bekommt einen (`kicker` im YAML), außer den CTA-Kästen (Marc 01.11.: „unnötig“)
- Headline einspaltig, kein Fülltext rechts daneben
- Ein Satz darunter nur, wenn er eine Information trägt, die sonst fehlt

**Zeilenumbruch:** Keine einzelnen Wörter in der letzten Zeile (Marc, 01./02.11.2026), in zwei Stufen:
- CSS: Überschriften und alle kurzen Textblöcke (`p`, `li`, `dt`, `dd`, `figcaption`, `label`, `.lead`) `text-wrap: balance`; langer Fließtext (`.post-body`, `.prose`) `pretty`. `pretty` allein reicht nicht, Chromium und WebKit lassen es bei zweizeiligen Sätzen beim Hurenkind
- HTML: `src/middleware.ts` verbindet beim Ausliefern in `p`, `li`, `figcaption`, `blockquote` die letzten zwei Wörter mit `&nbsp;` (`src/lib/no-orphans.ts`, Test `scripts/no-orphans.test.mjs`). Nicht in Überschriften und `dt`/`dd` (große Schrift oder schmale Spalten), nicht bei langen Wortpaaren, nicht bei `<br>`. Ausnahme pro Element: `data-orphans="keep"`

**Inhaltsbreite:** `--content-max: 1792px` (= 1920 − 2 × 64). Horizontaler Innenabstand jeder Section, der Navigation und des Footers ist `var(--gutter)`, nie `var(--pad)`: Ab 1920 px Fensterbreite wächst der Inhalt nicht weiter, Hintergrundflächen von Sections laufen vollflächig.
- ALLES Sichtbare endet an der Content-Breite (Marc, 02.11.2026): Text, Bilder, Karussells, Galerien, Laufbänder, Spielfeld und „Nächstes Projekt“ auf den Referenzen. Scrollbereiche schneiden an der Content-Kante ab und blenden dort weich aus, statt bis zum Fensterrand zu laufen
- Einzige Ausnahme: das Showreel rechts in den Seitenköpfen (Startseite, Referenzen), es läuft bis an den rechten Fensterrand. Dazu die Konfigurator-Bühne auf dem Handy (klebt oben über die volle Breite). Beide tragen `data-bleed`
- Achtung: `--gutter` rechnet mit 100 % des Elements, an dem es verwendet wird. In Kindern einer Section (z. B. negativer Rand) ergibt es einen anderen Wert als an der Section selbst
- Prüfung: `npm run audit:layout [url]` (`scripts/layout-audit.mjs`) meldet Inhalt außerhalb der Content-Breite, Hurenkinder, leere Überschriften und seitliches Scrollen über alle Seiten bei 390/1440/1920 px, mit `--widths=` und `--browser=webkit` erweiterbar

**Links:** `.link` in Orange mit orangefarbener Unterlinie, Linie nur so breit wie der Text (`width: fit-content`), nie über die ganze Spalte.

**Icons:** nur über `src/components/Icon.astro` (Lucide, ISC, https://lucide.dev/icons; ergänzt um `eu`, `whatsapp`, `e-car` = Lucide-Auto mit Blitz, weil `car-front` allein nicht als Elektroauto lesbar ist, und `swiss` = Lucide-Schild mit gefülltem Schweizer Kreuz nach Marcs Vorlage). White Label = `hat-glasses` (Lucides Incognito-Motiv), Freigabe = `thumbs-up`, einfarbig in `--accent` (`class="g"`), kein Verlauf. Keine selbst gezeichneten Icons mehr (Marc, 31.10.2026).

**Icon-Raster:** `.ig` / `.ic` / `.ic-ico` / `.ic-h` in global.css. Offenes Raster ohne Kartenfläche, Linien nur zwischen den Zellen, Icon 36 px in Orange, echte Überschrift, Text. Genutzt von Extras (auswählbar), „Immer inklusive“ (`pricing/Included.astro`); die Bento-Kacheln der Anlass-Seiten nehmen dieselben Maße. Kein Mono-Label über der Überschrift.

**Paketfarben:** Paketname überall in seiner Farbe aus `show-packages.ts` (SPARK Orange, HORIZON Lila, ODYSSEY Cyan): Karten, Tabelle, Konfigurator (`--pkg`), Formular-Pills, Handy-Reiter.

**Vergleiche auf dem Handy:** `src/components/MobileTabs.astro` + `[data-mtabs]`/`[data-mtab]` (Regeln „Reiter auf dem Handy“ in global.css). Bis 700 px ein Reiter je Spalte statt Tabelle oder Kartenreihe: Startseiten-Vergleich, Paketkarten, Leistungsvergleich. Reine Radiogruppe, geht ohne JS. Neue Vergleiche nutzen dieselbe Komponente.

**Auswahl-Pills (`.chips`):** ein Regelsatz für Formular und Referenzfilter. Hover hebt nur ungewählte Pills hervor; gewählte bleiben beim Zeigen, wie sie sind (sonst weiß auf weiß). Das Eingabefeld liegt 1 px groß unter der Beschriftung, die Beschriftung nimmt den Klick.

**Aufnahme-Rahmen im Startseiten-Hero:** Ecken genau auf der Content-Breite (`--fr-t`, `--fr-b`, `--fr-arm` an `.hero`). „Showreel“ und die Eckdaten rasten innen in den Ecken ein (siehe „Video im Rahmen“).

**Abschluss-Kästen (CTA):** eine Komponente `src/components/CtaBox.astro` für alle (Section-CTA, Anlass-CTA, Preiskarte, Bento, FAQ, Fallstudie, Preisseite): immer Gesichter, Überschrift, Text und genau ein Knopf. Das Schema (`closingBox`) erzwingt Überschrift und Text; `npm run audit:layout` meldet Kästen ohne eins davon (Marc, 02.11.2026: „empty-looking CTAs darf es niemals geben“).

**Überschriften zeigen einen Nutzen:** keine reinen Etiketten („Für Agenturen.“, „Andere Wege.“, „In Zahlen.“), sondern was Besucher:innen davon haben („Reibungsloser Ablauf von A bis Z.“, „Wenig Vorlauf? Besonderer Ort? Wir finden einen Weg.“). Das Etikett darf im Kicker stehen.

**Magie vor Technik (Marc, 02.11.2026):** Technische Details nie alle auf einmal, aber auch nie in Akkordeons verstecken. Progressive Disclosure heißt Informationsdesign: verdichten und strukturieren (Tabelle mit Zeichen, Zeitstrahl, Icon-Raster), nicht wegklappen.
- Standort/Sicherheit (`LandingSite.astro`) zeigt eine Zone zugleich, anfangs die erste; Zeigen, Fokus oder Tippen wechselt, Zeichnung und Text gemeinsam. Auf B2C-Seiten (Hochzeit) keine Schutz-Kacheln.
- Zuständigkeiten als Tabelle „Wer was übernimmt“: je Zeile eine kurze Aufgabe (max. 70 Zeichen), Spalten FlyingStars / Ihr mit ✓ übernimmt, ◐ unterstützt (kurzer Hinweis), – nicht nötig. Legende darunter.
- Zeiten und Vorlauf als Netzplan-Zeitstrahl (`MetroLine.astro`, über Tempo): Hauptlinie im Logoverlauf mit Stationen, Express als orange Abzweigung von der ersten zur letzten Station mit Schild und Link „Express anfragen“. Handy senkrecht.

**Formular:** Knöpfe linksbündig, Hauptknopf zuerst. Optionale Angaben im zweiten Schritt als Zeile kleiner „+ Telefon / Firma / Nachricht / Woher“-Knöpfe; ein Klick blendet das Feld ein und setzt den Fokus, vorbelegte Felder sind offen.

**Video auf dem Handy:** Startseiten-Hero und Referenz-Kopf zeigen das Showreel bis 700 px als gerahmtes Bild im Seitenfluss über der Überschrift (kleine Fassung, `data-src-small`), nicht als Hintergrund.

**Redaktionelle Hinweise:** jede Section kann `todo` tragen („Fehlt noch …“); sichtbar nur im Dev-Server und in Vorschau-Builds (`PUBLIC_ANNOTATE=1`), Produktion rendert nichts davon.

**Textlink neben Knopf:** sitzt auf der Mittellinie des Knopfs (`.btn ~ .link`), nicht oben.

**Video im Rahmen (Anlass-Seiten):** läuft es, sitzt „Video anhalten“ unten rechts in der Ecke; angehalten bleibt das Bild des Videos stehen, der Knopf wandert in die Mitte und wird zum großen Play-Knopf ohne Beschriftung. Klick irgendwo aufs Video schaltet um. Rahmen-Ecken: Beschriftungen rasten innen ein, mittig auf Höhe des Schenkelendes, 14 px neben dem senkrechten Schenkel (wie im Vercel-Prototyp, auch im Startseiten-Hero).

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

**Paket-Kurzfassung (Startseite und Anlass-Seiten, gleiche Karte):** Name klein in der Paketfarbe als Kennung, darunter mit Abstand der Preis als größtes Element, dann die Stilzeile. Nach einer Trennlinie die Drohnenzahl als eigene Gruppe in der Paketfarbe („100 bis 150 Drohnen“, „ab 200 Drohnen“, „ab 300 Drohnen“, `dronesLine()` in package-details.ts), mit Abstand darunter 3 Kernpunkte (`PACKAGE_POINTS`, eine Seite kann eigene setzen). HORIZON trägt das Badge „Bestseller“. Hover: die Karte hebt sich, kein Pfeil. Klick wählt das Paket im Formular vor; im Formular ist sonst nichts vorausgewählt.

**CTA-Kästen:** schmal (max. 860 px), zentriert, Verlaufsrand, Gesichter oben bei allem, was zur Anfrage führt (`.promise`). Genau ein Knopf (die Anfrage), keine Zweitknöpfe, kein Kicker (Marc, 01.11.2026). Das Schema von `cta`, `landingCta` und `landingPrice` kennt deshalb kein `secondary` und `cta`/`landingCta` keinen `kicker` mehr.

**Icon-Kacheln** (`landingBento`, Extras, überall): großes Icon (36 px), Überschrift, Text. Keine Zeile neben oder über dem Icon (Marc, 01.11.2026: „überall keine Eyebrow-Heading und größere Icons“). Was früher Zeile + Kennzahl war, steht in der Überschrift („Bis Windstärke 5“, „40 % Anzahlung“). Das Schema der Bento-Kacheln ist `{ icon, title, text }` mit `.strict()`, `label`/`value` brechen den Build. Die kleine Zeile gibt es nur noch auf der Bildkachel (z. B. Kund:innen über dem Foto). Kennzahl-Raster ohne Icon (`metrics`, „In Zahlen“) behalten ihre Beschriftung, dort ist sie die Bedeutung der Zahl.

**Extras (Preisseite):** offenes Raster ohne Kartenfläche, nur Haarlinien zwischen den Zellen. Die ganze Zelle ist klickbar und schaltet ein Kontrollkästchen; gewählt bekommt sie eine leichte Orange-Fläche, ein gefülltes Kästchen mit Leuchten und „In der Anfrage“ (Platz dafür ist immer reserviert, nichts springt). Ab der ersten Auswahl klebt unten eine Leiste mit der Auswahl und „Show mit diesen Extras anfragen“ → `/?extras=<id>,…#anfrage`; das Formular blendet dann das Feld „Extras“ ein und belegt es vor (sonst bleibt es verborgen, damit Schritt 1 kurz bleibt). Indoor setzt zusätzlich den Anlass. Der Knopf des Konfigurators nimmt gewählte Extras mit. `src/components/pricing/Extras.astro`, Test `tests/pricing.spec.ts` („Gewählte Extras …“).

**Referenzen mit Video:** Karten mit Showvideo zeigen das Video wie im Prototyp: die erste Karte spielt, sobald sie im Bild ist, die anderen beim Zeigen auf die Karte (Touch: im Bild). Kein Lichtpunkt-Hover auf Videokarten.

**Hero:** Showreel rechts, nach links weich ins Schwarz ausgeblendet (`.hero.side`; `?hero=voll` zeigt die vollflächige Fassung), Showreel läuft stumm im Hintergrund (ab 701 px, nicht bei reduzierter Bewegung, Pause oder Datensparmodus), sonst steht das Standbild. Kein Knopf „Showreel ansehen“ (Marc, 01.11.2026: „brauchen wir nicht“). Die Überschrift hat einen weichen dunklen Schatten (`filter: drop-shadow`, nicht `text-shadow`, das die Verlaufs- und Konturschrift abdunkeln würde), damit sie vor hellen Videostellen lesbar bleibt. Dieselbe Mechanik (Split, Ausblendung, stummes Video, Schatten) hat der Kopf der Referenz-Einzelseiten (`.c-hero`, Marc 01.11.2026); dort ist der Titel kleiner (max. 7rem) und passt in die linke Hälfte. Skript für beide: `src/scripts/hero-reel.ts`. Kicker „Drohnenshows seit 2022 · DE · AT · CH · Benelux“.

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
- `npm run audit:layout` ohne Befunde (Dev-Server oder `astro preview` als Ziel)
- Zwischenspeicher der Inhalte: `npm run dev` löscht `.astro/data-store.json` bei jedem Start (seit 02.11.2026). Astro erkennt Schemaänderungen nur am Inhalt von `content.config.ts`; ein Server, der YAML mit dem alten Schema eingelesen hat, hinterlässt sonst Einträge, die der nächste Start ungeprüft weiterverwendet (01. und 02.11.2026: leere Kachel-Überschriften, weil `title` vom alten Schema verworfen worden war). Nach einer Schemaänderung bei laufendem Server: Server neu starten

## Gemeinsame Komponentenbesitzer, Konsolidierung 02.11.2026

- `content/package-details.ts`: stabile Leistungs-IDs in `SERVICES`, daraus Kurzpunkte, Kartengruppen, Immer inklusive und Vergleich. Redaktionelle Fassungen sind Felder derselben Leistung. Preise, Mengen und Farben bleiben in `show-packages.ts`.
- `PackageCard.astro`: einzige Paketkarte, `summary` und `detailed`; `Packages` und `Pricing` sind Adapter. Freie Angebote ohne Paket-ID verwenden `pricing/OfferCard.astro`.
- Guard: `scripts/consolidation.test.mjs` prüft Projektionen in allen Sprachen und den Kartenbesitzer.
- `ComparisonMatrix.astro` besitzt Desktop-Tabelle und mobile Tafeln mit MobileTabs. `ComparisonCell.astro` rendert jede Zelle in beiden Ausgaben und die Zeichen der Zuständigkeitstabelle. Check, X und CircleHelp kommen aus `Icon.astro`, Status hat immer Text. Halbkreis und Gedankenstrich behalten bei Zuständigkeiten ihre eigene Bedeutung.
- `scripts/motion-policy.ts` liest globale Pause, reduzierte Bewegung, Sichtbarkeit und Save-Data. `video-controller.ts` besitzt Quellenladen und asynchrone Wiedergabe für `ambient`, `manual`, `hover`. Hero-Reel, LandingHero und ProjectCard setzen nur Startart und Darstellung. Explizites manuelles Play darf reduzierte Bewegung/Save-Data überstimmen, globale Pause und Hintergrund-Tab nie. Einmal gespielte Ambient-Filme behalten ihr Standbild.
- `global.css` behält pro Selektor/Eigenschaft und Media-/Supports-Kontext genau eine wirksame Vorgabe. Frühere, immer überstimmte Deklarationen und nachweislich unbenutzte Karten-, Inklusive-, Timeline-, FAQ-Abschluss-, Referenzfilter- und Sprachwahlregeln entfallen. Responsive Varianten und der `vh`/`svh`-Fallback bleiben ausdrücklich erhalten. CTA ist Grid, die alten Flex-Verteilungsvorgaben entfallen. Rec respektiert reduced motion auch nach der letzten Basisregel.
- `.chips` besitzt Auswahl, Hover und Tastaturfokus für Anfrage, Referenzfilter und Textstile. Varianten setzen nur Größen-/Farbvariablen, Filter ergänzt Scrolling/Zähler. `.native-select` besitzt Pfeil und Optionsliste aller aktiven nativen Selects. Layout und Typografie bleiben beim Formular. Alte `.field`-Inputregeln entfallen, sie dürfen keine Radios oder Checkboxen überformen.
- `FactList.astro` besitzt alle redaktionellen dt/dd-Paare in Metrics, Tempo, Cases, LandingHero/Stories/Spotlight, Nachhaltigkeit und FlightHero. `styles/facts.css` besitzt die benannten Darstellungsvarianten, einschließlich Scrolly und Count-up. Unbekannte Werte werden nicht in Null umgewandelt. Vier Metrics-Zellen haben drei innere Trennlinien.
- `ProcessList.astro` besitzt Listenschiene, Einträge und Nummerierung für Steps, Timeline, LandingFlow und MetroLine. `lib/lists.ts` vergibt Farben über dieselbe Markenpalette für beliebig viele Einträge und erkennt wiederholte Jahre. MetroLine behält Express-Abzweig und Gestaltung. Story und Punktbild haben getrennte Datenattribute; die Case-Story fragt ausschließlich in `.c-story` ab.
