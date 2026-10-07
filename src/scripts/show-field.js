// Drone field of the show configurator: one dot per drone. A scene is { pictures: [pts, …], anim, hold } with points
// [x, y, z, r, g, b] in any unit. The field fits the scene into view, scales it with the drone count (the same spacing
// between drones means more drones make a bigger picture) and flies every drone to its place. Several pictures play
// once, one after another (a transformation). Motion: twinkle, burst, burst3d, beat, spin, sway. Paused or reduced
// motion shows the finished, last picture.

const MAX = 1000;

export function createField(canvas) {
  const ctx = canvas.getContext("2d");
  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const P = Array.from({ length: MAX }, (_, i) => ({ x: Math.sin(i * 7.1) * 1.4, y: -1.2, z: 0, vx: 0, vy: 0, vz: 0, tx: 0, ty: -1.2, tz: 0, a: 0, ta: 0, r: 246, g: 241, b: 232, tr: 246, tg: 241, tb: 232, ph: (i * 2.399) % 6.283, delay: 0 }));
  let W = 0, H = 0, DPR = 1, scene = null, phase = 0, phaseAt = 0, drones = 0, visible = true, last = 0, frame = 0, mouse = null;
  const held = () => reduceQuery.matches || document.documentElement.classList.contains("motion-paused") || document.hidden;

  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    draw(0, performance.now() / 1000);
  }

  /** Normalises all pictures of a scene together, so a transformation keeps its scale. */
  function fit(pictures) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const pts of pictures) for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, k = 1 / Math.max((x1 - x0) / 2 / 1.2, (y1 - y0) / 2 / 0.7, 1e-6);
    // left to right order: from one picture to the next every drone flies to a nearby place instead of across the sky
    return pictures.map((pts) => pts.map((p) => [(p[0] - cx) * k, (p[1] - cy) * k, (p[2] || 0) * k, p[3], p[4], p[5]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  }

  function target(pts) {
    const used = Math.min(pts.length, drones);
    canvas.dataset.points = String(used); // drones in the picture, read by the tests
    for (let i = 0; i < MAX; i++) {
      const d = P[i];
      if (i < used) { const p = pts[i]; d.tx = p[0]; d.ty = p[1]; d.tz = p[2]; d.ta = 1; d.tr = p[3]; d.tg = p[4]; d.tb = p[5]; }
      else { d.ta = 0; }
      if (d.a < 0.05 && d.ta > 0) { d.x = d.tx * 0.2 + Math.sin(i) * 0.6; d.y = -1.25; d.z = 0; }
      d.delay = held() ? 0 : (i / Math.max(1, drones)) * 0.35;
    }
  }

  function settle() { for (const d of P) { d.x = d.tx; d.y = d.ty; d.z = d.tz; d.a = d.ta; d.r = d.tr; d.g = d.tg; d.b = d.tb; d.vx = d.vy = d.vz = 0; d.delay = 0; } }

  /** Shows a scene at a size factor (1 = fills the stage). Held: the finished, last picture right away. */
  function show(next, droneCount, size = 1) {
    drones = Math.min(MAX, droneCount);
    if (next.fullSize) size = 1;
    scene = { ...next, pictures: fit(next.pictures).map((pts) => pts.map((p) => [p[0] * size, p[1] * size, p[2] * size, p[3], p[4], p[5]])) };
    phase = held() ? scene.pictures.length - 1 : 0; phaseAt = performance.now() / 1000;
    target(scene.pictures[phase]);
    if (held()) settle();
    draw(0, phaseAt);
    sync();
  }

  function draw(dt, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!scene) return;
    const hold = (scene.hold && scene.hold[phase]) || 1.7;
    if (dt && phase < scene.pictures.length - 1 && t - phaseAt > hold) { phase++; phaseAt = t; target(scene.pictures[phase]); }
    const anim = scene.anim, k = 9, c = 2 * Math.sqrt(k) * 0.85;
    const yaw = anim === "spin" || anim === "burst3d" ? t * 0.55 : anim === "sway" ? Math.sin(t * 0.45) * 0.55 + (mouse ? mouse[0] * 0.4 : 0) : (mouse ? mouse[0] * 0.25 : 0);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), tilt = 0.12, ct = Math.cos(tilt), st = Math.sin(tilt);
    const beat = anim === "beat" ? 1 + 0.07 * Math.pow(Math.max(0, Math.sin(t * 5.2)), 6) + 0.035 * Math.pow(Math.max(0, Math.sin(t * 5.2 - 0.9)), 6) : 1;
    const S = Math.min(W * 0.36, H * 0.62) * DPR, ox = W * 0.5 * DPR, oy = H * 0.53 * DPR, list = [];
    for (let i = 0; i < MAX; i++) {
      const d = P[i];
      if (d.ta === 0 && d.a < 0.01) continue;
      if (dt) {
        if (d.delay > 0) d.delay -= dt;
        else {
          d.vx += (k * (d.tx - d.x) - c * d.vx) * dt; d.vy += (k * (d.ty - d.y) - c * d.vy) * dt; d.vz += (k * (d.tz - d.z) - c * d.vz) * dt;
          d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        }
        const e = Math.min(1, dt * 3);
        d.a += (d.ta - d.a) * e; d.r += (d.tr - d.r) * e; d.g += (d.tg - d.g) * e; d.b += (d.tb - d.b) * e;
      }
      if (d.a < 0.01) continue;
      let x = d.x, y = d.y, z = d.z, a = d.a;
      const inPicture = d.ta === 1;
      if (inPicture) {
        if (anim === "beat") { x *= beat; y *= beat; }
        if (anim === "burst3d") { const u = ((t * 0.35 + (d.ph / 6.283) * 0.1) % 1); const f = 0.35 + u * 0.75; x *= f; y *= f; z *= f; a *= 1 - u * 0.7; }
        if (anim === "burst") { const u = ((t * 0.42 + (d.ph / 6.283) * 0.15) % 1); const f = 0.55 + u * 0.6; x *= f; y *= f; a *= 1 - u * 0.75; }
        if (anim === "twinkle") a *= 0.55 + 0.45 * Math.sin(t * 2.1 + d.ph * 3);
        x += Math.sin(t * 1.3 + d.ph) * 0.004; y += Math.cos(t * 1.1 + d.ph) * 0.004;
      }
      const X = x * cy + z * sy, Z0 = -x * sy + z * cy, Y = y * ct - Z0 * st, Z = y * st + Z0 * ct, pr = 3.4 / (3.4 - Z);
      list.push([ox + X * S * pr, oy - Y * S * pr, Z, pr, a, d.r, d.g, d.b]);
    }
    list.sort((u, v) => u[2] - v[2]);
    const core = Math.max(1.2 * DPR, S * 0.0085);
    ctx.globalCompositeOperation = "lighter";
    for (const [px, py, , pr, a, r, g, b] of list) { ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${(a * 0.16).toFixed(3)})`; ctx.beginPath(); ctx.arc(px, py, core * pr * 3.2, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over";
    for (const [px, py, , pr, a, r, g, b] of list) { ctx.fillStyle = `rgba(${Math.min(255, r + 30) | 0},${Math.min(255, g + 30) | 0},${Math.min(255, b + 30) | 0},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(px, py, core * pr, 0, 7); ctx.fill(); }
  }

  function loop(now) {
    frame = 0;
    if (!visible || held()) return;
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
    draw(dt, t); frame = requestAnimationFrame(loop);
  }
  function sync() {
    if (visible && !held()) { if (!frame) { last = 0; frame = requestAnimationFrame(loop); } }
    else { if (frame) cancelAnimationFrame(frame); frame = 0; if (scene) { phase = scene.pictures.length - 1; target(scene.pictures[phase]); } settle(); draw(0, performance.now() / 1000); }
  }

  canvas.parentElement.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; const r = canvas.getBoundingClientRect(); mouse = [((e.clientX - r.left) / r.width - 0.5) * 2, 0]; });
  canvas.parentElement.addEventListener("pointerleave", () => { mouse = null; });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  document.addEventListener("flyingstars:motion-change", sync);
  document.addEventListener("visibilitychange", sync);
  reduceQuery.addEventListener("change", sync);
  resize();
  return { show, playing: () => Boolean(frame) };
}
