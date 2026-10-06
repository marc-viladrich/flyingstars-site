// Shared FlyingStars presentation; source: customer Vercel prototype.
// @ts-nocheck
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // A pause chosen on one page stays in effect while the visitor moves through the site.
  const stored = (() => { try { return sessionStorage.getItem('flyingstars:motion'); } catch { return null; } })();
  let paused = stored ? stored === 'paused' : reduce;
  const motionButton = document.querySelector('[data-motion-toggle]');
  function setMotion() {
    document.documentElement.classList.toggle('motion-paused', paused);
    document.dispatchEvent(new Event('flyingstars:motion-change'));
    if (motionButton) {
      const label = paused ? 'Bewegung fortsetzen' : 'Bewegung pausieren';
      motionButton.setAttribute('aria-label', label); motionButton.title = label;
      motionButton.setAttribute('aria-pressed', String(paused));
    }
  }
  motionButton?.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('flyingstars:motion', paused ? 'paused' : 'running'); } catch {}
    setMotion();
  });
  setMotion();
  const nav = document.querySelector("header.nav");
  const sentinel = document.querySelector(".nav-sentinel");
  if (nav && sentinel) new IntersectionObserver(([entry]) => nav.classList.toggle("scrolled", !entry.isIntersecting)).observe(sentinel);
  const menu = document.getElementById("mobile-menu");
  const opener = document.querySelector("[data-menu-open]");
  if (menu && opener) {
    opener.addEventListener("click", () => { menu.showModal(); opener.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; });
    menu.querySelector("[data-menu-close]").addEventListener("click", () => menu.close());
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => menu.close()));
    menu.addEventListener("close", () => { document.body.style.overflow = ""; opener.setAttribute("aria-expanded", "false"); opener.focus(); });
  }
  // Enhancement and font loading can change the height above an incoming hash link.
  // Align it after layout settles so calculator inquiries stay below the fixed nav.
  if (location.hash) window.addEventListener('load', () => {
    document.fonts.ready.then(() => requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start',behavior:'instant'});
    }));
  }, {once:true});
  // slogan: rotating word (Neu. / Einzigartig. / Anders. / Spektakulär.)
  const word = document.querySelector("[data-rotate]");
  if (word && !reduce) {
    const words = word.dataset.rotate.split("|");
    let i = 0;
    setInterval(() => {
      if (paused || document.hidden) return;
      word.classList.add("out");
      setTimeout(() => { i = (i + 1) % words.length; word.textContent = words[i]; word.classList.remove("out"); }, 500);
    }, 3200);
  }

  // seamless logo marquee
  const mq = document.querySelector(".marquee");
  if (mq && !reduce) mq.insertAdjacentHTML("beforeend", mq.innerHTML.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"'));

  // dot figures (brand signature): ring / sphere / torus with n points
  const GA = Math.PI * (3 - Math.sqrt(5));
  const shapes = {
    ring: (n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0]; }),
    sphere: (n) => Array.from({ length: n }, (_, i) => { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = GA * i; return [Math.cos(t) * r * 0.95, y * 0.95, Math.sin(t) * r * 0.95]; }),
    torus: (n) => { const p = [], U = 25, V = Math.round(n / U); for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const u = (i / U) * Math.PI * 2, v = (j / V) * Math.PI * 2 + i * 0.13; p.push([(0.68 + 0.28 * Math.cos(v)) * Math.cos(u), 0.28 * Math.sin(v), (0.68 + 0.28 * Math.cos(v)) * Math.sin(u)]); } return p.slice(0, n); },
  };
  const orbs = [...document.querySelectorAll("canvas[data-orb]")].map((c) => ({
    c, x: c.getContext("2d"), kind: c.dataset.orb, pts: shapes[c.dataset.orb](+c.dataset.n), col: c.dataset.color.split(",").map(Number), vis: false,
  }));
  if (orbs.length) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { const o = orbs.find((q) => q.c === e.target); if (o) o.vis = e.isIntersecting; }));
    orbs.forEach((o) => io.observe(o.c));
    const draw = (o, t) => {
      const r = o.c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (!w || !h) return;
      if (o.c.width !== w || o.c.height !== h) { o.c.width = w; o.c.height = h; }
      const x = o.x; x.clearRect(0, 0, w, h);
      const s = Math.min(w, h) * 0.42, ox = w / 2, oy = h / 2;
      const ay = o.kind === "ring" ? Math.sin(t * 0.5) * 0.7 : t * 0.4, tl = o.kind === "ring" ? 0.3 + Math.sin(t * 0.37) * 0.2 : o.kind === "torus" ? 0.6 : 0.3;
      const ca = Math.cos(ay), sa = Math.sin(ay), ct = Math.cos(tl), st = Math.sin(tl);
      const proj = o.pts.map(([px, py, pz]) => { let X = px * ca + pz * sa, Z = -px * sa + pz * ca; const Y = py * ct - Z * st; Z = py * st + Z * ct; return [X, Y, Z]; }).sort((u, v) => u[2] - v[2]);
      for (const [X, Y, Z] of proj) {
        const dep = (Z + 1) / 2, pr = 3.2 / (3.2 - Z);
        x.fillStyle = `rgba(${o.col[0]},${o.col[1]},${o.col[2]},${(0.2 + 0.72 * dep).toFixed(3)})`;
        x.beginPath(); x.arc(ox + X * s * pr, oy - Y * s * pr, (0.55 + 1.1 * dep) * d, 0, 7); x.fill();
      }
    };
    if (reduce) orbs.forEach((o) => draw(o, 0.8));
    else { const loop = (now) => { orbs.forEach((o) => o.vis && !paused && !document.hidden && draw(o, now / 1000)); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }

  // headline lines and team cards come in once they scroll into view (without JS everything is simply visible)
  const reveals = document.querySelectorAll("[data-reveal-group], .member");
  if ("IntersectionObserver" in window && !reduce) {
    const rio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target; el.classList.remove("pre"); rio.unobserve(el);
      if (el.classList.contains("member")) setTimeout(() => el.classList.add("shown"), 2600); // later hovers react without the entrance delay
    }), { threshold: 0.25 });
    reveals.forEach((el) => { el.classList.add("pre"); rio.observe(el); });
  }

  // sustainability: the stage stays pinned while four numbers take over the screen; drones in the background fly a matching figure
  const scrolly = document.querySelector("[data-scrolly]");
  if (scrolly && !reduce && "IntersectionObserver" in window) {
    const facts = [...scrolly.querySelectorAll(".fact")], steps = [...scrolly.querySelectorAll(".eco-steps li")], pin = scrolly.querySelector(".eco-pin");
    const cv = scrolly.querySelector("canvas"), g = cv.getContext("2d"), count = scrolly.querySelector("[data-to]");
    scrolly.classList.add("is-scrolly"); scrolly.style.setProperty("--steps", facts.length);
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
    const loop = (now) => { const s = now / 1000, dt = Math.min(0.05, last ? s - last : 0.016); last = s; if (seen && !paused && !document.hidden) frame(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);

  }


})();
