# PR 3 verification and handoff

Verified on 2026-10-15 with `/opt/homebrew/opt/node@22/bin/node` (22.22.1).
Base: `9543b1c` on `afe/pr3`. Implementation is confined to this worktree.
No changes were made to the product checkout, the live checkout, content,
existing tests, dependencies or protected project configuration. No push or PR.
No `.env` file was opened, and no service was started on ports 4542–4544.

## Baseline

Before implementation:

```sh
/opt/homebrew/opt/node@22/bin/node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs'
```

**141 tests: 139 passed, 1 failed, 1 skipped.** The existing `Actual Astro source
builds original scripts ...` test failed in its Astro build. The CLI/socket test
skipped because the sandbox rejects loopback listeners with `EPERM`. The existing
PR 2 report documents the same build's media-network dependency and offline mode.
The baseline log is `/tmp/afe-pr3-baseline.log`.

## Final result

```sh
FLYINGSTARS_OFFLINE_MEDIA=1 /opt/homebrew/opt/node@22/bin/node --test 'editor/*.test.mjs' 'editor/test/*.test.mjs' 'editor/core/*.test.mjs'
```

**410 tests: 409 passed, 0 failed, 1 skipped.** This includes all 141 pre-existing
tests and **269 new Core tests**. The only skip is the same real CLI/loopback
listener scenario. The auth tests still exercise the actual Node HTTP handler
over an in-memory stream when sockets are unavailable. The offline flag supplies
the pilot's existing image passthrough; it does not skip build assertions.
Final log: `/tmp/afe-pr3-verification-tests.log`.

Further checks:

- `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx astro check`: **0 errors,
  0 warnings, 207 existing hints**.
- `FLYINGSTARS_OFFLINE_MEDIA=1 PATH=/opt/homebrew/opt/node@22/bin:$PATH npx astro build`:
  **63 pages built**.
- `git diff --check`: passed.
- Commit-clone comparison: all implementation and documentation bytes matched
  this worktree before exporting the patches.

## Acceptance evidence

1. No-op roundtrips compare original Buffers, then reread the originals:
   **170** worktree JSON/YAML/Markdown files, Bakery's **1** shared
   `categories.yaml`, and **40** Physio YAML/Markdown files. All **211** match
   exactly. Code files under `src/content` are not source-codec inputs.
2. Focused scalar edits assert complete expected file bytes for JSON, block YAML,
   nested flow YAML and Markdown. Coverage includes CRLF, Unicode, comments,
   key order, frontmatter delimiters, body whitespace and date-only input.
3. Shared map/array tests use stable selectors, distinguish numeric/string IDs,
   create/delete entries and reorder source slices. Two transactions stage edits
   to different entries from one baseline; the second commit gets German `409`
   `SOURCE_CONFLICT` and leaves the first commit intact. Changing only a file
   comment also conflicts.
4. Multiple edits to one file produce one write batch entry. No-op updates produce
   zero file writes. Independent registries share a filesystem lock; snapshots
   during a commit cannot capture a partial multi-file state.
5. Injected failure on the second file installation restores every completed
   write and the Git ref. Failure of the single atomic Git-index update also
   restores source bytes, ref and index state. Temporary files and locks are
   removed after these ordinary failures.
6. Legacy integration checks exact encoded bytes, their revision hashes and a
   clean Git index. Existing native save/replay, stale-change, create/delete,
   translation, media, preview, authentication and publication tests pass.
7. A permanent source-boundary guard checks Core for site imports/names and checks
   NativeStore for direct content writes. Site placement is registered by the
   site adapter, and content writes run through `SourceRegistry`.

The supported YAML subset rejects anchors, aliases, merge keys, duplicate keys,
flow roots, custom tags and complex keys with `AFE105` errors. Nested flow fields
remain supported. Four existing Markdown documents have flow-style frontmatter;
that whole-document format remains supported without weakening shared YAML's
AFE105 restriction.

## Commits and patch delivery

The sandbox rejects `source/.git/worktrees/afe-pr3/index.lock` with
`Operation not permitted`, so the original worktree remains uncommitted.
The four focused commits live on `afe/pr3` in the independent repository
`/tmp/afe-pr3-commit-series`. Every message ends with
`Co-Authored-By: Codex <noreply@openai.com>`.

The `git format-patch` series is in `/tmp/afe-pr3-patches`. It reproduces this
worktree's change from base `9543b1c`. Apply it with `git am` to a clean checkout
of that base; do not apply it on top of the already modified working files.

## PR 4 / PR 5

The API, operation table and storage limits are in [source-registry.md](source-registry.md).

- PR 4 consumes raw values and explicit locators. Preserve schema branch
  conditions, default/input distinctions and Markdown's body address. Astro
  validation, references, authorization and policy compilation are not replaced
  by the codecs. NativeStore still owns those legacy rules and durable replay.
- PR 5 replaces the adapter's file registrations with loader provenance. Keep
  filenames and public legacy IDs stable, explicitly map singular legacy
  prefixes to actual collection names, and use whole-file hashes. Registration
  refresh/pruning needs lifecycle coordination. The current legacy bridge is for
  document sources; shared-file operations already work through the generic API.
- Filesystem installation is atomic per file and rolls back ordinary errors.
  Multi-file working-tree crash recovery and abandoned-lock recovery remain host
  concerns. Git publishes one candidate tree by an expected-parent ref update.
  Non-cooperating external writers must respect the source lock to eliminate the
  final check/rename race. No stronger crash guarantee is claimed.

## Nachprüfung außerhalb der Sandbox (Claude, 15.10.2026)

- Volle Suite ohne Offline-Modus: **410 bestanden, 0 Fehler, 0 übersprungen**.
- Echter Server auf einem Wegwerf-Klon (nicht auf dem gemeinsamen `content/draft`), Login, `POST /editor/api/save` mit zwei Änderungen (FAQ-Markdown-Frontmatter + verschachtelte Section-Headline in `pages/index.yaml`): ein Commit, je Datei genau eine geänderte Zeile, Rest bytegleich. Derselbe Auftrag noch einmal auf alter Basis → 409 „Dieser Inhalt wurde inzwischen geändert."
- Beobachtung für später: Der YAML-Codec setzt geänderte Strings in doppelte Anführungszeichen, auch wenn YAML sie nicht bräuchte (`headline: "Wir gestalten … E2E"`). Gültig und quelltreu für den Rest der Datei, aber nicht minimal; beim Codec-Feinschliff prüfen.
