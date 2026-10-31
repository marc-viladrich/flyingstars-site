// Web Worker: rechnet Formationen abseits des Hauptthreads (siehe shape-core.js)
import { analyze, sampleShape } from './shape-core.js';
self.onmessage = e => {
  const { id, rgba, w, h, M, invert, canCrop, n } = e.data;
  const a = analyze(rgba, w, h, M, { invert, canCrop });
  self.postMessage(a.crop ? { id, crop: a.crop } : { id, points: sampleShape(a, n) });
};
