// Drone field of the show configurator: one dot per drone. A scene is { pictures: [pts, …], anim, hold } with points
// [x, y, z, r, g, b] in any unit. The field fits the scene into view, scales it with the drone count (same spacing
// between drones: more drones make a bigger picture) and flies every drone calmly to its place. Several pictures
// play once, one into the next. anim "turn": once formed, a 3D object turns once around its own axis.
// The render loop stops as soon as nothing moves any more, so an idle page costs no CPU; paused or reduced motion
// shows the finished, last picture.

const MAX = 1000, TURN = 5.5; // seconds for one full turn

export function createField(canvas) {
  const ctx = canvas.getContext("2d");
  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const P = Array.from({ length: MAX }, (_, i) => ({ spin: 1, x: Math.sin(i * 7.1) * 1.4, y: -1.2, z: 0, vx: 0, vy: 0, vz: 0, tx: 0, ty: -1.2, tz: 0, a: 0, ta: 0, r: 246, g: 241, b: 232, tr: 246, tg: 241, tb: 232, delay: 0 }));
  let W = 0, H = 0, DPR = 1, scene = null, phase = 0, phaseAt = 0, turnAt = 0, drones = 0, visible = true, last = 0, frame = 0;
  const glow = new Map(); // pre-rendered glow per colour: one drawImage instead of a gradient per drone
  const held = () => reduceQuery.matches || document.documentElement.classList.contains("motion-paused") || document.hidden;

  function resize() {
    DPR = Math.min(1.5, devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    draw(performance.now() / 1000);
  }
  function sprite(r, g, b) {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    if (!glow.has(key)) {
      const s = document.createElement("canvas"), R = 24; s.width = s.height = R * 2;
      const c = s.getContext("2d"), gr = c.createRadialGradient(R, R, 0, R, R, R);
      gr.addColorStop(0, `rgba(${r},${g},${b},0.35)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = gr; c.fillRect(0, 0, R * 2, R * 2); glow.set(key, s);
    }
    return glow.get(key);
  }

  /** Normalises all pictures of a scene together, so a transformation keeps its scale. */
  function fit(pictures) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const pts of pictures) for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, k = 1 / Math.max((x1 - x0) / 2 / 1.2, (y1 - y0) / 2 / 0.75, 1e-6);
    // left to right order: from one picture to the next every drone flies to a nearby place instead of across the sky
    return pictures.map((pts) => pts.map((p) => [(p[0] - cx) * k, (p[1] - cy) * k, (p[2] || 0) * k, p[3], p[4], p[5], p[6] ?? 1]).sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  }
  function target(pts) {
    const used = Math.min(pts.length, drones);
    canvas.dataset.points = String(used); // drones in the picture, read by the tests
    for (let i = 0; i < MAX; i++) {
      const d = P[i];
      if (i < used) { const p = pts[i]; d.tx = p[0]; d.ty = p[1]; d.tz = p[2]; d.ta = 1; d.tr = p[3]; d.tg = p[4]; d.tb = p[5]; d.spin = p[6]; }
      else d.ta = 0;
      if (d.a < 0.05 && d.ta > 0) { d.x = d.tx * 0.2 + Math.sin(i) * 0.6; d.y = -1.25; d.z = 0; }
      d.delay = held() ? 0 : (i / Math.max(1, drones)) * 0.4;
    }
  }
  function settle() { for (const d of P) { d.x = d.tx; d.y = d.ty; d.z = d.tz; d.a = d.ta; d.r = d.tr; d.g = d.tg; d.b = d.tb; d.vx = d.vy = d.vz = 0; d.delay = 0; } }

  /** Shows a scene at a size factor (1 = fills the stage). Held: the finished, last picture right away. */
  function show(next, droneCount, size = 1) {
    drones = Math.min(MAX, droneCount);
    scene = { ...next, pictures: fit(next.pictures).map((pts) => pts.map((p) => [p[0] * size, p[1] * size, p[2] * size, p[3], p[4], p[5], p[6]])) };
    const now = performance.now() / 1000;
    phase = held() ? scene.pictures.length - 1 : 0; phaseAt = now; turnAt = Infinity;
    target(scene.pictures[phase]);
    if (held()) settle();
    canvas.dataset.running = "true";
    draw(now);
    sync();
  }

  /** Yaw of the current scene: one eased full turn after the last picture has formed, then front-on again. */
  function yawAt(t) {
    if (!scene || scene.anim !== "turn" || !Number.isFinite(turnAt)) return 0;
    const u = Math.min(1, Math.max(0, (t - turnAt) / TURN));
    return (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2) * Math.PI * 2;
  }

  function step(dt, t) {
    let moving = false;
    const hold = (scene.hold && scene.hold[phase]) || 2;
    if (phase < scene.pictures.length - 1) { moving = true; if (t - phaseAt > hold) { phase++; phaseAt = t; target(scene.pictures[phase]); } }
    const k = 5.5, c = 2 * Math.sqrt(k) * 0.9, e = Math.min(1, dt * 2.5);
    for (let i = 0; i < MAX; i++) {
      const d = P[i];
      if (d.ta === 0 && d.a < 0.01) continue;
      if (d.delay > 0) { d.delay -= dt; moving = true; continue; }
      d.vx += (k * (d.tx - d.x) - c * d.vx) * dt; d.vy += (k * (d.ty - d.y) - c * d.vy) * dt; d.vz += (k * (d.tz - d.z) - c * d.vz) * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      d.a += (d.ta - d.a) * e; d.r += (d.tr - d.r) * e; d.g += (d.tg - d.g) * e; d.b += (d.tb - d.b) * e;
      if (Math.abs(d.tx - d.x) + Math.abs(d.ty - d.y) + Math.abs(d.tz - d.z) > 0.002 || Math.abs(d.ta - d.a) > 0.01) moving = true;
    }
    // the turn starts once the last picture stands
    if (scene.anim === "turn" && !Number.isFinite(turnAt) && phase === scene.pictures.length - 1 && !moving) turnAt = t + 0.4;
    const turning = scene.anim === "turn" && (!Number.isFinite(turnAt) || t < turnAt + TURN);
    return moving || turning;
  }

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!scene) return;
    const yaw = yawAt(t), cy = Math.cos(yaw), sy = Math.sin(yaw), tilt = 0.14, ct = Math.cos(tilt), st = Math.sin(tilt);
    // narrow stages carry a two-line caption on top: keep the picture clear of it
    const narrow = W < 600, S = Math.min(W * 0.36, H * (narrow ? 0.38 : 0.6)) * DPR, ox = W * 0.5 * DPR, oy = H * (narrow ? 0.52 : 0.5) * DPR, list = [];
    for (let i = 0; i < MAX; i++) {
      const d = P[i];
      if (d.a < 0.01) continue;
      const c1 = d.spin ? cy : 1, s1 = d.spin ? sy : 0; // a 7th point value 0 keeps a drone out of the turn (stage, curtain)
      const X = d.x * c1 + d.z * s1, Z0 = -d.x * s1 + d.z * c1, Y = d.y * ct - Z0 * st, Z = d.y * st + Z0 * ct, pr = 3.4 / (3.4 - Z);
      list.push([ox + X * S * pr, oy - Y * S * pr, Z, pr, d.a, d.r | 0, d.g | 0, d.b | 0]);
    }
    list.sort((u, v) => u[2] - v[2]);
    const core = Math.max(1.2 * DPR, S * 0.0085);
    ctx.globalCompositeOperation = "lighter";
    for (const [px, py, , pr, a, r, g, b] of list) { const R = core * pr * 3.2; ctx.globalAlpha = a; ctx.drawImage(sprite(r, g, b), px - R, py - R, R * 2, R * 2); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    for (const [px, py, , pr, a, r, g, b] of list) { ctx.fillStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},${a.toFixed(2)})`; ctx.beginPath(); ctx.arc(px, py, core * pr, 0, 7); ctx.fill(); }
  }

  function loop(now) {
    frame = 0;
    if (!visible || held() || !scene) return;
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
    const busy = step(dt, t);
    draw(t);
    if (busy) frame = requestAnimationFrame(loop);
    else { canvas.dataset.running = "false"; last = 0; } // idle: no more frames until the next change
  }
  function sync() {
    if (visible && !held()) { if (!frame && scene) { last = 0; frame = requestAnimationFrame(loop); } }
    else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; canvas.dataset.running = "false";
      if (scene) { phase = scene.pictures.length - 1; target(scene.pictures[phase]); turnAt = -Infinity; }
      settle(); draw(performance.now() / 1000);
    }
  }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  document.addEventListener("flyingstars:motion-change", sync);
  document.addEventListener("visibilitychange", sync);
  reduceQuery.addEventListener("change", sync);
  resize();
  return { show };
}
