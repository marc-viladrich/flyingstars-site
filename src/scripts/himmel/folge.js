// Show-Folge bei #warum-drohnen (docs/himmel.md → „Feuerwerk? War gestern“). Marc, 15.11.2026: „deutlich nicere Animationen
// und viiiiel mehr Auswahl … quasi never-ending loop“. Runde 3 (Marc, 17.11.2026): „Die Motive müssen viel schneller a) sich
// bewegen und b) rotieren … Das Feuerwerk-Finale kann gerne am Anfang kommen. Aber dann relativ schnell eskalieren in diese
// großen, beeindruckenden Sachen.“ Runde 4 (Marc, 18.11.2026): keine ganze Umdrehung mehr („nimmt dem ganzen voll die
// Dynamik weg, dauert zu lange“), höchstens ein kurzes Anschwenken; das Riesenrad dreht sich um seine Achse wie im
// Konfigurator; Wechsel „können auch etwas schneller sein“; Jubiläum = Wappen „125“ statt Medaille „25“. Dazu eine kleine
// Indoor-Reihe für die Indoor-Seite (variant: "indoor"), dieselbe Technik mit 50 Drohnen.
//
// Der Himmel-Schwarm fliegt als Feuerwerksblüte ein (der Knall von gestern) und übergibt seine 300 Drohnen an diese Bühne.
// Sie spielt mit der Engine des Konfigurators (show-field.js, show-scenes.js, scenes/): dieselben Motive und Geschichten,
// Übergänge (lebendige Wolke, Flug mit Objektpermanenz) und Paketfarben. Neu sind hier nur Auswahl, Tempo und Schwenk.
//
// Dramaturgie: beim ersten Besuch Blüte → unser Feuerwerk (Finale aus dem Konfigurator, kurz) → die Maske der Bokkenrijders
// → das Logo flach, dann als Körper. Danach Stück für Stück aus PIECES, endlos:
//   raum   ein räumliches Bild, das in seiner Standzeit ein Stück anschwenkt (±20°, eine Richtung, langsam an und aus)
//   esc    erst flach (SPARK, ~100 Drohnen, kurz), dann verwandeln sich dieselben Drohnen in den Körper (HORIZON), der
//          anschwenkt; die hinzukommenden steigen dunkel von unten auf und leuchten erst an ihrem Platz
//   story  eine Geschichte in Akten aus dem Konfigurator (ODYSSEY, 300), gerafft
// Gemischt wird mit Regeln: jedes Stück einmal, bevor eines wiederkommt; nie zweimal dieselbe Art hintereinander, und keine
// ähnliche Form (rund, hoch, Tier …) wie in den beiden Stücken davor. Keine Beschriftung, keine Zahlen außer im Motiv selbst.
//
// Leistung (Messung 17.11.: zwei Long Tasks, zusammen 568 ms bei 4× Drosselung, weil ganze Runden am Stück gebaut wurden):
// Zum Einstieg wird nur das erste Bild gebaut; jedes weitere Bild entsteht in einem eigenen Task (requestIdleCallback,
// Safari: setTimeout), und vorgebaut wird nur ein Stück Vorrat, solange die Bühne nicht spielt zwei, wenn sie spielt.
import { createField } from "../show-field.js";
import { steadyClock, yaw } from "../show-motion.js";
import { rankOf } from "../show-tempo.js";
import { share } from "../show-shapes.js";

/** Tempo der Show-Uhr bei der Blüte (wie bisher). */
const RATE = 1.25;
/** Tempo der Show-Uhr in jedem Übergang (Wolke, Flug). Runde 4: 4,2 statt 2,4, und kein Wechsel länger als 0,6 s (ein
 *  weiter Weg läuft entsprechend schneller): Wechsel in etwa 0,5–0,6 s statt 0,6–1,2 s. */
const FLIGHT = 4.2, FLIGHT_MAX = 0.6;
/** Räumliche Bilder: Eigenbewegung 1,6-mal so schnell wie im Konfigurator, Standzeit 1,5 s (Show-Uhr 2,4 s, dazu
 *  Anlauf und Bremsen), darin ein Schwenk von −20° nach +20° um die Hochachse, in einer Richtung (keine Finte). */
