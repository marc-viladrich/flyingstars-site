# FlyingStars – Designsprache

Stand 31.10.2026 (Feedbackrunde 6: näher an den Vercel-Prototyp), davor abgeleitet aus vier Bewertungsrunden der Designsprache-Probe (`/poc/designsprache/`, Branch `feat/designsprache-poc`; alle PoC-Seiten am 04.11.2026 gelöscht, Stand in der Git-Historie). Grundlage ist der erste Prototyp (Branch `fix/minimal-fonts`); die Elevation „Lichtpunkt“ ist als Designrichtung verworfen, ihre Inhalte und Fakten bleiben gültig. Belege und Bewertungsverlauf: Kundenordner `freelance/clients/flyingstars/17-designsprache-poc-2026-10-30/README.md`.

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
- Zeiten und Vorlauf als Netzplan-Zeitstrahl (`MetroLine.astro`, über Tempo): Hauptlinie im Logoverlauf mit Stationen, Express als gestrichelte, gedämpfte Abzweigung von der ersten zur letzten Station (Nebenweg, nicht Hauptweg); das Schild ist selbst der Knopf („Express in 1–2 Wochen · bei Bedarf zubuchbar →“), kein zweiter Link daneben (Marc, 02.11.2026). Handy senkrecht.
- Consent: erste Stufe als kleine Karte unten rechts (380 px), nicht modal, ohne Abdunkeln; die optionalen Google-Dienste als zwei Punkte. Nur die Einstellungen sind ein echter Dialog (Marc, 02.11.2026, Details `docs/analytics-consent.md`).

**Formular:** Knöpfe linksbündig, Hauptknopf zuerst. Optionale Angaben im zweiten Schritt als Zeile kleiner „+ Telefon / Firma / Nachricht / Woher“-Knöpfe; ein Klick blendet das Feld ein und setzt den Fokus, vorbelegte Felder sind offen.

**Video auf dem Handy:** Startseiten-Hero und Referenz-Kopf zeigen das Showreel bis 700 px als gerahmtes Bild im Seitenfluss über der Überschrift (kleine Fassung, `data-src-small`), nicht als Hintergrund.

**Redaktionelle Hinweise:** jede Section kann `todo` tragen („Fehlt noch …“); sichtbar nur im lokalen Dev-Server. Kein Build rendert sie, auch nicht die Preview eines Feature-Branches (Marc, 02.11.2026); `scripts/content-gaps.test.mjs` wacht darüber.

**Textlink neben Knopf:** sitzt auf der Mittellinie des Knopfs (`.btn ~ .link`), nicht oben.

**Video im Rahmen (Anlass-Seiten):** läuft es, sitzt „Video anhalten“ unten rechts in der Ecke; angehalten bleibt das Bild des Videos stehen, der Knopf wandert in die Mitte und wird zum großen Play-Knopf ohne Beschriftung. Klick irgendwo aufs Video schaltet um. Rahmen-Ecken: Beschriftungen rasten innen ein, mittig auf Höhe des Schenkelendes, 14 px neben dem senkrechten Schenkel (wie im Vercel-Prototyp, auch im Startseiten-Hero).

**Sprache:** du/ihr, nie Sie. Gendern mit Doppelpunkt (Pilot:innen). Keine pauschalen Umweltversprechen (EmpCo). Moritz verantwortet die Texte, Entwürfe sind als solche zu kennzeichnen.

## Einheiten und Typo-Skala

Marc, 03.11.2026: Typografie, Abstände und Layoutlängen verwenden rem, ohne feste `html-font-size`. Die ACSS-artige gemeinsame Skala steht in `:root` von `src/styles/global.css`. Bei 16 px Browser-Grundschrift entsprechen 1 rem genau 16 px; größere Grundeinstellungen skalieren mit. Bestehende em-Werte für Sperrung und einheitenlose Zeilenhöhen bleiben erhalten.

| Token | Wert in rem, bei fluiden Werten `clamp(min, bevorzugt, max)` |
|---|---|
| `--text-xs` | `0.75rem` |
| `--text-label` | `0.8125rem` |
| `--text-sm` | `0.875rem` |
| `--text-control` | `0.9375rem` |
| `--text-base` | `1rem` |
| `--text-copy` | `1.0625rem` |
| `--text-md` | `1.125rem` |
| `--text-lead` | `clamp(1.0625rem, calc(0.03125rem + 1.4vw), 1.1875rem)` |
| `--text-lg` | `clamp(1.1875rem, calc(0.03125rem + 1.5vw), 1.375rem)` |
| `--text-xl` | `clamp(1.3125rem, calc(0.03125rem + 1.7vw), 1.5625rem)` |
| `--text-2xl` | `clamp(1.5rem, calc(0.03125rem + 2.2vw), 2rem)` |
| `--text-3xl` | `clamp(2rem, calc(0.03125rem + 4vw), 3.5rem)` |
| `--text-h1` | `clamp(2.25rem, calc(0.03125rem + 4.6vw), 4rem)` |
| `--text-page` | `clamp(2.5rem, calc(0.03125rem + 5.4vw), 5rem)` |
| `--text-4xl` | `clamp(2.625rem, calc(0.03125rem + 6vw), 5.5rem)` |

