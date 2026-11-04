import { localeFromPath, localeFormat } from '../i18n/routing.mjs';
const locale = localeFromPath(location.pathname);
const formatLocale = localeFormat(locale);
const { OCCASIONS } = getConfiguratorContent(locale);
import { t as message } from '../i18n/ui.mjs';
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
// Runde 9 (Marc):
// - drei Abläufe (REELS): „start“ (Startseite), „marke“ (Werbung, corporate Motive) und „hochzeit“; die Komponente
//   wählt mit der Prop `reel`, das Skript liest data-reel
// - das FlyingStars-Logo zuerst: 100 → 200 → 300 Drohnen, ab da sieht es aus, wie es soll; bei 450 und 600 kommt der
//   Schriftzug FLYINGSTΛRS über den Einstrich-Textplaner dazu (Logo mit Schriftzug wie in der Designsprache-Probe)
// - der Kolibri über die drei Pakete (2D, 3D, Geschichte) statt der Drachen-Steigerung
// - Euro-Zeichen in acht Stufen, jede Drohnenzahl im Ablauf hat ihre eigene
// - bei der Hochzeit statt des Logos die Initialen „A & B“ im Herz, ebenfalls mit wachsender Drohnenzahl
// Runde 10 (Marc):
// - FLYINGSTΛRS bei 600 Drohnen deutlich größer als bei 450 (die Schrift trägt die zusätzlichen Drohnen)
// - das Herz zeigt die drei Pakete (2D, Herztunnel, Amors Pfeil in 3D) statt des Kolibris; die Rakete hebt ab und landet
//   auf dem Mond, ohne den Orbit; die QR-Code-Geschichte (Nachricht → Code → „Scan me“) in start und marke
// - „Platz für euer Logo“ statt des erklärenden Satzes; jeder Ablauf unter 25 s
// Dieselbe Engine und dieselben Motive wie der Konfigurator; das Tempo kommt nur aus der Show-Uhr, darum ohne Einrasten
// und ohne Finten. Geladen wird dieses Modul erst nahe am Viewport (ConfiguratorTeaser.astro); außerhalb des Viewports,
// bei globaler Pause und bei reduzierter Bewegung zeichnet die Engine nicht weiter.
import { getConfiguratorContent } from "../content/show-configurator.js";
import { SHOW_PACKAGES, DRONES_MIN, DRONES_MAX, configuratorPrice, packageForDrones } from "../content/show-packages.ts";
import { createField } from "./show-field.js";
import { buildSequence } from "./show-scenes.js";
import { liftColor } from "./formation/index.js";
import logoDots from "../data/logo-dots.json";

/** Tempo des Showreels gegenüber der Vorschau im Konfigurator (1×). */
export const REEL_RATE = 3.4; // Runde 10: jeder Ablauf unter 25 s
/** Die lebendige Wolke im Showreel: 55 % der Mindestdauer, Bahnen halb so weit ausgestellt. */
export const REEL_CLOUD = { cloudTime: 0.55, cloudSpread: 0.5 };
/** Rand auf der Bühne: das Motiv füllt höchstens 82 % (Eigenbewegung, 3D-Tiefe, schmale Bühnen). */
const ZOOM = 0.82;

/**
 * Die Abläufe. Je Eintrag ein Motiv; drones: eine oder mehrere Drohnenzahlen hintereinander (das Paket folgt aus der
 * Zahl, die erste Stufe kommt aus der lebendigen Wolke, jede weitere mit einem normalen Flug). kind: "logo" (das
 * FlyingStars-Logo, ab 450 mit Schriftzug) oder "text" (eigener Text über den Textplaner, value/style). beats: welche
 * Bilder einer Geschichte (Index, negativ vom Ende). note: Schrift unten auf der Bühne ([fett, Rest]).
 * still: das Motiv, das bei reduzierter Bewegung in Ruhe steht (Index im Ablauf).
 */
