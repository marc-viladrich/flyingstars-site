// Text nodes with selected characters. A selection made by dragging often starts at the end of the text before a
// mark (WebKit: "dein |Stück"); a node the range only touches, or of which only spaces are selected, is not part
// of the selection. Used to tell whether selected words carry an inline mark.
export function selectedTextNodes(range) {
  const root = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT),
    out = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!range.intersectsNode(node)) continue;
    const start = node === range.startContainer ? range.startOffset : 0,
      end = node === range.endContainer ? range.endOffset : node.length;
    if (node.data.slice(start, end).trim()) out.push(node);
  }
  return out;
}
