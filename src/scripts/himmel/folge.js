// Show-Folge bei #warum-drohnen (docs/himmel.md → „Feuerwerk? War gestern“). Marc, 15.11.2026: „deutlich nicere Animationen
// und viiiiel mehr Auswahl … quasi never-ending loop“. Runde 3 (Marc, 17.11.2026): „Die Motive müssen viel schneller a) sich
// bewegen und b) rotieren … Das Feuerwerk-Finale kann gerne am Anfang kommen. Aber dann relativ schnell eskalieren in diese
// großen, beeindruckenden Sachen.“ Dazu eine feste Wunschliste (Maske der Bokkenrijders, Logo in 2D und 3D, QR-Code,
// Jubiläum, Fernsehturm, Kolibri, Riesenrad, Delfine, Buch, Musik, Tänzerin, Kugel, Weihnachtsbaum, Feuerwerk) und keine
// Glühbirne mehr.
//
// Der Himmel-Schwarm fliegt als Feuerwerksblüte ein (der Knall von gestern) und übergibt seine 300 Drohnen an diese Bühne.
// Sie spielt mit der Engine des Konfigurators (show-field.js, show-scenes.js, scenes/): dieselben Motive und Geschichten,
// Übergänge (lebendige Wolke, Flug mit Objektpermanenz) und Paketfarben. Neu sind hier nur Auswahl, Tempo und Drehung.
//
// Dramaturgie: beim ersten Besuch Blüte → unser Feuerwerk (Finale aus dem Konfigurator, kurz) → die Maske der Bokkenrijders
// dreht sich → das Logo flach, dann als Körper, der sich dreht. Danach Stück für Stück aus PIECES, endlos:
//   spin   ein räumliches Bild, das sich in seiner Standzeit einmal ganz um die Hochachse dreht
//   esc    erst flach (SPARK, ~100 Drohnen, kurz), dann verwandeln sich dieselben Drohnen in den Körper (HORIZON), der sich
//          dreht; die hinzukommenden steigen dunkel von unten auf und leuchten erst an ihrem Platz
//   story  eine Geschichte in Akten aus dem Konfigurator (ODYSSEY, 300), gerafft
// Gemischt wird mit Regeln: jedes Stück einmal, bevor eines wiederkommt; nie zweimal dieselbe Art hintereinander, und keine
// ähnliche Form (rund, hoch, Tier …) wie in den beiden Stücken davor. Keine Beschriftung, keine Zahlen außer im Motiv selbst.
//
// Leistung (Messung 17.11.: zwei Long Tasks, zusammen 568 ms bei 4× Drosselung, weil ganze Runden am Stück gebaut wurden):
// Zum Einstieg wird nur das erste Bild gebaut; jedes weitere Bild entsteht in einem eigenen Task (requestIdleCallback,
// Safari: setTimeout), und vorgebaut wird nur ein Stück Vorrat, solange die Bühne nicht spielt zwei, wenn sie spielt.
import { createField } from "../show-field.js";
import { buildSequence } from "../show-scenes.js";
import { steadyClock, yaw, TAU } from "../show-motion.js";
import { rankOf } from "../show-tempo.js";
import { share } from "../show-shapes.js";
import { primeTextFormation } from "../text-formation.js";
import { SHOW_PACKAGES } from "../../content/show-packages.ts";
import catalog from "../../content/catalog-motifs.json";

/** Tempo der Show-Uhr bei der Blüte (wie bisher). */
const RATE = 1.25;
/** Tempo der Show-Uhr in jedem Übergang (Wolke, Flug): Wechsel in etwa 0,6–0,9 s statt 1,3–2 s. */
const FLIGHT = 2.4;
/** Räumliche Bilder: Eigenbewegung (Flügel, Licht) 1,6-mal so schnell wie im Konfigurator, Standzeit 2,6 s, darin eine
 *  ganze Umdrehung (langsam an, langsam aus, also endet sie wieder von vorn). */
