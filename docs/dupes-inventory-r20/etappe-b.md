# Etappe B des Mehrfachpflege-Inventars

Basis `39b6ba7` (`origin/main`, 04.11.2026). Worktree `/tmp/fs-dupes-inventory-r20`, Branch `codex/dedupe-r20-b`. Keine .env, kein Push, Merge oder Deployment. Editor-/CLI-Läufe erhalten ausschließlich temporären AFE_STATE_DIR. Generierte Berichte liegen unter `/tmp/fs-dedupe-b-evidence`, nicht im Commit.

## Schritt 4

`business-facts.json` besitzt Antwortstunden, Anzahlung, Frühbucherrabatt, Haftpflicht-Bis-Betrag, Akku-Ökostromanteil, ungefähres Drohnengewicht, übliche maximale Flughöhe, bisherige Windstärke und den Show-Snapshot. Jeder Fakt führt Geltungsbereich, Stand, Quellenverweis und den Status einer bestehenden Aussage. Das ist keine neue Freigabe; insbesondere Indoor-Deckung, Wettergrenzen und Originalbelege bleiben fachlich offen.

Strukturierte Zahlenfelder verwenden `{fact, display}`. SHOWS_TOTAL, Hero, Zahlenraster, Antwortstationen und Rabatt lesen dieselbe Quelle. Prosa, Labels, Bios und die gemeinsamen Sicherheits-/Nachhaltigkeitsblöcke bleiben lesbar und unverändert. `site/business-facts` ist ein nativer AFE-Datensatz.

`node scripts/check-business-drift.mjs` prüft alle tatsächlichen Textblätter in Seiten und FAQ, DE/EN/NL. Der Bericht nennt Datei, Feldpfad, Text, Fakt, Ist und Soll. Überwacht werden Antwortfristen, Anzahlungen, Frühbucherrabatt, Haftpflicht, Ökostrom, Gewicht, übliche Flughöhe, Windstärke und Showstand. Historische Projektzahlen gehören nicht zum Organisationsstand. Die Stornostaffel ist ausdrücklich keine Anzahlung. Die Rundungen über/over/more than/ruim 150 bleiben erlaubt, solange sie unter dem datierten Gesamtstand liegen.

Mutationstests ändern jede zentrale Zahl und eine lokale Antwortfrist. Nach Marcs Freigabe vom 04.11. sind neue redaktionelle Faktenplatzhalter erlaubt. Die alte Mengen-Allowlist entfällt. `factText` und die Build-Inhaltsprüfung lehnen unbekannte Platzhalter in allen vier Sammlungen ab. Die vorhandenen Sicherheits-/Nachhaltigkeitsblöcke bleiben wegen der offenen T02-Entscheidung wortgleich und durch Driftwächter geschützt.

Prüfergebnisse werden nach dem vollständigen Schritt-Lauf ergänzt.

## Schritt 5a

Sechs native `person/*`-Datensätze unter `src/content/people/` besitzen Name, Porträt, Gründungsstatus und Reihenfolge. Teammitglieder verwenden `personId`, alle zwölf Blogdateien `authorId`. Faces, Team, Blogkopf/-abschluss und Blogübersicht lesen dieselben Personen. Die bisherigen Klarname-/Bildkopien in sechs Teamseiten und `components/people.ts` sind entfernt. Rollen, Bios und kontextuelle Bildbeschreibungen bleiben unverändert in den Sprachdateien. Direkte AFE-Marker öffnen Name beziehungsweise Porträt am gemeinsamen Besitzer; Personenänderungen brauchen kein fingiertes Übersetzungstripel.

Gezielt 13/13 Tests einschließlich echter Inhaltsschemas, ID-Auflösung, Änderungen an Name/Foto und AFE-Quelladressen. Build und i18n-Prüfung erfolgreich. Vergleich mit dem einmaligen `origin/main`-Build: 96 HTML-Dateien, keine Text-, Link-, SEO- oder Formularabweichungen. Die Zahl bezieht sich auf das aktuelle Werkzeug und diesen Build, nicht auf Claudes früheren HTML-Zählumfang.

## Schritt 5b

