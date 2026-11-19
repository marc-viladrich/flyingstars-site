// Artefakt-Prüfung der 2D-Katalogmotive (Runde 9, Marc 19.11.2026: „dass wir halt Artefakte noch haben, wie jetzt beim
// Feuerwehrauto … da brauchen wir mehr Consistency“). Prüft die Szene so, wie der Konfigurator sie zeigt (Show-Art 2D,
// Ruhelage), für jedes 2D-Motiv und jede Drohnenzahl:
//   sichtbar  leuchtende Drohnen (ohne die graue Reserve), soll ≈ n sein
//   klumpen   Drohnen, deren nächster Nachbar näher steht als 0,45 · typischer Abstand (Klumpen, doppelte Linien)
//   luecken   Drohnen auf einer Linie, deren nächster Nachbar weiter weg ist als 2,6 · typischer Abstand (Sprünge,
//             abgerissene Linien, Streupunkte); gewollte Einzelpunkte des Katalogs (Sterne, Skalenstriche) zählen nicht
//   abseits   Drohnen weiter als 1,3 Katalog-Punktabstände vom Katalogbild (nicht bei von Hand idealisierten Formen)
// Aufruf: node scripts/catalog-2d-audit.mjs [100,200,300,399] [motiv …]   (Tabelle, Exit 1 bei Befund)
import './show-node-env.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { catalogScene, CATALOG, flatVariant, catalogMinDrones } = await import('../src/scripts/scenes/catalog.js');
const { prepareLines, stageSample } = await import('../src/scripts/scenes/catalog-resample.js');
const read = (path) => JSON.parse(readFileSync(new URL(`../public/media/katalog/${path}.json`, import.meta.url), 'utf8'));

export const LIMITS = { short: (n) => Math.max(3, Math.round(0.01 * n)), clumps: 0, gaps: 0, off: 0, ends: 0 };

/** Nächster-Nachbar-Abstände (Raster); mit `who` auch der Index des nächsten Nachbarn. */
function nearest(P, who = null) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const cell = Math.max(x1 - x0, y1 - y0) / 40 || 1, grid = new Map(), key = (x, y) => `${Math.floor((x - x0) / cell)},${Math.floor((y - y0) / cell)}`;
  P.forEach((p, i) => { const k = key(p[0], p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  return P.map((p, i) => {
    let best = Infinity, bj = -1;
    for (let r = 1; r < 40 && (best === Infinity || best > (r - 1) * cell); r++) {
      const gx = Math.floor((p[0] - x0) / cell), gy = Math.floor((p[1] - y0) / cell);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r && r > 1) continue;
        for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) if (j !== i) { const d = Math.hypot(P[j][0] - p[0], P[j][1] - p[1]); if (d < best) { best = d; bj = j; } }
      }
    }
    if (who) who[i] = bj;
    return best;
  });
}