14,5 und 13,5 px werden auf `--text-sm` gefaltet, 12,5 auf `--text-label`, 11 und 11,5 auf `--text-xs`. Seltene Schriftgrößen und Abstände bleiben exakt umgerechnete rem-Werte. Die fluiden Tokens bewahren die bisherige vw-Steigung mit höchstens 0,5 px Abweichung bei 16 px Grundschrift; ihr kleiner rem-Anteil allein garantiert keine Verdopplung bei Textzoom. Visueller Textzoom und Reflow brauchen eine eigene Browserprüfung.

Media-Query-Grenzen in CSS, `media` und `sizes` verwenden em, bezogen auf die initiale Browser-Schriftgröße. Längen innerhalb von `sizes` verwenden rem. Video-Quelle und responsives Autoplay teilen `VIDEO_MOBILE_QUERY` mit 43,75 em; der feste API-Parameter `minAutoWidth` bleibt in CSS-Pixeln, responsive Aufrufer verwenden `autoMediaQuery`.

Bewusste px-Ausnahmen sind 1–2 px Hairlines, kleine Schattenkomponenten, unsichtbare 1 px Eingaben/Messpunkte, SVG-Benutzerkoordinaten samt Text im viewBox-Diagramm, Canvas-Schriften und gemessene DOM-/Zeigerkoordinaten. `rootMargin` wird an der API-Grenze aus rem in px aufgelöst. Der Sticky-Anker koppelt Inhalt und konstante Header-Linie exakt: `--nav-h: calc(4.25rem + 1px + env(safe-area-inset-top, 0px))`. Intrinsische HTML-Bildmaße und SVG-viewBox-Werte bleiben unverändert; berechnete Logo-CSS-Maße werden erst bei der Ausgabe durch 16 geteilt.

`scripts/no-px.test.mjs` prüft CSS, Astro-Inline-Styles und JS-/TS-Ausgaben auf neue px-Längen, mit eng begrenzten Ausnahmen. Er schützt außerdem Skala, Header-Formel, Slider-Fill und Video-Breakpoints. Aufruf: `node --test scripts/no-px.test.mjs`, auch aus einem anderen Arbeitsverzeichnis; Teil von `npm run -s test:unit`. Keine Allowlist für ungelöste Layoutwerte.

## Tokens

Marc, 04.11.2026: Was tatsächlich global ist, bekommt einen wiederverwendbaren Token. Besitzer ist `:root` in `src/styles/global.css`; lokale Literale bleiben auf eigenständige Geometrie, einmalige Farbnuancen und technische Protokollwerte begrenzt. Eine Konsolidierung ändert weder berechnete Werte noch Selektoren, Prioritäten oder Bewegungsverhalten. Vorhandene Typo-Skala, `--gutter`, `--section` und komponenteneigene Parameter zuerst verwenden.

