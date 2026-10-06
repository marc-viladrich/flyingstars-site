# FlyingStars: Umsetzung der Kundenreferenz

Stand: 6. Oktober 2026. Marc hat den vollständigen Erstdurchlauf der [geteilten Vercel-Referenz](https://flyingstars-relaunch.vercel.app/) einschließlich neuer Komponenten, Schemas und Qualitätssicherung beauftragt. Der spätere Opus-Lauf dient als zweiter Pass. Die Veröffentlichung braucht weiterhin den menschlichen PR-Merge.

## Umfang

Die sechs erreichbaren Referenzseiten sind in Astro umgesetzt: Startseite, `/drohnenshow-preise/` und die vier Cases Bokkenrijders, NFL Berlin Game, Ford Explorer und PUMA. Die vorhandenen Blog-, FAQ-, Kontakt- und Projekt-Routen bleiben nutzbar. Projekt-Aliasse unter `/projekte/` setzen die kanonische URL auf den jeweiligen Referenzpfad.

Die Startseite verwendet typisierte Sections für Video-Hero, Anlässe, Kennzahlen, Nachhaltigkeit und die bestehenden Pakete, Schritte, Vergleiche, Team, Logos, Projekte, FAQ und Anfrage. Case-Inhalte liegen als strukturierte Projektdaten vor; ein gemeinsames Layout rendert Videos, Scrollstory, Galerie, Formationsanzeige, Setlist und den nächsten Case. Das Anfrageformular überträgt Anlass, Datum, Ort, Paket, Drohnenzahl, Telefon und Nachricht bis zur vorhandenen Brevo-Function.

Der Preisrechner übernimmt die Preisregeln der Referenz aus gemeinsamen Paketdaten. 100 Drohnen ergeben SPARK / 7.900 €, 160 HORIZON / 15.900 €, 300 ODYSSEY / 34.900 € und 1.000 ODYSSEY / 104.200 €, jeweils netto zuzüglich Anfahrt. Die Textformation lädt ihren Planer erst bei eigener Texteingabe; Herzgeometrie wird separat geladen. Die Simulation ersetzt keine technische Flugplanung.

## Bewusste Anpassungen

Videos starten auf Klick. Das hält das bestehende 1-MB-Budget für den ersten Seitenaufruf ein. Die feste Medienregistrierung in `src/lib/videos.ts` und `functions/api/media.ts` streamt nur die fünf bekannten Kundenvideos über dieselbe Origin und unterstützt Range-Anfragen. Kundendateien bleiben außerhalb von Git; Astro erzeugt lokale optimierte Bildvarianten beim Build. Fonts werden einschließlich Lizenz lokal ausgeliefert. Formationsdaten der Referenz liegen als lokale JSON-Dateien vor und laden auf den Case-Seiten erst beim Annähern an die Darstellung.

Die deutschen Inhalte sind vorhanden. EN/NL und mehrere Legal-/Anlasslinks der Referenz waren `#`-Platzhalter. Die Umsetzung bietet echte Anfrage- und Seitenlinks; Sprachversionen werden erst nach Übersetzung ergänzt. Rechtliche Seiten verweisen auf die bestehende FlyingStars-Website und benötigen vor einer endgültigen Domain-Veröffentlichung die vom Kunden freigegebenen Texte.

Brevo bleibt auf Marcs Wunsch unkonfiguriert. Ohne die drei Versandwerte bestätigt das Formular ausdrücklich, dass nichts gesendet oder gespeichert wurde; Eingaben bleiben erhalten. Die tatsächliche Mailzustellung wird erst bei der späteren Brevo-Einrichtung geprüft. Die statische Danke-Seite ist derzeit für diesen Zustand formuliert und muss dabei ebenfalls aktualisiert werden.

## Gemeinsame Bedienung und Prüfungen

Ein globaler Pausenschalter erreicht die gemeinsamen Effekte und beide Formationsmodule. Zusätzlich stehen lokale Pausen-/Replay-Tasten und eine statische Darstellung bei reduzierter Bewegung zur Verfügung. Die Galerie ist per Tastatur scrollbar; das mobile Menü verwendet einen nativen Dialog mit Fokus-Rückgabe. Schriftkontraste und Überschriften wurden gegen die bestehenden Gates geprüft.

`npm run gates` prüft Astro, Build, Node-Tests und Desktop/Mobil-Browsertests. Die vorhandenen axe-, HTML-, Netzwerk- und Veröffentlichungsprüfungen bleiben aktiv. Zusätzliche Tests sichern Paketgrenzen, Textplanung im gebauten Bundle, echte Formationsdaten, Tastaturgalerie, globale Pause und die vollständigen Anfragefelder. `lhci autorun` prüft das unveränderte Performancebudget. Der Offline-Linkcheck löst Verzeichnislinks über `--index-files index.html` auf, damit er Anker wie `/#anfrage` in der erzeugten Startseite prüft ([Lychee-Dokumentation](https://lychee.cli.rs/guides/cli/#--index-files)). Der Medienproxy wird zusätzlich in der tatsächlichen Cloudflare-Pages-Laufzeit geprüft.

## Quellen

Gestaltung, Texte, Preislogik, Formationsgeometrie und Bilder stammen aus der von FlyingStars geteilten Referenz und ihrer bestehenden Website. Der portierte Browsercode ist in den jeweiligen Dateien gekennzeichnet. Fontlizenzen liegen in `public/fonts/`. Vor Produktion müssen FlyingStars die übernommenen Preise, Leistungsversprechen, Nutzungsrechte und rechtlichen Inhalte freigeben.
