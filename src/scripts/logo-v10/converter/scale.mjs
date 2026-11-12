// Step 5 (idea 4): from the fine reference build, predict for every piece of reference curve the coarsest
// spacing at which it is still represented, then pick the coarsest spacing that keeps the weighted share
// of represented structure above the threshold. Monotone in s, one build needed.
import { holeKey, centroid, climbDepth } from './fidelity.mjs';
import { INSET, ROW_SEP } from './network.mjs';

export const MERGE = 1.2;       // rows closer than MERGE*s merge (same constant as the conflict pass)
export const LOOP_MIN = 2.4;    // a closed loop shorter than LOOP_MIN*s collapses to a dot
export const TURN_WIN = 3;      // sustained curvature: net turning over TURN_WIN*s of curve ...
export const TURN_LIM = 1.5;    // ... must stay below this (rad); a circle keeps >= ~10 dots
export const SAG = 0.004;       // chord sag between neighbouring dots on a curve <= SAG * logo diagonal
export const RES = 5;           // a part that is more than a single stroke needs >= RES rows across its smaller side

function localIn(F, x, y) {
  const lx = Math.floor(x) - F.x0, ly = Math.floor(y) - F.y0;
  return lx >= 0 && ly >= 0 && lx < F.w && ly < F.h && F.mask[ly * F.w + lx] === 1;
}

export function analyseReference(ctx, build) {
  // chains in surviving points, deduplicated
  const chains = [];
  const nodeDeg = new Map();
  for (const c of build.chainsRaw) {
    const pts = [];
    for (const o of c) { const t = o.to; if (!pts.length || pts[pts.length - 1] !== t) pts.push(t); }
    const closed = c.closed;
    const ends = closed ? [] : [c[0], c[c.length - 1]].filter(o => o.kind === 'node');
    for (const e of ends) nodeDeg.set(e, (nodeDeg.get(e) || 0) + 1);
    chains.push({ pts, closed, fi: c.fi, ends, raw: c });
  }
  const samples = [];
  chains.forEach((ch, ci) => {
    const P = ch.pts.map(o => [o.x, o.y]);
    if (ch.closed && P.length > 1 && P[0] !== P[P.length - 1]) P.push(P[0]);
    let L = 0;
    const cum = [0];
    for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(L); }
    ch.L = L;
    const F = ctx.figs[ch.fi];
    ch.hole = ch.closed && P.length > 3 ? holeKey(ctx, F, centroid(P)) : null;
    ch.terminal = !ch.closed && ch.ends.length === 2 && ((nodeDeg.get(ch.ends[0]) === 1) !== (nodeDeg.get(ch.ends[1]) === 1));
    // samples every ~2px with unwrapped tangent angle
    const m = Math.max(1, Math.round(L / 2));
    const first = samples.length;
    let prevAng = null, unwrap = 0;
    for (let k = 0; k <= (ch.closed ? m - 1 : m); k++) {
      const t = L * k / m;
      let j = 0; while (j < cum.length - 2 && cum[j + 1] < t) j++;
      const seg = cum[j + 1] - cum[j] || 1, u = Math.max(0, Math.min(1, (t - cum[j]) / seg));
      const a = P[j] || P[0], b = P[j + 1] || a;
      const x = a[0] + u * (b[0] - a[0]), y = a[1] + u * (b[1] - a[1]);
      let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (prevAng !== null) { let d = ang - prevAng; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; unwrap += d; }
      prevAng = ang;
      const [d0, hw] = climbDepth(F, x, y);
      samples.push({ x, y, ci, arc: t, theta: unwrap, w: F.weight ?? 1, fi: ch.fi, d0, hw });
    }
    ch.first = first; ch.count = samples.length - first;
  });
  // clearance: distance to the nearest sample of another stretch of structure across a gap
  const cell = 8;
  const grid = new Map();
  samples.forEach((q, i) => { const k = Math.floor(q.x / cell) + ',' + Math.floor(q.y / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const [lx0, ly0, lx1, ly1] = ctx.st.logoBox;
  const rMax = 0.15 * Math.max(lx1 - lx0, ly1 - ly0); // clearances beyond this never bind
  for (const p of samples) {
    const cp = chains[p.ci];
    let best = Infinity;
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    for (let R = 0; R * cell <= Math.min(best, rMax) + cell; R++) {
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== R) continue;
        const L = grid.get((cx + dx) + ',' + (cy + dy));
        if (!L) continue;
        for (const j of L) {
          const q = samples[j];
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d >= best) continue;
          if (d < 1.5) continue; // the same route shared by two chains (a merged boundary), not a second row
          if (q.ci === p.ci) {
            let da = Math.abs(q.arc - p.arc);
            if (cp.closed) da = Math.min(da, cp.L - da);
            if (da <= 2 * d + 3) continue;
          } else {
            // chains meeting at a node: neighbours near the node are connected, not separate
            const cq = chains[q.ci];
            let joined = false;
            for (const n of cp.ends) if (cq.ends.includes(n) && Math.hypot(p.x - n.to.x, p.y - n.to.y) < 2 * d + 3 && Math.hypot(q.x - n.to.x, q.y - n.to.y) < 2 * d + 3) joined = true;
            if (joined) continue;
          }
          // facing each other across ink (two sides of one stroke, or a colour boundary): not a gap
          const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
          if (localIn(ctx.figs[p.fi], mx, my) || localIn(ctx.figs[q.fi], mx, my)) continue;
          best = d; p.partner = j;
        }
      }
    }
    p.clear = Math.min(best, rMax * 4);
  }
  const tot = samples.reduce((a, b) => a + b.w, 0);
  return { chains, samples, tot, figs: ctx.figs, diag: Math.hypot(lx1 - lx0, ly1 - ly0) };
}

