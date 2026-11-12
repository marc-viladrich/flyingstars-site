// Step 4: polylines -> evenly spaced points with anchors at corners, ends and junctions; conflict pass.
const hyp = Math.hypot;

function smooth(pts, closed, iters = 3) {
  let p = pts.map(q => q.slice());
  const n = p.length;
  if (n < 3) return p;
  for (let it = 0; it < iters; it++) {
    const q = p.map(v => v.slice());
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) continue;
      const a = p[closed ? (i - 1 + n) % n : i - 1], b = p[closed ? (i + 1) % n : i + 1];
      q[i][0] = 0.25 * a[0] + 0.5 * p[i][0] + 0.25 * b[0];
      q[i][1] = 0.25 * a[1] + 0.5 * p[i][1] + 0.25 * b[1];
    }
    p = q;
  }
  return p;
}

// resample polyline at ~1px; returns {p:[[x,y]], L}
function resample(pts, closed, step = 1) {
  const P = closed ? pts.concat([pts[0]]) : pts;
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[cum.length - 1];
  const n = Math.max(1, Math.round(L / step));
  const out = [];
  let j = 0;
  const last = closed ? n - 1 : n;
  for (let k = 0; k <= last; k++) {
    const t = (k / n) * L;
    while (j < P.length - 2 && cum[j + 1] < t) j++;
    const seg = cum[j + 1] - cum[j] || 1;
    const u = Math.max(0, Math.min(1, (t - cum[j]) / seg));
    out.push([P[j][0] + u * (P[j + 1][0] - P[j][0]), P[j][1] + u * (P[j + 1][1] - P[j][1])]);
  }
  return { p: out, L, ds: L / n };
}

function lineIntersect(p1, p2, p3, p4) {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  if (Math.abs(d) < 1e-9) return null;
  const a = p1[0] * p2[1] - p1[1] * p2[0], b = p3[0] * p4[1] - p3[1] * p4[0];
  return [(a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d, (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d];
}

const CORNER_DEG = 42;
const GAP_MAX = 1.2;
export const TURN_MAX = 0.5; // max turning (rad) at a regular dot before the curve counts as under-sampled
const turn = (a, b, c) => { const v1x = b[0] - a[0], v1y = b[1] - a[1], v2x = c[0] - b[0], v2y = c[1] - b[1]; const l = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y); if (l < 1e-9) return 0; return Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / l))); };

function findCorners(p, closed, r, s) {
  const n = p.length;
  const ang = new Float32Array(n);
  const at = i => p[closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n; i++) {
    if (!closed && (i < r || i > n - 1 - r)) continue;
    const a = at(i - r), b = at(i), c = at(i + r);
    const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = hyp(...v1), l2 = hyp(...v2);
    if (l1 < 0.5 * r || l2 < 0.5 * r) continue;
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
    ang[i] = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
  }
  // v5 (P2): a corner persists at twice the window; the wobble of a pixel skeleton along a straight stroke does not
  const ang2 = i => {
    const R = 2 * r; if (!closed && (i < R || i > n - 1 - R)) return 180;
    const a = at(i - R), b = at(i), c = at(i + R);
    const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]], l1 = hyp(...v1), l2 = hyp(...v2);
    if (l1 < 0.5 * R || l2 < 0.5 * R) return 180;
    return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)))) * 180 / Math.PI;
  };
  const cand = [];
  for (let i = 0; i < n; i++) {
    if (ang[i] < CORNER_DEG) continue;
    if (ang2(i) < 0.7 * CORNER_DEG) continue;
    let isMax = true;
    for (let k = -r; k <= r && isMax; k++) {
      if (!k) continue;
      let j = i + k;
      if (closed) j = ((j % n) + n) % n; else if (j < 0 || j >= n) continue;
      if (ang[j] > ang[i] || (ang[j] === ang[i] && j < i)) isMax = false;
    }
    if (isMax) cand.push(i);
  }
  // refine position: intersection of the two tangent lines
  const half = Math.max(1, r >> 1);
  return cand.map(i => {
    let pos = p[i];
    const X = lineIntersect(at(i - r - half), at(i - half), at(i + half), at(i + r + half));
    if (X && hyp(X[0] - pos[0], X[1] - pos[1]) < 0.6 * r) pos = X;
    return { i, pos, ang: ang[i] };
  });
}

