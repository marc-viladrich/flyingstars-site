import { lightRank, trace } from '../show-motion.js';
import { reserve, say } from './catalog-beat.js';
import { LIT_MAX } from './catalog-3d/load.js';

// Runde 6 (Marc, 18.11.2026: „proper 3D versions of each motif … not just adding a second plane“): eigene 3D-Fassungen
// (scenes/catalog-3d/, Methode in docs/katalog-3d.md) für die Show-Arten 3D und Storytelling. Die Figur wird einmal je
// Drohnenzahl gebaut und zwischengespeichert; Drohnen über LIT_MAX warten dunkel hinter der Form.
const bodies = new Map();
// Runde 9 (3D-Agent, /tmp/fs-r9/b/BERICHT.md): jede Fassung baut je Stufe eine eigene Form, 3D für die Show-Art 3D
// (HORIZON), 3D+ für Storytelling (ODYSSEY); die Stufe gehört deshalb in den Zwischenspeicher-Schlüssel.
function body3d(builder, key, k, stufe) {
  const id = `${key}|${k}|${stufe}`;
  if (!bodies.has(id)) {
    if (bodies.size > 40) bodies.clear();
    // Die Punkte sind die Ruhelage bei t = 0 (Dreiviertelansicht, Hut auf dem Kopf …), damit jede Drohne genau auf ihrem
    // Platz startet; die Bewegung rechnet weiter vom Bauzustand aus.
    const { pts: built, live } = builder(k, stufe);
    const pts = built.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(p, j, 0, o); return [o[0], o[1], o[2], p[3], p[4], p[5]]; });
    bodies.set(id, { pts, live: (b, j, t, o) => { const q = built[j]; o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; live(q, j, t, o); } });
  }
  return bodies.get(id);
}
export function bodyScene(builder, key, tier, n, name) {
  const stufe = tier === 'ODYSSEY' ? '3D+' : '3D';
  const k = Math.min(n, LIT_MAX), { pts: front, live } = body3d(builder, key, k, stufe), rest = reserve(n - k, front);
  const run = (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } live(b, j, t, o); };
  // im Bild bleibt, was der Körper beim Schwenken überstreicht
  const fit = [0, 2, 4, 6, 8, 10].flatMap((t) => front.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(p, j, t, o); return o.slice(0, 3); }));
  const beat = { pts: [...front, ...rest], fitPts: fit, live: run, shimmer: false, catalog3d: true };
  if (tier !== 'ODYSSEY') return { beats: [{ ...beat, caption: say('body', name) }] };
  const order = lightRank(front);
  return { beats: [
    { ...beat, caption: say('lightDraws', name), hold: 1.6, live: (b, j, t, o) => { if (j >= k) { o[3] = 0; return; } live(b, j, 0, o); o[3] *= trace(order[j], t, 2.2); } },
    { ...beat, caption: say('comesAlive', name) },
  ] };
}
