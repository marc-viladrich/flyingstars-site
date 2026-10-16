import { decodeMarker, flattenMarker, markerAddresses, addressKey, renderedOwner, sameOwner } from './protocol.mjs';
export { decodeMarker } from './protocol.mjs';
export const markersOf = element => flattenMarker(decodeMarker(element?.getAttribute?.('data-afe')));
const nodes = root => [...(root?.hasAttribute?.('data-afe') ? [root] : []), ...root.querySelectorAll('[data-afe]')];
const itemOf = node => markersOf(node).find(marker => marker.kind === 'item') ?? null;
const identityKey = marker => {
  const owner = renderedOwner(marker);
  return JSON.stringify([marker.occurrence, owner?.collection, owner?.id, marker.membership ? addressKey(marker.membership) : null]);
};
export const sameOccurrence = (a, b) => !!a && !!b && identityKey(a.identity ?? a) === identityKey(b.identity ?? b);

/** The outermost item is the card being inspected. Nested items are its parts. */
export function occurrenceOf(element) {
  let result = null;
  for (let node = element; node; node = node.parentElement) {
    const identity = itemOf(node);
    if (identity) result = { node, identity };
  }
  return result;
}
function unique(bindings) {
  const seen = new Set();
  return bindings.filter(binding => {
    const key = addressKey(binding.address);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
/** Direct rendered dependencies, including panel fields, media, colors and uses. */
export function renderedFields(root) {
  return unique(nodes(root).flatMap(node => markersOf(node).flatMap(marker => markerAddresses(marker).map(address => ({ address, kind: marker.kind })))));
}
export const elementMarkers = element => markersOf(element).flatMap(marker => markerAddresses(marker).map(address => ({ address, kind: marker.kind })));

/** Aggregate all wrappers for this occurrence, preserving mixed record owners.
 * A nested membership owned by the outer item stands for that whole entry. */
export function occurrenceMarkers(root, occurrence) {
  const identity = occurrence?.identity ?? occurrence;
  if (!identity) return [];
  const owner = identity.membership?.owner ?? renderedOwner(identity), result = [];
  for (const wrapper of nodes(root).filter(node => sameOccurrence(itemOf(node), identity)
    && !occurrenceOf(node.parentElement))) {
    for (const node of nodes(wrapper)) {
      let via;
      for (let parent = node; parent && parent !== wrapper; parent = parent.parentElement) {
        const member = itemOf(parent)?.membership;
        if (member && sameOwner(member.owner, owner)) via = member;
      }
      if (via) { result.push({ address: via, kind: 'entry' }); continue; }
      result.push(...elementMarkers(node));
      const membership = node !== wrapper && itemOf(node)?.membership;
      if (membership) result.push({ address: membership, kind: 'entry' });
    }
  }
  return unique(result);
}
