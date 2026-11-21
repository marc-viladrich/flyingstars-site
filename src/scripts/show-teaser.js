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
import { SHOW_PACKAGES, DRONES_MIN, DRONES_MAX, ART_TIER, TWO_D_LIMIT, artMin, configuratorPrice, packageForDrones } from "../content/show-packages.ts";
import { createField } from "./show-field.js";
import { rankOf } from "./show-tempo.js";
import { buildSequence } from "./show-scenes.js";
import { liftColor } from "./formation/index.js";
import logoDots from "../data/logo-dots.json";
import lettering from "../data/teaser-lettering.json";
import { primeTextFormation } from "./text-formation.js";
// Ruckeln an der Grenze #ablauf → #preise (WebKit/Safari, 18.11.2026): Der Textplaner setzte den Schriftzug FLYINGSTΛRS
// (450 und 600 Drohnen) beim Eintritt der Section am Stück, rund 120 ms. Die beiden Formationen liegen jetzt vorberechnet
// bei (tools/himmel/teaser-schriftzug.mjs), der Planer lädt im Teaser gar nicht mehr.
for (const [n, f] of Object.entries(lettering.formations)) primeTextFormation(lettering.value, Number(n), f.pts, f.style);
/** Ein eigener Task, wenn der Browser Luft hat (Safari 18 kennt requestIdleCallback nicht: setTimeout). Der Aufbau des
 * Showreels läuft so in Stücken statt in einem langen Task. */
