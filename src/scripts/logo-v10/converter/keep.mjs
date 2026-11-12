// v6.2: what a coarser picture keeps of a reference picture of the same content and rows.
//
// The ladder takes the best picture within maxDrones as the reference R and descends from it (coarser spacing,
// same content, same rows) only while nothing a viewer would notice is lost. This module measures the geometric
// part of "nothing lost", from the dots and the links the eye draws between them (consecutive dots of a row):
//   cov    share of R's dots that lie within `tol` of a link of C (a row of R that C no longer draws, a loop or
//          a counter that closed, two rows that merged into one leave R's dots uncovered);
//   prec   share of C's dots within `tol` of a link of R (merged midpoints, speckle, rows R does not have);
//   runs   uncovered stretches of at least RUN consecutive dots along one row of R (a lost feature: a loop, the
//          inner contour of a shape, a stroke), however small a share of the picture they are;
//   figs   figures of R (at least 4 dots) that C no longer draws: under half of their dots covered and under a
//          quarter of the dots left that the coarser spacing would leave.
// The tolerance grows with the coarsening: tol = TOL0 s_R + TOL1 (s_C - s_R) + 1 px. An outline row moves
// inwards by 0.4 (s_C - s_R) as the spacing grows and a chord sags a little; a row that falls back to the centre
// line lies at least 0.75 s_C from where the outline rows were (two rows are at least 1.5 s apart), and two
// rows that merge leave their dots about half their distance from the merged row, so both stay outside tol.
export const TOL0 = 0.35, TOL1 = 0.45, RUN = 3, LINK = 2.2;

function chainsOf(b) {
  const out = [];
  for (const c of b.chainsRaw) {
    const seq = [];
    for (const o of c) { const t = o.to; if (t && (!seq.length || seq[seq.length - 1] !== t)) seq.push(t); }
    let closed = !!c.closed;
    if (closed && seq.length > 2 && seq[0] === seq[seq.length - 1]) seq.pop();
    if (seq.length < 3) closed = false;
    out.push({ seq, closed, fi: c.fi });
  }
  return out;
}

// eye links: consecutive dots of a row no farther apart than LINK spacings; single dots as points
function linksOf(b) {
  const L = [], lim = LINK * b.s * (b.alongMax || 1);
  for (const sg of b.segs) {
    const a = sg[0], c = sg[1];
    if (a !== c && Math.hypot(c.x - a.x, c.y - a.y) > lim) continue;
    L.push([a.x, a.y, c.x, c.y]);
  }
  // every dot is at least a point of the picture
  for (const p of b.pts) L.push([p.x, p.y, p.x, p.y]);
  return L;
}

function segIndex(L, cell) {
  const g = new Map();
  L.forEach((l, i) => {
    const x0 = Math.floor(Math.min(l[0], l[2]) / cell), x1 = Math.floor(Math.max(l[0], l[2]) / cell);
    const y0 = Math.floor(Math.min(l[1], l[3]) / cell), y1 = Math.floor(Math.max(l[1], l[3]) / cell);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = x + ',' + y; if (!g.has(k)) g.set(k, []); g.get(k).push(i); }
  });
  return {
    // distance from (x, y) to the nearest link, searched up to r (returns > r when none is that close)
    dist(x, y, r) {
      let best = Infinity;
      const c0 = Math.floor((x - r) / cell), c1 = Math.floor((x + r) / cell), r0 = Math.floor((y - r) / cell), r1 = Math.floor((y + r) / cell);
      const seen = new Set();
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        const list = g.get(cx + ',' + cy); if (!list) continue;
        for (const i of list) {
          if (seen.has(i)) continue; seen.add(i);
          const [ax, ay, bx, by] = L[i];
          const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
          const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
          const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
          if (d < best) best = d;
        }
      }
      return best;
    },
  };
}

// R, C: builds (convert.mjs buildAt). weightOf(fi) optional (default 1): figures that do not count (anti-aliasing
// rims) get 0
export function keepScore(R, C, weightOf = null, dbg = null) {
  const tol = TOL0 * R.s + TOL1 * Math.max(0, C.s - R.s) + 1;
  const w = p => (weightOf ? weightOf(p.fi) : 1);
  const cell = Math.max(4, C.s);
  const IC = segIndex(linksOf(C), cell), IR = segIndex(linksOf(R), Math.max(4, R.s));
  const covered = new Map();
  let cw = 0, tw = 0;
  const perFig = new Map();
  for (const p of R.pts) {
    const ok = IC.dist(p.x, p.y, tol) <= tol;
    covered.set(p, ok);
    const wp = w(p);
    tw += wp; if (ok) cw += wp;
    if (wp > 0) { const f = perFig.get(p.fi) || [0, 0]; f[0]++; if (ok) f[1]++; perFig.set(p.fi, f); }
  }
  // a figure is gone when C covers under half of its dots in R and draws it with under a quarter of the dots the
  // coarser spacing would leave (a stroke drawn in one row instead of two keeps about half of them)
  const nC = new Map(); for (const p of C.pts) nC.set(p.fi, (nC.get(p.fi) || 0) + 1);
  let figs = 0;
  for (const [fi, [n, k]] of perFig) if (n >= 4 && k < 0.5 * n && (nC.get(fi) || 0) < 0.25 * n * R.s / C.s) figs++;
  // uncovered runs along R's rows
  let runs = 0, runDots = 0;
  for (const ch of chainsOf(R)) {
    const seq = ch.seq, n = seq.length;
    if (!n) continue;
    const bad = seq.map(p => !covered.get(p) && w(p) > 0);
    if (ch.closed && bad.every(Boolean)) { if (n >= RUN) { runs++; runDots += n; } continue; }
    const st = ch.closed ? Math.max(0, bad.indexOf(false)) : 0;
    let len = 0;
    for (let k = 0; k <= n; k++) {
      const i = (st + k) % n;
      if (k < n && bad[i]) { len++; continue; }
      if (len >= RUN) { runs++; runDots += len; }
      len = 0;
      if (!ch.closed && k === n) break;
    }
  }
  let pw = 0, pt = 0;
  for (const p of C.pts) { const wp = w(p); pt += wp; if (IR.dist(p.x, p.y, tol) <= tol) pw += wp; }
  if (dbg) { dbg.unR = R.pts.filter(p => !covered.get(p)); dbg.unC = C.pts.filter(p => !(IR.dist(p.x, p.y, tol) <= tol)); }
  return { cov: tw ? cw / tw : 1, prec: pt ? pw / pt : 1, runs, runDots, figs, tol };
}