`site/project-facts` besitzt die historischen Drohnenzahlen, Daten, Kunden und Orte aller 19 Referenzen. Alle 57 Projektdateien verweisen strukturiert auf diesen Besitzer; Fallstudien-Credits, Drohnenkennzahlen und ausdrückliche Drohnenangaben in Prosa folgen ihm ebenfalls. Übersetzte Kunden-/Ortsnamen stehen als vorhandene DE/EN/NL-Werte beim Fakt, samt migrierter Provenienz. Die bisher getrennten Stammwerte und Showcase-Kopien entfallen. Karten, Referenzfilter und Fallstudien lösen dieselben Referenzen auf; die bereits ID-basierten LandingRefs benötigen keinen zweiten Katalog.

Die Timeline verknüpft fünf belegte Ereignisse mit Datum/Jahr beziehungsweise Drohnenzahl. `{{project.<id>.<field>[.<display>]}}` ergänzt explizite Prosa-Verweise, darunter datumsgenaue Credits und Timeline-Texte. Historische Pressetitel bleiben zitierte Originale. Der Musical-Monat Juni 2026 ist ein eigenes Ereignis neben dem Teaser vom 04.09.2025; 12.000 Drohneneinsätze ergeben sich dort aus 20 × 600. Für VW bleibt die Drohnenzahl bewusst leer. Die noch nicht zugeordneten Indoor-/E.ON-Ereignisse werden nicht aus ähnlich benannten Referenzen abgeleitet.

Guards prüfen sämtliche 57 Dateien, reale Schemas, unbekannte Referenzen, Mutationen von Zahl/Datum/Kunde/Ort und die native AFE-Adresse. Direkte Panelmarker an Karten-Drohnenzahl und Fallstudien-Credits/-Kennzahlen führen zum Faktenbesitzer. Gezielt 20/20 Tests bestanden; Build und i18n grün. Wieder 96 HTML-Dateien ohne Text- oder Vertragsabweichung zur Vergleichsbasis.

## Schritt 6a

`content/occasions.mjs` besitzt die getrennten Formular- und Referenztaxonomien sowie das ausdrückliche Konfigurator→Formular- und Referenz→Formular-Mapping. ContactForm, Referenzfilter, Projektschema, Konfigurator und API verwenden diese Quelle. Die alten Listen und sechs eingestreuten `anlass`-Werte sind entfernt. Die bisherige Zuordnung von Jubiläum und Kultur zu `sonstiges` bleibt erhalten. Unbekannte Konfigurator-IDs schlagen fehl; die Kategorien werden nicht aufgrund gleicher Beschriftungen zusammengelegt.

24/24 betroffene Tests grün, darunter sämtliche Formularanlässe am tatsächlichen API-Validator in DE/EN/NL. Build/i18n grün und 96 HTML-Dateien text- und vertragsgleich.

## Schritt 6b

`content/inquiry.mjs` besitzt Anfrage-Paket-/Extra-IDs, unveränderte Feld-/Body-/Mengenlimits und den URL-Builder/Parser. Paketkarten, Showkonfigurator und Extras verwenden denselben Builder; ContactForm und der tatsächliche API-Handler lesen dieselben Grenzen. Der alte clientseitige Vorbelegungsparser und die getrennten URL-Konstruktionen sind entfernt. Extra-Präsentation und Reihenfolge werden aus denselben IDs abgeleitet. Freitext bleibt eine begrenzte Plain-Text-Vorbelegung und verschwindet nach Übernahme aus der Browser-URL.

Die API behält Body-Streaminggrenze, Origin-Prüfung, Datei-/Mehrfachfeld-Abweisung, Zeitfalle, Kontrollzeichen-, Datums- und Turnstile-Prüfung, Timeouts, minimierte Metadaten sowie ihre bisherige syntaktische Extra-Abweisung. Insbesondere wird ihre akzeptierte Extra-Menge nicht still auf den UI-Katalog eingeschränkt.

29/29 gezielte Tests bestanden, einschließlich Sonderzeichen-/Extras-Roundtrips in DE/EN/NL und des tatsächlichen No-JS-303-Handlers. Build/i18n grün; alle 96 HTML-Dateien weiterhin text- und vertragsgleich. Die neue Playwright-Spec für echte Klicks und native Formularabgabe läuft einmal mit den übrigen betroffenen Specs am Endstand. Eine statische Site kann ohne JavaScript keine Query-Vorbelegung ausführen; der bestehende No-JS-Weg bleibt eine vollständig manuell ausfüllbare native Anfrage mit sprachgleicher Danke-Seite.