const SWING_RATE = 1.6, SWING_HOLD = 1.5, SWING = 0.35;
/** Das flache Bild vor der Verwandlung steht nur kurz. */
const LEAD_HOLD = 1.0;
/** Geschichten: je Akt etwa 1,3 s Standzeit, mindestens 2-fach. */
const STORY_RATE = 2, STORY_BEAT = 1.3;
/** Riesenrad (Marc: „kann sich gerne drehen wie im Konfigurator“): dieselbe Drehung um die Nabe (wheel3d, festival.js),
 *  2,6-mal so schnell, steht dafür 3,4 s; kein Schwenk. */
const WHEEL = { rate: 2.6, hold: 3.4, swing: 0 };
export const N = 300;

/** Schritt: build = Bauname aus show-scenes.js/scenes/, pkg = Paket (Farbe), n = Drohnen, swing = Schwenk (rad) in der
 *  Standzeit, lead = flaches Bild vor der Verwandlung, from = erster Akt einer Geschichte, story = Standzeit gesamt (s),
 *  rate/hold = eigenes Tempo und eigene Standzeit (s) des letzten Bildes, to = Akt, vor dem eine Geschichte endet,
 *  whole = die ganze Geschichte statt der im Konfigurator geteilten (Feuerwerk mit Goldregen). */
