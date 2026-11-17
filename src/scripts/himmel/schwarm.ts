// Der Schwarm („Himmel“): EIN Schwarm aus 300 Drohnen begleitet den Besuch als Show (docs/himmel.md).
//
// Regeln (aus einer echten Drohnenshow abgeleitet, docs/DESIGN.md → Bewegung, Himmel):
// 1. Ein Schwarm, viele Bilder: dieselben Drohnen bilden jedes Bild der Seite. Nichts entsteht, nichts verschwindet.
// 2. Bilder stehen, Wechsel sind dunkel: neben dem Text steht das Bild still; unterwegs fliegen die Drohnen gedimmt,
//    etwa jede zehnte funkelt, das Licht geht erst am Ziel an (lebendige Wolke, kein Einrasten, keine Finten).
// 3. Die Seite antwortet mit dem Himmel: Anlass zeigen, Paket zeigen, Ort eintippen ändert das Bild.
// 4. Nur echte Formationen: Motive aus FlyingStars' Katalog (public/media/katalog/), Schrift aus dem Einstrich-Textplaner
//    (text-formation.js). Einzige Ausnahme ist die Feuerwerksblüte bei #warum-drohnen, parametrisch erzeugt.
// 6. Bei #warum-drohnen übergibt der Schwarm an eine eigene Show-Folge (folge.js, Engine des Konfigurators): Er fliegt als
//    Blüte ein, die Folge spielt SPARK → HORIZON → ODYSSEY in Runden, beim Weiterscrollen übernimmt er die Drohnen wieder.
// 5. Nur mit Luft: ein Bild steht nur dort, wo es mit Abstand nichts berührt (free()); sonst bleibt die Stelle leer.
//
// Reduzierte Bewegung oder Pause (html.motion-paused): jede Bühne zeigt ihr Bild, nichts fliegt.
// Technik: ein Canvas liegt in Seitenkoordinaten (position:absolute) und scrollt mit dem Inhalt. Stehende Bilder
// brauchen deshalb beim Scrollen kein JavaScript; gerechnet wird nur im Flug, beim Lichtlauf und bei 3D-Motiven.
import catalog from '../../content/catalog-motifs.json';
import { gradientAt } from '../effects/swarm.js';
import { hash, lightOrder } from '../formation/index.js';
import { loadTextEngine, textFormation } from '../text-formation.js';

type Spec = { motif: string; budget?: number } | { text: string; count: number } | { burst: true } | { seq: Spec[] };
type Box = { x: number; y: number; w: number; h: number };
type Place = 'head' | 'form' | 'zeile';
type React = (slot: Slot, on: (spec: Spec) => void) => void;
interface Scene { id: string; n: number; pts: Float32Array; col: Uint8Array; rank: Float32Array; ax: number; ay: number; turn: boolean }
/** Eine Bühne. deskOnly: spielt nur ab 900 px Breite. then: einmal je Besuch wird aus spec dieses Bild (Feuerwerk → Stern).
 *  when: spielt nur, wenn die Section es zulässt (z. B. keine eigene Formation darin). max: größte Bildbreite in px (kleines Motiv). */
interface SlotDef { sel: string; place: Place; spec: Spec | ((host: HTMLElement) => Spec); deskOnly?: boolean; then?: Spec; react?: React; when?: (host: HTMLElement) => boolean; max?: number; folge?: boolean }
/** Die Show-Folge (folge.js), erst nahe an ihrer Section geladen. */
interface Folge { ready: Promise<void>; canEnter(): boolean; place(box: Box): unknown; enter(box: Box): { pts: number[][]; radius: number } | null; peek(): number[][]; play(): void; leave(): number[][]; hide(): void }
interface Slot { def: SlotDef; host: HTMLElement; box: Box; scene: Scene | null; want: string; spec: Spec; first: Spec; seqAt: number; own: HTMLElement | null; turned: boolean }

const N = 300;
const DESK = 900;
const html = () => document.documentElement;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || html().classList.contains('motion-paused');
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lang = () => (['de', 'en', 'nl'].includes(html().lang) ? html().lang : 'de') as 'de' | 'en' | 'nl';
const idOf = (s: Spec): string => ('motif' in s ? `m:${s.motif}:${s.budget ?? N}` : 'text' in s ? `t:${s.text}:${s.count}` : 'burst' in s ? 'burst' : `q:${s.seq.map(idOf).join('+')}`);

/* ---------- Szenen: echte Formationen ---------- */

type Motif = { name: Record<string, string>; dimension: string; variants: Array<{ id: string; points: number }> };
const MOTIFS = (catalog as unknown as { motifs: Record<string, Motif> }).motifs;
const scenes = new Map<string, Promise<Scene>>();

/** Wer ein Motiv beim Namen nennt („Herz“, „Stern“, „Leuchtturm“), bekommt neben dem Wort auch das Bild aus dem Katalog. */
const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]/g, '').trim();
const ALIAS: Record<string, string> = {
  herz: 'doppelherz', liebe: 'doppelherz', love: 'doppelherz', heart: 'doppelherz', hart: 'doppelherz', ringe: 'eheringe', ring: 'eheringe', rings: 'eheringe', ringen: 'eheringe',
  bier: 'bierkrug', beer: 'bierkrug', sekt: 'sektflasche', champagner: 'sektflasche', champagne: 'sektflasche', prost: 'anstossen', cheers: 'anstossen', proost: 'anstossen',
  torte: 'torte', geburtstag: 'geburtstag', birthday: 'geburtstag', verjaardag: 'geburtstag', auto: 'sportwagen', car: 'sportwagen', ufo: 'kuhufo', kuh: 'kuhufo', palme: 'palme', insel: 'palme',
  baum: 'lebensbaum', tree: 'lebensbaum', frieden: 'peace', ballon: 'ballons', balloon: 'ballons', konfetti: 'konfetti', confetti: 'konfetti', hase: 'hasen', smiley: 'smiley', unendlich: 'unendlich', infinity: 'unendlich',
  welle: 'welle', wave: 'welle', cocktail: 'cocktail', glocke: 'glocke', roboter: 'roboter', robot: 'roboter', taube: 'taube', pyramide: 'pyramide', disco: 'diskokugel', disko: 'diskokugel', lotus: 'lotusblume',
};
let words: Map<string, string> | null = null;
function motifFor(text: string): string | null {
  if (!words) {
    words = new Map();
    for (const [key, m] of Object.entries(MOTIFS)) for (const name of [key, ...Object.values(m.name)]) { const k = norm(name); if (k && !words.has(k)) words.set(k, key); }
    for (const [a, key] of Object.entries(ALIAS)) if (MOTIFS[key]) words.set(a, key);
  }
  return words.get(norm(text)) ?? null;
}

function finish(id: string, raw: number[][], colors: (i: number, x: number) => number[], extra: Partial<Scene>): Scene {
  const n = raw.length;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of raw) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, half = Math.max(x1 - x0, y1 - y0, 1e-6) / 2;
  const pts = new Float32Array(n * 3), col = new Uint8Array(n * 3);
  raw.forEach((p, i) => {
    pts[i * 3] = (p[0] - cx) / half; pts[i * 3 + 1] = (p[1] - cy) / half; pts[i * 3 + 2] = (p[2] || 0) / half;
    col.set(colors(i, (p[0] - cx) / half), i * 3);
  });
  const rank = lightOrder(raw.map((p) => ({ x: (p[0] - cx) / half, y: -(p[1] - cy) / half })));
  return { id, n, pts, col, rank, ax: (x1 - x0) / 2 / half, ay: (y1 - y0) / 2 / half, turn: false, ...extra };
}
/** Dunkle Katalogfarben (Braun, Dunkelgrün) hell genug für den Bildschirm; der Farbton bleibt. */
function lit(r: number, g: number, b: number): number[] {
  const m = Math.max(r, g, b); if (m === 0) return [237, 230, 218];
  const k = m < 205 ? 205 / m : 1; return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)].map(Math.round);
}

