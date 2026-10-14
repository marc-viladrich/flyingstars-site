# Deployment auf Hetzner Webhosting L

Site, Editor, Tests und Deploy-Hooks liegen in einem Repository. Apache liefert nur die statische öffentliche Ausgabe aus. Eine private Node-App auf einer eigenen Subdomain betreibt den Editor. SSH und Node 22 reichen; Root, Docker und eine Datenbank sind nicht vorgesehen.

```text
Entwickler → PR → CI → main → Deploy-Hook → Host
                          ↳ Smoke-Test → Astro-Build → Webroot → Editor-Neustart

Redaktion → Speichern → content/draft → asynchroner Push nach GitHub
                     → Freigeben → fetch/rebase → main → Build → Webroot
```

## Git und Freigabe

GitHub `main` enthält den verbindlichen Code und die freigegebenen Inhalte. Der Host-Klon steht auf `content/draft`. Speichern erzeugt einen lokalen Commit und stößt einen Push an. Ein Remoteausfall verhindert keinen Save; die Queue versucht es erneut, mit wachsendem Abstand bis maximal 60 Sekunden. Nach einem Neustart nimmt sie die noch vorhandenen Git-Commits wieder auf. `/editor/api/state` liefert `sync.enabled`, `pending`, `lastError` und `lastPushedAt`. Die Zeitangabe gilt für den laufenden Prozess.

`FLYINGSTARS_GIT_REMOTE` benennt einen eingerichteten Remote, standardmäßig `origin`. Ohne Remote ist Sync aus; `off` schaltet ihn ausdrücklich ab. Es gibt einen schreibenden Host. Fremde Commits auf dem entfernten Entwurfsbranch verlangen eine manuelle Zusammenführung. Nach einem Rebase darf die Queue den alten Entwurf nur mit einem exakt geprüften `--force-with-lease` ersetzen. `main` wird immer ohne Force-Push vorgeschoben.

Freigeben prüft den zuvor angesehenen Draft- und main-Stand, holt den Remote und rebasiert bei Bedarf auf `origin/main`. Ein Rebase läuft in einem isolierten Worktree. Bei Konflikt bleibt der Editor-Klon unverändert und die API antwortet mit HTTP 409 und einer deutschen Erklärung. Der gesamte Entwurf wird freigegeben, keine einzelne Seite.

Der Publisher baut den Kandidaten bereits vor dem Push auf main. Diese bewusste Abweichung von einer reinen Push-dann-Build-Reihenfolge erhält die bisherige Zusage: Ein Buildfehler veröffentlicht keinen neuen main-Stand. Nach erfolgreichem Build folgen Push, lokaler main-Ref und Aktivierung. Scheitert nur die Aktivierung nach dem Push, kann dieselbe Freigabe erneut ausgeführt werden.

## Gemeinsame CI und Host-Hook

`ci.yml` läuft auf allen Pushes und PRs mit Node 22, installiert mit `npm ci` und ruft `npm run ci` auf. Derselbe Einstieg `editor/ci/check.mjs` läuft im Offline-Nachweis: Astro check, sämtliche Editor- und Site-Unit-Tests, Astro-Build mit `FLYINGSTARS_OFFLINE_MEDIA=1`. Die bisherigen Browser-, Link- und Lighthouse-Gates folgen in GitHub. Der E2E-Test ruft die CI in einer Testkopie auf; nur dieser äußere Pipeline-Test wird im inneren Lauf ausgelassen, um Rekursion zu verhindern.

`deploy-hetzner.yml` startet nach erfolgreicher Push-CI auf main oder manuell. Beide Wege prüfen eine erfolgreiche CI für den aktuellen main-Commit. SSH übergibt diesen Hash; ist main bis zum Fetch weitergelaufen, bricht der Hook ab. Deployments werden in Actions und durch den Dateilock des Editors serialisiert.

`editor/deploy/host-update.mjs` holt GitHub, prüft einen sauberen Host-Klon und bereitet den Rebase isoliert vor. Bei geändertem Lockfile installiert er in der isolierten Arbeitskopie `npm ci --omit=dev`; sonst nutzt er die vorhandenen Dependencies. Astro, Sitemap, YAML, Zod, marked und sharp sind Runtime-Dependencies, damit der Host selbst bauen kann. Der neue Editor wird mit `node --check` und einer echten Handler-Anfrage ohne Socket geprüft. Erst ein erfolgreicher öffentlicher Build für origin/main bewegt den Host-Klon und aktiviert die Ausgabe. Danach führt der Hook `DEPLOY_RESTART_CMD` aus. Ein fehlgeschlagener Build oder Rebase verändert weder den Klon noch den aktiven Public-Release.

