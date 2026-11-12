// Web Worker: rechnet Formationen abseits des Hauptthreads (siehe shape-core.js)
import { analyze, sampleShape, sampleShapeLegacy } from './shape-core.js';
self.onmessage = e => {
  const { id, rgba, w, h, M, invert, canCrop, n, sampler } = e.data;
  const a = analyze(rgba, w, h, M, { invert, canCrop });
  if (a.crop) { self.postMessage({ id, crop: a.crop }); return; }
  // Runde 26: der Strichgraph (sampleShape) nur auf Wunsch (Logo-Upload im Konfigurator); alles andere wie bisher
  const points = sampler === 'stroke' ? sampleShape(a, n) : sampleShapeLegacy(a, n);
  self.postMessage({ id, points, meta: points.meta ?? null });
};