const S = (build, n = 100) => ({ build, pkg: "SPARK", n, lead: true });
const H = (build, n = 200, extra = {}) => ({ build, pkg: "HORIZON", n, swing: SWING, ...extra });
const O = (build, extra = {}) => ({ build, pkg: "ODYSSEY", n: N, ...extra });
/** Das Repertoire (Marcs Wunschliste vom 17.11.2026). kind: Art des Stücks; tags: Formfamilie gegen Ähnliches. */
const PIECES = {
  maske: { kind: "raum", tags: ["gesicht"], steps: [O("devilStory", { swing: SWING })] }, // Teufel aus der Bokkenrijders-Show, echte 3D-Formation
  logo: { kind: "esc", tags: ["zeichen"], steps: [S("logo"), H("logo3d")] }, // FlyingStars-Zeichen: flach, dann zwei Ebenen in der Tiefe
  qr: { kind: "story", tags: ["zeichen", "eckig"], steps: [O("qrStory", { story: 3.0 })] }, // Nachricht kommt an → QR-Code „Scan me“; Runde 5: gestrafft (Marc: „ein bisschen langsam“)
  wappen: { kind: "esc", tags: ["zeichen", "eckig"], steps: [S("shield"), H("shield3d", N)] }, // Jubiläum: Wappen mit Stern → Wappen mit „125“ und wehender Fahne
  // Berliner Fernsehturm mit Warnlicht; Runde 5 (Marc: „diese Funkwellen vom Turm“): dann sendet er, die Wellenbögen aus
  // towerStory (Akt 1 und 2, ohne das Brandenburger Tor) laufen nacheinander nach außen
  turm: { kind: "esc", tags: ["hoch"], steps: [S("tower"), H("towerStory", N, { to: 2, swing: 0, rate: 1.6, hold: 2.8 })] },
  kolibri: { kind: "story", tags: ["tier"], steps: [O("hummingbirdStory")] }, // Runde 5: fliegt zur Blüte, trinkt, steigt auf, die Knospen blühen
  riesenrad: { kind: "esc", tags: ["rund"], steps: [S("wheel2d", 150), H("wheel3d", N, WHEEL)] }, // dreht sich um die Nabe, Gondeln hängen
  delfine: { kind: "story", tags: ["tier", "wasser"], steps: [O("dolphinStory", { from: 1 })] }, // Sprung, Ringe, zwei Delfine, Herz
  buch: { kind: "story", tags: ["eckig"], steps: [O("bookStory")] }, // ODYSSEY: das Buch öffnet sich, eine Feder schreibt
  musik: { kind: "story", tags: ["musik"], steps: [O("harpStory")] }, // Harfe, Saiten klingen, die Noten fliegen
  taenzerin: { kind: "story", tags: ["gesicht", "musik"], steps: [O("dancerStory")] }, // Tänzerin dreht sich, der Rock wird zur Blüte
  kugel: { kind: "raum", tags: ["rund"], steps: [{ build: "sphere3d", pkg: "HORIZON", n: N, swing: 0 }] }, // Kugel aus Breiten- und Längenkreisen, dreht sich selbst
  // Schneeflocke → Runde 6: dieselbe Flocke wird räumlich (scenes/schnee.js, drei Ebenen falten sich auf) → Lichterbaum.
  // Runde 11 (Marc 21.11.2026: „Schneeflocke in 2D zu 3D zu Weihnachtsbaum zu 3D-Stern forming out of it auf jeden Fall auf
  // die Startseite … ein best of der beeindruckendsten Motive und Storylines“): die ganze Geschichte aus dem Konfigurator
  // bis zum großen 3D-Stern; story 12 s statt der üblichen Raffung, damit das Sternwachsen Zeit hat (Rate 2 wie der 2×-Knopf)
  baum: { kind: "story", tags: ["hoch"], steps: [O("snowTreeStarStory", { story: 12 })] },
  // Runde 11 (Marc: „die Krake sollte da definitiv auch mit rein“): die 3D+-Geschichte ab 400 Drohnen (scenes/gross/
  // tintenfisch.js, erst beim Bauen nachgeladen); die 100 zusätzlichen Drohnen steigen dunkel von unten auf (joinLate)
  krake: { kind: "story", tags: ["tier", "wasser"], steps: [O("octopusStory", { n: 400, story: 10 })] },
  // Runde 11 (Marc 21.11.2026: „auf der Startseite nicht übertreiben und maximal 400 Drohnen“): aus den neuen Motiven alles,
  // was mit höchstens 400 Drohnen geht. Countdown 10 → 0 mit Feuerwerk (gross/countdown.js, 3D+ ab 400) und der aztekische
  // Drachenkopf (catalog-3d/drache.js, 3D+ ab 300). Wächter: scripts/himmel-folge-drohnen.test.mjs
  countdown: { kind: "story", tags: ["zeichen", "feuer"], steps: [O("countdownStory", { n: 400, story: 10 })] },
  drache: { kind: "story", tags: ["tier", "gesicht"], steps: [O("dragonHead", { story: 8 })] },
  // Feuerwerk aus Drohnen: Leuchtspur, Sterne blühen, Finale; Runde 5 (Marc: „da fehlt dieser Feuerregen“): die ganze
  // Geschichte bis zum Goldregen (whole), der Regen steht 3 s und läuft langsamer, damit man ihn fallen sieht
  feuerwerk: { kind: "story", tags: ["feuer"], steps: [O("fireworkStory", { whole: true, rate: 1.5, hold: 3.0 })] },
};
/** Erster Besuch: unser Feuerwerk (Finale), dann sofort groß. Danach die Wunschliste in dieser Reihenfolge, später gemischt.
 *  Runde 6 (Marc): der QR-Code direkt nach dem Logo (typischer Einsatz: Logo, dann „Scan me“). */
const OPENING = { kind: "story", tags: ["feuer"], steps: [O("fireworkFinale", { story: 2.0, rate: 1.5, hold: 2.6 })] }; // Finale, dann Goldregen
const FIRST = ["maske", "logo", "qr", "kugel", "delfine", "turm", "baum", "wappen", "krake", "countdown", "musik", "drache", "kolibri", "buch", "taenzerin", "riesenrad", "feuerwerk"];