const SPIN_RATE = 1.6, SPIN_HOLD = 2.6;
/** Das flache Bild vor der Verwandlung steht nur kurz. */
const LEAD_HOLD = 1.3;
/** Geschichten: je Akt etwa 1,6 s Standzeit, mindestens 1,8-fach. */
const STORY_RATE = 1.8, STORY_BEAT = 1.6;
/** Lebendige Wolke kürzer und ruhiger als im Konfigurator (wie im Startseiten-Teaser). */
const CLOUD = { cloudTime: 0.5, cloudSpread: 0.55 };
/** Das Motiv füllt höchstens 86 % der Bühne in Breite oder Höhe (Eigenbewegung, Drehung, Perspektive). */
const FILL = 0.86;
export const N = 300;

const ceil10 = (v) => Math.ceil(v / 10) * 10;
/** Katalogmotiv als Körper: die größte Variante bis 200 Punkte. */
const deepCount = (key) => { const vs = catalog.motifs[key].variants, v = vs.filter((q) => q.points <= 200).at(-1) ?? vs[0]; return Math.max(200, ceil10(v.points)); };

/** Schritt: build = Bauname aus show-scenes.js/scenes/, pkg = Paket (Farbe), n = Drohnen, spin = Umdrehungen in der
 *  Standzeit, lead = flaches Bild vor der Verwandlung, from = erster Akt einer Geschichte, story = Standzeit gesamt (s). */
const S = (build, n = 100) => ({ build, pkg: "SPARK", n, lead: true });
const H = (build, n = 200, spin = 1) => ({ build, pkg: "HORIZON", n, spin });
const O = (build, extra = {}) => ({ build, pkg: "ODYSSEY", n: N, ...extra });
/** Das Repertoire (Marcs Wunschliste vom 17.11.2026). kind: Art des Stücks; tags: Formfamilie gegen Ähnliches. */
const PIECES = {
  maske: { kind: "spin", tags: ["gesicht"], steps: [O("devilStory", { spin: 1 })] }, // Teufel aus der Bokkenrijders-Show, echte 3D-Formation
  logo: { kind: "esc", tags: ["zeichen"], steps: [S("logo"), H("logo3d")] }, // FlyingStars-Zeichen: flach, dann zwei Ebenen in der Tiefe
  qr: { kind: "story", tags: ["zeichen", "eckig"], steps: [O("qrStory")] }, // Nachricht kommt an → QR-Code „Scan me“
  medaille: { kind: "spin", tags: ["rund"], steps: [O("medalStory", { spin: 1 })] }, // Jubiläum: „25“ mit Medaillenband, dreht sich wie eine Münze
  turm: { kind: "esc", tags: ["hoch"], steps: [S("tower"), H("tower3d")] }, // Berliner Fernsehturm mit Warnlicht
  kolibri: { kind: "esc", tags: ["tier"], steps: [S("hummingbird2d"), H("hummingbird3d")] },
  riesenrad: { kind: "esc", tags: ["rund"], steps: [S("wheel2d"), H("wheel3d")] },
  delfine: { kind: "story", tags: ["tier", "wasser"], steps: [O("dolphinStory", { from: 1 })] }, // Sprung, Ringe, zwei Delfine, Herz
  buch: { kind: "story", tags: ["eckig"], steps: [O("bookStory")] }, // ODYSSEY: das Buch öffnet sich, eine Feder schreibt
  musik: { kind: "story", tags: ["musik"], steps: [O("harpStory")] }, // Harfe, Saiten klingen, die Noten fliegen
  taenzerin: { kind: "story", tags: ["gesicht", "musik"], steps: [O("dancerStory")] }, // Tänzerin dreht sich, der Rock wird zur Blüte
  kugel: { kind: "spin", tags: ["rund"], steps: [{ build: "catalog:kugel:HORIZON:", pkg: "HORIZON", n: deepCount("kugel"), spin: 1 }] },
  baum: { kind: "esc", tags: ["hoch"], steps: [S("snow2d"), H("tree3d")] }, // Schneeflocke → Lichterbaum als Spirale
  feuerwerk: { kind: "story", tags: ["feuer"], steps: [O("fireworkStory")] }, // Feuerwerk aus Drohnen: Leuchtspur, Sterne blühen
};
/** Erster Besuch: unser Feuerwerk (Finale), dann sofort groß. Danach die Wunschliste in dieser Reihenfolge, später gemischt. */
const OPENING = { kind: "story", tags: ["feuer"], steps: [O("fireworkFinale", { story: 2.8 })] };
const FIRST = ["maske", "logo", "kugel", "delfine", "turm", "qr", "medaille", "musik", "kolibri", "buch", "baum", "taenzerin", "riesenrad", "feuerwerk"];

