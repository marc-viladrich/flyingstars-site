/** Prototype prices from FlyingStars' supplied Vercel reference, 24 September 2026.
 * Net, excluding travel. Customer approval is required before production release.
 */
export const SHOW_PACKAGES = {
  SPARK: { base: 100, max: 150, price: 7900, step: 10, add: 900, dur: 'ca. 10 Min', color: [255, 158, 41] },
  HORIZON: { base: 200, max: Infinity, price: 15900, step: 50, add: 4900, dur: 'ca. 13 Min', color: [219, 100, 232] },
  ODYSSEY: { base: 300, max: Infinity, price: 34900, step: 100, add: 9900, dur: '15+ Min', color: [51, 237, 242] },
} as const;
export type ShowPackage = keyof typeof SHOW_PACKAGES;
export const PACKAGE_NAMES = Object.keys(SHOW_PACKAGES) as ShowPackage[];
export function priceFor(name: ShowPackage, drones: number): number | null {
  const p = SHOW_PACKAGES[name];
  return drones > p.max ? null : p.price + Math.max(0, Math.ceil((drones - p.base) / p.step)) * p.add;
}
export function recommendPackage(drones: number): ShowPackage {
  return drones <= 150 ? 'SPARK' : drones < 300 ? 'HORIZON' : 'ODYSSEY';
}

/**
 * Drohnenzahl als dritte Achse des Show-Konfigurators (zwölfte Fassung, Marc 30.10.2026): Paket und Drohnenzahl
 * bestimmen den Preis. Jedes Paket hat einen eigenen Bereich; überschreitet der Regler die Grenze eines Pakets, wechselt
 * das Paket automatisch. So kostet HORIZON nie mehr als ODYSSEY.
 * Dreizehnte Fassung (Marc, 30.10.2026: „springt ständig hin und her“): Die Bereiche schließen lückenlos aneinander an.
 * Vorher lag zwischen SPARK (bis 150) und HORIZON (ab 200) eine Lücke, und der Regler wurde beim Ziehen in Bewegungs-
 * richtung über die Lücke gesetzt. Stand der Zeiger in der Lücke, sprang der Wert bei jedem Mausereignis zwischen 150
 * und 200 hin und her. Jetzt gehört jede Zehnerstufe genau einem Paket, der Regler wird nie umgesetzt.
 * SPARK reicht dafür bis 190. Die Einstiegspreise und der Aufpreis bis 150 Drohnen bleiben wie in der Referenz; für
 * 160–190 gilt ein eigener Aufpreis (SPARK_EXTRA), damit SPARK mit 190 Drohnen günstiger bleibt als HORIZON mit 200.
 * PLATZHALTER: Bereichsgrenzen und Aufpreise sind noch nicht mit FlyingStars geklärt.
 */
export const DRONE_RANGES_PLACEHOLDER = true;
export const DRONE_STEP = 10;
export const DRONE_RANGES: Record<ShowPackage, { min: number; max: number }> = {
  SPARK: { min: 100, max: 190 },
  HORIZON: { min: 200, max: 290 },
  ODYSSEY: { min: 300, max: 600 },
};
/** SPARK über der Referenzgrenze (150): Aufpreis je 10 Drohnen, Platzhalter. 190 Drohnen = 12.400 € + 4 × 700 € = 15.200 €. */
export const SPARK_EXTRA = { from: 150, add: 700 };
export const DRONES_MIN = DRONE_RANGES.SPARK.min;
export const DRONES_MAX = DRONE_RANGES.ODYSSEY.max;

/** Paket, dessen Bereich die Drohnenzahl enthält (außerhalb des Gesamtbereichs: das nächstgelegene). */
export function packageForDrones(drones: number): ShowPackage {
  let best: ShowPackage = 'SPARK', gap = Infinity;
  for (const name of PACKAGE_NAMES) {
    const { min, max } = DRONE_RANGES[name], d = drones < min ? min - drones : drones > max ? drones - max : 0;
    if (d < gap) { gap = d; best = name; }
  }
  return best;
}

/** Wählbare Drohnenzahl: auf Schritt gerundet und im Gesamtbereich. Seit der dreizehnten Fassung gibt es keine Lücke
 * mehr; `from` bleibt für Aufrufer erhalten und ändert nichts. */
export function snapDrones(drones: number, _from = drones): number {
  return Math.min(DRONES_MAX, Math.max(DRONES_MIN, Math.round(drones / DRONE_STEP) * DRONE_STEP));
}

/** Drohnenzahl im Bereich eines Pakets, möglichst nah an der bisherigen (Klick auf einen Paketknopf). */
export const clampToPackage = (name: ShowPackage, drones: number) => Math.min(DRONE_RANGES[name].max, Math.max(DRONE_RANGES[name].min, drones));

/** Preis für Paket und Drohnenzahl im Konfigurator (Formel wie priceFor, dazu SPARK_EXTRA; Aufpreise sind Platzhalter). */
export function configuratorPrice(drones: number): number {
  const name = packageForDrones(drones), p = SHOW_PACKAGES[name];
  if (name === 'SPARK' && drones > SPARK_EXTRA.from) return (priceFor('SPARK', SPARK_EXTRA.from) as number) + Math.ceil((drones - SPARK_EXTRA.from) / DRONE_STEP) * SPARK_EXTRA.add;
  return p.price + Math.max(0, Math.ceil((drones - p.base) / p.step)) * p.add;
}
