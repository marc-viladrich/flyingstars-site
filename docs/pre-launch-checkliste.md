# Pre-Launch-Checkliste

Punkte, die vor dem Umschalten auf die neue Website erledigt sein müssen. Inhaltliche Lücken (Texte, Fakten, Freigaben durch FlyingStars) stehen in [inhalte-luecken.md](inhalte-luecken.md); hier stehen technische und gestalterische Punkte.

## Barrierefreiheit

- [ ] **Reflow bei großer Browserschrift (Marc, 03.11.2026).** Seit der rem-Umstellung (Runde 19) wächst der Text mit der Schriftgröße-Einstellung des Browsers. Bei 320 px Breite und normaler Schrift scrollt keine Seite mehr seitlich (WCAG 1.4.10 erfüllt). Bei 150 % Browserschrift (24 px) auf einem 390-px-Handy laufen noch aus, gemessen am 03.11.2026 in Chromium per CDP `Page.setFontSizes`:
  - Startseite +16 px, Preise +76 px, Hochzeit +51 px, Marken & Werbung +82 px, Über uns +62 px, FAQ +20 px
  - Verursacher: Paketkarten (Name, Preis, Pill nebeneinander), Konfigurator-Bühne und -Panel, Paket-Knöpfe im Konfigurator-Teaser, Zeitstrahl-Einträge, Team-Raster, FAQ-Kopf
  - Bei 125 % (20 px) bleibt nur Marken & Werbung mit +4 px (Paket-Knöpfe im Teaser).
  - Prüfen: Playwright mit Viewport 390, per CDP `Page.setFontSizes({ fontSizes: { standard: 24 } })` (nicht per `html { font-size }`, darauf reagieren die em-Media-Queries nicht), je Seite `scrollWidth - innerWidth`. Diese Prüfung als Regel in `scripts/layout-audit.mjs` aufnehmen, dann die Raster auf `min(…, 100%)`-Spalten bzw. Umbruch umstellen.
- [ ] 200 % Zoom und 400 % Reflow einmal von Hand in Safari und Chrome durchgehen (Navigation, Formular, Konfigurator).