| Familie | Verwendung |
|---|---|
| `--rgb-text`, `--rgb-ground`, `--rgb-surface`, `--rgb-amber`, weitere `--rgb-*` | Ein Besitzer je RGB-Kanalsatz; bestehende Vollfarben (`--text`, `--head`, `--ground`, `--accent` usw.) bleiben die öffentliche Schnittstelle. Alpha-Farben als `rgb(var(--rgb-text) / 0.42)`, ohne relative Farben oder neue `color-mix()`-Abhängigkeit. Logo- und Textakzent-Palette bleiben verschieden. |
| `--ink-secondary` (0.78), `--ink-subtle` (0.55), `--ink-half` (0.5), `--ink-bright` (0.85), `--ink-prominent` (0.82) | Wiederverwendete Text-Abstufungen mit denselben Kanälen wie `--text`. |
| `--fill-quiet` (0.025), `--fill-soft` (0.035), `--fill-hover` (0.06), `--fill-active` (0.07) | Helle Flächen auf dunklem Grund. |
| `--line-soft` (0.08), `--line` (0.1), `--line-medium` (0.12), `--line-emphasis` (0.18), `--line-bright` (0.22), `--line-strong` (0.24), `--line-bold` (0.3) | Linien mit unveränderten bisherigen Alpha-Stufen. |
| `--overlay-control`, `--overlay-media`, `--overlay-heavy`, `--overlay-panel`, `--overlay-shade`, `--surface-popover`, `--night-*`, `--line-cyan`, `--fill-cyan`, `--line-orchid`, `--shadow-ink/strong/soft` | Wiederkehrende vollständige Overlay-, Farb- und Schattenrollen; genaue Werte stehen ausschließlich am Tokenbesitzer. Transparente Verlaufsenden behalten ihre ursprünglichen RGB-Kanäle. |
| `--dur-*` | Exakte bisherige Dauern: u. a. `control` 0.2s, `color` 0.25s, `standard` 0.3s, `glide` 0.35s, `underline` 0.4s, `reveal` 0.6s, `reveal-move` 0.7s; eigene Tokens für Verzögerung, Staffelung und lange Schleifen. 40ms wird wertgleich zu `--dur-stagger: 0.04s`. |
| `--ease-*` | Benannte Kurven: `glide`, `reveal`, `curtain`, `enter`, `ruler`, `image`, `scene`, `spring`, `panel`; Standardkurven `default`, `ambient`, `out`, `linear`. Die bestehenden lokalen `--glide`-/`--move`-Parameter verweisen auf diese Tokens. |
| `--space-*` | Exakte Abstandsskala in Viertel-rem-Schritten: `--space-1: 0.25rem`, `--space-4: 1rem`, `--space-6: 1.5rem`; Bindestrich als Dezimaltrenner (`--space-1-5: 0.375rem`). Bruchteile erhalten bestehende Zwischenwerte. Negative Abstände verwenden `calc(-1 * var(--space-…))`. Komponentenbreiten und seltene Typo-Varianten bleiben eigenständige Geometrie; keine Rundung auf einen ähnlichen Skalenwert. |
| `--radius-*`, `--radius`, `--shadow-popover` | Identische Radien und der gemeinsame Dropdown-Schatten. Radiusnummern benennen Sechzehntel-rem (`--radius-8: 0.5rem`), `--radius-round: 50%`, `--radius-pill: 62.4375rem`; `--radius` bleibt 1.25rem. |
| `--reveal-offset`, `--reveal-member-offset` | 0.4em für Text-Reveal, 1.5rem für Team-Reveal. em/rem unterscheiden sich bewusst. Der JS-Vertrag `REVEAL_MARGIN` und der zentrale Bewegungsschalter bleiben unverändert. |

**Responsive Verträge:** `src/styles/media.css` besitzt die semantischen `@custom-media`-Definitionen: `--compact` 40em, `--mobile` 43.75em, `--timeline-stacked` 56.25em, `--nav-collapsed` 62.5em, `--nav-expanded` ab 62.5625em, `--grid-stacked` 68.75em, `--grid-expanded` ab 68.8125em und `--small-facts` 37.5em. Alle Maximalgrenzen sind inklusiv; die bisherigen Min-/Max-Paare werden nicht zu `not` umformuliert. Andere, komponentenspezifische Grenzen bleiben lokal.

Astro/Vite verwendet PostCSS; das bereits transitiv installierte Lightning CSS allein schaltet keine Custom-Media-Verarbeitung ein. `scripts/css-media.mjs` bildet deshalb die benötigte Teilmenge (eindeutiger Name, eine einzelne em-Grenze) als kleinen PostCSS-Plugin auf normale Media Queries ab. `astro.config.mjs` aktiviert ihn für globale und Astro-scoped Styles. Keine neue Abhängigkeit, kein Compilerwechsel, kein natives Custom-Media-Erfordernis in Safari 18. Unbekannte Namen und ungültige Definitionen brechen den Build; die Definitionsdatei ist eine beobachtete Build-Abhängigkeit. JS/HTML-Medienabfragen behalten ihren eigenen API-Vertrag; der Video-Wächter vergleicht die aufgelöste CSS-Grenze mit `VIDEO_MOBILE_QUERY`.

**Wächter und Ausnahmen:** `scripts/css-tokens.test.mjs` verbietet Marken-RGB-/Hex-Kopien in CSS und Astro-Styles sowie wiederholte Dauern und Easing außerhalb des Tokenbesitzers (ms/s werden normalisiert). Die kurze, gezählte SVG-Allowlist umfasst nur die vorhandenen Gradient-Stops, Lichtpunkte und Zonenillustration in `Base.astro`, `References.astro` und `LandingSite.astro`. Canvas-/Paketdaten und Drittbibliotheks-CSS werden nicht umgeschrieben. Einmalige Papier-/Illustrationsfarben bleiben lokal. `0s` ist der sofortige Zustandswechsel; `0.01ms` erhält die End-Ereignisse bei Pause/reduced motion. Diese Protokollkonstanten bleiben auch für den bestehenden Runde-20-Wächter wörtlich stehen.

