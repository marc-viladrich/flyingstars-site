// Show-Folge bei #warum-drohnen (docs/himmel.md → „Feuerwerk? War gestern“). Marc, 15.11.2026: „deutlich nicere Animationen
// und viiiiel mehr Auswahl … quasi never-ending loop … unsere Spark-Horizon-Odyssey-Transformationen und -Eskalationen
// sollten hier gut sichtbar werden, weil im Text ja auch die Rede von 2D und 3D ist.“
//
// Der Himmel-Schwarm fliegt als Feuerwerksblüte ein (der Knall von gestern) und übergibt seine 300 Drohnen an diese Bühne.
// Sie spielt mit der Engine des Konfigurators (show-field.js, show-scenes.js, scenes/catalog.js): dieselben Motive, Übergänge
// (lebendige Wolke, Flug mit Objektpermanenz), Motivaktionen (Smiley zwinkert, Handschlag, Konfettikanone, Gläser) und
// Paketfarben. Nichts davon ist hier neu erfunden.
//
// Dramaturgie: Runde für Runde dieselbe Eskalation, jedes Mal mit anderen Motiven.
//   SPARK   (~100 Drohnen)  zwei flache Katalogbilder (jede zweite Runde eines davon ein kurzes Wort), dann das SPARK-Bild
//                            des Leitmotivs der Runde
//   HORIZON (~200)          das Leitmotiv wird zum Körper (dieselben Drohnen, 100 steigen dazu), danach ein räumliches
//                            Katalogmotiv, das sich dreht
//   ODYSSEY (300)           das Leitmotiv als erzählte Geschichte in Akten
// Danach landen 200 Drohnen, die nächste Runde beginnt klein. Gemischt wird mit Regeln: kein Motiv zweimal, bevor alle dran
// waren, und kein Bild mit demselben Thema wie eines der beiden davor. Hinzukommende Drohnen steigen von unten auf,
// überzählige sinken dorthin und gehen aus (outside → show-field.js). Keine Beschriftung, keine Zahlen.
import { createField } from "../show-field.js";
import { buildSequence } from "../show-scenes.js";
import { SHOW_PACKAGES } from "../../content/show-packages.ts";
import { getConfiguratorContent } from "../../content/show-configurator.js";
import catalog from "../../content/catalog-motifs.json";

/** Tempo gegenüber der Vorschau im Konfigurator: Bilder stehen gut 3 s, Wechsel 1,3–2 s. */
const RATE = 1.25;
/** Längste Dauer einer erzählten Geschichte (ODYSSEY) in Sekunden. */
const STORY = 14;
/** Lebendige Wolke kürzer und ruhiger als im Konfigurator (wie im Startseiten-Teaser). */
const CLOUD = { cloudTime: 0.5, cloudSpread: 0.55 };
/** Das Motiv füllt höchstens 86 % der Bühne in Breite oder Höhe (Eigenbewegung, Drehung, Perspektive). */
const FILL = 0.86;
export const N = 300;

/** Flache Katalogmotive für SPARK (nach Sichtung lesbar bei ~100 Drohnen), mit Thema gegen Wiederholung. */
const FLAT = {
  anstossen: "trinken", doppelherz: "liebe", taube: "frieden", blueten: "blume", unendlich: "liebe", ballons: "feier", handschlag: "hand",
  stern: "himmel", sportwagen: "fahrzeug", galaxie: "himmel", palme: "urlaub", bierkrug: "trinken", cocktail: "trinken", eheringe: "liebe",
  sektflasche: "trinken", peace: "frieden", hubschrauber: "luft", flugzeug: "luft", smiley: "gesicht", elefant: "tier", hasen: "tier",
  hund: "tier", glocke: "feier", diskokugel: "musik", blume: "blume", biene: "tier", roboter: "technik", amor: "liebe", anker: "meer",
  robbe: "meer", mikrofon: "musik", sparschwein: "geld", torte: "feier", lotusblume: "blume", konfetti: "feier", basketball: "sport",
  leuchtturm: "meer", kind: "feier",
};
/** Räumliche Katalogmotive für HORIZON: Sie drehen sich. */
const DEEP = { kugel: "kugel", atom: "technik", pyramide: "form", spirale: "form", wasserball: "sport", welle: "meer", schmetterling: "tier", moebius: "form" };
/** Leitmotive aus dem Konfigurator: [Anlass, Motiv, Thema]. Ohne Feuerwerk (die Section sagt, das war gestern), ohne
 *  Wappen und Logo (Kund:innen- bzw. Markenzeichen) und ohne Geschichten, die erst ab 450 Drohnen spielen. */
