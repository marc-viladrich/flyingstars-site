# Runtime-Optionen des Editors

Seit PR 11 ist die Editor-Laufzeit das Paket `astro-frontend-editor` (privat auf GitHub Packages, Abhängigkeit `npm:@marc-viladrich/astro-frontend-editor@0.2.1`, installiert mit `npm ci`). Dieses Repository enthält nur noch, was FlyingStars betrifft: den Adapter `editor/flyingstars-adapter.mjs`, die Erweiterungen unter `editor/extensions/flyingstars/`, die Browser-Registrierung `editor/browser-site.mjs`, die Launcher (`editor/server.mjs`, `manage-accounts.mjs`, `translate-missing.mjs`, `migrate.mjs`), die Deploy-Anbindung `editor/deploy/`, `editor/ci/check.mjs` und die FlyingStars-Integrationstests. Die generischen Laufzeit-Tests liegen im Produkt-Repository.

`resolveRuntimeOptions` (aus `astro-frontend-editor/runtime`) löst die Host-Einstellungen einmal am Einstiegspunkt auf. Es werden keine `.env`-Dateien gelesen. Relative Pfade beziehen sich auf das Arbeitsverzeichnis des Aufrufers. Das Paket selbst nimmt ohne `--site-root`/`AFE_SITE_ROOT` das Arbeitsverzeichnis als Site; der FlyingStars-Launcher übergibt stattdessen seinen eigenen Checkout als Standard, damit `node relaunch/server.mjs` aus dem Projektordner weiter diese Site bearbeitet. Der Standard für State bleibt deren Elternverzeichnis.

Host-Einstellungen gehören gemäß Architekturentscheidung 001, Entscheidung 9, nicht in den Site-Contract. Die Laufzeit importiert nie eine Site: der Launcher übergibt den Adapter (Schemas, Source-Registrierung, Routen, Paketzuordnung, Übersetzungsfelder, Markdown-Validierung, Build-, Preview- und Medienkonventionen, `label` und `previewPrefix`).

```js
// editor/server.mjs (gekürzt)
import {startNativeServers as start,runEditor as run} from 'astro-frontend-editor/runtime';
import {createFlyingStarsAdapter,compatibility} from './flyingstars-adapter.mjs';
const site={createSite:createFlyingStarsAdapter,compatibility,defaults:{siteRoot:<dieser Checkout>}};
export const startNativeServers=(input={})=>start({...site,...input});
export const runEditor=(args=process.argv.slice(2))=>run(args,site);
```

Ohne Launcher startet das Paket mit `npx afe editor --site-adapter editor/flyingstars-adapter.mjs` (oder `AFE_SITE_ADAPTER`); das Modul exportiert dafür `createSite` und `compatibility`. Für eingebettete Aufrufer bleiben die flachen Argumente von `startNativeServers` (`source`, `runtimeRoot`, `remote`, `auth: {file, clock}`) erhalten. Dieser API-Einstieg startet ohne explizite Konfiguration ohne Auth und Live-Preview; der CLI-Einstieg aktiviert beide standardmäßig.

## Alte Namen (Kompatibilität)

Das Paket kennt nur generische Namen (`AFE_*`, Dateien `afe-*`, Cookie `afe_editor`). FlyingStars übergibt seine bisherigen Namen ausdrücklich über `editor/extensions/flyingstars/runtime-compatibility.mjs`: die Umgebungs-Aliase `FLYINGSTARS_*`, `EDITOR_*` und `RELAUNCH_*`, die Lock-/Lease-/Worktree-Namen `flyingstars-operation.lock`, `flyingstars-draft-lease`, `flyingstars-rebase-`, `flyingstars-deploy-`, das Cookie `fs_editor` und die Befehle in Meldungen (`node editor/manage-accounts.mjs`, `node editor/migrate.mjs`). Ein bestehender State-Ordner, laufende Sitzungen und Host-Variablen funktionieren dadurch unverändert. Die Tabelle unten nennt diese Aliase weiter; sie gelten nur über den FlyingStars-Launcher bzw. dessen Adapter-Modul.

## Vorrang und Variablen

Explizite API-Werte in `values` gewinnen vor CLI-Argumenten, CLI-Argumente vor Umgebungsvariablen, generische Namen vor ihren Legacy-Aliasen. Die Aliase bleiben funktionsfähig, sind bei vorhandenem `AFE_*`-Namen aber deprecated. Auch ein explizit leerer generischer Wert verdrängt den Alias. Geheimnisse werden weder protokolliert noch an den Browser gegeben. Für Geheimnisse sind Umgebungsvariablen dem sichtbaren CLI-Aufruf vorzuziehen.