**Nachweis:** `scripts/css-style-compare.mjs` vergleicht zwei unveränderte statische Builds anhand aller HTML-Dateien des Baseline-Builds, in Chromium und WebKit bei 390/1440 px, normaler und reduzierter Bewegung. Alle Elemente einschließlich `::before`/`::after`, Farben, Hintergründe/Verläufe, Linien, Schatten, Übergänge, Animationen, Deckkraft, Abstände, Radien, Typografie und Geometrie werden exakt verglichen. JS ist für diesen CSS-Vergleich deaktiviert; CSS-Animationen stehen auf demselben Zeitpunkt, Weiterleitungsziele werden separat verglichen. Rohe Unterschiede lassen sich mit `scripts/css-style-equivalence.mjs` durch stabile Nachmessung und Pixelvergleich von Verlaufsnotationen auflösen; aktive Übergänge enden vor der Nachmessung. Ergebnis und bestehende Baseline-Befunde: [CSS-Nachweis](css-tokens-proof/README.md). Layout-Audits laufen zusätzlich mit aktivem JS bei 390/1440/2560 px je Sprache und Engine.

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

**Kopfzeile und Links (Runde 20–20c, 04.11.2026):**
- Unterstrich-Effekt: EINE Regel in global.css für alle eigenständigen Textlinks (Hauptnavigation, Footer, Pfeil-Links `.link`, Kartentitel, Team-Namen, Kontaktwege, Brotkrumen; sonst Klasse `.hover-line`). Linie im Logoverlauf, zeichnet sich in 0,4 s von links ein und zieht sich nach rechts zurück, auf derselben Höhe, ohne Versatz und ohne Einblenden. Der aktuelle Menüpunkt behält sie. Grundregel in `:where()`, sonst schlägt ihre Spezifität die Auslöser. Links im Fließtext behalten ihre feste Unterstreichung. Kartentitel: WebKit balanciert Text in einem Inline-Element nicht, deshalb `joinLastWords` im Titel.
- Gleitende Box in Auswahllisten (`.glide-list` + `li.glide-mark`): Standard ist Anchor Positioning (Marc bevorzugt es), Ersatz ohne Anchor-Unterstützung (Safari bis 18) ist der Index-Mechanismus des Konfigurators (`--gi` über `:has()`, transform um Zeilenhöhen). Die Box ist ein echtes Element, weil WebKit an Pseudo-Elementen Übergänge abbricht, sobald `:has()` sie neu berechnet.
- „Anlässe“ und die Sprachwahl öffnen gleich: beim Zeigen und per Fokus (auch Tippen), reines CSS, schließen mit 0,12 s Verzögerung. Die Sprachliste sitzt absolut unter dem Knopf; das frühere Popover mit Anchor Positioning landete in Safari 18 neben dem Knopf.
- Bewegung: ein Schalter. `html.motion-paused` (Pause-Knopf, Startwert aus prefers-reduced-motion, gesetzt vor dem ersten Bild) und prefers-reduced-motion lassen alle CSS-Übergänge und -Animationen sofort enden. Hover-Zustände bleiben sichtbar, nichts bewegt sich. JS-Effekte folgen motion-policy.ts.
- Social-Logos (Footer, WhatsApp): `src/components/brand-icons.ts`, Bootstrap Icons (MIT) bzw. Marcs WhatsApp-SVG, über `<Icon name="…">`.
- Wächter: `scripts/round20-guards.test.mjs`.

**Kontaktdaten:** `src/content/contact.json` besitzt Nummern, E-Mail, Links und beide Anschriften. `CONTACT` in `src/components/people.ts` bleibt die gemeinsame Leseschnittstelle für `contactDetails` (/kontakt/), `ContactWays` und Footer; Anschriften stehen zeilenweise wie auf einem Umschlag. Danke projiziert explizite Kontaktreferenzen. Der Literale-Wächter erlaubt die operative Quelle sowie eigenständige Rechtsfassungen und den bestehenden PoC; ein separater Driftbericht vergleicht die Rechtsfassungen mit den aktuellen Werten.

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
- Assets: `public/brand/logos/`

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
- `ProcessList.astro` besitzt Listenschiene, Einträge und Nummerierung für Steps, Timeline, LandingFlow und MetroLine. `lib/lists.ts` vergibt Farben über dieselbe Markenpalette für beliebig viele Einträge und erkennt wiederholte Jahre. MetroLine behält Express-Abzweig und Gestaltung. Steps verwendet die tatsächliche Eintragszahl als Spaltenzahl, keine feste Fünferannahme. Story und Punktbild haben getrennte Datenattribute; die Case-Story fragt ausschließlich in `.c-story` ab.
- `SectionHead.astro` rendert alle regulären Section-Köpfe, auch FAQ, Anfrage, TextMedia, Konfigurator und Case-Abschnitte. `default` hat den normalen Section-Abstand, `embedded` behält das Fachlayout, `contents` die bestehende Grid-/Flex-Anordnung, `display` die große Nachhaltigkeitsüberschrift. H1-Hero- und Artikelköpfe bleiben Fachkomponenten. Nachhaltigkeits-Einleitung steht entsprechend der Kopfregel unter der Überschrift.
- `IconFeature.astro` rendert Icon/zulässiges Logo, echte Überschrift und Text für Safeguards, Umweltpfeiler, Qualität, Included, Bento und Extras. Normale Icons sind 36 px, kompakte Belege 18 px. Die Logo-Freigabe bleibt bei LogoBar; Extra-Auswahl und Preis bleiben Slots des Fachadapters.
- `MediaCard.astro` besitzt Medienrahmen, Badge, Metazeile, Titel und Hover-Ziel in ProjectCard, PostCard, LandingStories, Occasions und Referenz-Platzhaltern. `styles/media-card.css` besitzt deren benannte Varianten. Verlinkte Karten verbieten einen zweiten Aktionslink-Slot.
- `MediaFrame.astro` besitzt die vier Aufnahme-Ecken, `content` für FlightHero und `inset` für LandingHero, `none` für Rahmen ohne Ecken. Positionen nutzen Insets und Armlänge; Video-Policy bleibt im Controller.

