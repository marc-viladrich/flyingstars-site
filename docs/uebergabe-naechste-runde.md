# Übergabe nach Logo-Runde 5 (Runde 28)

Stand 12.11.2026 (spät), Branch `feat/logo-runde-5` (Basis `main` 96d2646). Nicht gepusht.

## Erledigt in Runde 28

- Logo kehrt seltener zurück: im Mittel vier Motive zwischen zwei Logos, gleichmäßig über die Runde (`show-tempo.js`, `TEMPO.logoEvery = 4`, Test in `scripts/show-price.test.mjs`).
- Drohnenregler im Logo-Anlass hat nur noch einen Griff (die gewünschte Zahl, Farbe der Zone, in der er steht); die Empfehlung steht allein in der großen Zahl. Bedarfspunkt entfernt.
- Über dem Paketnamen „Passendes Paket für euer Logo“. Paket, Preis und Anfrage rechnen mit der buchbaren Zehnerstufe (Puma 194 → 200 → HORIZON, vorher SPARK).
- „Dieses Logo in der Show verwenden“ ist deaktiviert, bis das Logo berechnet ist.
- Motiv-Animationen (Codex, Branch `feat/motiv-animationen`, gemergt): Smiley zwinkert (Lid aus jeder zweiten Augendrohne), Handschlag schließt zum Griff, Konfettikanone wird gezogen und stößt dann aus, beim Anstoßen schiebt sich nur das rechte Glas vor das linke (geprüfte Glasmasken statt `x < 0`). Nachweise `docs/motiv-animationen/`.
- Logo als Anhang der Anfrage (Codex, Branch `feat/logo-anhang`, gemergt; Doku `docs/integrations/logo-attachments.md`). Im Formular Schritt 1 als Feld „Euer Logo“ mit Original, Punktbild und Drohnenzahl, je entfernbar; Versand erst mit der Anfrage über Brevo. Upload-Hinweis im Konfigurator entsprechend geändert.
- WebKit-Absturz beim Verkleinern: auf 96d2646 mit Playwright-WebKit 26.6 in zehn Läufen nicht reproduzierbar (Bericht im Worktree `/tmp/fs-webkit-resize/research/`). Keine Safari-Aussage.
- Text-Drohnenkopplung an die Budget-Flexibilität entfällt: der Regler wurde in Runde 27 entfernt.

## Offen

- Logo-Anhang: echte Brevo-Zustellung prüfen; Datenschutzerklärung für Anhänge ergänzen (Cloudflare, Brevo, Aufbewahrung/Löschung) — Entscheidung bei FlyingStars.
- Anstoßen: das linke Glas blendet als Ganzes aus, keine punktgenaue Verdeckung. Handschlag-Endform ist aus späten Clipframes angenähert. Mindestabstände echter Drohnen für die vier Animationen nicht geprüft.
- Nicht geprüft: Marcs Safari 18.6, echte Handys.

## Technischer Einstieg

Konverterquelle: `/Users/marcviladrich/Freelance/AI & Automation/Claude Code Prep/freelance/clients/flyingstars/23-logo-drohnen-konverter`.
`node integration/vendor.mjs /Users/marcviladrich/Freelance/zzdev/flyingstars-poc/src/scripts/logo-v10` übernimmt die Quelle. Vendorte Dateien nicht separat bearbeiten.

Beispiele: `tools/v10/configurator-examples.mjs <site>` erzeugt sämtliche Stufen aus `src/content/preview-policy.json`. Browserraster liegen für reproduzierbare Berechnung unter `tools/v10/configurator-rasters/`. Fehlende Größen werden aus dem laufenden Dev-Server auf Port 4391 mit dem Browserrasterizer erzeugt. Chromium über die Playwright-Installation der Site, keine zusätzliche Abhängigkeit.

Bekannte rote Tests: Konverter „v4 point 4“; Site „All 132 full locale files carry current version 2 field evidence“ und „Freischalten: auch ein Paketwechsel …“. Neue Fehler separat bewerten.

## Ergänzung von Marc während dieser Runde: Logo-Button (Claudes Dateihoheit)

„Dieses Logo in der Show verwenden“ im Logo-Anlass immer zeigen, zunächst deaktiviert. Nur ein tatsächlich ausgewählter eigener Upload aktiviert ihn. Beispiel-Logos aktivieren ihn ausdrücklich nicht. Ohne umgebende Box, auch im leeren Zustand keine leere Fläche.

Konkrete Umsetzung in Claudes Dateien:

