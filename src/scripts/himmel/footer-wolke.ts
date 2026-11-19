// Punktwolke im Footer (Runde 7, Marc 19.11.2026: „gradient-bunte, subtly, tastefully moving Dot-Cloud … für dieses
// Drohnen-Feeling“). Geparkte Drohnen im Logoverlauf, locker in einem Raster, nur auf den freien Flächen des Footers:
// Jeder Punkt hält Abstand zu Text, Links und Logos (CLEAR), darum bleibt alles lesbar und nichts wird berührt
// (docs/DESIGN.md → Himmel: Zugaben brauchen Luft). Die Wolke sitzt rechts unten und läuft zur Mitte und an Inhalten weich aus.
// Bewegung: jede Drohne schwebt auf einer kleinen eigenen Bahn (wenige Pixel, 9–16 s) und atmet leicht in der Helligkeit.
// Läuft nur, solange der Footer sichtbar ist und Bewegung erlaubt ist; sonst steht ein Standbild. Index lädt dieses Modul
// erst, wenn der Footer näher als 600 px ist (himmel/index.ts).
import { subscribeMotionPolicy, observeVisibility } from '../motion-policy';

const GRID = 26; // px Rasterweite (CSS-Pixel)
const CLEAR = 32; // px Mindestabstand zu Inhalten
const FPS = 30;

interface Dot { x: number; y: number; ax: number; ay: number; px: number; py: number; w: number; a: number; tw: number; c: number }

const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
// weiche Inseln: Summe zweier Sinusfelder, 0..1
const cloud = (x: number, y: number) => 0.5 + 0.25 * Math.sin(x / 140 + Math.sin(y / 90)) + 0.25 * Math.sin(y / 70 - x / 210 + 1.3);

function rgb(name: string, root: CSSStyleDeclaration): [number, number, number] {
  const v = root.getPropertyValue(name).trim().split(/\s+/).map(Number);
  return v.length === 3 && v.every(Number.isFinite) ? [v[0], v[1], v[2]] : [255, 255, 255];
}
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

