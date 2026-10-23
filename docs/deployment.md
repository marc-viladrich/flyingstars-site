# Deployment auf Hetzner Webhosting L

Site, Editor, Tests und Deploy-Hooks liegen in einem Repository. Apache liefert nur die statische öffentliche Ausgabe aus. Eine private Node-App auf einer eigenen Subdomain betreibt den Editor. SSH und Node 24 (ab 24.15, wegen `node:sqlite` für die Konten) reichen; Root, Docker und eine Datenbank sind nicht vorgesehen.

```text
Entwickler → PR → CI → main → Deploy-Hook → Host
                          ↳ Smoke-Test → Astro-Build → Webroot → Editor-Neustart

Redaktion → Speichern → content/draft → asynchroner Push nach GitHub
                     → Freigeben → fetch/rebase → main → Build → Webroot
```

## Git und Freigabe

GitHub `main` enthält den verbindlichen Code und die freigegebenen Inhalte. Der Host-Klon steht auf `content/draft`. Speichern erzeugt einen lokalen Commit und stößt einen Push an. Ein Remoteausfall verhindert keinen Save; die Queue versucht es erneut, mit wachsendem Abstand bis maximal 60 Sekunden. Nach einem Neustart nimmt sie die noch vorhandenen Git-Commits wieder auf. `/editor/api/state` liefert `sync.enabled`, `pending`, `lastError` und `lastPushedAt`. Die Zeitangabe gilt für den laufenden Prozess.

`AFE_GIT_REMOTE`, bisher `FLYINGSTARS_GIT_REMOTE`, benennt den Remote, an den der Editor Inhalte pusht; auf dem Host `AFE_GIT_REMOTE=origin` in der Node-App-Konfiguration setzen. Ohne die Variable ist Sync aus (bewusst: eine Entwicklerkopie mit fremdem `origin` bekommt nie versehentlich Inhalts-Pushes); `off` schaltet ihn ausdrücklich ab. Es gibt einen schreibenden Host. Fremde Commits auf dem entfernten Entwurfsbranch verlangen eine manuelle Zusammenführung. Nach einem Rebase darf die Queue den alten Entwurf nur mit einem exakt geprüften `--force-with-lease` ersetzen. `main` wird immer ohne Force-Push vorgeschoben.

Freigeben prüft den zuvor angesehenen Draft- und main-Stand, holt den Remote und rebasiert bei Bedarf auf `origin/main`. Ein Rebase läuft in einem isolierten Worktree. Bei Konflikt bleibt der Editor-Klon unverändert und die API antwortet mit HTTP 409 und einer deutschen Erklärung. Der gesamte Entwurf wird freigegeben, keine einzelne Seite.

Der Publisher baut den Kandidaten bereits vor dem Push auf main. Diese bewusste Abweichung von einer reinen Push-dann-Build-Reihenfolge erhält die bisherige Zusage: Ein Buildfehler veröffentlicht keinen neuen main-Stand. Nach erfolgreichem Build folgen Push, lokaler main-Ref und Aktivierung. Scheitert nur die Aktivierung nach dem Push, kann dieselbe Freigabe erneut ausgeführt werden.

## Gemeinsame CI und Host-Hook

`ci.yml` läuft auf allen Pushes und PRs mit der Node-Version aus `.nvmrc` (24), installiert mit `npm ci` und ruft `npm run ci` auf. Derselbe Einstieg `editor/ci/check.mjs` läuft im Offline-Nachweis: Astro check, sämtliche Editor- und Site-Unit-Tests, Astro-Build mit `FLYINGSTARS_OFFLINE_MEDIA=1`. Die bisherigen Browser-, Link- und Lighthouse-Gates folgen in GitHub. Der E2E-Test ruft die CI in einer Testkopie auf; nur dieser äußere Pipeline-Test wird im inneren Lauf ausgelassen, um Rekursion zu verhindern.

### Editor-Paket und laufende Updates

Der Editor ist ein eigenes, privates Repository (`marc-viladrich/astro-frontend-editor`). Ein Tag `vX.Y.Z` dort veröffentlicht das Paket nach grünen Tests auf GitHub Packages. Diese Seite installiert es per Alias (`astro-frontend-editor` → `@marc-viladrich/astro-frontend-editor`); Code-Importe bleiben unverändert.

