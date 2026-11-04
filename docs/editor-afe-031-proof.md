# AFE 0.3.1: vorbereitete Site-Integration

Stand 04.11.2026. Produktbasis `github/main c76654d`, Sitebasis `origin/main d98c649`.
Produktworktree `/tmp/afe-031`, Siteworktree `/tmp/fs-afe031`. Der Hauptcheckout
wurde nicht geändert. Kein Push, Tag, Merge oder Publish; keine `.env` gelesen.

## Vertrag

`x-afe.derivedNote` kommt aus dem Feldschema, ersatzweise aus dem Recordschema.
Eine leere Feldangabe unterdrückt den Recordhinweis. Ohne Angabe kein Zusatzhinweis.
Der Text ist Plaintext; Besitzer, Schreibpfade und die vorhandenen Besitzersprünge
bleiben aus den Bindungen abgeleitet. Kontaktmarker verwenden wieder die
konkreten Quellpfade an allen bisherigen Workaround-Stellen: Base-Footer,
ContactWays und ContactDetails, einschließlich WhatsApp → `mobile`.

Die Site-Änderungen sind Releasevorbereitung. Sie werden zusammen mit dem Upgrade
auf AFE 0.3.1 ausgerollt; das alte geschlossene Metadatenvokabular kennt
`derivedNote` noch nicht. Manifest und Lockfile bleiben hier auf Registry-0.3.0.

## Paket und Umgebung

Node 24.21.0 aus `/tmp/node-v24.21.0-darwin-arm64/bin`. Die vorgegebene Homebrew-
Installation konnte `libsimdjson.27.dylib` nicht laden. Beide Worktrees wurden mit
`npm ci` installiert. Danach nur im temporären Siteworktree:

```sh
npm install --no-save --package-lock=false /tmp/afe-031/astro-frontend-editor-0.3.1.tgz
```

Vor dem Browserlauf wurden installierte Version `0.3.1`, der neue Import/Aufruf
in `node_modules/astro-frontend-editor/web/editor.js` und das tatsächlich
installierte `web/derived-note.mjs` zurückgelesen. Der finale Pack enthält dieselben
Bytes. Der lokale Tarball ist unscoped, keine veröffentlichte Registry-Version.

Die vorhandene `i18nFixture()` erzeugt eine unabhängige Inhaltskopie ohne `.env`,
mit Offline-Medien und separatem temporärem State. Der Editor lief mit explizitem
`AFE_STATE_DIR`, zusätzlich über `resolveRuntimeOptions` festgelegtem Fixture-State,
Auth aus und Git-Remote aus auf 127.0.0.1:4763/4764. Keine Schreibaktion im
Browserlauf, kein Übersetzungsanbieter. Die Speicher-/Build-Tests besitzen eigene
Wegwerfkopien. Die Produktionsinhalte bleiben unverändert.

## Browserfälle

Die Klickziele wurden aus den tatsächlichen `data-afe`-Bindungen des Fixture-Builds
gesammelt. Keine synthetischen Inspector-Nachrichten oder erfundenen Felder.

| Besitzer / Feld | Ansicht | Erwarteter Hinweis |
| --- | --- | --- |
| Kontakt `visit[0]` | Blog-Footer | Ändert die Kontaktangabe an allen Stellen der Website. |
| Projektfakten `hochzeit-recklinghausen.drones` | `/drohnenshow-hochzeit/` | Ändert alle Darstellungen, die diese Projektfakten verwenden. |
| Extras `indoor.price.amount` | `/drohnenshow-indoor/` | Ändert alle Angaben, die aus diesem Extra oder Sonderangebot berechnet werden. |
| Showzeiten `outdoor.min` | `/drohnenshow-preise/` | Ändert die Showzeiten an allen Stellen, die diese Dauer verwenden. |
| Pakete `HORIZON.price` | `/drohnenshow-preise/`, Konfigurator | Gilt für alle Preisangaben dieses Pakets. |
| Wörterbuch `base.followUs.de` | Blog-Footer, Inline und Optionen | Kein Zusatzhinweis, da eine Inline-Bindung. Kein falscher Pakethinweis. |

Der Wörterbuch-Record liefert den neuen Vertrag bereits mit. Würde eine Site ihn
als Panel-/Derived-Bindung rendern, lautet der Hinweis „Ändert diesen gemeinsamen
Übersetzungswert an allen Stellen, die denselben Wörterbuchschlüssel verwenden.“
Die aktuelle Inline-Bindung wurde bewusst beibehalten. Der Schema-Guard prüft die
Metadaten für diesen Besitzer ebenso wie alle anderen betroffenen Records.

Lokale Evidenz: `/tmp/afe031-proof/clicks.json`, zwölf Engine-/Feld-PNGs und die
zugehörigen Prüflogs. Chromium-Paketpreis und WebKit-Kontakt wurden visuell geprüft.
Der erste Browseranlauf wartete auf das gesamte `load`-Ereignis und lief bei einer
Navigation in einen Timeout; der abschließende Lauf wartet auf DOMContentLoaded
und die tatsächlichen Marker/Panelzustände. Keine Produkterwartung wurde gelockert.

## Ergebnisse

- Produkt: 301/301 Tests, 0 Fehler, 0 Skips, mit historischen Fixtures.
- Produkt-Browsersuite: 11/11, Chromium und WebKit.
- Finale gezielte Site-Suite: 9/9, 0 Fehler, 0 Skips, 204,25 Sekunden.
  Enthält Kontakt-Speichern samt gebauten konkreten Markern, Showzeiten- und
  Sonderangebots-Speichern samt DE-/EN-/NL-Build sowie Feldpolicy und neue Guards.
- Site `astro check`: 305 Dateien, 0 Fehler, 0 Warnungen, 248 Hinweise.
- Separater Site-Build: `FLYINGSTARS_OFFLINE_MEDIA=1 npx astro build`,
  erfolgreich, 72 Seiten, 1m 1s.
- Site-Klickfälle: 12/12, sechs Fälle pro Engine, keine Speicheraktion.
- `npm pack --dry-run --json --ignore-scripts`: erfolgreich, 132 Dateien,
  323863 Bytes gepackt. Pack-Test grün. Tarball `/tmp/afe-031/astro-frontend-editor-0.3.1.tgz`.
- Manifest und Lockfile im Sitebranch unverändert auf 0.3.0. Die temporäre
  Installation wurde nicht committed. Beide Hauptcheckouts blieben unangetastet.

Produktcommit: `c2f529b5c2a83f5c10ddc0121c799e9f239e18cb` auf
`codex/afe-031-derived-note`. Release-Schritte stehen vollständig in dessen
`docs/releases/0.3.1.md`: Produktreview/Main, Tag `v0.3.1`, bestehender Publish-
Workflow, Registry-Integrität zurücklesen und dokumentieren, erst dann Sitealias
und Lockfile auf 0.3.1 aktualisieren und aus der Registry prüfen. Kein lokales
`npm publish` und keine manuelle Änderung von Paketname/private im Quellrepo.