Save, Publish und Deploy teilen sich `.git/flyingstars-operation.lock`. Der Push hält diesen Lock nur für kurze lokale Snapshots, niemals während einer Netzwerkanfrage. Nach einem hart abgebrochenen Prozess kann ein Lock zurückbleiben. Seine PID prüfen und ihn erst entfernen, wenn der Besitzer sicher nicht mehr läuft. Ein Neustartbefehl muss den Neustart anstoßen und zurückkehren; wartet er auf einen neuen Editor-Save, entsteht ein Lock-Timeout.

## Pfade und öffentliche Aktivierung

| Einstellung | Bedeutung |
|---|---|
| `FLYINGSTARS_STATE_DIR` | Absoluter privater Ordner außerhalb des Klons und jedes Webroots |
| `FLYINGSTARS_PUBLIC_WEBROOT` | Apache-Verzeichnis der öffentlichen Domain; nur statische Ausgabe |
| `EDITOR_ORIGIN` | HTTPS-Origin der privaten Editor-Subdomain, ohne Pfad |
| `SITE_URL` | Origin der öffentlichen Site, für Canonical und Sitemap |
| `PORT` oder `RELAUNCH_PORT` | Listener-Port gemäß konsoleH-Konfiguration |
| `RELAUNCH_PREVIEW=0` | Ein permanenter Node-Prozess; keine zusätzliche Astro-dev-Vorschau |
| `DEPLOY_RESTART_CMD` | Auf dem Account geprüfter Neustartbefehl |

Im State-Ordner liegen `runtime/`, `runtime-public/`, `preview/`, `runtime-private/editor-accounts.json` und `translation-memory.json`. Konten und State brauchen eigene private Backups; Git sichert Inhalte und die hochgeladenen Medienbytes, nicht Passwörter oder den Übersetzungsspeicher.

Ist `FLYINGSTARS_PUBLIC_WEBROOT` gesetzt, wird jeder vollständige Public-Release in einen Geschwisterordner kopiert und der Webroot-Symlink per Rename gewechselt. `<webroot>.previous` hält die vorige Ausgabe. Beim ersten Wechsel eines bestehenden echten Verzeichnisses wird es in einen Geschwisterordner verschoben und `.previous` darauf verlinkt; dabei ist eine kurze Lücke möglich. Deshalb den Webroot vor dem ersten Produktivstart als Symlink einrichten. Apache-Symlinkrechte müssen am Account geprüft werden. Alte Release-Ordner und Runtime-Artefakte erst bereinigen, wenn sie weder aktiv noch für den Rückweg vorgesehen sind.

Ohne Webroot-Variable bleibt die bisherige lokale Simulation. Ohne State-Variable bleibt auf Marcs Mac der bestehende Ordner `relaunch/` die Zustandsablage. Die lokalen Befehle bleiben gleich:

```sh
/opt/homebrew/opt/node@22/bin/node relaunch/server.mjs
/opt/homebrew/opt/node@22/bin/node relaunch/manage-accounts.mjs list
/opt/homebrew/opt/node@22/bin/node relaunch/translate-missing.mjs --locale en --dry-run
/opt/homebrew/opt/node@22/bin/node relaunch/hosting-probe.mjs --build relaunch/source
/opt/homebrew/opt/node@22/bin/node --test *.test.mjs relaunch/*.test.mjs relaunch/source/src/schemas/editorial-source.test.mjs
```

Die Implementierungen und Browserdateien liegen unter `editor/`; `relaunch/*.mjs` sind Weiterleitungen, `relaunch/web` ist ein Symlink. Weitere UI-Arbeit gehört nach `relaunch/source/editor/web/`.

## Einmalige Einrichtung durch Marc

