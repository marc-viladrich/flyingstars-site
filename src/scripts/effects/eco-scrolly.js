// Scrollstory Nachhaltigkeit, übernommen aus dem Vercel-Prototyp (Branch fix/minimal-fonts, src/scripts/site.ts):
// Die Bühne bleibt stehen, während vier Zahlen nacheinander den Bildschirm übernehmen; im Hintergrund fliegt die Flotte
// eine passende Figur (Schallwelle, die zur Ruhe kommt; eine Null; die geparkte Flotte; ein Blitz für den Strom).
// Globale Pause hält die Figur an; das Modul lädt erst nahe der Section.
import { prepareEcoScrolly } from './eco-scrolly-setup.mjs';
export function ecoScrolly(scrolly) {
  const paused = () => document.documentElement.classList.contains('motion-paused');
    const facts = [...scrolly.querySelectorAll(".fact")], steps = [...scrolly.querySelectorAll(".eco-steps li")], pin = scrolly.querySelector(".eco-pin");
    const cv = scrolly.querySelector("canvas"), g = cv.getContext("2d"), count = scrolly.querySelector("[data-to]");
    prepareEcoScrolly(scrolly);
    let W = 1, H = 1, DPR = 1, cur = -1, since = 0, t = 0, seen = false, launched = false, mouse = null, fit = { cx: 0, cy: 0, s: 1 };
    const size = () => {
      DPR = Math.min(2, devicePixelRatio || 1);
      const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      fit = W >= 700 ? { cx: W * 0.75, cy: H * 0.45, s: Math.min(W * 0.17, H * 0.3) } : { cx: W * 0.5, cy: H * 0.28, s: Math.min(W * 0.36, H * 0.18) };
    };
    size();

    // figures in units of fit.s (y points down): [x, y, size]
    const N = W < 700 ? 110 : 150;
    const along = (pts, n) => { // n points evenly along a closed outline
      const L = [0]; for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
      return Array.from({ length: n }, (_, q) => { const d = (q / n) * L[pts.length]; let j = 0; while (L[j + 1] < d) j++; const a = pts[j], b = pts[(j + 1) % pts.length], u = (d - L[j]) / (L[j + 1] - L[j] || 1); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; });
    };
    const BOLT = along([[-0.05, -1], [0.45, -1], [0.1, -0.15], [0.5, -0.15], [-0.25, 1], [0, 0.1], [-0.45, 0.1]], N);
    const ROWS = [6, 5, 7].find((r) => N % r === 0) || 6, COLS = Math.ceil(N / ROWS); // full rows only
    const PAD = Array.from({ length: N }, (_, i) => { const r = Math.floor(i / COLS), c = i % COLS, f = 0.55 + 0.45 * (r / (ROWS - 1)); return [(c / (COLS - 1) - 0.5) * 2.1 * f, 0.15 + (r / (ROWS - 1)) * 0.7, f]; });
    const shape = (k, i) => {
      if (k === 0) { // a sound wave that calms down to a quiet line
        const L = i % 3, n = Math.ceil(N / 3), u = Math.floor(i / 3) / (n - 1), amp = 0.12 + 0.88 * Math.exp(-since / 1.2);
        return [(u - 0.5) * 2.3, Math.sin(u * Math.PI * 3 + t * 2.4 + L * 0.8) * amp * (0.62 - L * 0.16) * Math.sin(u * Math.PI) + (L - 1) * 0.1, 1];
      }
      if (k === 1) { const a = (i / N) * Math.PI * 2 + t * 0.25; return [Math.cos(a) * 0.72, Math.sin(a) * 0.98, 1]; } // a zero, slowly circling
      if (k === 2) return PAD[i]; // the fleet parked in neat rows – nothing stays behind
      return [BOLT[i][0], BOLT[i][1], 1]; // power
    };
    const xs = (pts) => [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
    const SPAN = [[-1.15, 1.15], [-0.72, 0.72], xs(PAD), xs(BOLT)]; // every figure gets the whole brand gradient from left to right

    const D = Array.from({ length: N }, () => ({ x: 0, y: 0, vx: 0, vy: 0, s: 1, delay: 1e9 }));
    const launch = () => { launched = true; D.forEach((d, i) => { d.x = W * (0.1 + Math.random() * 0.8); d.y = H + 20; d.vx = d.vy = 0; d.delay = (i / N) * 1.1 + Math.random() * 0.3; }); };
    const step = (dt) => {
      t += dt; since += dt;
      const k = 7, c = 2 * Math.sqrt(k) * 0.8, fig = Math.max(0, cur);
      D.forEach((d, i) => {
        if (d.delay > 0) { d.delay -= dt; return; }
        const [sx, sy, ss] = shape(fig, i), tx = fit.cx + sx * fit.s, ty = fit.cy + sy * fit.s;
        d.vx += (k * (tx - d.x) - c * d.vx) * dt; d.vy += (k * (ty - d.y) - c * d.vy) * dt;
        if (mouse) { const mx = d.x - mouse[0], my = d.y - mouse[1], md = Math.hypot(mx, my), R = 110; if (md < R && md > 0.1) { const f = (1 - md / R) ** 2 * 2600 * dt; d.vx += (mx / md) * f; d.vy += (my / md) * f; } }
        d.x += d.vx * dt; d.y += d.vy * dt; d.s += (ss - d.s) * Math.min(1, dt * 4);
      });
    };

    // brand gradient across the figure; faint additive halo, cores with normal blending so overlaps never turn white
    const STOPS = [[255, 158, 41], [219, 100, 232], [51, 237, 242]];
    const colAt = (u) => { u = Math.min(1, Math.max(0, u)) * 2; const a = STOPS[Math.min(1, Math.floor(u))], b = STOPS[Math.min(2, Math.floor(u) + 1)], f = u - Math.min(1, Math.floor(u)); return a.map((v, j) => Math.round(v + (b[j] - v) * f)); };
    const sprites = new Map();
    const sprite = (col) => {
      const key = col.map((v) => v >> 4).join(",");
      if (!sprites.has(key)) {
        const s = document.createElement("canvas"), R = 32; s.width = s.height = R * 2;
        const x = s.getContext("2d"), gr = x.createRadialGradient(R, R, 0, R, R, R);
        gr.addColorStop(0, `rgba(${col},0.24)`); gr.addColorStop(0.35, `rgba(${col},0.07)`); gr.addColorStop(1, `rgba(${col},0)`);
        x.fillStyle = gr; x.fillRect(0, 0, R * 2, R * 2); sprites.set(key, s);
      }
      return sprites.get(key);
    };
    const draw = () => {
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
      const [x0, x1] = SPAN[Math.max(0, cur)], core = Math.max(1.2, fit.s * 0.0125), left = fit.cx + x0 * fit.s, span = (x1 - x0) * fit.s, parked = cur === 2;
      const list = D.filter((d) => d.delay <= 0).map((d, i) => [d, colAt((d.x - left) / span), parked ? 0.5 + 0.2 * Math.sin(t * 1.6 + i * 0.7) : 0.9]);
      g.globalCompositeOperation = "lighter";
      for (const [d, col, a] of list) { const R = core * 5 * d.s; g.globalAlpha = a * 0.6; g.drawImage(sprite(col), d.x - R, d.y - R, R * 2, R * 2); }
      g.globalCompositeOperation = "source-over";
      for (const [d, col, a] of list) { g.globalAlpha = a; g.fillStyle = `rgb(${col.map((v) => Math.min(255, v + 25)).join(",")})`; g.beginPath(); g.arc(d.x, d.y, core * d.s, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    };

    // the scroll position picks the number; the bars at the bottom fill up
    let counting = 0;
    const countUp = () => {
      const to = +count.dataset.to, t0 = performance.now(), id = ++counting;
      const tick = (now) => { if (id !== counting) return; const u = Math.min(1, (now - t0) / 1100); count.textContent = Math.round(to * (1 - (1 - u) ** 3)); if (u < 1) requestAnimationFrame(tick); };
      count.textContent = "0"; requestAnimationFrame(tick);
    };
    const show = (i) => {
      cur = i; since = 0;
      facts.forEach((f, k) => { f.classList.toggle("on", k === i); f.classList.toggle("past", k < i); });
      if (count && facts[i].contains(count)) countUp();
    };
    const onScroll = () => {
      const r = scrolly.getBoundingClientRect(), n = facts.length, p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))), i = Math.min(n - 1, Math.floor(p * n));
      steps.forEach((li, k) => { li.style.setProperty("--fill", Math.min(1, Math.max(0, p * n - k)).toFixed(3)); li.classList.toggle("on", k === i); });
      if (i !== cur) show(i);
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    pin.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; const r = cv.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; });
    pin.addEventListener("pointerleave", () => { mouse = null; });
    if ("ResizeObserver" in window) new ResizeObserver(() => { size(); onScroll(); }).observe(cv);
    new IntersectionObserver((es) => { seen = es[0].isIntersecting; if (seen && !launched) launch(); }).observe(scrolly);
    let last = 0;
    const frame = (dt) => { step(dt); draw(); };
    // Bildschleife nur, solange die Section im Bild ist (vorher lief sie dauerhaft weiter)
    let raf = 0;
    const loop = (now) => { const s = now / 1000, dt = Math.min(0.05, last ? s - last : 0.016); last = s; if (!paused() && !document.hidden) frame(dt); raf = seen ? requestAnimationFrame(loop) : 0; if (!raf) last = 0; };
    new IntersectionObserver((es) => { if (es[0].isIntersecting && !raf) raf = requestAnimationFrame(loop); }).observe(scrolly);
}
