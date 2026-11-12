// Step 3: curve network of one figure at spacing s via the clamped inset:
// skeleton of the band {depth <= 2d}. Thick parts -> a loop at depth d, parts thinner than 4d -> centreline.
import { sourceDistance } from './dt.mjs';

export const INSET = 0.4;    // depth of the outline row inside a fat shape, in units of s
export const ROW_SEP = 1.5;  // minimum distance between two rows of one stroke, in units of s

// neighbour order: E, NE, N, NW, W, SW, S, SE
const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, -1, -1, -1, 0, 1, 1, 1];
const SIMPLE = new Uint8Array(256), NCOUNT = new Uint8Array(256);
for (let m = 0; m < 256; m++) {
  const x = k => (m >> (k & 7)) & 1;
  let n = 0, c = 0;
  for (let k = 0; k < 8; k++) c += x(k);
  for (const k of [0, 2, 4, 6]) { const a = 1 - x(k), b = 1 - x(k + 1), d = 1 - x(k + 2); n += a - a * b * d; }
  SIMPLE[m] = n === 1 ? 1 : 0; NCOUNT[m] = c;
}

function nbMask(img, w, h, x, y) {
  if (x > 0 && y > 0 && x + 1 < w && y + 1 < h) {
    const k = y * w + x;
    return (!!img[k + 1]) | (!!img[k - w + 1] << 1) | (!!img[k - w] << 2)
      | (!!img[k - w - 1] << 3) | (!!img[k - 1] << 4) | (!!img[k + w - 1] << 5)
      | (!!img[k + w] << 6) | (!!img[k + w + 1] << 7);
  }
  let m = 0;
  for (let k = 0; k < 8; k++) {
    const X = x + DX[k], Y = y + DY[k];
    if (X >= 0 && Y >= 0 && X < w && Y < h && img[Y * w + X]) m |= 1 << k;
  }
  return m;
}

// Distance-ordered homotopic thinning; endpoints preserved. Each bucket is peeled with four
// directional sub-passes (candidates collected first) so 2-px-wide lines are not eaten from one end.
const DIRS = [[0, -1], [0, 1], [1, 0], [-1, 0]];
function peel(set, list, w, h) {
  let any = false, changed = true;
  const cand = [];
  while (changed) {
    changed = false;
    for (const [dx, dy] of DIRS) {
      cand.length = 0;
      for (const k of list) {
        if (!set[k]) continue;
        const x = k % w, y = (k - x) / w, X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h || !set[Y * w + X]) cand.push(k);
      }
      for (const k of cand) {
        const x = k % w, y = (k - x) / w, m = nbMask(set, w, h, x, y);
        if (SIMPLE[m] && NCOUNT[m] >= 2) { set[k] = 0; changed = true; any = true; }
      }
    }
    if (changed) {
      let n = 0;
      for (let i = 0; i < list.length; i++) if (set[list[i]]) list[n++] = list[i];
      list.length = n;
    }
  }
  return any;
}
export function thin(set, prio, w, h) {
  const idx = [];
  for (let k = 0; k < w * h; k++) if (set[k]) idx.push(k);
  idx.sort((a, b) => prio[a] - prio[b] || a - b);
  let i = 0;
  while (i < idx.length) {
    const b0 = Math.floor(prio[idx[i]] * 2);
    let j = i; while (j < idx.length && Math.floor(prio[idx[j]] * 2) === b0) j++;
    peel(set, idx.slice(i, j), w, h);
    i = j;
  }
  peel(set, idx, w, h); // cleanup (staircases)
  return set;
}