Lesen darf das Paket ein klassisches GitHub-Token mit nur `read:packages`. Es liegt an drei Stellen: als Actions-Secret und als Dependabot-Secret `PACKAGES_READ_TOKEN` dieses Repos sowie in `~/.npmrc` auf jedem Rechner und Host, der `npm ci` ausführt. Das Skript `scripts/connect-site.sh <owner/repo>` im Editor-Repo setzt alle drei in einem Schritt.

Dependabot (`.github/dependabot.yml`) schlägt montags gebündelte Minor- und Patch-Updates vor, Actions monatlich, neue Editor-Versionen ebenfalls. Jeder dieser PRs läuft durch `ci.yml`; gemergt wird von Hand. Node selbst aktualisiert Dependabot nicht: `.nvmrc` (24) gibt die Hauptversion vor, CI und Host nehmen die aktuelle 24.x.

`deploy-hetzner.yml` startet nach erfolgreicher Push-CI auf main oder manuell. Beide Wege prüfen eine erfolgreiche CI für den aktuellen main-Commit. SSH übergibt diesen Hash; ist main bis zum Fetch weitergelaufen, bricht der Hook ab. Deployments werden in Actions und durch den Dateilock des Editors serialisiert.

`editor/deploy/host-update.mjs` holt GitHub, prüft einen sauberen Host-Klon und bereitet den Rebase isoliert vor. Bei geändertem Lockfile installiert er in der isolierten Arbeitskopie `npm ci --omit=dev`; sonst nutzt er die vorhandenen Dependencies. Astro, Sitemap, YAML, Zod, marked und sharp sind Runtime-Dependencies, damit der Host selbst bauen kann. Der neue Editor wird mit `node --check` (Launcher `editor/server.mjs` des Kandidaten) und einer echten Handler-Anfrage ohne Socket (`editor/deploy/handler-smoke.mjs` des Kandidaten, die das Editor-Paket aus dessen `node_modules` lädt) geprüft. Die Ablauflogik selbst liegt im Paket (`hostUpdate` aus `astro-frontend-editor/runtime`); `editor/deploy/host-update.mjs` übergibt nur Adapter, Kompatibilitätsnamen und diese Prüfschritte. Erst ein erfolgreicher öffentlicher Build für origin/main bewegt den Host-Klon und aktiviert die Ausgabe. Danach führt der Hook `DEPLOY_RESTART_CMD` aus. Ein fehlgeschlagener Build oder Rebase verändert weder den Klon noch den aktiven Public-Release.

Save, Publish und Deploy teilen sich `.git/flyingstars-operation.lock`. Der Push hält diesen Lock nur für kurze lokale Snapshots, niemals während einer Netzwerkanfrage. Nach einem hart abgebrochenen Prozess kann ein Lock zurückbleiben. Seine PID prüfen und ihn erst entfernen, wenn der Besitzer sicher nicht mehr läuft. Ein Neustartbefehl muss den Neustart anstoßen und zurückkehren; wartet er auf einen neuen Editor-Save, entsteht ein Lock-Timeout.

## Pfade und öffentliche Aktivierung

Die vollständige Variablen- und CLI-Tabelle mit Defaults steht in [Runtime-Optionen](runtime-options.md). Die neuen `AFE_*`-Namen haben Vorrang; alle bisherigen `FLYINGSTARS_*`, `EDITOR_*`, `RELAUNCH_*`, `PORT` und `SITE_URL` bleiben als deprecated Aliase verfügbar, soweit ein neuer Name existiert.