const idle = () => new Promise((res) => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => res(), { timeout: 600 }) : setTimeout(res, 16)));

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
// Runde 15 (Marc, 21.11.2026: „Die Raketen-Sequenz überzeugt nicht mehr, wir haben inzwischen bessere Sachen“): Rakete,
// Mondlandung und Amors Pfeil sind raus. Neu: Jubiläumszahl 2D → 3D → 3D+ mit Konfetti (wie die 125 beim Stadtfest, hier
// 50), Hochzeitstorte 2D → 3D, Fernsehturm in 3D+, die Roboter-Geschichte aus Marketing 3D+ (der kleine Roboter wird
// lebendig und zum Greifarm, im direkten Flug weiter ans Förderband: „euer Produkt hebt ab“), am Ende die Bokkenrijders.
// Aus langen Geschichten nur die stärksten Bilder (beats), damit das Tempo bleibt wie bisher (Show-Uhr 90 s statt 84 s).
// Ein direkter Flug (cloud: false) nur zwischen Motiven, die zusammengehören (Greifarm → Förderband, Drehzahlmesser → Sportwagen).
const QR = { occasion: "launch", motif: "qr", drones: [300] };
export const REELS = {
  start: { still: 6, label: message('configuratorteaser.theFlyingstarsLogoBecomingSharperWithMoreDronesAHeart'), items: [
    { occasion: "launch", kind: "logo", drones: [100, 300, 450, 600], note: LOGO_NOTE },
    { occasion: "festival", motif: "jahreszahl", value: "50", drones: [100, 200, 300], beats: { ODYSSEY: [-1] } }, // 50 Jahre: 2D, 3D mit Konfetti, 3D+ Licht schreibt die Zahl
    { occasion: "hochzeit", motif: "torte", drones: [100, 200] }, // Torte 2D → 3D
    { occasion: "festival", motif: "fernsehturm", drones: [300], beats: [-1] }, // die Kugel dreht sich, Funkwellen gehen hinaus (3D+)
    { occasion: "launch", motif: "roboter", drones: [400], beats: [1, 2] }, // der kleine Roboter wird lebendig, dann zum Greifarm
    { occasion: "launch", motif: "foerderband", drones: [400], beats: [-1], cloud: false }, // …und setzt euer Produkt aufs Band
    { occasion: "kultur", motif: "teufel", drones: [600] },
  ] },
  // Runde 15: Werbung mit den Marketing-Motiven: Drehzahlmesser in 3D → Sportwagen in 3D+ (direkter Flug), Glühbirne 2D → 3D,
  // die QR-Code-Geschichte, der Satellit (3D+) statt der Rakete. Der Seitenkopf der Werbung ist ein Video, keine Dopplung.
  marke: { still: 5, label: message('configuratorteaser.aLogoBecomingSharperWithMoreDronesALightBulb'), items: [
    { occasion: "launch", kind: "logo", drones: [100, 300, 450, 600], note: LOGO_NOTE },
    { occasion: "launch", motif: "drehzahl", drones: [200] }, // die Nadel dreht hoch
    { occasion: "launch", motif: "sportwagen", drones: [300], beats: [-1], cloud: false }, // …und aus dem Tachometer wird das Auto
    { occasion: "launch", motif: "idee", drones: [100, 200] },
    QR,
    { occasion: "launch", motif: "satellit", drones: [400], beats: [0, -1] }, // im Orbit, dann der Lichtimpuls zur Erde
  ] },
  // Runde 14 (Marc und Moritz, 21.11.2026): Herz, Ring an der Hand und Sektgläser spielen jetzt im Seitenkopf der
  // Hochzeitsseite (hochzeitHero). Der Teaser weiter unten („So einzigartig wie eure Lovestory“: Initialen, Liebesschwüre)
  // zeigt darum die übrigen Hochzeitsmotive. Runde 15: die Sektflasche ist raus (der Seitenkopf zeigt jetzt den Sektkorken),
  // dafür der Schmetterling 2D → 3D+; vom Blütenspalier nur der Anfang und die Ringe am Ende des Wegs.
  hochzeit: { still: 3, label: message('configuratorteaser.initialsInsideAHeartAHeartIn2dAsA'), items: [
    { occasion: "hochzeit", kind: "text", value: "Anna & Ben", style: "initials", drones: [100, 200, 300], beats: [0], note: [message('showTeaser.yourInitials'), message('showTeaser.inTheSky')] },
    { occasion: "hochzeit", motif: "unendlich", drones: [150, 250] },
    { occasion: "hochzeit", motif: "falter", drones: [150, 400] }, // Schmetterling 2D, dann landet er auf der Blüte (3D+)
    { occasion: "hochzeit", motif: "spalier", drones: [500], beats: [0, -1] },
  ] },
  // Runde 14: Seitenkopf der Hochzeitsseite statt des Showreels (Moritz und Marc: das Showreel zeigt Marken und öffentliche
  // Feiern). Eine Steigerung 2D → 3D bei den Motiven, die es in beiden Fassungen gibt (erst die flache Formation, dann
  // fliegt dasselbe Motiv in seine 3D-Fassung), dazwischen 3D- und 3D+-Höhepunkte. Zwischen zwei Motiven die lebendige
  // Wolke, innerhalb eines Motivs ein direkter Flug (Übergang mit Bezug). tier: Fassung unabhängig von der Drohnenzahl
  // (der erste Tanz spielt in 3D ab 300). Kein Wireframe, ruhiger als der Teaser (HERO_RATE).
  // Runde 15 (Marc: „zu kurz, zu klein, zu wenig abwechslungsreich“): dazu der Sektkorkenknall und die Pralinenschachtel in
  // 3D+ (die meisten Paare wählen das nicht, es zeigt aber, was möglich ist); rund 50 s statt 35 s, Motive größer (HERO_ZOOM).
  // Kein Motiv doppelt mit dem Hochzeit-Teaser darunter (REELS.hochzeit).
  hochzeitHero: { still: 1, label: "", items: [
    { occasion: "hochzeit", motif: "herz", drones: [100, 200] }, // Herz in 2D → Herztunnel
    { occasion: "hochzeit", motif: "antrag", drones: [300], beats: [-2, -1] }, // der Ring findet den Ringfinger, „Ja“
    { occasion: "silvester", motif: "sekt", drones: [300] }, // Sektflasche, der Korken knallt (3D+)
    { occasion: "hochzeit", motif: "torte", drones: [100, 200] }, // Hochzeitstorte 2D → 3D
    { occasion: "hochzeit", motif: "pralinen", drones: [400], beats: [1, -1] }, // der Deckel hebt sich, die Pralinen werden ein Herz (3D+)
    { occasion: "hochzeit", motif: "erstertanz", drones: [300], tier: "HORIZON" }, // erster Tanz (3D)
    { occasion: "hochzeit", motif: "glaeser", drones: [100, 200] }, // anstoßende Gläser 2D → Sektgläser 3D mit Perlen
    { occasion: "hochzeit", motif: "lotus", drones: [400], beats: [-1] }, // Lichtkugel aus verdrillten Bändern mit goldenem Herz
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

/** Art der Show je Fassung (Pills „Art der Show“ wie im Konfigurator: 2D = SPARK, 3D = HORIZON, 3D+ = ODYSSEY). */
export const ART_OF = Object.fromEntries(Object.entries(ART_TIER).map(([art, pkg]) => [pkg, art]));
/** Drohnenbereich einer Art wie im Konfigurator: 2D ab 100 bis 300 (ab 400 wird 2D zu 3D), 3D ab 200, 3D+ ab 300. */
const ART_RANGE = (art) => [artMin(art), art === "2d" ? TWO_D_LIMIT - 100 : DRONES_MAX];

/**
 * Runde 15 (Marc, 21.11.2026: „die Wahl Art der Show 2D / 3D / 3D+ … damit klar wird: das sind die Haupthebel“): derselbe
 * Ablauf in einer gewählten Art. Jeder Eintrag spielt in deren Fassung, die Drohnenzahlen rücken in den Bereich der Art
 * (ab der Schwelle der Fassung); Einträge ohne Fassung in dieser Art fallen weg. Bilderauswahl (beats) gilt nur in der
 * Art, für die sie geschrieben ist ({ ODYSSEY: [...] } oder die Art des Eintrags), sonst spielt die ganze Fassung.
 */
function lockItem(r, tier, motif, own) {
  const art = ART_OF[tier], [lo, hi] = ART_RANGE(art);
  const version = r.kind === "logo" || r.kind === "text" ? {} : r.build ? { minDrones: 0 } : motif?.tiers[tier] ?? (tier === "ODYSSEY" ? own : null);
  if (!version) return null;
  const from = Math.max(lo, version.minDrones ?? 0);
  if (from > hi) return null;
  const drones = [...new Set(r.drones.map((n) => Math.min(hi, Math.max(from, n))))];
  const natural = r.tier ?? packageForDrones(r.drones[0]);
  const beats = Array.isArray(r.beats) ? (natural === tier ? r.beats : undefined) : r.beats;
  return { ...r, drones, beats, tier: r.kind === "logo" ? undefined : tier, artTier: tier };
}

/** Baut die Szene eines Ablaufs: je Eintrag und Drohnenzahl die gewählten Bilder, in der Paketfarbe, als eigenes Motiv.
 * Jede Stufe bekommt ihren eigenen Bildausschnitt (frame), damit ein 2D-Bild nicht nach dem Rahmen einer Geschichte
 * skaliert wird; das Logo behält seinen Maßstab über 100–300 Drohnen. art: der Ablauf in nur dieser Art (lockItem);
 * zoom: Anteil der Bühne, den ein Motiv höchstens füllt. Ein Eintrag mit value ersetzt den Wert der Fassung (die Zahl
 * der Jahreszahl). */
export async function buildReel(reel = REEL, { art = null, zoom = ZOOM } = {}) {
  const items = Array.isArray(reel) ? reel : (REELS[reel] ?? REELS.start).items, beats = [];
  const lock = art ? ART_TIER[art] : null;
  let skipped = false;
  for (const [segment, r0] of items.entries()) {
    const occasion = OCCASIONS.find((o) => o.id === r0.occasion), motif = r0.motif && occasion?.motifs.find((m) => m.id === r0.motif);
    // Runde 9 (Einstufung 3D/3D+, Konfigurator-Agent): ein 3D+-Motiv hat keine HORIZON-Fassung mehr; seine einzelne 3D-Szene
    // steht als eigenes Motiv davor (of: Motiv-ID), z. B. der Herztunnel
    const ownOf = () => occasion?.motifs.find((m) => m.of === r0.motif)?.tiers.ODYSSEY;
    const r = lock ? lockItem(r0, lock, motif, ownOf()) : r0;
    if (!r) { skipped = true; continue; }
    // ein direkter Flug (cloud: false) gilt nur nach dem Motiv, auf das er sich bezieht; fiel das weg, kommt die Wolke
    const viaCloud = r.cloud !== false || skipped;
    skipped = false;
    for (const [step, n] of r.drones.entries()) {
      await idle(); // jedes Bild in einem eigenen Task
      const pkg = r.tier ?? (lock && r.kind === "logo" ? lock : packageForDrones(n));
      let pick;
      if (r.kind === "logo") pick = [await logoBeat(n)];
      else {
        const own = !motif?.tiers[pkg] && ownOf();
        let version = r.kind === "text" ? { build: `text${pkg}`, caption: message('showTeaser.yourInitials'), value: r.value, style: r.style, occasion: r.occasion } : r.build ? { build: r.build, caption: r.label } : motif?.tiers[pkg] ?? own;
        if (!version) throw new Error(`Showreel: ${r.occasion}/${r.motif} hat keine ${pkg}-Fassung`);
        if (r.value !== undefined && r.kind !== "text") version = { ...version, value: r.value };
        const seq = await buildSequence([{ id: r.motif ?? r.kind, label: r.label ?? motif?.label ?? "Text", tiers: { [pkg]: { ...version, minDrones: 0 } } }], pkg, n, SHOW_PACKAGES[pkg].color, r.occasion);
        const all = seq.beats.filter((b) => !b.interlude);
        const which = Array.isArray(r.beats) ? r.beats : r.beats?.[pkg];
        pick = (which ? which.map((i) => all.at(i)) : all).map((b) => ({ ...b, frame: `${b.frame ?? ""}#${step}` }));
        // eigener Text: im Konfigurator schreibt er sich aus dem Dunkel; in der Steigerung soll er stehen bleiben und nur
        // dichter werden (wie das Logo), darum ohne Schreib-Licht, mit Lichtlauf und eigenem Ausschnitt je Paket
        if (r.kind === "text") pick = pick.map((b) => ({ ...b, live: undefined, run: true, hold: 2.2 }));
      }
      pick.forEach((b, i) => beats.push({ ...b, segment, zoom, cloud: viaCloud && step === 0 && i === 0, drones: n, reel: { ...r, pkg, n } }));
    }
  }
  // Runde 6: die Lichtlauf-Reihenfolge (rankOf, je Bild O(n²)) schon hier im Leerlauf rechnen; sonst entsteht sie beim ersten
  // Zeigen eines Bildes mitten in der Show (ein Bild von 30–50 ms bei 4× Drossel)
  for (const [k, b] of beats.entries()) { if (k % 4 === 0) await idle(); rankOf(b); }
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
  const pkgs = all("pkg"), coins = all("euro"), thumb = q("thumb"), fill = q("fill"), count = q("count"), note = q("note"), arts = all("art");
  let last = { pkg: null, n: null, note: null }, segment = 0, chosen = arts.find((a) => a.checked)?.value ?? null;
  const press = (el) => { el.classList.remove("is-press"); void el.offsetWidth; el.classList.add("is-press"); };
  /** Das Wireframe folgt der Bühne: Paketknopf, Regler mit Drohnenzahl, Euro-Zeichen; dazu die Schrift unten auf der Bühne. */
  function sync(beat) {
    const r = beat.reel; if (!r) return;
    root.style.setProperty("--pkg", `rgb(${SHOW_PACKAGES[r.pkg].color.join(",")})`);
    segment = beat.segment ?? 0;
    // Art der Show: ohne Wahl zeigt die Pill die Art des laufenden Bildes; nach einer Wahl bleibt sie bei der gewählten
    if (!chosen) arts.forEach((a) => a.parentElement.classList.toggle("is-now", a.value === ART_OF[r.pkg]));
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
  // Runde 10: dieselbe Einpassung wie im Konfigurator (das Motiv so gemessen, wie es gezeichnet wird, show-field.js); frei
  // bleibt unten nur der Platz der Paketzeile (.cft-note, rund 3,5 rem). Am Handy war das Motiv sonst so klein wie zuvor
  // im Konfigurator (Marc: „teilweise auch zu klein“)
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const field = createField(q("field"), { onBeat: (k, beat) => sync(beat), ...REEL_CLOUD, fitProjected: true, view: () => ({ top: rem(), bottom: rem() * 3.5 }) });
  field.setRate(REEL_RATE);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let done = false, picks = 0;
  // je Art ein eigener Ablauf, erst gebaut, wenn jemand die Art wählt (der gemischte Ablauf sofort)
  const scenes = new Map(), sceneFor = (art) => { if (!scenes.has(art)) scenes.set(art, buildReel(reel, art ? { art } : {})); return scenes.get(art); };
  /** Bild, mit dem eine gewählte Art einsetzt: das gerade gezeigte Motiv in dieser Art, sonst das nächste, das es dort gibt. */
  const entry = (scene, last) => { const pick = (k) => (last ? scene.beats.findLastIndex((b) => b.segment === k) : scene.beats.findIndex((b) => b.segment === k)); for (let k = segment; k <= segment + scene.beats.length; k++) { const at = pick(k); if (at >= 0) return at; } return 0; };
  arts.forEach((input) => input.addEventListener("change", () => {
    if (!input.checked) return;
    chosen = input.value;
    arts.forEach((a) => a.parentElement.classList.remove("is-now"));
    const token = ++picks;
    sceneFor(chosen).then((scene) => {
      if (done || token !== picks || !root.dataset.cftLoaded) return;
      field.show(scene, 300, 1, reduce ? { instant: true, at: entry(scene, true) } : { at: entry(scene, false), cloud: true });
    }).catch(() => {});
  }));
  sceneFor(null).then((mixed) => {
    if (done) return;
    // bei reduzierter Bewegung steht ein starkes Motiv in Ruhe; sonst fliegt das erste Bild ein (eine sofort stehende
    // erste Ansicht zeigte das Ende eines Motivs, beim Logo also gleich 600 Drohnen statt der Steigerung ab 100)
    // Runde 6: zeigen erst, wenn die Bühne auf 300 px herankommt. Weiter weg sieht sie niemand, und der erste show() (Ausschnitte
    // aller Bilder, Zuordnung, erstes Bild) traf beim Scrollen sonst mit dem Scroll-Handler des Himmels in ein Bild. Das erste
    // Bild kommt durch die lebendige Wolke (es ist ohnehin ein Wolken-Bild): einfliegende Drohnen brauchen keine optimale
    // Zuordnung, die Hilbert-Reihenfolge der Wolke kostet nur einen Bruchteil
    // eine Art, die schon vor dem Start gewählt wurde, gilt von Anfang an
    const start = async () => {
      if (done || root.dataset.cftLoaded) return;
      let art, scene;
      do { art = chosen; scene = art ? await sceneFor(art) : mixed; } while (art !== chosen);
      const still = scene.beats.findLastIndex((b) => b.segment === REELS[reel].still);
      if (done || root.dataset.cftLoaded) return;
      field.show(scene, 300, 1, reduce ? { instant: true, at: Math.max(0, still) } : { at: 0, cloud: true }); root.dataset.cftLoaded = "true";
    };
    if (!("IntersectionObserver" in window)) { start(); return; }
    const near = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { near.disconnect(); start(); } }, { rootMargin: "300px 0px" });
    near.observe(root);
  }).catch(() => { q("error").hidden = false; });
  return () => { done = true; };
}
