/** Load an optional enhancement near its element, or as soon as someone interacts.
 * Concurrent triggers share a promise; a failed download can be retried. */
const observerDefaults = { rootMargin: '600px 0px' };
export function whenNear(element, load, { rootMargin = observerDefaults.rootMargin } = {}) {
  let pending;
  let observer;
  const events = ['focusin', 'pointerenter', 'pointerdown'];
  const cleanup = () => {
    observer?.disconnect();
    events.forEach((event) => element.removeEventListener(event, trigger));
  };
  const go = () => {
    if (!pending) pending = Promise.resolve().then(load).then((value) => {
      cleanup();
      return value;
    }, (error) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  const trigger = () => { void go().catch((error) => console.warn('Optional enhancement could not load', error)); };
  events.forEach((event) => element.addEventListener(event, trigger, { passive: true }));
  if ('IntersectionObserver' in globalThis) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) trigger();
    }, { rootMargin });
    observer.observe(element);
  } else trigger();
  return go;
}
