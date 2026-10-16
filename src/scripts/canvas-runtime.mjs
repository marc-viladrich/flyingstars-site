// Native canvas lifecycle. Controllers own their settings; the editor only patches DOM.
// Each registration also discovers inserted canvases after a structural preview replacement.
export function registerCanvas(selector, initialize, { attributes = [], scope: scopeSelector } = {}) {
  const active = new Map();
  function mount(canvas, saved) {
    const scope = scopeSelector ? canvas.closest(scopeSelector) : canvas;
    const abort = new AbortController(), observers = [], frames = new Set(), cleanups = [];
    let snapshot;
    const life = {
      signal: abort.signal,
      scope,
      listen(target, type, handler, options = {}) { target?.addEventListener(type, handler, { ...options, signal: abort.signal }); },
      observe(observer, target) { observers.push(observer); observer.observe(target); return observer; },
      raf(callback) {
        if (abort.signal.aborted) return 0;
        const id = requestAnimationFrame(time => { frames.delete(id); if (!abort.signal.aborted) callback(time); });
        frames.add(id); return id;
      },
      cancelFrame(id) { cancelAnimationFrame(id); frames.delete(id); },
      cleanup(callback) { cleanups.push(callback); },
      preserve(callback) { snapshot = callback; },
    };
    const entry = { dispose() {
      const state = snapshot?.();
      abort.abort(); observers.forEach(observer => observer.disconnect()); frames.forEach(cancelAnimationFrame); cleanups.forEach(fn => fn());
      delete canvas.dataset.canvasLive;
      return state;
    } };
    active.set(canvas, entry);
    initialize(canvas, life, saved);
    canvas.dataset.canvasLive = 'true';
    // Attribute batches are delivered after all patches, never halfway through a render.
    const settings = new MutationObserver(() => {
      if (active.get(canvas) !== entry || !canvas.isConnected) return;
      mount(canvas, entry.dispose());
    });
    observers.push(settings);
    if (attributes.length) settings.observe(canvas, { attributes: true, attributeFilter: attributes });
    if (scope !== canvas) settings.observe(scope, { attributes: true, attributeFilter: ['data-runtime'] });
    life.listen(canvas, 'native:canvas-update', () => mount(canvas, entry.dispose()));
  }
  function reconcile() {
    for (const [canvas, entry] of active) if (!canvas.isConnected || !canvas.matches(selector)) { entry.dispose(); active.delete(canvas); }
    for (const canvas of document.querySelectorAll(selector)) if (!active.has(canvas)) mount(canvas);
  }
  const tree = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('canvas') || node.querySelector('canvas'))))) reconcile();
  });
  reconcile();
  tree.observe(document.documentElement, { childList: true, subtree: true });
  return () => { tree.disconnect(); for (const entry of active.values()) entry.dispose(); active.clear(); };
}
