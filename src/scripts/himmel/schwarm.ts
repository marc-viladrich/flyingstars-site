// Der Schwarm („Himmel“): EIN Schwarm aus 300 Drohnen begleitet den Besuch als Show (docs/himmel.md).
//
// Regeln (aus einer echten Drohnenshow abgeleitet, docs/DESIGN.md → Bewegung, Himmel):
// 1. Ein Schwarm, viele Bilder: dieselben Drohnen bilden jedes Bild der Seite. Nichts entsteht, nichts verschwindet.
// 2. Bilder stehen, Wechsel sind dunkel: neben dem Text steht das Bild still; unterwegs fliegen die Drohnen gedimmt,
//    etwa jede zehnte funkelt, das Licht geht erst am Ziel an (lebendige Wolke, kein Einrasten, keine Finten).
// 3. Die Seite antwortet mit dem Himmel: Anlass zeigen, Paket zeigen, im Formular den Ort eintippen ändert das Bild.
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
import { evenSubset } from '../show-geometry.js';
import { textFormationAsync } from '../text-formation.js';
import { INTRO_HOLD, introTexts, SKY, skyDate, START_COUNT } from './himmel-texte.js';
import { FORM_OCCASION, HIMMEL_MOTIFS, occasionMotif } from './anlass-motiv.js';

type Spec = { motif: string; budget?: number } | { figure: 'bokkenrijders' } | { text: string; count: number } | { burst: true } | { seq: Spec[]; once?: boolean };
type Box = { x: number; y: number; w: number; h: number };
type Place = 'head' | 'form';
type React = (slot: Slot, on: (spec: Spec) => void) => void;
/** pose: feste Ansicht eines räumlichen Bilds (Drehung yaw, Neigung pitch in rad) mit sanftem Hin-und-her-Schwenk (amp, period s). */
interface Scene { id: string; n: number; pts: Float32Array; col: Uint8Array; rank: Float32Array; ax: number; ay: number; turn: boolean; pose?: { yaw: number; pitch: number; amp: number; period: number } }
/** Eine Bühne. up/tall: die Bühne darf bis up px über den Kopf wachsen (unten bündig mit dem Kopf), höchstens tall px hoch. deskOnly: spielt nur ab 900 px Breite. then: einmal je Besuch wird aus spec dieses Bild (Feuerwerk → Stern).
 *  when: spielt nur, wenn die Section es zulässt (z. B. keine eigene Formation darin). max: größte Bildbreite in px (kleines Motiv). */
interface SlotDef { sel: string; place: Place; spec: Spec | ((host: HTMLElement) => Spec); deskOnly?: boolean; then?: Spec; react?: React; when?: (host: HTMLElement) => boolean; max?: number; folge?: boolean; up?: number; tall?: number }
/** Die Show-Folge (folge.js), erst nahe an ihrer Section geladen. */
interface Folge { ready: Promise<void>; canEnter(): boolean; place(box: Box): unknown; enter(box: Box): { pts: number[][]; radius: number } | null; peek(): number[][]; play(): void; leave(): number[][]; hide(): void }
interface Slot { def: SlotDef; host: HTMLElement; bounds?: Box; box: Box; scene: Scene | null; want: string; spec: Spec; first: Spec; seqAt: number; own: HTMLElement | null; turned: boolean; heldAt: number }

const N = 300;
const DESK = 900;
const html = () => document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const still = () => reducedMotion.matches || html().classList.contains('motion-paused');
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lang = () => (['de', 'en', 'nl'].includes(html().lang) ? html().lang : 'de') as 'de' | 'en' | 'nl';
const idOf = (s: Spec): string => ('motif' in s ? `m:${s.motif}:${s.budget ?? N}` : 'figure' in s ? `f:${s.figure}` : 'text' in s ? `t:${s.text}:${s.count}` : 'burst' in s ? 'burst' : `q:${s.seq.map(idOf).join('+')}`);

/* ---------- Szenen: echte Formationen ---------- */