/** Indoor-Reihe (scenes/indoor.js): bis 50 Drohnen, einfache Motive, in fester Runde. */
const NI = 50;
// Runde 6 (Marc: „die Wechsel bzw. die Anzahl und Art der Formen sollten schneller rotieren“): zehn Motive, flach und
// räumlich im Wechsel, je 1,4 s Standzeit (vorher sechs à 2 s).
// Runde 10 (Marc, 20.11.2026: Indoor ist meist ein Business-Event, „mehr solche geometrischen Formen“): Herz, Gesicht,
// Initialen und Ring raus, Würfel, Formen-Morph, Raster, Tetraeder und liegende Acht dazu; flach und räumlich im Wechsel.
// Motive mit eigener Handlung stehen länger (Sekunden): die Formen laufen durch vier Gestalten, der Wellenring braucht Zeit.
const I = (key, hold = 1.4) => ({ build: `indoor:${key}`, pkg: "SPARK", n: NI, hold, rate: 1 });
const INDOOR_ROW = [["welle"], ["wuerfel", 2.2], ["stern"], ["spirale"], ["formen", 3.4], ["raster", 2.4], ["diamant"], ["tetraeder", 2.0], ["noten"], ["lissajous", 2.4], ["krone"]];
const INDOOR = Object.fromEntries(INDOOR_ROW.map(([k, hold]) => [k, { kind: "indoor", tags: [], steps: [I(k, hold)] }]));

/** Varianten: Startseite (Übergabe vom Himmel-Schwarm) und Indoor-Seite (eigene Bühne in #unterschied). */
const VARIANTS = {
  himmel: { n: N, pieces: PIECES, first: FIRST, opening: OPENING, mixed: true, fill: 0.9, light: 1, cloud: { cloudTime: 0.45, cloudSpread: 0.55 } },
  indoor: { n: NI, pieces: INDOOR, first: Object.keys(INDOOR), opening: null, mixed: false, fill: 0.9, light: 1.6, cloud: { cloudTime: 0.4, cloudSpread: 0.45 } },
};

/** Die „125“ des Wappens (show-scenes.js, shield3d bei 300 Drohnen: share(300, [3, 1])[1] Punkte), vorberechnet mit
 *  textFormation() in Node (Meter, 2 Nachkommastellen). Sonst lädt der Textplaner und rechnet am Stück. Ändert sich die
 *  Zahl oder ihre Punktzahl, greift wieder der Planer (nur langsamer). */
const CREST = { value: "125", count: share(N, [3, 1])[1], pts: [[-22.61,6.57],[-21.23,7.83],[-19.84,9.1],[-18.46,10.37],[-18.46,8.48],[-18.46,6.6],[-18.46,4.71],[-18.46,2.83],[-18.46,0.95],[-18.46,-0.94],[-18.46,-2.82],[-18.46,-4.71],[-18.46,-6.59],[-18.46,-8.47],[-18.46,-10.36],[-22.61,-10.36],[-20.53,-10.36],[-16.39,-10.36],[-14.32,-10.36],[-8.79,6.22],[-7.69,7.89],[-6.33,9.36],[-4.47,10.1],[-2.49,10.36],[-0.49,10.23],[1.42,9.63],[2.91,8.31],[3.84,6.53],[3.93,4.53],[3.26,2.65],[2.12,1],[0.65,-0.35],[-0.82,-1.7],[-2.22,-3.14],[-3.61,-4.58],[-4.99,-6.02],[-6.37,-7.47],[-7.75,-8.91],[-9.14,-10.36],[-7.16,-10.36],[-5.19,-10.36],[-3.21,-10.36],[-1.24,-10.36],[0.73,-10.36],[2.71,-10.36],[4.68,-10.36],[21.84,10.37],[19.94,10.37],[18.04,10.37],[16.14,10.37],[14.24,10.37],[12.34,10.37],[10.44,10.37],[10.18,8.21],[9.92,6.05],[9.67,3.89],[9.41,1.73],[11.29,2.4],[13.2,2.99],[15.19,3.22],[17.19,3.15],[19.12,2.59],[20.74,1.42],[21.93,-0.19],[22.5,-2.11],[22.61,-4.1],[22.22,-6.07],[21.37,-7.88],[19.98,-9.32],[18.13,-10.07],[16.15,-10.37],[14.15,-10.25],[12.22,-9.69],[10.57,-8.57],[9.06,-7.25]] };
/** Ein eigener Task, wenn der Browser Luft hat (Safari kennt requestIdleCallback nicht: setTimeout). */
const idle = () => new Promise((res) => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => res(), { timeout: 1200 }) : setTimeout(res, 40)));