const LOGO_NOTE = [message('showTeaser.spaceForYourLogo'), ""];
// Rakete: aus der Geschichte nur die Zündung (sie beginnt auf der Rampe), dann direkt die Landung (ohne Orbit, Marc Runde 10)
const ROCKET = [
  { occasion: "launch", motif: "rakete", drones: [450], beats: [1] }, // die Zündung beginnt auf der Rampe
  { occasion: "launch", motif: "mond", drones: [450], beats: [-1], cloud: false },
];
// das Herz über die drei Pakete: ein Herz in 2D, der Herztunnel, Amors Pfeil trifft ein Herz in 3D
const HEART = { occasion: "hochzeit", motif: "herz", drones: [100, 200, 300], beats: { ODYSSEY: [1] } }; // in 3D: der Pfeil trifft
const QR = { occasion: "launch", motif: "qr", drones: [300] };
export const REELS = {
  start: { still: 5, label: message('configuratorteaser.theFlyingstarsLogoBecomingSharperWithMoreDronesAHeart'), items: [
    { occasion: "launch", kind: "logo", drones: [100, 300, 450, 600], note: LOGO_NOTE },
    HEART,
    QR,
    ...ROCKET,
    { occasion: "kultur", motif: "teufel", drones: [600] },
  ] },
  marke: { still: 5, label: message('configuratorteaser.aLogoBecomingSharperWithMoreDronesALightBulb'), items: [
    { occasion: "launch", kind: "logo", drones: [100, 300, 450, 600], note: LOGO_NOTE },
    { occasion: "launch", motif: "idee", drones: [100] },
    { occasion: "launch", motif: "spirale", drones: [150] },
    QR,
    ...ROCKET,
  ] },
  hochzeit: { still: 4, label: message('configuratorteaser.initialsInsideAHeartAHeartIn2dAsA'), items: [
    { occasion: "hochzeit", kind: "text", value: "Anna & Ben", style: "initials", drones: [100, 200, 300], beats: [0], note: [message('showTeaser.yourInitials'), message('showTeaser.inTheSky')] },
    HEART,
    { occasion: "hochzeit", motif: "glaeser", drones: [200] },
    { occasion: "hochzeit", motif: "ring", drones: [250] },
    { occasion: "hochzeit", motif: "antrag", drones: [450] },
  ] },
};
/** Ablauf der Startseite (bleibt für bestehende Aufrufe). */
export const REEL = REELS.start.items;
export const STILL = REELS.start.still;

/**
 * Das FlyingStars-Logo wie in der Designsprache-Probe (ohne Ring): selbst ein Raster aus 88 Lichtpunkten. Mit mehr Drohnen
 * kommen Lichter auf die Verbindungen zwischen benachbarten Punkten (wie DENSE in der früheren Designsprache-Probe, aber stufenlos):
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
const FS_GRAD = [[255, 158, 41], [219, 100, 232], [51, 237, 242]];
const gradAt = (u) => { const t = Math.max(0, Math.min(1, u)) * 2, i = Math.min(1, Math.floor(t)), f = t - i; return FS_GRAD[i].map((v, c) => Math.round(v + (FS_GRAD[i + 1][c] - v) * f)); };
/** Ab dieser Drohnenzahl sieht das Logo aus, wie es soll; was darüber hinausgeht, schreibt den Schriftzug darunter. */
export const LOGO_FULL = 300;
async function logoBeat(n) {
  if (n <= LOGO_FULL) return { pts: logoPoints(n), hold: 2.2, run: true, frame: "mark", caption: message('showTeaser.theFlyingstarsLogoMadeOfValueDrones', { v0: n }) };
  // Logo oben (verkleinert), darunter FLYINGSTΛRS in der Druckschrift des Textplaners im FlyingStars-Verlauf
  // die Schrift trägt die zusätzlichen Drohnen: bei 450 klein unter dem Logo, bei 600 deutlich größer (Runde 10)
  const big = n >= 600, mark = logoPoints(LOGO_FULL).map(([x, y, z, ...c]) => [x * 0.6, y * 0.6 + 0.42, z, ...c]);
  const { lettering } = await import("./scenes/text.js");
  const text = await lettering("FlyingStars", "print", n - LOGO_FULL, big ? 1.7 : 0.8);
  const ys = text.map((p) => p[1]), top = Math.max(...ys), x0 = Math.min(...text.map((p) => p[0])), x1 = Math.max(...text.map((p) => p[0]));
  const word = text.map(([x, y]) => [x, y - top - (big ? 0.34 : 0.4), 0, ...gradAt((x - x0) / (x1 - x0 || 1))]);
  return { pts: [...mark, ...word], hold: 2.6, run: true, frame: "brand", caption: message('showTeaser.theFlyingstarsLogoWithLetteringMadeOfValueDrones', { v0: n }) };
}

/** Baut die Szene eines Ablaufs: je Eintrag und Drohnenzahl die gewählten Bilder, in der Paketfarbe, als eigenes Motiv.
 * Jede Stufe bekommt ihren eigenen Bildausschnitt (frame), damit ein 2D-Bild nicht nach dem Rahmen einer Geschichte
 * skaliert wird; das Logo behält seinen Maßstab über 100–300 Drohnen. */