| Einstellung | Bisheriger Alias | Bedeutung |
|---|---|---|
| `AFE_SITE_ROOT` | keiner | Site-Klon; ohne Angabe das Arbeitsverzeichnis |
| `AFE_STATE_DIR` | `FLYINGSTARS_STATE_DIR` | Privater Ordner außerhalb des Klons und jedes Webroots |
| `AFE_PUBLIC_WEBROOT` | `FLYINGSTARS_PUBLIC_WEBROOT` | Apache-Verzeichnis der öffentlichen Domain |
| `AFE_EDITOR_ORIGIN` | `EDITOR_ORIGIN` | HTTPS-Origin der privaten Editor-Subdomain, ohne Pfad |
| `AFE_CANONICAL_ORIGIN` | `SITE_URL` | Origin der öffentlichen Site für Canonical und Sitemap |
| `AFE_PORT` | `PORT`, `RELAUNCH_PORT` | Listener-Port gemäß konsoleH-Konfiguration |
| `AFE_GIT_REMOTE` | `FLYINGSTARS_GIT_REMOTE` | Expliziter Remote für Inhalts-Pushes |
| `AFE_DRAFT_BRANCH` / `AFE_PUBLISHED_BRANCH` | keine | `content/draft` / `main` |
| `AFE_UPLOAD_REMOTE` / `AFE_LIVE_URL` | keine | Entwicklerrechner: lokal freigeben, dann von Hand hochladen (siehe unten) |
| `AFE_AUTH` / `AFE_ACCOUNTS` | `EDITOR_AUTH` / `EDITOR_ACCOUNTS` | Anmeldung und private Kontodatei |
| `AFE_PREVIEW=static` | – | Vorschau ohne zusätzlichen Dauerprozess: jeder Entwurf wird einmal gebaut (FlyingStars gemessen 2,1 s und 468 MB Spitze je Entwurf, danach kein Prozess). `AFE_PREVIEW=0` schaltet sie ganz ab |
| `DEPLOY_RESTART_CMD` | unverändert | Auf dem Account geprüfter Neustartbefehl |

Im State-Ordner liegen `runtime/`, `runtime-public/`, `preview/`, `runtime-private/editor-auth.sqlite` mit `editor-auth-secret` und `translation-memory.json`. Konten (`node editor/manage-accounts.mjs backup` schreibt die Datenbankkopie und daneben den Schlüssel als `<datei>.secret`; beide nur gemeinsam aufbewahren und wiederherstellen) und State brauchen eigene private Backups; Git sichert Inhalte und die hochgeladenen Medienbytes, nicht Passwörter oder den Übersetzungsspeicher.

Ist `AFE_PUBLIC_WEBROOT` oder dessen Alias gesetzt, wird jeder vollständige Public-Release in einen Geschwisterordner kopiert und der Webroot-Symlink per Rename gewechselt. `<webroot>.previous` hält die vorige Ausgabe. Beim ersten Wechsel eines bestehenden echten Verzeichnisses wird es in einen Geschwisterordner verschoben und `.previous` darauf verlinkt; dabei ist eine kurze Lücke möglich. Deshalb den Webroot vor dem ersten Produktivstart als Symlink einrichten. Apache-Symlinkrechte müssen am Account geprüft werden. Alte Release-Ordner und Runtime-Artefakte erst bereinigen, wenn sie weder aktiv noch für den Rückweg vorgesehen sind.

Ohne Webroot-Variable bleibt die lokale Simulation. Ohne State-Variable bleibt der Elternordner des Site-Klons die Zustandsablage. Site und State werden aus CLI/Umgebung aufgelöst, nicht aus dem Speicherort eines Runtime-Moduls. Startbefehle aus dem Klon:

```sh
node editor/server.mjs
node editor/manage-accounts.mjs list
node editor/translate-missing.mjs --locale en --dry-run
node editor/hosting-probe.mjs --build "$PWD"
node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs'
```

Für Aufrufe aus einem anderen Verzeichnis `AFE_SITE_ROOT` und `AFE_STATE_DIR` setzen oder dem Server `--site-root /absolut/klon --state-dir /absolut/private-state` übergeben. Vorhandene Weiterleitungen unter `relaunch/*.mjs` funktionieren ebenfalls mit diesen expliziten Angaben. Die Implementierungen und Browserdateien gehören seit PR 11 zum Paket `astro-frontend-editor` (privat auf GitHub Packages als `@marc-viladrich/astro-frontend-editor`, per npm-Alias als `astro-frontend-editor` installiert); unter `editor/` liegen nur noch FlyingStars-Adapter, -Erweiterungen, Launcher und Tests. Ein neuer Paketstand kommt als Versionsänderung samt Lockfile per PR (von Dependabot oder von Hand) und läuft damit durch dieselbe CI.