**Runde 17 (02.11.2026):** Die Vergleichstabelle Drohne/Feuerwerk/Laser zeigt ihre Einordnung („Ja“, „Leise“, „Grenze“) als farbiges Wort ohne Icon; Icons in Tabellen sind kein Muss und verwirrten hier. Jede Paketkarte (Vorschau, große Karte, Landing-Preiskarte) zeigt die Showzeit über `showtimeLine()` in `package-details.ts`. Das Extra heißt „Express-Show in unter zwei Wochen“.

**Runde 18 (02.11.2026):**
- **Seitenanfang:** Jede Seite außer Startseite und Fallstudien beginnt auf derselben Höhe (`--hero-top`, 112–140 px). Vorher addierten sich 110 px Seitenabstand und der Innenabstand der ersten Section. Nur die erste Section trägt den Abstand (`main.page-top`). In Köpfen mit Bild steht der Text oben statt mittig, damit die erste Zeile auch bei 1920/2560 px auf `--hero-top` bleibt. `npm run audit:layout` prüft das als Regel `hero-top`.
- **Mobile-Menü:** Die Kopfzeile des Menüs ist die Kopfzeile der Seite (Logo, Sprache, Pause, Schließen, gleicher Innenabstand), beim Öffnen springt nichts. „Anlässe“ ist ein eingeklapptes Dropdown, die Links stehen oben.
- **Tabellen auf dem Handy:** Reiter der Vergleiche und der Kopf der Aufgaben-Tabelle kleben unter dem Header, mit deckendem Streifen in der Section-Farbe (`[data-sticky-strip]`). Ein Reiterwechsel lässt die Scrollposition stehen (seit Runde 19).
- **Reveals:** Alle Reveals lösen bei 3 rem sichtbarer Höhe aus (seit Runde 19: ein halbes rem) (`REVEAL_MARGIN` in `src/scripts/reveal-point.js`). Der scroll-gebundene Vorhang ist raus, weil er den sichtbaren Teil bis etwa 23 % der Bildhöhe verdeckte. Die Staffel zwischen Geschwistern beträgt 40–60 ms.
- **Footer:** „Website-Vorschau“ ist entfernt. Die Datenschutz-Einstellungen sind ein Cookie-Symbol rechts, nur sichtbar, wenn Tracking konfiguriert ist.
- **Texte:** Überall steht „10–25 Min Showzeit“, auch im Konfigurator; dort gab es noch die alte Staffel 10/13/15. Die ODYSSEY-Pill heißt „3D-Storytelling“, unter den Paketen steht „Alle Preise netto zzgl. Anfahrt“, der Kicker der Startseite lautet „Drohnenshows in DE · AT · CH · Benelux“.