| Variable | Deprecated Alias | CLI-Option | Standard / Bedeutung |
|---|---|---|---|
| `AFE_SITE_ROOT` | keiner | `--site-root`, `--source` | Site, in der der Editor liegt |
| `AFE_STATE_DIR` | `FLYINGSTARS_STATE_DIR` | `--state-dir` | Elternverzeichnis der Site |
| `AFE_PUBLIC_WEBROOT` | `FLYINGSTARS_PUBLIC_WEBROOT` | `--public-webroot` | Ohne Wert lokale Public-Simulation |
| `AFE_EDITOR_ORIGIN` | `EDITOR_ORIGIN` | `--editor-origin` | `http://127.0.0.1:<port>` |
| `AFE_CANONICAL_ORIGIN` | `SITE_URL` | `--canonical-origin` | `http://127.0.0.1:<public-port>` |
| `AFE_PORT` | `PORT`, danach `RELAUNCH_PORT` | `--port` | `4542`, Loopback |
| `AFE_PUBLIC_PORT` | `RELAUNCH_PUBLIC_PORT` | `--public-port` | `4543`, Loopback |
| `AFE_PREVIEW` | `RELAUNCH_PREVIEW` | `--preview` | CLI `live` (dauerhafter `astro dev`); `static` baut jeden Entwurf mit `astro build` (kein zusätzlicher Prozess, rund 2 s je Änderung bei FlyingStars); `0` oder `off` deaktiviert |
| `AFE_PREVIEW_PORT` | `RELAUNCH_PREVIEW_PORT` | `--preview-port` | Editor-Port + 2 |
| `AFE_GIT_REMOTE` | `FLYINGSTARS_GIT_REMOTE` | `--git-remote` | Ohne Wert aus; `off` ausdrücklich aus |
| `AFE_DRAFT_BRANCH` | keiner | `--draft-branch` | `content/draft` |
| `AFE_PUBLISHED_BRANCH` | keiner | `--published-branch` | `main` |
| `AFE_UPLOAD_REMOTE` | keiner | `--upload-remote` | Entwicklerrechner: Freigabe bleibt lokal, „Hochladen“ pusht den freigegebenen Branch auf Anfrage zu diesem Remote. Schließt `AFE_GIT_REMOTE` aus |
| `AFE_LIVE_URL` | keiner | `--live-url` | Origin, unter der ein hochgeladener Stand nach der CI erscheint (nur als Link) |
| `AFE_AUTH` | `EDITOR_AUTH` | `--auth` | CLI an; `off` deaktiviert |
| `AFE_ACCOUNTS` | `EDITOR_ACCOUNTS` | `--accounts` | `<state>/runtime-private/editor-accounts.json` |
| `AFE_SESSION_SECRET` | `EDITOR_SESSION_SECRET` | `--session-secret` | Ohne Wert dauerhaft privat erzeugt; gesetzt mindestens 32 Bytes |
| `AFE_TRANSLATION_PROVIDER` | `EDITOR_TRANSLATION_PROVIDER` | `--translation-provider` | Ohne Wert aus; mit URL automatisch LibreTranslate |
| `AFE_TRANSLATION_URL` | `EDITOR_TRANSLATION_URL` | `--translation-url` | Optionaler LibreTranslate-Endpunkt |
| `AFE_TRANSLATION_KEY` | `EDITOR_TRANSLATION_KEY` | `--translation-key` | Optionaler Schlüssel dieses Endpunkts |
| `AFE_TRANSLATION_BUDGET` | `EDITOR_TRANSLATION_BUDGET` | `--translation-budget` | `5000` Zeichen je Editor-Auftrag |
| `AFE_DEEPL_API_KEY` | `DEEPL_API_KEY` | `--deepl-api-key` | DeepL-Schlüssel |
| `AFE_MYMEMORY_EMAIL` | `MYMEMORY_EMAIL` | `--mymemory-email` | Optionale MyMemory-Kontaktadresse |
| `AFE_OFFLINE_MEDIA` | `FLYINGSTARS_OFFLINE_MEDIA` | `--offline-media` | `1` aktiviert den vorhandenen Offline-Buildmodus |
| `AFE_NEW_PASSWORD` | `EDITOR_NEW_PASSWORD` | nur Konten-CLI | Passwort für nichtinteraktive Kontenpflege |

`MEDIA_HOST` und `PUBLIC_FORM_ENDPOINT` bleiben Build-Eingaben ohne Umbenennung. Das Build erhält weiterhin die vom Pilot unterstützten Variablen `FLYINGSTARS_EDITOR`, `FLYINGSTARS_OFFLINE_MEDIA` und `SITE_URL`; die Host-Optionen werden dafür am Runtime-Rand übersetzt. Der Vorschauprozess erhält einen Snapshot der Prozessumgebung. Änderungen an `process.env` nach der Auflösung ändern die laufenden Services nicht.