const HEROES = [
  ["launch", "rakete", "luft"], ["launch", "idee", "technik"], ["jubilaeum", "pokal", "sport"], ["jubilaeum", "fussball", "sport"],
  ["jubilaeum", "wahrzeichen", "stadt"], ["festival", "reise", "reise"], ["festival", "kolibri", "tier"], ["festival", "riesenrad", "feier"],
  ["festival", "delfin", "meer"], ["festival", "drache", "tier"], ["hochzeit", "ring", "liebe"], ["hochzeit", "herz", "liebe"],
  ["hochzeit", "lotus", "blume"], ["kultur", "buch", "kultur"], ["kultur", "vorhang", "kultur"], ["kultur", "maske", "kultur"],
  ["kultur", "noten", "musik"], ["kultur", "tanz", "musik"], ["silvester", "uhr", "zeit"], ["silvester", "schnee", "winter"],
  ["silvester", "sekt", "trinken"], ["silvester", "klee", "glueck"],
];
/** Wenige kurze Worte (Entwürfe, nicht mit FlyingStars abgestimmt). */
const WORDS = { de: ["WOW", "HALLO", "PSST"], en: ["WOW", "HELLO", "SHH"], nl: ["WOW", "HALLO", "PSST"] };

const ceil10 = (v) => Math.ceil(v / 10) * 10;
/** Kleinste Variante, die SPARK „klein“ hält (bis 120 Punkte, sonst die kleinste); HORIZON die größte bis 200. */
const flatCount = (key) => { const vs = catalog.motifs[key].variants, v = vs.filter((q) => q.points <= 120).at(-1) ?? vs[0]; return Math.max(100, ceil10(v.points)); };
const deepCount = (key) => { const vs = catalog.motifs[key].variants, v = vs.filter((q) => q.points <= 200).at(-1) ?? vs[0]; return Math.max(200, ceil10(v.points)); };

/** Ziehen ohne Zurücklegen: jedes Element einmal, bevor eines wiederkommt; meidet Themen, die gerade zu sehen waren. */
class Bag {
  constructor(items, theme, rnd) { this.items = items; this.theme = theme; this.rnd = rnd; this.left = []; this.last = null; }
  next(avoid) {
    if (!this.left.length) {
      this.left = [...this.items];
      for (let i = this.left.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [this.left[i], this.left[j]] = [this.left[j], this.left[i]]; }
      if (this.left.length > 1 && this.left[0] === this.last) this.left.push(this.left.shift()); // kein Motiv zweimal hintereinander über die Grenze
    }
    let k = this.left.findIndex((x) => !avoid.has(this.theme(x)));
    if (k < 0) k = 0;
    const [x] = this.left.splice(k, 1);
    this.last = x;
    return x;
  }
}

/**
 * Bühne in canvas. burst: die Punkte der Feuerwerksblüte [x, y, z, r, g, b] (dieselben wie im Himmel-Schwarm).
 * Gibt { ready, place, enter, play, leave, peek, hide } zurück (siehe unten).
 * @param {HTMLCanvasElement} canvas
 * @param {{ locale?: string, burst?: number[][], rnd?: () => number }} [opts]
 */
