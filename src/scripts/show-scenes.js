import { mix, WARM, steadyClock } from "./show-motion.js";
import { transitions, planClouds } from "./scenes/interludes.js";
import { TEMPO, runFits } from "./show-tempo.js";
import { prepareScene } from "./scenes/index.js";

const nearWhite = (r, g, b) => Math.min(r, g, b) > 190 && Math.max(r, g, b) - Math.min(r, g, b) < 45;
/**
 * The show for one occasion and package: the occasion's motifs in order, each in its version for the package, as one
 * scene that starts again after the last motif. Every beat carries its motif (segment) for the controller. Drones that
 * would light warm white take the package's colour (Marc, round 9: SPARK orange, HORIZON pink, ODYSSEY blue); motifs
 * with their own colours keep them.
 * Zwölfte Fassung: the last picture of every motif stands TEMPO.hold (3 s) in every package.
 * Dreizehnte Fassung (Marc, 30.10.2026):
 * - A motif may need a minimum drone count (`minDrones` an der Fassung, seit der sechzehnten Fassung je Paket, see
 *   LADDER in content/show-configurator.js); below it the motif is not part of the show.
 * - The light run only where it fits (runFits() in show-tempo.js: lines and outlines without their own light).
 * - The living cloud every three to four pictures, at most five (planClouds() in scenes/interludes.js); builders may
 *   ask for it inside a story, also for single parts (beat.cloud = ["star"]).
 */
const now = () => (typeof performance === "undefined" ? Date.now() : performance.now());
/** Gibt den Hauptthread für einen Task frei (MessageChannel: ohne die 4-ms-Mindestpause von setTimeout). */
const nextTask = () => new Promise((resolve) => {
  if (typeof MessageChannel === "undefined") { setTimeout(resolve, 0); return; }
  const c = new MessageChannel(); c.port1.onmessage = () => { c.port1.close(); resolve(); }; c.port2.postMessage(0);
});
const playableVersions = (motifs, pkg, n) => motifs.map((m, segment) => [m, segment])
  .filter(([m]) => m.tiers[pkg] && (m.tiers[pkg].minDrones ?? 0) <= n);

/** Vorladen und Szenenbau verwenden dieselbe Auswahl und dieselben Caches. */
export function preloadScenes(motifs, pkg, n) {
  return Promise.all(playableVersions(motifs, pkg, n).map(([m]) => prepareScene(m.tiers[pkg], n)));
}

export async function buildSequence(motifs, pkg, n, tint, occasion = "") {
  const playing = playableVersions(motifs, pkg, n);
  // Alle Dateien sofort anfragen. Die Builder rechnen weiterhin in Motiv-Reihenfolge.
  const ready = playing.map(([m]) => prepareScene(m.tiers[pkg], n));
  ready.forEach((load) => load.catch(() => {}));
  const bySegment = new Map(playing.map(([, segment], i) => [segment, ready[i]]));
  // Runde 25b: ab HORIZON laufen die 3D- und eigenen Motive zuerst, die flachen Katalog- und Showformationen füllen danach auf
  const beats = [], shown = pkg === "SPARK" ? playing : [...playing.filter(([m]) => !m.flat), ...playing.filter(([m]) => m.flat)];
  const plan = transitions(occasion, shown.length, pkg);
  const tinted = (pts) => (tint ? pts.map((p) => (nearWhite(p[3], p[4], p[5]) ? [p[0], p[1], p[2], ...mix(WARM, tint, 0.7)] : p)) : pts);
  // a transition belongs to the next motif, so a package switch never lands on a figure
  const through = (tr, [m, segment]) => { const b = tr.figure(n); beats.push({ ...b, pts: tinted(b.pts), segment, motif: m.label, cloud: true }); };
  // 18.11.2026 (Ruckeln beim Start der Preisseite und am Teaser): der Aufbau gibt den Hauptthread frei, sobald er 8 ms am
  // Stück gerechnet hat (eigener Task je Motiv statt eines langen Tasks über alle Motive)
  let slice = now();
  for (const [s, [m, segment]] of shown.entries()) {
    if (now() - slice > 8) { await nextTask(); slice = now(); }
    const tr = s > 0 && plan.find((q) => q.before === s);
    if (tr?.figure) through(tr, [m, segment]);
    const scene = await (await bySegment.get(segment))();
    scene.beats.forEach((b, i, all) => {
      b.segment = segment; b.motif = m.label;
      if (i === all.length - 1) b.hold ??= TEMPO.hold;
      b.pts = tinted(b.pts);
      beats.push(b);
    });
  }
  const loop = shown.length && plan.find((q) => q.before === shown.length); // before the round starts again
  if (loop?.figure) through(loop, shown[0]);
  const pause = async () => { if (now() - slice > 8) { await nextTask(); slice = now(); } };
  await steady(beats, pause);
  for (const b of beats) { await pause(); b.run = runFits(b); }
  planClouds(beats);
  return { beats, loopTo: 0 };
}
/** Prüfe jeden Punkt: bei großen Reserven überspringt eine Stichprobe sonst kleine bewegte Teile wie Räder. */
function moves(b) {
  if (!b.live) return false;
  const n = b.pts.length, o = [0, 0, 0, 1];
  for (let j = 0; j < n; j++) {
    const p = b.pts[j];
    for (const t of [0, 0.35, 0.9, 1.7, 2.6, 4.1, 6.3]) {
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2] || 0; o[3] = 1; b.live(p, j, t, o);
      if (Math.abs(o[0] - p[0]) + Math.abs(o[1] - p[1]) + Math.abs(o[2] - (p[2] || 0)) > 1e-6) return true;
    }
  }
  return false;
}
/**
 * Vierzehnte Fassung (Marc, 30.10.2026: keine Finten): Jedes Bild, das sich selbst bewegt, läuft nach steadyClock() in
 * show-motion.js: Es steht im Anflug, läuft sanft an und kommt vor dem nächsten Bild zum Stehen. Ein Bild mit
 * `clock: "continue"` setzt die Uhr des vorigen Bildes fort (dieselbe Drehung, derselbe Flügelschlag), statt sie
 * zurückzudrehen.
 */
async function steady(beats, pause = async () => {}) {
  let prev = null;
  for (const b of beats) {
    await pause(); // je Bild ein Stück: moves() prüft jede Drohne zu sieben Zeitpunkten
    if (!moves(b)) { prev = null; continue; }
    const own = b.live, from = b.clock === "continue" && prev && prev.segment === b.segment ? prev.clockEnd : 0;
    const clock = steadyClock(b.hold ?? 2.2, { from });
    b.live = (p, j, t, o) => own(p, j, clock(t), o);
    b.hold = clock.hold;
    b.clockEnd = clock.end;
    b.steady = { raw: own, from, end: clock.end }; // für den Finten-Wächter (scripts/show-finte.test.mjs)
    prev = b;
  }
}
