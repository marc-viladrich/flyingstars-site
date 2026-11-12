// v6: solve the spacing for a dot-count target on the real build.
//
// For a fixed content set and row policy the dot count is close to a monotone, decreasing function of the
// spacing s (n ~ L / s, where the curve length L changes slowly with s). The solver brackets the target and
// interpolates in log-log space (regula falsi, with bisection when an end stays fixed twice), so it lands
// within [lo, target] in a few builds. It never returns a build above the target: when no tried spacing is
// at or under the target, `b` is null and `over` holds the coarsest build tried.
//
//   build(s) -> { s, pts: [...] }        any function; called with s clamped to [sMin, sMax]
//   target                                hard upper bound on the count
//   lo                                    lower edge of the landing window (default 0.97 * target)
//   start                                 builds already made (any order), reused as bracket ends
export function solveSpacing(build, { target, lo = Math.floor(0.97 * target), sMin, sMax, start = [], maxIter = 9 }) {
  const n = b => b.pts.length;
  const clamp = s => Math.max(sMin, Math.min(sMax, s));
  let under = null, over = null, builds = 0;
  const all = [];
  const note = b => {
    all.push(b);
    if (n(b) <= target) { if (!under || n(b) > n(under) || (n(b) === n(under) && b.s > under.s)) under = b; }
    else if (!over || b.s > over.s || (b.s === over.s && n(b) < n(over))) over = b;
  };
  for (const b of start) if (b) note(b);
  const tried = new Set([...start].filter(Boolean).map(b => b.s.toFixed(4)));
  const mid = Math.sqrt(Math.max(1, lo) * target); // aim inside the window, not at its edge
  let stuck = 0, lastSide = 0;
  for (let it = 0; it < maxIter; it++) {
    if (under && n(under) >= lo) break;
    let s;
    if (under && over) {
      const xu = Math.log(under.s), xo = Math.log(over.s), yu = Math.log(Math.max(1, n(under))), yo = Math.log(n(over));
      if (Math.abs(xu - xo) < 2e-3) break; // the count jumps here: no spacing in between lands in the window
      const lo2 = Math.min(xu, xo), hi2 = Math.max(xu, xo);
      let x = yo !== yu ? xo + (Math.log(mid) - yo) * (xu - xo) / (yu - yo) : 0.5 * (xu + xo);
      // keep strictly inside the bracket; bisect when one end has stayed for two steps (Illinois)
      if (!(x > lo2 + 0.1 * (hi2 - lo2) && x < hi2 - 0.1 * (hi2 - lo2)) || stuck >= 2) x = 0.5 * (xu + xo);
      s = Math.exp(x);
    } else if (under) {
      if (under.s <= sMin * 1.0001) break;
      s = under.s * Math.max(0.5, Math.min(0.97, n(under) / mid));
    } else if (over) {
      if (over.s >= sMax * 0.9999) break;
      s = over.s * Math.min(2.5, Math.max(1.03, n(over) / mid));
    } else break;
    s = clamp(s);
    const key = s.toFixed(4);
    if (tried.has(key)) break;
    tried.add(key);
    const b = build(s); builds++;
    const side = n(b) <= target ? 1 : -1;
    stuck = side === lastSide ? stuck + 1 : 0; lastSide = side;
    note(b);
  }
  return { b: under, over, builds, all };
}