/** Legt ein Bild auf eine neue Uhr: Eigenbewegung (b.steady.raw aus show-scenes.js) läuft hold Sekunden Show-Uhr lang,
 *  sanft an und aus (steadyClock, keine Finten); swing schwenkt das Bild dabei einmal von −swing nach +swing um die
 *  Hochachse durch seine Mitte. Bei t ≤ 0 steht es bei −swing: Dorthin fliegen die Drohnen an, es gibt keinen Sprung. */
function restage(b, swing, hold) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2] || 0); z1 = Math.max(z1, p[2] || 0); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, motion = Math.max(0.6, hold);
  const clock = steadyClock(motion, { from: b.steady?.from ?? 0 }), turn = steadyClock(motion);
  const raw = b.steady?.raw, light = b.steady ? null : b.live;
  if (!raw && !light && !swing) return;
  b.live = (p, j, t, o) => {
    if (raw) raw(p, j, clock(t), o); else if (light) light(p, j, t, o);
    if (swing) yaw(o, swing * ((2 * turn(t)) / motion - 1), cx, cz);
  };
  b.hold = clock.hold; b.restaged = true;
}
/** Wie show-scenes.js steady(): ein bewegtes Bild läuft auf steadyClock (für die Indoor-Motive, die ohne buildSequence
 *  entstehen). */
function steadyBeat(b) {
  const own = b.live; if (!own) return b;
  b.steady = { raw: own, from: 0 };
  return b;
}

/**
 * Bühne in canvas. burst: die Punkte der Feuerwerksblüte [x, y, z, r, g, b] (dieselben wie im Himmel-Schwarm).
 * Gibt { ready, place, canEnter, enter, start, peek, play, leave, hide, radius } zurück (siehe unten).
 * variant "indoor": eigene Bühne ohne Schwarm; das Canvas liegt per CSS in seiner Bühne (siehe mountFolge()).
 * @param {HTMLCanvasElement} canvas
 * order: eigene Reihenfolge der Stücke ohne Auftakt (Prüfwerkzeuge, Kontaktbögen).
 * @param {{ locale?: string, burst?: number[][], rnd?: () => number, variant?: "himmel" | "indoor", order?: string[] }} [opts]
 */
