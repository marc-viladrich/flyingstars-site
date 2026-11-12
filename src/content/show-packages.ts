/** Prototype prices from FlyingStars' supplied Vercel reference, 24 September 2026.
 * Net, excluding travel. Customer approval is required before production release.
 */
import packageData from './show-packages.json' with {type:'json'};
export type ShowPackage = Exclude<keyof typeof packageData, 'services'>;
import {PACKAGE_NAMES as packageNames} from './package-identity.mjs';
import previewPolicy from './preview-policy.json' with {type:'json'};
export const PACKAGE_NAMES = packageNames as ShowPackage[];
export const SHOW_PACKAGES = Object.fromEntries(PACKAGE_NAMES.map(name=>[name,{...packageData[name],max:packageData[name].max??Infinity}])) as Record<ShowPackage,{base:number;max:number;price:number;step:number;add:number;color:number[];labelKey:string;orb:string}>;
// Source provenance travels with this computed view of the canonical JSON, never with displayed text.
Object.defineProperty(SHOW_PACKAGES,Symbol.for('afe.source'),{value:{owner:{collection:'showPackages',id:'configuration'},part:'data',path:[]}});
export function priceFor(name: ShowPackage, drones: number): number | null {
  const p = SHOW_PACKAGES[name];
  return drones > p.max ? null : p.price + Math.max(0, Math.ceil((drones - p.base) / p.step)) * p.add;
}
export function recommendPackage(drones: number): ShowPackage {
  return PACKAGE_NAMES.find((name,i)=>drones<=SHOW_PACKAGES[name].max&&(i===PACKAGE_NAMES.length-1||drones<SHOW_PACKAGES[PACKAGE_NAMES[i+1]].base)) ?? PACKAGE_NAMES.at(-1)!;
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
// Marc, 12.11.2026: ODYSSEY reicht in der Vorschau bis 1000 Drohnen.
// Preise folgen weiterhin dem bestehenden ODYSSEY-Aufpreis; die Policy bleibt vorläufig.
export const DRONE_RANGES_PLACEHOLDER = previewPolicy.placeholder;
export const DRONE_STEP = previewPolicy.step;
export const DRONE_RANGES = previewPolicy.ranges;
export const SPARK_EXTRA = previewPolicy.extension;
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
  if (name === SPARK_EXTRA.package && drones > SPARK_EXTRA.from) return (priceFor(name, SPARK_EXTRA.from) as number) + Math.ceil((drones - SPARK_EXTRA.from) / DRONE_STEP) * SPARK_EXTRA.add;
  return p.price + Math.max(0, Math.ceil((drones - p.base) / p.step)) * p.add;
}

/** Joint build invariant: the preview remains independent, but its prices must stay valid for the current commercial facts. */
export function assertPreviewPricing(): void {
  if (priceFor(SPARK_EXTRA.package as ShowPackage, SPARK_EXTRA.from) === null)
    throw new Error('Die Vorschau-Erweiterung beginnt außerhalb der kommerziellen Paketgrenze. Vorschaupolicy getrennt prüfen.');
  let previous = -Infinity;
  for (let drones = DRONES_MIN; drones <= DRONES_MAX; drones += DRONE_STEP) {
    const price = configuratorPrice(drones);
    if (!Number.isFinite(price) || price < previous)
      throw new Error(`Vorschaupreis bei ${drones} Drohnen ist ungültig oder fällt unter die vorige Stufe. Vorschaupolicy getrennt prüfen.`);
    previous = price;
  }
}
