// Runde 9 (Marc 19.11.2026, Cupra): „die Liniendichte, die ja auf automatisch gesetzt ist, die bleibt dann immer in der
// Mitte … wenn ich das Handle eins runtersetze, geht die Drohnenanzahl von 114 auf 233 hoch“.
// Ursache: Der Griff stand auf meta.density der Automatik (fast immer 0,6 = Stufe 8, die Mitte). Das ist aber die Punktdichte
// entlang der Zeilen bei der Kontur, die die Automatik für die Drohnenzahl gewählt hat; eine Stufe des Reglers ist dagegen
// eine feste Liniendichte, aus der die Drohnenzahl folgt (Konverter v10, opts.density). Beide Skalen sind nicht dieselbe:
// Cupra bei 100 Drohnen braucht automatisch 114, von Hand bei 0,6 aber 259, bei 0,51 schon 259, bei 0,15 erst 115.
// Darum gilt jetzt: Im Automatikzustand steht der Griff auf der Stufe, deren Bild dieselbe Drohnenzahl braucht wie das
// automatische Bild (gemessen, nicht geschätzt), und ein Schritt nach unten braucht nie mehr Drohnen als die Automatik.

// Runde 27, vierte Runde (Marc): unten drei Risikostufen, oben fünf Stufen mehr Detail für komplexe Wappen
export const DENSITIES = [0.07, 0.1, 0.12, 0.15, 0.24, 0.33, 0.42, 0.51, 0.6, 0.69, 0.78, 0.87, 0.96, 1.05, 1.3, 1.6, 2, 2.5, 3];
/** Höchste Stufe der roten Zone (Spur korallrot, „kann unleserlich werden“). */
export const RISKY = 2;

/**
 * Die Reglerstufe des automatischen Bilds aus gemessenen Drohnenzahlen je Stufe (counts: { stufe: zahl }).
 * Regel: die Stufe mit der Zahl am nächsten an der Automatik (bei Gleichstand die untere), aber nur eine, deren untere
 * Nachbarstufe gemessen ist und höchstens so viele Drohnen braucht wie die Automatik. Gibt null zurück, solange dafür
 * Messungen fehlen.
 */
export function densityIndexFromCounts(counts, auto) {
  const c = (i) => counts[i];
  const ok = (i) => i === 0 || (c(i - 1) != null && c(i - 1) <= auto);
  let best = null;
  for (let i = 0; i < DENSITIES.length; i++) {
    if (c(i) == null || !ok(i)) continue;
    const d = Math.abs(c(i) - auto);
    if (best === null || d < Math.abs(c(best) - auto)) best = i;
  }
  return best;
}

/**
 * Sucht die Stufe mit möglichst wenigen Messungen (eine Messung = eine Umrechnung im Worker, rund 1 s): kleinste Stufe,
 * deren Bild mindestens so viele Drohnen braucht wie die Automatik (binäre Suche, die Zahl steigt mit der Dichte), dazu
 * ihre untere Nachbarin und, wenn die näher liegt, deren Nachbarin. countAt(i) → Promise<Drohnenzahl>.
 * stopped() → true bricht ab (ein neues Logo, eine neue Drohnenzahl).
 */
export async function searchDensityIndex(countAt, auto, { stopped = () => false, counts = {} } = {}) {
  const at = async (i) => { if (counts[i] == null) { if (stopped()) throw new Error("stopped"); counts[i] = await countAt(i); } return counts[i]; };
  // Runde 10b (Marc 20.11.2026: „bei komplexeren hochgeladenen Logos wird die Liniendichte in der Mitte angesetzt, und wenn
  // ich sie runterschiebe, steigt die Drohnenanzahl“): Bei Wappen und anderen komplexen Logos geht die Automatik über das
  // grobe Ende der Skala hinaus (Konverter-Leiter „over“: Punkte weiter auseinander als bei Stufe 0; Arsenal-Wappen bei 200
  // Drohnen: Automatik 583, Stufe 0 schon 662). Dann gehört der Griff ganz nach unten. Zuerst Stufe 0 messen: das erspart
  // in diesem Fall die ganze Suche (eine Umrechnung statt sieben, im Browser 10–15 s statt über eine Minute, in der der
  // Griff blass in der Mitte stand und ein Schieben die Messung abbrach).
  if ((await at(0)) >= auto) return { index: 0, counts };
  let lo = 1, hi = DENSITIES.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if ((await at(mid)) >= auto) hi = mid; else lo = mid + 1; }
  await at(lo);
  if (lo > 0) await at(lo - 1);
  if (lo > 1 && Math.abs(counts[lo - 1] - auto) <= Math.abs(counts[lo] - auto)) await at(lo - 2);
  const index = densityIndexFromCounts(counts, auto);
  return { index: index ?? 0, counts };
}