export async function buildReel(reel = REEL) {
  const items = Array.isArray(reel) ? reel : (REELS[reel] ?? REELS.start).items, beats = [];
  for (const [segment, r] of items.entries()) {
    const occasion = OCCASIONS.find((o) => o.id === r.occasion), motif = r.motif && occasion?.motifs.find((m) => m.id === r.motif);
    for (const [step, n] of r.drones.entries()) {
      const pkg = packageForDrones(n);
      let pick;
      if (r.kind === "logo") pick = [await logoBeat(n)];
      else {
        const version = r.kind === "text" ? { build: `text${pkg}`, caption: message('showTeaser.yourInitials'), value: r.value, style: r.style, occasion: r.occasion } : r.build ? { build: r.build, caption: r.label } : motif?.tiers[pkg];
        if (!version) throw new Error(`Showreel: ${r.occasion}/${r.motif} hat keine ${pkg}-Fassung`);
        const seq = await buildSequence([{ id: r.motif ?? r.kind, label: r.label ?? motif?.label ?? "Text", tiers: { [pkg]: { ...version, minDrones: 0 } } }], pkg, n, SHOW_PACKAGES[pkg].color, r.occasion);
        const all = seq.beats.filter((b) => !b.interlude);
        const which = Array.isArray(r.beats) ? r.beats : r.beats?.[pkg];
        pick = (which ? which.map((i) => all.at(i)) : all).map((b) => ({ ...b, frame: `${b.frame ?? ""}#${step}` }));
        // eigener Text: im Konfigurator schreibt er sich aus dem Dunkel; in der Steigerung soll er stehen bleiben und nur
        // dichter werden (wie das Logo), darum ohne Schreib-Licht, mit Lichtlauf und eigenem Ausschnitt je Paket
        if (r.kind === "text") pick = pick.map((b) => ({ ...b, live: undefined, run: true, hold: 2.2 }));
      }
      pick.forEach((b, i) => beats.push({ ...b, segment, zoom: ZOOM, cloud: r.cloud !== false && step === 0 && i === 0, drones: n, reel: { ...r, pkg, n } }));
    }
  }
  return { beats, loopTo: 0 };
}

/** Preis als Euro-Zeichen in acht Stufen, nach dem Preis der Drohnenzahl: 100 = €, 150 = €€, 200 = €€€, 250 = €€€€,
 * 300 = €€€€€, 400 = 6, 450 = 7, ab 510 = 8 (Runde 9: jede Drohnenzahl im Ablauf sichtbar ein € mehr). */
export const EURO_STEPS = [7900, 12000, 15900, 20000, 34900, 44000, 54000, 64000];
export const euros = (n) => EURO_STEPS.filter((p) => configuratorPrice(n) >= p).length;

/** Startet das Showreel in root (ein Element mit data-cft-root, Ablauf in data-reel). Gibt eine Funktion zum Aufräumen zurück. */
export function initTeaser(root) {
  if (root.dataset.cftReady) return () => {};
  root.dataset.cftReady = "true";
  const reel = REELS[root.dataset.reel] ? root.dataset.reel : "start";
  const q = (name) => root.querySelector(`[data-cft="${name}"]`);
  const all = (name) => [...root.querySelectorAll(`[data-cft="${name}"]`)];
  const pkgs = all("pkg"), coins = all("euro"), thumb = q("thumb"), fill = q("fill"), count = q("count"), note = q("note");
  let last = { pkg: null, n: null, note: null };
  const press = (el) => { el.classList.remove("is-press"); void el.offsetWidth; el.classList.add("is-press"); };
  /** Das Wireframe folgt der Bühne: Paketknopf, Regler mit Drohnenzahl, Euro-Zeichen; dazu die Schrift unten auf der Bühne. */
  function sync(beat) {
    const r = beat.reel; if (!r) return;
    root.style.setProperty("--pkg", `rgb(${SHOW_PACKAGES[r.pkg].color.join(",")})`);
    if (r.pkg !== last.pkg) { pkgs.forEach((p) => p.classList.toggle("is-on", p.dataset.id === r.pkg)); const on = pkgs.find((p) => p.dataset.id === r.pkg); if (on && last.pkg) press(on); }
    if (r.n !== last.n) {
      const at = (r.n - DRONES_MIN) / (DRONES_MAX - DRONES_MIN);
      thumb.style.setProperty("--at", String(at)); fill.style.setProperty("--at", String(at));
      count.textContent = String(r.n);
      const e = euros(r.n); coins.forEach((c, i) => c.classList.toggle("is-on", i < e));
    }
    if (r.note !== last.note) {
      if (r.note) { const b = document.createElement("b"); b.textContent = r.note[0]; note.replaceChildren(b, document.createTextNode(r.note[1])); }
      note.classList.toggle("is-on", Boolean(r.note));
    }
    last = { pkg: r.pkg, n: r.n, note: r.note };
  }
  const field = createField(q("field"), { onBeat: (k, beat) => sync(beat), ...REEL_CLOUD });
  field.setRate(REEL_RATE);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let done = false;
  buildReel(reel).then((scene) => {
    if (done) return;
    const still = scene.beats.findLastIndex((b) => b.segment === REELS[reel].still);
    // bei reduzierter Bewegung steht ein starkes Motiv in Ruhe; sonst fliegt das erste Bild ein (eine sofort stehende
    // erste Ansicht zeigte das Ende eines Motivs, beim Logo also gleich 600 Drohnen statt der Steigerung ab 100)
    field.show(scene, 300, 1, reduce ? { instant: true, at: still } : { at: 0 });
    root.dataset.cftLoaded = "true";
  }).catch(() => { q("error").hidden = false; });
  return () => { done = true; };
}