`DEPLOY_RESTART_CMD`, `DEPLOY_EXPECTED_MAIN`, `FLYINGSTARS_PIPELINE_CHILD` und die üblichen Prozessvariablen `PATH`, `HOME`, `TMPDIR`, `LANG` behalten ihre bisherige Funktion. Der Deploy-Hook nutzt denselben Resolver, standardmäßig weiterhin `origin`, und reicht konfigurierte Branches an Rebase und Publisher weiter. Die Konten-CLI nutzt die Pfad-/Auth-Einstellungen aus der Umgebung; ihre bestehenden Unterbefehle bleiben gleich. Die Übersetzungs-CLI behält ihre bisherigen Batch-/Budget- und Auswahlargumente und akzeptiert zusätzlich `--site-root` und `--state-dir`.

## Start aus anderem Arbeitsverzeichnis

```sh
cd /tmp
node /absolut/site/editor/server.mjs \
  --site-root /absolut/site \
  --state-dir /absolut/private-state \
  --editor-origin https://editor.example.org \
  --canonical-origin https://example.org \
  --public-webroot /absolut/public_html \
  --git-remote origin --auth on --preview off
```

State innerhalb der Site wird vor dem Laden von Konten oder Site-Modulen abgewiesen. State und öffentlicher Webroot dürfen sich weder enthalten noch gleich sein. Auch Site und öffentlicher Webroot müssen getrennt sein. Die Prüfung betrachtet konfigurierte Pfade, Symlink-Ziele und noch nicht vorhandene Nachfahren. Das historische Layout mit State als Elternordner der Site bleibt möglich, sofern der öffentliche Webroot außerhalb dieses State-Ordners liegt. Konten werden zusätzlich gegen Site, Editor-Webdateien, Build-/Preview-Verzeichnisse und den öffentlichen Webroot geprüft.

## Anmeldung und dauerhafte Sitzungen

Seit Paket 0.2.0 übernimmt Better Auth Passwörter, Sitzungen, TOTP und Wiederherstellungscodes. Die vollständige Betriebsbeschreibung (Sitzungsgrenze zwölf Stunden ohne Verlängerung, MFA-Pflicht auf HTTPS, Proxy-Einstellungen, Backups, Updates) steht im Paket unter `node_modules/astro-frontend-editor/docs/authentication.md`. Für FlyingStars gilt zusätzlich:

- Konten liegen in `<state>/runtime-private/editor-auth.sqlite`, der Schlüssel daneben in `editor-auth-secret` (beide `0600`, Ordner `0700`). Beide gehören zusammen ins private Backup. `EDITOR_SESSION_SECRET` bleibt als Alias für `AFE_SESSION_SECRET` gültig.
- Die bisherige `editor-accounts.json` ist nur noch Importquelle. Einmalig `node editor/manage-accounts.mjs migrate` ausführen; danach verlangt der erste Login einen Passwortwechsel (mindestens 15 Zeichen) und auf HTTPS die Einrichtung einer Authenticator-App. Die alte Datei bleibt unverändert als Rückweg. `editor-sessions.json` und `editor-session-secret` werden nicht mehr gelesen; alle bisherigen Sitzungen enden mit dem Wechsel.
- Das Cookie heißt lokal `fs_editor`, auf HTTPS `__Host-fs_editor`.
- Kontenbefehle: `node editor/manage-accounts.mjs add|list|passwd|disable|enable|reset-mfa|backup|schema`. Mit `--state-dir` wirken sie auf den angegebenen State.

## Anmeldeseite

Der Adapter (`editor/flyingstars-adapter.mjs`, Feld `login`) legt das Aussehen fest: zwei Spalten, FlyingStars-Punktlogo, rechts das Hero-Poster der Startseite (Düsseldorf), ohne Bildunterschrift. Die Dateien liegen unter `editor/login/` und damit nicht im öffentlichen Build. Varianten zum Vergleichen: `/editor/login?layout=centered` (Karte vor dem Foto). Alle Optionen: `node_modules/astro-frontend-editor/docs/login.md`.

## Grenze dieser Änderung

Alle geprüften Service-Module sind von direkten Imports aus `src/schemas` und `src/lib` getrennt. Noch keine generische Produktimplementierung sind die Source-Codecs und Git-Transaktionen im Store, dessen Referenz-/Paketregeln sowie die Browserlogik. Die vorhandenen Feld- und Collection-Heuristiken bleiben im Pilot bis zu den dafür vorgesehenen PRs. PR 3 übernimmt die reversible Source-Registry einschließlich Shared-File-Konflikten und No-op-Roundtrips. Die kollisionsanfälligen Übersetzungs-IDs bleiben für PR 10 unverändert.

## Serverseitige Extensions ab PR 7

`resolveRuntimeOptions({values: {extensions: [...]}})` nimmt zusätzliche vertrauenswürdige Extension-Definitionen entgegen. `startNativeServers` registriert sie zusammen mit den Definitionen des Site-Adapters in einer eigenen Registry. Doppelte Namen und inkompatible Vertragsversionen brechen den Start ab. Es gibt dafür keine Umgebungsvariable und keinen Browser-Modulpfad. Hooks, Ausführungsreihenfolge und die noch offene Browseranbindung stehen in [extensions.md](extensions.md).
