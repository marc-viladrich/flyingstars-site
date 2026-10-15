# Runtime-Optionen des Editors

`editor/runtime-options.mjs` definiert `RuntimeOptions` per JSDoc und löst die Host-Einstellungen einmal am Einstiegspunkt auf. `server.mjs` verdrahtet damit Store, Builder, Publisher, Preview, Git-Sync, Auth, Medien und Übersetzung. Es werden keine `.env`-Dateien gelesen. Relative Pfade beziehen sich auf das Arbeitsverzeichnis des Aufrufers. Ohne `--site-root` oder `AFE_SITE_ROOT` ist die Site die, in der dieser Editor installiert ist (unabhängig vom Arbeitsverzeichnis, wie vor PR 2); der Standard für State bleibt deren Elternverzeichnis.

Host-Einstellungen gehören gemäß Architekturentscheidung 001, Entscheidung 9, nicht in den Site-Contract. Der explizit übergebene FlyingStars-Adapter in `editor/flyingstars-adapter.mjs` liefert Schemas, Source-Registrierung, Routen, Paketzuordnung, Übersetzungsfelder und Markdown-Validierung sowie die bestehenden Build-, Preview- und Medienkonventionen. Seine Imports beziehen sich immer auf die angegebene Site-Wurzel.

```js
import {resolveRuntimeOptions} from './editor/runtime-options.mjs';
import {createFlyingStarsAdapter} from './editor/flyingstars-adapter.mjs';
import {startNativeServers} from './editor/server.mjs';

const options = resolveRuntimeOptions({args: process.argv.slice(2), authDefault: true, previewDefault: true});
const site = await createFlyingStarsAdapter(options.siteRoot);
await startNativeServers({options, site});
```

Der Server lädt den Pilot-Adapter am Composition Root, wenn kein `site`-Objekt übergeben wurde. Generische Services laden ihn niemals selbst. Für eingebettete Aufrufer bleiben die bisherigen flachen Argumente von `startNativeServers`, etwa `source`, `runtimeRoot`, `remote` und `auth: {file, clock}`, erhalten. Dieser API-Einstieg startet ohne explizite Konfiguration weiterhin ohne Auth und Live-Preview; der CLI-Einstieg aktiviert beide standardmäßig.

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
| `AFE_PREVIEW` | `RELAUNCH_PREVIEW` | `--preview` | CLI an; `0` oder `off` deaktiviert |
| `AFE_PREVIEW_PORT` | `RELAUNCH_PREVIEW_PORT` | `--preview-port` | Editor-Port + 2 |
| `AFE_GIT_REMOTE` | `FLYINGSTARS_GIT_REMOTE` | `--git-remote` | Ohne Wert aus; `off` ausdrücklich aus |
| `AFE_DRAFT_BRANCH` | keiner | `--draft-branch` | `content/draft` |
| `AFE_PUBLISHED_BRANCH` | keiner | `--published-branch` | `main` |
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

„Angemeldet bleiben“ ist beim Login ausgeschaltet. Ohne Häkchen setzt der Editor ein Session-Cookie ohne `Max-Age` oder `Expires`. Die serverseitige Sitzung endet nach zwölf Stunden ohne authentifizierte Anfrage. Browser können Session-Cookies bei einer Wiederherstellung übernehmen; das serverseitige Zeitlimit gilt auch dann.

Mit Häkchen gilt das Cookie 30 Tage. Bei erneuter Nutzung nach mindestens 24 Stunden ersetzt der Editor den Token und setzt Cookie und Ablauf auf weitere 30 Tage. Häufigere Anfragen lösen keine weitere Rotation aus. Der alte Token bleibt höchstens 30 Sekunden gültig, damit parallele Asset- und API-Anfragen den Wechsel abschließen können. Der CSRF-Token bleibt dabei erhalten. Abmelden widerruft auch den kurzzeitig noch gültigen Vorgänger.

