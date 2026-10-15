# Source codecs and transactions

PR 3 introduces `editor/core/codecs.mjs` and `editor/core/source-registry.mjs`.
Both modules depend only on Node and the existing `yaml` dependency. The source
registry receives explicit registrations; it does not infer collections, record
IDs, field ownership or schemas from directory names.

```js
import {SourceRegistry} from './editor/core/source-registry.mjs';

const registry = new SourceRegistry({
  root: '/absolute/site/root',
  sources: [{
    key: {collection: 'categories', id: 'bread'},
    file: 'src/content/categories.yaml',
    codec: 'yaml',
    locator: {kind: 'object-entry', key: 'bread'},
  }],
});
const record = await registry.read({collection: 'categories', id: 'bread'});
const tx = registry.begin(record.revision);
await tx.stage({
  kind: 'set',
  address: {collection: 'categories', id: 'bread'},
  path: ['name', 'de'],
  value: 'Brote',
});
await tx.commit();
```

Use `await registry.snapshot()` as the baseline for a transaction touching more
than one file. A record's `revision` includes the complete hash of its file,
including other entries and comments. A snapshot contains `{files: {path: hash}}`;
missing registered files have `null` hashes. It is a detached value. File-storage
snapshots and writes share a filesystem lock, so a snapshot cannot capture half
of a cooperating writer's multi-file update.

## Codec API

- `parse(bytes)` returns raw data, without schema defaults or transformations.
- `update(bytes, path, value)` sets a field; `undefined` removes it. An unchanged
  value returns identical bytes. Buffers return Buffers; strings return strings.
- `move(bytes, path, from, to)` moves existing array-item source slices.
- `create(value)` serializes a new document, where no prior formatting exists.

Existing scalar edits replace only the scalar range. Root/entry replacements
reconcile changed members. Structural array replacement can replace that array's
range; use `move` to retain item formatting and comments during explicit reorder.
JSON duplicate keys are rejected at every depth. YAML errors have code `AFE105`
and a German explanation. The supported subset excludes anchors, aliases, merge
keys, custom tags, complex mapping keys, duplicates and flow roots. Nested flow
collections, including Bakery's multilingual fields, remain supported.

Markdown preserves delimiters, frontmatter bytes and body whitespace separately.
Its raw object includes a reserved `body` string for legacy compatibility.
Existing flow-style Markdown frontmatter remains supported: AFE105 restricts
shared YAML sources, and Markdown is a single document. YAML anchors/aliases and
other unsupported constructs are still rejected in frontmatter.

## Registrations and operations

Addresses are `{collection, id}` tuples. IDs may contain dots or slashes; no slug
conversion is performed. Locators follow architecture sketch C:

- `{kind: 'document'}` for a whole file.
- `{kind: 'object-entry', key}` for one root-map entry.
- `{kind: 'array-entry', idField: ['id'], idValue}` for a root-array entry.
  The selector uses the original value and distinguishes strings from numbers.
  Duplicate matches fail. Array positions are resolved afresh after each edit.

`file` can also be supplied in the locator. Register missing entries before taking
a creation snapshot. Sources may set `writable: false`. Path escapes and symlinked
source paths are rejected. Registrations are trusted server data, not user input.

`tx.stage()` supports these operations:

| Kind | Additional properties | Effect |
| --- | --- | --- |
| `set` | `address`, `path`, `value` | Set a field or replace the record at `[]` |
| `unset` | `address`, `path` | Remove a field |
| `create` | `address`, `value` | Create the registered document/shared entry |
| `delete` | `owner` | Remove the registered document/shared entry |
| `insert` | `address`, `path`, `index`, `value` | Insert into an array field |
| `remove` | `address`, `path`, `index` | Remove from an array field |
| `move` | `address`, `path`, `from`, `to` | Move an array item |
| `reorder` | `address`, `scope: 'source'`, `from`, `to` | Reorder the shared root array |

Field operations also accept the sketch's full `address: {owner, part, path}`;
Markdown body operations use `part: 'body', path: []`. `path` at the operation
level takes precedence. Maps have no reorder operation. Deleting the last shared
block-YAML entry deletes the file, since an empty block map/sequence has no
representation within the supported subset. A later create can recreate it.

Stage operations sequentially with `await`. A failed operation closes the
transaction. Commit is single-use. Before writing, every touched file is compared
against its full baseline hash, even if operations cancel out. A conflict returns
status `409`, code `SOURCE_CONFLICT` and a German message retaining the user's
inputs. The registry groups edits into one final write per changed file.

## Storage and legacy integration

The default `FileStorage` prepares temporary files beside their targets, checks
hashes again and installs each changed file with one rename. An I/O failure rolls
back completed writes under the same lock. It preserves file modes. Its
`.afe-source.lock` excludes cooperating writers and coherent snapshots. A busy
lock returns a retryable German `409`; it is not removed by another process.
A process killed while holding the lock requires explicit lock recovery.

This is atomic per file, not crash-atomic across several filesystem paths.
Uncooperative external writers must respect the lock to close the final
check/rename interval. A backend can supply `read`, optional `readRevision`,
optional `exclusive`, and `commit(files, {check, ...context})`. It must call
`check` under its write lock immediately before publication. Policy, permissions
and schema validation are intentionally outside this source-storage interface.

`editor/legacy-source-adapter.mjs` uses the same registry with Git snapshot reads.
It creates one candidate Git tree, atomically advances the draft ref with its
expected parent, installs the content files once and updates the main index in
one atomic `update-index` call. Write/index failures restore installed files and
the Git ref. Working-tree installation is not crash-atomic; recovery after a
killed process remains a later host concern. Binary media join the same Git
candidate after NativeStore's existing checks.

NativeStore retains validation, reference/domain rules, request-ID replay and
repository-wide serialization. Its public `decode`/`encode` methods also serve
the preview and now delegate to the codecs. The FlyingStars site adapter owns
legacy source placement and translates legacy IDs into tuple addresses. No
content-file write remains in NativeStore.

## PR 4 and PR 5

PR 4 can compile descriptors against raw input values and generic locators. It
must retain branch conditions, optional/default semantics and the separate
Markdown-body address. Do not treat the source codec as a validator for Astro
refinements, references, permissions or metadata vocabulary. The full policy
coordinator from sketch C remains future work; this PR provides its source layer.

PR 5 should replace the site adapter's legacy registrations with loader
provenance, while preserving current filenames and public legacy IDs through the
bridge. The adapter currently uses singular legacy prefixes as collection
addresses; actual Astro collection names must be mapped explicitly. Shared-file
provenance must carry whole-file hashes, not only PR 1's entry hashes. Refresh and
pruning of source registrations after manifest/watcher changes need lifecycle
coordination. The current legacy bridge registers only whole-file documents;
shared maps/arrays are exercised through the generic registry tests.

The real-source tests expect this worktree's content and the adjacent read-only
`freelance/editor-lab` fixtures. Packaging the tests later requires shipping or
injecting those fixture roots; the implementation modules have no such paths.