// Skeleton pixels -> graph {nodes:[{x,y}], edges:[{pts:[k...], a, b, closed}]}
export function traceGraph(sk, w, h) {
  const deg = new Uint8Array(w * h);
  const pix = [];
  for (let k = 0; k < w * h; k++) if (sk[k]) { pix.push(k); const x = k % w, y = (k - x) / w; deg[k] = NCOUNT[nbMask(sk, w, h, x, y)]; }
  const nodeOf = new Int32Array(w * h).fill(-1);
  const nodes = [];
  for (const k of pix) {
    if (deg[k] === 2 || nodeOf[k] >= 0) continue;
    // cluster connected non-2 pixels with deg>=3 together; endpoints alone
    const cl = [k]; nodeOf[k] = nodes.length;
    if (deg[k] >= 3) {
      for (let t = 0; t < cl.length; t++) {
        const c = cl[t], x = c % w, y = (c - x) / w;
        for (let d = 0; d < 8; d++) {
          const X = x + DX[d], Y = y + DY[d];
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const n = Y * w + X;
          if (sk[n] && deg[n] >= 3 && nodeOf[n] < 0) { nodeOf[n] = nodes.length; cl.push(n); }
        }
      }
    }
    let sx = 0, sy = 0;
    for (const c of cl) { sx += c % w; sy += Math.floor(c / w); }
    nodes.push({ x: sx / cl.length, y: sy / cl.length, pix: cl, edges: [] });
  }
  const used = new Uint8Array(w * h);
  const edges = [];
  const nbrs = k => { const x = k % w, y = (k - x) / w, out = []; for (let d = 0; d < 8; d++) { const X = x + DX[d], Y = y + DY[d]; if (X >= 0 && Y >= 0 && X < w && Y < h && sk[Y * w + X]) out.push(Y * w + X); } return out; };
  for (let ni = 0; ni < nodes.length; ni++) {
    for (const c of nodes[ni].pix) {
      for (const n0 of nbrs(c)) {
        if (nodeOf[n0] === ni) continue;
        if (nodeOf[n0] >= 0) {
          // direct node-node adjacency: an edge without interior pixels (only once)
          if (nodeOf[n0] > ni) { const key = `${ni}-${nodeOf[n0]}`; if (!nodes[ni].dk) nodes[ni].dk = new Set(); if (nodes[ni].dk.has(key)) continue; nodes[ni].dk.add(key); const e = { pts: [c, n0], a: ni, b: nodeOf[n0], closed: false }; edges.push(e); }
          continue;
        }
        if (used[n0]) continue;
        const pts = [c, n0]; used[n0] = 1;
        let prev = c, cur = n0, end = -1;
        for (;;) {
          let next = -1;
          for (const n of nbrs(cur)) {
            if (n === prev || pts.length > 2 && n === pts[pts.length - 3]) continue;
            if (nodeOf[n] >= 0 && !(nodeOf[n] === ni && pts.length <= 2)) { next = n; end = nodeOf[n]; break; }
            if (!used[n] && nodeOf[n] < 0) { next = n; }
          }
          if (next < 0) break;
          pts.push(next);
          if (end >= 0) break;
          used[next] = 1; prev = cur; cur = next;
        }
        if (end < 0) end = ni; // should not happen
        edges.push({ pts, a: ni, b: end, closed: false });
      }
    }
  }
  // pure loops
  for (const k of pix) {
    if (used[k] || nodeOf[k] >= 0) continue;
    const pts = [k]; used[k] = 1;
    let prev = -1, cur = k;
    for (;;) {
      let next = -1;
      for (const n of nbrs(cur)) if (n !== prev && !used[n]) { next = n; break; }
      if (next < 0) break;
      used[next] = 1; pts.push(next); prev = cur; cur = next;
    }
    edges.push({ pts, a: -1, b: -1, closed: true });
  }
  edges.forEach((e, i) => { if (e.a >= 0) nodes[e.a].edges.push(i); if (e.b >= 0) nodes[e.b].edges.push(i); });
  return { nodes, edges };
}

const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };

