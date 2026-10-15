# PR 2: Runtime-Injektion und Nachweise

Stand: 15.10.2026, Node 22.22.1. Arbeitsbasis `55469981b640f0f91aaa80da34ec081fcef02dce`, Worktree `afe/pr2`. Hauptcheckout und laufende Server auf 4542/4543/4544 wurden nicht verändert. Keine `.env`-Datei wurde gelesen, keine Dependency hinzugefügt und kein Inhalt unter `src/content` geändert.

## Baseline vor der ersten Änderung

24 Testdateien, exakt folgender Aufruf:

```sh
/opt/homebrew/opt/node@22/bin/node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs'
```

Ergebnis: **124 Tests, 123 bestanden, 1 fehlgeschlagen, 0 übersprungen**. Der vorhandene Test `Actual Astro source builds original scripts ...` scheiterte am Astro-Aufbau. Ein unmittelbar anschließender Lauf dieser unveränderten Testdatei mit dem bestehenden Offline-Modus bestand: **2 Tests, 2 bestanden**. Die Medien-Netzwerkabhängigkeit war bereits vor dieser Änderung vorhanden.

## Ergebnis mit Implementierung

```sh
FLYINGSTARS_OFFLINE_MEDIA=1 /opt/homebrew/opt/node@22/bin/node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs'
```

25 Testdateien: **141 Tests, 140 bestanden, 0 fehlgeschlagen, 1 übersprungen**. Die bestehenden Test-Assertions bleiben erhalten; ihre Fixtures übergeben jetzt Runtime und Site-Adapter explizit. Die zusätzliche Datei enthält 17 Tests einschließlich acht Startup-Unterfällen.

Ein abschließender Lauf der Auth-, Runtime- und Pipeline-Dateien bestätigt auch die API-Voreinstellungen des Deploy-Smoke-Einstiegs: **43 Tests, 42 bestanden, 0 fehlgeschlagen, 1 übersprungen**. Der API-Einstieg ohne Auth-Argument bleibt ohne Auth; der CLI-Einstieg aktiviert Auth standardmäßig.

Weitere Prüfungen:

- `npx astro check`: 0 Fehler, 0 Warnungen, 207 bestehende Hinweise.
- `FLYINGSTARS_OFFLINE_MEDIA=1 npx astro build`: 63 Seiten erfolgreich gebaut.
- JSDoc-Typprüfung des Runtime-Objekts mit der bereits installierten TypeScript-Version:
  `node node_modules/typescript/bin/tsc --ignoreConfig --allowJs --checkJs --noEmit --skipLibCheck --types node --module NodeNext --target ES2022 editor/runtime-options.mjs`.
- `git diff --check`: erfolgreich.
- Keine Änderungen an `src/content`, UI-Dateien, Dependencies oder geschützten CI-/Test-Konfigurationsdateien.

## Abdeckung der Akzeptanzkriterien

1. Der vollständige bestehende Testbestand besteht im vorhandenen Offline-Modus. Der Roh-Baselinefehler und die unterschiedliche Umgebung sind oben ausdrücklich dokumentiert.
2. Ein Kindprozess aus `/tmp` löst nur die übergebenen Optionen auf, verwendet diesen Worktree als Site, ein privates temporäres State-Verzeichnis und echte Konten. Beide Astro-Ausgaben werden aufgebaut. Der echte HTTP-Handler verweigert unangemeldeten Zugriff und liefert nach Authentifizierung `/editor/`, State und die Adapter-Browsermodule aus. **Der verlangte reale Socket-Nachweis bleibt offen:** Schon die Port-Ermittlung über einen Loopback-Listener wird hier mit `EPERM` verweigert. Der separate vollständige CLI-/Socket-Test überspringt ausschließlich bei `EPERM`/`EACCES`; alle anderen Fehler schlagen fehl. Er kann in einer Umgebung mit erlaubten Loopback-Sockets unverändert laufen.
3. Startup prüft State gleich/unter Source, State gleich/unter Public, Public unter State sowie Source/Public-Überlappungen. Zusätzliche Tests prüfen Symlinks, fehlende Nachfahren und einen lexikalisch im State liegenden Webroot-Symlink. Ablehnung erfolgt auf Deutsch vor Auth, Adapter, Schreibzugriffen und Listenern.
4. Der Grep-Test umfasst Store, Builder, Publisher, Preview, Git-Sync, Auth, native Medien, Upload-Normalisierung, native Übersetzung, Translation-Core und Provider. Keines dieser Module importiert direkt oder dynamisch aus `src/schemas` oder `src/lib`. Nur der FlyingStars-Adapter lädt diese Site-Module. Für diese Importgrenze gibt es keine verbleibende Ausnahme. Der exportierte Low-Level-Git-Helfer behält für CLI-/Test-Aufrufer eine aufrufzeitige Umgebungs-Voreinstellung; Runtime-Services verwenden durchgängig den explizit gebundenen Git-Snapshot.
5. `docs/deployment.md` und `docs/runtime-options.md` dokumentieren generische Namen, alle bisherigen Aliase, Defaults, Vorrang und Aufrufe aus anderen Arbeitsverzeichnissen.

## Übergabe und Grenzen

Die Sandbox verweigert das Anlegen von `source/.git/worktrees/afe-pr2/index.lock` trotz des für diese Aufgabe vorgesehenen Metadatenpfads. Deshalb konnten die Änderungen nicht im ursprünglichen Worktree committed werden. Die drei fokussierten Commits werden in einem unabhängigen temporären Klon derselben Basis vorbereitet und als `git format-patch`-Serie bereitgestellt. Jeder Commit endet mit `Co-Authored-By: Codex <noreply@openai.com>`. Es gibt keinen Push und keinen PR.

PR 3 übernimmt generische Source-Codecs und die transaktionale Registry hinter dem Legacy-Adapter: Shared-File-Locator, Ganzdatei-Konfliktschutz und quelltreue No-op-/Edit-Roundtrips. Store-Referenzregeln, Paketlogik, Browser-Heuristiken und Übersetzungs-ID-Migration bleiben bei den späteren Architektur-PRs. Dieser PR verschiebt keine Runtime-Logik ins Produktrepository und behauptet keine zweite Site-Adoption.
