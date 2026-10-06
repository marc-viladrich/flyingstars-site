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

## Zweiter Pass (Opus, 6. Oktober 2026)

Verglichen wurden alle sechs Referenzseiten mit der Umsetzung: sichtbarer Text Zeile für Zeile, Kopfdaten, Vollseiten-Screenshots bei 1440 × 900 und 390 × 844 nebeneinander sowie die echte Bedienung von Rechner, Textformation, Übergabe ins Formular, Galerie und Pause. Texte, Preise, Paketlogik, Sections und Seitenhöhen stimmen bis auf wenige Pixel überein. Behoben wurden nur belegte Abweichungen und Mängel:

| Befund | Ursache | Behebung |
|---|---|---|
| Der globale Schalter „Bewegung pausieren“ lag fixiert unten links über dem Inhalt. Mobil verdeckte er den Preisregler, auf allen Cases die Kundenangabe der Credits, auf dem Desktop den Hinweis unter dem Textfeld des Rechners. | `position: fixed` ohne reservierten Platz | Runde Taste im Header neben „DE“ bzw. neben dem Menü, mit Pause-/Play-Symbol, gleichbleibendem Namen, `aria-pressed` und Tooltip. Der gewählte Zustand bleibt in der Sitzung beim Seitenwechsel erhalten. |
| Der Titel „Nächstes Projekt“ war mobil zu klein, z. B. „NFL BERLIN GAME“ einzeilig mit 35 statt 48 px. | `--chars` war die Länge des ganzen Namens, die Referenz nutzt das längste Wort (Berlin 6, Explorer 8). | gleiche Regel wie in der Referenz |
| In der Scrollstory waren alle vier Abschnitte gleich hell, das Bild links hatte keinen sichtbaren Bezug zum aktiven Text. | Die Referenz dimmt auf 28 % Deckkraft, was unter AA fällt; der Erstdurchlauf hatte das Dimmen deshalb komplett abgeschaltet. | Inaktive Abschnitte treten zurück, bleiben aber AA-konform: Überschrift 42 % (≥ 3:1 für große Schrift), Fließtext 74 % und Kennzeile 88 % (≥ 4,5:1 für alle vier Akzentfarben). Mobil bleibt alles voll sichtbar. |
| Seitentitel und Beschreibungen der Startseite und der Cases wichen von den Kundentexten der Referenz ab („PUMA \| FlyingStars“), die Startseite enthielt den Markennamen doppelt, `og:image` fehlte. | Titel und Zusammenfassung wurden für die Kopfdaten wiederverwendet. | Neues Pflichtfeld `showcase.meta` (Titel ≤ 70, Beschreibung 50–160 Zeichen) mit den Referenztexten. Die Bokkenrijders-Beschreibung (179 Zeichen) wurde ohne Faktenänderung auf 152 Zeichen gekürzt. Optionales `image` für Seiten; das Vorschaubild wird als JPEG über den gemeinsamen Medien-Helper erzeugt. |
| Auf Case-Seiten war „Projekte“ in der Navigation nicht markiert, die Referenz markiert es. | Nur exakter Pfadvergleich | Bereichsmarkierung mit `aria-current="true"` für Cases und `/projekte/*`, `page` bleibt der exakten Seite vorbehalten. |
| Wenn die Bewegung bereits pausiert war, blieb die Case-Formation leer („289 Drohnen erkannt“ ohne Punkte), und der Text am Himmel zeigte im Rechner nur die Maßlinien. Mit der seitenübergreifenden Pause wäre das häufig aufgetreten. Gefunden beim Durchsehen der Aufnahme. | Beide Module berücksichtigten nur ihre lokale Pause und reduzierte Bewegung, nicht die globale Pause. | Eine gemeinsame Bedingung `held()` zeigt bei jeder Pause das fertige Bild, wie es die lokale Pause im Rechner bereits tat. Die Case-Formation wird beim Laden und bei Größenänderungen fertig gezeichnet. |
| Ein im Rechner eingegebener Himmelstext ging bei der Anfrage verloren (auch in der Referenz). | Der Link übergab nur Paket und Drohnenzahl. | Die Anfrage-Links übergeben zusätzlich `text`. Ist das Nachrichtenfeld leer, steht dort „Text am Himmel: …“ als bearbeitbarer Entwurf. Zugewiesen wird nur über `value`, die Länge ist auf 60 Zeichen begrenzt. |

Geprüft und bewusst unverändert: Hero- und Projektkarten-Videos starten weiter erst auf Klick statt automatisch (Performance-Budget und Datenmenge). Die Referenz spielt die Projektkarten-Loops ab, sobald sie sichtbar sind. EN/NL, AGB und Cookie-Einstellungen waren in der Referenz `#`-Platzhalter und bleiben weggelassen. „Über uns“ und „Blog“ stehen nur im mobilen Menü und im Footer, wie in der Referenz im Footer. Die Übergabe Paket/Drohnenzahl entsprach bereits der Referenz.

`tests/reference-pass.spec.ts` sichert jeden dieser Punkte auf Desktop und Mobil: Treffertest an Regler, Textfeld, CTA und Credits am unteren Bildrand, Pause über Seitenwechsel, Referenztitel und `og:image`, Navigationsmarkierung, Wortlängen-Skalierung des Titels „Nächstes Projekt“ mit den `--chars`-Werten der Referenz, Übergabe des Himmelstexts, Dimmung der Scrollstory und sichtbare Formationen bei aktiver Pause. Dieser Test schlägt ohne die Korrektur mit 0 farbigen Pixeln fehl.
