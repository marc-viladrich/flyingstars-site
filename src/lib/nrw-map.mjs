// Erzeugt von tools/standort/nrw-punkte.mjs, nicht von Hand ändern.
export const NRW_MAP = {"minLon":5.8525,"maxLat":52.5242,"k":0.6225146366376196,"scale":400,"pad":12,"width":923,"height":905};
/** Lage eines Orts auf public/media/standort-nrw.svg in Prozent der Bildbreite und -höhe. */
export function nrwPosition(lat, lon) {
  const {minLon, maxLat, k, scale, pad, width, height} = NRW_MAP;
  return {x: (pad + (lon - minLon) * k * scale) / width * 100, y: (pad + (maxLat - lat) * scale) / height * 100};
}
