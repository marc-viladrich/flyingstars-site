# Etappe B des Mehrfachpflege-Inventars

Basis `39b6ba7` (`origin/main`, 04.11.2026). Worktree `/tmp/fs-dupes-inventory-r20`, Branch `codex/dedupe-r20-b`. Keine .env, kein Push, Merge oder Deployment. Editor-/CLI-Läufe erhalten ausschließlich temporären AFE_STATE_DIR. Generierte Berichte liegen unter `/tmp/fs-dedupe-b-evidence`, nicht im Commit.

## Schritt 4

`business-facts.json` besitzt Antwortstunden, Anzahlung, Frühbucherrabatt, Haftpflicht-Bis-Betrag, Akku-Ökostromanteil, ungefähres Drohnengewicht, übliche maximale Flughöhe, bisherige Windstärke und den Show-Snapshot. Jeder Fakt führt Geltungsbereich, Stand, Quellenverweis und den Status einer bestehenden Aussage. Das ist keine neue Freigabe; insbesondere Indoor-Deckung, Wettergrenzen und Originalbelege bleiben fachlich offen.

Strukturierte Zahlenfelder verwenden `{fact, display}`. SHOWS_TOTAL, Hero, Zahlenraster, Antwortstationen und Rabatt lesen dieselbe Quelle. Prosa, Labels, Bios und die gemeinsamen Sicherheits-/Nachhaltigkeitsblöcke bleiben lesbar und unverändert. `site/business-facts` ist ein nativer AFE-Datensatz.

`node scripts/check-business-drift.mjs` prüft alle tatsächlichen Textblätter in Seiten und FAQ, DE/EN/NL. Der Bericht nennt Datei, Feldpfad, Text, Fakt, Ist und Soll. Überwacht werden Antwortfristen, Anzahlungen, Frühbucherrabatt, Haftpflicht, Ökostrom, Gewicht, übliche Flughöhe, Windstärke und Showstand. Historische Projektzahlen gehören nicht zum Organisationsstand. Die Stornostaffel ist ausdrücklich keine Anzahlung. Die Rundungen über/over/more than/ruim 150 bleiben erlaubt, solange sie unter dem datierten Gesamtstand liegen.

Mutationstests ändern jede zentrale Zahl und eine lokale Antwortfrist. Nach Marcs Freigabe vom 04.11. sind neue redaktionelle Faktenplatzhalter erlaubt. Die alte Mengen-Allowlist entfällt. `factText` und die Build-Inhaltsprüfung lehnen unbekannte Platzhalter in allen vier Sammlungen ab. Die vorhandenen Sicherheits-/Nachhaltigkeitsblöcke bleiben wegen der offenen T02-Entscheidung wortgleich und durch Driftwächter geschützt.

Prüfergebnisse werden nach dem vollständigen Schritt-Lauf ergänzt.
