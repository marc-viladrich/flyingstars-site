// Schrift-Labor · „Himmel“: EIN Schwarm fliegt die Seite als Show.
//
// Regeln (aus einer echten Drohnenshow abgeleitet, docs/schrift-labor/himmel.md):
// 1. Ein Schwarm, viele Bilder: dieselben Drohnen bilden jedes Bild der Seite. Nichts entsteht, nichts verschwindet.
// 2. Bilder stehen, Wechsel sind dunkel: neben dem Text steht das Bild still; unterwegs fliegen die Drohnen gedimmt,
//    etwa jede zehnte funkelt, das Licht geht erst am Ziel an (docs/DESIGN.md → lebendige Wolke, kein Einrasten, keine Finten).
// 3. Die Seite antwortet mit dem Himmel: Paket zeigen, Anlass wählen, Ort eintippen ändert das Bild.
// 4. Nur echte Formationen: Punkte, Drohnenzahl und Maße kommen aus FlyingStars' Motivkatalog (public/media/katalog/),
//    Schrift aus dem Einstrich-Textplaner (text-formation.js). Nichts ist abgetastet oder erfunden.
//
// Technik: ein Canvas liegt in Seitenkoordinaten (position:absolute) und scrollt mit dem Inhalt. Stehende Bilder
// brauchen deshalb beim Scrollen kein JavaScript; gerechnet wird nur im Flug, beim Lichtlauf und bei 3D-Motiven.
import catalog from '../../content/catalog-motifs.json';
import { gradientAt } from '../effects/swarm.js';
import { hash, lightOrder } from '../formation/index.js';
import { loadTextEngine, textFormation } from '../text-formation.js';

type Mode = 'aus' | 'steht' | 'fliegt' | 'antwortet';
type Spec = { motif: string; budget?: number } | { text: string; count: number } | { grid: true } | { seq: Spec[] };
type Box = { x: number; y: number; w: number; h: number };
interface Scene { id: string; n: number; pts: Float32Array; col: Uint8Array; rank: Float32Array; ax: number; ay: number; turn: boolean; flat: boolean; base: number }
interface SlotDef { sel: string; wide?: boolean; place: 'head' | 'side' | 'form' | 'land' | 'zeile'; spec: Spec; react?: (slot: Slot, on: (spec: Spec) => void, off: Array<() => void>) => void }
interface Slot { def: SlotDef; host: HTMLElement; box: Box; scene: Scene | null; want: string; spec: Spec; seqAt: number; own: HTMLElement | null; made: HTMLElement | null }

const N = 300;
const DESK = 900;
const html = () => document.documentElement;
const mode = (): Mode => (html().getAttribute('data-lab-himmel') as Mode) || 'aus';
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || html().classList.contains('motion-paused');
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lang = () => (['de', 'en', 'nl'].includes(html().lang) ? html().lang : 'de') as 'de' | 'en' | 'nl';
const idOf = (s: Spec): string => ('motif' in s ? `m:${s.motif}:${s.budget ?? N}` : 'text' in s ? `t:${s.text}:${s.count}` : 'grid' in s ? 'grid' : `q:${s.seq.map(idOf).join('+')}`);

/* ---------- Szenen: echte Formationen ---------- */

type Motif = { name: Record<string, string>; dimension: string; variants: Array<{ id: string; points: number }> };
const MOTIFS = (catalog as unknown as { motifs: Record<string, Motif> }).motifs;
const scenes = new Map<string, Promise<Scene>>();

