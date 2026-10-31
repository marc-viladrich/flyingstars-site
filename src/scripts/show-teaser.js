// Startseiten-Teaser des Show-Konfigurators als Showreel (Marc, 31.10.2026): ein vorprogrammierter Ablauf „wie so ein
// Quick-Showreel“ durch die „Greatest Hits“ von SPARK über HORIZON bis ODYSSEY, mit lebendigen Wolken dazwischen und
// einem reduzierten, vor-animierten Wireframe des Konfigurators, das synchron zur Bühne Paket, Regler und Preis wechselt.
// Runde 8 (Marc):
// - Schärfe-Effekt: Das FlyingStars-Logo (das Lichtpunkt-Logo der Designsprache-Probe, ohne Ring) und der Drache
//   stehen mehrmals hintereinander mit wachsender Drohnenzahl; der Regler fährt mit, das Bild wird dichter und schärfer,
//   die Lichter etwas kleiner (beat.drones, show-field.js).
// - 600 Drohnen zeigt die 3D-Maske aus Bokkenrijders statt des Feuerwerks.
// - schneller (REEL_RATE 3), die Wolke kürzer und ruhiger (cloudTime, cloudSpread an createField)
// - jedes Motiv vollständig auf der Bühne (zoom < 1 an jedem Bild, Rand für Eigenbewegung und Tiefe)
// Dieselbe Engine und dieselben Motive wie der Konfigurator; das Tempo kommt nur aus der Show-Uhr, darum ohne Einrasten
// und ohne Finten. Geladen wird dieses Modul erst nahe am Viewport (ConfiguratorTeaser.astro); außerhalb des Viewports,
// bei globaler Pause und bei reduzierter Bewegung zeichnet die Engine nicht weiter.
import { OCCASIONS } from "../content/show-configurator.js";
import { SHOW_PACKAGES, DRONES_MIN, DRONES_MAX, configuratorPrice, packageForDrones } from "../content/show-packages.ts";
import { createField } from "./show-field.js";
import { buildSequence } from "./show-scenes.js";
import { liftColor } from "./formation/index.js";
import logoDots from "../data/logo-dots.json";

/** Tempo des Showreels gegenüber der Vorschau im Konfigurator (1×). */
export const REEL_RATE = 3;
/** Die lebendige Wolke im Showreel: 55 % der Mindestdauer, Bahnen halb so weit ausgestellt. */
export const REEL_CLOUD = { cloudTime: 0.55, cloudSpread: 0.5 };
/** Rand auf der Bühne: das Motiv füllt höchstens 82 % (Eigenbewegung, 3D-Tiefe, schmale Bühnen). */
const ZOOM = 0.82;

/**
 * Der Ablauf, vom einfachen 2D-Bild zur erzählten Geschichte, am Ende das Logo. pkg wird aus der Drohnenzahl gelesen.
 * sweep: dasselbe Motiv bei mehreren Drohnenzahlen hintereinander (Schärfe-Effekt). build: eine Fassung direkt (für den
 * Drachen als 3D-Körper bei jeder Drohnenzahl). beats: welche Bilder einer Geschichte (Index, negativ vom Ende).
 */
export const REEL = [
  { occasion: "hochzeit", motif: "herz", drones: [100] },
  { occasion: "hochzeit", motif: "falter", drones: [150] },
  { occasion: "launch", motif: "rakete", drones: [200] },
  { occasion: "kultur", motif: "tanz", drones: [250] },
  { occasion: "festival", motif: "drache", build: "dragon3d", label: "Drache", drones: [250, 350, 450] },
  { occasion: "launch", motif: "mond", drones: [450] },
  { occasion: "kultur", motif: "teufel", drones: [600] },
  { occasion: "launch", logo: true, label: "FlyingStars-Logo", drones: [100, 200, 300, 450, 600] },
];
/** Das Motiv, das bei reduzierter Bewegung als ruhiges Standbild steht (Index in REEL): die Bokkenrijders-Maske. */
export const STILL = 6;

/**
 * Das FlyingStars-Logo wie in der Designsprache-Probe (ohne Ring): selbst ein Raster aus 88 Lichtpunkten. Mit mehr Drohnen
 * kommen Lichter auf die Verbindungen zwischen benachbarten Punkten (wie DENSE in src/scripts/poc/page.js, aber stufenlos):
 * bei 100 Drohnen das Raster, bei 600 durchgehende, scharfe Linien. Farben aus den beiden Endpunkten gemischt.
 */
const DOTS = logoDots.dots.map(([x, y, r, g, b]) => [x, y, r, g, b]);
const EDGES = (() => {
  let d0 = Infinity;
  for (let i = 0; i < DOTS.length; i++) for (let j = i + 1; j < DOTS.length; j++) d0 = Math.min(d0, Math.hypot(DOTS[i][0] - DOTS[j][0], DOTS[i][1] - DOTS[j][1]));
  const out = [];
  for (let i = 0; i < DOTS.length; i++) for (let j = i + 1; j < DOTS.length; j++) if (Math.hypot(DOTS[i][0] - DOTS[j][0], DOTS[i][1] - DOTS[j][1]) < d0 * 1.2) out.push([i, j]);
  return out;
})();
export function logoPoints(n) {
  const pts = DOTS.slice(0, n).map(([x, y, r, g, b]) => [x, y, 0, ...liftColor([r, g, b])]);
  const extra = Math.max(0, n - DOTS.length), per = Math.floor(extra / EDGES.length), more = extra - per * EDGES.length;
  EDGES.forEach(([i, j], e) => {
    // gleichmäßig verteilt: jede Kante bekommt per Lichter, die ersten `more` Kanten (über das Logo gestreut) eines mehr
    const k = per + (((e * 37) % EDGES.length) < more ? 1 : 0), a = DOTS[i], b = DOTS[j];
    for (let q = 1; q <= k; q++) { const u = q / (k + 1); pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0, ...liftColor(a.slice(2).map((v, c) => Math.round(v + (b[2 + c] - v) * u)))]); }
  });
  return pts;
}
const logoBeat = (n) => ({ pts: logoPoints(n), hold: 2.2, run: true, caption: `Das FlyingStars-Logo aus ${n} Drohnen` });