type Motif = { dimension: string; base?: string; variants: Array<{ id: string; points: number }> };
/** Katalogmotive, dazu die vorberechneten Motive des Himmels (Kölner Dom für Gemeinden, anlass-motiv.js). */
const MOTIFS: Record<string, Motif> = { ...(catalog as unknown as { motifs: Record<string, Motif> }).motifs, ...(HIMMEL_MOTIFS as Record<string, Motif>) };
const scenes = new Map<string, Promise<Scene>>();

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
const fixedTexts = () => (fixed ??= fetch(`/media/himmel/texte-${lang()}.json`).then((r) => (r.ok ? r.json() : {}) as Promise<Record<string, number[][]>>).catch(() => ({} as Record<string, number[][]>)));

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
    // im Worker gerechnet (text-worker.js): Das heutige Datum im Auftakt des Formulars kommt ohne Rechenpause im Hauptthread
    const f = await textFormationAsync(spec.text, spec.count);
    if (!f || !f.pts.length) throw new Error('Text ergibt keine Formation');
    return finish(id, f.pts, (_i, x) => gradientAt((x + 1) / 2), {});
  }
  if ('figure' in spec) {
    // Kundenformation aus einer echten Show (Maske der Bokkenrijders, 600 Punkte, räumlich), gleichmäßig auf den Schwarm
    // ausgedünnt wie in der Show-Folge (show-scenes.js → devil). Steht ruhig; Tiefe zeigt sich im Blickwinkel beim Scrollen.
    const r = await fetch(`/media/projekte/${spec.figure}/formation.json`);
    if (!r.ok) throw new Error(`Formation ${spec.figure}: HTTP ${r.status}`);
    const d = (await r.json()) as { dots: number[][] };
    const raw = (evenSubset(d.dots.map(([x, y, cr, cg, cb, , z]) => [x, y, z ?? 0, cr, cg, cb]), N) as number[][]);
    // Dreiviertelansicht mit langsamem Schwenk (Marc, 18.11.: „größer und eingedrehter, damit man sie besser erkennt“)
    return finish(id, raw, (i) => (raw[i][3] + raw[i][4] + raw[i][5] === 0 ? [70, 70, 70] : lit(raw[i][3], raw[i][4], raw[i][5])), { pose: { yaw: 0.38, pitch: 0, amp: 0.22, period: 9 } });
  }
  const m = MOTIFS[spec.motif];
  if (!m) throw new Error(`Katalogmotiv ${spec.motif} fehlt`);
  const budget = spec.budget ?? N;
  const v = m.variants.filter((q) => q.points <= budget).at(-1) ?? m.variants[0];
  const r = await fetch(`${m.base ?? '/media/katalog/'}${v.id}.json`);
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
    let y0 = Math.max(hostBox.y + 24, Math.min(top - (def.up ?? 64), bottom - 230)), y1 = bottom;
    const tall = def.tall ?? Math.min(380, def.max ?? 380);
    if (y1 - y0 > tall) { if (def.up) y0 = y1 - tall; else { const mid = (top + bottom) / 2; y0 = mid - tall / 2; y1 = mid + tall / 2; } }
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
/** Maße der Show-Folge-Bühne in CSS-Pixeln: Luft zum Text (Anteil der Fensterbreite, mindestens/höchstens), Abstand zu den
 *  Section-Kanten, kleinste sinnvolle Breite. */