// Class B: straight-corner-straight. Douglas-Peucker at a fine tolerance, then clusters of short sides between
// two long straight sides form one corner (a rounded corner of a polygon). A corner is kept when the turn
// between the two straight sides is >= POLY_DEG; its dot goes onto the intersection of the two side lines.
const POLY_DEG = 30;
function dp(p, a, b, eps, out) {
  const A = p[a], B = p[b];
  const L = hyp(B[0] - A[0], B[1] - A[1]) || 1e-9;
  let mx = -1, mi = -1;
  for (let i = a + 1; i < b; i++) {
    const d = Math.abs((B[0] - A[0]) * (A[1] - p[i][1]) - (A[0] - p[i][0]) * (B[1] - A[1])) / L;
    if (d > mx) { mx = d; mi = i; }
  }
  if (mx > eps) { dp(p, a, mi, eps, out); out.push(mi); dp(p, mi, b, eps, out); }
}
function lineFit(p, a, b) {
  // total least squares line through p[a..b]: centre + direction
  let cx = 0, cy = 0, n = 0;
  for (let i = a; i <= b; i++) { cx += p[i][0]; cy += p[i][1]; n++; }
  cx /= n; cy /= n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = a; i <= b; i++) { const dx = p[i][0] - cx, dy = p[i][1] - cy; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { c: [cx, cy], d: [Math.cos(th), Math.sin(th)] };
}
export function polygonCorners(p, closed, s) {
  const n = p.length;
  if (n < 8) return [];
  const eps = Math.max(0.9, 0.06 * s);
  // work on an unrolled copy for closed curves, starting at the point farthest from p[0]
  let q = p, off = 0;
  const V = [0];
  if (closed) {
    // start at the point of sharpest turn (a corner, if there is one), split once at the farthest point
    let best = 0, bt = -1;
    const r = Math.max(2, Math.round(0.3 * s));
    for (let i = 0; i < n; i++) { const t = turn(p[(((i - r) % n) + n) % n], p[i], p[(i + r) % n]); if (t > bt) { bt = t; best = i; } }
    off = best;
    q = [];
    for (let i = 0; i <= n; i++) q.push(p[(i + off) % n]);
    let far = 0, fd = -1;
    for (let i = 0; i < n; i++) { const d = hyp(q[i][0] - q[0][0], q[i][1] - q[0][1]); if (d > fd) { fd = d; far = i; } }
    dp(q, 0, far, eps, V); V.push(far); dp(q, far, n, eps, V);
  } else dp(q, 0, n - 1, eps, V);
  const m = q.length;
  V.push(m - 1);
  V.sort((a, b) => a - b);
  const minSide = Math.max(1.5 * s, 6); // shorter pieces (a rounded corner split by DP, a stroke cap) are transitions
  const sides = [];
  for (let k = 0; k + 1 < V.length; k++) {
    const a = V[k], b = V[k + 1], L = hyp(q[b][0] - q[a][0], q[b][1] - q[a][1]);
    if (L < minSide) continue;
    // straight: the middle 80 % stays close to the chord
    const ta = a + Math.floor(0.1 * (b - a)), tb = b - Math.floor(0.1 * (b - a));
    if (straightness(q, ta, tb) > Math.max(0.75, 0.02 * L)) continue;
    sides.push({ a, b, L, fit: lineFit(q, ta, tb) });
  }
  if (closed && sides.length >= 2) {
    // the side through the seam (q[0] = q[m-1]) may have been split in two: join them
    const f = sides[0], l = sides[sides.length - 1];
    if (f.a === 0 && l.b === m - 1) {
      const c = Math.abs(f.fit.d[0] * l.fit.d[0] + f.fit.d[1] * l.fit.d[1]);
      if (c > Math.cos(8 * Math.PI / 180)) { sides.pop(); f.a = l.a - (m - 1); f.L += l.L; }
    }
  }
  const out = [];
  const pairs = closed ? sides.length : sides.length - 1;
  if (sides.length < 2) return out;
  for (let k = 0; k < pairs; k++) {
    const A = sides[k], B = sides[(k + 1) % sides.length];
    let gapA = A.b, gapB = B.a;
    if (closed && k === sides.length - 1) gapB += m - 1;
    const gap = gapB - gapA; // contour length of the transition (rounded corner)
    if (gap < 0 || gap > Math.max(0.9 * s, 0.4 * Math.min(A.L, B.L))) continue;
    let da = A.fit.d, db = B.fit.d;
    // orient directions along the curve
    const va = [q[A.b][0] - q[Math.max(0, A.a)][0], q[A.b][1] - q[Math.max(0, A.a)][1]];
    if (da[0] * va[0] + da[1] * va[1] < 0) da = [-da[0], -da[1]];
    const bb = Math.min(m - 1, B.b), ba = Math.max(0, Math.min(m - 1, B.a));
    const vb = [q[bb][0] - q[ba][0], q[bb][1] - q[ba][1]];
    if (db[0] * vb[0] + db[1] * vb[1] < 0) db = [-db[0], -db[1]];
    const ang = Math.acos(Math.max(-1, Math.min(1, da[0] * db[0] + da[1] * db[1]))) * 180 / Math.PI;
    if (ang < POLY_DEG) continue;
    const mid = Math.round((gapA + gapB) / 2) % (m - 1);
    const apex = q[mid];
    const X = lineIntersect(A.fit.c, [A.fit.c[0] + da[0], A.fit.c[1] + da[1]], B.fit.c, [B.fit.c[0] + db[0], B.fit.c[1] + db[1]]);
    let pos = apex;
    if (X) { const d = hyp(X[0] - apex[0], X[1] - apex[1]); pos = d < 0.45 * s ? X : [apex[0] + (X[0] - apex[0]) * 0.45 * s / d, apex[1] + (X[1] - apex[1]) * 0.45 * s / d]; }
    const i = closed ? (mid + off) % n : mid;
    // bisector pointing into the turn
    let bx = db[0] - da[0], by = db[1] - da[1]; const bl = hyp(bx, by) || 1; bx /= bl; by /= bl;
    out.push({ i, pos, ang, poly: true, side: Math.min(A.L, B.L), sideMax: Math.max(A.L, B.L), bis: [bx, by] });
  }
  return out;
}