export function createFolge(canvas, { locale = "de", burst = [], rnd = Math.random } = {}) {
  const lang = WORDS[locale] ? locale : "de";
  const { OCCASIONS } = getConfiguratorContent(lang);
  const motifOf = (occ, id) => OCCASIONS.find((o) => o.id === occ)?.motifs.find((m) => m.id === id);
  const heroes = HEROES.filter(([o, id]) => motifOf(o, id));
  const flats = new Bag(Object.keys(FLAT).filter((k) => catalog.motifs[k]), (k) => FLAT[k], rnd);
  const deeps = new Bag(Object.keys(DEEP).filter((k) => catalog.motifs[k]), (k) => DEEP[k], rnd);
  const heroBag = new Bag(heroes, (h) => h[2], rnd);
  const words = new Bag(WORDS[lang], () => "wort", rnd);
  const recent = [];
  const avoid = () => new Set(recent.slice(-2));
  const seen = (theme) => { recent.push(theme); if (recent.length > 4) recent.shift(); };

  // Hinzukommende Drohnen warten unter dem Bild (Anzeigeeinheiten, das Bild reicht bis etwa ±0,75 · size), über die Breite
  // verteilt, eine Reihe tiefer als die Unterkante; überzählige sinken dorthin zurück
  let size = 1;
  const hash = (x) => { const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  // als lockerer Schwarm, nicht als Reihe (eine Reihe unter dem Bild liest sich als Fremdkörper, Runde 25 im Konfigurator)
  const below = (i, out) => { const r = hash(i + 0.5); out[0] = (hash(i) - 0.5) * 2.1 * size; out[1] = -(1.0 + 0.7 * r * r) * size; out[2] = (hash(i + 0.25) - 0.5) * 0.5 * size; return out; };

  let scene = null, next = null, building = null, round = 0, seg = 0, swapping = false, playing = false;
  const field = createField(canvas, { ...CLOUD, outside: below, onBeat: (k, b) => field?.setRate(b.rate ?? RATE), onTick: (tl) => {
    if (!playing || swapping || !tl || !next || tl.beats !== scene?.beats) return;
    if (tl.beat === tl.beats.length - 1 && tl.frac >= 0.97) { swapping = true; const s = next; next = null; scene = s; showScene(s, { cloud: true }); swapping = false; prepare(); }
  } });
  field.setMotionIndependent(true); // Pause und reduzierte Bewegung steuert der Himmel-Schwarm (er zeigt dann ein stehendes Bild)
  field.setRate(RATE);
  field.setPaused(true);

  /** Ein Motiv als Bilder in der Paketfarbe: version = Fassung aus dem Konfigurator oder eigener Bau (Katalog, Wort). */
  async function beatsOf(version, pkg, n, occasion, cloud) {
    const seq = await buildSequence([{ id: "m", label: "", tiers: { [pkg]: { ...version, minDrones: 0 } } }], pkg, n, SHOW_PACKAGES[pkg].color, occasion);
    const s = seg++;
    const beats = seq.beats.filter((b) => !b.interlude);
    // Geschichten in Akten laufen im Konfigurator bis zu 25 s; hier höchstens etwa STORY s, sonst steht ein Akt zu lange
    const vt = beats.reduce((sum, b) => sum + (b.hold ?? 2.2) + 1.4, 0), rate = beats.length > 1 ? Math.max(RATE, vt / STORY) : RATE;
    return beats.map((b, i) => ({ ...b, segment: s, drones: n, rate, cloud: i === 0 ? cloud : Array.isArray(b.cloud) ? b.cloud : false }));
  }
  const catalogVersion = (key, pkg, occ = "") => ({ build: `catalog:${key}:${pkg}:${occ}`, caption: "" });

  /** Eine Runde SPARK → HORIZON → ODYSSEY. */
  async function makeRound() {
    const k = round++;
    const hero = heroBag.next(avoid()), [occ, id, heroTheme] = hero, m = motifOf(occ, id);
    const beats = [];
    const sparks = m.tiers.SPARK ? 2 : 3;
    for (let i = 0; i < sparks; i++) {
      if (k % 2 === 1 && i === 1) { const w = words.next(new Set()); seen("wort"); beats.push(...await beatsOf({ build: "textSPARK", caption: "", value: w, style: "print" }, "SPARK", 100, "", true)); continue; }
      const key = flats.next(new Set([...avoid(), heroTheme])); seen(FLAT[key]);
      beats.push(...await beatsOf(catalogVersion(key, "SPARK"), "SPARK", flatCount(key), "", true));
    }
    // Leitmotiv: SPARK → HORIZON als Verwandlung (Flug, keine Wolke), dann ein drehendes Katalogmotiv, dann die Geschichte
    if (m.tiers.SPARK) { seen(heroTheme); beats.push(...await beatsOf(m.tiers.SPARK, "SPARK", Math.max(100, m.tiers.SPARK.minDrones ?? 100), occ, true)); }
    const h = Math.max(200, m.tiers.HORIZON.minDrones ?? 200);
    beats.push(...await beatsOf(m.tiers.HORIZON, "HORIZON", h, occ, !m.tiers.SPARK));
    const key = deeps.next(new Set([...avoid(), heroTheme])); seen(DEEP[key]);
    beats.push(...await beatsOf(catalogVersion(key, "HORIZON"), "HORIZON", deepCount(key), "", true));
    beats.push(...await beatsOf(m.tiers.ODYSSEY, "ODYSSEY", N, occ, true));
    seen(heroTheme);
    return beats;
  }
  /** Die nächste Runde im Hintergrund bauen; misslingt ein Motiv (Netz), kommt die nächste Auswahl. */
  function prepare() {
    if (next || building) return building;
    building = (async () => {
      for (let tries = 0; tries < 4; tries++) {
        try { const beats = await makeRound(); next = { beats, loopTo: beats.length - 1 }; break; } catch (e) { console.warn("Show-Folge:", e); }
      }
      building = null;
    })();
    return building;
  }
  const burstBeat = () => ({ pts: burst, segment: -1, drones: N, hold: 1.1 });

  /** Zoom je Motiv: Das Feld passt jedes Bild in ein festes Querformat (±1,15 × ±0,75 · S); auf der hohen Bühne hier füllen
   *  hohe Motive (Gläser, Leuchtturm) damit nur zwei Drittel der Höhe. Darum je Motiv so weit vergrößern, dass es die Bühne
   *  in Breite oder Höhe zu FILL füllt. Räumliche Motive drehen sich: ihre Breite ist der größte Abstand zur Hochachse. */
  function zoomAll(beats) {
    const W = frame.w, H = frame.h, S = Math.min(W * 0.36, H * (W < 600 ? 0.38 : 0.6)), segs = new Map();
    for (const b of beats) { const k = b.segment ?? 0; if (!segs.has(k)) segs.set(k, []); segs.get(k).push(b); }
    for (const list of segs.values()) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, r = 0, deep = false;
      for (const b of list) for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); if (Math.abs(p[2] || 0) > 0.05) deep = true; }
      const cx = (x0 + x1) / 2;
      if (deep) for (const b of list) for (const p of b.fitPts ?? b.pts) r = Math.max(r, Math.hypot(p[0] - cx, p[2] || 0));
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
    /** Erste Runde gebaut. */
    ready: prepare().then(() => { if (!next) throw new Error("Show-Folge: keine Runde"); }),
    place,
    /** Ist die nächste Runde gebaut? (Wer schnell zurückkommt, wartet sonst auf sie.) */
    canEnter: () => Boolean(next),
    /** Für den Anflug: die Blüte steht (unsichtbar) bereit; Lage der 300 Drohnen in Seitenkoordinaten und Lichtgröße. */
    enter(box) {
      place(box);
      if (!next) return null;
      const first = next; next = null;
      scene = { beats: [burstBeat(), ...first.beats], loopTo: first.beats.length };
      field.setPaused(true);
      showScene(scene, { instant: true, at: 0 });
      prepare();
      return { pts: this.peek(), radius: field.radius() };
    },
    /** Lage, Licht und Farbe der 300 Drohnen in Seitenkoordinaten: [x, y, Licht, r, g, b]. */
    peek: () => field.drones(N).map(([x, y, a, r, g, b]) => [x + frame.x, y + frame.y, a, r, g, b]),
    /** Übergabe: die Bühne spielt. */
    play() { playing = true; canvas.style.visibility = "visible"; field.setPaused(false); },
    /** Rückgabe an den Schwarm: friert ein, versteckt sich, gibt die Drohnen zurück. */
    leave() { const pts = this.peek(); this.hide(); return pts; },
    hide() { playing = false; field.setPaused(true); canvas.style.visibility = "hidden"; },
    get radius() { return field.radius(); },
  };
}