const FOLGE = { gapVw: 0.05, gapMin: 64, gapMax: 112, edge: 24, minWidth: 340 } as const;
function folgeBox(host: HTMLElement, wide: boolean): Box {
  const hostBox = page(host), cs = getComputedStyle(host), right = hostBox.x + hostBox.w - num(cs.paddingRight);
  // Die Fläche unter dem Text reserviert himmel.css (--folge-below, bis 1311 px); solange es sie gibt, spielt die Folge dort.
  // Vorher galt sie nur unter 900 px, und zwischen 900 und 1300 px blieb die Section ohne Show (rechts zu wenig Platz).
  const h = num(getComputedStyle(host, '::after').height);
  if (h >= 80) {
    const left = hostBox.x + num(cs.paddingLeft);
    return { x: left, y: hostBox.y + hostBox.h - num(cs.paddingBottom) - h, w: right - left, h };
  }
  if (!wide) return NONE;
  let used = 0, top = Infinity, bottom = -Infinity;
  for (const el of host.querySelectorAll<HTMLElement>(`${SOLID}, .kicker`)) { const b = page(el); if (!b.w || !b.h) continue; used = Math.max(used, b.x + b.w); top = Math.min(top, b.y); bottom = Math.max(bottom, b.y + b.h); }
  if (!Number.isFinite(top)) return NONE;
  // Runde 5 (Marc, 18.11.2026: „insbesondere on a big screen … noch um einiges größer, wir haben mehr Platz“): die ganze
  // Fläche rechts vom Text bis zur Content-Kante und über die Höhe der Section (bis 24 px an ihre Kanten), nicht mehr
  // höchstens 720 × 500 px. Abstand zum Text 64–112 px; free() prüft weiter, dass nichts berührt wird.
  const gap = clamp(innerWidth * FOLGE.gapVw, FOLGE.gapMin, FOLGE.gapMax), left = used + gap, w = right - left;
  if (w < FOLGE.minWidth) return NONE;
  const y0 = hostBox.y + FOLGE.edge, y1 = hostBox.y + hostBox.h - FOLGE.edge, hb = Math.min(y1 - y0, Math.max(bottom - top + 80, w * 1.1));
  const mid = Math.min(y1 - hb / 2, Math.max(y0 + hb / 2, (top + bottom) / 2));
  const box = { x: left, y: mid - hb / 2, w, h: hb };
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

/** Eine Zeichenfläche in Seitenkoordinaten. pw/ph: angelegte Pixelgröße (nur bei Änderung neu anlegen, das kostet). */
interface Surface { cv: HTMLCanvasElement; g: CanvasRenderingContext2D; left: number; top: number; W: number; H: number; d: number; pw: number; ph: number; dirty: number[] | null }
const surface = (): Surface => { const cv = document.createElement('canvas'); return { cv, g: cv.getContext('2d')!, left: 0, top: 0, W: 0, H: 0, d: 1, pw: 0, ph: 0, dirty: null }; };

class Himmel {
  layer = document.createElement('div');
  // Zwei feste Flächen statt einer, die bei jedem Abflug und jeder Landung neu angelegt wurde (Runde 5, Marc: Ruckeln beim
  // Wechsel der Section; WebKit-Messung in docs/himmel.md): Flug = seitenbreit, 1,7 Bildschirmhöhen, Pixeldichte 1 (bewegte,
  // gedimmte Lichter); Bühne = nur so groß wie das stehende Bild, Pixeldichte bis 1,5. Geometrie in CSS-Pixeln.
  fly = surface(); stand = surface(); sf = this.stand;
  slots: Slot[] = [];
  active: Slot | null = null;
  shown: Scene | null = null;
  x = new Float32Array(N); y = new Float32Array(N); b = new Float32Array(N);
  fx = new Float32Array(N); fy = new Float32Array(N); fb = new Float32Array(N);
  mx = new Float32Array(N); my = new Float32Array(N); d0 = new Float32Array(N);
  tx = new Float32Array(N); ty = new Float32Array(N); tz = new Float32Array(N);
  t0 = 0; dur = 1; kind: 'cloud' | 'rise' | 'none' = 'none'; arrived = 0; born = false;
  raf = 0; spin = 0; last = 0;
  // Zeiger (Bildschirmkoordinaten) und je Drohne Versatz + Tempo der Verdrängung (Feder wie in der Nachhaltigkeits-Scrollstory)
  ptr: { x: number; y: number } | null = null; ox = new Float32Array(N); oy = new Float32Array(N); ovx = new Float32Array(N); ovy = new Float32Array(N);
  dir = 1; sy = 0;
  // Show-Folge (#warum-drohnen): fol geladen, folPts Ziele des Anflugs (Seitenkoordinaten), handed = die Folge spielt
  fol: Folge | null = null; folReady = false; folPts: number[][] | null = null; folRad = 0; handed = false; burstScene: Scene | null = null;
  // Farbe und Lichtgröße im Flug: von der zuletzt gezeigten Farbe (cc) zur Farbe des Ziels, Gewicht cw je Drohne
  cc = new Uint8Array(N * 3); fc = new Uint8Array(N * 3); cw = new Float32Array(N).fill(1); rad0 = 0; rad1 = 0;

  constructor(defs: SlotDef[]) {
    this.layer.className = 'hm-layer'; this.layer.setAttribute('aria-hidden', 'true');
    for (const f of [this.fly, this.stand]) { f.cv.style.left = '0'; f.cv.style.top = '0'; f.cv.style.visibility = 'hidden'; this.layer.append(f.cv); }
    document.body.append(this.layer);
    for (const def of defs) {
      const host = document.querySelector<HTMLElement>(def.sel); if (!host || (def.when && !def.when(host))) continue;
      const first = typeof def.spec === 'function' ? def.spec(host) : def.spec;
      const slot: Slot = { def, host, box: NONE, scene: null, want: '', spec: first, first, seqAt: 0, own: null, turned: false, heldAt: 0 };
      // Platz im Seitenfluss: auf dem Handy über der Überschrift, im Formular als Himmelsfenster
      if (def.place === 'form') { slot.own = this.own('form'); host.prepend(slot.own); }
      else if (!def.deskOnly) { slot.own = this.own('head'); (host.querySelector(HEAD) ?? host).prepend(slot.own); }
      this.slots.push(slot);
      def.react?.(slot, (spec) => this.want(slot, spec));
    }
    // Bilder (Katalog-JSON, Worte) erst bestellen, wenn ihre Bühne näher als gut eine Bildschirmhöhe ist; beim Start lud der
    // Schwarm sonst alle Motive der Seite auf einmal (docs/himmel.md → Performance)
    const near = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      near.unobserve(e.target);
      for (const slot of this.slots) if (slot.host === e.target && !slot.want) {
        this.want(slot, still() && slot.def.then ? slot.def.then : slot.first);
        if (still() && slot.def.then) slot.turned = true;
      }
    }), { rootMargin: '120% 0px' });
    for (const slot of this.slots) near.observe(slot.host);
    const refresh = () => { this.layout(true); };
    // Body-Änderungen können Bühnen verschieben. Ein Akkordeon unterhalb der Bühnen ändert ihre Geometrie nicht.
    const sizes = new ResizeObserver(() => this.layout());
    sizes.observe(document.body);
    for (const { host } of this.slots) sizes.observe(host);
    this.sy = scrollY;
    addEventListener('scroll', () => { const dy = scrollY - this.sy; if (Math.abs(dy) > 4) { this.dir = dy > 0 ? 1 : -1; this.sy = scrollY; } this.kick(); }, { passive: true });
    addEventListener('resize', refresh, { passive: true });
    // Zeiger verdrängt die Drohnen im Raum, eine Feder holt sie weich zurück (Runde 5, Marc: das Aufleuchten wirkte „cheap“;
    // dieselbe Mechanik wie die Punktwolke der Nachhaltigkeits-Scrollstory, effects/eco-scrolly.js). Licht bleibt, wie es ist.
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || still()) return;
      this.ptr = { x: e.clientX, y: e.clientY };
      const a = this.active?.box, px = e.pageX, py = e.pageY;
      if (a && px > a.x - 120 && px < a.x + a.w + 120 && py > a.y - 120 && py < a.y + a.h + 120) this.kick();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { this.ptr = null; this.kick(); });
    addEventListener('pagehide', () => this.remember());
    this.recall();
    // Pause oder Fortsetzen (html.motion-paused): neu zeichnen, stehend oder fliegend
    const motionChanged = () => { this.last = 0; this.kick(); };
    document.addEventListener('flyingstars:motion-change', motionChanged);
    reducedMotion.addEventListener('change', motionChanged);
    document.fonts?.ready.then(refresh);
    const fs = this.slots.find((s) => s.def.folge);
    if (fs) this.loadFolge(fs);
    this.frame = this.frame.bind(this);
    this.layout(true);
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
    }, { rootMargin: '120% 0px' });
    io.observe(slot.host);
  }
  own(place: Place) { const el = document.createElement('div'); el.className = `hm-own hm-own-${place}`; el.setAttribute('aria-hidden', 'true'); return el; }
  kick() { if (!this.raf) this.raf = requestAnimationFrame(this.frame); }

  /** Ein Bild für eine Bühne bestellen; sobald es geladen ist, fliegt der Schwarm um, falls die Bühne gerade spielt. */
  want(slot: Slot, spec: Spec) {
    const id = idOf(spec); if (slot.want === id) return;
    slot.want = id; slot.spec = spec; slot.seqAt = 0;
    load(spec).then((sc) => { if (slot.want !== id) return; this.put(slot, sc); }).catch(() => {});
    // Einmal-Folgen (Auftakt des Formulars) laden ihr nächstes Bild erst beim Wechsel: Das Datum braucht den Textplaner
    if ('seq' in spec && !spec.once) spec.seq.forEach((s) => void load(s).catch(() => {}));
  }
  put(slot: Slot, sc: Scene) {
    slot.scene = sc;
    if (slot.own) slot.own.dataset.himmel = sc.id; // welches Bild die Bühne trägt (für Wächter-Tests; das Fenster ist aria-hidden)
    if (!still() && this.active === slot && this.shown !== sc) this.go(slot, 1250);
    this.last = 0; this.kick();
  }

  layout(force = false) {
    const old = this.active?.box;
    // Erst alle Außenmaße lesen. measure() kann für eine Bühne Platz im Seitenfluss ein- oder ausblenden.
    const bounds = this.slots.map((slot) => page(slot.host));
    let redraw = force;
    for (const [i, slot] of this.slots.entries()) {
      const next = bounds[i], prev = slot.bounds, before = slot.box;
      slot.bounds = next;
      if (force || !prev || prev.w !== next.w || prev.h !== next.h) measure(slot);
      else if (before.w && (prev.x !== next.x || prev.y !== next.y)) {
        // Verschiebt sich nur der Block, gelten Kollisionsprüfung und Maße weiter.
        slot.box = { ...before, x: before.x + next.x - prev.x, y: before.y + next.y - prev.y };
      }
      const after = slot.box;
      if (!force && before.x === after.x && before.y === after.y && before.w === after.w && before.h === after.h) continue;
      // Eine entfernte Bühne braucht erst einen neuen Frame, wenn sie ins Spiel kommt.
      redraw ||= slot === this.active || still() || Boolean(slot.scene && (this.inRange(slot, before) || this.inRange(slot, after)));
      if (this.fol && slot.def.folge && after.w) {
        this.fol.place(after);
        if (this.folPts && !this.handed) this.folPts = this.fol.peek();
      }
    }
    if (!redraw) return;
    // Layout hat sich verschoben (Bilder geladen, Akkordeon offen): der stehende Schwarm zieht mit, ohne Flug
    if (old && this.active && this.born) {
      const dx = this.active.box.x + this.active.box.w / 2 - (old.x + old.w / 2), dy = this.active.box.y + this.active.box.h / 2 - (old.y + old.h / 2);
      if (dx || dy) for (let i = 0; i < N; i++) { this.x[i] += dx; this.y[i] += dy; this.fx[i] += dx; this.fy[i] += dy; this.mx[i] += dx; this.my[i] += dy; }
    }
    this.fly.H = 0; this.stand.H = 0; this.last = 0; // Flächen neu ankern (angelegt wird nur bei neuer Pixelgröße)
    this.kick();
  }

  /** Zeichenfläche wählen und in Seitenkoordinaten ankern. Flug (wide): ein Fenster von 1,7 Bildschirmhöhen über die ganze
   *  Breite, das nur wandert, wenn der Rand naht; steht ein Bild, zeichnet die Bühnenfläche (nur so groß wie die Bühne). Wandern
   *  heißt nur transform; neu angelegt wird eine Fläche allein bei neuer Pixelgröße. crisp: auch die Flugfläche in voller
   *  Pixeldichte (stehende Fassung bei Pause und reduzierter Bewegung). */
  anchor(wide = true, crisp = false): boolean {
    const vh = innerHeight, w = html().clientWidth, doc = Math.max(html().scrollHeight, vh), full = Math.min(1.5, devicePixelRatio || 1);
    const a = this.active?.box;
    const f = !wide && a && a.w ? this.stand : this.fly, prev = this.sf;
    let L: number, T: number, W: number, H: number;
    const d = f === this.stand || crisp ? full : 1;
    if (f === this.stand) {
      L = Math.max(0, Math.floor(a!.x - 70)); T = Math.max(0, Math.floor(a!.y - 70)); W = Math.min(w - L, Math.ceil(a!.w + 140)); H = Math.min(doc - T, Math.ceil(a!.h + 140));
    } else {
      H = Math.min(doc, Math.round(vh * 1.7)); W = w; L = 0;
      const near = scrollY < f.top + vh * 0.06 || scrollY + vh > f.top + f.H - vh * 0.06;
      T = f.H === H && !near ? f.top : Math.round(clamp(scrollY - (H - vh) / 2, 0, doc - H));
    }
    if (f === prev && f.left === L && f.top === T && f.W === W && f.H === H && f.d === d) return false;
    const pw = Math.round(W * d), ph = Math.round(H * d), st = f.cv.style;
    if (f.pw !== pw || f.ph !== ph) { f.cv.width = f.pw = pw; f.cv.height = f.ph = ph; st.width = W + 'px'; st.height = H + 'px'; f.dirty = null; }
    else if (f.left !== L || f.top !== T || f.d !== d) { f.g.setTransform(1, 0, 0, 1, 0, 0); f.g.clearRect(0, 0, pw, ph); f.dirty = null; }
    f.left = L; f.top = T; f.W = W; f.H = H; f.d = d;
    // Lage per transform statt left/top: Ein verschobenes Canvas zählte sonst bei jedem Mitwandern als Layout-Verschiebung
    // (CLS bis 1,0 je Scrollstrecke bei echten Besuchern; Lighthouse scrollt nicht und sah es nie)
    st.transform = 'translate(' + L + 'px, ' + T + 'px)';
    if (f !== prev) {
      // Wechsel der Fläche: die andere leeren und verstecken (kein Neuanlegen)
      prev.g.setTransform(1, 0, 0, 1, 0, 0); prev.g.clearRect(0, 0, prev.pw, prev.ph); prev.dirty = null; prev.cv.style.visibility = 'hidden';
      st.visibility = 'visible'; this.sf = f;
    } else st.visibility = 'visible';
    return true;
  }

  inRange(slot: Slot, box = slot.box): boolean {
    const vh = innerHeight, y = scrollY;
    // Das Formular fliegt etwas früher an, weil der Einleitungstext auf dem Handy länger ist.
    const ahead = this.dir > 0 ? (slot.def.place === 'form' ? vh * 1.2 : vh * 0.3) : 60;
    return box.w > 0 && box.y + box.h >= y - (this.dir < 0 ? vh * 0.3 : 60) && box.y <= y + vh + ahead;
  }

  /** Welche Bühne spielt. Der Blick eilt dem Scrollen voraus: Der Schwarm fliegt los, sobald die nächste Bühne ins Bild kommt,
   *  und steht, wenn man dort ankommt (Marc, 13.11.: nicht auf eine leere Fläche warten). Wer im Formular tippt, behält sein Bild. */
  pick(): Slot | null {
    const vh = innerHeight, line = scrollY + vh * (0.5 + 0.16 * this.dir);
    const form = this.slots.find((s) => s.def.place === 'form');
    if (form && form.host.contains(document.activeElement) && form.scene) return form;
    let best: Slot | null = null, bd = Infinity;
    for (const s of this.slots) {
      if (!s.scene || !this.inRange(s)) continue;
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
    const look = stop ? 0 : clamp((cy - (scrollY + vh / 2)) / vh, -1, 1) * (sc.pose ? 0.2 : 0.42); // eine feste Ansicht nur wenig mitdrehen
    const po = sc.pose, swing = po && !stop ? po.amp * Math.sin((performance.now() / 1000 / po.period) * Math.PI * 2) : 0;
    const yaw = look + (sc.turn && !stop ? this.spin : 0) + (po ? po.yaw + swing : 0), c = Math.cos(yaw), s = Math.sin(yaw);
    const pc = Math.cos(po?.pitch ?? 0), ps = Math.sin(po?.pitch ?? 0);
    for (let i = 0; i < N; i++) {
      const j = (i < sc.n ? i : i % sc.n) * 3, X = sc.pts[j], Y0 = sc.pts[j + 1], Z0 = sc.pts[j + 2], Y = Y0 * pc - Z0 * ps, Z = Y0 * ps + Z0 * pc;
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
      if (e) { this.folPts = e.pts; this.folRad = e.radius / Math.min(1.5, devicePixelRatio || 1); } // Gerätepixel der Folge → CSS-Pixel
    }
    const sc = slot.scene; if (!sc) return;
    const now = performance.now();
    slot.heldAt = 0; // Haltezeit einer Einmal-Folge zählt erst ab der Ankunft
    this.fc.set(this.cc); this.rad0 = this.rad1 || this.radius(slot.box);
    this.ox.fill(0); this.oy.fill(0); this.ovx.fill(0); this.ovy.fill(0); // der Abflug beginnt an der sichtbaren Lage (x, y)
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
      const moved = this.anchor(true, true);
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
    const inView = slot.box.y > scrollY + vh * 0.04 && slot.box.y + slot.box.h < scrollY + vh * 0.96;
    // Geschichte in Akten (ODYSSEY, Formular: Datum → Countdown): nach einer Standzeit folgt das nächste Bild.
    // Einmal-Folge (Auftakt des Formulars): die Standzeit zählt nur, solange das Bild ganz im Blick steht; am Ende steht sie.
    const sq = 'seq' in slot.spec ? slot.spec : null, done = !!sq?.once && slot.seqAt >= sq.seq.length - 1;
    if (!flying && sq?.once && !done && inView && !slot.heldAt) slot.heldAt = now;
    if (!flying && sq && !done && (sq.once ? slot.heldAt > 0 && now - slot.heldAt > (slot.seqAt ? INTRO_HOLD.next : INTRO_HOLD.first) : seen && now - this.arrived > 4200)) {
      slot.seqAt = (slot.seqAt + 1) % sq.seq.length; const next = sq.seq[slot.seqAt], want = slot.want;
      this.arrived = now + 1e6; slot.heldAt = -1; // wartet auf die geladene Szene
      load(next).then((nsc) => { if (slot.want === want) this.put(slot, nsc); }).catch(() => { if (slot.want === want) slot.heldAt = 0; }); // misslingt ein Bild, folgt das nächste
      if (sq.once && sq.seq[slot.seqAt + 1]) void load(sq.seq[slot.seqAt + 1]).catch(() => {});
    }
    // Verwandlung (Feuerwerk → Stern): einmal, sobald das Bild gut anderthalb Sekunden ganz im Blick stand
    if (!flying && slot.def.then && !slot.turned && inView && now - this.arrived > 1600 && !(slot.def.folge && this.folReady)) { slot.turned = true; this.want(slot, slot.def.then); }
    const since = this.arrived ? (now - this.arrived) / 1000 : 0, wave = this.arrived && since >= 0 ? ((since % 9) / 1.7) * 1.5 - 0.25 : -9;
    // Verdrängung nur am stehenden Bild; im Flug ruht sie (der Abflug startet dort, wo jede Drohne gerade ist)
    const P = !flying && this.ptr ? { x: this.ptr.x + scrollX, y: this.ptr.y + scrollY } : null;
    let busy = flying, stir = 0;
    // Wirkradius nach Bühnengröße (Formular-Schriftzug rund 44 px, große Bilder bis 84 px). Runde 6 (Marc: „a bit too strong“):
    // Der Stoß ist schnell wie in der Scrollstory, sättigt aber weich, je näher eine Drohne ihrem Höchstausschlag kommt (gut ein
    // Viertel des Radius, am Schriftzug rund 13 px); zurück federt sie kritisch gedämpft, ohne Nachschwingen
    const K = 5, C = 2 * Math.sqrt(K), reach = clamp(Math.min(slot.box.w, slot.box.h) * 0.32, 44, 84), most = reach * 0.3, push = 1600 * (reach / 84), lim = most * 1.2;
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
        if (i < sc.n && dt) {
          // Feder zurück an den Platz, kritisch gedämpft: weich, ohne Nachschwingen
          let vx = this.ovx[i] + (-K * this.ox[i] - C * this.ovx[i]) * dt, vy = this.ovy[i] + (-K * this.oy[i] - C * this.ovy[i]) * dt;
          if (P) { const mx = this.tx[i] + this.ox[i] - P.x, my = this.ty[i] + this.oy[i] - P.y, md = Math.hypot(mx, my); if (md < reach && md > 0.1) { const f = (1 - md / reach) ** 2 * push * Math.max(0, 1 - Math.hypot(this.ox[i], this.oy[i]) / most) * dt; vx += (mx / md) * f; vy += (my / md) * f; } }
          this.ovx[i] = vx; this.ovy[i] = vy; this.ox[i] = clamp(this.ox[i] + vx * dt, -lim, lim); this.oy[i] = clamp(this.oy[i] + vy * dt, -lim, lim);
          stir = Math.max(stir, Math.abs(this.ox[i]) + Math.abs(this.oy[i]) + Math.abs(vx) + Math.abs(vy));
        }
        this.x[i] = this.tx[i] + this.ox[i]; this.y[i] = this.ty[i] + this.oy[i];
        // Lichtlauf: zusätzliche Helligkeit läuft die Linien der Form entlang, die Form bleibt voll hell
        if (wave > -1 && i < sc.n) { const dd = sc.rank[i] - wave; bright += 0.75 * Math.min(1, since / 0.6) * Math.exp(-(dd * dd) / 0.012); }
        // Augen der Maske glühen wie in der Show (show-scenes.js → devilBeat), sanft pulsierend
        if (sc.pose && i < sc.n) { const q = i * 3; if (sc.col[q] > 200 && sc.col[q + 1] > 100 && sc.col[q + 2] < 160) bright = 1.35 + 0.35 * Math.abs(Math.sin(T * 1.5)); }
      }
      this.b[i] = bright;
    }
    this.draw(sc, flying ? u : 1);
    // Außer Sicht ruht der Schwarm, aber nie mitten im Flug: Das Formular wird schon gut eine Bildschirmhöhe vorher
    // angesteuert, also oft außerhalb des Bildes. Vorher stoppte die Schleife hier nach dem ersten Flug-Frame, gedimmte
    // Drohnen hingen in der Luft und sprangen erst beim nächsten Scroll-Ereignis weiter (Marc, Runde 8: „bleiben hängen“,
    // „Framerate-Drop bei der Transition“; Messung tools/himmel/flug-probe.mjs)
    if (!seen && !flying) return;
    // in Bewegung, solange der Zeiger nahe ist oder eine Drohne noch zurückschwingt
    if (P && P.x > slot.box.x - 120 && P.x < slot.box.x + slot.box.w + 120 && P.y > slot.box.y - 120 && P.y < slot.box.y + slot.box.h + 120) busy = true;
    if (stir > 0.05) busy = true;
    if (!busy) busy = sc.turn || !!sc.pose || (wave > -0.3 && wave < 1.35) || (!!sq && !done) || (!!slot.def.then && !slot.turned);
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
    const f = this.sf, { g } = f; g.setTransform(1, 0, 0, 1, 0, 0);
    if (f.dirty) { if (f.dirty[2] > f.dirty[0]) g.clearRect(f.dirty[0] - 2, f.dirty[1] - 2, f.dirty[2] - f.dirty[0] + 4, f.dirty[3] - f.dirty[1] + 4); } else g.clearRect(0, 0, f.pw, f.ph);
    f.dirty = [Infinity, Infinity, -Infinity, -Infinity];
  }
  /** rad in CSS-Pixeln; die Fläche rechnet in ihre Pixeldichte um (Sprites in Viertelpixel-Stufen). */
  dot(xp: number, yp: number, br: number, r: number, gg: number, b: number, rad: number) {
    const f = this.sf, { g, d, dirty } = f, X = (xp - f.left) * d, Y = (yp - f.top) * d;
    if (Y < -40 || Y > f.ph + 40 || br < 0.02) return;
    const px = Math.max(1, Math.round(rad * d * 4) / 4), sp = sprite(r, gg, b, px, false);
    g.globalAlpha = Math.min(1, br); g.drawImage(sp.c, X - sp.R, Y - sp.R);
    let R = sp.R;
    if (br > 1.02) { const hot = sprite(r, gg, b, px, true); g.globalAlpha = Math.min(1, br - 1); g.drawImage(hot.c, X - hot.R, Y - hot.R); R = hot.R; }
    if (dirty) { dirty[0] = Math.min(dirty[0], X - R); dirty[1] = Math.min(dirty[1], Y - R); dirty[2] = Math.max(dirty[2], X + R); dirty[3] = Math.max(dirty[3], Y + R); }
  }
  /** Lichtgröße in CSS-Pixeln. */
  radius(box: Box) { return box.w < 320 ? 1.5 : 1.9; }
  /** u: Fortschritt des Flugs (1 = steht). Farbe und Lichtgröße wandern vom letzten Bild zum neuen (keine Sprünge, auch nicht
   *  bei der Übergabe an die Show-Folge, deren Lichter etwas größer sind). */
  draw(sc: Scene, u = 1) {
    this.clear();
    const { cc, fc, cw } = this, { g } = this.sf, goal = this.folPts && this.active?.def.folge ? this.folRad : this.radius(this.active!.box);
    const rad = this.rad1 = u >= 1 || !this.rad0 ? goal : this.rad0 + (goal - this.rad0) * u;
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
    const { g, top, H } = this.sf;
    g.globalCompositeOperation = 'lighter';
    for (const s of this.slots) {
      const sc = s.scene; if (!sc || !s.box.w) continue;
      if (s.box.y + s.box.h < top || s.box.y > top + H) continue;
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

/** Anlass → Motiv (anlass-motiv.js): Kartenkicker, Link-Ziel, Kartentitel oder Formularwert. */
const occasion = (...texts: string[]): Spec | null => { const motif = occasionMotif(...texts); return motif ? { motif } : null; };

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
    else on({ text: SKY[lang()].start, count: START_COUNT });
  };
  const h = (e: Event) => {
    const el = e.target as HTMLInputElement;
    // Wer etwas eingibt, beendet den Auftakt sofort (beim Ort wartet das Bild sonst noch 520 ms auf die Eingabe)
    if ('seq' in slot.spec && slot.spec.once) on({ text: SKY[lang()].start, count: START_COUNT });
    if (el.name === 'anlass') { lastMotif = FORM_OCCASION[el.value as keyof typeof FORM_OCCASION] ?? occasionMotif(el.closest('label')?.textContent ?? '') ?? 'stern'; lastText = ''; after = ''; show(); }
    else if (el.name === 'paket') show();
    // Nur echte Änderungen: Das change-Ereignis beim Verlassen des Felds würde sonst ein danach gewähltes Datum überschreiben
    else if (el.name === 'ort' && el.value !== ort) { ort = el.value; clearTimeout(t); t = window.setTimeout(() => { lastText = clean(el.value, 18); after = ''; show(); }, 520); }
    else if (el.name === 'datum' && el.value) { const [y, mo, d] = el.value.split('-'); if (y && mo && d) {
      // Das Datum am Himmel, danach der Countdown: wie viele Tage es bis zur Show noch sind
      const days = Math.round((Date.UTC(+y, +mo - 1, +d) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5);
      lastText = skyDate(lang(), +y, +mo, +d); after = days > 0 && days < 1500 ? SKY[lang()].days(days) : ''; show();
    } }
  };
  // Abgeschickt: Der Himmel bedankt sich beim Namen, danach steht der Stern
  window.addEventListener('flyingstars:lead-confirmed', () => { const first = clean(f.querySelector<HTMLInputElement>('#f-name')?.value ?? '', 30).split(' ')[0].slice(0, 10).toUpperCase(); on({ seq: [word(`${SKY[lang()].thanks} ${first}`.trim()), { motif: 'stern', budget: N }] }); });
  f.addEventListener('input', h); f.addEventListener('change', h);
};

/* ---------- Bühnenplan ---------- */

/** Start des Formulars: einmal je Seitenaufruf der Auftakt EURE SHOW → EUER TAG → heute → EURE SHOW (himmel-texte.js). */
const intro = (): Spec => ({ seq: introTexts(lang()).map((text) => ({ text, count: START_COUNT })), once: true });
const FORM: SlotDef = { sel: '#inquiry-form', place: 'form', spec: intro, react: form };
const path = () => location.pathname.replace(/^\/(en|nl)(?=\/)/, '');

function plan(): SlotDef[] {
  const p = path();
  // Startseite: Die Show läuft vom Kopf bis zur Anfrage. Ohne Bild: #darum, #sicherheit, #nachhaltigkeit, #ablauf, #faq.
  if (p === '/') return [
    { sel: '#anlaesse', place: 'head', deskOnly: true, spec: { motif: 'anstossen' }, react: anlaesse },
    // Show-Folge: Blüte, dann SPARK → HORIZON → ODYSSEY in Runden (folge.js); stehend (Pause, reduzierte Bewegung) der Stern
    { sel: '#warum-drohnen', place: 'head', folge: true, spec: { burst: true }, then: { motif: 'stern', budget: N } },
    // Referenzen: die Maske aus der Bokkenrijders-Show (erstes Referenzbild), statt der Galaxie (Marc, 18.11.: Spirale „zu lame“)
    { sel: '#projekte', place: 'head', deskOnly: true, spec: { figure: 'bokkenrijders' }, up: 190, tall: 440, max: 540 },
    { sel: '#preise', place: 'head', spec: priceSpec, react: packs, when: priceRoom },
    { sel: '#ueber', place: 'head', deskOnly: true, spec: { motif: 'smiley' } },
    FORM,
  ];
  // Unterseiten: ein bis zwei Section-Köpfe, wo Luft ist, dann das Formular
  // Hochzeit: nur das Herz; bei #referenzen stünde ein Bild direkt über Fotos, die selbst Formationen zeigen
  if (/hochzeit|wedding|bruiloft/.test(p)) return [{ sel: '#choreografie', place: 'head', deskOnly: true, spec: { motif: 'doppelherz' } }, FORM];
  if (/indoor/.test(p)) return [{ sel: '#unterschied', place: 'head', deskOnly: true, max: 260, spec: { motif: 'diskokugel' } }, FORM];
  // Werbung: #marketing ohne Schwarm, dort tragen die Logo-Shows der Bildleiter (Marc, Runde 7: „nur die Bilder nehmen,
  // unsere Drone-Animation nehmen wir raus“)
  if (/werbung|brand|reclame/.test(p)) return [
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