function straightness(p, a, b) {
  const A = p[a], B = p[b];
  const L = hyp(B[0] - A[0], B[1] - A[1]);
  if (L < 1e-6) return Infinity;
  let mx = 0;
  for (let i = a; i <= b; i++) {
    const d = Math.abs((B[0] - A[0]) * (A[1] - p[i][1]) - (A[0] - p[i][0]) * (B[1] - A[1])) / L;
    if (d > mx) mx = d;
  }
  return mx;
}

// Sample one figure network. Returns { pts: [{x,y,kind,keys:[...]}], curves: [[x,y]...] (for fidelity) }
// v6.1: opt.along(run) -> the spacing of the dots along that run (density, capped by the clearance to other
// rows; default s); opt.adapt = { G, grade } spaces the dots by the local curvature (adaptive mode). A run is
// the stretch of curve between two anchors (corners, ends, junctions), or a whole closed curve without corners;
// every regular dot carries its run id (`${fi}:e${ei}:r${k}` or `${fi}:e${ei}:ring`).
export function sampleFigure(net, s, fi, sagMax = Infinity, opt = {}) {
  const alongOf = opt.along || (() => s);
  const out = [];
  const curves = [];     // fine polylines (reference use)
  const chains = [];     // ordered point objects along each curve (what the eye links)
  const collapsed = [];
  const stat = { bad: 0, where: [], sagMax, arcBad: 0, turnWell: opt.turnWell ?? TURN_MAX };
  const nodePts = new Map();
  const r = Math.max(2, Math.round(0.5 * s));
  const mk = (q, kind, keys) => { const o = { x: q[0], y: q[1], kind, keys }; out.push(o); return o; };
  // component sizes: union-find over nodes
  const comp = new Map();
  const find = x => { while (comp.get(x) !== x) { comp.set(x, comp.get(comp.get(x))); x = comp.get(x); } return x; };
  const add = x => { if (!comp.has(x)) comp.set(x, x); };
  net.edges.forEach((e, i) => { if (e.closed) { add('e' + i); } else { add('n' + e.a); add('n' + e.b); const a = find('n' + e.a), b = find('n' + e.b); if (a !== b) comp.set(a, b); } });
  const compLen = new Map(), compPts = new Map();
  net.edges.forEach((e, i) => { const c = find(e.closed ? 'e' + i : 'n' + e.a); compLen.set(c, (compLen.get(c) || 0) + e.len); if (!compPts.has(c)) compPts.set(c, []); compPts.get(c).push(...e.pts); });
  const tinyComp = new Set();
  for (const [c, L] of compLen) {
    if (L < 0.7 * s) {
      tinyComp.add(c);
      const P = compPts.get(c);
      let x = 0, y = 0; for (const q of P) { x += q[0]; y += q[1]; }
      const o = mk([x / P.length, y / P.length], 'dot', [`${fi}:c${c}`]);
      chains.push([o]);
      curves.push({ pts: [[o.x, o.y]], closed: false });
    }
  }
  for (const q of net.points) { const o = mk(q, 'dot', [`${fi}:p${q[0]},${q[1]}`]); chains.push([o]); curves.push({ pts: [q], closed: false }); }

  net.edges.forEach((e, ei) => {
    const c = find(e.closed ? 'e' + ei : 'n' + e.a);
    if (tinyComp.has(c)) return;
    const key = `${fi}:e${ei}`;
    const sm = smooth(e.closed ? e.pts.slice(0, -1) : e.pts, e.closed);
    const { p, L } = resample(sm, e.closed, 1);
    curves.push({ pts: p, closed: e.closed, L });
    const n = p.length;
    if (e.closed) {
      if (L < 2.4 * s) { // small closed feature (dot of i, tiny counter): one point
        let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; }
        chains.push([mk([x / n, y / n], 'dot', [key])]);
        collapsed.push([x / n, y / n]);
        return;
      }
      let corners = joinCorners(polygonCorners(p, true, s), findCorners(p, true, r, s), n, true, s);
      if (L < 3.6 * s && corners.length < 3) corners = [];
      if (!corners.length) {
        const run = `${key}:ring`, a = alongOf(run);
        // deterministic phase: start at the topmost (then leftmost) point
        let st = 0; for (let i = 1; i < n; i++) if (p[i][1] < p[st][1] - 1e-6 || (Math.abs(p[i][1] - p[st][1]) < 1e-6 && p[i][0] < p[st][0])) st = i;
        const ring = [];
        if (!opt.adapt) {
          // (v6.1) a closed curve keeps at least 4 dots once it was drawn with 4 or more, whatever the density
          const m = Math.max(3, Math.round(L / a), Math.round(L / s) >= 4 ? (opt.ringMin ?? 4) : 3);
          for (let k = 0; k < m; k++) { const o = mk(p[(st + Math.round(k * n / m)) % n], 'reg', [key]); o.run = run; ring.push(o); }
        } else {
          const ad = { ...opt.adapt, capRun: opt.adapt.cap ? opt.adapt.cap(run) : Infinity };
          const at = adaptivePositions(p, true, a, ad, st);
          const m = Math.max(Math.round(L / s) >= 4 ? (opt.ringMin ?? 4) : 3, at.m);
          const pos = at.m === m ? at.pos : adaptivePositions(p, true, a, ad, st, m).pos;
          for (const q of pos) { const o = mk(q, 'reg', [key]); o.run = run; ring.push(o); }
        }
        const m = ring.length;
        const tr = ring.map((B, k) => { const A = ring[(k - 1 + m) % m], C = ring[(k + 1) % m]; return turn([A.x, A.y], [B.x, B.y], [C.x, C.y]); });
        arcAccount(tr, true, stat);
        for (let k = 0; k < m; k++) { const sus = Math.min(tr[k], Math.max(tr[(k - 1 + m) % m], tr[(k + 1) % m])); if (sus > TURN_MAX || s * sus / 8 > sagMax) { stat.bad++; stat.where.push([ring[k].x, ring[k].y]); } }
        chains.push(ring.concat([ring[0]]));
        return;
      }
      const cs = mergeClose(corners, n, true, s);
      const co = cs.map(c0 => { const o = mk(c0.pos, 'corner', [key]); o.ang = c0.ang; o.poly = c0.poly; o.side = c0.side; return o; });
      const chain = [];
      for (let k = 0; k < cs.length; k++) {
        const A = cs[k], B = cs[(k + 1) % cs.length];
        const bi = B.i > A.i ? B.i : B.i + n;
        chain.push(co[k], ...sampleBetween(p, A, B, A.i, bi, n, true, s, key, mk, stat, `${key}:r${k}`, alongOf, opt.adapt));
      }
      chain.push(co[0]);
      chains.push(chain);
      return;
    }
    // open edge: node anchors + corners
    const ends = [];
    for (const [ni, q] of [[e.a, p[0]], [e.b, p[n - 1]]]) {
      const nk = `${fi}:n${ni}`;
      if (!nodePts.has(nk)) { const o = mk(q, 'node', [nk]); o.nodes = [nk]; nodePts.set(nk, o); }
      nodePts.get(nk).keys.push(key);
      ends.push(nodePts.get(nk));
    }
    const corners = mergeClose(joinCorners(polygonCorners(p, false, s), findCorners(p, false, r, s), n, false, s).filter(c0 => c0.i > 0.5 * s && c0.i < n - 1 - 0.5 * s), n, false, s);
    const nk2 = [`${fi}:n${e.a}`, `${fi}:n${e.b}`];
    const co = corners.map(c0 => { const o = mk(c0.pos, 'corner', [key]); o.nodes = nk2; o.ang = c0.ang; o.poly = c0.poly; o.side = c0.side; return o; });
    const anchors = [{ i: 0, pos: p[0] }, ...corners, { i: n - 1, pos: p[n - 1] }];
    const aObj = [ends[0], ...co, ends[1]];
    const chain = [aObj[0]];
    for (let k = 0; k + 1 < anchors.length; k++) {
      const regs = sampleBetween(p, anchors[k], anchors[k + 1], anchors[k].i, anchors[k + 1].i, n, false, s, key, mk, stat, `${key}:r${k}`, alongOf, opt.adapt);
      for (const o of regs) o.nodes = nk2;
      chain.push(...regs, aObj[k + 1]);
    }
    chains.push(chain);
  });
  return { pts: out, curves, chains, collapsed, bad: stat.bad, badWhere: stat.where, arcBad: stat.arcBad };
}

