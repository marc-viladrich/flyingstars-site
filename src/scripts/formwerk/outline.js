import FK from "./fk.js";
// copied from formations-werkzeug/core/outline.js by tools/sync-formwerk.js – edit there, then sync
// Outline letters: a glyph becomes a filled shape whose outline carries the drones (outer contour + holes).
// Source 1 (here, runs everywhere): the "FS Einstrich" strokes thickened, flat ends and round joins ("FS Einstrich fett").
// Source 2 (browser, app/fontsource.js): installed system fonts rendered on a canvas; both end in fieldToShape().
(function (FK) {
  "use strict";
  const SHEAR = Math.tan((12 * Math.PI) / 180); // "Kursiv"

  // scalar field -> contours in font units (y up), simplified; toFu maps pixel [x, y] -> font units
  function fieldToShape(field, w, h, level, toFu, tolPx, minThick) {
    const raw = FK.trace.contours(field, w, h, level);
    const contours = [];
    for (const c of raw) {
      const s = FK.trace.simplifyClosed(c, tolPx || 0.25).map(toFu);
      if (s.length < 3) continue;
      const a = Math.abs(FK.trace.area(s)), cum = FK.geom.cumLen(s, true), per = cum[cum.length - 1];
      if (a <= 1e-4 || (minThick && (2 * a) / per < minThick)) continue; // specks and slits thinner than a drone can show
      contours.push(s);
    }
    return shapeInfo(contours);
  }
  // ink box, filled area and mean stroke width (2 * area / perimeter: exact for long strokes of constant width)
  function shapeInfo(contours) {
    const pts = contours.flat(), b = pts.length ? FK.geom.bbox(pts) : FK.geom.bbox([[0, 0]]);
    let area = 0, per = 0;
    for (const c of contours) { area += FK.trace.area(c); const cum = FK.geom.cumLen(c, true); per += cum[cum.length - 1]; }
    return { contours, bbox: b, area: Math.abs(area), strokeW: per > 0 ? (2 * Math.abs(area)) / per : 0 };
  }

  // FS Einstrich glyph -> thick strokes: flat ends cut level like a typeface, round joins; half = half the stroke width.
  // Each stroke end cuts only the last piece of its own stroke (its "end zone"): a bowl that ends on its own stem (P, R,
  // B, 6, 9, e) must not cut into that stem. Stems ending on a guide line reach half a stroke beyond it, like the outer
  // edge of a horizontal stroke lying on that line (E foot, S bowl), so all letters get the same height.
  const cache = new Map();
  function skeletonShape(ch, glyph, half, italic) {
    const key = ch + "|" + half.toFixed(3) + "|" + (italic ? 1 : 0);
    if (cache.has(key)) return cache.get(key);
    const sh = (p) => (italic ? [p[0] + p[1] * SHEAR, p[1]] : p);
    const onGuide = (y) => [0, 6, 4, -2].some((g) => Math.abs(y - g) < 0.3); // baseline, cap line, x-height, descender
    // cut direction: horizontal for (near) vertical strokes and on guide lines, vertical for (near) horizontal strokes
    const dir = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1]; return Math.abs(dy) >= Math.abs(dx) || (onGuide(a[1]) && Math.abs(dy) > 0.6 * Math.abs(dx)) ? [0, Math.sign(dy) || 1] : [Math.sign(dx) || 1, 0]; };
    const pieces = [], dots = [];
    for (const st of glyph.strokes) {
      const P = FK.text.strokePath(st, 0, 0), pts = P.pts.map(sh);
      const m = P.closed ? pts.length : pts.length - 1, segs = [];
      for (let i = 0; i < m; i++) segs.push({ a: pts[i], b: pts[(i + 1) % pts.length], cuts: [] });
      if (!P.closed && pts.length >= 2) {
        const cum = [0];
        for (const s of segs) cum.push(cum[cum.length - 1] + Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]));
        const L = cum[cum.length - 1], extra = [];
        for (const [e, prev, atStart] of [[pts[0], pts[1], true], [pts[pts.length - 1], pts[pts.length - 2], false]]) {
          const u = dir(e, prev);
          let cut = { e, u }, k = 0;
          if (u[0] === 0 && onGuide(e[1])) {
            const tx = e[0] - prev[0], ty = e[1] - prev[1], tl = Math.hypot(tx, ty) || 1, ut = [tx / tl, ty / tl];
            k = half / Math.max(0.3, Math.abs(ut[1])) + 0.05;
            cut = { e: [e[0], e[1] + u[1] * half], u };
            extra.push({ a: e, b: [e[0] + ut[0] * k, e[1] + ut[1] * k], cuts: [cut] });
          }
          const zone = 2 * half + k;
          segs.forEach((s, i) => { if (atStart ? cum[i] < zone : cum[i + 1] > L - zone) s.cuts.push(cut); });
        }
        segs.push(...extra);
      }
      pieces.push(...segs);
    }
    // dots (umlauts, i, j, !, ?): thickened they must stay apart from the letter and from each other
    const dotR = half * 1.15, top = Math.max(-Infinity, ...glyph.strokes.flat().map((p) => p[1])) + half;
    const dts = (glyph.dots || []).map((d) => [d[0], d[1]]);
    for (const d of dts) if (d[1] > top - half && d[1] - dotR < top + 0.8 * half) d[1] = top + 0.8 * half + dotR;
    if (dts.length === 2) {
      const cx = (dts[0][0] + dts[1][0]) / 2, need = 2 * dotR + 0.8 * half, gap = Math.abs(dts[1][0] - dts[0][0]);
      if (gap < need) { const s0 = dts[0][0] < dts[1][0] ? -1 : 1; dts[0][0] = cx + (s0 * need) / 2; dts[1][0] = cx - (s0 * need) / 2; }
    }
    for (const d of dts) dots.push(sh(d));
    const all = pieces.flatMap((s) => [s.a, s.b]).concat(dots);
    if (!all.length) { const r = shapeInfo([]); cache.set(key, r); return r; }
    const b = FK.geom.bbox(all), ppu = 24, pad = half + 3 / ppu;
    const x0 = b.x0 - pad, y1 = b.y1 + pad, w = Math.ceil((b.w + 2 * pad) * ppu) + 1, h = Math.ceil((b.h + 2 * pad) * ppu) + 1;
    const f = new Float32Array(w * h).fill(-1e9);
    const R = half + 2 / ppu;
    const stamp = (bx0, by0, bx1, by1, fn) => {
      const i0 = Math.max(0, Math.floor((bx0 - x0) * ppu)), i1 = Math.min(w - 1, Math.ceil((bx1 - x0) * ppu));
      const j0 = Math.max(0, Math.floor((y1 - by1) * ppu)), j1 = Math.min(h - 1, Math.ceil((y1 - by0) * ppu));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const v = fn(x0 + i / ppu, y1 - j / ppu), k = j * w + i; if (v > f[k]) f[k] = v; }
    };
    for (const { a, b: c, cuts } of pieces) {
      const vx = c[0] - a[0], vy = c[1] - a[1], ll = vx * vx + vy * vy;
      stamp(Math.min(a[0], c[0]) - R, Math.min(a[1], c[1]) - R, Math.max(a[0], c[0]) + R, Math.max(a[1], c[1]) + R, (x, y) => {
        const t = ll > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / ll)) : 0;
        let v = half - Math.hypot(a[0] + vx * t - x, a[1] + vy * t - y);
        for (const cu of cuts) v = Math.min(v, -((x - cu.e[0]) * cu.u[0] + (y - cu.e[1]) * cu.u[1]));
        return v;
      });
    }
    for (const p of dots) stamp(p[0] - dotR - 0.1, p[1] - dotR - 0.1, p[0] + dotR + 0.1, p[1] + dotR + 0.1, (x, y) => dotR - Math.hypot(p[0] - x, p[1] - y));
    const res = fieldToShape(f, w, h, 0, (q) => [x0 + q[0] / ppu, y1 - q[1] / ppu], 0.2, 0.35 * half);
    cache.set(key, res);
    return res;
  }

  FK.outline = { fieldToShape, shapeInfo, skeletonShape, SHEAR };
})(FK);
