// Drohnen-Schwarm für die Designsprache-Probe: Formationen aus Bild, SVG oder Text,
// Lichtlauf entlang der Form, lebendige Wolke als Übergang.
// Deterministisch: gleiche Quelle und Drohnenzahl ergeben immer dieselbe Formation.
import { formation, hilbertSort, hash, liftColor, lightOrder } from '../formation/index.js';
export { formation, hilbertSort, hash, liftColor, lightOrder };

const STOPS = [[255, 158, 41], [219, 100, 232], [51, 237, 242]];
export function gradientAt(t) {
  const u = Math.min(1, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(u)), f = u - i;
  return STOPS[i].map((c, k) => Math.round(c + (STOPS[i + 1][k] - c) * f));
}

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const motionPaused = () => document.documentElement.classList.contains('motion-paused');

/* ---------- Renderer ---------- */

// Vorgerenderte Lichtpunkte je Farbe und Größe: ein drawImage pro Drohne statt zweier Kreise mit Farbstring
const sprites = new Map();
function sprite(r, g, b, rad, hot) {
  const key = `${r >> 3},${g >> 3},${b >> 3},${rad},${hot ? 1 : 0}`;
  let s = sprites.get(key); if (s) return s;
  const R = Math.ceil(rad * (hot ? 5 : 3.4)), c = document.createElement('canvas');
  c.width = c.height = R * 2; const x = c.getContext('2d');
  const lift = v => Math.min(255, v + 70);
  const gr = x.createRadialGradient(R, R, 0, R, R, R);
  if (hot) { // Lichtlauf: weißer Kern, weiter Schein in der Drohnenfarbe
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(rad / R, `rgba(${lift(r)},${lift(g)},${lift(b)},0.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  } else {
    const core = `rgb(${lift(r)},${lift(g)},${lift(b)})`;
    gr.addColorStop(0, core); gr.addColorStop(rad * 0.8 / R, core);
    gr.addColorStop(rad * 1.15 / R, `rgba(${r},${g},${b},0.24)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  }
  x.fillStyle = gr; x.fillRect(0, 0, R * 2, R * 2);
  s = { c, R }; if (sprites.size > 4000) sprites.clear(); sprites.set(key, s);
  return s;
}

export class Swarm {
  constructor(canvas, { count = 200, scale = 0.42, dot = 2.1 } = {}) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.frame = this.frame.bind(this);
    this.n = count; this.scale = scale; this.dot = dot;
    const f = () => new Float32Array(count);
    this.x = f(); this.y = f(); this.b = f();               // aktuelle Position + Helligkeit
    this.fx = f(); this.fy = f();                          // Start des Übergangs
    this.tx = f(); this.ty = f(); this.wt = f().fill(1); this.on = new Uint8Array(count);
    this.col = new Uint8Array(count * 3);
    this.rank = f();                                       // Position in der Lichtlauf-Reihenfolge
    for (let i = 0; i < count; i++) { this.y[i] = 1.3; this.x[i] = (hash(i, 7) - 0.5) * 2; this.ty[i] = this.y[i]; this.tx[i] = this.x[i]; }
    this.t0 = 0; this.dur = 1; this.mode = 'direct';
    this.wave = 0; this.waveWidth = 0.08; this.boost = 0.6; this.twinkle = 0.1;
    this.dynamic = null; this.visible = true;
    new ResizeObserver(() => this.resize()).observe(canvas); this.resize();
    new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this.kick(); }, { rootMargin: '120px' }).observe(canvas);
    this.kick();
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), d = Math.min(1.5, devicePixelRatio || 1); // wie im Konfigurator: 1,5 reicht für Lichtpunkte
    this.cv.width = Math.max(1, Math.round(r.width * d)); this.cv.height = Math.max(1, Math.round(r.height * d));
    this.w = r.width; this.h = r.height; this.d = d; this.kick();
  }
  kick() { if (!this.raf) this.raf = requestAnimationFrame(this.frame); }
  /** Neue Formation. points: [{x,y,c,wt}] (normiert), mode: 'direct' | 'cloud' | 'rise'; colors: 'source' | 'gradient' */
  set(points, { mode = 'cloud', dur = 2400, colors = 'gradient' } = {}) {
    this.dynamic = null;
    for (let i = 0; i < this.n; i++) { this.fx[i] = this.x[i]; this.fy[i] = this.y[i]; }
    const m = Math.min(points.length, this.n);
    const order = lightOrder(points.slice(0, m)); // Lichtlauf folgt den Linien der Form, nicht der Hilbert-Kurve
    for (let i = 0; i < this.n; i++) {
      const p = i < m ? points[i] : null;
      if (p) { this.tx[i] = p.x; this.ty[i] = p.y; this.on[i] = 1; this.wt[i] = p.wt ?? 1; this.rank[i] = order[i]; }
      else { // nicht gebrauchte Drohnen landen dunkel auf der Startfläche
        this.tx[i] = -1 + 2 * ((i * 0.6180339) % 1); this.ty[i] = 1.25; this.on[i] = 0; this.rank[i] = 1;
      }
      const c = colors === 'source' && p?.c ? liftColor(p.c) : gradientAt(p ? (p.x + 1) / 2 : 0.5);
      this.col.set(c, i * 3);
    }
    this.mode = (reduceMotion() || motionPaused()) ? 'direct' : mode;
    this.t0 = performance.now(); this.dur = this.mode === 'direct' ? 1 : dur;
    this.kick();
  }
  /**
   * Formation, deren Ziel sich mit der Zeit bewegt (z. B. Chopper).
   * @param {(t: number, tx: Float32Array, ty: Float32Array, sw?: Swarm) => void} fn
   * @param {{ dur?: number, colors?: Uint8Array }} [opts] colors: rgb je Drohne
   */
  follow(fn, { dur = 1600, colors = undefined } = {}) {
    for (let i = 0; i < this.n; i++) { this.fx[i] = this.x[i]; this.fy[i] = this.y[i]; this.on[i] = 1; this.wt[i] = 1; }
    if (colors) this.col.set(colors);
    this.dynamic = fn; this.t0 = performance.now(); this.dur = (reduceMotion() || motionPaused()) ? 1 : dur; this.mode = 'cloud';
    this.kick();
  }
  /** Lebendige Wolke von der aktuellen Lage zu den (weiter bewegten) Zielen der dynamischen Formation. */
  retarget(dur = 1200) {
    if (reduceMotion() || motionPaused()) return;
    for (let i = 0; i < this.n; i++) { this.fx[i] = this.x[i]; this.fy[i] = this.y[i]; }
    this.t0 = performance.now(); this.dur = dur; this.mode = 'cloud'; this.kick();
  }
  frame(now) {
    this.raf = 0;
    const still = reduceMotion() || motionPaused();
    if (!this.visible && !still) return;
    const { n } = this; const T = now / 1000;
    if (this.dynamic) this.dynamic(still ? 0 : T, this.tx, this.ty, this);
    // Die dynamische Formation kann hier eine Wende starten (retarget). Erst danach
    // den Fortschritt lesen, sonst blitzt das gespiegelte Ziel einen Frame lang auf.
    const u = Math.min(1, Math.max(0, (now - this.t0) / this.dur));
    for (let i = 0; i < n; i++) {
      const base = this.on[i] ? this.wt[i] : 0;
      let bright = base;
      if (this.mode === 'cloud' && u < 1) {
        // lebendige Wolke: gestaffelter Start, gekrümmte Bahn, Licht gedimmt, einzelne Drohnen blinken
        const d0 = this.rank[i] * 0.25 + hash(i, 3) * 0.15;
        const k = Math.min(1, Math.max(0, (u - d0) / 0.6));
        const e = k * k * (3 - 2 * k);
        const mx = (this.fx[i] + this.tx[i]) / 2 + (hash(i, 11) - 0.5) * 0.9, my = (this.fy[i] + this.ty[i]) / 2 + (hash(i, 13) - 0.5) * 0.7;
        const a = (1 - e) * (1 - e), b2 = 2 * (1 - e) * e, c2 = e * e;
        this.x[i] = a * this.fx[i] + b2 * mx + c2 * this.tx[i];
        // leichtes Schweben nur mitten im Flug (an Start und Ziel exakt null, sonst springt beim Start alles kurz)
        this.y[i] = a * this.fy[i] + b2 * my + c2 * this.ty[i] + Math.sin(T * 1.7 + i) * 0.04 * e * (1 - e);
        if (k > 0 && k < 0.88) bright = hash(i, Math.floor(T * 7 + hash(i) * 7)) < this.twinkle ? 0.95 : 0.07;
        else if (k >= 0.88) bright = base * (k - 0.88) / 0.12;
        else bright = this.b[i] > 0.05 ? Math.max(0.07, this.b[i] * (1 - u * 3)) : 0;
      } else if (this.mode === 'rise' && u < 1) {
        const k = Math.min(1, Math.max(0, (u - this.rank[i] * 0.5) / 0.5));
        const e = 1 - (1 - k) ** 3;
        this.x[i] = this.fx[i] + (this.tx[i] - this.fx[i]) * e; this.y[i] = this.fy[i] + (this.ty[i] - this.fy[i]) * e;
        bright = base * (0.4 + 0.6 * k);
      } else {
        const e = this.dynamic && u < 1 ? u * u * (3 - 2 * u) : 1;
        this.x[i] = this.fx[i] + (this.tx[i] - this.fx[i]) * e; this.y[i] = this.fy[i] + (this.ty[i] - this.fy[i]) * e;
        if (this.dynamic && u < 1 && hash(i, Math.floor(T * 7)) < this.twinkle) bright = 0.95;
      }
      // Lichtlauf: zusätzliche Helligkeit wandert entlang der Form, die Form selbst bleibt voll hell
      // Er beginnt erst mit der Ankunft der Form und vor ihrem Anfang (Phase −0,3), sonst blitzt ein Teil der Form auf
      if (this.wave && this.on[i] && u >= 1 && !still) {
        const since = T - (this.t0 + this.dur) / 1000, w = ((since * this.wave) % 1.6) - 0.3, dd = this.rank[i] - w;
        bright += this.boost * Math.min(1, since / 0.8) * Math.exp(-(dd * dd) / (2 * this.waveWidth * this.waveWidth));
      }
      if (still && this.on[i]) bright = base;
      this.b[i] = bright;
    }
    this.draw();
    const moving = u < 1 || this.dynamic || this.wave || Math.abs(this.dot - (this.dotNow || this.dot)) > 0.01;
    if (moving && !still) this.kick();
  }
  draw() {
    const { g, n, d } = this;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.cv.width, this.cv.height);
    const S = Math.min(this.w, this.h) * this.scale * d, cx = this.w * d / 2, cy = this.h * d / 2;
    // kleine Bühnen (Handy) bekommen kleinere Lichter, sonst verklumpen dichte Formationen
    const fit = Math.min(1, Math.max(0.55, Math.min(this.w, this.h) / 520));
    this.dotNow = this.dotNow ? this.dotNow + (this.dot - this.dotNow) * 0.04 : this.dot; // gleitet über ~1,5 s statt zu springen
    const rad = Math.max(1, Math.round(this.dotNow * fit * d * 4) / 4);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const br = this.b[i]; if (br < 0.02) continue;
      const px = cx + this.x[i] * S, py = cy + this.y[i] * S;
      const r = this.col[i * 3], gg = this.col[i * 3 + 1], b = this.col[i * 3 + 2];
      const sp = sprite(r, gg, b, rad, false);
      g.globalAlpha = Math.min(1, br);
      g.drawImage(sp.c, px - sp.R, py - sp.R);
      if (br > 1.02) { const hot = sprite(r, gg, b, rad, true); g.globalAlpha = Math.min(1, br - 1); g.drawImage(hot.c, px - hot.R, py - hot.R); }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
}