// polygon corners win over local corners within 0.6 s
function joinCorners(poly, local, n, closed, s) {
  const out = poly.slice();
  for (const c of local) {
    let near = false;
    for (const q of poly) { let g = Math.abs(c.i - q.i); if (closed) g = Math.min(g, n - g); if (g < 0.6 * s) near = true; }
    if (!near) out.push(c);
  }
  return out.sort((a, b) => a.i - b.i);
}

function mergeClose(cs, n, closed, s) {
  cs = cs.slice().sort((a, b) => a.i - b.i);
  let changed = true;
  while (changed && cs.length > 1) {
    changed = false;
    for (let k = 0; k < cs.length; k++) {
      if (!closed && k === cs.length - 1) break;
      const a = cs[k], b = cs[(k + 1) % cs.length];
      let gap = b.i - a.i; if (gap < 0) gap += n;
      if (gap < 0.6 * s) { const drop = (a.poly && !b.poly) || (a.poly === b.poly && a.ang >= b.ang) ? (k + 1) % cs.length : k; cs.splice(drop, 1); changed = true; break; }
    }
  }
  return cs;
}

function sampleBetween(p, A, B, ia, ib, n, closed, s, key, mk, stat, run, alongOf, adapt) {
  const at = i => p[closed ? i % n : i];
  // v5 (P2): the run is the curve between its anchors with the anchors themselves at its ends (a corner dot sits
  // on the intersection of the side lines, a node on the junction, which the pixel curve may not reach)
  const sub = [A.pos]; for (let i = ia + 1; i < ib; i++) sub.push(at(i)); sub.push(B.pos);
  const cum = [0]; for (let i = 1; i < sub.length; i++) cum.push(cum[i - 1] + hyp(sub[i][0] - sub[i - 1][0], sub[i][1] - sub[i - 1][1]));
  const L = cum[cum.length - 1];
  const along = d => { let j = 0; while (j < cum.length - 2 && cum[j + 1] < d) j++; const g = cum[j + 1] - cum[j] || 1, u = Math.max(0, Math.min(1, (d - cum[j]) / g)); return [sub[j][0] + u * (sub[j + 1][0] - sub[j][0]), sub[j][1] + u * (sub[j + 1][1] - sub[j][1])]; };
  const a = alongOf ? alongOf(run) : s;
  const dev = straightness(sub, 0, sub.length - 1);
  // v5 (P2): straight is straight. A run whose curve stays within the wobble of a pixel skeleton (1.2 px, or
  // 0.1 s at coarse spacings) of the chord between its anchors is sampled exactly on that chord
  const straight = dev < Math.max(1.2, 0.1 * s);
  // v5 (P2): a row is never interrupted: no gap between neighbouring dots above GAP_MAX * (the run's spacing)
  let m, ds = null;
  if (adapt && !straight && L > 0) {
    const r = adaptivePositions(sub, false, a, { ...adapt, capRun: adapt.cap ? adapt.cap(run) : Infinity });
    m = r.m; ds = r.u; // arc positions of the inner dots
  } else {
    const aa = adapt ? Math.min(adapt.cap ? adapt.cap(run) : Infinity, adapt.G * a) : a;
    m = Math.max(1, Math.round(L / aa), Math.ceil(L / (GAP_MAX * aa)));
  }
  // a curved run sampled with a single chord: count its sagging as under-sampling
  if (m < 2) { if (!straight && L > 0) { const mid = sub[sub.length >> 1]; if (turn(A.pos, mid, B.pos) > 2 * TURN_MAX) { stat.bad++; stat.where.push(mid); } } return []; }
  const seq = [A.pos], objs = [];
  for (let k = 1; k < m; k++) {
    const t = k / m;
    const q = straight ? [A.pos[0] + t * (B.pos[0] - A.pos[0]), A.pos[1] + t * (B.pos[1] - A.pos[1])] : along(ds ? ds[k - 1] : t * L);
    seq.push(q);
    const o = mk(q, 'reg', [key]); o.run = run;
    objs.push(o);
  }
  seq.push(B.pos);
  if (!straight) {
    // only sustained curvature counts (a single sharp bend reads as a corner)
    const tr = seq.map((q, k) => (k === 0 || k === seq.length - 1) ? 0 : turn(seq[k - 1], q, seq[k + 1]));
    arcAccount(tr.slice(1, -1), false, stat);
    for (let k = 1; k < seq.length - 1; k++) {
      const sus = Math.min(tr[k], Math.max(tr[k - 1], tr[k + 1]));
      objs[k - 1].sus = sus;
      if (sus > TURN_MAX || s * sus / 8 > stat.sagMax) { stat.bad++; stat.where.push(seq[k]); }
    }
  }
  return objs;
}