export function startFooterWolke(canvas: HTMLCanvasElement): void {
  const footer = canvas.parentElement as HTMLElement;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const css = getComputedStyle(document.documentElement);
  const stops = [rgb('--rgb-logo-amber', css), rgb('--rgb-logo-orchid', css), rgb('--rgb-cyan', css)];
  // Leuchtpunkt je Farbstufe vorgerendert (wie die Himmelslichter): Kern + weicher Hof
  const STEPS = 24;
  let sprites: HTMLCanvasElement[] = [], dpr = 1, dots: Dot[] = [], w = 0, h = 0;
  const sprite = (c: number[]) => {
    const s = Math.round(14 * dpr), cv = document.createElement('canvas'); cv.width = cv.height = s;
    const g = cv.getContext('2d')!, r = s / 2, grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},1)`); grad.addColorStop(0.16, `rgba(${c[0]},${c[1]},${c[2]},0.9)`);
    grad.addColorStop(0.42, `rgba(${c[0]},${c[1]},${c[2]},0.16)`); grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, s, s); return cv;
  };

  function layout(): void {
    const r = footer.getBoundingClientRect(); w = r.width; h = r.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    sprites = Array.from({ length: STEPS }, (_, i) => { const t = i / (STEPS - 1); return sprite(t < 0.5 ? mix(stops[0], stops[1], t * 2) : mix(stops[1], stops[2], t * 2 - 1)); });
    // Inhalte des Footers als Sperrflächen (Text, Links, Logos, Knöpfe), in Footer-Koordinaten
    const rel = (q: DOMRect) => ({ l: q.left - r.left, t: q.top - r.top, r: q.right - r.left, b: q.bottom - r.top });
    // Text zählt mit seinen Zeilen, nicht mit der Breite seines Blocks (ein Listeneintrag ist so breit wie die Spalte)
    const lines: DOMRect[] = [];
    const walker = document.createTreeWalker(footer, NodeFilter.SHOW_TEXT), range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim() || n.parentElement?.closest('[hidden], .sr-only')) continue;
      range.selectNodeContents(n); lines.push(...range.getClientRects());
    }
    const things = [...footer.querySelectorAll<HTMLElement>('img, svg, button:not([hidden])')].map((el) => el.getBoundingClientRect());
    const blocked = [...lines, ...things].filter((q) => q.width > 0 && q.height > 0).map(rel);
    // Abstand eines Punkts zur nächsten Sperrfläche (0 innerhalb)
    const gap = (x: number, y: number) => blocked.reduce((m, b) => Math.min(m, Math.hypot(Math.max(b.l - x, 0, x - b.r), Math.max(b.t - y, 0, y - b.b))), Infinity);
    // Oben bleibt der Punktübergang frei, unten die Zeile mit Copyright und Rechtlichem (über ihrer Linie), seitlich der Rand
    const cs = getComputedStyle(footer), base = footer.querySelector<HTMLElement>('.base');
    const top = parseFloat(cs.paddingTop) * 0.6, side = parseFloat(cs.paddingLeft) * 0.5;
    const bottom = base ? rel(base.getBoundingClientRect()).t - GRID * 0.6 : h - GRID;
    // Zentrum der Wolke: rechts unten; die Dichte fällt zur Mitte hin weich ab
    const cx = w * 0.88, cy = bottom - (bottom - top) * 0.3, rx = Math.max(260, w * 0.42), ry = Math.max(180, Math.min((bottom - top) * 0.75, 380)); // auf dem Handy nur der untere Teil
    const raw: Omit<Dot, 'c'>[] = [];
    for (let y = top + GRID / 2; y < bottom; y += GRID) {
      for (let x = side + GRID / 2; x < w - side; x += GRID) {
        const j = hash(x, y), jx = x + (j - 0.5) * GRID * 0.5, jy = y + (hash(y, x) - 0.5) * GRID * 0.5;
        const g = gap(jx, jy); if (g < CLEAR) continue;
        const fall = Math.max(0, 1 - Math.hypot((jx - cx) / rx, (jy - cy) / ry)); // 1 im Zentrum, 0 am Rand
        const feather = Math.min(1, (g - CLEAR) / 70); // weich auslaufen statt harter Kante an Inhalten
        if (fall * feather * (0.55 + 0.45 * cloud(jx, jy)) < 0.18 + hash(jx * 3.1, jy * 1.7) * 0.42) continue;
        raw.push({ x: jx, y: jy, ax: 1.2 + j * 2.2, ay: 1 + hash(jy, jx) * 2, px: j * 6.28, py: hash(jx, 9) * 6.28,
          w: (2 * Math.PI) / (9000 + j * 7000), a: (0.3 + hash(jx, jy * 2) * 0.4) * (0.55 + 0.45 * Math.min(1, fall * 2)), tw: hash(jy * 2, jx) * 6.28 });
      }
    }
    // Farbe im Logoverlauf über die Ausdehnung der Wolke selbst (schräg von links unten nach rechts oben)
    const k = (d: { x: number; y: number }) => d.x - d.y * 0.6;
    const lo = Math.min(...raw.map(k)), hi = Math.max(...raw.map(k));
    dots = raw.map((d) => ({ ...d, c: Math.round(((k(d) - lo) / Math.max(1, hi - lo)) * (STEPS - 1)) }));
  }

  function draw(t: number): void {
    ctx!.setTransform(1, 0, 0, 1, 0, 0); ctx!.clearRect(0, 0, canvas.width, canvas.height);
    const s = 14 * dpr, half = s / 2;
    for (const d of dots) {
      const x = (d.x + Math.sin(t * d.w + d.px) * d.ax) * dpr, y = (d.y + Math.cos(t * d.w * 0.8 + d.py) * d.ay) * dpr;
      ctx!.globalAlpha = d.a * (0.78 + 0.22 * Math.sin(t * d.w * 1.7 + d.tw));
      ctx!.drawImage(sprites[d.c], x - half, y - half, s, s);
    }
    ctx!.globalAlpha = 1;
  }

  let running = false, raf = 0, last = 0, visible = false, still = true, dirty = true;
  const loop = (t: number) => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (t - last < 1000 / FPS) return;
    last = t; draw(t);
  };
  const update = () => {
    const go = visible && !still;
    if (dirty && (visible || !dots.length)) { layout(); dirty = false; draw(performance.now()); }
    if (go && !running) { running = true; raf = requestAnimationFrame(loop); }
    else if (!go && running) { running = false; cancelAnimationFrame(raf); }
  };
  subscribeMotionPolicy((p) => { still = p.reduced || p.globalPaused || !p.pageVisible; update(); });
  observeVisibility(footer, (v) => { visible = v; update(); }, 0);
  let timer = 0;
  new ResizeObserver(() => { clearTimeout(timer); timer = window.setTimeout(() => { dirty = true; update(); }, 150); }).observe(footer);
  document.fonts?.ready.then(() => { dirty = true; update(); });
}
