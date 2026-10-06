# FlyingStars Referenz und Umsetzung mit Astro

Stand: 6. Oktober 2026.

Der von FlyingStars geteilte [Vercel-Prototyp](https://flyingstars-relaunch.vercel.app/) lässt sich mit unserer statischen Astro-Site umsetzen. Sein Aufbau besteht aus HTML, CSS und JavaScript. Die interaktiven Drohnenformationen verwenden Canvas, sodass dafür weder Next.js noch ein Vercel-Dienst notwendig ist. Unser aktuelles Template stellt Inhalte, Veröffentlichung und grundlegende Sections bereit. Die Gestaltung und die zusätzlichen Interaktionen müssen noch gebaut werden.

## Gestaltung

Die Referenz hat einen dunklen Hintergrund, große Headlines, Farbverläufe in Orange, Violett und Türkis sowie kleine technische Beschriftungen. Das Showreel nimmt den ersten Bildschirm ein. Projektvideos, Punktformationen und scrollabhängige Übergänge prägen die weiteren Abschnitte.

Unsere derzeitige Gestaltung ist ein beige-grünes Template mit Systemschrift und Platzhalterinhalten. Die 12 Section-Typen bilden eine Grundlage für den Aufbau, liefern diese Gestaltung aber noch nicht. Die Anpassung betrifft auch Navigation, Footer und Projektseiten, nicht nur Farben in der CSS-Datei.

## Vorhandene Bausteine und fehlende Funktionen

| Bereich | Aktueller Stand | Benötigte Erweiterung |
|---|---|---|
| Pakete, Ablauf, Vergleich, Team und Logos | Typisierte Sections vorhanden | Gestaltung und echte Inhalte einsetzen |
| FAQ und Blog | Collections, Listen und Detailrouten vorhanden | Kundentexte und Gestaltung übernehmen |
| Showreel | Hero unterstützt ein Bild | Videoquelle, Poster und Wiedergabeverhalten ergänzen |
| Anlässe und Kennzahlen | Allgemeine Text-Sections verfügbar | Eigene strukturierte Karten und Kennzahlen ergänzen |
| Projektseiten | Markdown, Titel, Cover und Metadaten | Video, Bildgalerie, Scrollstory und Formation ergänzen |
| Preisrechner | Statische Preiskarten | Berechnungsmodell, Regler, Paketauswahl und Formationsanzeige bauen |
| Anfrage | Name, E-Mail und Nachricht, Pages Function für Brevo | Datum, Ort, Anlass, Paket und Telefon ergänzen; Zweischrittführung optional |
| Mehrsprachigkeit | Eine deutsche Site-Konfiguration | Sprachrouten, Übersetzungen und hreflang ergänzen |

Die Ausgangspunkte im Repository sind [Content-Schemas](../src/content.config.ts), [SectionRenderer](../src/components/SectionRenderer.astro), [Hero](../src/components/sections/Hero.astro), [Projektseite](../src/pages/projekte/%5Bslug%5D.astro), [Kontaktformular](../src/components/sections/ContactForm.astro) und [Versand-Endpoint](../functions/api/contact.ts).

## Preisrechner und Projektinteraktionen

Der [Preisrechner der Referenz](https://flyingstars-relaunch.vercel.app/drohnenshow-preise/) kombiniert Preisberechnung und Drohnenvisualisierung. Eine echte Browserinteraktion wurde geprüft: Den Drohnenregler mit der Tastatur auf sein Maximum setzen. Bei 1.000 Drohnen zeigt er das Paket ODYSSEY und 104.200 € netto zuzüglich Anfahrt. Der Anfrage-Link enthält danach `?paket=ODYSSEY&drohnen=1000#anfrage`.

Für eigenen Text lädt der [Preisrechner-Code](https://flyingstars-relaunch.vercel.app/assets/pricing.js) einen separaten Formationsgenerator. Diese Textfunktion ist daher ein eigenes Entwicklungsmodul, nicht nur ein weiteres Eingabefeld. Die Preislogik sollte aus denselben strukturierten Paketdaten wie die Preiskarten entstehen. FlyingStars muss die Berechnungsregeln und Preisstufen fachlich bestätigen.

Die [Bokkenrijders-Projektseite](https://flyingstars-relaunch.vercel.app/musikalischer-teaser-bokkenrijders/) enthält einen Video-Hero, Kennzahlen, eine Scrollstory, Galerie und eine interaktive Formation aus einer Showdatei. Astro kann diese Funktionen als gezielt geladene Browsermodule ausliefern. Dafür brauchen wir die zugehörigen Medien und Formationsdaten sowie ein erweitertes Projektschema.

## Was der Prototyp noch nicht leistet

Das Anfrageformular der Referenz sendet keine Anfrage. Der [gemeinsame JavaScript-Code](https://flyingstars-relaunch.vercel.app/assets/site.js) verhindert das Absenden, blendet das Formular aus und zeigt eine Erfolgsmeldung. Unser Versand-Endpoint bietet dafür bereits die Grundlage. Ohne Brevo-Konfiguration ist auch bei uns noch keine Mailzustellung möglich.

EN und NL, mehrere Anlässe sowie rechtliche Links führen im Prototyp auf `#`. Diese Bereiche müssen mit tatsächlichen Seiten und Inhalten umgesetzt werden. Die sichtbaren Sprachschalter belegen keine fertige Mehrsprachigkeit.

## Performance und Barrierefreiheit

Die Referenz lädt Google Fonts und Medien von der bisherigen FlyingStars-Website. Unser [Netzwerk-Gate](../tests/network-allowlist.spec.ts) erlaubt ohne Nutzerinteraktion nur die eigene Origin und den konfigurierten Medienhost. Fonts sollten deshalb selbst gehostet und Medien über den vorgesehenen Speicher ausgeliefert werden.

Das bestehende [Lighthouse-Budget](../lighthouserc.json) setzt für die geprüften Seiten maximal 1 MB Transfergewicht. Ein ungeprüft übernommenes Showreel kann damit kollidieren. Videoformat, Poster, Ladezeitpunkt und mobile Auslieferung müssen gemeinsam entschieden werden. Formationsmodule sollten nur auf den betreffenden Seiten und bei Bedarf laden. Animationen brauchen eine brauchbare Darstellung bei reduzierter Bewegung; Preis und Anfrage müssen ohne Verständnis der Canvas-Grafik bedienbar bleiben.

Astro allein garantiert weder gute Ladezeiten noch barrierefreie Interaktionen. Die geprüfte Reglerinteraktion belegt die Preisaktualisierung der Referenz, keine vollständige Prüfung ihrer mobilen Bedienung oder Barrierefreiheit. Für unsere Umsetzung gehören diese Prüfungen zur Abnahme.

## Vorgeschlagene Umsetzung

1. **Gestaltung und Inhalte festlegen.** Die Referenz als Designrichtung verwenden, Sitemap und Texte mit Moritz abstimmen, Medien und Formationsdaten von FlyingStars übernehmen. Die bestehende Veröffentlichungslogik bleibt die Grundlage.
2. **Seiten und Bausteine erweitern.** Navigation, Footer, vorhandene Sections und Projektlayout gestalten. Fehlende Schemas und Komponenten in eigenen überprüfbaren PRs ergänzen. Der [Agent-Vertrag](../AGENTS.md) begrenzt routinemäßige Inhaltsaufträge bewusst auf bestehende Bausteine.
3. **Interaktionen fertigstellen.** Preisrechner mit bestätigten Regeln, optionale Textformation, Projektgalerien und Anfrageführung bauen. Neue Anfragefelder bis zur Brevo-Mail übertragen und tatsächliche Zustellung prüfen.
4. **Sprachen und Qualität abnehmen.** Übersetzungen, echte Sprachverknüpfungen und rechtliche Inhalte ergänzen. Die neuen Seiten gegen Tastaturbedienung, Mobilansicht, reduzierte Bewegung und die vorhandenen Qualitäts-Gates prüfen.

Ein Wechsel des Frameworks oder Hostings ist für diesen Umfang nicht erforderlich. Es handelt sich um eine Erweiterung unseres Gerüsts, nicht um eine bereits fertige Übernahme der Referenz.