// Remove short terminal spurs, then merge degree-2 nodes.
function prune(G, Lp, rootDepth, midDepth, serifLen = 0) {
  const { nodes } = G;
  let edges = G.edges.map(e => ({ ...e, dead: false }));
  const degree = ni => nodes[ni].edges.filter(i => !edges[i].dead).reduce((s, i) => s + (edges[i].a === edges[i].b ? 2 : 1), 0);
  const kill = [];
  // v7 (item 5): slab serifs of one-row lettering: a node of degree 3 whose two other edges are short spurs (free ends,
  // each under serifLen) pointing away from each other (cosine under -0.6) and across the third, long edge
  if (serifLen > 0) for (let ni = 0; ni < nodes.length; ni++) {
    const inc = nodes[ni].edges.filter(i => !edges[i].closed && edges[i].a !== edges[i].b);
    if (inc.length !== 3) continue;
    const other = i => edges[i].a === ni ? edges[i].b : edges[i].a;
    const spurs = inc.filter(i => degree(other(i)) === 1 && edges[i].len < serifLen);
    if (spurs.length !== 2) continue;
    const stem = inc.find(i => !spurs.includes(i));
    if (edges[stem].len < 1.5 * Math.max(...spurs.map(i => edges[i].len))) continue;
    const dir = i => { const e = edges[i], p = e.a === ni ? e.pts : e.pts.slice().reverse(), q = p[Math.min(p.length - 1, 6)], d = Math.hypot(q[0] - p[0][0], q[1] - p[0][1]) || 1; return [(q[0] - p[0][0]) / d, (q[1] - p[0][1]) / d]; };
    const [u, v] = spurs.map(dir), w = dir(stem);
    if (u[0] * v[0] + u[1] * v[1] > -0.6 || Math.abs(u[0] * w[0] + u[1] * w[1]) > 0.6) continue;
    kill.push(...spurs);
  }
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e.closed || e.a === e.b) continue;
    const da = degree(e.a), db = degree(e.b);
    const terminal = (da === 1) !== (db === 1); // exactly one free end: a spur hanging on the graph
    if (!terminal) continue;
    const root = da === 1 ? e.b : e.a;
    // protrusion of the arm beyond the junction's inscribed disc: spur length plus the depth left at its tip
    // (a square stroke end stops the skeleton about a half-width early) minus the junction depth. A spur
    // into a 90-degree corner protrudes ~0.41 junction depths, a real arm (the bar of an f or t) more.
    const tip = root === e.a ? e.b : e.a;
    if (e.len < Lp || e.len + rootDepth(tip) - rootDepth(root) < 0.5 * rootDepth(root) + 1) kill.push(i);
  }
  // never kill all edges of a node at once leaving it isolated unless both are spurs of the same junction (fine)
  for (const i of kill) edges[i].dead = true;
  // merge chains through degree-2 nodes
  const alive = () => edges.filter(e => !e.dead);
  let merged = true;
  while (merged) {
    merged = false;
    for (let ni = 0; ni < nodes.length; ni++) {
      const inc = nodes[ni].edges.filter(i => !edges[i].dead);
      if (inc.length !== 2 || inc[0] === inc[1]) continue;
      const e1 = edges[inc[0]], e2 = edges[inc[1]];
      // orient e1 to end at ni, e2 to start at ni
      const p1 = e1.b === ni ? e1.pts : e1.pts.slice().reverse();
      const s1 = e1.b === ni ? e1.a : e1.b;
      const p2 = e2.a === ni ? e2.pts : e2.pts.slice().reverse();
      const s2 = e2.a === ni ? e2.b : e2.a;
      const ne = { pts: p1.concat(p2.slice(1)), a: s1, b: s2, closed: false, dead: false };
      ne.len = plen(ne.pts);
      e1.dead = e2.dead = true;
      const idx = edges.length; edges.push(ne);
      if (s1 === ni && s2 === ni) { ne.closed = true; ne.a = ne.b = -1; }
      else { nodes[s1].edges.push(idx); if (s2 !== s1) nodes[s2].edges.push(idx); else nodes[s2].edges.push(idx); }
      nodes[ni].edges = []; nodes[ni].merged = true;
      merged = true;
    }
  }
  return { nodes, edges: alive(), all: edges };
}