Der Start verweigert State innerhalb des Klons, State im öffentlichen Webroot und einen öffentlichen Webroot innerhalb des State-Ordners. Klon und Webroot müssen ebenfalls getrennt liegen. Sowohl konfigurierte Pfade als auch Symlink-Ziele werden geprüft, auch wenn die letzten Verzeichnisse noch fehlen. Fehler erscheinen auf Deutsch vor dem Laden von Konten, Site-Modulen oder dem Öffnen eines Listeners.

## Einmalige Einrichtung durch Marc

1. GitHub-Repository wählen und die lokale Implementierung über einen normalen PR nach main übernehmen. Es wurde hier nichts zu einem echten Remote gepusht. `main` muss direkte Fast-forward-Pushes des redaktionellen Host-Schlüssels erlauben; ein zwingender PR-only-Schutz für diesen Schlüssel verhindert die Editor-Freigabe.
2. GitHub-Environment `production` einrichten. Secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_PATH`. `DEPLOY_PATH` ist der absolute private Klonpfad. Den Host-Key unabhängig prüfen; die Action benutzt kein automatisches Vertrauen via ssh-keyscan.
3. Den Actions-SSH-Schlüssel für den Webhosting-Nutzer hinterlegen. Einen separaten GitHub-Deploy-Key mit Schreibzugriff für den Host einrichten, damit er fetch und die Pushes nach content/draft und main ausführen kann. GitHub-Host-Key und SSH-Konfiguration am Account prüfen. Schlüssel bleiben außerhalb des Klons.
4. Node 24 ab 24.15, Git und npm auf dem Account prüfen. `node editor/hosting-probe.mjs --build <klon>` misst die tatsächlichen Rechte und Ressourcen. Für das private Editor-Paket ein Token mit nur `read:packages` in `~/.npmrc` des Accounts (`//npm.pkg.github.com/:_authToken=…`, Rechte 600). Erster Clone außerhalb `public_html`, `npm ci --omit=dev`, `git switch -c content/draft origin/main`. Falls es bereits einen Remote-Entwurf gibt, diesen bewusst als Startstand wählen.
5. Private State-Ablage und öffentlichen Apache-Webroot einrichten. Die öffentliche Domain bleibt eine statische Apache-Domain. Die Editor-Subdomain wird in konsoleH als Node-App mit Arbeitsverzeichnis `<klon>`, Startskript `editor/server.mjs`, HTTPS, Logdatei, Node-Version und geeignetem Speicherlimit eingerichtet. `AFE_AUTH=on`, `AFE_SITE_ROOT`, `AFE_EDITOR_ORIGIN`, `AFE_CANONICAL_ORIGIN`, State-, Webroot- und Portvariablen setzen. Der Proxy muss den öffentlichen Host unverändert weitergeben; erst wenn `editor/hosting-probe.mjs` zeigt, dass er `X-Forwarded-For` setzt, `AFE_TRUSTED_PROXIES` auf seine IP stellen (sonst teilen sich alle Editoren ein Login-Limit). Lauscht der Proxy nicht über Loopback, `AFE_HOST` setzen. Für den Anfang `AFE_PREVIEW=static` (Vorschau ohne zweiten Dauerprozess); `live` erst, wenn das Speicherlimit einen dauerhaften `astro dev` trägt. Die bisherigen Namen bleiben gültig.
6. Mit `node editor/manage-accounts.mjs add marc --name "Marc Viladrich" --email hey@marcviladrich.com` ein Konto im privaten State anlegen (Passwort mindestens 15 Zeichen, wird im Terminal abgefragt). Wer eine alte `editor-accounts.json` mitbringt, führt stattdessen einmal `node editor/manage-accounts.mjs migrate` aus. Beim ersten Login auf HTTPS richtet jede Person eine Authenticator-App ein und sichert ihre zehn Wiederherstellungscodes.
7. Unter `$HOME/.config/flyingstars/deploy-config.sh` mit Modus 600 dieselben öffentlichen Origins, Pfade, Node-PATH, nötige Buildvariablen und `DEPLOY_RESTART_CMD` als Shell-Exports eintragen. Die SSH-Action lädt diese private Datei; konsoleH-Umgebungsvariablen werden nicht automatisch an eine SSH-Sitzung vererbt. Kein `.env` im Klon nötig.
8. Neustart am echten Account prüfen, dann `node editor/deploy/host-update.mjs` und anschließend eine reale Code-PR sowie Save/Freigabe testen. Kandidaten für den Neustart sind ein von Hetzner bestätigter konsoleH-Automationsweg, ein bestätigter Restart-Dateitrigger oder das Beenden des eigenen Node-Prozesses bei belegtem Supervisor-Neustart. Keiner dieser Wege ist hier verifiziert; keinen davon ungeprüft als Produktionsbefehl eintragen.

