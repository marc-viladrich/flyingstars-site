// Hard conditions checked on the real build at spacing s (classes A and B).
//   A. glyph topology: every significant counter of a figure still has its own loop of >= 4 dots that does
//      not swallow ink; every significant free end of the fine skeleton is still reached by a dot; every
//      terminal stroke keeps >= 3 dots.
//   B. corners: the salient corners of the fine reference build still carry a dot.
// The fine reference (s0) is computed once by `reference`.
import { figureNetwork } from './network.mjs';
import { polygonCorners } from './sample.mjs';
import { sourceDistance } from './dt.mjs';
import { climbDepth } from './fidelity.mjs';

const CORNER_MIN = 40;      // a reference corner turns by at least this much (degrees) ...
const POLY_MIN = 30;        // ... or 30 degrees between two straight sides

function grid(pts, cell) {
  const g = new Map();
  for (const p of pts) { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell); if (!g.has(k)) g.set(k, []); g.get(k).push(p); }
  return {
    near(x, y, r, test) {
      const c0 = Math.floor((x - r) / cell), c1 = Math.floor((x + r) / cell), r0 = Math.floor((y - r) / cell), r1 = Math.floor((y + r) / cell);
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        const L = g.get(cx + ',' + cy);
        if (!L) continue;
        for (const p of L) if (Math.hypot(p.x - x, p.y - y) <= r && (!test || test(p))) return p;
      }
      return null;
    },
  };
}

function inPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function distPoly(P, x, y) {
  let m = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[j], [bx, by] = P[i];
    const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
    m = Math.min(m, Math.hypot(ax + t * vx - x, ay + t * vy - y));
  }
  return m;
}
const polyArea = P => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); };

// centreline skeleton of a figure at the fine scale; large figures are thinned at half resolution (the free
// ends and counters of a big shape do not depend on single pixels), which halves the cost
function pureSkeleton(F, s0) {
  if (F.area < 12000) return figureNetwork(F, s0, { pure: true });
  const w = Math.ceil(F.w / 2), h = Math.ceil(F.h / 2);
  const mask = new Uint8Array(w * h), depth = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let n = 0, d = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const X = 2 * x + dx, Y = 2 * y + dy;
      if (X < F.w && Y < F.h && F.mask[Y * F.w + X]) { n++; d += F.depth[Y * F.w + X]; }
    }
    if (n >= 2) { mask[y * w + x] = 1; depth[y * w + x] = Math.max(0.01, d / n / 2); }
  }
  const net = figureNetwork({ w, h, mask, depth, x0: 0, y0: 0 }, s0 / 2, { pure: true });
  const up = q => [F.x0 + 2 * q[0], F.y0 + 2 * q[1]];
  for (const e of net.edges) { e.pts = e.pts.map(up); e.len *= 2; }
  return net;
}