/** Wer ein Motiv beim Namen nennt („Herz“, „Stern“, „Leuchtturm“), bekommt neben dem Wort auch das Bild aus dem Katalog. */
const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]/g, '').trim();
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
  return { id, n, pts, col, rank, ax: (x1 - x0) / 2 / half, ay: (y1 - y0) / 2 / half, turn: false, flat: true, base: 1, ...extra };
}
/** Dunkle Katalogfarben (Braun, Dunkelgrün) hell genug für den Bildschirm; der Farbton bleibt. */
function lit(r: number, g: number, b: number): number[] {
  const m = Math.max(r, g, b); if (m === 0) return [237, 230, 218];
  const k = m < 205 ? 205 / m : 1; return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)].map(Math.round);
}

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
  if ('grid' in spec) {
    const cols = 30, raw: number[][] = [];
    for (let i = 0; i < N; i++) raw.push([(i % cols) - (cols - 1) / 2, -Math.floor(i / cols), 0]);
    // Reihenfolge wie beim Landen: Reihe für Reihe
    const sc = finish(id, raw, () => [237, 230, 218], { base: 0.34 });
    for (let i = 0; i < N; i++) sc.rank[i] = (Math.floor(i / cols) + ((i % cols) / cols) * 0.6) / (N / cols);
    return sc;
  }
  if ('text' in spec) {
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
  return finish(id, raw, (i) => lit(raw[i][3], raw[i][4], raw[i][5]), { turn: deep, flat: !deep });
}

/* ---------- Bühnen: wo ein Bild stehen darf ---------- */

const page = (el: Element): Box => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
const px = (v: string) => parseFloat(v) || 0;

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