**Runde 19 (03.11.2026):**
- **Reiter auf dem Handy:** Ein Wechsel lässt die Seite exakt stehen, damit man dieselbe Zeile schnell zwischen Paketen vergleichen kann. Das Antippen setzt Auswahl und Fokus selbst (`focus({ preventScroll: true })`), weil Chromium sonst beim Fokussieren eines Radios im klebenden Streifen bis zu 370 px springt. Geprüft in Chromium und WebKit.
- **Reveals:** Auslösen bei einem halben rem im Bild (`REVEAL_REM` in `reveal-point.js`, aus der aktuellen Grundschriftgröße gerechnet). Der Vorhang öffnet mit ease-out sofort sichtbar. Auf Touch erscheint das Foto nach 250 ms, falls die Lichtpunkte noch nicht vorbereitet sind (vorher bis 2,5 s leerer Rahmen).
- **Slider:** Pfeile stehen unter jedem horizontalen Slider, auf allen Breiten (`SliderNav.astro`, direkt nach dem Scroll-Container). Saisonkarten rücken nach vorn, danach setzt der Slider auf den Anfang zurück, sonst hielt Scroll-Snap die alte erste Karte fest und Silvester lag links außerhalb.
- **Zonen-Zeichnung (`LandingSite.astro`):** Lageplan wie im Technik-Datenblatt: Straßen, Häuser, Park als ruhiger Grund, Zonen als weich gerundete Flächen in den Datenblatt-Farben (Rot außen, Gelb innen, Grün Flug, Blau Start, Violett Publikum, Drohnen orange). Liste, Nummern und Werte tragen die Zonenfarbe. Die gewählte Zone hat eine laufende Kontur, im Flugbereich funkeln die Drohnen. Zonen lassen sich in der Zeichnung direkt zeigen oder antippen. Zeigen wählt nur bei echter Mausbewegung, sonst wählte die nach dem Zuklappen unter den Zeiger gerutschte Zeile die falsche Zone.
- **Zuständigkeiten:** Jede Aufgabe, die die Kund:innen übernehmen, nennt ein Verb („einholen“, „bereitstellen“, „benennen“). Marken & Werbung hat den Standort-Abschnitt mit Tabelle (`#standort`).
- **Anlässe:** Im Menü stehen Marken & Werbung, Agenturen, Hochzeit, Indoor. „Unternehmen“ mit Link auf die Startseite ist raus (Marc und Moritz, 03.11.2026); die Startseiten-Karte heißt „Marken & Werbung“.
- **Cookie-Entscheidung:** eine kleine Karte unten rechts mit kurzem Text, zwei Schaltern (Besucherstatistik · Google Analytics, Werbeerfolg messen · Google Ads) und dem Link zur Datenschutzerklärung; kein zweiter Einstellungsdialog mehr. „Akzeptieren“ heißt „Auswahl speichern“, sobald ein Schalter umgelegt ist, und speichert dann genau diese Auswahl. Das Cookie-Symbol im Footer öffnet dieselbe Karte mit dem gespeicherten Stand, Escape schließt sie ohne Änderung. Anbieter, Rechtsgrundlage, Speicherdauer und Drittland stehen in der Datenschutzerklärung. `#cc-main` nutzt 1rem statt der 16px der Bibliothek.
- **404:** Knöpfe „Startseite / Referenzen / Preise / Show-Anfrage“, Text ohne ch-Begrenzung, Spalten 1,1 : 0,9, damit die vier Knöpfe in eine Reihe passen.
- **Team-Reveal:** Beobachtete Reveal-Elemente dürfen im Startzustand nicht verschoben sein. Die Team-Karte lag 5 rem tiefer, der Observer maß die verschobene Box und löste erst bei 92 px sichtbarer Höhe aus (in Marcs 400 px hohem Fenster fast ein Viertel). Jetzt bewegen sich nur die Kinder um 1,5 rem, Auslösung bei 9–12 px in Chromium und WebKit. Der Zeitstrahl (`ProcessList`) nutzt ebenfalls `REVEAL_MARGIN` statt eigener 12 %.
- **Startfläche im Lageplan:** laufende Kontur als Rahmen mit Abstand um die gefüllte Fläche.
- Wächter: `scripts/round19-guards.test.mjs`. Offene Punkte vor dem Launch: `docs/pre-launch-checkliste.md`.

## Aktiver Quellgraph nach Etappe A

Frontend-Wurzeln sind Astro-Routen und SectionRenderer. Der Editor startet über `editor/server.mjs` und `flyingstars-adapter.mjs`; `browserFiles` registriert die Browsermodule. Unter `extensions/flyingstars` bleiben Runtime-Kompatibilität sowie die aktiv registrierten Routing-, Preview- und Medienmodule. Die alte Overlay-/Creation-Architektur und unbenutzte Calculator-/Video-Renderer wurden entfernt. Der Pixel-Guard prüft jetzt den aktiven Konfiguratorregler. `scripts/dedupe-a-legacy.test.mjs` prüft lokale Imports und die tatsächliche Browserregistrierung. Öffentlich erreichbare PoC-Routen bleiben erhalten.

## Operativer Kontakt

`src/content/contact.json` besitzt Mail, Festnetz, Mobil, Videocall und beide Anschriften. `contactSchema` validiert dieselbe Datei für Build und Editor. `CONTACT` in `people.ts` bleibt die Leseschnittstelle; Telefon- und WhatsApp-Links entstehen aus den gespeicherten Nummern. Der Datensatz „Kontakt“ ist über den bestehenden Panel-Feldmarker mit leerem Feldpfad in Footer, Kontaktwegen und Kontaktdetails erreichbar. Diese Aufgabe verwendet die bewährte Datensatzansicht; es gibt keine zusätzliche Interaktion oder Parallelablage.