// fine-scale features of every figure
export function reference(ctx, refBuild, s0, sMax) {
  const [lx0, ly0, lx1, ly1] = ctx.st.logoBox, ref0 = { diag: Math.hypot(lx1 - lx0, ly1 - ly0) };
  const figs = ctx.figs.map((F, fi) => {
    const holes = [];
    // significant holes of the draw mask (counters): flood fill from the box border, the rest are holes
    const { w, h, mask } = F;
    const seen = new Uint8Array(w * h), st = [];
    const seed = k => { if (!seen[k] && !mask[k]) { seen[k] = 1; st.push(k); } };
    for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    while (st.length) { const k = st.pop(), x = k % w, y = (k - x) / w; if (x > 0) seed(k - 1); if (x < w - 1) seed(k + 1); if (y > 0) seed(k - w); if (y < h - 1) seed(k + w); }
    for (let k0 = 0; k0 < w * h; k0++) {
      if (seen[k0] || mask[k0]) continue;
      const comp = [k0]; seen[k0] = 1;
      for (let t = 0; t < comp.length; t++) {
        const k = comp[t], x = k % w, y = (k - x) / w;
        for (const j of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) if (j >= 0 && !seen[j] && !mask[j]) { seen[j] = 1; comp.push(j); }
      }
      if (comp.length < Math.max(12, (1.2 * s0) ** 2)) continue;
      // representative point: the hole pixel farthest from ink (approx.: centre of the hole's bounding box if inside, else median pixel)
      let sx = 0, sy = 0; for (const k of comp) { sx += k % w; sy += Math.floor(k / w); }
      let cx = Math.round(sx / comp.length), cy = Math.round(sy / comp.length);
      if (mask[cy * w + cx] || seen[cy * w + cx] && !comp.includes(cy * w + cx)) { const k = comp[comp.length >> 1]; cx = k % w; cy = (k - cx) / w; }
      const px = new Set(); for (const k of comp) px.add((Math.floor(k / w) + F.y0) * 100000 + (k % w) + F.x0);
      holes.push({ x: cx + F.x0 + 0.5, y: cy + F.y0 + 0.5, area: comp.length, px });
    }
    // significant free ends and ink samples of the fine skeleton
    const net = pureSkeleton(F, s0);
    const deg = new Map();
    for (const e of net.edges) if (!e.closed) { deg.set(e.a, (deg.get(e.a) || 0) + 1); deg.set(e.b, (deg.get(e.b) || 0) + 1); }
    const depthAt = (x, y) => { const lx = Math.floor(x) - F.x0, ly = Math.floor(y) - F.y0; return lx >= 0 && ly >= 0 && lx < w && ly < h ? F.depth[ly * w + lx] : 0; };
    // depth profile from a tip inwards: [arc, depth] every few px (how far an inset row retreats from a
    // tapering tip at a given spacing, see verify)
    const profile = P => { const out = []; let L = 0; for (let i = 0; i < P.length; i++) { if (i) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (i % 2 === 0) out.push([L, depthAt(P[i][0], P[i][1])]); } return out; };
    const ends = [], ink = [];
    for (const e of net.edges) {
      for (let i = 0; i < e.pts.length; i += 3) ink.push(e.pts[i]);
      if (e.closed || e.a === e.b) continue;
      for (const [ni, q, r] of [[e.a, e.pts[0], e.pts[e.pts.length - 1]], [e.b, e.pts[e.pts.length - 1], e.pts[0]]]) {
        if (deg.get(ni) !== 1 || deg.get(ni === e.a ? e.b : e.a) === 1) continue; // isolated strokes: their ends are the stroke
        // a free end is significant when its stroke protrudes clearly beyond the junction it hangs on; shorter
        // spurs are the medial axis running into a corner of the outline
        const hwRoot = depthAt(r[0], r[1]);
        if (e.len < 2 * s0 || e.len + depthAt(q[0], q[1]) - hwRoot < 0.6 * hwRoot + 2) continue;
        // half-width of the stroke near its end: the centreline of a coarser build stops about that far
        // before the tip
        let hw = 0; const P = ni === e.a ? e.pts.slice(0, 12) : e.pts.slice(-12);
        for (const t of P) hw = Math.max(hw, depthAt(t[0], t[1]));
        ends.push({ x: q[0], y: q[1], hw, len: e.len, prof: profile(ni === e.a ? e.pts : e.pts.slice().reverse()) });
      }
    }
    // a lone stroke (an I, a bar): both ends count
    for (const e of net.edges) if (!e.closed && deg.get(e.a) === 1 && deg.get(e.b) === 1 && e.a !== e.b && e.len > 4 * s0) {
      for (const P of [e.pts.slice(0, 12), e.pts.slice(-12).reverse()]) { let hw = 0; for (const t of P) hw = Math.max(hw, depthAt(t[0], t[1])); ends.push({ x: P[0][0], y: P[0][1], hw, len: e.len }); }
    }
    // v4 (point 2): stroke contrast around a counter (the fat O of Opera: thick left and right, thin top and
    // bottom; only strokes fat on the scale of the logo, not the bulges at the joints of a line drawing). Along the skeleton cycles that enclose the counter, the depth varies strongly; such a figure
    // keeps two rows where it is fat (an upper bound on the spacing, see convert.mjs) and its regime is not
    // flattened to a centreline (class C hysteresis).
    F.contrastCap = null;
    if (!(F.part && F.part.kind === 'text') && holes.some(hh => hh.area >= Math.max(200, 0.04 * F.area))) {
      // per skeleton edge on a cycle: the contrast is a variation along one stroke (a ring crossed by a thin bar
      // is two uniform strokes, not contrast)
      for (const e of net.edges) {
        if (!e.closed && (deg.get(e.a) === 1 || deg.get(e.b) === 1)) continue;
        const dep = [];
        for (let i = 0; i < e.pts.length; i += 2) dep.push(depthAt(e.pts[i][0], e.pts[i][1]));
        if (dep.length < 20) continue;
        dep.sort((a, b) => a - b);
        const lo = dep[Math.floor(0.1 * dep.length)], hi = dep[Math.floor(0.9 * dep.length)];
        const fat = dep.filter(d => d >= 0.7 * hi).length / dep.length;
        if (globalThis.__dbgContrast) console.log('contrast', fi, dep.length, lo.toFixed(1), hi.toFixed(1), fat.toFixed(2));
        if (hi >= 1.6 * Math.max(1, lo) && fat >= 0.25 && hi >= 0.04 * ref0.diag) F.contrastCap = Math.max(F.contrastCap || 0, hi / 1.6);
      }
    }
    return { holes, ends, ink };
  });
  // polygon corners (class B), found on the fine reference curves at a ladder of analysis scales: a rounded
  // corner of radius r is a corner only for spacings of about r and coarser. Stroke ends (turn near 180
  // degrees between the two sides of one stroke) are not polygon corners; the terminal test covers them.
  const levels = [];
  for (let sa = s0 * 1.5; sa <= sMax * 1.3; sa *= 1.5) {
    const corners = [];
    for (const c of refBuild.curves) {
      if (!c.pts || c.pts.length < 8) continue;
      for (const k of polygonCorners(c.pts, c.closed, sa)) {
        if (k.ang < POLY_MIN || k.ang > 120) continue; // sharper turns are tips: the terminal test covers them
        // a side no longer than about a stroke width next to a free end is that stroke's end cap: the
        // stroke end represents it and the terminal test judges it. Without a free end (the stem of a
        // single-storey a, flush with its bowl) the corners are the only thing that tells the glyph apart.
        const F = ctx.figs[c.fi];
        // half-width of the stroke at the corner (the corner point itself may lie just outside the ink)
        let hw = 0;
        for (const r of [0, 3, 6]) for (let a = 0; a < (r ? 8 : 1); a++) hw = Math.max(hw, climbDepth(F, k.pos[0] + r * Math.cos(a * Math.PI / 4), k.pos[1] + r * Math.sin(a * Math.PI / 4))[1]);
        if (k.side <= 2.6 * hw && figs[c.fi].ends.some(e => Math.hypot(e.x - k.pos[0], e.y - k.pos[1]) < k.side + 2 * hw)) continue;
        // direction towards the ink: the bisector or its opposite, whichever side is deeper
        const dIn = t => climbDepth(F, k.pos[0] + t * k.bis[0], k.pos[1] + t * k.bis[1])[0];
        let fw = 0, bw = 0; for (const t of [3, 6, 12, 24]) { fw += dIn(t); bw += dIn(-t); }
        const sg = fw >= bw ? 1 : -1;
        // salient corners count at every spacing (the hexagon of a mark, the descender of a block p); others
        // only while their polygon is big enough to be drawn as one at the spacing
        const glyph = (F.part && F.part.kind === 'text') || F.region.glyphLike;
        const H = glyph ? F.region.y1 - F.region.y0 + 1 : ref0.diag;
        const salient = glyph ? k.sideMax >= 0.3 * H && k.side >= 0.15 * H : k.sideMax >= 0.12 * H && k.side >= 0.05 * H;
        corners.push({ x: k.pos[0], y: k.pos[1], ang: k.ang, fi: c.fi, side: k.side, sideMax: k.sideMax, hw, n: [sg * k.bis[0], sg * k.bis[1]], salient });
      }
    }
    // two corners joined by a short side (a flat-topped apex, a square stroke end) collapse into one vertex
    // when the stroke is drawn as a centreline: remember the partner across the short side
    for (const c of corners) {
      let best = null, bd = Infinity;
      for (const q of corners) {
        if (q === c || q.fi !== c.fi) continue;
        const d = Math.hypot(q.x - c.x, q.y - c.y);
        if (d < bd && Math.abs(d - c.side) < 0.25 * c.side + 3 && d <= 4 * Math.max(c.hw, q.hw)) { bd = d; best = q; }
      }
      if (best) {
        let nx = c.n[0] + best.n[0], ny = c.n[1] + best.n[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const hw = Math.max(c.hw, best.hw);
        c.collapse = [(c.x + best.x) / 2 + nx * hw, (c.y + best.y) / 2 + ny * hw];
      }
    }
    levels.push({ s: sa, corners });
  }
  return { levels, figs, s0 };
}

// verdict per figure index: { holes, ends, strokes, cornersLost, cornersTot } for the active figures
export function verify(ctx, ref, build, active) {
  const s = build.s, s0 = ref.s0;
  const G = grid(build.pts, Math.max(4, s));
  // the turn the eye sees at each dot: largest angle between consecutive links of the chains through it
  const turnAt = new Map();
  for (const c of build.chainsRaw) {
    const P = [];
    for (const o of c) if (!P.length || P[P.length - 1] !== o.to) P.push(o.to);
    if (c.closed && P.length > 2 && P[0] === P[P.length - 1]) P.pop();
    const n = P.length;
    for (let i = 0; i < n; i++) {
      if (!c.closed && (i === 0 || i === n - 1)) continue;
      const a = P[(i - 1 + n) % n], b = P[i], d = P[(i + 1) % n];
      const v1x = b.x - a.x, v1y = b.y - a.y, v2x = d.x - b.x, v2y = d.y - b.y, l = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
      if (l < 1e-9) continue;
      const t = Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / l))) * 180 / Math.PI;
      if (t > (turnAt.get(b) || 0)) turnAt.set(b, t);
    }
  }
  // raster of the links the eye draws between consecutive dots (1 px lines)
  const W = ctx.seg.W, H = ctx.seg.H;
  const line = new Uint8Array(W * H);
  const plot = (x, y) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < W && y < H) line[y * W + x] = 1; };
  for (const sg of build.segs) {
    const a = sg[0], b = sg[1];
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 1.5) + 1;
    if (Math.hypot(b.x - a.x, b.y - a.y) > 2.2 * s) continue; // not a link the eye makes
    for (let k = 0; k <= n; k++) plot(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n);
  }
  // the eye closes gaps up to about one spacing where two chains meet without a shared dot: the links are
  // thickened by 0.6 s before the counter is flood-filled
  let lineDist = null;
  const filled = new Int32Array(W * H).fill(-1);
  let fillId = 0;
  const enclosed = (hx, hy, ink) => {
    if (!lineDist) lineDist = sourceDistance(line, W, H);
    const wall = k => lineDist[k] <= 0.6 * s;
    const x = Math.floor(hx), y = Math.floor(hy), k0 = y * W + x;
    if (wall(k0)) return lineDist[k0] > 0.2 * s; // a small counter inside its loop; a collapsed one sits on a line
    const id = fillId++;
    const st = [k0]; filled[k0] = id;
    while (st.length) {
      const k = st.pop();
      const px = k % W, py = (k - px) / W;
      if (px === 0 || py === 0 || px === W - 1 || py === H - 1) return false;
      for (const j of [k - 1, k + 1, k - W, k + W]) if (filled[j] !== id && !wall(j)) { filled[j] = id; st.push(j); }
    }
    for (const q of ink) { const k = Math.floor(q[1]) * W + Math.floor(q[0]); if (filled[k] === id) return false; }
    return true;
  };
  const res = new Map();
  const get = fi => { if (!res.has(fi)) res.set(fi, { holes: 0, ends: 0, strokes: 0, cLost: 0, cTot: 0, sLost: 0, feat: (ref.figs[fi].holes.length + ref.figs[fi].ends.length) }); return res.get(fi); };
  // corners
  let lev = ref.levels[0];
  for (const L of ref.levels) if (L.s <= s * 1.01) lev = L;
  // salient corners count at every spacing (taken from the finest level where they are corners: the
  // descender of a block p, the hexagon of a mark); others only while their polygon is big enough to be
  // drawn as one at this spacing (sides with too few dots make a blob, not a polygon)
  const list = (lev ? lev.corners : []).filter(c => c.salient || (c.sideMax >= 3 * s && c.side >= s));
  for (const c of ref.levels[0].corners) if (c.salient && !list.some(q => q.fi === c.fi && Math.hypot(q.x - c.x, q.y - c.y) < 0.5 * s)) list.push(c);
  for (const c of list) {
    if (active && !active.has(c.fi)) continue;
    const r = get(c.fi);
    // the inset corner moves inwards by 0.4*(s - s0)/cos(turn/2) as s grows; a corner is represented by a
    // dot that is itself an anchor (corner, node, end), not by a regular dot that happens to pass by
    // where the corner of the row must be: moved inwards along the bisector to the row's depth, which is
    // 0.4 s for an outline row and the half-width for a centreline (whichever the build chose)
    const cs = Math.max(0.35, Math.cos(c.ang * Math.PI / 360));
    const ok = p => p.kind === 'node' || p.kind === 'dot' || (turnAt.get(p) || 0) >= 0.6 * c.ang;
    r.cTot++;
    let hit = false;
    for (const dS of [0.4 * s, c.hw]) {
      const off = Math.max(0, dS - 0.4 * s0) / cs;
      if (G.near(c.x + c.n[0] * off, c.y + c.n[1] * off, 0.4 * s, ok)) { hit = true; break; }
    }
    if (!hit && c.collapse && G.near(c.collapse[0], c.collapse[1], Math.max(0.6 * s, c.hw), p => p.kind !== 'reg')) hit = true;
    if (!hit) { r.cLost++; if (c.salient) r.sLost++; }
    if (!hit && globalThis.__dbgCorner === c.fi) console.log('lost', c.x.toFixed(1), c.y.toFixed(1), 'n', c.n.map(v => v.toFixed(2)).join(','), 'ang', c.ang.toFixed(0), 'cands', build.pts.filter(p => Math.hypot(p.x - c.x, p.y - c.y) < s).map(p => `${p.kind}${p.ang ? p.ang.toFixed(0) : ''}@${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
  }
  // terminal strokes with fewer than 3 dots
  const termCount = new Map();
  for (const c of build.chainsRaw) if (!c.closed && c.length > 1) for (const o of [c[0], c[c.length - 1]]) if (o.kind === 'node') termCount.set(o.keys[0], (termCount.get(o.keys[0]) || 0) + 1);
  for (const c of build.chainsRaw) {
    if (c.closed || c.length < 2 || (active && !active.has(c.fi))) continue;
    const a = c[0], b = c[c.length - 1];
    const term = (a.kind === 'node' && termCount.get(a.keys[0]) === 1) || (b.kind === 'node' && termCount.get(b.keys[0]) === 1);
    if (!term) continue;
    const distinct = new Set(c.map(o => o.to)).size;
    if (distinct >= 3) continue;
    // v4: a stub outside lettering (the short horns on the rim of a bowl) is a stroke only when the fine
    // reference has a significant free end there; in lettering every terminal stroke counts
    const F = ctx.figs[c.fi];
    if (!(F.part && F.part.kind === 'text')) {
      // drawn as an outline, a tapering tip ends in a short spur off the loop: that is the tip, not a stroke
      if (F.group && F.group.hw >= 1.15 * s) continue;
      const tip = termCount.get(a.keys[0]) === 1 && a.kind === 'node' ? a.to : b.to;
      const Hc = F.region.y1 - F.region.y0 + 1;
      if (!ref.figs[c.fi].ends.some(e => (F.region.glyphLike ? e.len >= 0.2 * Hc : e.len >= 2 * s) && Math.hypot(e.x - tip.x, e.y - tip.y) <= 0.5 * s + e.hw + 2)) continue;
    }
    get(c.fi).strokes++;
  }
  ref.figs.forEach((R, fi) => {
    if (active && !active.has(fi)) return;
    const r = get(fi);
    for (const h of R.holes) {
      // a narrow counter drawn as a line of its own (slot) is represented by the dots on it
      let inside = 0;
      for (const p of build.pts) if (h.px.has(Math.floor(p.y) * 100000 + Math.floor(p.x))) inside++;
      if (inside >= 2) continue;
      // otherwise the drawn links must enclose the counter without swallowing ink
      if (!enclosed(h.x, h.y, R.ink)) r.holes++;
    }
    // a free end is structure when its stroke can be drawn at this spacing (>= 1.5 s) or when it is salient
    // in its figure (>= 20 % of the figure's height); shorter flourishes are detail below the spacing
    const Hf = ctx.figs[fi].region.y1 - ctx.figs[fi].region.y0 + 1;
    // v4: for an inlaid figure (the logo inside its container) the salient ends count at every spacing, so a
    // coarser spacing is never judged against fewer features than a finer one
    const inlaid = ctx.figs[fi].region.glyphLike && !(ctx.figs[fi].part && ctx.figs[fi].part.kind === 'text');
    for (const e of R.ends) {
      if (inlaid ? e.len < 0.2 * Hf : e.len < 1.5 * s && e.len < 0.2 * Hf) continue;
      // a centreline stops about a half-width before the tip, an inset row retreats further from a tapering
      // tip; a short spur gets no more slack than half its length
      let tol = Math.min(0.5 * s + e.hw + 2, 0.5 * s + 0.5 * e.len + 2);
      // v4: a needle tip (a flame tongue) is thinner than the simplification keeps at this spacing; the drawn
      // tip is where the stroke becomes thick enough to carry a row (half-width ~0.6 s; the row sits 0.4 s inside), at most half the stroke
      if (e.prof) { let ret = 0; for (const [L, d] of e.prof) { ret = L; if (d >= 0.6 * s) break; } tol = Math.max(tol, 0.9 * s + 2 + Math.min(ret, 0.5 * e.len)); }
      if (!G.near(e.x, e.y, tol)) { if (globalThis.__dbgEnds) console.log('end lost', fi, e.x.toFixed(0), e.y.toFixed(0), 'tol', tol.toFixed(1)); r.ends++; }
    }
  });
  return res;
}
