// Relationships both ways: which records point at a record through a schema reference (x-afe `reference`
// in the record's schema description), derived over all draft records. New declared references appear automatically.
import { referenceFields } from "../core/metadata.mjs";
import { extensions,resolveReference } from "./site-adapter.mjs";

// Overlay documents (translations) belong to their source record and are not relationships of their own.
const ownerless=id=>extensions.some('ownerless',id);

/** Returns [{ owner, paths: [path, …] }] in record order, one entry per referencing record. */
export function incomingReferences(records, target, { resolve = resolveReference } = {}) {
  if (!target || ownerless(target.id)) return [];
  const out = [];
  for (const owner of records) {
    if (owner.id === target.id || ownerless(owner.id) || !owner.schema) continue;
    const paths = referenceFields(owner.schema, owner.data)
      .filter((field) => resolve(records, field.value, field.reference)?.id === target.id)
      .map((field) => field.path);
    if (paths.length) out.push({ owner, paths });
  }
  return out;
}
