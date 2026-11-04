# CSS-Konsolidierung C01/C03/C04 – Nachweis vom 04.11.2026

Basis `origin/main` = `3e42814`, eigener Worktree `/tmp/fs-css-tokens`, Branch `codex/css-tokens`. Die Site-Änderungen liegen in `b8f0623` und `1acf5ec`. Keine Inhalte, kein Astro-Markup außerhalb der Style-Blöcke und keine Frontend-Logik geändert. Keine neue Abhängigkeit.

## Ergebnis

158 zusätzliche Root-Tokens (vorher 53, nachher 211 einschließlich des bestehenden Supports-Fallbacks). 1.478 lokale Literale zentralisiert: 222 Farben, 227 Dauern, 132 Easing-Werte, 720 Abstände, 102 Radien, zwei Reveal-Abstände und 73 Media Queries. Zusätzlich teilen zwei Dropdowns denselben Schatten-Token. Zählung außerhalb des Root-Besitzers; eine anschließende Umbenennung eines RGB-Ausdrucks zu einer semantischen Overlay-Rolle zählt nicht nochmals.

Farben verwenden gemeinsame Kanäle und exakte Alpha-Rollen; Schrift-/Logoakzent bleiben getrennt. Abstände und Radien werden nicht gerundet. Übergangsschalter, Unterstrich-Besitzer, Anchor Positioning und Index-Ersatz bleiben unverändert. Die bestehende Typo-Skala bleibt bei 15 Stufen.

Custom Media funktioniert für globale und Astro-scoped Styles über die schmale PostCSS-Abbildung `scripts/css-media.mjs`, Definitionen in `src/styles/media.css`. Vite verwendet bereits PostCSS; das vorhandene Lightning CSS wird nicht zum neuen Compiler gemacht. Kein zusätzliches Paket. Die Abbildung kennt bewusst nur einzelne benannte em-Grenzen, meldet unbekannte Namen und registriert die Definitionsdatei als Build-Abhängigkeit.

## Stilgleichheit

[Maschinelle Zusammenfassung](results.json). Vollscan aller 96 HTML-Dateien: 72 Inhalts-/Sonderseiten und 24 separat verglichene Weiterleitungen. Je Engine 384 Seitenkonfigurationen (390/1440 px × normale/reduzierte Bewegung), 710.628 Element-/Pseudo-Element-Messungen und **34.820.772 exakt verglichene Werte**. Die Eigenschaftsliste steht im JSON. JS ist während dieses CSS-Vergleichs deaktiviert; CSS-Animationen werden auf denselben Zeitpunkt gestellt. Aktive Übergänge werden bei stabilen Nachmessungen beendet, damit keine unterschiedlichen Zwischenbilder verglichen werden.

| Engine | Vollscan | Final unerklärte Abweichungen |
|---|---:|---:|
| Chromium 153.0.8010.12 | 34.820.772 Werte | **0** |
| WebKit 26.6 (Playwright) | 34.820.772 Werte | **0** |

Der erste Literal→Token-Build hatte 347 rohe Chromium- und 7.261 rohe WebKit-Differenzen. Alle sind klassifiziert und am finalen Stand nachgeprüft:

- Variablen verhindern bestimmte Minifier-Umschreibungen. Wertgleiche Nullpositionen (`0px`/`0%`) und Verlaufsnotationen wurden als RGBA-Pixel in vier Geometrien verglichen. Sieben Paare in Chromium und drei in WebKit sind exakt pixelgleich.
- WebKit rastert einige umgekehrte Verlaufsrichtungen geringfügig anders. Fünf betroffene Deklarationen schreiben deshalb explizit die Richtung und Stop-Reihenfolge des bisherigen kompilierten Builds. Ihre Farbwerte bleiben Tokens. Die betroffenen Elemente stimmen bei der finalen Nachmessung exakt überein.
- Noch nicht stabil aufgelöste Styles/Auto-Ränder und künstlich am Anfang angehaltene Hover-Übergänge lieferten vereinzelte Messartefakte. Nach vollständigem Rendern, neutralem Zeiger und Beenden dieser Übergänge stimmen auch diese Werte exakt überein. Es wurden keine Elemente aus dem Vergleich ausgenommen.