export function createFolge(canvas, { burst = [], rnd = Math.random, variant = "himmel", order = null } = {}) {
  const V = VARIANTS[variant] ?? VARIANTS.himmel, NV = V.n, PIECE = V.pieces;
  // Hinzukommende Drohnen warten unter dem Bild (Anzeigeeinheiten, das Bild reicht bis etwa ±0,75 · size), über die Breite
  // verteilt, als lockerer Schwarm; dank joinLate fliegen sie dunkel und leuchten erst an ihrem Platz auf
  let size = 1;
  const hash = (x) => { const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const below = (i, out) => { const r = hash(i + 0.5); out[0] = (hash(i) - 0.5) * 2.1 * size; out[1] = -(1.0 + 0.7 * r * r) * size; out[2] = (hash(i + 0.25) - 0.5) * 0.5 * size; return out; };

  /** Fertige Stücke ({ beats, loopTo }), die als Nächstes spielen. */
  const ready = [];
  let scene = null, seg = 0, swapping = false, playing = false, building = null, opened = !V.opening || Boolean(order);
  const field = createField(canvas, { ...V.cloud, outside: below, flightRate: FLIGHT, flightMax: FLIGHT_MAX, joinLate: true, lightScale: V.light, onBeat: (k, b) => field?.setRate(b.rate ?? RATE), onTick: (tl) => {
    if (!playing || swapping || !tl || !ready.length || tl.beats !== scene?.beats) return;
    if (tl.beat === tl.beats.length - 1 && tl.frac >= 0.97) { swapping = true; scene = ready.shift(); showScene(scene, { cloud: true }); swapping = false; prepare(); }
  } });
  // Startseite: Pause und reduzierte Bewegung steuert der Himmel-Schwarm (er zeigt dann ein stehendes Bild). Indoor: das
  // Feld selbst (Pause-Taste, reduzierte Bewegung → das Motiv steht).
  field.setMotionIndependent(variant === "himmel");
  field.setRate(RATE);
  field.setPaused(true);

  /** Ein Schritt als Bilder in der Paketfarbe, mit Tempo je Bild (onBeat → setRate) und gegebenenfalls Schwenk. */
  async function beatsOf(step, cloud) {
    const { build, pkg, n } = step;
    let all;
    if (build.startsWith("indoor:")) {
      const { indoorScene } = await import("../scenes/indoor.js");
      all = indoorScene(build.slice(7), n).beats.map(steadyBeat);
    } else {
      const [{ buildSequence }, { SHOW_PACKAGES }] = await Promise.all([import("../show-scenes.js"), import("../../content/show-packages.ts")]);
      const seq = await buildSequence([{ id: "m", label: "", tiers: { [pkg]: { build, caption: "", minDrones: 0, ...(step.whole ? { whole: true } : {}) } } }], pkg, n, SHOW_PACKAGES[pkg].color, "");
      all = seq.beats;
    }
    const s = seg++;
    const beats = all.filter((b) => !b.interlude).slice(step.from ?? 0, step.to);
    const total = beats.reduce((sum, b) => sum + (b.hold ?? 2.2), 0);
    const storyRate = Math.max(STORY_RATE, total / (step.story ?? STORY_BEAT * beats.length + 1));
    return beats.map((b, i) => {
      let rate = storyRate;
      const last = i === beats.length - 1;
      if (last && step.rate) { rate = step.rate; restage(b, step.swing ?? 0, (step.hold ?? SWING_HOLD) * rate); }
      else if (last && step.swing !== undefined) { rate = SWING_RATE; restage(b, step.swing, SWING_HOLD * SWING_RATE); }
      else if (step.lead) rate = Math.max(STORY_RATE, (b.hold ?? 2.2) / LEAD_HOLD);
      return { ...b, segment: s, drones: n, rate, cloud: i === 0 ? cloud : Array.isArray(b.cloud) ? b.cloud : false };
    });
  }

  // Auswahl: first der Reihe nach, danach gemischt ohne Zurücklegen mit Regeln (siehe oben); Indoor in fester Runde
  const queue = [...(order ?? V.first)], history = [];
  let bag = [];
  function nextPiece() {
    if (!V.mixed) { const id = queue.shift(); queue.push(id); return id; }
    if (queue.length) return queue.shift();
    if (!bag.length) {
      bag = Object.keys(PIECE);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    const last = PIECE[history.at(-1)], near = new Set(history.slice(-2).flatMap((id) => PIECE[id].tags));
    const fits = (id, strict) => id !== history.at(-1) && PIECE[id].kind !== last?.kind && (!strict || !PIECE[id].tags.some((t) => near.has(t)));
    let k = bag.findIndex((id) => fits(id, true));
    if (k < 0) k = bag.findIndex((id) => fits(id, false));
    if (k < 0) k = 0;
    return bag.splice(k, 1)[0];
  }
  /** Ein Stück bauen, jedes Bild in einem eigenen Task; das Licht-Ranking der Bilder ebenfalls vorab (sonst beim Start des
   *  Bildes im Zeichen-Frame). Misslingt ein Bild (Netz), entfällt das Stück. */
  async function buildPiece(piece, id) {
    const beats = [];
    if (piece.steps.some((st) => st.build === "shield3d")) {
      const { primeTextFormation } = await import("../text-formation.js");
      primeTextFormation(CREST.value, CREST.count, CREST.pts);
    }
    for (const [i, step] of piece.steps.entries()) {
      await idle();
      beats.push(...await beatsOf(step, i === 0)); // im ersten Schritt Wolke, danach Verwandlung (Flug, dieselben Drohnen)
    }
    for (const b of beats) { await idle(); rankOf(b); }
    return { beats, loopTo: beats.length - 1, id };
  }
  /** Vorrat auffüllen: ein Stück, solange die Bühne nicht spielt, zwei, wenn sie spielt. */
  function prepare() {
    if (building || ready.length >= (playing ? 2 : 1)) return building;
    building = (async () => {
      let built = false;
      for (let tries = 0; tries < 4 && !built; tries++) {
        let id = null;
        try {
          const piece = opened ? PIECE[(id = nextPiece())] : V.opening;
          const piece2 = await buildPiece(piece, id ?? "auftakt");
          if (id) history.push(id);
          opened = true;
          ready.push(piece2);
          built = true;
        } catch (e) { console.warn("Show-Folge:", id ?? "Auftakt", e); opened = true; }
      }
      building = null;
      // nach vier Fehlschlägen (Netz weg, Fehler im Motiv) nicht sofort weiter versuchen, sonst läuft das endlos
      if (built && ready.length < (playing ? 2 : 1)) prepare();
    })();
    return building;
  }
  const burstBeat = () => ({ pts: burst, segment: -1, drones: NV, hold: 1.1, rate: RATE });

  /** Zoom je Motiv: Das Feld passt jedes Bild in ein festes Querformat (±1,15 × ±0,75 · S); auf der hohen Bühne hier füllen
   *  hohe Motive damit nur zwei Drittel der Höhe. Darum je Motiv so weit vergrößern, dass es die Bühne in Breite oder Höhe
   *  zu fill füllt. Bei Bildern mit eigener Uhr (restage) wird gemessen, wohin sie sich in ihrer Standzeit wirklich bewegen
   *  (Eigenbewegung und Schwenk an neun Zeitpunkten), um die Mitte, die das Feld für das Motiv nimmt. */
  function zoomAll(beats) {
    const W = frame.w, H = frame.h, S = Math.min(W * 0.36, H * (W < 600 ? 0.38 : 0.6)), segs = new Map(), o = [0, 0, 0, 1];
    for (const b of beats) { const k = b.segment ?? 0; if (!segs.has(k)) segs.set(k, []); segs.get(k).push(b); }
    for (const list of segs.values()) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const b of list) for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      let hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
      for (const b of list) {
        if (!b.restaged || b.fitPts) continue; // nur Bilder mit eigener Uhr (Schwenk, Riesenrad, Indoor); Geschichten wie bisher
        const span = b.hold ?? 2.2;
        for (let s = 0; s <= 8; s++) {
          const t = (span * s) / 8;
          b.pts.forEach((p, j) => {
            o[0] = p[0]; o[1] = p[1]; o[2] = p[2] || 0; o[3] = 1; b.live(p, j, t, o);
            if (o[3] < 0.05) return; // dunkle Reserve zählt nicht
            hw = Math.max(hw, Math.abs(o[0] - cx)); hh = Math.max(hh, Math.abs(o[1] - cy));
          });
        }
      }
      hw = Math.max(hw, 1e-6); hh = Math.max(hh, 1e-6);
      const fw = Math.max((x1 - x0) / 2, 1e-6), fh = Math.max((y1 - y0) / 2, 1e-6);
      // gewünschte Pixel je Einheit, und was das Feld ohne Zoom gäbe (fit() in show-field.js)
      const want = V.fill * Math.min(box.w / 2 / hw, box.h / 2 / hh), live = list.some((b) => b.live) ? 0.9 : 1;
      const base = (live / Math.max(fw / 1.15, fh / 0.75)) * size * S;
      for (const b of list) b.zoom = want / base;
    }
  }
  const showScene = (s, opts) => { zoomAll(s.beats); canvas.dataset.piece = s.id ?? ""; field.show(s, NV, size, opts); }; // data-piece: für Prüfwerkzeuge

  /** Canvas in Seitenkoordinaten: das Bild füllt box, das Canvas reicht darüber hinaus (aufsteigende Drohnen unter dem Bild),
   *  aber nie über den Fensterrand. Die Feldmitte liegt in der Canvas-Mitte, darum ringsum symmetrische Ränder.
   *  Indoor: box in Koordinaten der Bühne (0, 0, Breite, Höhe); Lage und Größe des Canvas stehen im CSS. */
  let frame = { x: 0, y: 0, w: 0, h: 0 }, box = { x: 0, y: 0, w: 1, h: 1 };
  function place(b) {
    box = b;
    if (variant === "indoor") {
      // Bühnenkoordinaten; Lage und Größe des Canvas stehen im CSS der Komponente (--stage-bleed ringsum symmetrisch, die
      // Feldmitte ist die Canvas- und damit die Bühnenmitte)
      frame = { x: canvas.offsetLeft, y: canvas.offsetTop, w: canvas.offsetWidth, h: canvas.offsetHeight };
    } else {
      const vw = document.documentElement.clientWidth;
      const mx = Math.max(0, Math.min(80, box.x, vw - box.x - box.w)), my = Math.round(Math.min(240, box.h * 0.6));
      frame = { x: Math.round(box.x - mx), y: Math.round(box.y - my), w: Math.round(box.w + 2 * mx), h: Math.round(box.h + 2 * my) };
      const st = canvas.style;
      st.left = frame.x + "px"; st.top = frame.y + "px"; st.width = frame.w + "px"; st.height = frame.h + "px";
    }
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
      scene = { beats: [burstBeat(), ...first.beats], loopTo: first.beats.length, id: first.id };
      field.setPaused(true);
      showScene(scene, { instant: true, at: 0 });
      prepare();
      return { pts: this.peek(), radius: field.radius() };
    },
    /** Indoor: ohne Schwarm. Die Drohnen steigen dunkel von unten auf und bilden das erste Motiv (bei reduzierter Bewegung
     *  oder Pause steht es sofort). */
    start(b) {
      place(b);
      if (!ready.length) return false;
      const first = ready.shift();
      scene = first;
      playing = true; field.setPaused(false);
      showScene(scene, { cloud: true });
      prepare();
      return true;
    },
    /** Lage, Licht und Farbe der Drohnen in Seitenkoordinaten: [x, y, Licht, r, g, b]. */
    peek: () => field.drones(NV).map(([x, y, a, r, g, b]) => [x + frame.x, y + frame.y, a, r, g, b]),
    /** Übergabe: die Bühne spielt (und baut ihren Vorrat auf zwei Stücke aus). */
    play() { playing = true; canvas.style.visibility = "visible"; field.setPaused(false); prepare(); },
    /** Rückgabe an den Schwarm: friert ein, versteckt sich, gibt die Drohnen zurück. */
    leave() { const pts = this.peek(); this.hide(); return pts; },
    hide() { playing = false; field.setPaused(true); canvas.style.visibility = "hidden"; },
    get radius() { return field.radius(); },
  };
}

