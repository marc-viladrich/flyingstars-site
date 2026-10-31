// Startseiten-Teaser des Show-Konfigurators, zweite Fassung (Marc, 31.10.2026: interaktiv ist für die Startseite zu
// komplex; stattdessen „wie so ein Quick-Showreel“ in deutlich schnellerem Tempo, durch die „Greatest Hits“ von SPARK
// über HORIZON bis ODYSSEY, mit lebendigen Wolken dazwischen, einem Beispiel-Logo „das könnte dein Logo sein“ und einem
// vor-animierten, reduzierten Wireframe des Konfigurators, das synchron zur Bühne Anlass, Paket und Drohnenzahl wechselt).
// Dieselbe Engine (show-field.js) und dieselben Motive wie der Konfigurator: Das Showreel ist eine Szene aus
// ausgewählten Bildern verschiedener Pakete und Drohnenzahlen. Jedes Motiv wird durch die lebendige Wolke erreicht, nach
// dem letzten beginnt die Runde von vorn (auch durch die Wolke). Das Tempo kommt nur aus der Show-Uhr (setRate): Flug,
// Wolke, Eigenbewegung und Licht laufen gleichmäßig schneller, darum bleibt es ohne Einrasten und ohne Finten.
// Geladen wird dieses Modul erst, wenn der Block in die Nähe des Viewports kommt (ConfiguratorTeaser.astro). Außerhalb
// des Viewports, bei globaler Pause (html.motion-paused) und bei reduzierter Bewegung zeichnet die Engine nicht weiter;
// bei reduzierter Bewegung steht von Anfang an ein starkes Motiv in Ruhe (STILL).
import { OCCASIONS } from "../content/show-configurator.js";
import { SHOW_PACKAGES, DRONES_MIN, DRONES_MAX, configuratorPrice } from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildSequence } from "./show-scenes.js";

/** Tempo des Showreels gegenüber der Vorschau im Konfigurator (dort 1×): Wolke ≈ 1,7 s, ein Motiv steht ≈ 1,2–1,6 s. */
export const REEL_RATE = 2.5;

/**
 * Die „Greatest Hits“, vom einfachen 2D-Bild zur erzählten Geschichte. beats: welche Bilder des Motivs (Index, negativ
 * vom Ende); ohne Angabe alle. logo: das Beispiel-Logo mit der Botschaft „Das könnte euer Logo sein“.
 */
export const REEL = [
  { occasion: "hochzeit", motif: "herz", pkg: "SPARK", drones: 100 },
  { occasion: "hochzeit", motif: "falter", pkg: "SPARK", drones: 150 },
  { occasion: "launch", motif: "logo", pkg: "SPARK", drones: 150, logo: true },
  { occasion: "launch", motif: "rakete", pkg: "HORIZON", drones: 200 },
  { occasion: "kultur", motif: "tanz", pkg: "HORIZON", drones: 250 },
  { occasion: "launch", motif: "mond", pkg: "ODYSSEY", drones: 450 }, // Orbit und Landung (nur die Landung schnitte die anfliegende Rakete oben ab)
  { occasion: "festival", motif: "drache", pkg: "ODYSSEY", drones: 450, beats: [-1] },
  { occasion: "silvester", motif: "finale", pkg: "ODYSSEY", drones: 600 },
];
/** Das Motiv, das bei reduzierter Bewegung als ruhiges Standbild steht (Index in REEL). */
export const STILL = 6;

/** Baut die Szene des Showreels: je Eintrag die gewählten Bilder, in der Paketfarbe, als eigenes Motiv (segment). */
export async function buildReel(reel = REEL) {
  const beats = [];
  for (const [segment, r] of reel.entries()) {
    const occasion = OCCASIONS.find((o) => o.id === r.occasion), motif = occasion?.motifs.find((m) => m.id === r.motif);
    if (!motif?.tiers[r.pkg]) throw new Error(`Showreel: ${r.occasion}/${r.motif} hat keine ${r.pkg}-Fassung`);
    const seq = await buildSequence([motif], r.pkg, r.drones, SHOW_PACKAGES[r.pkg].color, r.occasion);
    const all = seq.beats.filter((b) => !b.interlude), pick = r.beats ? r.beats.map((i) => all.at(i)) : all;
    pick.forEach((b, i) => beats.push({ ...b, segment, cloud: i === 0, reel: r, motif: motif.label, caption: r.logo ? "Ein Beispiel-Logo aus Drohnen: das könnte euer Logo sein" : b.caption }));
  }
  return { beats, loopTo: 0 };
}

/** Startet das Showreel in root (ein Element mit data-cft-root). Gibt eine Funktion zum Aufräumen zurück. */
export function initTeaser(root) {
  if (root.dataset.cftReady) return () => {};
  root.dataset.cftReady = "true";
  const q = (name) => root.querySelector(`[data-cft="${name}"]`);
  const all = (name) => [...root.querySelectorAll(`[data-cft="${name}"]`)];
  const chips = all("chip"), pkgs = all("pkg"), thumb = q("thumb"), fill = q("fill"), count = q("count"), price = q("price"), logo = q("logo"), badge = q("badge");
  let shownSegment = -1;
  /** Das Wireframe folgt der Bühne: Anlass-Chip, Paketknopf, Regler, Zahl und Preis; ein kurzer Druck dort, wo es wechselt. */
  function sync(beat) {
    const r = beat.reel; if (!r) return;
    root.style.setProperty("--pkg", `rgb(${SHOW_PACKAGES[r.pkg].color.join(",")})`);
    if (beat.segment === shownSegment) return;
    shownSegment = beat.segment;
    const press = (el, on) => { el.classList.toggle("is-on", on); if (on && !el.dataset.was) { el.classList.remove("is-press"); void el.offsetWidth; el.classList.add("is-press"); } el.dataset.was = on ? "1" : ""; };
    chips.forEach((c) => press(c, c.dataset.id === r.occasion));
    pkgs.forEach((p) => press(p, p.dataset.id === r.pkg));
    const at = (r.drones - DRONES_MIN) / (DRONES_MAX - DRONES_MIN);
    thumb.style.setProperty("--at", String(at)); fill.style.setProperty("--at", String(at));
    count.textContent = String(r.drones);
    price.textContent = `ab ${configuratorPrice(r.drones).toLocaleString("de-DE")} €`;
    badge.textContent = r.pkg;
    logo.classList.toggle("is-on", Boolean(r.logo));
  }
  const field = createField(q("field"), { onBeat: (k, beat) => sync(beat) });
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