Nur explizite `{{contact.email}}`, `{{contact.phone.label}}` und `{{contact.phone.href}}` im TextMedia-Text werden projiziert, aktuell auf Danke. UI-Fehler verwenden `{email}`. Impressum und Datenschutz behalten ihre eigenständige Freigabe. `node scripts/check-contact-drift.mjs` meldet Abweichungen; er schreibt keine Rechtsfassung um. Der Mutationsnachweis `editor/contact-record.test.mjs` speichert über NativeStore, baut alle drei Sprachen und prüft Kontaktmarker, Footer, Section, ContactWays, Danke und unveränderte Rechtsdateien.

## Showzeiten

`show-duration.json` besitzt Outdoor-Spanne, typische Outdoor-Dauer und Indoor-Spanne. Diese sind fachlich verschiedene Werte. Der Datensatz „Showzeiten“ verwendet denselben Zod-Vertrag im Build und Editor; typische Dauer muss innerhalb der Spanne liegen. Das wirkungslose `dur` je Paket entfällt. Karten und Konfigurator verknüpfen ihre Showzeit über native Panel-Feldmarker mit der gemeinsamen Policy. Lokalisierte UI-Satzmuster erhalten numerische Parameter. FAQ und Indoor-Inhalte referenzieren ausschließlich explizite Dauerfakten; FaqAnswer, FactList, ComparisonCell und SEO-Beschreibung projizieren sie ohne Kopie der Zahlen. Die 50–160 Zeichen der Beschreibung werden an der projizierten Ausgabe geprüft. Mutation und textgleicher Default werden von `show-duration.test.mjs`, `duration-record.test.mjs` und dem Buildvergleich belegt.

## Paketidentität und Vorschaupolicy

Die Paket-Keys und ihre Reihenfolge sowie Bezeichnung und Orb-Form gehören zu `show-packages.json`. Schema-Enums, Paketknöpfe, Formular und API projizieren dieselben IDs. Formularlabels verwenden den vorhandenen kleinen Anfangsbuchstaben als Darstellungsregel; PoC-Inhalte bleiben eigenständig.

`preview-policy.json` ist der ausdrücklich getrennte, nicht freigegebene Vorschauvertrag mit Schrittweite, lückenlosen Bereichen und SPARK-Erweiterungsaufschlag. Die kommerzielle SPARK-Grenze 150 und Vorschaugrenze 190 sind verschiedene Werte. Der Editor nennt den Datensatz „Vorschaupolicy · nicht freigegebene Preise“. Sein Freigabefeld ist unveränderlich `true` für vorläufig. Der Drohnenregler öffnet diesen Datensatz über einen Record-Marker. Bestehende Preis-, Übergangs- und Freischalttests prüfen sämtliche wählbaren Stufen. `package-policy-record.test.mjs` prüft gespeicherte Änderungen bis zur dreisprachigen Buildausgabe.

## Extras, Sonderangebote und Preisteile

`show-extras.json` besitzt Film- und Schweizpreis, Indoor-Preis, Drohnenspanne und Mindestdeckenhöhe sowie die Film-Inklusion. `showExtrasSchema` validiert Build und Editor. Der Datensatz „Extras und Sonderangebote“ ist über Preiszeilen und Film-Vergleichszellen erreichbar. Leistungszellen und Karten-Inklusionen projizieren denselben Film-Eintrag. Die vorhandenen redaktionellen Kurz- und Langtexte bleiben im mehrsprachigen UI-Wörterbuch editierbar.

`price.mjs` erzeugt Betrag, Währungsposition und Qualifikator als getrennte Teile. PackageCard, PricingPage, LandingPrice und der Server-/Browser-Konfigurator benutzen dieselbe Formatierung. Der Indoor-Bezug in LandingPrice ersetzt den alten vollständigen Preissatz; freie Sonderfälle haben ausdrücklich getrennte `customPrice`-Teile. Es gibt keine Regex, die den Betrag aus einem übersetzten Satz gewinnt. Die vorhandene Suffix-Schreibweise „900 €“ in Vergleich und Hochzeit ist eine benannte Formatvariante und bleibt auch in EN/NL erhalten. Netto- und Anfahrtsaussagen bleiben in ihren bisherigen Satzmustern; „hier nicht angegeben“ ist keine neue Anfahrtszusage.

