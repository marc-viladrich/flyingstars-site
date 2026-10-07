// Drone field of the show configurator: one dot per drone, flown within the limits of real show drones
// (see show-flight.js; the physics test in tests/show-physics.spec.ts checks every scene).
// A scene is { beats: [{ pts, live?, hold?, caption?, lift?, swirl? }, …] }. pts are the beat's resting places
// [x, y, z, r, g, b] in the scene's own units. live(base, index, t, out) may move a drone smoothly around its resting
// place and change its light; out = [x, y, z, alpha]. lift [dx, dy] bends the flight into this beat into an arc,
// swirl (radians) lets the drones turn in like a vortex. Beats play once, in order; the last beat keeps its live
// motion. Drones that are not needed wait dark behind the picture, as in real shows, and fly there and back.
// The render loop stops when nothing moves; paused or reduced motion shows the last beat at rest.
import { assign, flightTime, along, ease } from "./show-flight.js";

const MAX = 1000;
/** Standby place of drone i: dark, in a layer behind the picture. */
const park = (i, out) => { out[0] = (((i * 0.618034) % 1) - 0.5) * 2; out[1] = (((i * 0.381966) % 1) - 0.5) * 1.2; out[2] = -0.9; return out; };

export function createField(canvas, { onBeat } = {}) {
  const ctx = canvas.getContext("2d");
  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const pos = new Float64Array(MAX * 3), col = new Float32Array(MAX * 3), alpha = new Float32Array(MAX);
  const from = new Float64Array(MAX * 3), fromCol = new Float32Array(MAX * 3), fromAlpha = new Float32Array(MAX);
  // velocity of every drone: a new flight continues the current motion instead of stopping it abruptly
  const vel = new Float64Array(MAX * 3), fromVel = new Float64Array(MAX * 3), prev = new Float64Array(MAX * 3);
  let lastT = 0;
  const spot = [0, 0, 0];
  for (let i = 0; i < MAX; i++) { park(i, spot); pos.set(spot, i * 3); col.set([246, 241, 232], i * 3); }
  let W = 0, H = 0, DPR = 1, frame = 0, visible = true;
  let scene = null, beat = 0, beatAt = 0, flight = 0, order = null, active = 0, leaveEnd = 0, size = 1, fitK = 1, fitX = 0, fitY = 0;
  const live = [0, 0, 0, 1], rest = [0, 0, 0, 1], out = [0, 0, 0];
  const glow = new Map();
  const held = () => reduceQuery.matches || document.documentElement.classList.contains("motion-paused") || document.hidden;
  const now = () => performance.now() / 1000;

  function resize() {
    DPR = Math.min(1.5, devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    render();
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

  /** One scale for all beats of a scene, so the story keeps its proportions. */
  function fit(beats) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const b of beats) for (const p of b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    fitX = (x0 + x1) / 2; fitY = (y0 + y1) / 2;
    fitK = (beats.some((b) => b.live) ? 0.9 : 1) / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75, 1e-6);
  }

  /** Where drone i of the current beat rests at time t (live motion included), in display units → rest. */
  function restAt(i, t) {
    const b = scene.beats[beat], j = order[i], p = b.pts[j];
    let x = p[0], y = p[1], z = p[2] || 0, a = 1;
    if (b.live) { live[0] = x; live[1] = y; live[2] = z; live[3] = 1; b.live(p, j, t - beatAt - flight, live); x = live[0]; y = live[1]; z = live[2]; a = live[3]; }
    rest[0] = (x - fitX) * fitK * size; rest[1] = (y - fitY) * fitK * size; rest[2] = z * fitK * size; rest[3] = a;
    return rest;
  }

  function startBeat(k, t) {
    // bring every drone to where it is now: time may have passed since the last frame (slow device, async build)
    if (lastT && t > lastT) { for (let q = 0; q < MAX * 3; q++) pos[q] += vel[q] * (t - lastT); lastT = t; }
    beat = k; beatAt = t;
    const b = scene.beats[k], n = b.pts.length, target = new Float64Array(n * 3);
    for (let j = 0; j < n; j++) { const p = b.pts[j]; target[j * 3] = (p[0] - fitX) * fitK * size; target[j * 3 + 1] = (p[1] - fitY) * fitK * size; target[j * 3 + 2] = (p[2] || 0) * fitK * size; }
    // every drone beyond this scene that is still out of standby flies back there, dark
    leaveEnd = n;
    for (let i = n; i < MAX; i++) { park(i, spot); if (alpha[i] > 0.01 || Math.abs(pos[i * 3 + 2] - spot[2]) > 1e-6) leaveEnd = i + 1; }
    active = n;
    from.set(pos); fromCol.set(col); fromAlpha.set(alpha); fromVel.set(vel);
    order = assign(from.subarray(0, n * 3), target);
    let longest = flightTime(from.subarray(0, n * 3), target, order);
    let back = 0; // longest way home of the drones returning to standby
    for (let i = n; i < leaveEnd; i++) { park(i, spot); back = Math.max(back, Math.hypot(from[i * 3] - spot[0], from[i * 3 + 1] - spot[1], from[i * 3 + 2] - spot[2])); }
    if (back) longest = Math.max(longest, flightTime(Float64Array.of(0, 0, 0), Float64Array.of(back, 0, 0), [0]));
    flight = held() ? 0 : Math.max(longest, b.minFlight || 0);
    canvas.dataset.points = String(n); canvas.dataset.beat = String(k);
    onBeat?.(k, b);
    if (held()) settle(t);
  }
  function settle(t) {
    beat = scene.beats.length - 1;
    const b = scene.beats[beat];
    if (!order || order.length !== b.pts.length) { active = b.pts.length; order = Int32Array.from({ length: active }, (_, i) => i); }
    flight = 0; beatAt = t - 2.5; // live motion shown at a calm, fully formed moment
    for (let i = 0; i < active; i++) { const r = restAt(i, t); pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1]; pos[i * 3 + 2] = r[2]; alpha[i] = r[3]; col.set(b.pts[order[i]].slice(3, 6), i * 3); }
    for (let i = active; i < MAX; i++) { park(i, spot); pos.set(spot, i * 3); alpha[i] = 0; }
    leaveEnd = active;
    canvas.dataset.beat = String(beat); onBeat?.(beat, b);
  }

  /** Shows a scene at a size factor (1 = fills the stage); instant: already formed (first view of the page). */
  function show(next, droneCount, sizeFactor = 1, { instant = false } = {}) {
    scene = next; size = sizeFactor; fit(scene.beats);
    if (instant) { order = null; settle(now()); } else startBeat(0, now());
    render(); sync();
  }
  function replay() { if (scene && !held()) { startBeat(0, now()); sync(); } }

  /** Advances the simulation; returns whether anything still moves. */
  function step(t) {
    prev.set(pos);
    // a frame timestamp can lie a few ms before the input event that started the flight: progress never below 0
    const b = scene.beats[beat], u = flight ? Math.min(1, Math.max(0, (t - beatAt) / flight)) : 1;
    // Hermite term: starts with the drone's velocity at take-off, gone at arrival (value and slope zero at u = 1)
    const carry = u < 1 ? flight * (u - 2 * u * u + u * u * u) : 0;
    const e = ease(u), swirl = b.swirl ? b.swirl * (1 - e) : 0, cs = Math.cos(swirl), sn = Math.sin(swirl), arc = Math.sin(Math.PI * u) ** 2;
    for (let i = 0; i < active; i++) {
      const r = restAt(i, t), k = i * 3, c = b.pts[order[i]];
      if (u < 1) {
        // swirl: start from the place turned back by the full swirl, so the path begins exactly where the drone is
        const fx = b.swirl ? from[k] * Math.cos(-b.swirl) - from[k + 1] * Math.sin(-b.swirl) : from[k], fy = b.swirl ? from[k] * Math.sin(-b.swirl) + from[k + 1] * Math.cos(-b.swirl) : from[k + 1];
        along(fx, fy, from[k + 2], r[0], r[1], r[2], u, t, out);
        let x = out[0], y = out[1];
        if (swirl) { const x0 = x; x = x0 * cs - y * sn; y = x0 * sn + y * cs; }
        if (b.lift) { x += b.lift[0] * arc * size; y += b.lift[1] * arc * size; }
        pos[k] = x + fromVel[k] * carry; pos[k + 1] = y + fromVel[k + 1] * carry; pos[k + 2] = out[2] + fromVel[k + 2] * carry;
        const f = Math.min(1, u * 1.4);
        for (let q = 0; q < 3; q++) col[k + q] = fromCol[k + q] + (c[3 + q] - fromCol[k + q]) * f;
        // lights dim while the drones reposition, as in FlyingStars' own shows
        alpha[i] = (fromAlpha[i] + (r[3] - fromAlpha[i]) * Math.min(1, u * 2)) * (1 - 0.5 * Math.sin(Math.PI * u));
      } else { pos[k] = r[0]; pos[k + 1] = r[1]; pos[k + 2] = r[2]; alpha[i] = r[3]; col[k] = c[3]; col[k + 1] = c[4]; col[k + 2] = c[5]; }
    }
    // drones no longer needed fly back to standby behind the picture, switching off
    for (let i = active; i < leaveEnd; i++) {
      const k = i * 3; park(i, spot);
      along(from[k], from[k + 1], from[k + 2], spot[0], spot[1], spot[2], u, t, out);
      pos[k] = out[0] + fromVel[k] * carry; pos[k + 1] = out[1] + fromVel[k + 1] * carry; pos[k + 2] = out[2] + fromVel[k + 2] * carry; alpha[i] = Math.max(0, fromAlpha[i] * (1 - u * 2));
    }
    if (u >= 1) leaveEnd = active;
    const dt = lastT ? t - lastT : 0; lastT = t;
    if (dt > 0) for (let k = 0; k < MAX * 3; k++) vel[k] = (pos[k] - prev[k]) / dt;
    const arrived = u >= 1;
    if (arrived && beat < scene.beats.length - 1 && t - beatAt - flight >= (b.hold ?? 2.2)) startBeat(beat + 1, t);
    return !arrived || beat < scene.beats.length - 1 || Boolean(scene.beats[beat].live);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!scene) return;
    const tilt = 0.14, ct = Math.cos(tilt), st = Math.sin(tilt), narrow = W < 600;
    const S = Math.min(W * 0.36, H * (narrow ? 0.38 : 0.6)) * DPR, ox = W * 0.5 * DPR, oy = H * (narrow ? 0.52 : 0.5) * DPR, list = [];
    for (let i = 0; i < MAX; i++) {
      if (alpha[i] < 0.01) continue;
      const k = i * 3, y = pos[k + 1], z = pos[k + 2];
      const Y = y * ct - z * st, Z = y * st + z * ct, pr = 3.4 / (3.4 - Z);
      list.push([ox + pos[k] * S * pr, oy - Y * S * pr, Z, pr, alpha[i], col[k] | 0, col[k + 1] | 0, col[k + 2] | 0]);
    }
    canvas.dataset.lit = String(list.length); // drones lit right now, read by the tests
    list.sort((a, b) => a[2] - b[2]);
    const core = Math.max(1.2 * DPR, S * 0.0085);
    ctx.globalCompositeOperation = "lighter";
    for (const [px, py, , pr, a, r, g, b] of list) { const R = core * pr * 3.2; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite(r, g, b), px - R, py - R, R * 2, R * 2); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    for (const [px, py, , pr, a, r, g, b] of list) { ctx.fillStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},${Math.min(1, a).toFixed(2)})`; ctx.beginPath(); ctx.arc(px, py, core * pr, 0, 7); ctx.fill(); }
  }

  function loop(ms) {
    frame = 0;
    if (!visible || held() || !scene) return;
    const t = ms / 1000, busy = step(t);
    render();
    // physics test hook: positions of every drone in the air, in display units
    if (window.__showTrace) window.__showTrace.push([t, Array.from(pos.subarray(0, Math.max(active, leaveEnd) * 3))]);
    if (busy) frame = requestAnimationFrame(loop);
    else canvas.dataset.running = "false"; // nothing moves: no more frames until the next change
  }
  function sync() {
    if (visible && !held()) { if (!frame && scene) { canvas.dataset.running = "true"; lastT = 0; frame = requestAnimationFrame(loop); } }
    else { if (frame) cancelAnimationFrame(frame); frame = 0; canvas.dataset.running = "false"; if (scene) { settle(now()); render(); } }
  }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  document.addEventListener("flyingstars:motion-change", sync);
  document.addEventListener("visibilitychange", sync);
  reduceQuery.addEventListener("change", sync);
  resize();
  return { show, replay };
}