// sustained turning around sample p: the smaller of the turnings over the half windows before and after it
// (a single corner turns on one side only and is anchored by a dot anyway)
function sustained(A, p, win) {
  const ch = A.chains[p.ci];
  const S = A.samples, a0 = ch.first, n = ch.count;
  if (!ch.closed && ch.L < win * 0.6) return 0;
  const at = arc => {
    if (ch.closed) arc = ((arc % ch.L) + ch.L) % ch.L; else arc = Math.max(0, Math.min(ch.L, arc));
    const k = Math.min(n - 1, Math.max(0, Math.round(arc / (ch.L || 1) * (ch.closed ? n : n - 1))));
    return S[a0 + (ch.closed ? k % n : k)];
  };
  const turnOver = (from, to) => {
    let t = 0, prev = null;
    const steps = Math.max(2, Math.round((to - from) / 2));
    for (let k = 0; k <= steps; k++) {
      const q = at(from + (to - from) * k / steps);
      if (prev) { let d = q.theta - prev.theta; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) < Math.PI / 2) t += d; }
      prev = q;
    }
    return Math.abs(t);
  };
  const half = win / 2;
  return Math.min(turnOver(p.arc - half, p.arc), turnOver(p.arc, p.arc + half));
}

const depthAt = (hw, s) => (hw > (INSET + 0.5 * ROW_SEP) * s ? INSET * s : hw);

export function predictedFidelity(A, s, active = null) {
  let cov = 0, tot = 0;
  for (const p of A.samples) {
    if (active && !active.has(p.fi)) continue;
    tot += p.w;
    if (covered(A, p, s)) cov += p.w;
  }
  return tot ? cov / tot : 1;
}

// is reference sample p still represented at spacing s?
export function covered(A, p, s) {
  {
    const ch = A.chains[p.ci];
    // rows facing each other across a gap move apart as they sit deeper in their ink at coarser s
    let clear = p.clear;
    if (p.partner !== undefined) { const q = A.samples[p.partner]; clear += Math.max(0, depthAt(p.hw, s) - p.d0) + Math.max(0, depthAt(q.hw, s) - q.d0); }
    if (clear < MERGE * s) return false;                             // merges with a neighbour row
    if (ch.closed && ch.hole && ch.L < LOOP_MIN * s) return false;    // counter collapses
    if (ch.terminal && ch.L < s) return false;                        // short terminal pruned
    const F = A.figs[p.fi];
    if (!F.simplePart && F.partMin < RES * s && !(F.part && F.part.kind === 'text')) return false; // part too small to read at this spacing (glyphs: topology test, verify.mjs)
    // curve under-sampled: too few dots per turn, or chords visibly cutting the curve
    {
      const t = 2 * sustained(A, p, TURN_WIN * s);       // sustained turning over the window
      if (t > 1e-3) {
        const R = TURN_WIN * s / t;
        // where the stroke becomes a centreline, a tight turn of its outline is just the stroke's end cap
        const cap = p.hw <= (INSET + 0.5 * ROW_SEP) * s && R < 1.5 * p.hw;
        if (!cap && (t > TURN_LIM || s * s / (8 * R) > SAG * A.diag)) return false;
      }
    }
    return true;
  }
}

// v4 (point 4b): for every reference sample the index of the first spacing on the ladder at which it is no
// longer represented (binary search, the conditions are monotone in s up to noise). Ladder: s_k = s0 * 1.05^k.
export function coverLadder(A, s0, sMax, quality) {
  const ladder = [];
  for (let t = s0; t <= sMax * 1.0001; t *= 1.05) ladder.push(t);
  const K = ladder.length;
  const fail = new Int32Array(A.samples.length);
  A.samples.forEach((p, i) => {
    let lo = 0, hi = K; // covered at lo (assumed for k = 0), first failure in (lo, hi]
    if (covered(A, p, ladder[K - 1] * quality)) { fail[i] = K; return; }
    hi = K - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (covered(A, p, ladder[m] * quality)) lo = m; else hi = m; }
    fail[i] = hi;
    // a small closed outline around solid ink becomes a single dot (sample.mjs) soon after it stops being a clean
    // ring: a compact blob (the squares of Telekom, the dot of an i) is cheap at every spacing
    const ch = A.chains[p.ci];
    if (ch.closed && !ch.hole && ch.L / 2.4 <= ladder[Math.min(K - 1, hi + 8)] * quality) fail[i] = K;
  });
  return { ladder, fail };
}