Nur ausdrücklich migrierte `{{offer.…}}`-Referenzen werden beim Rendern in den betroffenen Ausgaberollen projiziert. Gespeicherte Texte bleiben Templates. Mengen in Beispielzeichnungen und historische Projektzahlen sind eigenständige Beispiele, keine aktuellen Angebotsgrenzen. Ausgeschriebene kleine Mengen verwenden die Zahlwörter des vorhandenen UI-Wörterbuchs, damit „drei Meter“ textgleich bleibt. `fact-references.test.mjs` prüft alle aktuellen Inhaltsdateien auf auflösbare Referenzen und die migrierten Aussagen auf wieder eingeführte Zahlenkopien. `extras-record.test.mjs` speichert reale Änderungen über den Editor und prüft die gebauten Preis-, FAQ- und Anlass-Ausgaben.

Die Paketbezeichnung wird weiterhin im bestehenden Datensatz „Website-Texte“ gepflegt; `labelKey` ist eine geschützte Referenz und kein zweites Textfeld. Auswahlbeschriftungen wie „Kugel“, „Fester Betrag“ und „Ab ca.“ stammen aus `x-afe.choices`; die Vorschau-Erweiterung führt ihren Paketbezug als eigene Gruppe. Der Build prüft außerdem die gemeinsame Preisfolge über alle Vorschau-Stufen und lehnt eine Erweiterung außerhalb der kommerziellen Grenze ab.

Fakten, die in FAQ-Markdown eingesetzt werden, werden vor dem Markdown-Parser als Text maskiert. Die normalen Astro-Ausgaben bleiben bei ihrer eigenen Text-Escapierung. Der Guard prüft die echte `marked`-Ausgabe mit HTML, Hervorhebung und einem Markdown-Link als UI-Fakt; daraus dürfen keine HTML-Elemente oder Links entstehen.

Projizierte FAQ- und Danke-Texte verwenden im Editor die native Panel-Bearbeitung der Markdown-Quelle. Eine Inline-Bearbeitung des expandierten DOM würde Fakten als Literale zurückspeichern. Die Kontakt-/Dauer-Mutationsprüfungen sichern deshalb zusätzlich den Panel-Vertrag am tatsächlich gebauten Editor-Markup ab. Die Film-Inklusion steuert auch die explizite Paketangabe auf Werbung und den Rohmaterial-Bestandteil der ODYSSEY-Betreuung; frei formulierte Teile dieser Texte bleiben im UI-Wörterbuch.

## Geschäftsfakten

Numerische Geschäftsaussagen mit Geltungsbereich und Stand liegen in `src/content/business-facts.json`, im Editor unter „Geschäftsfakten“. Strukturierte Zahlenfelder können `{fact, display}` referenzieren. Freie Texte bleiben frei; `scripts/check-business-drift.mjs` meldet Abweichungen mit tatsächlichen Feldpfaden. Redaktionelle Platzhalter sind seit Marcs Freigabe vom 04.11. erlaubt. Explizite `{{contact.…}}`, `{{duration.…}}`, `{{offer.…}}` und `{{project.<id>.<field>[.<display>]}}` werden aus ihren Besitzern aufgelöst; unbekannte Platzhalter brechen den Build ab. Versicherungs-Bis-Beträge, historische Bestände und Rundungen sind keine erweiterten Leistungszusagen. Quellen-/Freigabestatus steht am Fakt.


## Personen, Projektfakten und Anfragevertrag

Name und Porträt liegen unter `src/content/people/`, im Editor als Personen. Teamkarten verwenden `personId`, Blogartikel `authorId`. Rollen, Bios und kontextuelle Alt-Texte bleiben in ihren Sprachdateien. Die zentrale Personenliste verwendet relative JSON-Imports, damit CLI und Builder auch aus fremden Arbeitsverzeichnissen dieselben Dateien lesen.

Historische Showdaten liegen in `src/content/project-facts.json`, im Editor unter Website-Daten → Historische Projektfakten. Strukturierte Ausgaben verwenden `{project, field, display?}`; die Auswahl zeigt Ereignis, Faktenfeld und Ausgabeformat. Übersetzte Kunden-/Ortsnamen stehen beim Fakt. Teaser und spätere Aufführungsserien dürfen eigene Ereignisse sein; ein unbekannter Tag wird nicht als tatsächlicher erster Monatstag ausgegeben. VW-Drohnenzahl und unzugeordnete Ereignisse bleiben offen.

Formular, Referenzfilter und Konfigurator verwenden getrennte Anlass-IDs aus `occasions.mjs` mit ausdrücklichem Mapping. `inquiry.mjs` besitzt den Anfrage-URL-Vertrag und die bisherigen Limits. Native No-JS-Anfragen bleiben möglich; Query-Vorbelegung benötigt auf der statischen Site JavaScript. `i18n/public-routes.mjs` verbindet öffentliche Route, AFE-Adresse und Delivery-Projektion; widersprüchliche Redirects und belegte Inhaltsrouten als Redirect-Quellen sind Fehler.
