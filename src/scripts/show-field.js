// Drone field of the show configurator: one dot per drone, flown like a real show (see show-flight.js; the physics
// test in tests/show-physics.spec.ts checks every scene).
//
// A scene is { beats: [beat, …], loopTo? }. A beat is { pts, groups?, live?, hold?, caption?, lift?, swirl?,
// shimmer? }: pts are resting places [x, y, z, r, g, b] in the scene's own units; groups name consecutive parts of
// pts ({ name, count, rigid? }). Object permanence: a drone keeps its group from beat to beat (the rocket stays the
// rocket, the arrow stays the arrow); a rigid group flies as one piece, keeping every drone's place within it. Only
// drones whose part ends or begins are reassigned, by optimal assignment. live(base, index, t, out) moves a drone
// around its resting place and sets its light; out = [x, y, z, alpha]. Transitions follow the client's Vercel
// prototype: staggered starts, drones joining fly in from outside like shooting stars, drones leaving fly out.
// The render loop stops when nothing moves; paused or reduced motion shows a beat at rest.
import { assign, flightTime, along, ease } from "./show-flight.js";

const MAX = 1000;
const hash = (x) => { const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
/** Outside place of drone i (display units): where drones join from and leave to, dark when idle. */
const outside = (i, out) => {
  const a = hash(i) * Math.PI * 2, r = 1.2 + 0.2 * hash(i + 0.5);
  out[0] = Math.cos(a) * r * 1.1; out[1] = Math.sin(a) * r * 0.75; out[2] = (hash(i + 0.25) - 0.5) * 0.8; return out;
};

export function createField(canvas, { onBeat } = {}) {
  const ctx = canvas.getContext("2d");
  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const pos = new Float64Array(MAX * 3), col = new Float32Array(MAX * 3), alpha = new Float32Array(MAX), vel = new Float64Array(MAX * 3);
  const from = new Float64Array(MAX * 3), fromCol = new Float32Array(MAX * 3), fromAlpha = new Float32Array(MAX), fromVel = new Float64Array(MAX * 3);
  const delay = new Float32Array(MAX), prev = new Float64Array(MAX * 3), flowOf = new Float32Array(MAX);
  const groupOf = new Array(MAX).fill(""), localOf = new Int32Array(MAX);
  const spot = [0, 0, 0], out = [0, 0, 0], live = [0, 0, 0, 1], rest = [0, 0, 0, 1];
  for (let i = 0; i < MAX; i++) { outside(i, spot); pos.set(spot, i * 3); col.set([246, 241, 232], i * 3); }
  let W = 0, H = 0, DPR = 1, frame = 0, visible = true, lastT = 0;
  let scene = null, beat = 0, beatAt = 0, flight = 0, spread = 0, order = null, active = 0, leaveEnd = 0, size = 1, fitK = 1, fitX = 0, fitY = 0;
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
  const groupsOf = (b) => b.groups ?? [{ name: "*", count: b.pts.length }];

  /** Where drone i of the current beat rests at time t (live motion and shimmer included), display units → rest. */
  function restAt(i, t) {
    const b = scene.beats[beat], j = order[i], p = b.pts[j];
    let x = p[0], y = p[1], z = p[2] || 0, a = 1;
    if (b.live) { live[0] = x; live[1] = y; live[2] = z; live[3] = 1; b.live(p, j, t - beatAt - flight - spread, live); x = live[0]; y = live[1]; z = live[2]; a = live[3]; }
    rest[0] = (x - fitX) * fitK * size; rest[1] = (y - fitY) * fitK * size; rest[2] = z * fitK * size;
    // shimmer: a soft band of light travels diagonally across the picture
    if (b.shimmer) { const c = -1.6 + 3.2 * (((t / 3.6) % 1) + 1) % 1, d = rest[0] + rest[1] * 0.45 - c; a *= 1 + 0.45 * Math.exp(-((d / 0.24) ** 2)); }
    rest[3] = a;
    return rest;
  }

  /** Assigns the drones of the new beat to its places, keeping every drone in its group where the group continues. */
  function assignPlaces(b, n, target) {
    order = new Int32Array(n).fill(-1);
    const taken = new Uint8Array(n);
    let start = 0;
    for (const g of groupsOf(b)) {
      const drones = [];
      for (let i = 0; i < n; i++) if (groupOf[i] === g.name && order[i] < 0) drones.push(i);
      const sameShape = g.rigid && drones.length === g.count && drones.every((i) => localOf[i] < g.count) && new Set(drones.map((i) => localOf[i])).size === g.count;
      if (sameShape) for (const i of drones) { order[i] = start + localOf[i]; taken[start + localOf[i]] = 1; }
      else if (drones.length && g.count) {
        const slots = Array.from({ length: g.count }, (_, k) => start + k);
        const pick = (list, src) => Float64Array.from(list.flatMap((k) => [src[k * 3], src[k * 3 + 1], src[k * 3 + 2]]));
        if (drones.length <= slots.length) { const m = assign(pick(drones, pos), pick(slots, target)); drones.forEach((i, r) => { order[i] = slots[m[r]]; taken[slots[m[r]]] = 1; }); }
        else { const m = assign(pick(slots, target), pick(drones, pos)); slots.forEach((s, r) => { order[drones[m[r]]] = s; taken[s] = 1; }); }
      }
      start += g.count;
    }
    // everything else: drones whose part ended, drones joining, places of parts that begin
    const freeDrones = [], freeSlots = [];
    for (let i = 0; i < n; i++) { if (order[i] < 0) freeDrones.push(i); if (!taken[i]) freeSlots.push(i); }
    if (freeDrones.length) {
      const pick = (list, src) => Float64Array.from(list.flatMap((k) => [src[k * 3], src[k * 3 + 1], src[k * 3 + 2]]));
      const m = assign(pick(freeDrones, pos), pick(freeSlots, target));
      freeDrones.forEach((i, r) => { order[i] = freeSlots[m[r]]; });
    }
    // remember each drone's part for the next beat
    start = 0;
    const owner = new Array(n), local = new Int32Array(n);
    for (const g of groupsOf(b)) { for (let k = 0; k < g.count; k++) { owner[start + k] = g; local[start + k] = k; } start += g.count; }
    for (let i = 0; i < n; i++) { const g = owner[order[i]]; groupOf[i] = g.name; localOf[i] = local[order[i]]; flowOf[i] = g.rigid ? 0 : 1; }
  }

  function startBeat(k, t) {
    // bring every drone to where it is now: time may have passed since the last frame (slow device, async build)
    if (lastT && t > lastT) { for (let q = 0; q < MAX * 3; q++) pos[q] += vel[q] * (t - lastT); lastT = t; }
    beat = k; beatAt = t;
    const b = scene.beats[k], n = b.pts.length, target = new Float64Array(n * 3);
    for (let j = 0; j < n; j++) { const p = b.pts[j]; target[j * 3] = (p[0] - fitX) * fitK * size; target[j * 3 + 1] = (p[1] - fitY) * fitK * size; target[j * 3 + 2] = (p[2] || 0) * fitK * size; }
    // drones joining come from outside (dark there); every drone beyond this beat that is still lit flies out
    for (let i = active; i < n; i++) if (alpha[i] < 0.02) { outside(i, spot); pos.set(spot, i * 3); vel.fill(0, i * 3, i * 3 + 3); groupOf[i] = ""; }
    leaveEnd = n;
    for (let i = n; i < MAX; i++) if (alpha[i] > 0.01) leaveEnd = i + 1;
    active = n;
    assignPlaces(b, n, target);
    from.set(pos); fromCol.set(col); fromAlpha.set(alpha); fromVel.set(vel);
    // flight time from the longest path, the starts staggered for drones that do not belong to a rigid part
    const ordered = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) { const j = order[i]; ordered[i * 3] = target[j * 3]; ordered[i * 3 + 1] = target[j * 3 + 1]; ordered[i * 3 + 2] = target[j * 3 + 2]; }
    let longest = flightTime(from.subarray(0, n * 3), ordered, Int32Array.from({ length: n }, (_, i) => i));
    let back = 0;
    for (let i = n; i < leaveEnd; i++) { outside(i, spot); back = Math.max(back, Math.hypot(from[i * 3] - spot[0], from[i * 3 + 1] - spot[1], from[i * 3 + 2] - spot[2])); }
    if (back) longest = Math.max(longest, flightTime(Float64Array.of(0, 0, 0), Float64Array.of(back, 0, 0), [0]));
    flight = held() ? 0 : Math.max(longest, b.minFlight || 0);
    spread = held() ? 0 : Math.min(0.5, flight * 0.25);
    // staggered starts only for drones that really travel; a drone that stays put has nothing to wait for
    for (let i = 0; i < leaveEnd; i++) { const j = order[i] ?? 0, d = i < n ? Math.hypot(from[i * 3] - target[j * 3], from[i * 3 + 1] - target[j * 3 + 1], from[i * 3 + 2] - target[j * 3 + 2]) : 0; delay[i] = flowOf[i] && i < n ? hash(i * 1.37 + k * 7.1) * spread * Math.min(1, d / 0.3) : 0; }
    canvas.dataset.points = String(n); canvas.dataset.beat = String(k);
    onBeat?.(k, b, scene.beats.length);
    if (held()) settle(t, k);
  }

  /** Shows beat k formed and at rest (paused, reduced motion, first view). */
  function settle(t, k = scene.beats.length - 1) {
    beat = k;
    const b = scene.beats[k], n = b.pts.length;
    order = Int32Array.from({ length: n }, (_, i) => i); active = n;
    let start = 0;
    for (const g of groupsOf(b)) { for (let q = 0; q < g.count; q++) { groupOf[start + q] = g.name; localOf[start + q] = q; flowOf[start + q] = g.rigid ? 0 : 1; } start += g.count; }
    flight = 0; spread = 0; beatAt = t - 2.5; // live motion shown at a calm, fully formed moment
    for (let i = 0; i < n; i++) { const r = restAt(i, t); pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1]; pos[i * 3 + 2] = r[2]; alpha[i] = r[3]; col.set(b.pts[i].slice(3, 6), i * 3); }
    for (let i = n; i < MAX; i++) { outside(i, spot); pos.set(spot, i * 3); alpha[i] = 0; }
    vel.fill(0); leaveEnd = n;
    canvas.dataset.beat = String(k); canvas.dataset.points = String(n); onBeat?.(k, b, scene.beats.length);
  }

  /** Shows a scene at a size factor (1 = fills the stage); instant: already formed (first view of the page). */
  function show(next, droneCount, sizeFactor = 1, { instant = false } = {}) {
    scene = next; size = sizeFactor; fit(scene.beats);
    groupOf.fill(""); // a new scene: every drone is free to take any place
    if (instant || held()) settle(now()); else startBeat(0, now());
    render(); sync();
  }
  /** Jumps to act k of the current scene (back/forward buttons). */
  function goto(k) {
    if (!scene) return;
    const target = Math.max(0, Math.min(scene.beats.length - 1, k));
    if (held()) { settle(now(), target); render(); } else { startBeat(target, now()); sync(); }
  }

  /** Advances the simulation; returns whether anything still moves. */
  function step(t) {
    prev.set(pos);
    const b = scene.beats[beat], elapsed = t - beatAt;
    for (let i = 0; i < active; i++) {
      const r = restAt(i, t), k = i * 3, c = b.pts[order[i]];
      const u = flight ? Math.min(1, Math.max(0, (elapsed - delay[i]) / flight)) : 1;
      if (u < 1) {
        // a flight continues the drone's current velocity from the moment the beat starts, also while it waits for
        // its staggered start (Hermite term over its whole window, gone at arrival)
        const span = flight + delay[i], w = Math.min(1, elapsed / span), carry = span * (w - 2 * w * w + w * w * w), e = ease(u), arc = Math.sin(Math.PI * u) ** 2;
        let fx = from[k], fy = from[k + 1];
        if (b.swirl) { const a0 = -b.swirl; fx = from[k] * Math.cos(a0) - from[k + 1] * Math.sin(a0); fy = from[k] * Math.sin(a0) + from[k + 1] * Math.cos(a0); }
        along(fx, fy, from[k + 2], r[0], r[1], r[2], u, t, out, flowOf[i]);
        let x = out[0], y = out[1];
        if (b.swirl) { const sw = b.swirl * (1 - e), cs = Math.cos(sw), sn = Math.sin(sw), x0 = x; x = x0 * cs - y * sn; y = x0 * sn + y * cs; }
        if (b.lift) { const moved = Math.min(1, Math.hypot(r[0] - fx, r[1] - fy) / 0.3); x += b.lift[0] * arc * size * moved; y += b.lift[1] * arc * size * moved; } // only what flies far arcs
        pos[k] = x + fromVel[k] * carry; pos[k + 1] = y + fromVel[k + 1] * carry; pos[k + 2] = out[2] + fromVel[k + 2] * carry;
        const f = Math.min(1, u * 1.4);
        for (let q = 0; q < 3; q++) col[k + q] = fromCol[k + q] + (c[3 + q] - fromCol[k + q]) * f;
        alpha[i] = fromAlpha[i] + (r[3] - fromAlpha[i]) * Math.min(1, u * 2.5); // joining drones light up as they fly in
      } else { pos[k] = r[0]; pos[k + 1] = r[1]; pos[k + 2] = r[2]; alpha[i] = r[3]; col[k] = c[3]; col[k + 1] = c[4]; col[k + 2] = c[5]; }
    }
    // drones no longer needed fly out of the picture and switch off
    for (let i = active; i < leaveEnd; i++) {
      const k = i * 3, u = flight ? Math.min(1, elapsed / flight) : 1, carry = flight * (u - 2 * u * u + u * u * u); outside(i, spot);
      along(from[k], from[k + 1], from[k + 2], spot[0], spot[1], spot[2], u, t, out);
      pos[k] = out[0] + fromVel[k] * carry; pos[k + 1] = out[1] + fromVel[k + 1] * carry; pos[k + 2] = out[2] + fromVel[k + 2] * carry; alpha[i] = Math.max(0, fromAlpha[i] * (1 - u * 1.6));
    }
    const arrived = elapsed >= flight + spread;
    if (arrived) leaveEnd = active;
    const dt = lastT ? t - lastT : 0; lastT = t;
    if (dt > 0) for (let k = 0; k < MAX * 3; k++) vel[k] = (pos[k] - prev[k]) / dt;
    if (arrived && elapsed - flight - spread >= (b.hold ?? 2.2)) {
      if (beat < scene.beats.length - 1) startBeat(beat + 1, t);
      else if (scene.loopTo !== undefined) startBeat(scene.loopTo, t);
    }
    return !arrived || beat < scene.beats.length - 1 || scene.loopTo !== undefined || Boolean(b.live) || Boolean(b.shimmer);
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
      // depth shading: drones further back are dimmer, which makes volumes read as volumes
      const depth = Math.max(0, Math.min(1, (Z / (size * fitK || 1) + 0.6) / 1.2));
      list.push([ox + pos[k] * S * pr, oy - Y * S * pr, Z, pr, alpha[i] * (0.78 + 0.22 * depth), col[k] | 0, col[k + 1] | 0, col[k + 2] | 0]);
    }
    canvas.dataset.lit = String(list.length); // drones lit right now, read by the tests
    list.sort((a, b) => a[2] - b[2]);
    const core = Math.max(1.2 * DPR, S * 0.0085);
    ctx.globalCompositeOperation = "lighter";
    // light above 1 (shimmer, sparkle) makes a drone brighter: larger glow, whiter core
    for (const [px, py, , pr, a, r, g, b] of list) { const R = core * pr * 3.2 * (1 + Math.max(0, a - 1) * 0.8); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite(r, g, b), px - R, py - R, R * 2, R * 2); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    for (const [px, py, , pr, a, r, g, b] of list) { const w = Math.min(1, Math.max(0, a - 1) * 1.6), lift = (c) => Math.min(255, c + 30 + (225 - c) * w) | 0; ctx.fillStyle = `rgba(${lift(r)},${lift(g)},${lift(b)},${Math.min(1, a).toFixed(2)})`; ctx.beginPath(); ctx.arc(px, py, core * pr, 0, 7); ctx.fill(); }
  }

  function loop(ms) {
    frame = 0;
    if (!visible || held() || !scene) return;
    const t = ms / 1000, busy = step(t);
    render();
    // physics test hook: positions of every drone in the air, in display units
    if (window.__showTrace) window.__showTrace.push([t, Array.from(pos.subarray(0, Math.max(active, leaveEnd) * 3)), beat, active, leaveEnd]);
    if (busy) frame = requestAnimationFrame(loop);
    else canvas.dataset.running = "false"; // nothing moves: no more frames until the next change
  }
  function sync() {
    if (visible && !held()) { if (!frame && scene) { canvas.dataset.running = "true"; lastT = 0; frame = requestAnimationFrame(loop); } }
    else { if (frame) cancelAnimationFrame(frame); frame = 0; canvas.dataset.running = "false"; if (scene) { settle(now(), beat); render(); } }
  }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  document.addEventListener("flyingstars:motion-change", sync);
  document.addEventListener("visibilitychange", sync);
  reduceQuery.addEventListener("change", sync);
  resize();
  return { show, replay: () => goto(0), goto, beat: () => beat };
}
