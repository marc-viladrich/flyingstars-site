// A server fragment has no running controllers. The site's canvas registry discovers
// connected copies automatically; offline fallback fragments wait for a page reload.
export function prepareClonedSection(copy, { livePreview = false } = {}) {
  const revealTargets = [copy, ...copy.querySelectorAll('[data-reveal-group],.member')]
    .filter(node => node.hasAttribute('data-reveal-group') || node.classList.contains('member'));
  for (const node of revealTargets) {
    node.classList.remove('pre');
    if (node.classList.contains('member')) node.classList.add('shown');
  }
  const canvases = [...copy.querySelectorAll('canvas')];
  copy.classList.remove('native-copy-pending');
  copy.querySelector('[data-editor-runtime-note]')?.remove();
  for (const canvas of canvases) {
    delete canvas.dataset.running;
    delete canvas.dataset.canvasLive;
    // Keep the server's hidden setting (e.g. showOrb=false) when live preview is available.
    if (!livePreview) canvas.hidden = true;
  }
  if (canvases.length && !livePreview) {
    copy.classList.add('native-copy-pending');
    const note = copy.ownerDocument.createElement('p');
    note.dataset.editorRuntimeNote = 'true';
    note.dataset.editor = 'runtime-note';
    note.className = 'native-runtime-note';
    note.textContent = 'Live-Vorschau nicht verfügbar. Animationen erscheinen nach dem Speichern und Neuladen.';
    copy.prepend(note);
  }
  return { revealedNodes: revealTargets.length, pendingCanvases: livePreview ? 0 : canvases.length };
}
