# FlyingStars Designsystem „Lichtpunkt“ (Stand 30.10.2026)

Dieses Dokument ist der verbindliche Rahmen für alle Seiten und Komponenten. Es gilt für Menschen und Agenten.

## Die Idee in drei Sätzen

Eine Drohnenshow ist Licht auf Nachthimmel: Jede Drohne ist ein Lichtpunkt. Die Site ist darum dunkel, ruhig und großzügig, damit die echten Bilder und die Live-Vorschau leuchten können. Die Marke ist nahbar und sachlich zugleich: Headlines mit Charakter, Text ohne Superlative, kein Interface-Dekor.

## Tokens (src/styles/global.css)

| Token | Wert | Rolle |
|---|---|---|
| `--ground` | #0b0a0a | Seitenhintergrund |
| `--surface` | #131111 | gehobene Flächen (Footer, Formular, einzelne Sections `.alt`) |
| `--surface-2` | #1a1716 | Karten auf Surface |
| `--text` | #f3eee6 | Text (warmweiß) |
| `--muted` | #b3a99c | Zweittext, Leads |
| `--faint` | #8f8679 | Meta, Bildunterschriften |
| `--line` / `--line-strong` | 10 % / 22 % Weiß | nur für Formularfelder, Tabellen, Akkordeon-Trenner |
| `--amber` / `--orchid` / `--cyan` | #ff9e29 / #db64e8 / #33edf2 | Paketfarben SPARK / HORIZON / ODYSSEY. Keine anderen Verwendungen. |
| `--grad` | Verlauf amber→orchid→cyan | nur Logo und genau EIN Signatur-Element je Seite |
| `--display` | Bricolage Grotesque (variable, opsz 12–96, wght 200–800) | Headlines, große Zahlen (`.num`) |
| `--body` | Inter | Fließtext, Interface, Labels |
| `--pad` / `--section` | clamp | horizontaler Seitenrand / vertikaler Sectionabstand |
| `--radius` / `--radius-lg` | 14 / 22 px | Formularfelder, Bühne, Bilder. Buttons sind Pills. |
| `--measure` | 58ch | maximale Zeilenlänge für Fließtext |

## Typografie

- H1 `clamp(40px, 6vw, 84px)`, H2 `clamp(34px, 4.2vw, 60px)`, H3 ~24px, alle `--display` 500, enge Laufweite, `text-wrap: balance`.
- Fließtext 17px Inter, Lead 18–21px in `--muted`. Zeilenlänge höchstens 58ch.
- Große Zahlen (Preise, Drohnenzahlen) in `.num` (Display, tabular).
- **Verboten:** Eyebrow-/Kicker-Zeilen über Headlines, tracked-out ALL-CAPS-Labels, Nummern 01/02/03 ohne echte Reihenfolge, Gradient-Text, ein einzelnes farbiges Wort in der Headline, „→“ an Linktexten. Die Klasse `.kicker` ist auf `display:none` gesetzt und soll aus dem Markup verschwinden.
- Labels in Formularen und Tabellen: Inter 14–15px, normale Schreibung.

## Layout

- Sections sind linksbündig. `.sec-head` = Headline, darunter Lead (kein Zwei-Spalten-Kopf mehr). Max. Breite des Kopfes 60rem.
- Whitespace trennt Sections; keine Linien zwischen Sections. `.alt` nur für Formular/Anfrage und die Preisbühne.
- Karten nur dort, wo Inhalte wirklich eine Einheit sind (Pakete, Anlässe mit Bild). Dann: `--surface` auf `--ground`, keine Schatten, höchstens `1px var(--line)`.
- Raster: 4 → 2 → 1 Spalten bei 1100 / 640 px. Mobile zuerst denken: Jede Section muss bei 390 px ohne Scrollen in der Breite funktionieren.
- Navigation: Logo, 5 Links, DE, Pause-Taste, ein gefüllter Button „Show anfragen“. Mobil Dialog.

## Bewegung

- Genau ein orchestrierter Moment je Seite: Startseite = Showreel-Video (Klick), Preisseite = Live-Vorschau der Show. Sonst keine Scroll-Einblendungen, keine Hover-Zooms auf jeder Karte, kein Laufband.
- Bewegung antwortet auf Handlung (Akkordeon, Paketwechsel, Formularschritt). `prefers-reduced-motion` und die globale Pause (`html.motion-paused`) respektieren.

## Sprache

- Du/ihr. Gendern mit Sternchen (Pilot*innen). Keine Superlative, keine Garantien, keine „X statt Y“-Zuspitzungen. Konkrete Zahlen nur, wenn FlyingStars sie bestätigt hat (Fragebogen 21.10.2026).
- Buttons sagen, was passiert: „Show anfragen“, „Mit SPARK anfragen“, „In der Vorschau ansehen“.
- Keine Gedankenstriche in Websitetexten; Punkte und Kommas.

## Komponentenregeln

- Jede Section ist ein Typ in `src/content.config.ts` mit genau einer Komponente in `src/components/sections/`. Neue Typen 30.10.: `packages`, `showPreview`, `timeline`.
- Bilder nur als URLs auf `flyingstars.art` (oder MEDIA_HOST) mit `alt`, `width`, `height`, optimiert über `optimizedImage()`.
- Preise kommen ausschließlich aus `src/content/show-packages.ts`.