/** Die „25“ der Medaille (scenes/jubilaeum.js, medalStory bei 300 Drohnen: share(300, [1,15, 1,25, 0,8])[1] Punkte),
 *  vorberechnet mit textFormation() in Node (Meter, 2 Nachkommastellen). Sonst lädt der Textplaner und rechnet am Stück
 *  mehrere hundert Millisekunden. Ändert sich die Zahl oder ihre Punktzahl, greift wieder der Planer (nur langsamer). */
const MEDAL = { value: "25", count: share(N, [1.15, 1.25, 0.8])[1], pts: [[-20.23,6.4],[-18.25,6.36],[-16.26,6.36],[-14.49,7.27],[-12.7,8.11],[-10.72,8.23],[-8.77,7.86],[-7.44,6.38],[-7.44,4.4],[-8.44,2.68],[-9.9,1.33],[-11.36,-0.01],[-12.74,-1.43],[-14.12,-2.87],[-15.49,-4.3],[-16.86,-5.73],[-18.24,-7.17],[-19.61,-8.6],[-20.61,-10.32],[-19.97,-12.2],[-18.11,-12.91],[-16.13,-12.91],[-14.14,-12.91],[-12.16,-12.92],[-10.17,-12.92],[-8.19,-12.92],[-6.2,-12.92],[-4.22,-12.85],[-4.18,-11.33],[-4.18,-9.81],[-4.27,-8.3],[-5.98,-8.26],[-7.69,-8.26],[-9.4,-8.26],[-11.1,-8.26],[-12.81,-8.26],[-11.43,-6.79],[-10.03,-5.34],[-8.63,-3.88],[-7.17,-2.49],[-5.68,-1.13],[-4.32,0.36],[-3.34,2.12],[-2.7,4.04],[-2.56,6.05],[-3.07,8],[-4.05,9.77],[-5.42,11.25],[-7.18,12.23],[-9.13,12.76],[-11.14,12.92],[-13.15,12.77],[-15.11,12.27],[-16.91,11.36],[-18.35,9.94],[-19.48,8.27],[4.54,-5.11],[4.45,-7.11],[4.44,-9.11],[5.05,-11.01],[6.76,-12.05],[8.67,-12.64],[10.65,-12.93],[12.65,-12.84],[14.61,-12.46],[16.46,-11.71],[18.07,-10.51],[19.24,-8.89],[20.06,-7.07],[20.53,-5.12],[20.61,-3.12],[20.35,-1.14],[19.71,0.76],[18.63,2.44],[17.19,3.82],[15.47,4.85],[13.56,5.45],[11.57,5.62],[9.57,5.54],[7.59,5.27],[7.73,6.73],[7.92,8.19],[9.82,8.27],[11.72,8.27],[13.62,8.27],[15.51,8.27],[17.41,8.27],[17.5,9.79],[17.5,11.31],[17.47,12.83],[15.45,12.93],[13.42,12.93],[11.39,12.93],[9.36,12.93],[7.33,12.93],[5.3,12.83],[3.73,11.55],[3.38,9.55],[3.14,7.54],[2.9,5.52],[2.66,3.51],[2.51,1.48],[3.6,-0.22],[5.62,-0.41],[7.54,0.27],[9.48,0.84],[11.51,0.96],[13.51,0.62],[15.12,-0.62],[15.87,-2.51],[15.91,-4.53],[15.26,-6.46],[13.77,-7.84],[11.79,-8.25],[9.76,-8.12],[7.89,-7.32],[6.37,-5.99]] };
/** Ein eigener Task, wenn der Browser Luft hat (Safari kennt requestIdleCallback nicht: setTimeout). */
const idle = () => new Promise((res) => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => res(), { timeout: 1200 }) : setTimeout(res, 40)));