function bilinear(f, w, h, x, y) {
  x -= 0.5; y -= 0.5;
  const X = Math.max(0, Math.min(w - 2, Math.floor(x))), Y = Math.max(0, Math.min(h - 2, Math.floor(y)));
  const fx = Math.max(0, Math.min(1, x - X)), fy = Math.max(0, Math.min(1, y - Y));
  const a = f[Y * w + X], b = f[Y * w + X + 1], c = f[(Y + 1) * w + X], d = f[(Y + 1) * w + X + 1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

// Build the curve network of figure F at spacing s. Returns polylines in global coords.
// opt.d2: factor on the outline/centreline threshold (regime of the figure's sibling group, class C);
// opt.pure: centreline everywhere (the glyph skeleton used by the topology test)
export function figureNetwork(F, s, opt = {}) {
  const { w, h, mask, depth, x0, y0 } = F;
  // opt.insetPx / opt.D2px (fill.mjs): an interior row of a solid, with its own inset and centreline threshold
  const d = opt.insetPx ?? INSET * s;
  // the band ends where a second row would be at least ROW_SEP*s away from the first: depth > d + ROW_SEP*s/2
  const D2 = opt.pure ? Infinity : opt.D2px ?? (d + 0.5 * ROW_SEP * s) * (opt.d2 || 1);
  const alpha = d / (D2 - d); // puts the band's ridge at depth d
  const band = new Uint8Array(w * h), core = new Uint8Array(w * h);
  let anyCore = false;
  for (let k = 0; k < w * h; k++) if (mask[k]) { if (depth[k] <= D2) band[k] = 1; else core[k] = 1; }
  // cores that are only marginally deeper (stroke junctions, slight bulges) would leave tiny loops: fill them
  {
    const seen = new Uint8Array(w * h);
    for (let k0 = 0; k0 < w * h; k0++) {
      if (!core[k0] || seen[k0]) continue;
      const comp = [k0]; seen[k0] = 1;
      let mx = 0;
      for (let t = 0; t < comp.length; t++) {
        const k = comp[t], x = k % w, y = (k - x) / w;
        if (depth[k] > mx) mx = depth[k];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const j = Y * w + X;
          if (core[j] && !seen[j]) { seen[j] = 1; comp.push(j); }
        }
      }
      // in the outline regime of a sibling group (opt.coreMargin) a core that is long, like the core of a
      // bar, stays even when it is only marginally deep; small junction blobs are filled either way
      const margin = opt.coreMargin !== undefined && comp.length >= 1.5 * s * s ? opt.coreMargin : 0.3;
      // v5 (P1): a blob keeps every core, so its outline never collapses to a skeleton
      if (!opt.keepCores && mx < D2 + margin * s) for (const k of comp) { core[k] = 0; band[k] = 1; }
      else anyCore = true;
    }
  }
  const prio = new Float32Array(w * h);
  let cd = null;
  if (anyCore) cd = sourceDistance(core, w, h);
  for (let k = 0; k < w * h; k++) if (band[k]) prio[k] = cd ? Math.min(depth[k], alpha * (cd[k] - 0.5)) : depth[k];
  thin(band, prio, w, h);
  const G = traceGraph(band, w, h);
  const toXY = k => { const x = k % w; return [x + 0.5, (k - x) / w + 0.5]; };
  for (const e of G.edges) { e.pts = e.pts.map(toXY); if (e.closed) e.pts.push(e.pts[0]); e.len = plen(e.pts); }
  const rootDepth = ni => { const n = G.nodes[ni]; const k = Math.round(n.y) * w + Math.round(n.x); return depth[k] || 0; };
  const midDepth = e => { const q = e.pts[e.pts.length >> 1]; return depth[Math.min(h - 1, Math.floor(q[1])) * w + Math.min(w - 1, Math.floor(q[0]))] || 0; };
  if (globalThis.__dbgNet) console.log("G", G.edges.map(e => `${e.a}-${e.b}:${e.len.toFixed(0)} r${rootDepth(e.a).toFixed(0)}/${rootDepth(e.b).toFixed(0)} m${midDepth(e).toFixed(0)}`).join(" "));
  // v5 (P1): a blob's tips (the flames of a torch, the tips of a star) stay as short rows on its outline
  const P = prune(G, (opt.spurLen ?? 1.0) * s, rootDepth, midDepth, opt.serifLen || 0);
  // snap loop parts onto the exact inset level set depth = d (sub-pixel), centrelines stay
  const snap = (pt) => {
    let [x, y] = pt;
    const k = Math.min(h - 1, Math.max(0, Math.floor(y))) * w + Math.min(w - 1, Math.max(0, Math.floor(x)));
    if (!cd || cd[k] > (D2 - d) * 1.6 + 1) return pt;
    if (Math.abs(bilinear(depth, w, h, x, y) - d) > Math.max(1.5, 0.35 * d)) return pt; // a centreline point, not an inset row
    for (let it = 0; it < 3; it++) {
      const v = bilinear(depth, w, h, x, y);
      const gx = (bilinear(depth, w, h, x + 0.7, y) - bilinear(depth, w, h, x - 0.7, y)) / 1.4;
      const gy = (bilinear(depth, w, h, x, y + 0.7) - bilinear(depth, w, h, x, y - 0.7)) / 1.4;
      const g2 = gx * gx + gy * gy;
      if (g2 < 0.25) break;
      const step = Math.max(-1.5, Math.min(1.5, (d - v) / Math.sqrt(g2)));
      const gl = Math.sqrt(g2);
      x += step * gx / gl; y += step * gy / gl;
    }
    return [x, y];
  };
  const out = { edges: [], points: [] };
  const nodeXY = ni => [P.nodes[ni].x + 0.5, P.nodes[ni].y + 0.5];
  for (const e of P.edges) {
    const pts = e.pts.map(snap);
    if (!e.closed) { pts[0] = nodeXY(e.a); pts[pts.length - 1] = nodeXY(e.b); }
    out.edges.push({ pts: pts.map(([x, y]) => [x + x0, y + y0]), closed: e.closed, a: e.a, b: e.b, len: plen(pts) });
  }
  // nodes that lost all their edges to pruning (tiny blobs) and bare single pixels become point features
  for (let i = 0; i < P.nodes.length; i++) {
    const n = P.nodes[i];
    const alive = n.edges.some(j => !P.all[j].dead);
    if (alive || n.merged) continue;
    if (n.edges.length === 0 || n.edges.length >= 2) out.points.push([n.x + 0.5 + x0, n.y + 0.5 + y0]);
  }
  out.nodes = P.nodes.map(n => ({ x: n.x + 0.5 + x0, y: n.y + 0.5 + y0 }));
  return out;
}