// v6.1 (step b, curves): a long arc drawn with too few dots reads as a polygon. Runs of consecutive dots that
// each turn by more than turnWell, together turning by at least ARC_MIN (about 115 degrees: a bowl, an arch, a
// ring; not a rounded corner, which reads as a corner anyway), count as under-sampled (stat.arcBad, in dots).
export const ARC_MIN = 2.0;
function arcAccount(tr, closed, stat) {
  const n = tr.length, th = stat.turnWell;
  if (!n) return;
  const hot = tr.map(t => t > th);
  if (closed && hot.every(Boolean)) { let S = 0; for (const t of tr) S += t; if (S >= ARC_MIN) stat.arcBad += n; return; }
  // (a closed curve is unrolled at a cold dot)
  const st = closed ? Math.max(0, hot.indexOf(false)) : 0;
  let len = 0, sum = 0;
  for (let k = 0; k <= n; k++) {
    const i = (st + k) % n;
    if (k < n && hot[i]) { len++; sum += tr[i]; continue; }
    if (len && sum >= ARC_MIN) stat.arcBad += len;
    len = 0; sum = 0;
    if (!closed && k === n) break;
  }
}

// v6.1 (opts.adaptive): dot positions along a polyline with a spacing that follows the curvature. The local turn
// per dot at the base spacing a decides the spacing: straight (under ADAPT_T0 rad per dot) G * a, curved (over
// ADAPT_T1) a, linear in between; the spacing then changes along the row by at most `grade` per unit of arc
// (a sparse straight meeting a dense curve is graded, not switched), and never exceeds adapt.cap(run) (the
// clearance to other rows). Returns { m: number of intervals, u: arc positions of the m - 1 inner dots } for an
// open run (ends fixed), or { m, pos } for a closed curve starting at index st (m forced when given).
export const ADAPT_T0 = 0.06, ADAPT_T1 = 0.22;
export function adaptivePositions(pts, closed, a, adapt, st = 0, mForce = null) {
  const P = closed ? pts.concat([pts[0]]) : pts;
  const N = P.length;
  const cum = [0]; for (let i = 1; i < N; i++) cum.push(cum[i - 1] + hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[N - 1];
  // heading by central differences over about a quarter spacing, unwrapped
  const h = Math.max(1, Math.round(0.25 * a));
  const idx = i => closed ? ((i % (N - 1)) + (N - 1)) % (N - 1) : Math.max(0, Math.min(N - 1, i));
  const th = new Float64Array(N);
  for (let i = 0; i < N; i++) { const q = P[idx(i + h)], r = P[idx(i - h)]; th[i] = Math.atan2(q[1] - r[1], q[0] - r[0]); }
  for (let i = 1; i < N; i++) { let d = th[i] - th[i - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; th[i] = th[i - 1] + d; }
  // turn over one spacing of arc, centred
  const sig = new Float64Array(N), G = adapt.G, cap = adapt.capRun ?? Infinity;
  const w = Math.max(1, Math.round(0.5 * a));
  for (let i = 0; i < N; i++) {
    let i0 = i - w, i1 = i + w, t0, t1, l;
    if (closed) { t0 = th[idx(i0)] + (i0 < 0 ? -(th[N - 1] - th[0]) : 0); t1 = th[idx(i1)] + (i1 > N - 1 ? (th[N - 1] - th[0]) : 0); l = 2 * w; }
    else { i0 = Math.max(0, i0); i1 = Math.min(N - 1, i1); t0 = th[i0]; t1 = th[i1]; l = Math.max(1, cum[i1] - cum[i0]); }
    const tau = Math.abs(t1 - t0) / l * a;
    const g = tau <= ADAPT_T0 ? G : tau >= ADAPT_T1 ? 1 : G - (G - 1) * (tau - ADAPT_T0) / (ADAPT_T1 - ADAPT_T0);
    sig[i] = Math.min(cap, a * g);
  }
  // graded: the spacing changes by at most `grade` per unit of arc (two rounds around a closed curve)
  const gr = adapt.grade;
  for (let round = 0; round < (closed ? 2 : 1); round++) {
    for (let i = 1; i < N; i++) sig[i] = Math.min(sig[i], sig[i - 1] + gr * (cum[i] - cum[i - 1]));
    if (closed) sig[0] = Math.min(sig[0], sig[N - 1]);
    for (let i = N - 2; i >= 0; i--) sig[i] = Math.min(sig[i], sig[i + 1] + gr * (cum[i + 1] - cum[i]));
    if (closed) sig[N - 1] = Math.min(sig[N - 1], sig[0]);
  }
  // integrate 1 / spacing; dots at equal steps of the integral
  const u = new Float64Array(N);
  for (let i = 1; i < N; i++) u[i] = u[i - 1] + (cum[i] - cum[i - 1]) * 0.5 * (1 / sig[i] + 1 / sig[i - 1]);
  const U = u[N - 1];
  const inv = v => { let lo = 0, hi = N - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (u[mid] <= v) lo = mid; else hi = mid; } const f = u[hi] > u[lo] ? (v - u[lo]) / (u[hi] - u[lo]) : 0; return cum[lo] + f * (cum[hi] - cum[lo]); };
  if (!closed) {
    const m = mForce ?? Math.max(1, Math.round(U), Math.ceil(L / (GAP_MAX * G * a)));
    const out = []; for (let k = 1; k < m; k++) out.push(inv(k * U / m));
    return { m, u: out };
  }
  const m = mForce ?? Math.max(3, Math.round(U));
  const pos = [], u0 = u[Math.min(st, N - 1)];
  for (let k = 0; k < m; k++) {
    let v = u0 + k * U / m; if (v >= U) v -= U;
    const d = inv(v);
    let j = 0; while (j < N - 2 && cum[j + 1] < d) j++;
    const g = cum[j + 1] - cum[j] || 1, f = Math.max(0, Math.min(1, (d - cum[j]) / g));
    pos.push([P[j][0] + f * (P[j + 1][0] - P[j][0]), P[j][1] + f * (P[j + 1][1] - P[j][1])]);
  }
  return { m, pos };
}

const PRIO = { node: 4, corner: 2, dot: 1.5, reg: 1 };

// Conflict pass: points of different curves closer than r merge (the higher-priority point stays, regulars meet halfway).
export function resolveConflicts(pts, s, rFactor = 1.2, sameFactor = 0.5) {
  const r = rFactor * s, rAdj = 0.75 * s, rMin = sameFactor * s;
  const order = pts.map((p, i) => i).sort((a, b) => (PRIO[pts[b].kind] - PRIO[pts[a].kind]) || ((pts[b].sal || 0) - (pts[a].sal || 0)) || a - b);
  const cell = r;
  const grid = new Map();
  const kept = [];
  let merged = 0;
  for (const i of order) {
    const p = pts[i];
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    let hit = null, hd = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const L = grid.get((cx + dx) + ',' + (cy + dy));
      if (!L) continue;
      for (const q of L) {
        const d = hyp(p.x - q.x, p.y - q.y);
        if (d >= r) continue;
        const same = p.keys.some(k => q.keys.includes(k));
        if (same && d >= rMin) continue;
        if (!same && d >= rAdj && p.nodes && q.nodes && p.nodes.some(k => q.nodes.includes(k))) continue;
        if (d < hd) { hd = d; hit = q; }
      }
    }
    if (hit) {
      const same = p.keys.some(k => hit.keys.includes(k));
      if (!same) { merged++; if (hit.kind === 'reg' && p.kind === 'reg' && !hit.moved) { hit.x = (hit.x + p.x) / 2; hit.y = (hit.y + p.y) / 2; hit.moved = true; } }
      hit.keys.push(...p.keys);
      if (p.nodes) hit.nodes = (hit.nodes || []).concat(p.nodes);
      p.to = hit;
      continue;
    }
    const q = { ...p, keys: p.keys.slice(), nodes: p.nodes ? p.nodes.slice() : null };
    p.to = q;
    kept.push(q);
    const k = cx + ',' + cy;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(q);
  }
  return { pts: kept, merged };
}