/** Dreht ein räumliches Bild in seiner Standzeit `turns`-mal um die Hochachse durch seine Mitte. Die Eigenbewegung des
 *  Bildes (b.steady.raw aus show-scenes.js) läuft auf einer neuen, gleich langen Uhr weiter; Drehung wie Eigenbewegung
 *  laufen sanft an und kommen vor dem nächsten Bild zum Stehen (keine Finten, steadyClock). */
function spin(b, turns, hold) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2] || 0); z1 = Math.max(z1, p[2] || 0); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, motion = Math.max(0.6, hold - 0.9);
  const clock = steadyClock(motion, { from: b.steady?.from ?? 0 }), turn = steadyClock(motion);
  const raw = b.steady?.raw, light = b.steady ? null : b.live;
  b.live = (p, j, t, o) => { if (raw) raw(p, j, clock(t), o); else if (light) light(p, j, t, o); yaw(o, (TAU * turns * turn(t)) / motion, cx, cz); };
  b.hold = clock.hold; b.spin = { cx, cz };
}

/**
 * Bühne in canvas. burst: die Punkte der Feuerwerksblüte [x, y, z, r, g, b] (dieselben wie im Himmel-Schwarm).
 * Gibt { ready, place, canEnter, enter, peek, play, leave, hide, radius } zurück (siehe unten).
 * @param {HTMLCanvasElement} canvas
 * @param {{ locale?: string, burst?: number[][], rnd?: () => number }} [opts]
 */
