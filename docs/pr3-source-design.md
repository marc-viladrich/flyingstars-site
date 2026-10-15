# PR 3 source boundary

## Phases

- Ground: traced save/replay, preview decode/encode, site layout and PR 1 locators.
- Sketch: compared mutable YAML document serialization with lexical span edits.
- Agree: lexical edits selected; no human checkpoint requested.
- Implement: codecs, registry and legacy bridge completed; real-source and failure-path tests added.
- Scrap: no site semantics were needed in the core boundary.

## Chosen interface

```js
const registry = new SourceRegistry({root, sources});
const record = await registry.read({collection, id});
const tx = registry.begin(record.revision); // immutable file-hash snapshot
await tx.stage({kind: 'set', address: {collection, id}, path: ['title'], value: 'Neu'});
await tx.commit();
```

`revision` contains complete file hashes, including comments and sibling entries.
A transaction reads its baseline, stages operations in memory, then checks every
file before writing any file. One temporary-file rename per changed file. Writers
using this registry share a filesystem lock. Arbitrary external writers must
respect that lock for protection across the final check/rename interval.

Codecs expose `parse(bytes)`, `update(bytes, path, value)`, `create(value)` and
structural edits. JSON uses a lexical tree; YAML uses the installed parser's CST
ranges. Markdown delegates frontmatter edits to YAML and treats its body as one
span. Unchanged values return the original bytes. Serializing the complete YAML
document was rejected because it changes unrelated formatting and comments.

The legacy adapter supplies Git snapshot reads and the existing atomic Git commit
protocol. NativeStore retains schema/domain validation and durable request replay.
The site adapter alone maps legacy IDs onto collection addresses and source files.
The core has no Astro/site imports. PR 4 can consume raw values and locators; PR 5
can replace legacy registrations with loader provenance without changing codecs.

This PR implements the source transaction layer, not the full policy/validation
coordinator from architecture sketch C. Git revision publication remains in the
legacy adapter until those policies are extracted.

The implemented API and backend limits are documented in [source-registry.md](source-registry.md).