/** Feuerwerksblüte (Päonie): Strahlen aus der Mitte, zu den Spitzen dichter und leicht hängend, wie ein Stern kurz vor dem Fallen.
 *  Warmes Gold innen, helle Spitzen. Alle 300 Drohnen sind Teil des Bildes. */
function burst(): number[][] {
  const rays = 22, per = Math.floor(N / rays), raw: number[][] = [];
  for (let r = 0; r < rays; r++) {
    const a = (r / rays) * Math.PI * 2 + (hash(r, 41) - 0.5) * 0.12, reach = 0.86 + hash(r, 43) * 0.14;
    for (let j = 0; j < per; j++) {
      const t = (j + 1) / per, d = reach * (0.16 + 0.84 * t ** 0.72);
      raw.push([Math.cos(a) * d, Math.sin(a) * d - 0.14 * d * d, 0, t]);
    }
  }
  // Die übrigen Drohnen bilden einen kleinen, ruhigen Kranz in der Mitte
  const rest = N - raw.length;
  for (let i = 0; i < rest; i++) { const a = (i / rest) * Math.PI * 2; raw.push([Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0, 0]); }
  return raw;
}

/** Die Blüte als Punkte mit Farbe für die Show-Folge (dieselbe Reihenfolge wie die Szene: Drohne i ↔ Punkt i). */
const burstPts = (): number[][] => burst().map(([x, y, z, t]) => [x, y, z, 255, Math.round(178 + 62 * t), Math.round(96 + 130 * t)]);