/**
 * Indoor-Reihe in ihrer Bühne (Sustainability.astro, `data-folge="indoor"`): Canvas darin, Start erst, wenn die Bühne
 * zu einem Drittel im Bild ist; das erste Motiv wird vorher in Leerlauf-Tasks gebaut.
 * @param {HTMLElement} stage
 */
export function mountFolge(stage) {
  const canvas = stage.querySelector("canvas");
  if (!canvas || stage.dataset.folgeOn) return;
  stage.dataset.folgeOn = "1";
  const f = createFolge(canvas, { variant: stage.dataset.folge === "indoor" ? "indoor" : "himmel" });
  const boxOf = () => ({ x: 0, y: 0, w: stage.clientWidth, h: stage.clientHeight });
  let started = false;
  f.ready.then(() => {
    f.place(boxOf()); // Canvas schon vor dem Start in seiner Größe, damit das erste Bild nicht im alten Maßstab steht
    const io = new IntersectionObserver((entries) => {
      if (started || !entries.some((e) => e.isIntersecting)) return;
      started = f.start(boxOf());
      if (started) { io.disconnect(); stage.classList.add("is-live"); }
    }, { threshold: 0.33 });
    io.observe(stage);
  }).catch((e) => console.warn("Indoor-Reihe nicht verfügbar:", e));
  if ("ResizeObserver" in window) new ResizeObserver(() => f.place(boxOf())).observe(stage);
}