1. GitHub-Repository wählen und die lokale Implementierung über einen normalen PR nach main übernehmen. Es wurde hier nichts zu einem echten Remote gepusht. `main` muss direkte Fast-forward-Pushes des redaktionellen Host-Schlüssels erlauben; ein zwingender PR-only-Schutz für diesen Schlüssel verhindert die Editor-Freigabe.
2. GitHub-Environment `production` einrichten. Secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_PATH`. `DEPLOY_PATH` ist der absolute private Klonpfad. Den Host-Key unabhängig prüfen; die Action benutzt kein automatisches Vertrauen via ssh-keyscan.
3. Den Actions-SSH-Schlüssel für den Webhosting-Nutzer hinterlegen. Einen separaten GitHub-Deploy-Key mit Schreibzugriff für den Host einrichten, damit er fetch und die Pushes nach content/draft und main ausführen kann. GitHub-Host-Key und SSH-Konfiguration am Account prüfen. Schlüssel bleiben außerhalb des Klons.
4. Node 22 ab 22.12, Git und npm auf dem Account prüfen. `node editor/hosting-probe.mjs --build <klon>` misst die tatsächlichen Rechte und Ressourcen. Erster Clone außerhalb `public_html`, `npm ci --omit=dev`, `git switch -c content/draft origin/main`. Falls es bereits einen Remote-Entwurf gibt, diesen bewusst als Startstand wählen.
5. Private State-Ablage und öffentlichen Apache-Webroot einrichten. Die öffentliche Domain bleibt eine statische Apache-Domain. Die Editor-Subdomain wird in konsoleH als Node-App mit Arbeitsverzeichnis `<klon>`, Startskript `editor/server.mjs`, HTTPS, Logdatei, Node-Version und geeignetem Speicherlimit eingerichtet. `EDITOR_AUTH=on`, `EDITOR_ORIGIN`, `SITE_URL`, State-, Webroot- und Portvariablen setzen. Für den Anfang `RELAUNCH_PREVIEW=0`.
6. Mit `node editor/manage-accounts.mjs add marc --name "Marc Viladrich" --email hey@marcviladrich.com` ein Konto im privaten State anlegen. Das Passwort wird im Terminal abgefragt.
7. Unter `$HOME/.config/flyingstars/deploy-config.sh` mit Modus 600 dieselben öffentlichen Origins, Pfade, Node-PATH, nötige Buildvariablen und `DEPLOY_RESTART_CMD` als Shell-Exports eintragen. Die SSH-Action lädt diese private Datei; konsoleH-Umgebungsvariablen werden nicht automatisch an eine SSH-Sitzung vererbt. Kein `.env` im Klon nötig.
8. Neustart am echten Account prüfen, dann `node editor/deploy/host-update.mjs` und anschließend eine reale Code-PR sowie Save/Freigabe testen. Kandidaten für den Neustart sind ein von Hetzner bestätigter konsoleH-Automationsweg, ein bestätigter Restart-Dateitrigger oder das Beenden des eigenen Node-Prozesses bei belegtem Supervisor-Neustart. Keiner dieser Wege ist hier verifiziert; keinen davon ungeprüft als Produktionsbefehl eintragen.

`deploy-cloudflare-preview.yml` ersetzt das frühere automatische `deploy.yml`. Es läuft ausschließlich per `workflow_dispatch` und ist ein optionaler manueller Preview-Weg. Der automatische Produktionsweg ist Hetzner. `agent.yml` und `content-intake.yml` öffnen weiterhin PRs gegen main.

## Nachweis und Rückweg

`node --test editor/test/pipeline-e2e.test.mjs` baut offline ein lokales bare `github.git`, einen Entwicklerklon und einen Host-Klon mit eigenem State. Geprüft werden CI, echte Produktionsinstallation aus dem npm-Cache, Code-Deploy und Neustartmarker, Save-Push, Freigabe bis ins öffentliche HTML, Rebase mit unveröffentlichtem Inhalt, Konflikt mit unverändertem Klon und weiter antwortendem Handler sowie Buildfehler ohne Aktivierung. Gesonderte Sync-Tests prüfen langsame Pushes und Retry. Es wird kein echter Remote verwendet.

Nicht lokal belegbar sind GitHub-Secrets und tatsächliche Action-Ausführung, SSH/TLS/DNS am Account, konsoleH-Proxy und Neustart, Apache-Symlinkrechte, Ressourcenlimit und echte Medienabrufe. Die bisherigen Browser-/Lighthouse-Gates werden im Offline-E2E nicht ausgeführt.

Für einen Code-Rollback den problematischen main-Commit durch `git revert` in einem PR zurücknehmen, CI abwarten und Deployment erneut starten. Der Rebase erhält die noch unveröffentlichten Inhalte. Bei inhaltlichem Konflikt zuerst manuell zusammenführen. Für einen sofortigen öffentlichen Rückweg den Webroot unter demselben Repository-Lock atomar auf das Ziel von `<webroot>.previous` zurückschalten; die unveränderlichen Artefakte in `runtime-public/<hash>/site` bleiben verfügbar. Ein öffentlicher Rückweg allein setzt Editorcode und main nicht zurück.
