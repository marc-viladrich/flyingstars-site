// Textplaner im Worker (Runde 6, 18.11.2026): textFormation() rechnet je Wort und Drohnenzahl mehrere hundert Millisekunden am
// Stück (Jahreszahl der Silvester-Geschichte bei 4× Drossel 513 ms). Im Worker bleibt der Konfigurator dabei bedienbar.
import { loadTextEngine, textFormation } from './text-formation.js';

self.onmessage = async ({ data: { id, value, count } }) => {
  try {
    await loadTextEngine();
    self.postMessage({ id, result: textFormation(value, count) });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message ?? error) });
  }
};