- `src/components/configurator/ShowConfigurator.astro`, `#cfg-use-logo`: `disabled` als Ausgangszustand ergänzen. Der normale Nicht-Logo-Anlass darf den Knopf weiterhin ausblenden.
- `src/scripts/show-configurator.js`, `drawLogoMode()`: die bisherige Zuweisung `$("#cfg-use-logo").hidden = !mine` ersetzen durch `useLogo.hidden = !logoMode; useLogo.disabled = !logo || !!logo.example || !lastLogoPts?.length;`. `const useLogo = $("#cfg-use-logo")` lokal davor deklarieren. `mine` für Editor/Minimap davon unabhängig lassen.
- Im Klickhandler von `#cfg-use-logo` zu Beginn `if (!logo || logo.example || !lastLogoPts?.length) return;` als Schutz ergänzen. Eine Beispielauswahl darf nie zur eigenen Show übernommen werden.
- `src/styles/show-configurator.css`: im Logo-Anlass die umgebende `.cfg-sum` ohne Hintergrund, Rand, Schatten und Karten-Innenabstand rendern. Den deaktivierten Button sichtbar lassen und als deaktiviert kenntlich machen. Kein `[hidden]` als Ersatz für `disabled`.

Codex hat diese drei Dateien nicht verändert. Spotify-Konturlücke und Lamborghinis freistehender Bulle werden im Konverter bearbeitet.

## Weitere Ergänzung von Marc: Paket, Hinweis, Geschwindigkeit und Wording

Claudes UI-Bereich:

- Das zur Logo-Empfehlung gehörende Paket sichtbar machen, ohne einen weiteren Paket-Picker einzubauen. Den Übernahme-Button paketbezogen beschriften, z. B. „Dieses Logo in einer HORIZON-Show verwenden“. Maßgeblich ist das Paket der empfohlenen Punktzahl, analog zur großen Zahl und Preisberechnung. Ohne eigenes Logo bleibt der sichtbare Button deaktiviert; Beispiele bleiben ausgeschlossen.
- Disclaimer/Hinweis breiter setzen, Schriftgröße und Zeilenhöhe erhöhen. Seine Drohnenzahl mit derselben Paketfarbe wie die große Zahl einfärben. Nicht nur den Reglerwert zur Farbwahl verwenden.
- Default-Tempo auf 2× setzen, einschließlich korrektem aktivem Tempo-Knopf und `field.setRate(2)`. Das betrifft insbesondere die Übergänge beim Upload und bei Dichteänderungen. Keine getrennte, widersprüchliche Tempo-Vorgabe nur in `show-field.js` ergänzen.
- „N Drohnen werden benötigt“ durch „N Drohnen empfehlen wir“ ersetzen. Alternativ wäre „N Drohnen empfehlen wir für ein gutes Bild“ möglich; die kürzere Variante passt besser zur großen Zahl. Als Empfehlung formulieren, nicht als garantierte Mindestanforderung. Übersetzungen und Provenienz liegen bei Claude.

Die Reglerobergrenze wurde parallel auf 1.000 erhöht. Der endgültige Beispielsatz enthält 91 Zehnerstufen von 100 bis 1.000. Der Decoder in `logo-mode.js` und `logo-v10/prepared.mjs` muss mit übernommen werden, da die neuen Formationsdateien verlustfrei gepackte Punkte verwenden.

Zur Formulierung: Die kurze Variante „N Drohnen empfehlen wir“ ist vorzuziehen. „Für ein gutes Bild“ verspricht bei den bewusst extrem niedrigen manuellen Dichten zu viel; diese Stufen sollen laut Marc ausdrücklich bis zur schlechten Darstellung reichen.

## Noch abzugleichen: Dichtestufen im parallelen UI-Code

Beim Abschlussabgleich enthält `show-configurator.js` inzwischen 19 Stufen von 0,07 bis 3, `RISKY = 2`; das Astro-Input hat `max="18"`, `value="8"`. Das weicht vom Auftrag an Codex ab. Die Konverter-Prüfung und Kontaktbögen decken exakt die beauftragten 16 Werte ab:

```js
const DENSITIES = [0.03, 0.05, 0.07, 0.09, 0.12, 0.15, 0.24, 0.33,
  0.42, 0.51, 0.60, 0.69, 0.78, 0.87, 0.96, 1.05], RISKY = 4;
```

Für diesen beauftragten Stand in `src/components/configurator/ShowConfigurator.astro`, `#cfg-detail`, `max="15"` und `value="10"` verwenden. CSS-Risikobereich und Hint an den fünf ersten Werten ausrichten. Falls die 19 UI-Stufen absichtlich erhalten bleiben sollen, sind sie als abweichende UI-Entscheidung mit Marc abzugleichen; die 16er-Kontaktbögen dürfen nicht als Nachweis für alle 19 Werte ausgegeben werden. Der Konverter selbst unterstützt die niedrigeren Werte bereits.

Beim paketbezogenen CTA die tatsächlich buchbare Zehnerstufe berücksichtigen: Der aktuelle `packageForDrones`-Helper wählt bei 195 Punkten noch SPARK als nächstgelegenen Bereich, während eine aufgerundete Buchung mit 200 Drohnen HORIZON ist. Diesen Grenzfall beim neuen Pakettext und seiner Farbe ausdrücklich abgleichen.