export function createFolge(canvas, { burst = [], rnd = Math.random } = {}) {
  // Hinzukommende Drohnen warten unter dem Bild (Anzeigeeinheiten, das Bild reicht bis etwa ±0,75 · size), über die Breite
  // verteilt, als lockerer Schwarm; dank joinLate fliegen sie dunkel und leuchten erst an ihrem Platz auf
  let size = 1;
  const hash = (x) => { const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const below = (i, out) => { const r = hash(i + 0.5); out[0] = (hash(i) - 0.5) * 2.1 * size; out[1] = -(1.0 + 0.7 * r * r) * size; out[2] = (hash(i + 0.25) - 0.5) * 0.5 * size; return out; };

  /** Fertige Stücke ({ beats, loopTo }), die als Nächstes spielen. */
  const ready = [];
  let scene = null, seg = 0, swapping = false, playing = false, building = null, opened = false;
  const field = createField(canvas, { ...CLOUD, outside: below, flightRate: FLIGHT, joinLate: true, onBeat: (k, b) => field?.setRate(b.rate ?? RATE), onTick: (tl) => {
    if (!playing || swapping || !tl || !ready.length || tl.beats !== scene?.beats) return;
    if (tl.beat === tl.beats.length - 1 && tl.frac >= 0.97) { swapping = true; scene = ready.shift(); showScene(scene, { cloud: true }); swapping = false; prepare(); }
  } });
  field.setMotionIndependent(true); // Pause und reduzierte Bewegung steuert der Himmel-Schwarm (er zeigt dann ein stehendes Bild)
  field.setRate(RATE);
  field.setPaused(true);

  /** Ein Schritt als Bilder in der Paketfarbe, mit Tempo je Bild (onBeat → setRate) und gegebenenfalls Drehung. */
  async function beatsOf(step, cloud) {
    const { build, pkg, n } = step;
    const seq = await buildSequence([{ id: "m", label: "", tiers: { [pkg]: { build, caption: "", minDrones: 0 } } }], pkg, n, SHOW_PACKAGES[pkg].color, "");
    const s = seg++;
    const beats = seq.beats.filter((b) => !b.interlude).slice(step.from ?? 0);
    const total = beats.reduce((sum, b) => sum + (b.hold ?? 2.2), 0);
    const storyRate = Math.max(STORY_RATE, total / (step.story ?? STORY_BEAT * beats.length + 1));
    return beats.map((b, i) => {
      let rate = storyRate;
      if (step.spin && i === beats.length - 1) { rate = SPIN_RATE; spin(b, step.spin, SPIN_HOLD * SPIN_RATE); }
      else if (step.lead) rate = Math.max(STORY_RATE, (b.hold ?? 2.2) / LEAD_HOLD);
      return { ...b, segment: s, drones: n, rate, cloud: i === 0 ? cloud : Array.isArray(b.cloud) ? b.cloud : false };
    });
  }

  // Auswahl: FIRST der Reihe nach, danach gemischt ohne Zurücklegen mit Regeln (siehe oben)
  const queue = [...FIRST], history = [];
  let bag = [];
  function nextPiece() {
    if (queue.length) return queue.shift();
    if (!bag.length) {
      bag = Object.keys(PIECES);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    const last = PIECES[history.at(-1)], near = new Set(history.slice(-2).flatMap((id) => PIECES[id].tags));
    const fits = (id, strict) => id !== history.at(-1) && PIECES[id].kind !== last?.kind && (!strict || !PIECES[id].tags.some((t) => near.has(t)));
    let k = bag.findIndex((id) => fits(id, true));
    if (k < 0) k = bag.findIndex((id) => fits(id, false));
    if (k < 0) k = 0;
    return bag.splice(k, 1)[0];
  }
  /** Ein Stück bauen, jedes Bild in einem eigenen Task; das Licht-Ranking der Bilder ebenfalls vorab (sonst beim Start des
   *  Bildes im Zeichen-Frame). Misslingt ein Bild (Netz), entfällt das Stück. */
  async function buildPiece(piece) {
    const beats = [];
    primeTextFormation(MEDAL.value, MEDAL.count, MEDAL.pts);
    for (const [i, step] of piece.steps.entries()) {
      await idle();
      beats.push(...await beatsOf(step, i === 0)); // im ersten Schritt Wolke, danach Verwandlung (Flug, dieselben Drohnen)
    }
    for (const b of beats) { await idle(); rankOf(b); }
    return { beats, loopTo: beats.length - 1 };
  }
  /** Vorrat auffüllen: ein Stück, solange die Bühne nicht spielt, zwei, wenn sie spielt. */
  function prepare() {
    if (building || ready.length >= (playing ? 2 : 1)) return building;
    building = (async () => {
      for (let tries = 0; tries < 4; tries++) {
        let id = null;
        try {
          const piece = opened ? PIECES[(id = nextPiece())] : OPENING;
          const built = await buildPiece(piece);
          if (id) history.push(id);
          opened = true;
          ready.push(built);
          break;
        } catch (e) { console.warn("Show-Folge:", id ?? "Auftakt", e); opened = true; }
      }
      building = null;
      if (ready.length < (playing ? 2 : 1)) prepare();
    })();
    return building;
  }
  const burstBeat = () => ({ pts: burst, segment: -1, drones: N, hold: 1.1, rate: RATE });

  /** Zoom je Motiv: Das Feld passt jedes Bild in ein festes Querformat (±1,15 × ±0,75 · S); auf der hohen Bühne hier füllen
   *  hohe Motive damit nur zwei Drittel der Höhe. Darum je Motiv so weit vergrößern, dass es die Bühne in Breite oder Höhe
   *  zu FILL füllt. Räumliche Motive drehen sich: ihre Breite ist der größte Abstand zur Hochachse durch ihre Mitte. */
  function zoomAll(beats) {
    const W = frame.w, H = frame.h, S = Math.min(W * 0.36, H * (W < 600 ? 0.38 : 0.6)), segs = new Map();
    for (const b of beats) { const k = b.segment ?? 0; if (!segs.has(k)) segs.set(k, []); segs.get(k).push(b); }
    for (const list of segs.values()) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity, r = 0, deep = list.some((b) => b.spin);
      for (const b of list) for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2] || 0); z1 = Math.max(z1, p[2] || 0); if (Math.abs(p[2] || 0) > 0.05) deep = true; }
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (deep) for (const b of list) for (const p of b.fitPts ?? b.pts) r = Math.max(r, Math.hypot(p[0] - cx, (p[2] || 0) - cz));
      const hw = Math.max((x1 - x0) / 2, r, 1e-6), hh = Math.max((y1 - y0) / 2, 1e-6), fw = Math.max((x1 - x0) / 2, 1e-6);
      // gewünschte Pixel je Einheit, und was das Feld ohne Zoom gäbe (fit() in show-field.js)
      const want = FILL * Math.min(box.w / 2 / hw, box.h / 2 / hh), live = list.some((b) => b.live) ? 0.9 : 1;
      const base = (live / Math.max(fw / 1.15, hh / 0.75)) * size * S;
      for (const b of list) b.zoom = want / base;
    }
  }
  const showScene = (s, opts) => { zoomAll(s.beats); field.show(s, N, size, opts); };

  /** Canvas in Seitenkoordinaten: das Bild füllt box, das Canvas reicht darüber hinaus (aufsteigende Drohnen unter dem Bild),
   *  aber nie über den Fensterrand. Die Feldmitte liegt in der Canvas-Mitte, darum ringsum symmetrische Ränder. */
  let frame = { x: 0, y: 0, w: 0, h: 0 }, box = { x: 0, y: 0, w: 1, h: 1 };
  function place(b) {
    box = b;
    const vw = document.documentElement.clientWidth;
    const mx = Math.max(0, Math.min(80, box.x, vw - box.x - box.w)), my = Math.round(Math.min(240, box.h * 0.6));
    frame = { x: Math.round(box.x - mx), y: Math.round(box.y - my), w: Math.round(box.w + 2 * mx), h: Math.round(box.h + 2 * my) };
    const st = canvas.style;
    st.left = frame.x + "px"; st.top = frame.y + "px"; st.width = frame.w + "px"; st.height = frame.h + "px";
    // Projektion des Feldes (render): S = min(W·0,36, H·0,6); das Bild reicht bis ±1,15 · S · size bzw. ±0,75 · S · size
    const W = frame.w, H = frame.h, narrow = W < 600, S = Math.min(W * 0.36, H * (narrow ? 0.38 : 0.6));
    size = Math.min(box.w / (2.3 * S), box.h / (1.5 * S));
    return frame;
  }

  return {
    /** Das erste Stück ist gebaut (beim ersten Besuch nur das Feuerwerk). */
    ready: prepare().then(() => { if (!ready.length) throw new Error("Show-Folge: kein Bild"); }),
    place,
    /** Ist das nächste Stück gebaut? (Wer schnell zurückkommt, wartet sonst auf es.) */
    canEnter: () => ready.length > 0,
    /** Für den Anflug: die Blüte steht (unsichtbar) bereit; Lage der 300 Drohnen in Seitenkoordinaten und Lichtgröße. */
    enter(b) {
      place(b);
      if (!ready.length) return null;
      const first = ready.shift();
      scene = { beats: [burstBeat(), ...first.beats], loopTo: first.beats.length };
      field.setPaused(true);
      showScene(scene, { instant: true, at: 0 });
      prepare();
      return { pts: this.peek(), radius: field.radius() };
    },
    /** Lage, Licht und Farbe der 300 Drohnen in Seitenkoordinaten: [x, y, Licht, r, g, b]. */
    peek: () => field.drones(N).map(([x, y, a, r, g, b]) => [x + frame.x, y + frame.y, a, r, g, b]),
    /** Übergabe: die Bühne spielt (und baut ihren Vorrat auf zwei Stücke aus). */
    play() { playing = true; canvas.style.visibility = "visible"; field.setPaused(false); prepare(); },
    /** Rückgabe an den Schwarm: friert ein, versteckt sich, gibt die Drohnen zurück. */
    leave() { const pts = this.peek(); this.hide(); return pts; },
    hide() { playing = false; field.setPaused(true); canvas.style.visibility = "hidden"; },
    get radius() { return field.radius(); },
  };
}