`deploy-cloudflare-preview.yml` ersetzt das frühere automatische `deploy.yml`. Es läuft ausschließlich per `workflow_dispatch` und ist ein optionaler manueller Preview-Weg. Der automatische Produktionsweg ist Hetzner. `agent.yml` und `content-intake.yml` öffnen weiterhin PRs gegen main.

## Nachweis und Rückweg

`node --test editor/test/pipeline-e2e.test.mjs` baut offline ein lokales bare `github.git`, einen Entwicklerklon und einen Host-Klon mit eigenem State. Geprüft werden CI, echte Produktionsinstallation aus dem npm-Cache, Code-Deploy und Neustartmarker, Save-Push, Freigabe bis ins öffentliche HTML, Rebase mit unveröffentlichtem Inhalt, Konflikt mit unverändertem Klon und weiter antwortendem Handler sowie Buildfehler ohne Aktivierung. Gesonderte Sync-Tests prüfen langsame Pushes und Retry. Es wird kein echter Remote verwendet.

Nicht lokal belegbar sind GitHub-Secrets und tatsächliche Action-Ausführung, SSH/TLS/DNS am Account, konsoleH-Proxy und Neustart, Apache-Symlinkrechte, Ressourcenlimit und echte Medienabrufe. Die bisherigen Browser-/Lighthouse-Gates werden im Offline-E2E nicht ausgeführt.

Für einen Code-Rollback den problematischen main-Commit durch `git revert` in einem PR zurücknehmen, CI abwarten und Deployment erneut starten. Der Rebase erhält die noch unveröffentlichten Inhalte. Bei inhaltlichem Konflikt zuerst manuell zusammenführen. Für einen sofortigen öffentlichen Rückweg den Webroot unter demselben Repository-Lock atomar auf das Ziel von `<webroot>.previous` zurückschalten; die unveränderlichen Artefakte in `runtime-public/<hash>/site` bleiben verfügbar. Ein öffentlicher Rückweg allein setzt Editorcode und main nicht zurück.

## Entwicklerrechner: lokal freigeben, dann hochladen

Bis der Host steht (und danach für die Entwicklung) läuft der Editor lokal mit `AFE_UPLOAD_REMOTE=github` und `AFE_LIVE_URL=https://flyingstars-site.pages.dev`. „Freigeben“ baut die lokale Veröffentlichung (`http://127.0.0.1:4543/`) und schiebt nur das lokale `main` vor. Ist der freigegebene Stand nicht auf GitHub, bietet der Editor „Hochladen“ an: Er holt `main` von GitHub, lehnt ab, wenn dort Commits liegen, die lokal fehlen (dann `git pull`), und pusht sonst ohne Force. Entwürfe werden in diesem Modus nicht gepusht. Auf GitHub prüft `ci.yml` den Stand; `deploy-cloudflare.yml` stellt ihn erst nach grüner CI auf Cloudflare Pages (Staging, Produktionsbranch `main`). `deploy-hetzner.yml` bleibt aus, bis die Repository-Variable `HETZNER_DEPLOY=on` gesetzt ist.

GitHub-Schutz für `main`: Admins (Marcs SSH-Schlüssel) dürfen direkt pushen, für PRs ist der Check `gates` Pflicht, Force-Push und Löschen sind gesperrt.

