// FlyingStars project pages: count-up numbers, scrollytelling, the real formation to play with, film reel
// Adapted from the client-supplied reference; no third-party runtime requests.
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onView = (el, fn, opts = { threshold: 0.35 }) => { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fn(); io.disconnect(); } }), opts); io.observe(el); };

  // big numbers count up once they come into view
  document.querySelectorAll("[data-count]").forEach((el) => {
    const to = +el.dataset.count, fmt = (v) => Math.round(v).toLocaleString("de-DE");
    if (reduce) { el.textContent = fmt(to); return; }
    el.textContent = "0";
    onView(el, () => {
      const t0 = performance.now(), dur = 1400 + Math.min(1200, to);
      const tick = (now) => { const u = Math.min(1, (now - t0) / dur); el.textContent = fmt(to * (1 - (1 - u) ** 3)); if (u < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  });

  // scrollytelling: the step in the middle of the screen picks the picture on the left
  const steps = [...document.querySelectorAll("[data-step]")], scenes = [...document.querySelectorAll("[data-scene]")], progress = document.querySelector("[data-progress]");
  if (steps.length) {
    const show = (i) => {
      steps.forEach((s, k) => s.classList.toggle("on", k === i));
      scenes.forEach((s, k) => s.classList.toggle("on", k === i));
      if (progress) progress.textContent = `${String(i + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(steps.indexOf(e.target)); }), { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => io.observe(s));
    show(0);
  }

  // film reel: arrows and drag to scroll
  document.querySelectorAll(".c-reel").forEach((reel) => {
    const track = reel.querySelector(".c-track"), step = () => (track.querySelector("figure")?.getBoundingClientRect().width || 400) + 20;
    reel.querySelector("[data-prev]")?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
    reel.querySelector("[data-next]")?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
    let down = null;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = { x: e.clientX, left: track.scrollLeft }; track.classList.add("drag"); track.setPointerCapture(e.pointerId); });
    track.addEventListener("pointermove", (e) => { if (down) track.scrollLeft = down.left - (e.clientX - down.x); });
    const up = () => { down = null; track.classList.remove("drag"); };
    track.addEventListener("pointerup", up); track.addEventListener("pointercancel", up);
  });

  // the formation: real drone positions read from the footage, or taken from the show file (then with real depth as
  // 7th value) – they take off when the section comes into view
  const cv = document.querySelector("canvas[data-formation]");
  if (cv) {
    const ctx = cv.getContext("2d"), tally = document.querySelector("[data-tally]"), replay = document.querySelector("[data-replay]");
    let D = [], W = 0, H = 0, DPR = 1, mouse = null, visible = false, started = false, tilt = 0, nod = 0, deep = false, paused = false;
    const pause = document.querySelector("[data-formation-pause]");
    if (reduce && pause) pause.hidden = true;
    const sprites = new Map();
    const sprite = (r, g, b) => {
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      if (!sprites.has(key)) {
        const s = document.createElement("canvas"), R = 32, c = `${(r >> 4) * 16 + 8},${(g >> 4) * 16 + 8},${(b >> 4) * 16 + 8}`; s.width = s.height = R * 2;
        const x = s.getContext("2d"), gr = x.createRadialGradient(R, R, 0, R, R, R);
        gr.addColorStop(0, `rgba(${c},0.24)`); gr.addColorStop(0.35, `rgba(${c},0.07)`); gr.addColorStop(1, `rgba(${c},0)`);
        x.fillStyle = gr; x.fillRect(0, 0, R * 2, R * 2); sprites.set(key, s);
      }
      return sprites.get(key);
    };
    let fit = { cx: 0, cy: 0, s: 1, hx: 0, hy: 0 }, pivot = 0;
    const YAW = 0.45, NOD = 0.3; // how far a 3D head turns and nods towards the pointer (rad)
    // a drone seen after turning (yaw) and nodding about the pivot depth – for a head the pivot lies behind the face,
    // so the whole face swings towards the pointer; flat formations: pivot 0, no nod (as before)
    const view = (x, y, z, ca, sa, cn, sn) => {
      const z1 = z - pivot, X = x * ca + z1 * sa, Z1 = -x * sa + z1 * ca, Y = y * cn + Z1 * sn, Z = Z1 * cn - y * sn + pivot;
      return [X, Y, Z, 5 / (5 - Z)];
    };
    const resize = () => {
      DPR = Math.min(2, devicePixelRatio || 1);
      const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      if (!D.length) return;
      // real depth: fit what the camera sees (near drones appear bigger), over the whole turning range of the head
      const poses = deep ? [[0, 0], [YAW, 0], [-YAW, 0], [0, NOD], [0, -NOD], [YAW, NOD], [-YAW, NOD], [YAW, -NOD], [-YAW, -NOD]] : [[0, 0]], xs = [], ys = [];
      for (const [yw, nd] of poses) for (const d of D) {
        if (d.off) continue;
        const [X, Y, , pr] = view(d.tx, d.ty, d.tz, Math.cos(yw), Math.sin(yw), Math.cos(nd), Math.sin(nd)), k = deep ? pr : 1;
        xs.push(X * k); ys.push(Y * k);
      }
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      const wide = W > 900, room = wide ? [W * 0.62, H * 0.78] : [W * 0.86, H * 0.56];
      fit = { hx: (wide ? W * 0.6 : W * 0.5) * DPR, hy: (wide ? H * 0.46 : H * 0.36) * DPR, s: Math.min(room[0] / bw, room[1] / bh) * DPR, cx: (wide ? W * 0.6 : W * 0.5) * DPR - ((Math.max(...xs) + Math.min(...xs)) / 2) * Math.min(room[0] / bw, room[1] / bh) * DPR, cy: (wide ? H * 0.46 : H * 0.36) * DPR + ((Math.max(...ys) + Math.min(...ys)) / 2) * Math.min(room[0] / bw, room[1] / bh) * DPR };
    };
    const held = () => paused || document.documentElement.classList.contains("motion-paused");
    // Shows the finished formation, e.g. when it appears while motion is paused.
    const settle = () => { D.forEach((d) => { d.x = d.tx; d.y = d.ty; d.z = d.tz; d.vx = d.vy = 0; d.delay = 0; }); started = true; draw(0, 0); };
    const launch = () => { // all drones start on the ground and take off in waves, like at a real show
      started = true;
      D.forEach((d, i) => { d.x = (Math.random() - 0.5) * 2.4; d.y = -1.25 - Math.random() * 0.15; d.z = 0; d.vx = d.vy = 0; d.delay = (i / D.length) * 1.2 + Math.random() * 0.4; });
    };
    onView(cv, () => {
    fetch(cv.dataset.formation).then((r) => {
      if (!r.ok) throw new Error(`Formation HTTP ${r.status}`);
      return r.json();
    }).then((F) => {
      if (!Array.isArray(F.dots) || !F.dots.length || F.dots.some((dot) => !Array.isArray(dot) || dot.length < 6 || dot.some((value) => !Number.isFinite(value)))) throw new Error("Invalid formation");
      const mx = Math.max(...F.dots.map((d) => Math.abs(d[0])), ...F.dots.map((d) => Math.abs(d[1])));
      deep = F.dots.some((d) => d[6] !== undefined);
      pivot = deep ? Math.min(...F.dots.map((d) => d[6])) / mx - 0.1 : 0; // just behind the deepest point of the face
      D = F.dots.map(([x, y, r, g, b, v, z], i) => ({ tx: x / mx, ty: y / mx, tz: z !== undefined ? z / mx : (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.12, r, g, b, v, off: r + g + b === 0, x: x / mx, y: y / mx, z: 0, vx: 0, vy: 0, delay: 0, ph: i * 0.37 }));
      if (tally) tally.textContent = `${D.length.toLocaleString("de-DE")} Drohnen ${F.source === "show" ? "aus der Show-Datei" : "erkannt"}`;
      resize();
      if (replay) replay.disabled = reduce;
      if (reduce) D.forEach((d) => { d.z = d.tz; });
      if (reduce) { started = true; draw(0, 0); }
      else { launch(); if (held()) settle(); }
    }).catch(() => { if (tally) tally.textContent = "Die Formation konnte nicht geladen werden."; });
    }, { rootMargin: "100px", threshold: 0 });
    replay?.addEventListener("click", () => { if (!reduce && D.length) { paused = false; pause?.setAttribute("aria-pressed", "false"); if (pause) pause.textContent = "Animation pausieren"; launch(); } });
    pause?.addEventListener("click", () => { paused = !paused; pause.setAttribute("aria-pressed", String(paused)); pause.textContent = paused ? "Animation fortsetzen" : "Animation pausieren"; });
    const host = cv.parentElement;
    host.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; const r = cv.getBoundingClientRect(); mouse = [(e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR]; });
    host.addEventListener("pointerleave", () => { mouse = null; });
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
    if ("ResizeObserver" in window) new ResizeObserver(() => { resize(); if ((reduce || held()) && started) draw(0, 0); }).observe(cv);

    const draw = (dt, t) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      if (!started) return;
      // the formation turns a little towards the pointer, so the depth shows; a real 3D head from a show file looks at
      // the pointer instead – it turns and nods towards it (Flo 26.09.2026)
      let want, wantNod = 0;
      if (deep && mouse) {
        want = Math.max(-1, Math.min(1, (mouse[0] - fit.hx) / (cv.width * 0.4))) * YAW;
        wantNod = Math.max(-1, Math.min(1, (fit.hy - mouse[1]) / (cv.height * 0.45))) * NOD;
      } else want = mouse ? ((mouse[0] / cv.width) - 0.5) * 0.5 : Math.sin(t * 0.25) * 0.12;
      tilt += (want - tilt) * Math.min(1, dt * (deep ? 3 : 2)); nod += (wantNod - nod) * Math.min(1, dt * 3);
      const ca = Math.cos(tilt), sa = Math.sin(tilt), cn = Math.cos(nod), sn = Math.sin(nod), k = 7, c = 2 * Math.sqrt(k) * 0.8, list = [];
      for (const d of D) {
        if (dt) {
          if (d.delay > 0) d.delay -= dt;
          else {
            const dx = d.tx - d.x, dy = d.ty - d.y, dz = d.tz - d.z;
            d.vx += (k * dx - c * d.vx) * dt; d.vy += (k * dy - c * d.vy) * dt; d.z += dz * Math.min(1, dt * 3);
          }
          d.x += d.vx * dt; d.y += d.vy * dt;
        }
        if (d.off) continue;
        const wx = d.x + Math.sin(t * 1.3 + d.ph) * 0.003, wy = d.y + Math.cos(t * 1.1 + d.ph) * 0.003;
        const [X, Y, Z, pr] = view(wx, wy, d.z, ca, sa, cn, sn);
        const sx = fit.cx + X * fit.s * pr, sy = fit.cy - Y * fit.s * pr;
        if (mouse && dt) {
          const mx = sx - mouse[0], my = sy - mouse[1], md = Math.hypot(mx, my), R = 110 * DPR;
          if (md < R && md > 0.1) { const f = (1 - md / R) ** 2 * 5 * dt; d.vx += (mx / md) * f * ca; d.vy -= (my / md) * f; }
        }
        list.push([sx, sy, Z, pr, (0.45 + 0.55 * d.v) * (d.delay > 0 ? 0 : 1), d.r, d.g, d.b]);
      }
      list.sort((u, v) => u[2] - v[2]);
      const core = Math.max(1.1 * DPR, fit.s * 0.0105);
      ctx.globalCompositeOperation = "lighter";
      for (const [sx, sy, , pr, a, r, g, b] of list) { if (!a) continue; const R = core * pr * 5 + 3 * DPR; ctx.globalAlpha = a * 0.8; ctx.drawImage(sprite(r, g, b), sx - R, sy - R, R * 2, R * 2); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      for (const [sx, sy, , pr, a, r, g, b] of list) { if (!a) continue; ctx.fillStyle = `rgba(${Math.min(255, r + 25)},${Math.min(255, g + 25)},${Math.min(255, b + 25)},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(sx, sy, core * pr, 0, 7); ctx.fill(); }
    };
    if (!reduce) {
      let last = 0;
      const loop = (now) => { const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t; if (visible && !paused && !document.documentElement.classList.contains("motion-paused") && !document.hidden) draw(dt, t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }
})();
