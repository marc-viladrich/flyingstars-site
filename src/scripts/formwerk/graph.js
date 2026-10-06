import FK from "./fk.js";
// copied from formations-werkzeug/core/graph.js by tools/sync-formwerk.js – edit there, then sync
// Graph building (SPEC §6.2, §6.3): paths -> Pflichtpunkte (corners, ends, junctions, seeds, dots) and edges between
// them. Handles stroke icons: end-to-end joins, T-junctions, crossings, seams; small parts become one dot or are dropped;
// mirror axes are detected on the geometry and tie mirror-partner edges into groups for the allocation.
(function (FK) {
  "use strict";
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const PRIO = { end: 4, junction: 3, corner: 2, seed: 1 };

  function cleanPath(pts, anchors, closed) {
    const P = [], map = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!P.length || dist(P[P.length - 1], p) > 1e-9) P.push([p[0], p[1]]);
      map[i] = P.length - 1;
    }
    if (closed && P.length > 2 && dist(P[0], P[P.length - 1]) <= 1e-9) { P.pop(); for (let i = 0; i < map.length; i++) if (map[i] === P.length) map[i] = 0; }
    const ai = [...new Set((anchors || []).filter((i) => i >= 0 && i < pts.length).map((i) => map[i]))].sort((a, b) => a - b);
    return { P, ai };
  }
  function recalc(p) { p.cum = FK.geom.cumLen(p.P, p.closed); p.L = p.cum[p.cum.length - 1]; }

  // closest point of q on path p, restricted to arc positions [s0, s1] (open paths)
  function projectRange(p, q, s0, s1) {
    const P = p.P, cum = p.cum, m = p.closed ? P.length : P.length - 1;
    let best = null;
    for (let i = 0; i < m; i++) {
      const a0 = cum[i], a1 = cum[i + 1];
      if (a1 < s0 || a0 > s1 || a1 - a0 <= 0) continue;
      const a = P[i], b = P[(i + 1) % P.length], vx = b[0] - a[0], vy = b[1] - a[1], ll = vx * vx + vy * vy;
      let t = ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / ll;
      const tMin = Math.max(0, (s0 - a0) / (a1 - a0)), tMax = Math.min(1, (s1 - a0) / (a1 - a0));
      t = Math.max(tMin, Math.min(tMax, t));
      const f = [a[0] + vx * t, a[1] + vy * t], d = dist(f, q);
      if (!best || d < best.d) best = { s: a0 + t * (a1 - a0), d, p: f };
    }
    return best;
  }

  // ---- mirror axes on the raw geometry (sampled Hausdorff) ----
  function samplePaths(paths, step) {
    const S = [];
    for (const p of paths) {
      const n = Math.max(2, Math.ceil(p.L / step));
      for (let i = 0; i < (p.closed ? n : n + 1); i++) S.push(FK.geom.pointAt(p.P, p.cum, (p.L * i) / n, p.closed));
    }
    return S;
  }
  function gridIndex(pts, cell) {
    const g = new Map();
    pts.forEach((p, i) => { const k = Math.floor(p[0] / cell) + "," + Math.floor(p[1] / cell); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
    return {
      near(q, r) {
        const gx = Math.floor(q[0] / cell), gy = Math.floor(q[1] / cell), R = Math.ceil(r / cell);
        let best = Infinity;
        for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) { const l = g.get(gx + dx + "," + (gy + dy)); if (l) for (const i of l) { const d = dist(pts[i], q); if (d < best) best = d; } }
        return best;
      },
    };
  }
  function detectAxes(paths, bb) {
    const diag = bb.diag || 1, step = diag / 500, S = samplePaths(paths, step);
    if (S.length < 4) return { v: null, h: null };
    const tol = 0.004 * diag + step, idx = gridIndex(S, tol);
    const test = (mir) => { for (const s of S) if (idx.near(mir(s), tol) > tol) return false; return true; };
    return {
      v: test((s) => [2 * bb.cx - s[0], s[1]]) ? bb.cx : null,
      h: test((s) => [s[0], 2 * bb.cy - s[1]]) ? bb.cy : null,
    };
  }

  // ---- main ----
  // elements: [{ id, name, color, kind: "stroke"|"fill", enabled, paths: [{ pts, closed, anchors }] }]
  // opts: { targetN, dRef?, cornerDeg, symmetry, overrides: [{ p, type: "corner"|"smooth" }], speckMin }
  function build(elements, opts) {
    const o = Object.assign({ targetN: 100, cornerDeg: 60, symmetry: true, overrides: [], speckMin: 2.5 }, opts || {});
    const geom = FK.geom;
    let paths = [];
    const elInfo = new Map();
    for (const el of elements) {
      if (el.enabled === false) continue;
      elInfo.set(el.id, el);
      for (const src of el.paths) {
        if (src.enabled === false) continue;
        const c = cleanPath(src.pts, src.anchors, src.closed);
        if (c.P.length < 2) continue;
        const p = { el: el.id, kind: el.kind || "stroke", P: c.P, closed: !!src.closed && c.P.length > 2, ai: c.ai, flags: el.typing === "flags", forced: src.forced || [] };
        recalc(p);
        if (p.L > 0) paths.push(p);
      }
    }
    const stats = { seams: 0, joins: 0, snaps: 0, crossings: 0, overlaps: [] };
    const specks = [];
    if (!paths.length) return empty(o);
    const bb = geom.bbox(paths.flatMap((p) => p.P)), diag = bb.diag || 1;
    const total = paths.reduce((a, p) => a + p.L, 0);
    const dRef = o.dRef || total / Math.max(2, o.targetN);
    const epsJ = Math.max(0.004 * diag, 0.45 * dRef);
    // scene motifs with their own drone count (o.itemCounts): corners, small parts and stroke ends are judged at the
    // spacing the motif really gets; the others at the spacing of the shared rest. Without own counts: dRef everywhere.
    const own = new Map(), fixedIts = o.itemCounts || {};
    let restLen = 0, fixedSum = 0;
    for (const p of paths) {
      const e = elInfo.get(p.el), it = e && e.item !== undefined && e.item !== null && fixedIts[e.item] > 0 ? e.item : null;
      if (it === null) restLen += p.L; else own.set(it, (own.get(it) || 0) + p.L);
    }
    for (const it of own.keys()) fixedSum += Math.floor(fixedIts[it]);
    const restN = o.targetN - fixedSum, dRest = own.size && restLen > 0 && restN >= 2 ? restLen / restN : dRef;
    const dLoc = (el) => { const e = elInfo.get(el), it = e ? e.item : undefined; return it !== undefined && own.has(it) ? own.get(it) / Math.max(2, fixedIts[it]) : dRest; };
    const axes = o.symmetry === false ? { v: null, h: null } : detectAxes(paths, bb);
    // every element (a letter, a shape) can have its own mirror axis even when the whole picture has none; a scene
    // motif made of several SVG shapes is mirrored as a whole, its single shapes only when the motif is not symmetric
    const unitOf = (el) => { const e = elInfo.get(el); return e && e.item !== undefined && e.item !== null ? "item:" + e.item : el; };
    const elAxes = new Map();
    if (o.symmetry !== false) {
      const byEl = new Map(), byUnit = new Map();
      const push = (m, k, p) => { if (!m.has(k)) m.set(k, []); m.get(k).push(p); };
      for (const p of paths) { push(byEl, p.el, p); if (unitOf(p.el) !== p.el) push(byUnit, unitOf(p.el), p); }
      const axesOf = (ps) => { const b = geom.bbox(ps.flatMap((p) => p.P)); return b.diag > 0 ? detectAxes(ps, b) : { v: null, h: null }; };
      for (const [u, ps] of byUnit) { const ax = axesOf(ps); if (ax.v !== null || ax.h !== null) elAxes.set(u, ax); }
      for (const [el, ps] of byEl) { if (elAxes.has(unitOf(el))) continue; const ax = axesOf(ps); if (ax.v !== null || ax.h !== null) elAxes.set(el, ax); }
    }
    const axisKey = (el) => (elAxes.has(unitOf(el)) ? unitOf(el) : el);

    // G-2a seams: an open path whose own ends nearly meet is closed
    for (const p of paths) {
      if (p.closed) continue;
      const gap = dist(p.P[0], p.P[p.P.length - 1]);
      if (gap <= epsJ && p.L > 3 * gap && p.P.length > 2) {
        if (gap <= 1e-9) { p.P.pop(); p.ai = p.ai.map((i) => (i >= p.P.length ? 0 : i)); }
        if (!p.ai.includes(0)) p.ai.unshift(0);
        p.closed = true; recalc(p); stats.seams++;
      }
    }
    // G-6 small closed parts -> one dot drone or dropped
    paths = paths.filter((p) => {
      if (!p.closed || p.L >= o.speckMin * dLoc(p.el)) return true;
      const b = geom.bbox(p.P);
      specks.push({ el: p.el, kind: b.diag >= 0.5 * dLoc(p.el) ? "dot" : "drop", p: [b.cx, b.cy], len: p.L, closed: true });
      return false;
    });

    // G-3a inner seams of one filled shape: icon fonts glue a silhouette together from pieces (subpaths of one filled
    // element) that share edges. A shared edge lies inside the silhouette, so it is removed from BOTH pieces; the
    // outline pieces are joined again below. (Strokes keep one copy of a shared line, see G-3.)
    {
      const fills = paths.filter((p) => p.kind === "fill");
      if (fills.length > 1) {
        const eps = Math.max(1e-6 * diag, 0.12 * dRef), cell = 4 * eps, cosSeam = Math.cos((20 * Math.PI) / 180), grid = new Map();
        fills.forEach((p) => {
          const m = p.closed ? p.P.length : p.P.length - 1;
          for (let i = 0; i < m; i++) {
            const a = p.P[i], b = p.P[(i + 1) % p.P.length];
            const x0 = Math.floor((Math.min(a[0], b[0]) - eps) / cell), x1 = Math.floor((Math.max(a[0], b[0]) + eps) / cell);
            const y0 = Math.floor((Math.min(a[1], b[1]) - eps) / cell), y1 = Math.floor((Math.max(a[1], b[1]) + eps) / cell);
            if ((x1 - x0 + 1) * (y1 - y0 + 1) > 40000) continue;
            const sg = { p, a, b, s0: p.cum[i], s1: p.cum[i + 1] };
            for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + "," + y; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(sg); }
          }
        });
        const seamHit = (p, q, t) => {
          const l = grid.get(Math.floor(q[0] / cell) + "," + Math.floor(q[1] / cell));
          if (!l) return null;
          for (const sg of l) {
            if (sg.p === p || sg.p.el !== p.el) continue;
            const { a, b } = sg, vx = b[0] - a[0], vy = b[1] - a[1], ll = vx * vx + vy * vy;
            if (ll <= 0) continue;
            const u = Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / ll));
            if (Math.hypot(a[0] + vx * u - q[0], a[1] + vy * u - q[1]) >= eps) continue;
            if (Math.abs((t[0] * vx + t[1] * vy) / Math.sqrt(ll)) < cosSeam) continue;
            return { p: sg.p, s2: sg.s0 + u * (sg.s1 - sg.s0) };
          }
          return null;
        };
        const cutRuns = new Map();
        for (const p of fills) {
          const step = Math.min(eps / 2, p.L / 16), n = Math.max(2, Math.ceil(p.L / step)), cnt = p.closed ? n : n + 1, ds = p.L / n;
          const hits = [];
          for (let k = 0; k < cnt; k++) {
            const s = k * ds, q = FK.geom.pointAt(p.P, p.cum, s, p.closed);
            const qa = FK.geom.pointAt(p.P, p.cum, p.closed ? s - ds : Math.max(0, s - ds), p.closed), qb = FK.geom.pointAt(p.P, p.cum, p.closed ? s + ds : Math.min(p.L, s + ds), p.closed);
            const tl = Math.hypot(qb[0] - qa[0], qb[1] - qa[1]) || 1;
            hits.push(seamHit(p, q, [(qb[0] - qa[0]) / tl, (qb[1] - qa[1]) / tl]));
          }
          const runs = [];
          if (hits.every(Boolean)) runs.push([0, p.L]);
          else {
            const k0 = p.closed ? hits.findIndex((h) => !h) : 0;
            for (let c = 0; c < cnt; c++) {
              if (!hits[(k0 + c) % cnt]) continue;
              let e = c;
              while (e + 1 < cnt && hits[(k0 + e + 1) % cnt]) e++;
              const sA = ((k0 + c) % cnt) * ds, sB = sA + (e - c) * ds, hs = [];
              for (let x = c; x <= e; x++) hs.push(hits[(k0 + x) % cnt]);
              const span = Math.max(...hs.map((h) => h.s2)) - Math.min(...hs.map((h) => h.s2));
              if (e - c >= 3 && span >= 0.4 * (sB - sA)) runs.push([sA, sB]);
              c = e;
            }
          }
          if (runs.length) cutRuns.set(p, runs);
        }
        if (cutRuns.size) {
          const next = [];
          for (const p of paths) {
            const runs = cutRuns.get(p);
            if (!runs) { next.push(p); continue; }
            stats.seamsInner = (stats.seamsInner || 0) + 1;
            if (runs.length === 1 && runs[0][0] <= 1e-9 && runs[0][1] >= p.L - 1e-9) continue;
            const keep = [], sorted = runs.slice().sort((a, b) => a[0] - b[0]);
            if (p.closed) for (let r = 0; r < sorted.length; r++) { const s0 = sorted[r][1], s1 = r + 1 < sorted.length ? sorted[r + 1][0] : sorted[0][0] + p.L; if (s1 - s0 > 1e-9) keep.push([s0, s1]); }
            else { let s = 0; for (const [a, b] of sorted) { if (a - s > 1e-9) keep.push([s, a]); s = b; } if (p.L - s > 1e-9) keep.push([s, p.L]); }
            const anchorPts = p.ai.map((i) => p.P[i]);
            for (const [s0, s1] of keep) {
              if (s1 - s0 < 1e-6 * diag) continue;
              const Q = FK.geom.slice(p.P, p.cum, s0, s1, p.closed), ai = [];
              Q.forEach((q, i) => { if (i === 0 || i === Q.length - 1 || anchorPts.some((a) => a[0] === q[0] && a[1] === q[1])) ai.push(i); });
              const c = cleanPath(Q, ai, false), piece = { el: p.el, kind: p.kind, P: c.P, closed: false, ai: c.ai, flags: p.flags, forced: p.forced };
              recalc(piece);
              if (piece.P.length >= 2 && piece.L > 0) next.push(piece);
            }
          }
          paths = next;
          // the remaining outline pieces meet end to end: join them back into closed outlines
          for (let pass = 0; pass < 400; pass++) {
            let joined = false;
            for (const A of paths) {
              if (A.closed || A.kind !== "fill") continue;
              const endA = A.P[A.P.length - 1];
              if (Math.hypot(A.P[0][0] - endA[0], A.P[0][1] - endA[1]) <= eps && A.L > 3 * eps) { A.P.pop(); A.closed = true; if (!A.ai.includes(0)) A.ai.unshift(0); A.ai = A.ai.filter((i) => i < A.P.length); recalc(A); joined = true; break; }
              let best = null;
              for (const B of paths) {
                if (B === A || B.closed || B.kind !== "fill" || B.el !== A.el) continue;
                const d0 = Math.hypot(B.P[0][0] - endA[0], B.P[0][1] - endA[1]), d1 = Math.hypot(B.P[B.P.length - 1][0] - endA[0], B.P[B.P.length - 1][1] - endA[1]);
                if (d0 <= eps && (!best || d0 < best.d)) best = { B, d: d0, rev: false };
                if (d1 <= eps && (!best || d1 < best.d)) best = { B, d: d1, rev: true };
              }
              if (!best) continue;
              const B = best.B, PB = best.rev ? B.P.slice().reverse() : B.P, aiB = best.rev ? B.ai.map((i) => B.P.length - 1 - i) : B.ai;
              const off = A.P.length - 1;
              A.P = A.P.concat(PB.slice(1)); A.ai = [...new Set(A.ai.concat([off], aiB.map((i) => i + off)))].sort((x, y) => x - y);
              recalc(A); paths = paths.filter((q) => q !== B); joined = true; break;
            }
            if (!joined) break;
          }
        }
      }
    }

    // G-3 shared stretches (drone scale): where a path runs alongside geometry that came before it - another path or
    // an earlier part of itself - that stretch is one line for the drones and is removed from the later part.
    //   tier 1: closer than 0.25 d at any angle (shared walls, double lines, the same line drawn twice)
    //   tier 2: closer than 0.8 d while running almost parallel (< 25°): tangential branches, narrow spikes, thin bars
    // New ends within epsJ snap on as T-junctions; ends further away stay free ends.
    {
      const eps1 = 0.25 * dRef, eps2 = 0.8 * dRef, minRun = 0.5 * dRef, cell = eps2, cosPar = Math.cos((25 * Math.PI) / 180), cos45 = Math.cos(Math.PI / 4);
      const grid = new Map();
      const addSegs = (p) => {
        const m = p.closed ? p.P.length : p.P.length - 1;
        for (let i = 0; i < m; i++) {
          const a = p.P[i], b = p.P[(i + 1) % p.P.length];
          const x0 = Math.floor((Math.min(a[0], b[0]) - eps2) / cell), x1 = Math.floor((Math.max(a[0], b[0]) + eps2) / cell);
          const y0 = Math.floor((Math.min(a[1], b[1]) - eps2) / cell), y1 = Math.floor((Math.max(a[1], b[1]) + eps2) / cell);
          if ((x1 - x0 + 1) * (y1 - y0 + 1) > 40000) continue;
          const sg = { p, a, b, s0: p.cum[i], s1: p.cum[i + 1] };
          for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + "," + y; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(sg); }
        }
      };
      // is sample (q at arc s on path p, unit tangent t) running alongside earlier geometry?
      const alongside = (p, s, q, t) => {
        const l = grid.get(Math.floor(q[0] / cell) + "," + Math.floor(q[1] / cell));
        if (!l) return null;
        for (const sg of l) {
          const { a, b } = sg, vx = b[0] - a[0], vy = b[1] - a[1], ll = vx * vx + vy * vy;
          if (ll <= 0) continue;
          const u = Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / ll));
          const dd = Math.hypot(a[0] + vx * u - q[0], a[1] + vy * u - q[1]);
          if (dd >= eps2) continue;
          if (sg.p === p) { // earlier part of the same path, and not just the neighbourhood along the path
            const s2 = sg.s0 + u * (sg.s1 - sg.s0);
            const along = p.closed ? Math.min(Math.abs(s - s2), p.L - Math.abs(s - s2)) : Math.abs(s - s2);
            if (!(s2 < s) || along <= 2.5 * dd + 1e-9 * p.L) continue;
          }
          const c = Math.abs((t[0] * vx + t[1] * vy) / Math.sqrt(ll));
          const hit = { p: sg.p, s2: sg.s0 + u * (sg.s1 - sg.s0) };
          if (dd < eps1 && c >= cos45) return hit; // on top of each other and running along (not a crossing)
          if (c >= cosPar && !letterOutline(p) && !letterOutline(sg.p)) return hit; // outline letters keep narrow wedges (R leg, K arms)
        }
        return null;
      };
      // a run only counts as shared when the other line runs along too (its foot points advance), not when the
      // two lines just touch or cross in one point (the waist of an 8, an X)
      const runsAlong = (hits, len) => {
        const by = new Map();
        for (const h of hits) if (h) { if (!by.has(h.p)) by.set(h.p, []); by.get(h.p).push(h.s2); }
        let best = 0;
        for (const [q, ss] of by) {
          let span = Math.max(...ss) - Math.min(...ss);
          if (q.closed) span = Math.min(span, q.L - span + (ss.length > 1 ? 0 : 0));
          best = Math.max(best, span);
        }
        return best >= 0.4 * len;
      };
      const letterOutline = (p) => { const e = elInfo.get(p.el); return !!(e && e.textOutline); };
      const out = [];
      for (const p of paths) {
        addSegs(p); // its own segments too (self-proximity only looks backwards along the path)
        const step = Math.min(eps1 / 3, p.L / 12), n = Math.max(2, Math.ceil(p.L / step));
        const cnt = p.closed ? n : n + 1, ds = p.L / n;
        const flag = [];
        for (let k = 0; k < cnt; k++) {
          const s = k * ds, q = FK.geom.pointAt(p.P, p.cum, s, p.closed);
          const qa = FK.geom.pointAt(p.P, p.cum, p.closed ? s - ds : Math.max(0, s - ds), p.closed), qb = FK.geom.pointAt(p.P, p.cum, p.closed ? s + ds : Math.min(p.L, s + ds), p.closed);
          const tl = Math.hypot(qb[0] - qa[0], qb[1] - qa[1]) || 1;
          flag.push(alongside(p, s, q, [(qb[0] - qa[0]) / tl, (qb[1] - qa[1]) / tl]));
        }
        const runs = [];
        if (flag.every(Boolean)) { if (runsAlong(flag, p.L)) runs.push([0, p.L]); }
        else {
          const k0 = p.closed ? flag.indexOf(false) : 0;
          for (let c = 0; c < cnt; c++) {
            if (!flag[(k0 + c) % cnt]) continue;
            let e = c;
            while (e + 1 < cnt && flag[(k0 + e + 1) % cnt]) e++;
            const sA = ((k0 + c) % cnt) * ds, sB = sA + (e - c) * ds;
            const hits = []; for (let x = c; x <= e; x++) hits.push(flag[(k0 + x) % cnt]);
            if (sB - sA >= minRun && runsAlong(hits, sB - sA)) { runs.push([sA, sB]); if (o.debug) (stats.cuts = stats.cuts || []).push({ el: p.el, from: FK.geom.pointAt(p.P, p.cum, sA, p.closed), to: FK.geom.pointAt(p.P, p.cum, sB, p.closed), self: hits.filter(Boolean).some((h) => h.p === p), other: hits.filter(Boolean).map((h) => h.p === p ? "self" : "other")[0] }); }
            c = e;
          }
        }
        if (!runs.length) { out.push(p); continue; }
        stats.dupes = (stats.dupes || 0) + 1;
        if (runs.length === 1 && runs[0][0] <= 1e-9 && runs[0][1] >= p.L - 1e-9) continue; // entirely shared
        const keep = [], sorted = runs.slice().sort((a, b) => a[0] - b[0]);
        if (p.closed) {
          for (let r = 0; r < sorted.length; r++) { const s0 = sorted[r][1], s1 = r + 1 < sorted.length ? sorted[r + 1][0] : sorted[0][0] + p.L; if (s1 - s0 > 1e-9) keep.push([s0, s1]); }
        } else {
          let s = 0;
          for (const [a, b] of sorted) { if (a - s > 1e-9) keep.push([s, a]); s = b; }
          if (p.L - s > 1e-9) keep.push([s, p.L]);
        }
        const anchorPts = p.ai.map((i) => p.P[i]);
        for (const [s0, s1] of keep) {
          if (s1 - s0 < 0.3 * dRef) continue;
          const Q = FK.geom.slice(p.P, p.cum, s0, s1, p.closed), ai = [];
          Q.forEach((q, i) => { if (i === 0 || i === Q.length - 1 || anchorPts.some((a) => a[0] === q[0] && a[1] === q[1])) ai.push(i); });
          const c = cleanPath(Q, ai, false), piece = { el: p.el, kind: p.kind, P: c.P, closed: false, ai: c.ai, cutFrom: true, flags: p.flags, forced: p.forced };
          recalc(piece);
          if (piece.P.length >= 2 && piece.L > 0) out.push(piece);
        }
      }
      paths = out;
    }

    // ---- ends, clusters, through paths ----
    const endsOf = () => { const E = []; for (const p of paths) if (!p.closed) { E.push({ path: p, w: 0 }); E.push({ path: p, w: 1 }); } return E; };
    const endPt = (e) => (e.w === 0 ? e.path.P[0] : e.path.P[e.path.P.length - 1]);
    const clusterEnds = (E) => {
      const par = E.map((_, i) => i), f = (i) => (par[i] === i ? i : (par[i] = f(par[i])));
      const cell = epsJ, g = new Map();
      E.forEach((e, i) => { const q = endPt(e), k = Math.floor(q[0] / cell) + "," + Math.floor(q[1] / cell); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
      E.forEach((e, i) => {
        const q = endPt(e), gx = Math.floor(q[0] / cell), gy = Math.floor(q[1] / cell);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const l = g.get(gx + dx + "," + (gy + dy)); if (l) for (const j of l) if (j > i && dist(endPt(E[j]), q) <= epsJ) par[f(j)] = f(i); }
      });
      const m = new Map();
      E.forEach((_, i) => { const r = f(i); if (!m.has(r)) m.set(r, []); m.get(r).push(i); });
      return [...m.values()];
    };
    const through = (pos, members) => {
      const out = [];
      for (const p of paths) {
        let s0 = 0, s1 = p.L;
        for (const e of members) if (e.path === p) { if (e.w === 0) s0 = Math.max(s0, 3 * epsJ); else s1 = Math.min(s1, p.L - 3 * epsJ); }
        if (s1 <= s0) continue;
        const pr = projectRange(p, pos, s0, s1);
        if (!pr || pr.d > epsJ) continue;
        if (!p.closed && (pr.s < 1e-6 * p.L || pr.s > p.L * (1 - 1e-6))) continue; // that is an end, not a through path
        out.push({ path: p, s: pr.s, d: pr.d, p: pr.p });
      }
      return out.sort((a, b) => a.d - b.d);
    };
    const mean = (pts) => [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length];

    // joins: two ends of the same element meeting without a through path -> one path (typing decides corner or not)
    for (let pass = 0; pass < 200; pass++) {
      const E = endsOf(), cls = clusterEnds(E), used = new Set();
      let changed = false;
      for (const c of cls) {
        if (c.length !== 2) continue;
        const e1 = E[c[0]], e2 = E[c[1]];
        if (used.has(e1.path) || used.has(e2.path)) continue;
        const pos = mean([endPt(e1), endPt(e2)]);
        if (through(pos, [e1, e2]).length) continue;
        if (e1.path === e2.path) { // seam found late (after other joins)
          const p = e1.path;
          if (p.L <= 3 * dist(endPt(e1), endPt(e2)) || p.P.length < 3) continue;
          p.P[0] = pos; p.P.pop(); p.ai = p.ai.map((i) => (i >= p.P.length ? 0 : i)); if (!p.ai.includes(0)) p.ai.unshift(0);
          p.closed = true; recalc(p); used.add(p); stats.seams++; changed = true; continue;
        }
        const A = e1.path, B = e2.path;
        if (A.el !== B.el || A.kind !== B.kind || A.flags || B.flags) continue;
        const PA = e1.w === 1 ? A.P : A.P.slice().reverse(), aiA = e1.w === 1 ? A.ai : A.ai.map((i) => A.P.length - 1 - i);
        const PB = e2.w === 0 ? B.P : B.P.slice().reverse(), aiB = e2.w === 0 ? B.ai : B.ai.map((i) => B.P.length - 1 - i);
        const off = PA.length - 1;
        const P = PA.slice(0, off).concat([pos], PB.slice(1));
        const ai = [...new Set(aiA.concat([off], aiB.map((i) => i + off)))].sort((a, b) => a - b);
        A.P = P; A.ai = ai; recalc(A);
        paths = paths.filter((p) => p !== B);
        used.add(A); used.add(B); stats.joins++; changed = true;
      }
      if (!changed) break;
    }
    // small closed parts created by joins/seams
    paths = paths.filter((p) => {
      if (!p.closed || p.L >= o.speckMin * dLoc(p.el)) return true;
      const b = geom.bbox(p.P);
      specks.push({ el: p.el, kind: b.diag >= 0.5 * dLoc(p.el) ? "dot" : "drop", p: [b.cx, b.cy], len: p.L, closed: true });
      return false;
    });

    // ---- global nodes ----
    const nodes = [];
    const par = [];
    const addNode = (p, kind, el) => { nodes.push({ p: p.slice(), kind, prio: PRIO[kind] || 0, el }); par.push(par.length); return nodes.length - 1; };
    const find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
    const union = (a, b) => { a = find(a); b = find(b); if (a === b) return; if (nodes[b].prio > nodes[a].prio) [a, b] = [b, a]; par[b] = a; };
    for (const p of paths) p.bps = [];

    // clusters of ends -> end / junction nodes; T-junctions snap the ends onto the through path
    {
      const E = endsOf(), cls = clusterEnds(E);
      const plans = cls.map((c) => {
        const members = c.map((i) => E[i]);
        const pos = mean(members.map(endPt));
        const th = through(pos, members);
        return { members, pos: th.length ? th[0].p : pos, th };
      });
      for (const pl of plans) {
        const kind = pl.members.length === 1 && !pl.th.length ? "end" : "junction";
        const id = addNode(pl.pos, kind, pl.members[0].path.el);
        pl.id = id;
        if (pl.th.length) stats.snaps++;
        for (const e of pl.members) { if (e.w === 0) e.path.P[0] = pl.pos.slice(); else e.path.P[e.path.P.length - 1] = pl.pos.slice(); }
      }
      for (const p of paths) recalc(p);
      for (const pl of plans) {
        for (const e of pl.members) e.path.bps.push({ s: e.w === 0 ? 0 : e.path.L, node: pl.id });
        for (const t of pl.th) {
          let s0 = 0, s1 = t.path.L;
          for (const e of pl.members) if (e.path === t.path) { if (e.w === 0) s0 = 3 * epsJ; else s1 = t.path.L - 3 * epsJ; }
          const pr = projectRange(t.path, pl.pos, s0, s1);
          t.path.bps.push({ s: pr ? pr.s : t.s, node: pl.id });
        }
      }
    }

    // crossings between stroke centre lines (X-junctions); overlapping filled outlines are only reported
    {
      const segs = [];
      paths.forEach((p, pi) => { const m = p.closed ? p.P.length : p.P.length - 1; for (let i = 0; i < m; i++) segs.push({ pi, i, a: p.P[i], b: p.P[(i + 1) % p.P.length] }); });
      const cell = Math.max(diag / 64, epsJ), g = new Map();
      segs.forEach((sg, k) => {
        const x0 = Math.floor(Math.min(sg.a[0], sg.b[0]) / cell), x1 = Math.floor(Math.max(sg.a[0], sg.b[0]) / cell);
        const y0 = Math.floor(Math.min(sg.a[1], sg.b[1]) / cell), y1 = Math.floor(Math.max(sg.a[1], sg.b[1]) / cell);
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const key = x + "," + y; if (!g.has(key)) g.set(key, []); g.get(key).push(k); }
      });
      const seen = new Set(), hits = [];
      for (const list of g.values()) {
        for (let u = 0; u < list.length; u++) for (let v = u + 1; v < list.length; v++) {
          const A = segs[list[u]], B = segs[list[v]];
          const key = list[u] < list[v] ? list[u] + ":" + list[v] : list[v] + ":" + list[u];
          if (seen.has(key)) continue;
          seen.add(key);
          const pa = paths[A.pi], pb = paths[B.pi];
          if (A.pi === B.pi) { const n = pa.closed ? pa.P.length : pa.P.length - 1; const di = Math.abs(A.i - B.i); if (di <= 1 || (pa.closed && di === n - 1)) continue; }
          const x = geom.segIntersect(A.a, A.b, B.a, B.b);
          if (!x) continue; // crossings through a vertex count too; repeated hits merge below
          // outlines that touch or cross share a drone there as well (reported as overlap when two filled shapes meet)
          if (pa.kind === "fill" && pb.kind === "fill" && pa.el !== pb.el) { const k2 = [pa.el, pb.el].sort().join("|"); if (!stats.overlaps.includes(k2)) stats.overlaps.push(k2); }
          const sa = pa.cum[A.i] + x.t * (pa.cum[A.i + 1] - pa.cum[A.i]), sb = pb.cum[B.i] + x.u * (pb.cum[B.i + 1] - pb.cum[B.i]);
          hits.push({ p: x.p, a: A.pi, sa, b: B.pi, sb });
        }
      }
      hits.sort((h1, h2) => h1.a - h2.a || h1.sa - h2.sa);
      const made = [];
      for (const h of hits) {
        if (nodes.some((nd) => dist(nd.p, h.p) <= epsJ)) {
          // near an existing node (e.g. a T-junction just made): attach to that node if the path lacks it
          const nd = nodes.findIndex((q) => dist(q.p, h.p) <= epsJ);
          for (const [pi, s] of [[h.a, h.sa], [h.b, h.sb]]) if (!paths[pi].bps.some((bp) => find(bp.node) === find(nd))) paths[pi].bps.push({ s, node: nd });
          continue;
        }
        const id = addNode(h.p, "junction", paths[h.a].el);
        paths[h.a].bps.push({ s: h.sa, node: id });
        paths[h.b].bps.push({ s: h.sb, node: id });
        made.push(id); stats.crossings++;
      }
    }

    // G-6 small open parts that touch nothing -> dot or dropped (>= 1.0 d stays a stroke)
    paths = paths.filter((p) => {
      if (p.closed || p.L >= 1.0 * dLoc(p.el)) return true;
      const own = p.bps.map((b) => find(b.node));
      const isolated = p.bps.every((b) => b.s <= 1e-9 * (p.L || 1) || b.s >= p.L * (1 - 1e-9)) && !paths.some((q) => q !== p && q.bps.some((b) => own.includes(find(b.node))));
      if (!isolated) return true;
      own.forEach((id) => (nodes[id].dead = true));
      // a very short stroke with round caps is how stroke icons draw a dot (eyes: "v.01"), so strokes always keep a dot
      specks.push({ el: p.el, kind: p.L >= 0.3 * dLoc(p.el) || p.kind === "stroke" ? "dot" : "drop", p: geom.pointAt(p.P, p.cum, p.L / 2, false), len: p.L, closed: false });
      return false;
    });

    // ---- typing (drone scale) ----
    const peaks = [];
    paths.forEach((p, pi) => {
      const h = 0.5 * dLoc(p.el), anchorS = p.ai.map((i) => p.cum[i]);
      if (p.flags) { // font glyphs: every vertex carries corner/smooth, independent of the slider [R6]
        for (const f of p.forced) {
          const pr = geom.project(p.P, p.cum, f.p, p.closed);
          if (pr.d > 1e-6 * diag) continue; // vertex removed with a shared stretch
          const t = FK.typing.turnAt(p.P, p.cum, p.closed, pr.s, h) || 0;
          peaks.push({ pi, s: pr.s, tau: t, tauSrc: t, p: f.p.slice(), forced: f.type, glyph: true });
        }
        return;
      }
      for (const pk of FK.typing.detect({ P: p.P, cum: p.cum, closed: p.closed, anchorS }, h, 20)) peaks.push({ pi, s: pk.s, tau: pk.tau, tauSrc: pk.tau, p: geom.pointAt(p.P, p.cum, pk.s, p.closed) });
    });
    // mirror-consistent typing: partners use their mean turn and sit at exactly mirrored places (a corner found one
    // sample off on one side would otherwise make the two sides differ); corners on the axis move onto the axis
    const epsSym = Math.max(0.006 * diag, 0.15 * dRef);
    const mirrorSpecs = [];
    if (axes.v !== null) mirrorSpecs.push({ el: null, v: axes.v });
    if (axes.h !== null) mirrorSpecs.push({ el: null, h: axes.h });
    for (const [el, ax] of elAxes) { if (ax.v !== null) mirrorSpecs.push({ el, v: ax.v }); if (ax.h !== null) mirrorSpecs.push({ el, h: ax.h }); }
    const mirFn = (sp) => (sp.v !== undefined ? (q) => [2 * sp.v - q[0], q[1]] : (q) => [q[0], 2 * sp.h - q[1]]);
    const moveTo = (pk, q) => { const p = paths[pk.pi], pr = geom.project(p.P, p.cum, q, p.closed); if (pr.d < epsSym) { pk.s = pr.s; pk.p = pr.p; } };
    for (const sp of mirrorSpecs) {
      const mir = mirFn(sp), mine = peaks.filter((pk) => sp.el === null || axisKey(paths[pk.pi].el) === sp.el), tolS = Math.min(epsSym, 0.3 * dRef);
      for (const pk of mine) {
        const mq = mir(pk.p);
        if (dist(mq, pk.p) < tolS) { moveTo(pk, [(pk.p[0] + mq[0]) / 2, (pk.p[1] + mq[1]) / 2]); continue; } // on the axis
        let best = null;
        for (const q of mine) { if (q === pk) continue; const d = dist(q.p, mq); if (d <= tolS && (!best || d < best.d)) best = { q, d }; }
        if (!best) continue;
        const q = best.q, m = (pk.tauSrc + q.tauSrc) / 2;
        pk.tau = m; q.tau = m;
        if (!pk.forced && !q.forced) { const target = [(pk.p[0] + mir(q.p)[0]) / 2, (pk.p[1] + mir(q.p)[1]) / 2]; moveTo(pk, target); moveTo(q, mir(pk.p)); }
      }
    }
    // user overrides (stored by position)
    const tolO = Math.max(0.01 * diag, 0.35 * dRef);
    const unmatched = [];
    for (const ov of o.overrides || []) {
      let best = null;
      for (const pk of peaks) { const d = dist(pk.p, ov.p); if (d <= tolO && (!best || d < best.d)) best = { pk, d }; }
      if (best) { best.pk.forced = ov.type; best.pk.user = true; continue; }
      if (ov.type !== "corner") { unmatched.push(ov); continue; }
      let bp = null;
      paths.forEach((p, pi) => { const pr = geom.project(p.P, p.cum, ov.p, p.closed); if (pr.d <= tolO && (!bp || pr.d < bp.d)) bp = { pi, pr }; });
      if (!bp) { unmatched.push(ov); continue; }
      const p = paths[bp.pi];
      const t = FK.typing.turnAt(p.P, p.cum, p.closed, bp.pr.s, 0.5 * dLoc(p.el));
      peaks.push({ pi: bp.pi, s: bp.pr.s, tau: t || 0, tauSrc: t || 0, p: bp.pr.p, forced: "corner", user: true, inserted: true });
    }
    const thr = o.cornerDeg - 1e-6;
    for (const pk of peaks) pk.corner = pk.forced === "corner" || (pk.forced !== "smooth" && pk.tau >= thr);
    for (const pk of peaks) if (pk.corner) { const id = addNode(pk.p, "corner", paths[pk.pi].el); nodes[id].tau = pk.tau; nodes[id].glyph = !!pk.glyph; pk.node = id; paths[pk.pi].bps.push({ s: pk.s, node: id }); }

    // ---- merge breakpoints closer than mergeD along each path (priority end > junction > corner) ----
    // two detected corners closer than 0.65 d cannot be shown as two drones anyway (a clump): keep the stronger one.
    // Font corners (glyph flags) are deliberate and only merge below 0.45 d like everything else.
    const mergeD = 0.45 * dRef;
    for (const p of paths) {
      const mergeD = 0.45 * dLoc(p.el), mergeCC = 0.65 * dLoc(p.el); // eslint: shadows the global ones on purpose
      p.bps = p.bps.filter((b) => !nodes[find(b.node)].dead);
      let again = true;
      while (again && p.bps.length > 1) {
        again = false;
        p.bps.sort((a, b) => a.s - b.s);
        const n = p.bps.length;
        for (let i = 0; i < (p.closed ? n : n - 1); i++) {
          const A = p.bps[i], B = p.bps[(i + 1) % n];
          if (A === B) continue;
          let gap = B.s - A.s; if (p.closed && i === n - 1) gap += p.L;
          const ra = find(A.node), rb = find(B.node);
          if (ra === rb) { if (gap < mergeD) { p.bps.splice((i + 1) % n, 1); again = true; break; } continue; }
          const na = nodes[ra], nb = nodes[rb];
          if (gap >= (na.kind === "corner" && nb.kind === "corner" && !na.glyph && !nb.glyph ? mergeCC : mergeD)) continue;
          // corners are local: drop the weaker one; ends/junctions are shared: union them
          if (na.kind === "corner" && nb.kind === "corner") { const drop = (na.tau || 0) >= (nb.tau || 0) ? B : A; nodes[find(drop.node)].dead = true; p.bps.splice(p.bps.indexOf(drop), 1); }
          else if (na.kind === "corner" || nb.kind === "corner") { const drop = na.kind === "corner" ? A : B; nodes[find(drop.node)].dead = true; p.bps.splice(p.bps.indexOf(drop), 1); }
          else { union(ra, rb); const keep = find(ra) === ra ? A : B; p.bps.splice(p.bps.indexOf(keep === A ? B : A), 1); }
          again = true; break;
        }
      }
    }
    // Pflichtpunkte of different paths that (almost) touch become one node
    {
      const live = [];
      for (const p of paths) for (const b of p.bps) { const r = find(b.node); if (!nodes[r].dead && !live.includes(r)) live.push(r); }
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = find(live[i]), b = find(live[j]);
        if (a !== b && dist(nodes[a].p, nodes[b].p) < mergeD) { union(a, b); stats.merged = (stats.merged || 0) + 1; }
      }
      for (const p of paths) { // drop duplicate references to one node that are now adjacent at the same place
        p.bps = p.bps.filter((b, i, arr) => arr.findIndex((c) => find(c.node) === find(b.node) && Math.abs(c.s - b.s) < mergeD) === i);
      }
    }
    // seeds for loops without any Pflichtpunkt (G-5): on the vertical axis at max y, else the topmost point
    for (const p of paths) {
      if (!p.closed || p.bps.length) continue;
      let best = null;
      const axv = axes.v !== null ? axes.v : elAxes.has(axisKey(p.el)) ? elAxes.get(axisKey(p.el)).v : null;
      if (axv !== null) {
        const m = p.P.length;
        for (let i = 0; i < m; i++) {
          const a = p.P[i], b = p.P[(i + 1) % m];
          if ((a[0] - axv) * (b[0] - axv) > 0 || a[0] === b[0]) continue;
          const t = (axv - a[0]) / (b[0] - a[0]), y = a[1] + (b[1] - a[1]) * t;
          if (!best || y > best.p[1]) best = { s: p.cum[i] + t * (p.cum[i + 1] - p.cum[i]), p: [axv, y] };
        }
      }
      if (!best) {
        let bi = 0;
        p.P.forEach((q, i) => { if (q[1] > p.P[bi][1] + 1e-9 || (Math.abs(q[1] - p.P[bi][1]) <= 1e-9 && q[0] < p.P[bi][0])) bi = i; });
        best = { s: p.cum[bi], p: p.P[bi].slice() };
      }
      const id = addNode(best.p, "seed", p.el);
      p.bps.push({ s: best.s, node: id });
    }

    // ---- final nodes (union representatives), edges ----
    const idMap = new Map(), outNodes = [];
    const rep = (i) => {
      const r = find(i);
      if (!idMap.has(r)) { idMap.set(r, outNodes.length); outNodes.push({ id: outNodes.length, p: nodes[r].p.slice(), kind: nodes[r].kind, el: nodes[r].el, tau: nodes[r].tau, deg: 0, edges: [] }); }
      return idMap.get(r);
    };
    const edges = [];
    paths.forEach((p, pi) => (p.pi = pi));
    for (const p of paths) {
      const bps = p.bps.slice().sort((a, b) => a.s - b.s);
      const n = bps.length;
      if (!n) continue;
      const pairs = [];
      for (let i = 0; i < n - 1; i++) pairs.push([bps[i], bps[i + 1], bps[i + 1].s]);
      if (p.closed) pairs.push([bps[n - 1], bps[0], bps[0].s + p.L]);
      for (const [A, B, sB] of pairs) {
        if (sB - A.s <= 1e-9 * (p.L || 1)) continue;
        const a = rep(A.node), b = rep(B.node);
        const Q = FK.geom.slice(p.P, p.cum, A.s, sB, p.closed);
        Q[0] = outNodes[a].p.slice(); Q[Q.length - 1] = outNodes[b].p.slice();
        let L = 0; for (let i = 1; i < Q.length; i++) L += dist(Q[i], Q[i - 1]);
        if (L <= 1e-9 || (a === b && L < 0.3 * dLoc(p.el))) continue; // tiny loop at a node: no drone of its own
        const e = { id: edges.length, a, b, Q, L, el: p.el, path: p.pi, closedPath: p.closed };
        edges.push(e);
        outNodes[a].deg++; outNodes[b].deg++;
        outNodes[a].edges.push({ e: e.id, end: 0 }); outNodes[b].edges.push({ e: e.id, end: 1 });
      }
    }
    // dots: one per spot (hugeicons draw a dot as a tiny line + tiny circle), none right on a line
    for (const sp of specks) {
      if (sp.kind !== "dot") continue;
      const twin = specks.find((o) => o !== sp && o.node !== undefined && dist(o.p, sp.p) < mergeD);
      const onLine = paths.some((p) => FK.geom.project(p.P, p.cum, sp.p, p.closed).d < 0.5 * dRef);
      if (twin || onLine) { sp.kind = "drop"; sp.why = twin ? "doppelt" : "auf Linie"; continue; }
      const id = outNodes.length; outNodes.push({ id, p: sp.p.slice(), kind: "dot", el: sp.el, deg: 0, edges: [] }); sp.node = id;
    }
    // font dots (umlauts, i/!/?/. dots) are always single drones
    for (const el of elInfo.values()) for (const p of el.dots || []) {
      const id = outNodes.length; outNodes.push({ id, p: p.slice(), kind: "dot", el: el.id, deg: 0, edges: [] });
    }
    const flagEl = new Set([...elInfo.values()].filter((e) => e.typing === "flags").map((e) => e.id));
    for (const nd of outNodes) {
      if (nd.kind === "dot") continue;
      if (nd.deg === 1) nd.kind = "end";
      else if (nd.deg >= 3) nd.kind = "junction";
      else if (nd.deg === 2 && nd.kind === "end") nd.kind = flagEl.has(nd.el) ? "corner" : "junction"; // two glyph strokes meeting end to end
    }

    // stroke ends of outlines ("caps"): a short edge between two corners where the outline turns back (U-turn), like
    // the flat end of a bold letter stroke. The allocation may keep it as a one-interval bridge (plan.js), so the end
    // shows as two drones and does not drag the spacing of the rest.
    const cosCap = Math.cos((50 * Math.PI) / 180);
    const insideElement = (el, q) => { // even-odd over the closed outlines of one filled element
      let inside = false;
      for (const p of paths) {
        if (p.el !== el || !p.closed) continue;
        const P = p.P;
        for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > q[1]) !== (P[j][1] > q[1]) && q[0] < ((P[j][0] - P[i][0]) * (q[1] - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
      }
      return inside;
    };
    for (const e of edges) {
      if (e.a === e.b || e.L > 2.6 * dLoc(e.el)) continue;
      const na = outNodes[e.a], nb = outNodes[e.b];
      if (na.kind !== "corner" || nb.kind !== "corner" || na.deg !== 2 || nb.deg !== 2) continue;
      const oa = na.edges.find((x) => x.e !== e.id), ob = nb.edges.find((x) => x.e !== e.id);
      if (!oa || !ob) continue;
      const leave = (x, nd) => {
        const Q = edges[x.e].Q, cum = FK.geom.cumLen(Q, false), L = cum[cum.length - 1], far = Math.min(0.4 * dRef, L);
        const q = x.end === 0 ? FK.geom.pointAt(Q, cum, far, false) : FK.geom.pointAt(Q, cum, L - far, false);
        const dx = q[0] - nd.p[0], dy = q[1] - nd.p[1], l = Math.hypot(dx, dy) || 1;
        return [dx / l, dy / l];
      };
      const da = leave(oa, na), db = leave(ob, nb);
      if (da[0] * db[0] + da[1] * db[1] <= cosCap) continue;
      // a stroke end has the stroke between its two sides; the same U-shape between two arms (inside of an E) has air
      if (paths[e.path] && paths[e.path].kind === "fill") {
        const cum = FK.geom.cumLen(e.Q, false), mid = FK.geom.pointAt(e.Q, cum, e.L / 2, false);
        const ux = da[0] + db[0], uy = da[1] + db[1], ul = Math.hypot(ux, uy) || 1, step = 0.25 * Math.min(e.L, dRef);
        const q = [mid[0] + (ux / ul) * step, mid[1] + (uy / ul) * step];
        if (!insideElement(e.el, q)) continue;
      }
      e.cap = true;
    }

    // ---- mirror groups (§6.3) ----
    const groups = [], symInfo = { v: false, h: false };
    if (o.symmetry !== false) {
      const epar = edges.map((_, i) => i), ef = (i) => (epar[i] === i ? i : (epar[i] = ef(epar[i])));
      const nodeNear = (q) => { let best = null; for (const nd of outNodes) { const d = dist(nd.p, q); if (d <= epsSym && (!best || d < best.d)) best = { id: nd.id, d }; } return best ? best.id : -1; };
      const mid = (e) => { const cum = FK.geom.cumLen(e.Q, false); return FK.geom.pointAt(e.Q, cum, e.L / 2, false); };
      const mids = edges.map(mid);
      symInfo.elements = 0;
      for (const sp of mirrorSpecs) {
        const mir = mirFn(sp), key = sp.v !== undefined ? "v" : "h";
        const list = sp.el === null ? edges : edges.filter((e) => axisKey(e.el) === sp.el);
        if (!list.length) continue;
        const pairs = [];
        let ok = true;
        for (const e of list) {
          const ma = nodeNear(mir(outNodes[e.a].p)), mb = nodeNear(mir(outNodes[e.b].p)), mm = mir(mids[e.id]);
          let partner = -1;
          for (const f of list) {
            if (!((f.a === ma && f.b === mb) || (f.a === mb && f.b === ma))) continue;
            if (Math.abs(f.L - e.L) > 0.03 * e.L + 0.02 * dRef) continue;
            if (dist(mids[f.id], mm) > 2 * epsSym) continue;
            partner = f.id; break;
          }
          if (partner < 0) { ok = false; break; }
          if (partner !== e.id) pairs.push([e.id, partner]);
        }
        if (!ok) continue;
        if (sp.el === null) symInfo[key] = true; else symInfo.elements++;
        for (const [a, b] of pairs) { const ra = ef(a), rb = ef(b); if (ra !== rb) epar[rb] = ra; }
      }
      const gm = new Map();
      edges.forEach((e) => { const r = ef(e.id); if (!gm.has(r)) gm.set(r, []); gm.get(r).push(e.id); });
      for (const g of gm.values()) if (g.length > 1) groups.push(g);
    }

    // candidates for the "Ecken" step (all turn peaks; corner = became a Pflichtpunkt)
    const candidates = peaks.map((pk) => ({ p: pk.p, tau: pk.tau, corner: !!pk.corner && pk.node !== undefined && !nodes[find(pk.node)].dead, forced: pk.forced || null, user: !!pk.user, el: paths[pk.pi].el }));
    return {
      nodes: outNodes, edges, groups, axes, sym: symInfo, specks, stats, candidates, unmatched,
      dRef, epsJ, bbox: bb, total, ...textInfo(elInfo, paths), elements: [...elInfo.values()].map((e) => ({ id: e.id, name: e.name, color: e.color, kind: e.kind, item: e.item })),
      paths: paths.map((p) => ({ el: p.el, P: p.P, closed: p.closed, L: p.L })),
    };
  }

  // text statistics: glyph count, text share (for the text tiers), outline letters and their stroke width
  function textInfo(elInfo, paths) {
    const els = [...elInfo.values()], textEls = new Set(els.filter((e) => e.text).map((e) => e.id));
    const all = paths.reduce((a, p) => a + p.L, 0), txt = paths.filter((p) => textEls.has(p.el)).reduce((a, p) => a + p.L, 0);
    const sw = els.filter((e) => e.textOutline && e.strokeW > 0).map((e) => e.strokeW).sort((x, y) => x - y);
    return { nGlyphs: textEls.size, isText: all > 0 && txt >= 0.5 * all, textOutline: sw.length > 0, strokeW: sw.length ? sw[Math.floor(sw.length / 2)] : 0 };
  }
  function empty() {
    return { nodes: [], edges: [], groups: [], axes: { v: null, h: null }, sym: { v: false, h: false }, specks: [], stats: { seams: 0, joins: 0, snaps: 0, crossings: 0, overlaps: [] }, candidates: [], unmatched: [], dRef: 1, epsJ: 0, bbox: FK.geom.bbox([[0, 0]]), total: 0, elements: [], paths: [] };
  }

  FK.graph = { build, detectAxes, cleanPath };
})(FK);