let fixed: Promise<Record<string, number[][]>> | null = null;
const fixedTexts = () => (fixed ??= fetch(`/media/himmel/texte-${lang()}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

function load(spec: Spec): Promise<Scene> {
  const id = idOf(spec);
  let p = scenes.get(id);
  if (!p) {
    p = build(spec, id);
    p.catch(() => scenes.delete(id));
    scenes.set(id, p);
  }
  return p;
}
async function build(spec: Spec, id: string): Promise<Scene> {
  if ('seq' in spec) return load(spec.seq[0]);
  if ('burst' in spec) {
    const raw = burst();
    return finish(id, raw, (i) => { const t = raw[i][3]; return [255, Math.round(178 + 62 * t), Math.round(96 + 130 * t)]; }, {});
  }
  if ('text' in spec) {
    // Feste Worte liegen vorberechnet bereit (tools/himmel/texte-vorberechnen.mjs); der Textplaner lädt erst für Eigenes
    const ready = (await fixedTexts())[id];
    if (ready) return finish(id, ready.map(([x, y]) => [x, y, 0]), (_i, x) => gradientAt((x + 1) / 2), {});
    await loadTextEngine();
    const f = textFormation(spec.text, spec.count);
    if (!f || !f.pts.length) throw new Error('Text ergibt keine Formation');
    return finish(id, f.pts, (_i, x) => gradientAt((x + 1) / 2), {});
  }
  const m = MOTIFS[spec.motif];
  if (!m) throw new Error(`Katalogmotiv ${spec.motif} fehlt`);
  const budget = spec.budget ?? N;
  const v = m.variants.filter((q) => q.points <= budget).at(-1) ?? m.variants[0];
  const r = await fetch(`/media/katalog/${v.id}.json`);
  if (!r.ok) throw new Error(`Katalog ${v.id}: HTTP ${r.status}`);
  const d = (await r.json()) as { points: number[][] };
  const deep = m.dimension === '3D';
  // flache Formationen tragen im Katalog etwas Tiefe; gestaucht wie im Konfigurator (scenes/catalog.js → prepare)
  const raw = d.points.map((q) => [q[0], q[1], deep ? q[2] : q[2] * 0.25, q[3], q[4], q[5]]);
  return finish(id, raw, (i) => lit(raw[i][3], raw[i][4], raw[i][5]), { turn: deep });
}

/* ---------- Bühnen: wo ein Bild stehen darf ---------- */

const page = (el: Element): Box => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
const num = (v: string) => parseFloat(v) || 0;

/** Alles, was in einer Section Blicke bindet. Ein Bild darf nichts davon berühren (Marc, 13.11.: „squished in“). */
const SOLID = 'h1, h2, h3, h4, p, li, dt, dd, img, picture, video, canvas, figure, table, article, a, button, input, label, summary, blockquote';
const AIR = 40;
function free(host: HTMLElement, box: Box, skip: Element | null): boolean {
  const x0 = box.x - AIR, x1 = box.x + box.w + AIR, y0 = box.y - AIR, y1 = box.y + box.h + AIR;
  for (const el of host.querySelectorAll<HTMLElement>(SOLID)) {
    if (skip?.contains(el)) continue;
    const b = page(el); if (!b.w || !b.h) continue;
    if (!(b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0)) continue;
    // Bilder sind oft größer als ihr Rahmen (Zoom, Parallaxe): Es zählt, was der Rahmen davon zeigt
    let l = b.x, t = b.y, r = b.x + b.w, bt = b.y + b.h;
    for (let up = el.parentElement; up && up !== host; up = up.parentElement) {
      const o = getComputedStyle(up); if (o.overflowX === 'visible' && o.overflowY === 'visible') continue;
      const c = page(up); l = Math.max(l, c.x); t = Math.max(t, c.y); r = Math.min(r, c.x + c.w); bt = Math.min(bt, c.y + c.h);
    }
    if (l < x1 && r > x0 && t < y1 && bt > y0 && r > l && bt > t) return false;
  }
  return true;
}

const NONE: Box = { x: 0, y: 0, w: 0, h: 0 };
const HEAD = '.sec-head, .intro, .faq-intro';
function measure(slot: Slot): void {
  const { host, def } = slot, wide = innerWidth >= DESK;
  if (def.place === 'zeile') { const b = page(slot.own!); slot.box = { x: b.x, y: b.y + 8, w: b.w, h: b.h - 16 }; return; }
  if (def.place === 'form') { const b = page(slot.own!); slot.box = { x: b.x + 20, y: b.y + 18, w: b.w - 40, h: b.h - 36 }; return; }
  if (def.folge) { slot.box = folgeBox(host, wide); return; }
  // Kopf der Section: der Section-Kopf, sonst (einspaltiger Text ohne Kopf-Komponente) die ganze Section
  const head = host.querySelector<HTMLElement>(HEAD) ?? host;
  let used = 0, top = Infinity, bottom = -Infinity;
  for (const el of head.querySelectorAll<HTMLElement>(`${SOLID}, .kicker`)) {
    if (slot.own?.contains(el)) continue;
    const b = page(el); if (!b.w || !b.h) continue;
    used = Math.max(used, b.x + b.w); top = Math.min(top, b.y); bottom = Math.max(bottom, b.y + b.h);
  }
  const hostBox = page(host), right = hostBox.x + hostBox.w - num(getComputedStyle(host).paddingRight);
  // Das Bild steht rechts neben dem Kopf, höchstens 30rem breit und 24rem hoch, und hält zu allem Abstand
  const left = Math.max(used + 96, right - (def.max ?? 480)), w = right - left;
  let box = NONE, roomy = wide && w >= Math.min(340, def.max ?? 340) && Number.isFinite(top);
  if (roomy) {
    let y0 = Math.max(hostBox.y + 24, Math.min(top - 64, bottom - 230)), y1 = bottom;
    const tall = Math.min(380, def.max ?? 380);
    if (y1 - y0 > tall) { const mid = (top + bottom) / 2; y0 = mid - tall / 2; y1 = mid + tall / 2; }
    box = { x: left, y: y0, w, h: y1 - y0 };
    roomy = box.h >= Math.min(170, tall) && free(host, box, head === host ? null : head);
  }
  // Schmale Bildschirme und volle Sections: Nur Bühnen, die dort etwas zeigen, was man nicht schon sieht, bekommen eigenen Platz
  host.classList.toggle('hm-gap-on', !roomy && !def.deskOnly);
  slot.box = roomy ? box : def.deskOnly || !slot.own ? NONE : page(slot.own);
}

/** Bühne der Show-Folge (#warum-drohnen). Breit: rechts neben dem Text, das dominante Element der Section (bei 1440 px gut
 *  480 px, bei 1920 px bis 690 px breit), 64 px vom Text, mit der free()-Prüfung. Schmal: die Fläche, die himmel.css unter
 *  dem Text reserviert (::after, Höhe steht von Anfang an fest, nichts springt). */
function folgeBox(host: HTMLElement, wide: boolean): Box {
  const hostBox = page(host), cs = getComputedStyle(host), right = hostBox.x + hostBox.w - num(cs.paddingRight);
  if (!wide) {
    const h = num(getComputedStyle(host, '::after').height); if (h < 80) return NONE;
    const left = hostBox.x + num(cs.paddingLeft);
    return { x: left, y: hostBox.y + hostBox.h - num(cs.paddingBottom) - h, w: right - left, h };
  }
  let used = 0, top = Infinity, bottom = -Infinity;
  for (const el of host.querySelectorAll<HTMLElement>(`${SOLID}, .kicker`)) { const b = page(el); if (!b.w || !b.h) continue; used = Math.max(used, b.x + b.w); top = Math.min(top, b.y); bottom = Math.max(bottom, b.y + b.h); }
  if (!Number.isFinite(top)) return NONE;
  const max = clamp(innerWidth * 0.36, 420, 720), left = Math.max(used + 64, right - max), w = right - left;
  if (w < 340) return NONE;
  const tall = Math.min(500, w * 0.95), mid = (top + bottom) / 2, h = Math.min(tall, bottom - top + 80);
  const box = { x: left, y: mid - h / 2, w, h };
  return free(host, box, null) ? box : NONE;
}

/* ---------- Zeichnen ---------- */

const sprites = new Map<string, { c: HTMLCanvasElement; R: number }>();
function sprite(r: number, g: number, b: number, rad: number, hot: boolean) {
  const key = `${r >> 3},${g >> 3},${b >> 3},${rad},${hot ? 1 : 0}`;
  let s = sprites.get(key); if (s) return s;
  const R = Math.ceil(rad * (hot ? 5 : 3.4)), c = document.createElement('canvas');
  c.width = c.height = R * 2; const x = c.getContext('2d')!;
  const lift = (v: number) => Math.min(255, v + 70);
  const gr = x.createRadialGradient(R, R, 0, R, R, R);
  if (hot) { gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(rad / R, `rgba(${lift(r)},${lift(g)},${lift(b)},0.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); }
  else { const core = `rgb(${lift(r)},${lift(g)},${lift(b)})`; gr.addColorStop(0, core); gr.addColorStop((rad * 0.8) / R, core); gr.addColorStop((rad * 1.15) / R, `rgba(${r},${g},${b},0.24)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); }
  x.fillStyle = gr; x.fillRect(0, 0, R * 2, R * 2);
  s = { c, R }; if (sprites.size > 3000) sprites.clear(); sprites.set(key, s);
  return s;
}

/* ---------- Der Schwarm ---------- */

class Himmel {
  layer = document.createElement('div');
  cv = document.createElement('canvas');
  g = this.cv.getContext('2d')!;
  slots: Slot[] = [];
  active: Slot | null = null;
  shown: Scene | null = null;
  x = new Float32Array(N); y = new Float32Array(N); b = new Float32Array(N);
  fx = new Float32Array(N); fy = new Float32Array(N); fb = new Float32Array(N);
  mx = new Float32Array(N); my = new Float32Array(N); d0 = new Float32Array(N);
  tx = new Float32Array(N); ty = new Float32Array(N); tz = new Float32Array(N);
  t0 = 0; dur = 1; kind: 'cloud' | 'rise' | 'none' = 'none'; arrived = 0; born = false;
  top = 0; left = 0; W = 0; wide = true; H = 0; d = 1; raf = 0; dirty: number[] | null = null; spin = 0; last = 0;
  px = -1e5; py = -1e5; pt = 0;
  dir = 1; sy = 0;
  // Show-Folge (#warum-drohnen): fol geladen, folPts Ziele des Anflugs (Seitenkoordinaten), handed = die Folge spielt
  fol: Folge | null = null; folReady = false; folPts: number[][] | null = null; folRad = 0; handed = false; burstScene: Scene | null = null;
  // Farbe und Lichtgröße im Flug: von der zuletzt gezeigten Farbe (cc) zur Farbe des Ziels, Gewicht cw je Drohne
  cc = new Uint8Array(N * 3); fc = new Uint8Array(N * 3); cw = new Float32Array(N).fill(1); rad0 = 0; rad1 = 0;

  constructor(defs: SlotDef[]) {
    this.layer.className = 'hm-layer'; this.layer.setAttribute('aria-hidden', 'true');
    this.layer.append(this.cv); document.body.append(this.layer);
    for (const def of defs) {
      let host = document.querySelector<HTMLElement>(def.sel); if (!host || (def.when && !def.when(host))) continue;
      let made: HTMLElement | null = null;
      if (def.place === 'zeile') { made = zeile(); host.after(made); host = made; }
      const first = typeof def.spec === 'function' ? def.spec(host) : def.spec;
      const slot: Slot = { def, host, box: NONE, scene: null, want: '', spec: first, first, seqAt: 0, own: null, turned: false };
      // Platz im Seitenfluss: auf dem Handy über der Überschrift, im Formular als Himmelsfenster, in der Himmelszeile vorhanden
      if (made) slot.own = made.querySelector<HTMLElement>('.hm-own');
      else if (def.place === 'form') { slot.own = this.own('form'); host.prepend(slot.own); }
      else if (!def.deskOnly) { slot.own = this.own('head'); (host.querySelector(HEAD) ?? host).prepend(slot.own); }
      this.slots.push(slot);
      this.want(slot, still() && def.then ? def.then : first);
      if (still() && def.then) slot.turned = true;
      def.react?.(slot, (spec) => this.want(slot, spec));
    }
    const again = () => { this.layout(); this.kick(); };
    new ResizeObserver(again).observe(document.body);
    this.sy = scrollY;
    addEventListener('scroll', () => { const dy = scrollY - this.sy; if (Math.abs(dy) > 4) { this.dir = dy > 0 ? 1 : -1; this.sy = scrollY; } this.kick(); }, { passive: true });
    addEventListener('resize', again);
    // Licht am Mauszeiger: Drohnen in der Nähe leuchten auf (nur Licht, keine Bewegung)
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || still()) return;
      this.px = e.pageX; this.py = e.pageY; this.pt = performance.now();
      const a = this.active?.box; if (a && this.px > a.x - 60 && this.px < a.x + a.w + 60 && this.py > a.y - 60 && this.py < a.y + a.h + 60) this.kick();
    }, { passive: true });
    addEventListener('pagehide', () => this.remember());
    this.recall();
    // Pause oder Fortsetzen (html.motion-paused): neu zeichnen, stehend oder fliegend
    new MutationObserver(() => { this.last = 0; this.kick(); }).observe(html(), { attributes: true, attributeFilter: ['class'] });
    document.fonts?.ready.then(again);
    const fs = this.slots.find((s) => s.def.folge);
    if (fs) this.loadFolge(fs);
    this.frame = this.frame.bind(this);
    this.layout(); this.kick();
  }
  /** Die Show-Folge laden, sobald ihre Section näher als zwei Bildschirmhöhen ist (die Engine des Konfigurators ist groß). */
  loadFolge(slot: Slot) {
    void load({ burst: true }).then((sc) => { this.burstScene = sc; });
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const cv = document.createElement('canvas'); cv.className = 'hm-folge'; this.layer.append(cv);
      import('./folge.js').then(({ createFolge }) => {
        const f = createFolge(cv, { locale: lang(), burst: burstPts() }) as unknown as Folge;
        f.place(slot.box);
        return f.ready.then(() => { this.fol = f; this.folReady = true; this.last = 0; this.kick(); });
      }).catch((e) => console.warn('Show-Folge nicht verfügbar:', e));
    }, { rootMargin: '200% 0px' });
    io.observe(slot.host);
  }
  own(place: Place) { const el = document.createElement('div'); el.className = `hm-own hm-own-${place}`; el.setAttribute('aria-hidden', 'true'); return el; }
  kick() { if (!this.raf) this.raf = requestAnimationFrame(this.frame); }

  /** Ein Bild für eine Bühne bestellen; sobald es geladen ist, fliegt der Schwarm um, falls die Bühne gerade spielt. */
  want(slot: Slot, spec: Spec) {
    const id = idOf(spec); if (slot.want === id) return;
    slot.want = id; slot.spec = spec; slot.seqAt = 0;
    load(spec).then((sc) => { if (slot.want !== id) return; this.put(slot, sc); }).catch(() => {});
    if ('seq' in spec) spec.seq.forEach((s) => void load(s).catch(() => {}));
  }
  put(slot: Slot, sc: Scene) {
    slot.scene = sc;
    if (!still() && this.active === slot && this.shown !== sc) this.go(slot, 1250);
    this.last = 0; this.kick();
  }

  layout() {
    const old = this.active ? { ...this.active.box } : null;
    for (const s of this.slots) measure(s);
    // Layout hat sich verschoben (Bilder geladen, Akkordeon offen): der stehende Schwarm zieht mit, ohne Flug
    if (old && this.active && this.born) {
      const dx = this.active.box.x + this.active.box.w / 2 - (old.x + old.w / 2), dy = this.active.box.y + this.active.box.h / 2 - (old.y + old.h / 2);
      if (dx || dy) for (let i = 0; i < N; i++) { this.x[i] += dx; this.y[i] += dy; this.fx[i] += dx; this.fy[i] += dy; this.mx[i] += dx; this.my[i] += dy; }
    }
    this.H = 0; this.W = 0; this.last = 0; // Canvas neu ankern
    const fs = this.slots.find((s) => s.def.folge);
    if (this.fol && fs && fs.box.w) { this.fol.place(fs.box); if (this.folPts && !this.handed) this.folPts = this.fol.peek(); }
  }

  /** Canvas in Seitenkoordinaten. Im Flug (und stehend) ein Fenster von 1,7 Bildschirmhöhen, das nur wandert, wenn der Rand
   *  naht; steht ein Bild, schrumpft das Canvas auf dessen Bühne (kleine Textur, wenig Grafikzeit). */
  anchor(wide = true): boolean {
    const vh = innerHeight, w = html().clientWidth, doc = Math.max(html().scrollHeight, vh), d = Math.min(1.5, devicePixelRatio || 1);
    const a = this.active?.box;
    if (!wide && a && a.w) {
      const L = Math.max(0, Math.floor(a.x - 70)), T = Math.max(0, Math.floor(a.y - 70)), W = Math.min(w - L, Math.ceil(a.w + 140)), H = Math.min(doc - T, Math.ceil(a.h + 140));
      if (!this.wide && this.left === L && this.top === T && this.W === W && this.H === H && this.d === d) return false;
      this.wide = false; this.left = L; this.top = T; this.W = W; this.H = H; this.d = d;
    } else {
      const H = Math.min(doc, Math.round(vh * 1.7));
      const near = scrollY < this.top + vh * 0.06 || scrollY + vh > this.top + this.H - vh * 0.06;
      if (this.wide && this.H === H && this.W === w && this.d === d && !near) return false;
      this.wide = true; this.left = 0; this.W = w; this.H = H; this.d = d; this.top = Math.round(clamp(scrollY - (H - vh) / 2, 0, doc - H));
    }
    this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d);
    const s = this.cv.style;
    s.left = this.left + 'px'; s.top = this.top + 'px'; s.width = this.W + 'px'; s.height = this.H + 'px';
    this.dirty = null;
    return true;
  }

  /** Welche Bühne spielt. Der Blick eilt dem Scrollen voraus: Der Schwarm fliegt los, sobald die nächste Bühne ins Bild kommt,
   *  und steht, wenn man dort ankommt (Marc, 13.11.: nicht auf eine leere Fläche warten). Wer im Formular tippt, behält sein Bild. */
  pick(): Slot | null {
    const vh = innerHeight, line = scrollY + vh * (0.5 + 0.16 * this.dir);
    const form = this.slots.find((s) => s.def.place === 'form');
    if (form && form.host.contains(document.activeElement) && form.scene) return form;
    let best: Slot | null = null, bd = Infinity;
    for (const s of this.slots) {
      if (!s.scene || !s.box.w) continue;
      // im Bild oder kurz davor (in Scrollrichtung etwas weiter). Das Formular steuert er schon gut eine Bildschirmhöhe
      // vorher an: Dort soll das Bild stehen, bevor man ankommt (auf dem Handy liegt davor ein langer Einleitungstext)
      const ahead = this.dir > 0 ? (s.def.place === 'form' ? vh * 1.2 : vh * 0.3) : 60;
      if (s.box.y + s.box.h < scrollY - (this.dir < 0 ? vh * 0.3 : 60) || s.box.y > scrollY + vh + ahead) continue;
      const dist = Math.abs(s.box.y + s.box.h / 2 - line) - (s === this.active ? vh * 0.14 : 0);
      if (dist < bd) { bd = dist; best = s; }
    }
    return best ?? this.active;
  }

  /** Ziele der Formation in Seitenkoordinaten (mit Blickwinkel und Drehung). */
  aim(slot: Slot, sc: Scene) {
    const { box } = slot, vh = innerHeight, stop = still();
    // Anflug auf die Show-Folge: genau dorthin, wo deren Blüte steht (Übergabe ohne Sprung)
    if (this.folPts && slot.def.folge && !stop) { for (let i = 0; i < N; i++) { const p = this.folPts[i]; this.tx[i] = p[0]; this.ty[i] = p[1]; this.tz[i] = 0; } return; }
    const rad = innerWidth < 700 ? 0.86 : 0.92;
    const S = Math.min((box.w * rad) / 2 / Math.max(sc.ax, 0.2), (box.h * rad) / 2 / Math.max(sc.ay, 0.2));
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    // Blickwinkel: wer am Bild vorbeiscrollt, sieht es leicht von der Seite (eine Formation steht im Raum)
    const look = stop ? 0 : clamp((cy - (scrollY + vh / 2)) / vh, -1, 1) * 0.42;
    const yaw = look + (sc.turn && !stop ? this.spin : 0), c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i < N; i++) {
      const j = (i < sc.n ? i : i % sc.n) * 3, X = sc.pts[j], Y = sc.pts[j + 1], Z = sc.pts[j + 2];
      const xr = X * c + Z * s, zr = -X * s + Z * c, p = 1 / (1 - zr * 0.16);
      this.tx[i] = cx + xr * S * p; this.ty[i] = cy - Y * S * p; this.tz[i] = zr;
    }
  }

  /** Flug zur Bühne starten: von dort, wo jede Drohne gerade ist. */
  go(slot: Slot, base = 0) {
    // Show-Folge: Der Schwarm kommt als Blüte; die Folge stellt ihre Blüte bereit und nennt, wo jede Drohne hin soll
    this.folPts = null;
    if (slot.def.folge && this.folReady && this.fol && this.burstScene && !still()) {
      slot.scene = this.burstScene; slot.want = idOf(slot.first); slot.spec = slot.first; slot.turned = false;
      const e = this.fol.enter(slot.box);
      if (e) { this.folPts = e.pts; this.folRad = e.radius; }
    }
    const sc = slot.scene; if (!sc) return;
    const now = performance.now();
    this.fc.set(this.cc); this.rad0 = this.rad1 || this.radius(slot.box);
    this.aim(slot, sc);
    const first = !this.born, vh = innerHeight;
    let far = 0;
    for (let i = 0; i < N; i++) {
      if (first) { // Start: die Drohnen stehen in Reihen unter dem Bildrand und steigen auf
        const cols = 30; this.x[i] = slot.box.x + slot.box.w / 2 + ((i % cols) - (cols - 1) / 2) * 13; this.y[i] = scrollY + vh + 30 + Math.floor(i / cols) * 13; this.b[i] = 0;
      }
      else if (this.y[i] < scrollY - 140 || this.y[i] > scrollY + vh + 140) {
        // Der Schwarm stand weit weg (lange Strecke ohne Bühne): Er kommt aus seiner Richtung, aber von knapp außerhalb des Bildes
        this.y[i] = this.y[i] < scrollY ? scrollY - 60 - hash(i, 17) * 150 : scrollY + vh + 60 + hash(i, 17) * 150; this.b[i] = 0;
      }
      this.fx[i] = this.x[i]; this.fy[i] = this.y[i]; this.fb[i] = this.b[i];
      const dx = this.tx[i] - this.fx[i], dy = this.ty[i] - this.fy[i], dist = Math.hypot(dx, dy); far = Math.max(far, dist);
      const amp = Math.min(150, dist * 0.32);
      this.mx[i] = (this.fx[i] + this.tx[i]) / 2 + (hash(i, 11) - 0.5) * 2 * amp; this.my[i] = (this.fy[i] + this.ty[i]) / 2 + (hash(i, 13) - 0.5) * 1.4 * amp;
      this.d0[i] = first ? (Math.floor(i / 30) / (N / 30)) * 0.45 : (i < sc.n ? sc.rank[i] : hash(i, 5)) * 0.25 + hash(i, 3) * 0.15;
    }
    // Wer eine Bühne mit Verwandlung verlässt, findet beim nächsten Besuch wieder den Anfang (Feuerwerk → Stern je Besuch einmal)
    const prev = this.active;
    if (prev && prev !== slot && prev.def.then && prev.turned) { prev.turned = false; this.want(prev, prev.first); }
    this.born = true; this.shown = sc; this.active = slot;
    this.kind = first ? 'rise' : 'cloud';
    // Kurzer Flug, wo niemand warten soll: am Formular (Ziel der Show, oft per Link angesprungen) und an Bühnen, die beim
    // Abflug schon im Bild sind (schnelles Scrollen)
    const visible = slot.box.y < scrollY + vh && slot.box.y + slot.box.h > scrollY;
    this.t0 = now; this.dur = base || (visible || slot.def.place === 'form' ? 1000 : clamp(1200 + far * 0.65, 1400, 2500));
    this.arrived = 0;
    this.kick();
  }

  frame(now: number) {
    this.raf = 0;
    if (document.hidden) return;
    const stop = still();
    if (stop) {
      if (this.fol && (this.handed || this.folPts)) { this.fol.hide(); this.handed = false; this.folPts = null; }
      // Stehende Fassung: jede Bühne zeigt ihr (End-)Bild, nichts fliegt
      for (const s of this.slots) if (s.def.then && !s.turned) { s.turned = true; this.want(s, s.def.then); }
      const moved = this.anchor(true);
      if (moved || this.last !== -1) this.drawStill();
      this.last = -1; this.born = false; this.active = null; this.shown = null;
      return;
    }
    // Die Show-Folge spielt: Der Schwarm zeichnet nichts, bis eine andere Bühne dran ist; dann übernimmt er die Drohnen
    if (this.handed) {
      const next = this.pick();
      if (!next || next === this.active) return;
      this.takeBack();
    }
    const flight = (this.kind !== 'none' && performance.now() - this.t0 < this.dur + 80) || !this.shown;
    this.anchor(flight);
    const T = now / 1000, dt = this.last > 0 ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now;
    const target = this.pick();
    if (target && target.scene && (target !== this.active || this.shown !== target.scene)) this.go(target, target === this.active ? 1250 : 0);
    const slot = this.active, sc = this.shown;
    if (!slot || !sc) { this.clear(); return; }
    const vh = innerHeight, seen = slot.box.y + slot.box.h > scrollY - 80 && slot.box.y < scrollY + vh + 80;
    if (sc.turn && seen) this.spin += dt * 0.32;
    this.aim(slot, sc);
    const u = clamp((now - this.t0) / this.dur), flying = u < 1 && this.kind !== 'none';
    if (!flying && !this.arrived) this.arrived = now;
    // Angekommen: Übergabe an die Show-Folge, die dieselbe Blüte an derselben Stelle zeigt
    if (!flying && this.folPts && slot.def.folge && this.fol) { this.fol.play(); this.handed = true; this.clear(); return; }
    // Die nächste Runde war beim Anflug noch nicht gebaut: Die Blüte steht, bis sie fertig ist, dann kurzer Flug in deren Blüte
    if (!flying && !this.folPts && slot.def.folge && this.fol?.canEnter() && now - this.arrived > 300) this.go(slot, 900);
    // Geschichte in Akten (ODYSSEY, Worte der Himmelszeile): nach einer Standzeit folgt das nächste Bild
    if (!flying && 'seq' in slot.spec && seen && now - this.arrived > 4200) {
      slot.seqAt = (slot.seqAt + 1) % slot.spec.seq.length; const next = slot.spec.seq[slot.seqAt], want = slot.want;
      this.arrived = now + 1e6; // wartet auf die geladene Szene
      load(next).then((nsc) => { if (slot.want === want) this.put(slot, nsc); }).catch(() => {});
    }
    // Verwandlung (Feuerwerk → Stern): einmal, sobald das Bild gut anderthalb Sekunden ganz im Blick stand
    const inView = slot.box.y > scrollY + vh * 0.04 && slot.box.y + slot.box.h < scrollY + vh * 0.96;
    if (!flying && slot.def.then && !slot.turned && inView && now - this.arrived > 1600 && !(slot.def.folge && this.folReady)) { slot.turned = true; this.want(slot, slot.def.then); }
    const since = this.arrived ? (now - this.arrived) / 1000 : 0, wave = this.arrived && since >= 0 ? ((since % 9) / 1.7) * 1.5 - 0.25 : -9;
    const near = clamp(1 - (now - this.pt) / 900);
    let busy = flying || near > 0;
    for (let i = 0; i < N; i++) {
      const lit = i < sc.n ? 0.86 + 0.14 * (this.tz[i] + 1) / 2 : 0;
      let bright = lit;
      this.cw[i] = 1;
      if (flying) {
        const k = clamp((u - this.d0[i]) / (this.kind === 'rise' ? 0.55 : 0.6));
        this.cw[i] = this.kind === 'rise' ? 1 : Math.round(clamp(k * 1.4) * 4) / 4; // Farbe in vier Stufen (wenige Sprites)
        if (this.kind === 'rise') {
          const e = 1 - (1 - k) ** 3;
          this.x[i] = this.fx[i] + (this.tx[i] - this.fx[i]) * e; this.y[i] = this.fy[i] + (this.ty[i] - this.fy[i]) * e;
          bright = k <= 0 ? 0 : i < sc.n ? lit * (0.3 + 0.7 * k) : 0.3 * (1 - k);
        } else {
          const e = k * k * (3 - 2 * k), a = (1 - e) * (1 - e), b2 = 2 * (1 - e) * e, c2 = e * e;
          this.x[i] = a * this.fx[i] + b2 * this.mx[i] + c2 * this.tx[i];
          this.y[i] = a * this.fy[i] + b2 * this.my[i] + c2 * this.ty[i] + Math.sin(T * 1.7 + i) * 5 * e * (1 - e);
          if (k > 0 && k < 0.88) bright = hash(i, Math.floor(T * 7 + hash(i) * 7)) < 0.1 ? 0.9 : 0.07;
          else if (k >= 0.88) bright = lit * (k - 0.88) / 0.12;
          else bright = this.fb[i] > 0.05 ? Math.max(0.07, this.fb[i] * (1 - u * 3)) : 0;
        }
      } else {
        this.x[i] = this.tx[i]; this.y[i] = this.ty[i];
        // Lichtlauf: zusätzliche Helligkeit läuft die Linien der Form entlang, die Form bleibt voll hell
        if (wave > -1 && i < sc.n) { const dd = sc.rank[i] - wave; bright += 0.75 * Math.min(1, since / 0.6) * Math.exp(-(dd * dd) / 0.012); }
        if (near && i < sc.n) { const ddx = this.x[i] - this.px, ddy = this.y[i] - this.py; bright += 0.9 * near * Math.exp(-(ddx * ddx + ddy * ddy) / 3600); }
      }
      this.b[i] = bright;
    }
    this.draw(sc, flying ? u : 1);
    if (!seen) return;
    if (!busy) busy = sc.turn || (wave > -0.3 && wave < 1.35) || 'seq' in slot.spec || (!!slot.def.then && !slot.turned);
    if (busy) this.kick(); else { const wait = (9 - (since % 9)) * 1000; setTimeout(() => this.kick(), Math.min(wait, 9000)); }
  }

  /** Die Show-Folge gibt ihre Drohnen zurück: Lage, Licht und Farbe so, wie sie gerade zu sehen sind. */
  takeBack() {
    const pts = this.fol!.leave();
    for (let i = 0; i < N; i++) { const p = pts[i]; this.x[i] = p[0]; this.y[i] = p[1]; this.b[i] = p[2]; this.cc[i * 3] = p[3]; this.cc[i * 3 + 1] = p[4]; this.cc[i * 3 + 2] = p[5]; }
    this.handed = false; this.folPts = null; this.rad1 = this.folRad; this.last = 0;
  }

  /** Seitenwechsel: Lage und Farbe jeder Drohne (relativ zum Bildschirm) für ein paar Sekunden mitnehmen. */
  remember() {
    if (!this.born || !this.shown || still()) return;
    const sc = this.shown, out: number[] = [], live = this.handed ? this.fol!.peek() : null;
    for (let i = 0; i < N; i++) {
      if (live) { const p = live[i]; out.push(Math.round(p[0] - scrollX), Math.round(p[1] - scrollY), Math.round(p[2] * 100), p[3], p[4], p[5]); continue; }
      const j = (i < sc.n ? i : i % sc.n) * 3; out.push(Math.round(this.x[i] - scrollX), Math.round(this.y[i] - scrollY), Math.round(this.b[i] * 100), sc.col[j], sc.col[j + 1], sc.col[j + 2]);
    }
    try { sessionStorage.setItem('flyingstars:himmel', JSON.stringify({ t: Date.now(), d: out })); } catch { /* privater Modus */ }
  }
  recall() {
    try {
      const raw = sessionStorage.getItem('flyingstars:himmel'); sessionStorage.removeItem('flyingstars:himmel');
      const v = raw ? (JSON.parse(raw) as { t: number; d: number[] }) : null;
      if (!v || Date.now() - v.t > 6000 || v.d.length !== N * 6 || still()) return;
      for (let i = 0; i < N; i++) { this.x[i] = v.d[i * 6] + scrollX; this.y[i] = v.d[i * 6 + 1] + scrollY; this.b[i] = v.d[i * 6 + 2] / 100; }
      this.born = true;
    } catch { /* privater Modus */ }
  }

  clear() {
    const { g } = this; g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.dirty) g.clearRect(this.dirty[0] - 2, this.dirty[1] - 2, this.dirty[2] - this.dirty[0] + 4, this.dirty[3] - this.dirty[1] + 4); else g.clearRect(0, 0, this.cv.width, this.cv.height);
    this.dirty = [Infinity, Infinity, -Infinity, -Infinity];
  }
  dot(xp: number, yp: number, br: number, r: number, gg: number, b: number, rad: number) {
    const { g, d, dirty } = this, X = (xp - this.left) * d, Y = (yp - this.top) * d;
    if (Y < -40 || Y > this.cv.height + 40 || br < 0.02) return;
    const sp = sprite(r, gg, b, rad, false);
    g.globalAlpha = Math.min(1, br); g.drawImage(sp.c, X - sp.R, Y - sp.R);
    let R = sp.R;
    if (br > 1.02) { const hot = sprite(r, gg, b, rad, true); g.globalAlpha = Math.min(1, br - 1); g.drawImage(hot.c, X - hot.R, Y - hot.R); R = hot.R; }
    if (dirty) { dirty[0] = Math.min(dirty[0], X - R); dirty[1] = Math.min(dirty[1], Y - R); dirty[2] = Math.max(dirty[2], X + R); dirty[3] = Math.max(dirty[3], Y + R); }
  }
  radius(box: Box) { return Math.max(1, Math.round((box.w < 320 ? 1.5 : 1.9) * this.d * 4) / 4); }
  /** u: Fortschritt des Flugs (1 = steht). Farbe und Lichtgröße wandern vom letzten Bild zum neuen (keine Sprünge, auch nicht
   *  bei der Übergabe an die Show-Folge, deren Lichter etwas größer sind). */
  draw(sc: Scene, u = 1) {
    this.clear();
    const { g, cc, fc, cw } = this, goal = this.folPts && this.active?.def.folge ? this.folRad : this.radius(this.active!.box);
    const rad = this.rad1 = u >= 1 || !this.rad0 ? goal : Math.round((this.rad0 + (goal - this.rad0) * u) * 4) / 4;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const j = (i < sc.n ? i : i % sc.n) * 3, q = i * 3, w = cw[i];
      if (w >= 1) { cc[q] = sc.col[j]; cc[q + 1] = sc.col[j + 1]; cc[q + 2] = sc.col[j + 2]; }
      else { cc[q] = fc[q] + (sc.col[j] - fc[q]) * w; cc[q + 1] = fc[q + 1] + (sc.col[j + 1] - fc[q + 1]) * w; cc[q + 2] = fc[q + 2] + (sc.col[j + 2] - fc[q + 2]) * w; }
      this.dot(this.x[i], this.y[i], this.b[i], cc[q], cc[q + 1], cc[q + 2], rad);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  /** Stehende Fassung: jede Bühne im Fenster zeigt ihr Bild. */
  drawStill() {
    this.clear();
    const { g } = this;
    g.globalCompositeOperation = 'lighter';
    for (const s of this.slots) {
      const sc = s.scene; if (!sc || !s.box.w) continue;
      if (s.box.y + s.box.h < this.top || s.box.y > this.top + this.H) continue;
      this.aim(s, sc);
      const rad = this.radius(s.box);
      for (let i = 0; i < sc.n; i++) this.dot(this.tx[i], this.ty[i], 1, sc.col[i * 3], sc.col[i * 3 + 1], sc.col[i * 3 + 2], rad);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
}

/* ---------- Dramaturgie ---------- */

/** Zeigen oder Fokus auf ein Element wählt das Bild. items: Selektoren nach Vorrang (Karte vor Listeneintrag). */
const hover = (root: HTMLElement, items: string[], pickSpec: (el: HTMLElement) => Spec | null, on: (s: Spec) => void) => {
  let t = 0;
  const h = (e: Event) => { const at = e.target as HTMLElement; let el: HTMLElement | null = null; for (const sel of items) { el = at.closest<HTMLElement>(sel); if (el) break; } if (!el || !root.contains(el)) return; const s = pickSpec(el); if (!s) return; clearTimeout(t); t = window.setTimeout(() => on(s), e.type === 'focusin' ? 0 : 140); };
  root.addEventListener('pointerover', h); root.addEventListener('focusin', h);
};

/** Anlass → Motiv, über Wörter in Kartenkicker, Link-Ziel oder Formularwert (nie über die Position der Karte).
 *  Reihenfolge zählt: Die Agenturen-Karte verlinkt auf die Werbeseite (#agenturen), Silvester auf die Stadt-Anfrage. */
const OCCASION: Array<[RegExp, string]> = [
  [/agentur|agenc|bureau/i, 'handschlag'],
  [/silvester|weihnacht|new year|oud en nieuw/i, 'sektflasche'],
  [/hochzeit|privat|wedding|private|bruiloft|prive/i, 'doppelherz'],
  [/konzert|festival|musical|kultur|concert|cultu/i, 'mikrofon'],
  [/indoor|halle/i, 'diskokugel'],
  [/gemeind|st[aä]dt|anlass=stadt|\bstadt\b|cit(y|ies)|town|municipal|gemeente|\bstad\b/i, 'foerderturm'],
  [/unternehm|firma|firmen|marke|werbung|corporate|compan|business|brand|bedrijf|merk|reclame/i, 'sportwagen'],
];
const occasion = (...texts: string[]): Spec | null => {
  for (const text of texts) { const hit = OCCASION.find(([re]) => re.test(text)); if (hit) return { motif: hit[1] }; }
  return null;
};
const FORM_OCCASION: Record<string, string> = { firma: 'sportwagen', agentur: 'handschlag', stadt: 'foerderturm', privat: 'doppelherz', indoor: 'diskokugel', sonstiges: 'stern' };

const anlaesse: React = (slot, on) => hover(slot.host, ['[data-dot-host], article, .card', 'li'], (el) => {
  const kicker = el.querySelector('.cat, .kick, .kicker, [class*="kicker"]')?.textContent ?? '';
  const links = [el.getAttribute('href') ?? '', ...Array.from(el.querySelectorAll('a[href]'), (a) => a.getAttribute('href') ?? '')].join(' ');
  return occasion(kicker, links, el.querySelector('h3, h4')?.textContent ?? '');
}, on);

const PACK: Record<string, Spec> = {
  // SPARK: klassisch in 2D, 100 Drohnen. HORIZON: 3D in Bewegung, ab 200. ODYSSEY: erzählte Show in Akten, ab 300.
  SPARK: { motif: 'stern', budget: 100 },
  HORIZON: { motif: 'wasserball', budget: 200 },
  ODYSSEY: { seq: [{ motif: 'atom', budget: 300 }, { motif: 'mandala', budget: 300 }, { motif: 'welle', budget: 300 }] },
};
/** Preise: Stehen dort Paketkarten, zeigt der Himmel das Paket, auf das man zeigt; sonst ein ruhiges Motiv.
 *  Zeigt die Section schon eine eigene Formation (Konfigurator), bleibt der Himmel dort leer: zwei Formationen übereinander sind zu viel. */
const priceSpec = (host: HTMLElement): Spec => (host.querySelector('[data-pick-paket]') ? PACK.HORIZON : { motif: 'sonne' });
// Wo der Konfigurator-Teaser schon eine eigene Formation zeigt, bleibt der Schwarm weg (nie zwei Formationen in einer Section)
const priceRoom = (host: HTMLElement) => !host.querySelector('[data-cft], #cfg-field');
const packs: React = (slot, on) => {
  if (!slot.host.querySelector('[data-pick-paket]')) return;
  hover(slot.host, ['[data-pick-paket]'], (el) => PACK[el.dataset.pickPaket ?? ''] ?? null, on);
  // Handy: die Reiter über den Paketkarten wählen das Bild
  slot.host.addEventListener('change', (e) => { const name = Object.keys(PACK).find((k) => ((e.target as HTMLElement).closest('label')?.textContent ?? '').toUpperCase().includes(k)); if (name) on(PACK[name]); });
};

/** Texte am Himmel (Entwürfe, nicht mit FlyingStars abgestimmt). */
const SKY = {
  de: { label: 'Was soll am Himmel stehen?', ph: 'Name, Marke oder Datum eintippen', go: 'Damit anfragen', ex: ['JA', '25 JAHRE', 'KÖLN', 'DANKE'], start: 'EURE SHOW', days: (n: number) => `NOCH ${n} TAGE`, thanks: 'DANKE' },
  en: { label: 'What should the sky say?', ph: 'Type a name, brand or date', go: 'Enquire with this', ex: ['YES', '25 YEARS', 'COLOGNE', 'THANK YOU'], start: 'YOUR SHOW', days: (n: number) => `${n} DAYS TO GO`, thanks: 'THANK YOU' },
  nl: { label: 'Wat moet er in de lucht staan?', ph: 'Typ een naam, merk of datum', go: 'Hiermee aanvragen', ex: ['JA', '25 JAAR', 'KEULEN', 'BEDANKT'], start: 'JULLIE SHOW', days: (n: number) => `NOG ${n} DAGEN`, thanks: 'BEDANKT' },
};
const clean = (v: string, max = 24) => v.replace(/[^\p{L}\p{N} .&-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Formular: Anlass → Motiv, Ort → der Name am Himmel, Datum → Datum und Countdown, Paket → Drohnenzahl, Absenden → Dank. */
const form: React = (slot, on) => {
  const f = slot.host as HTMLFormElement;
  const count = () => ({ SPARK: 100, HORIZON: 200, ODYSSEY: 300 } as Record<string, number>)[(f.querySelector<HTMLInputElement>('input[name="paket"]:checked')?.value ?? '')] ?? 200;
  let lastText = '', lastMotif: string | null = null, after = '', t = 0, ort = '';
  const word = (text: string): Spec => ({ text, count: Math.min(innerWidth < 700 ? 110 : N, Math.max(innerWidth < 700 ? 0 : count(), text.replace(/\s/g, '').length * 12)) });
  const show = () => {
    if (lastText) on(after ? { seq: [word(lastText), word(after)] } : word(lastText));
    else if (lastMotif) on({ motif: lastMotif, budget: count() < 300 ? Math.max(count(), 160) : 300 });
    else on({ text: SKY[lang()].start, count: 200 });
  };
  const h = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.name === 'anlass') { lastMotif = FORM_OCCASION[el.value] ?? (occasion(el.closest('label')?.textContent ?? '') as { motif: string } | null)?.motif ?? 'stern'; lastText = ''; after = ''; show(); }
    else if (el.name === 'paket') show();
    // Nur echte Änderungen: Das change-Ereignis beim Verlassen des Felds würde sonst ein danach gewähltes Datum überschreiben
    else if (el.name === 'ort' && el.value !== ort) { ort = el.value; clearTimeout(t); t = window.setTimeout(() => { lastText = clean(el.value, 18); after = ''; show(); }, 520); }
    else if (el.name === 'datum' && el.value) { const [y, mo, d] = el.value.split('-'); if (y && mo && d) {
      // Das Datum am Himmel, danach der Countdown: wie viele Tage es bis zur Show noch sind
      const days = Math.round((Date.UTC(+y, +mo - 1, +d) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5);
      lastText = `${d}.${mo}.${y.slice(2)}`; after = days > 0 && days < 1500 ? SKY[lang()].days(days) : ''; show();
    } }
  };
  // Aus der Himmelszeile mitgenommen
  document.addEventListener('hm:text', (e) => { lastText = clean((e as CustomEvent<string>).detail, 18); after = ''; show(); });
  // Abgeschickt: Der Himmel bedankt sich beim Namen, danach steht der Stern
  window.addEventListener('flyingstars:lead-confirmed', () => { const first = clean(f.querySelector<HTMLInputElement>('#f-name')?.value ?? '', 30).split(' ')[0].slice(0, 10).toUpperCase(); on({ seq: [word(`${SKY[lang()].thanks} ${first}`.trim()), { motif: 'stern', budget: N }] }); });
  f.addEventListener('input', h); f.addEventListener('change', h);
};

/** Himmelszeile: ein eigener Abschnitt nach den Kundenlogos. Wer etwas eintippt, sieht es als Formation. */
const big = () => (innerWidth < 700 ? 140 : N);
/** Vor dem ersten Tastendruck zeigt die Himmelszeile, was am Himmel stehen kann: Worte und Bilder im Wechsel. */
const examples = (): Spec => {
  const t = SKY[lang()].ex.map((text): Spec => ({ text, count: big() }));
  const pics: Spec[] = ['eheringe', 'sektflasche'].map((motif) => ({ motif, budget: big() }));
  return { seq: [t[0], pics[0], t[1], pics[1], ...t.slice(2)] };
};
function zeile(): HTMLElement {
  const t = SKY[lang()], el = document.createElement('section');
  el.className = 'hm-zeile'; el.setAttribute('aria-label', t.label);
  el.innerHTML = `<div class="hm-own" aria-hidden="true"></div><form class="hm-zeile-row" action="#anfrage"><label class="hm-zeile-l" for="hm-zeile-in">${t.label}</label><input id="hm-zeile-in" type="text" maxlength="24" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="${t.ph}"><a class="link" href="#anfrage">${t.go} <span aria-hidden="true">→</span></a></form>`;
  return el;
}
const zeileReact: React = (slot, on) => {
  const input = slot.host.querySelector<HTMLInputElement>('input')!, formEl = slot.host.querySelector<HTMLFormElement>('form')!;
  let t = 0;
  input.addEventListener('input', () => { clearTimeout(t); t = window.setTimeout(() => {
    const v = clean(input.value), pic = v ? motifFor(v) : null;
    if (!v) on(examples()); else if (pic) on({ seq: [{ text: v, count: big() }, { motif: pic, budget: big() }] }); else on({ text: v, count: big() });
  }, 420); });
  const carry = () => { const v = clean(input.value); if (v) document.dispatchEvent(new CustomEvent('hm:text', { detail: v })); };
  formEl.addEventListener('submit', (e) => { e.preventDefault(); carry(); document.querySelector('#anfrage')?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth' }); });
  slot.host.querySelector('a')!.addEventListener('click', carry);
};

/* ---------- Bühnenplan ---------- */

const FORM: SlotDef = { sel: '#inquiry-form', place: 'form', spec: () => ({ text: SKY[lang()].start, count: 200 }), react: form };
const path = () => location.pathname.replace(/^\/(en|nl)(?=\/)/, '');

function plan(): SlotDef[] {
  const p = path();
  // Startseite: Die Show läuft vom Kopf bis zur Anfrage. Ohne Bild: #darum, #sicherheit, #nachhaltigkeit, #ablauf, #faq.
  if (p === '/') return [
    { sel: 'main #kundinnen', place: 'zeile', spec: examples, react: zeileReact },
    { sel: '#anlaesse', place: 'head', deskOnly: true, spec: { motif: 'anstossen' }, react: anlaesse },
    // Show-Folge: Blüte, dann SPARK → HORIZON → ODYSSEY in Runden (folge.js); stehend (Pause, reduzierte Bewegung) der Stern
    { sel: '#warum-drohnen', place: 'head', folge: true, spec: { burst: true }, then: { motif: 'stern', budget: N } },
    { sel: '#projekte', place: 'head', deskOnly: true, spec: { motif: 'galaxie' } },
    { sel: '#preise', place: 'head', spec: priceSpec, react: packs, when: priceRoom },
    { sel: '#ueber', place: 'head', deskOnly: true, spec: { motif: 'smiley' } },
    FORM,
  ];
  // Unterseiten: ein bis zwei Section-Köpfe, wo Luft ist, dann das Formular
  // Hochzeit: nur das Herz; bei #referenzen stünde ein Bild direkt über Fotos, die selbst Formationen zeigen
  if (/hochzeit|wedding|bruiloft/.test(p)) return [{ sel: '#choreografie', place: 'head', deskOnly: true, spec: { motif: 'doppelherz' } }, FORM];
  if (/indoor/.test(p)) return [{ sel: '#unterschied', place: 'head', deskOnly: true, max: 260, spec: { motif: 'diskokugel' } }, FORM];
  if (/werbung|brand|reclame/.test(p)) return [
    { sel: '#marketing', place: 'head', deskOnly: true, spec: { motif: 'sportwagen' } },
    { sel: '#agenturen', place: 'head', deskOnly: true, spec: { motif: 'handschlag' } },
    FORM,
  ];
  return [FORM];
}

let started = false;
export function initSchwarm(): void {
  if (started) return;
  const defs = plan().filter((d) => document.querySelector(d.sel));
  if (!defs.length) return;
  started = true;
  new Himmel(defs);
}
