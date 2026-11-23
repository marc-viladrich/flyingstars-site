/** Teilt laufende und erfolgreiche Importe. Ein Fehler gibt den nächsten Versuch frei. */
export function once(load) {
  let pending;
  return () => (pending ??= load().catch((error) => {
    pending = undefined;
    throw error;
  }));
}