Der Server speichert Sitzungen atomar unter `<state>/runtime-private/editor-sessions.json`. Gespeichert werden nur HMAC-SHA256-Hashes der Sitzungstokens, Konto-ID und Passwortversion, CSRF-Token, Erstellungs-, Aktivitäts-, Erneuerungs- und Ablaufzeit sowie die Merken-Auswahl. Der Dateikopf enthält Version und eine HMAC-Kennung des Signierschlüssels. Unverschlüsselte Sitzungstokens, Passwörter und Kontohashes stehen nicht in der Sitzungsdatei. Das Verzeichnis hat Modus `0700`, die Auth-Dateien `0600`; sie dürfen weder im Repository noch im Webroot liegen. Auch diese Pfade werden gegen die verbotenen Wurzeln und Symlinks geprüft.

Ohne konfiguriertes `AFE_SESSION_SECRET` erzeugt der Editor einmalig `<state>/runtime-private/editor-session-secret`. Dieses Geheimnis und die Sitzungsdatei bleiben bei Builds und Neustarts erhalten. Bei explizitem Geheimnis muss derselbe Wert bei jedem Start bereitstehen. Ein Wechsel oder Verlust des Geheimnisses verwirft bestehende Sitzungen. Ein beschädigter Sitzungsspeicher verhindert den Start; zur Rücksetzung kann die Sitzungsdatei bei gestopptem Editor entfernt werden. Das meldet alle Konten ab.

Abgelaufene und widerrufene Sitzungen werden beim Start und bei authentifizierten Anfragen entfernt. Die Kontodatei wird erneut gelesen: Passwortwechsel oder Deaktivierung über `manage-accounts.mjs` sowie das Entfernen eines Kontos sperren dessen Sitzungen bei der nächsten Anfrage, auch nach einem Neustart. Logout löscht die zugehörigen gespeicherten Tokens vor der Antwort. Jeder State-Ordner gehört genau einem laufenden Editorprozess. Die dateibasierte Speicherung unterstützt keine mehreren gleichzeitigen Serverinstanzen mit demselben State.

HTTPS verwendet weiterhin `__Host-fs_editor` mit `Secure`, `Path=/`, `HttpOnly` und `SameSite=Strict`. Lokales Loopback-HTTP verwendet `fs_editor` ohne `Secure`, damit auch WebKit das Cookie akzeptiert. Origin-Prüfung, CSRF und Login-Drosselung bleiben aktiv. Für eine direkte Einbettung von `EditorAuth` ohne Server ist der Standard `<Kontenordner>/editor-session-state`; `sessionDir` kann einen anderen privaten Ordner vorgeben. `createSession` und `destroySession` sind jetzt asynchron und müssen vor der Verwendung ihrer Ergebnisse abgewartet werden.

## Grenze dieser Änderung

Alle geprüften Service-Module sind von direkten Imports aus `src/schemas` und `src/lib` getrennt. Noch keine generische Produktimplementierung sind die Source-Codecs und Git-Transaktionen im Store, dessen Referenz-/Paketregeln sowie die Browserlogik. Die vorhandenen Feld- und Collection-Heuristiken bleiben im Pilot bis zu den dafür vorgesehenen PRs. PR 3 übernimmt die reversible Source-Registry einschließlich Shared-File-Konflikten und No-op-Roundtrips. Die kollisionsanfälligen Übersetzungs-IDs bleiben für PR 10 unverändert.

## Serverseitige Extensions ab PR 7

`resolveRuntimeOptions({values: {extensions: [...]}})` nimmt zusätzliche vertrauenswürdige Extension-Definitionen entgegen. `startNativeServers` registriert sie zusammen mit den Definitionen des Site-Adapters in einer eigenen Registry. Doppelte Namen und inkompatible Vertragsversionen brechen den Start ab. Es gibt dafür keine Umgebungsvariable und keinen Browser-Modulpfad. Hooks, Ausführungsreihenfolge und die noch offene Browseranbindung stehen in [extensions.md](extensions.md).