/** Baut die Szene des Showreels: je Eintrag und Drohnenzahl die gewählten Bilder, in der Paketfarbe, als eigenes Motiv. */
export async function buildReel(reel = REEL) {
  const beats = [];
  for (const [segment, r] of reel.entries()) {
    const occasion = OCCASIONS.find((o) => o.id === r.occasion), motif = r.motif && occasion?.motifs.find((m) => m.id === r.motif);
    for (const [step, n] of r.drones.entries()) {
      const pkg = packageForDrones(n);
      let pick;
      if (r.logo) pick = [logoBeat(n)];
      else {
        const version = r.build ? { build: r.build, caption: r.label } : motif?.tiers[pkg];
        if (!version) throw new Error(`Showreel: ${r.occasion}/${r.motif} hat keine ${pkg}-Fassung`);
        const seq = await buildSequence([{ id: r.motif, label: r.label ?? motif.label, tiers: { [pkg]: { ...version, minDrones: 0 } } }], pkg, n, SHOW_PACKAGES[pkg].color, r.occasion);
        const all = seq.beats.filter((b) => !b.interlude);
        pick = r.beats ? r.beats.map((i) => all.at(i)) : all;
      }
      // die erste Zahl eines Motivs kommt aus der Wolke, jede weitere Stufe mit einem normalen Flug (das Bild verdichtet sich)
      pick.forEach((b, i) => beats.push({ ...b, segment, zoom: ZOOM, cloud: step === 0 && i === 0, drones: n, reel: { ...r, pkg, n } }));
    }
  }
  return { beats, loopTo: 0 };
}

/** Preis als Euro-Zeichen: 1 bis 6, je nach Preis der Drohnenzahl (SPARK 100 = €, ODYSSEY ab 450 = €€€€€€). */
export const euros = (n) => [7900, 12000, 15900, 20000, 34900, 50000].filter((p) => configuratorPrice(n) >= p).length;

/** Startet das Showreel in root (ein Element mit data-cft-root). Gibt eine Funktion zum Aufräumen zurück. */
export function initTeaser(root) {
  if (root.dataset.cftReady) return () => {};
  root.dataset.cftReady = "true";
  const q = (name) => root.querySelector(`[data-cft="${name}"]`);
  const all = (name) => [...root.querySelectorAll(`[data-cft="${name}"]`)];
  const pills = all("pill"), pkgs = all("pkg"), coins = all("euro"), thumb = q("thumb"), fill = q("fill"), count = q("count"), logo = q("logo");
  let last = { occasion: null, pkg: null, n: null };
  const press = (el) => { el.classList.remove("is-press"); void el.offsetWidth; el.classList.add("is-press"); };
  /** Das Wireframe folgt der Bühne: Paket, Regler mit Drohnenzahl, Euro-Zeichen; die Anlass-Pills nur, wenn der Anlass wechselt. */
  function sync(beat) {
    const r = beat.reel; if (!r) return;
    root.style.setProperty("--pkg", `rgb(${SHOW_PACKAGES[r.pkg].color.join(",")})`);
    if (r.occasion !== last.occasion) {
      const k = OCCASIONS.findIndex((o) => o.id === r.occasion);
      pills.forEach((p, i) => p.classList.toggle("is-on", i === k));
      if (pills[k] && last.occasion) press(pills[k]);
    }
    if (r.pkg !== last.pkg) { pkgs.forEach((p) => p.classList.toggle("is-on", p.dataset.id === r.pkg)); const on = pkgs.find((p) => p.dataset.id === r.pkg); if (on && last.pkg) press(on); }
    if (r.n !== last.n) {
      const at = (r.n - DRONES_MIN) / (DRONES_MAX - DRONES_MIN);
      thumb.style.setProperty("--at", String(at)); fill.style.setProperty("--at", String(at));
      count.textContent = String(r.n);
      const e = euros(r.n); coins.forEach((c, i) => c.classList.toggle("is-on", i < e));
    }
    logo.classList.toggle("is-on", Boolean(r.logo));
    last = { occasion: r.occasion, pkg: r.pkg, n: r.n };
  }
  const field = createField(q("field"), { onBeat: (k, beat) => sync(beat), ...REEL_CLOUD });
  field.setRate(REEL_RATE);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let done = false;
  buildReel().then((scene) => {
    if (done) return;
    const still = scene.beats.findIndex((b) => b.segment === STILL);
    // die erste Ansicht steht schon; bei reduzierter Bewegung ein starkes Motiv in Ruhe
    field.show(scene, 300, 1, { instant: true, at: reduce ? still : 0 });
    root.dataset.cftLoaded = "true";
  }).catch(() => { q("error").hidden = false; });
  return () => { done = true; };
}