Der Vollscan lief vor der gezielten Verlaufs-Korrektur; jede rohe Differenz wurde danach entweder durch Pixelgleichheit oder eine exakte erneute Messung am finalen Build aufgelöst. Das JSON zählt jede davon. Vollständige Rohdaten und Einzel-Nachmessungen liegen zusätzlich unter `/tmp/fs-css-computed.json` und `/tmp/fs-css-computed-reviewed-final.json`.

Reproduzieren (beide Builds separat statisch bereitstellen):

```sh
node scripts/css-style-compare.mjs http://127.0.0.1:4811 http://127.0.0.1:4812 /tmp/fs-css-baseline-dist /tmp/css-raw.json
node scripts/css-style-equivalence.mjs /tmp/css-raw.json /tmp/css-reviewed.json
```

## Layout und Tests

Der unveränderte Layout-Prüfer lief mit aktivem JS je Sprache und Engine bei 390/1440/2560 px: **22 verlinkte Seiten je Sprache, überall 0 Befunde**. Eine temporäre Kopie desselben Prüfers hat zusätzlich die sechs nicht verlinkten Danke-/404-Seiten geprüft. WebKit: 0. Chromium: 29 Befunde ausschließlich auf EN/NL-404. Derselbe Zusatzlauf auf `3e42814` liefert bytegenau denselben Bericht: sechs `hero-top`- und 23 `contain`-Befunde. **0 neue Befunde.** Der Altbestand wurde nicht im Rahmen der CSS-Konsolidierung umgestaltet.

Öffentlicher Produktionsbuild erfolgreich. Astro-Check: 0 Fehler, 0 Warnungen, 246 bestehende Hinweise.

Die angeforderte vollständige Unit-Suite lief mit Parallelität 2: 659 Tests, 655 bestanden, ein fehlgeschlagener Literal-Wächter, ein abgebrochener Test, zwei übersprungen. Der Reveal-Wächter wurde auf Tokenauflösung umgestellt; derselbe Kurven-Vertrag bleibt erhalten. Anschließender gemeinsamer Nachlauf von Token-, no-px-, Konsolidierungs-, Runde-19- und Runde-20-Wächtern: **42/42 bestanden**. Der anschließende vollständige Nachlauf von `scripts/*.test.mjs`, `src/scripts/effects/*.test.mjs` und `src/scripts/*.test.mjs` ist ebenfalls grün: **235 bestanden, zwei übersprungen, keine Fehler/Abbrüche (237 insgesamt)**.

Der abgebrochene Test ist `editor/git-sync.test.mjs:9` („A slow remote push never holds the save lock …“, 20-Sekunden-Limit). Er scheitert auch einzeln auf dem unveränderten `3e42814` mit demselben Timeout. Sein zweiter Test besteht. Dieser bestehende Editor-Befund wird nicht durch eine Lockerung des Limits verdeckt.

## Bewusste Ausnahmen

- `0s` und `0.01ms`: sofortiger Zustandswechsel bzw. Erhalt von End-Ereignissen bei Pause/reduced motion; bestehende Runde-20-Regel bleibt wörtlich erhalten.
- SVG-Gradient-Stops/Lichtpunkte und Zonenillustration: gezählte, begründete Allowlist in `scripts/css-tokens.test.mjs`; kein allgemeiner Dateiausschluss. Canvas, Paketdaten und Drittbibliotheks-CSS liegen außerhalb dieses reinen CSS-Auftrags.
- Einmalige Papier-/Illustrationsfarben sowie komponenteneigene Geometrie, feste Typo-Varianten und andere fachliche Breakpoint-Grenzen bleiben lokal. Sie werden nicht auf ähnliche globale Werte gerundet.

Der Token-Wächter prüft auch einen einzigen Root-Besitzer je gemeinsamer Tokenfamilie, unbekannte Verweise, äquivalente ms/s-Dauern, normalisierte Kurven und CSS in Astro-Inline-Attributen. Fehlerfixtures belegen die Erkennung.