function measure(slot: Slot): void {
  const { host, def } = slot, wide = innerWidth >= DESK;
  if (def.place === 'land') { slot.box = page(slot.own!); return; }
  if (def.place === 'zeile') { const b = page(slot.own!); slot.box = { x: b.x, y: b.y + 8, w: b.w, h: b.h - 16 }; return; }
  if (def.place === 'form') { const b = page(slot.own!); slot.box = { x: b.x + 20, y: b.y + 18, w: b.w - 40, h: b.h - 36 }; return; }
  const hostBox = page(host), cs = getComputedStyle(host), right = hostBox.x + hostBox.w - px(cs.paddingRight);
  const head = host.querySelector<HTMLElement>(def.place === 'side' ? '.intro, .faq-intro, :scope > div > div' : '.sec-head') ?? host;
  let used = 0, top = Infinity, bottom = -Infinity;
  for (const c of Array.from(head.children) as HTMLElement[]) { if (c === slot.own) continue; const b = page(c); if (!b.w) continue; used = Math.max(used, b.x + b.w); top = Math.min(top, b.y); bottom = Math.max(bottom, b.y + b.h); }
  // Das Bild steht rechts neben dem Kopf, höchstens 30rem breit, und hält zu allem Abstand
  const left = Math.max(used + 96, right - 480), w = right - left;
  let roomy = wide && def.place === 'head' && w >= 340 && Number.isFinite(top);
  let box: Box = { x: 0, y: 0, w: 0, h: 0 };
  if (roomy) {
    const y1 = bottom, y0 = Math.max(hostBox.y + 24, Math.min(top - 64, y1 - 230));
    box = { x: left, y: y0, w, h: y1 - y0 };
    roomy = box.h >= 170 && free(host, box, head);
  }
  // Auf schmalen Bildschirmen und in vollen Sections spielen nur die Bühnen, die dort etwas zeigen, das man nicht schon sieht
  host.classList.toggle('hm-gap-on', !roomy && !def.wide);
  if (roomy) slot.box = box;
  else if (def.wide) slot.box = { x: 0, y: 0, w: 0, h: 0 };
  else { const b = page(slot.own!); slot.box = { x: b.x, y: b.y, w: b.w, h: b.h }; }
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
  off: Array<() => void> = [];
  px = -1e5; py = -1e5; pt = 0;
  dir = 1; sy = 0;
  m: Mode;

  constructor(m: Mode, defs: SlotDef[]) {
    this.m = m;
    this.layer.className = 'hm-layer'; this.layer.setAttribute('aria-hidden', 'true');
    this.layer.append(this.cv); document.body.append(this.layer);
    for (const def of defs) {
      let host = document.querySelector<HTMLElement>(def.sel); if (!host) continue;
      let made: HTMLElement | null = null;
      if (def.place === 'zeile') { if (m !== 'antwortet') continue; made = zeile(); host.before(made); host = made; }
      const slot: Slot = { def, host, box: { x: 0, y: 0, w: 0, h: 0 }, scene: null, want: '', spec: def.spec, seqAt: 0, own: null, made };
      host.classList.add('hm-host', `hm-${def.place}`);
      // Platzhalter im Seitenfluss: auf dem Handy über der Überschrift, im Formular als Himmelsfenster, im Footer als Landeplatz
      const own = made?.querySelector<HTMLElement>('.hm-own') ?? document.createElement('div'); own.className = `hm-own hm-own-${def.place}`; own.setAttribute('aria-hidden', 'true');
      if (made) { /* steht schon im eingefügten Abschnitt */ }
      else if (def.place === 'form') host.prepend(own);
      else if (def.place === 'land') host.append(own);
      else (host.querySelector('.sec-head, .intro, .faq-intro') ?? host).prepend(own);
      slot.own = own;
      this.slots.push(slot);
      this.want(slot, def.spec);
      if (m === 'antwortet' && def.react) def.react(slot, (spec) => this.want(slot, spec), this.off);
    }
    const again = () => { this.layout(); this.kick(); };
    const ro = new ResizeObserver(again); ro.observe(document.body);
    this.sy = scrollY;
    const onScroll = () => { const dy = scrollY - this.sy; if (Math.abs(dy) > 4) { this.dir = dy > 0 ? 1 : -1; this.sy = scrollY; } this.kick(); };
    const onMove = (e: PointerEvent) => { if (e.pointerType === 'touch') return; this.px = e.pageX; this.py = e.pageY; this.pt = performance.now(); const a = this.active?.box; if (a && this.px > a.x - 60 && this.px < a.x + a.w + 60 && this.py > a.y - 60 && this.py < a.y + a.h + 60) this.kick(); };
    if (m === 'antwortet') { addEventListener('pointermove', onMove, { passive: true }); this.off.push(() => removeEventListener('pointermove', onMove)); }
    const keep = () => this.remember(); addEventListener('pagehide', keep); this.off.push(() => removeEventListener('pagehide', keep));
    this.recall();
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', again);
    const mo = new MutationObserver(() => this.kick()); mo.observe(html(), { attributes: true, attributeFilter: ['class'] });
    document.fonts?.ready.then(again);
    this.off.push(() => { ro.disconnect(); mo.disconnect(); removeEventListener('scroll', onScroll); removeEventListener('resize', again); });
    this.frame = this.frame.bind(this);
    this.layout(); this.kick();
  }
  destroy() {
    cancelAnimationFrame(this.raf); this.off.forEach((f) => f()); this.layer.remove();
    for (const s of this.slots) { s.own?.remove(); s.made?.remove(); s.host.classList.remove('hm-host', 'hm-gap-on', `hm-${s.def.place}`); }
  }
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
    if (this.m !== 'steht' && this.active === slot && this.shown !== sc) this.go(slot, 1250);
    this.kick();
  }

  layout() {
    const old = this.active ? { ...this.active.box } : null;
    for (const s of this.slots) measure(s);
    // Layout hat sich verschoben (Bilder geladen, Akkordeon offen): der stehende Schwarm zieht mit, ohne Flug
    if (old && this.active && this.born) {
      const dx = this.active.box.x + this.active.box.w / 2 - (old.x + old.w / 2), dy = this.active.box.y + this.active.box.h / 2 - (old.y + old.h / 2);
      if (dx || dy) for (let i = 0; i < N; i++) { this.x[i] += dx; this.y[i] += dy; this.fx[i] += dx; this.fy[i] += dy; this.mx[i] += dx; this.my[i] += dy; }
    }
    this.H = 0; this.W = 0; // Canvas neu ankern
  }

  /** Canvas in Seitenkoordinaten. Im Flug (und in der Fassung „steht“) ein Fenster von 1,7 Bildschirmhöhen, das nur wandert,
   *  wenn der Rand naht; steht ein Bild, schrumpft das Canvas auf dessen Bühne (kleine Textur, wenig Grafikzeit). */
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
    this.cv.style.cssText = `left:${this.left}px;top:${this.top}px;width:${this.W}px;height:${this.H}px`;
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
      // im Bild oder kurz davor (in Scrollrichtung etwas weiter)
      if (s.box.y + s.box.h < scrollY - (this.dir < 0 ? vh * 0.3 : 60) || s.box.y > scrollY + vh + (this.dir > 0 ? vh * 0.3 : 60)) continue;
      const dist = Math.abs(s.box.y + s.box.h / 2 - line) - (s === this.active ? vh * 0.14 : 0);
      if (dist < bd) { bd = dist; best = s; }
    }
    return best ?? this.active;
  }

  /** Ziele der aktuellen Formation in Seitenkoordinaten (mit Blickwinkel und Drehung). */
  aim(slot: Slot, sc: Scene, T: number) {
    const { box } = slot, vh = innerHeight;
    const rad = innerWidth < 700 ? 0.86 : 0.92;
    const S = Math.min((box.w * rad) / 2 / Math.max(sc.ax, 0.2), (box.h * rad) / 2 / Math.max(sc.ay, 0.2));
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    // Blickwinkel: wer am Bild vorbeiscrollt, sieht es leicht von der Seite (eine Formation steht im Raum)
    const look = still() || this.m === 'steht' || 'grid' in slot.spec ? 0 : clamp((cy - (scrollY + vh / 2)) / vh, -1, 1) * 0.42;
    const yaw = look + (sc.turn && !still() && this.m !== 'steht' ? this.spin : 0), c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i < N; i++) {
      const j = (i < sc.n ? i : i % sc.n) * 3, X = sc.pts[j], Y = sc.pts[j + 1], Z = sc.pts[j + 2];
      const xr = X * c + Z * s, zr = -X * s + Z * c, p = 1 / (1 - zr * 0.16);
      this.tx[i] = cx + xr * S * p; this.ty[i] = cy - Y * S * p; this.tz[i] = zr;
    }
    void T;
  }

  /** Flug zur Bühne starten: von dort, wo jede Drohne gerade ist. */
  go(slot: Slot, base = 0) {
    const sc = slot.scene; if (!sc) return;
    const now = performance.now();
    this.aim(slot, sc, now / 1000);
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
    this.born = true; this.shown = sc; this.active = slot;
    this.kind = still() ? 'none' : first ? 'rise' : 'cloud';
    this.t0 = now; this.dur = this.kind === 'none' ? 1 : base || clamp(1200 + far * 0.65, 1400, 2500);
    this.arrived = 0;
    this.kick();
  }

  frame(now: number) {
    this.raf = 0;
    if (document.hidden) return;
    const flight = this.m === 'steht' || (this.kind !== 'none' && performance.now() - this.t0 < this.dur + 80) || !this.shown;
    const moved = this.anchor(flight);
    if (this.m === 'steht') { if (moved || this.last !== -1) this.drawStill(); this.last = -1; return; }
    const stop = still(), T = now / 1000, dt = this.last > 0 ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now;
    const target = this.pick();
    if (target && target.scene && (target !== this.active || this.shown !== target.scene)) this.go(target, target === this.active ? 1250 : 0);
    const slot = this.active, sc = this.shown;
    if (!slot || !sc) return;
    const vh = innerHeight, seen = slot.box.y + slot.box.h > scrollY - 80 && slot.box.y < scrollY + vh + 80;
    if (sc.turn && !stop && seen) this.spin += dt * 0.32;
    this.aim(slot, sc, T);
    const u = clamp((now - this.t0) / this.dur), flying = u < 1 && this.kind !== 'none';
    if (!flying && !this.arrived) this.arrived = now;
    // Geschichte in Akten (ODYSSEY): nach einer Standzeit folgt das nächste Bild
    if (!flying && 'seq' in slot.spec && seen && !stop && now - this.arrived > 4200) {
      slot.seqAt = (slot.seqAt + 1) % slot.spec.seq.length; const next = slot.spec.seq[slot.seqAt], want = slot.want;
      this.arrived = now + 1e6; // wartet auf die geladene Szene
      load(next).then((nsc) => { if (slot.want === want) this.put(slot, nsc); }).catch(() => {});
    }
    const since = this.arrived ? (now - this.arrived) / 1000 : 0, wave = !stop && this.arrived && since >= 0 ? ((since % 9) / 1.7) * 1.5 - 0.25 : -9;
    const near = this.m === 'antwortet' && !stop ? clamp(1 - (now - this.pt) / 900) : 0;
    let busy = flying || near > 0;
    for (let i = 0; i < N; i++) {
      const lit = i < sc.n ? sc.base * (0.86 + 0.14 * (this.tz[i] + 1) / 2) : 0;
      let bright = lit;
      if (flying) {
        const k = clamp((u - this.d0[i]) / (this.kind === 'rise' ? 0.55 : 0.6));
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
        // Zeiger: die Drohnen in der Nähe leuchten auf (nur Licht, keine Bewegung)
        if (near && i < sc.n) { const ddx = this.x[i] - this.px, ddy = this.y[i] - this.py; bright += 0.9 * near * Math.exp(-(ddx * ddx + ddy * ddy) / 3600); }
      }
      this.b[i] = bright;
    }
    this.draw(sc);
    if (stop || !seen) return;
    if (!busy) busy = sc.turn || (wave > -0.3 && wave < 1.35) || 'seq' in slot.spec;
    if (busy) this.kick(); else { const wait = (9 - (since % 9)) * 1000; setTimeout(() => this.kick(), Math.min(wait, 9000)); }
  }

  /** Seitenwechsel: Lage und Farbe jeder Drohne (relativ zum Bildschirm) mitnehmen. */
  remember() {
    if (!this.born || !this.shown || this.m === 'steht') return;
    const sc = this.shown, out: number[] = [];
    for (let i = 0; i < N; i++) { const j = (i < sc.n ? i : i % sc.n) * 3; out.push(Math.round(this.x[i] - scrollX), Math.round(this.y[i] - scrollY), Math.round(this.b[i] * 100), sc.col[j], sc.col[j + 1], sc.col[j + 2]); }
    try { sessionStorage.setItem('flyingstars:himmel', JSON.stringify({ t: Date.now(), d: out })); } catch { /* egal */ }
  }
  recall() {
    try {
      const raw = sessionStorage.getItem('flyingstars:himmel'); sessionStorage.removeItem('flyingstars:himmel');
      const v = raw ? (JSON.parse(raw) as { t: number; d: number[] }) : null;
      if (!v || Date.now() - v.t > 6000 || v.d.length !== N * 6 || still()) return;
      for (let i = 0; i < N; i++) { this.x[i] = v.d[i * 6] + scrollX; this.y[i] = v.d[i * 6 + 1] + scrollY; this.b[i] = v.d[i * 6 + 2] / 100; }
      this.born = true;
    } catch { /* egal */ }
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
  draw(sc: Scene) {
    this.clear();
    const { g } = this, rad = this.radius(this.active!.box);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) { const j = (i < sc.n ? i : i % sc.n) * 3; this.dot(this.x[i], this.y[i], this.b[i], sc.col[j], sc.col[j + 1], sc.col[j + 2], rad); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  /** Fassung „steht“: jede Bühne zeigt ihr Bild, nichts fliegt. */
  drawStill() {
    this.clear();
    const { g } = this;
    g.globalCompositeOperation = 'lighter';
    for (const s of this.slots) {
      const sc = s.scene; if (!sc) continue;
      if (s.box.y + s.box.h < this.top || s.box.y > this.top + this.H) continue;
      this.aim(s, sc, 0);
      const rad = this.radius(s.box);
      for (let i = 0; i < sc.n; i++) this.dot(this.tx[i], this.ty[i], sc.base, sc.col[i * 3], sc.col[i * 3 + 1], sc.col[i * 3 + 2], rad);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
}

/* ---------- Dramaturgie der beiden Seiten ---------- */

const hover = (root: HTMLElement, item: string, pickSpec: (el: HTMLElement) => Spec | null, on: (s: Spec) => void, off: Array<() => void>) => {
  let t = 0;
  const h = (e: Event) => { const el = (e.target as HTMLElement).closest<HTMLElement>(item); if (!el || !root.contains(el)) return; const s = pickSpec(el); if (!s) return; clearTimeout(t); t = window.setTimeout(() => on(s), e.type === 'focusin' ? 0 : 140); };
  root.addEventListener('pointerover', h); root.addEventListener('focusin', h);
  off.push(() => { clearTimeout(t); root.removeEventListener('pointerover', h); root.removeEventListener('focusin', h); });
};

const OCCASION: Array<[RegExp, string]> = [
  [/hochzeit|privat|wedding|bruiloft/i, 'doppelherz'], [/silvester|weihnacht|new year|oud en nieuw/i, 'sektflasche'], [/agentur|agenc|bureau/i, 'handschlag'],
  [/marke|werbung|brand|merk|firmen|corporate|bedrijf/i, 'sportwagen'], [/indoor/i, 'diskokugel'], [/musical|kultur|festival|cultu/i, 'mikrofon'], [/st[aä]dt|gemeind|city|town|gemeente|stad/i, 'foerderturm'],
];
const occasion = (text: string): Spec | null => { const hit = OCCASION.find(([re]) => re.test(text)); return hit ? { motif: hit[1] } : null; };

const PACK: Record<string, Spec> = {
  // SPARK: klassisch in 2D, 100 Drohnen. HORIZON: 3D in Bewegung, ab 200. ODYSSEY: erzählte Show in Akten, ab 300.
  SPARK: { motif: 'stern', budget: 100 },
  HORIZON: { motif: 'wasserball', budget: 200 },
  ODYSSEY: { seq: [{ motif: 'atom', budget: 300 }, { motif: 'mandala', budget: 300 }, { motif: 'welle', budget: 300 }] },
};
const packs: SlotDef['react'] = (slot, on, off) => {
  hover(slot.host, '[data-pick-paket]', (el) => PACK[el.dataset.pickPaket ?? ''] ?? null, on, off);
  // Handy: die Reiter über den Paketkarten wählen das Bild
  const tab = (e: Event) => { const name = Object.keys(PACK).find((k) => ((e.target as HTMLElement).closest('label')?.textContent ?? '').toUpperCase().includes(k)); if (name) on(PACK[name]); };
  slot.host.addEventListener('change', tab); off.push(() => slot.host.removeEventListener('change', tab));
};

const FORM_START = (): Spec => ({ text: { de: 'EURE SHOW', en: 'YOUR SHOW', nl: 'JULLIE SHOW' }[lang()], count: 200 });
/** Formular: Anlass → Motiv, Ort → der Name am Himmel, Paket → dieselbe Formation mit der Drohnenzahl des Pakets. */
const form: SlotDef['react'] = (slot, on, off) => {
  const f = slot.host as HTMLFormElement;
  const count = () => ({ SPARK: 100, HORIZON: 200, ODYSSEY: 300 } as Record<string, number>)[(f.querySelector<HTMLInputElement>('input[name="paket"]:checked')?.value ?? '')] ?? 200;
  let lastText = '', lastMotif: string | null = null, after = '', t = 0;
  const word = (text: string): Spec => ({ text, count: Math.min(innerWidth < 700 ? 110 : N, Math.max(innerWidth < 700 ? 0 : count(), text.replace(/\s/g, '').length * 12)) });
  const show = () => {
    if (lastText) on(after ? { seq: [word(lastText), word(after)] } : word(lastText));
    else if (lastMotif) on({ motif: lastMotif, budget: count() < 300 ? Math.max(count(), 160) : 300 });
    else on(FORM_START());
  };
  const h = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.name === 'anlass') { const lab = el.closest('label')?.textContent ?? ''; lastMotif = (occasion(lab) as { motif: string } | null)?.motif ?? 'stern'; lastText = ''; after = ''; show(); }
    else if (el.name === 'paket') show();
    else if (el.name === 'ort') { clearTimeout(t); t = window.setTimeout(() => { lastText = clean(el.value, 18); after = ''; show(); }, 520); }
    else if (el.name === 'datum' && el.value) { const [y, mo, d] = el.value.split('-'); if (y && mo && d) {
      // Das Datum am Himmel, danach der Countdown: wie viele Tage es bis zur Show noch sind
      const days = Math.round((Date.UTC(+y, +mo - 1, +d) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5);
      lastText = `${d}.${mo}.${y.slice(2)}`; after = days > 0 && days < 1500 ? ZEILE[lang()].days(days) : ''; show();
    } }
  };
  const carried = (e: Event) => { lastText = clean((e as CustomEvent<string>).detail, 18); after = ''; show(); };
  // Abgeschickt: Der Himmel bedankt sich beim Namen, danach steht der Stern
  const finale = () => { const first = clean(f.querySelector<HTMLInputElement>('#f-name')?.value ?? '', 30).split(' ')[0].slice(0, 10).toUpperCase(); on({ seq: [word(`${ZEILE[lang()].thanks} ${first}`.trim()), { motif: 'stern', budget: N }] }); };
  window.addEventListener('flyingstars:lead-confirmed', finale); document.addEventListener('hm:finale', finale);
  off.push(() => { window.removeEventListener('flyingstars:lead-confirmed', finale); document.removeEventListener('hm:finale', finale); });
  document.addEventListener('hm:text', carried); off.push(() => document.removeEventListener('hm:text', carried));
  f.addEventListener('input', h); f.addEventListener('change', h);
  off.push(() => { clearTimeout(t); f.removeEventListener('input', h); f.removeEventListener('change', h); });
};

const anlaesse: SlotDef['react'] = (slot, on, off) => hover(slot.host, 'article, li, .card, [data-dot-host]', (el) => occasion(el.querySelector('span, .kicker')?.textContent ?? '') ?? occasion(el.textContent ?? ''), on, off);

/** „Himmelszeile“: ein eigener Abschnitt direkt nach dem Seitenkopf. Wer etwas eintippt, sieht es als Formation. */
const ZEILE = {
  de: { label: 'Was soll am Himmel stehen?', ph: 'Name, Marke oder Datum eintippen', go: 'Damit anfragen', ex: ['JA', '25 JAHRE', 'KÖLN', 'DANKE'], exB: ['EURE MARKE', 'NEU 2027', 'DANKE TEAM'], days: (n: number) => `NOCH ${n} TAGE`, thanks: 'DANKE' },
  en: { label: 'What should the sky say?', ph: 'Type a name, brand or date', go: 'Enquire with this', ex: ['YES', '25 YEARS', 'COLOGNE', 'THANK YOU'], exB: ['YOUR BRAND', 'NEW 2027', 'THANK YOU'], days: (n: number) => `${n} DAYS TO GO`, thanks: 'THANK YOU' },
  nl: { label: 'Wat moet er in de lucht staan?', ph: 'Typ een naam, merk of datum', go: 'Hiermee aanvragen', ex: ['JA', '25 JAAR', 'KEULEN', 'BEDANKT'], exB: ['JULLIE MERK', 'NIEUW 2027', 'BEDANKT'], days: (n: number) => `NOG ${n} DAGEN`, thanks: 'BEDANKT' },
};
const brandPage = () => /werbung|brand|reclame/.test(location.pathname);
const big = () => (innerWidth < 700 ? 140 : N);
/** Vor dem ersten Tastendruck zeigt die Himmelszeile, was am Himmel stehen kann: Worte und Bilder im Wechsel. */
const examples = (): Spec => {
  const t = (brandPage() ? ZEILE[lang()].exB : ZEILE[lang()].ex).map((text): Spec => ({ text, count: big() }));
  const pics: Spec[] = (brandPage() ? ['handschlag', 'zahnraeder'] : ['eheringe', 'sektflasche']).map((motif) => ({ motif, budget: big() }));
  return { seq: [t[0], pics[0], t[1], pics[1], ...t.slice(2)] };
};
const clean = (v: string, max = 24) => v.replace(/[^\p{L}\p{N} .&-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);
function zeile(): HTMLElement {
  const t = ZEILE[lang()], el = document.createElement('section');
  el.className = 'hm-zeile'; el.setAttribute('aria-label', t.label);
  el.innerHTML = `<div class="hm-own"></div><form class="hm-zeile-row" action="#anfrage"><label class="hm-zeile-l" for="hm-zeile-in">${t.label}</label><input id="hm-zeile-in" type="text" maxlength="24" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="${t.ph}"><a class="link" href="#anfrage">${t.go} <span aria-hidden="true">→</span></a></form>`;
  return el;
}
const zeileReact: SlotDef['react'] = (slot, on, off) => {
  const input = slot.host.querySelector<HTMLInputElement>('input')!, formEl = slot.host.querySelector<HTMLFormElement>('form')!;
  let t = 0;
  const h = () => { clearTimeout(t); t = window.setTimeout(() => { const v = clean(input.value); slot.host.toggleAttribute('data-own', !!v); const pic = v ? motifFor(v) : null;
    if (!v) on(examples()); else if (pic) on({ seq: [{ text: v, count: big() }, { motif: pic, budget: big() }] }); else on({ text: v, count: big() }); }, 420); };
  const carry = () => { const v = clean(input.value); if (v) document.dispatchEvent(new CustomEvent('hm:text', { detail: v })); };
  const submit = (e: Event) => { e.preventDefault(); carry(); document.querySelector('#anfrage')?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth' }); };
  input.addEventListener('input', h); formEl.addEventListener('submit', submit); slot.host.querySelector('a')!.addEventListener('click', carry);
  off.push(() => clearTimeout(t));
};

const DEFS: SlotDef[] = [
  { sel: '#anlaesse', place: 'zeile', spec: examples(), react: zeileReact },
  { sel: 'main #referenzen', place: 'zeile', spec: examples(), react: zeileReact },
  // Startseite
  { sel: '#anlaesse', place: 'head', wide: true, spec: { motif: 'anstossen' }, react: anlaesse },
  { sel: '#pakete', place: 'head', spec: PACK.HORIZON, react: packs },
  { sel: '#projekte', place: 'head', wide: true, spec: { motif: 'galaxie' } },
  { sel: '#team', place: 'head', wide: true, spec: { motif: 'smiley' } },
  // Marken & Werbung
  { sel: 'main #referenzen', place: 'head', wide: true, spec: { motif: 'sportwagen' } },
  { sel: '#freigabe', place: 'head', wide: true, spec: { motif: 'handschlag' } },
  { sel: '#orte', place: 'head', wide: true, spec: { motif: 'leuchtturm' } },
  // beide: Die Show endet am Formular, mit dem Bild der Besucher:innen. Kein Bild im Footer.
  { sel: '#inquiry-form', place: 'form', spec: FORM_START(), react: form },
];

let sky: Himmel | null = null;
export function initHimmel(): void {
  const sync = () => {
    const m = mode();
    if (sky && sky.m === m) return;
    sky?.destroy(); sky = null;
    if (m !== 'aus') sky = new Himmel(m, DEFS);
  };
  document.addEventListener('lab:change', sync);
  sync();
}