/** Befunde eines Motivs bei n Drohnen. */
export async function audit(key, n) {
  const beat = (await catalogScene(key, 'SPARK', n, key)).beats.at(-1);
  // Motive mit Aktion (Anstoßen, Konfetti, Handschlag, Zwinkern) im Endbild der Aktion, sonst in der Ruhelage
  const t = beat.hold ?? 0, lit = [];
  const rest = []; // Index der Drohne (für ihren Elternpunkt im Katalog)
  beat.pts.forEach((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; beat.live(p, j, t, o); if (o[3] > 0.05) { lit.push([o[0], o[1]]); rest.push(j); } });
  const v = flatVariant(key, n), src = read(v.id).points, L = read(`linien/${v.id}`);
  const who = [], nn = nearest(lit, who), typical = [...nn].sort((a, b) => a - b)[nn.length >> 1];
  // gewollte Einzelpunkte: Drohnen, deren Elternpunkt im Katalog allein steht (Sterne, Konfetti, Skalenstriche)
  const iso = src.map((p, i) => !src.some((q, k) => k !== i && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1.6 * L.s0));
  const isDot = (j) => beat.parents ? iso[beat.parents[j]] === true : false;
  // Klumpen: nur wo eine neue Drohne beteiligt ist; zwei Katalogpunkte, die schon im Katalog so dicht stehen, bleiben als
  // Anker an ihrer Stelle (Runde 9) und werden getrennt gezählt
  const anchor = (i) => rest[i] < (beat.anchors ?? 0);
  const clumps = nn.filter((d, i) => d < 0.45 * typical && !(anchor(i) && anchor(who[i]))).length;
  const catalogPairs = nn.filter((d, i) => d < 0.45 * typical && anchor(i) && anchor(who[i])).length;
  // (Katalogpunkte selbst sind nie eine Lücke: Innenpunkte einer Fläche und Naben bleiben gewollt einzeln, Runde 9)
  const gaps = lit.filter((p, i) => nn[i] > 2.6 * typical && !isDot(rest[i]) && !(rest[i] < (beat.anchors ?? 0))).length;
  let off = 0;
  if (!L.shape && !beat.hold) { // Aktionen enden in ihrem eigenen Bild (Händedruck, gezogene Schnur), nicht im Katalog
    const s0 = L.s0;
    for (const p of lit) { let d = Infinity; for (const q of src) d = Math.min(d, Math.hypot(q[0] - p[0], q[1] - p[1])); if (d > 1.3 * s0) off++; }
  }
  // Lücken an Linienenden: ein freies Ende, das knapp vor einer anderen Linie aufhört, darf im Bild kein Loch zeigen
  // (entlang der Verbindung steht alle halben Abstände eine Drohne in Reichweite)
  let ends = 0;
  if (!L.field && !beat.hold) {
    for (const b of prepareLines(L).bridges) {
      if (b.d <= 1.2 * typical || b.d >= 2.5 * typical) continue;
      const k = Math.ceil(b.d / (0.5 * typical));
      for (let i = 1; i < k; i++) {
        const q = [b.from[0] + ((b.to[0] - b.from[0]) * i) / k, b.from[1] + ((b.to[1] - b.from[1]) * i) / k];
        if (!lit.some((p) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.85 * typical)) { ends++; break; }
      }
    }
  }
  // sichtbar soll sein, was die Bühne bei n zeigt (Reserve nur, wo auch die kleinsten Lichter die Linien nicht trennen)
  const expected = Math.min(n, stageSample(prepareLines(L), n).pts.length);
  return { key, n, visible: lit.length, reserve: n - expected, catalogPairs, ends, short: expected - lit.length, typical, clumps, gaps, off };
}

/** Alle 2D-Motive (ab ihrer Mindestzahl) bei den Zahlen. */
export async function auditAll(counts = [100, 200, 300, 399], keys = Object.keys(CATALOG).filter((k) => CATALOG[k].dimension !== '3D')) {
  const out = [];
  for (const key of keys) for (const n of counts) if (n >= catalogMinDrones(key)) out.push(await audit(key, n));
  return out;
}
export const failing = (r) => r.short > LIMITS.short(r.n) || r.short < 0 || r.clumps > LIMITS.clumps || r.gaps > LIMITS.gaps || r.off > LIMITS.off || r.ends > LIMITS.ends;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [countsArg, ...keys] = process.argv.slice(2);
  const rows = await auditAll(countsArg ? countsArg.split(',').map(Number) : undefined, keys.length ? keys : undefined);
  let bad = 0;
  for (const r of rows) { const f = failing(r); bad += f; if (f || process.env.ALLE) console.log(`${f ? '✖' : '✔'} ${r.key.padEnd(14)} ${String(r.n).padStart(3)}: sichtbar ${r.visible}, Klumpen ${r.clumps}, Lücken ${r.gaps}, offene Enden ${r.ends}, abseits ${r.off}`); }
  console.log(`${rows.length} Prüfungen, ${bad} mit Befund`);
  process.exit(bad ? 1 : 0);
}
