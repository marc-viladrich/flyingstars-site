import FK from "./fk.js";
// copied from formations-werkzeug/core/text.js by tools/sync-formwerk.js – edit there, then sync
// Text -> elements (SPEC §5.3): one element per glyph, up to 3 centred lines. Gaps are multiples of the drone spacing
// d (letter 1.2 d, word 3 d like the hand-built show-8 text, line gap max(3 d, 0.75 cap)); d comes from a two-step
// fixed point at the target count, and the layout is then shared by every candidate of the count strip [R11].
// Optional (opts.optical): letters spaced by their closest ink instead of their boxes, gaps also as a share of the cap
// height (opts.letterGapCap / wordGapCap) – see pairGap.
// Curved runs (smooth vertices) are centripetal Catmull-Rom splines; glyph corners carry forced "corner" flags, so
// text typing never depends on the corner slider [R6].
(function (FK) {
  "use strict";
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // samples of the centripetal Catmull-Rom span p1 -> p2 (p2 excluded)
  function span(p0, p1, p2, p3, per, out) {
    const t0 = 0, t1 = t0 + Math.sqrt(dist(p0, p1)) || 1e-9, t2 = t1 + (Math.sqrt(dist(p1, p2)) || 1e-9), t3 = t2 + (Math.sqrt(dist(p2, p3)) || 1e-9);
    const mix = (a, b, ta, tb, t) => { const u = tb - ta < 1e-12 ? 0 : (t - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
    for (let k = 0; k < per; k++) {
      const t = t1 + ((t2 - t1) * k) / per;
      const A1 = mix(p0, p1, t0, t1, t), A2 = mix(p1, p2, t1, t2, t), A3 = mix(p2, p3, t2, t3, t);
      const B1 = mix(A1, A2, t0, t2, t), B2 = mix(A2, A3, t1, t3, t);
      out.push(mix(B1, B2, t1, t2, t));
    }
  }
  const refl = (a, b) => [2 * b[0] - a[0], 2 * b[1] - a[1]]; // a mirrored through b

  // glyph stroke (font units, offset applied) -> { pts, closed, anchors, forced:[{p,type}] }
  function strokePath(stroke, ox, oy) {
    let V = stroke.map((q) => ({ p: [q[0] + ox, q[1] + oy], smooth: q[2] === "s" }));
    const closed = V.length > 2 && dist(V[0].p, V[V.length - 1].p) < 1e-9;
    if (closed) V.pop();
    const n = V.length, per = 10;
    const pts = [], anchors = [];
    if (closed && V.every((v) => v.smooth)) { // round loop (O, 0): closed spline
      for (let i = 0; i < n; i++) { anchors.push(pts.length); span(V[(i - 1 + n) % n].p, V[i].p, V[(i + 1) % n].p, V[(i + 2) % n].p, per, pts); }
    } else {
      if (closed) { const k = V.findIndex((v) => !v.smooth); V = V.slice(k).concat(V.slice(0, k)); V.push(V[0]); } // start at a corner, end back on it
      const m = V.length;
      const isBreak = (i) => i === 0 || i === m - 1 || !V[i].smooth;
      let i = 0;
      while (i < m - 1) {
        let j = i + 1;
        while (!isBreak(j)) j++;
        const run = V.slice(i, j + 1).map((v) => v.p);
        if (run.length === 2) { anchors.push(pts.length); pts.push(run[0].slice()); }
        else {
          const ext = [refl(run[1], run[0]), ...run, refl(run[run.length - 2], run[run.length - 1])];
          for (let k = 1; k < ext.length - 2; k++) { anchors.push(pts.length); span(ext[k - 1], ext[k], ext[k + 1], ext[k + 2], per, pts); }
        }
        i = j;
      }
      if (!closed) { anchors.push(pts.length); pts.push(V[m - 1].p.slice()); }
      else V.pop();
    }
    // forced typing of the glyph vertices (open ends are always Pflichtpunkte anyway)
    const forced = [];
    V.forEach((v, i) => { if (closed || (i > 0 && i < V.length - 1)) forced.push({ p: v.p.slice(), type: v.smooth ? "smooth" : "corner" }); });
    return { pts, closed, anchors, forced };
  }

  // optical spacing: two neighbouring letters are placed so that their closest ink (the closest drones) is exactly the
  // gap apart – measured as a real distance, also across rows (the bar of the T against the shoulder of the O). Box
  // spacing leaves W A or T ? much wider apart than E H; this keeps every pair and every word break even.
  const ROW_H = 0.125, ROW_LO = -3.5, ROWS = 104; // thin rows from the descenders up to the accents
  function inkProfile(polys, dots) { // leftmost and rightmost ink per row
    const L = new Array(ROWS).fill(Infinity), R = new Array(ROWS).fill(-Infinity);
    let x0 = Infinity, x1 = -Infinity;
    const row = (y) => Math.floor((y - ROW_LO) / ROW_H);
    const add = (k, x) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (k < 0 || k >= ROWS) return; if (x < L[k]) L[k] = x; if (x > R[k]) R[k] = x; };
    for (const { pts, closed } of polys) {
      const m = pts.length;
      if (m === 1) { add(row(pts[0][1]), pts[0][0]); continue; }
      for (let i = 0; i < (closed ? m : m - 1); i++) {
        const a = pts[i], b = pts[(i + 1) % m], y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
        for (let k = Math.max(0, row(y0)); k <= Math.min(ROWS - 1, row(y1)); k++) {
          if (b[1] === a[1]) { add(k, a[0]); add(k, b[0]); continue; }
          const r0 = ROW_LO + k * ROW_H, ta = (Math.max(y0, r0) - a[1]) / (b[1] - a[1]), tb = (Math.min(y1, r0 + ROW_H) - a[1]) / (b[1] - a[1]);
          add(k, a[0] + (b[0] - a[0]) * ta); add(k, a[0] + (b[0] - a[0]) * tb);
        }
      }
    }
    for (const p of dots) add(row(p[1]), p[0]);
    return { L, R, x0, x1 };
  }
  // offset from the origin of glyph A to the origin of glyph B: the closest ink of the two ends up exactly gap apart
  function pairGap(A, B, gap) {
    let t = -Infinity;
    const kr = Math.ceil(gap / ROW_H);
    for (let k = 0; k < ROWS; k++) {
      if (B.L[k] === Infinity) continue;
      for (let j = Math.max(0, k - kr); j <= Math.min(ROWS - 1, k + kr); j++) {
        if (A.R[j] === -Infinity) continue;
        const dy = Math.abs(k - j) * ROW_H;
        if (dy < gap) t = Math.max(t, A.R[j] - B.L[k] + Math.sqrt(gap * gap - dy * dy));
      }
    }
    return t === -Infinity ? A.x1 - B.x0 + gap : t; // nothing within reach (' next to .): boxes
  }

  function splitLines(text) {
    return String(text || "").replace(/\r/g, "").split(/\n|\|/).map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length).slice(0, 3);
  }

  // layout in font units; d = drone spacing in font units.
  // style "stroke" = single line glyphs (flags type the corners); style "outline" = the letters as filled shapes whose
  // outline carries the drones (outer contour + holes), from opts.shapeFor(ch, glyph) or FS Einstrich thickened.
  function layout(text, opts) {
    const o = Object.assign({ d: 1.2, letterGapD: 1.2, wordGapD: 3.0, lineGapCap: 0.75, color: "#ff9e29", caps: true, style: "stroke", italic: false, strokeFrac: 0.22 }, opts || {});
    const lines = splitLines(text), unknown = new Set(), CAP = FK.font.CAP, outline = o.style === "outline";
    const letterGap = Math.max(o.letterGapD * o.d, (o.letterGapCap || 0) * CAP), wordGap = Math.max(o.wordGapD * o.d, (o.wordGapCap || 0) * CAP), lineGap = Math.max(3 * o.d, o.lineGapCap * CAP);
    const sh = (p) => (o.italic ? [p[0] + p[1] * FK.outline.SHEAR, p[1]] : [p[0], p[1]]);
    const half = (o.strokeFrac * CAP) / 2;
    const optical = !!o.optical;
    const rows = lines.map((line) => {
      const gl = [];
      let x = 0, words = line.split(" "), wi = 0, newWord = false;
      for (const ch of Array.from(line)) {
        if (ch === " ") { newWord = true; wi++; continue; }
        let g = FK.font.glyph(ch, o.caps), c = ch === "ß" || !o.caps ? ch : ch.toUpperCase();
        if (!g && !(outline && o.shapeFor)) { unknown.add(ch); g = FK.font.glyph("?"); c = "?"; }
        let shape = null, ix0, ix1, lo, hi;
        if (outline) {
          shape = o.shapeFor ? o.shapeFor(c, g) : FK.outline.skeletonShape(c, g, half, o.italic);
          if (!shape || !shape.contours.length) { unknown.add(ch); shape = FK.outline.skeletonShape("?", FK.font.glyph("?"), half, o.italic); }
          ix0 = shape.bbox.x0; ix1 = shape.bbox.x1; lo = shape.bbox.y0; hi = shape.bbox.y1;
        } else {
          const pts = g.strokes.flat().map(sh);
          ix0 = pts.length ? Math.min(...pts.map((p) => p[0])) : 0; ix1 = pts.length ? Math.max(...pts.map((p) => p[0])) : g.w;
          if (!o.italic) { ix0 = Math.min(ix0, 0); ix1 = Math.max(ix1, g.w); }
          lo = pts.length ? Math.min(0, ...pts.map((p) => p[1])) : 0; hi = pts.length ? Math.max(...pts.map((p) => p[1])) : CAP;
        }
        const gap = gl.length ? (newWord ? wordGap : letterGap) : 0;
        newWord = false;
        if (optical) {
          const polys = outline ? shape.contours.map((cc) => ({ pts: cc, closed: true })) : g.strokes.map((st) => { const P = strokePath(st, 0, 0); return { pts: P.pts.map(sh), closed: P.closed }; });
          const prof = inkProfile(polys, outline ? [] : (g.dots || []).map(sh)), prev = gl[gl.length - 1];
          const at = prev ? prev.x + pairGap(prev.prof, prof, gap) : -prof.x0;
          gl.push({ ch: c, g, shape, x: at, word: words[wi] || "", lo, hi, prof });
          x = Math.max(x, at + prof.x1);
          continue;
        }
        x += gap;
        gl.push({ ch: c, g, shape, x: x - ix0, word: words[wi] || "", lo, hi });
        x += ix1 - ix0;
      }
      let lo = 0, hi = gl.length ? -Infinity : CAP;
      for (const q of gl) { lo = Math.min(lo, q.lo); hi = Math.max(hi, q.hi); }
      return { gl, width: x, lo, hi: Math.max(hi, 0) };
    });
    const elements = [];
    let n = 0, yBase = 0;
    rows.forEach((row, li) => {
      if (li > 0) yBase -= -rows[li - 1].lo + lineGap + row.hi; // descent of the line above + gap + ascent of this line
      const x0 = -row.width / 2, y0 = yBase;
      for (const q of row.gl) {
        n++;
        const name = `„${q.ch}“ in ${o.caps ? q.word.toUpperCase() : q.word}`, text = { ch: q.ch, line: li, word: q.word };
        if (outline) {
          const paths = q.shape.contours.map((c) => ({ pts: c.map((p) => [x0 + q.x + p[0], y0 + p[1]]), closed: true, anchors: [] }));
          elements.push({ id: "t" + n, name, color: o.color, kind: "fill", textOutline: true, strokeW: q.shape.strokeW, text, paths, dots: [] });
        } else {
          const paths = q.g.strokes.map((st) => { const P = strokePath(st, 0, 0); return { pts: P.pts.map((p) => { const s = sh(p); return [x0 + q.x + s[0], y0 + s[1]]; }), closed: P.closed, anchors: P.anchors, forced: P.forced.map((f) => { const s = sh(f.p); return { p: [x0 + q.x + s[0], y0 + s[1]], type: f.type }; }) }; });
          const dots = (q.g.dots || []).map((p) => { const s = sh(p); return [x0 + q.x + s[0], y0 + s[1]]; });
          elements.push({ id: "t" + n, name, color: o.color, kind: "stroke", typing: "flags", text, paths, dots });
        }
      }
    });
    return { elements, unknown: [...unknown], lines, cap: CAP, d: o.d, style: o.style };
  }

  function strokeLength(els) {
    let L = 0;
    for (const e of els) for (const p of e.paths) { const c = FK.geom.cumLen(p.pts, p.closed); L += c[c.length - 1]; }
    return L;
  }

  // fixed point at the target count: gaps in d depend on d, d depends on the layout (two iterations)
  function build(text, targetN, opts, planOpts) {
    let lay = layout(text, Object.assign({}, opts, { d: 1 }));
    if (!lay.elements.length) return lay;
    const nDots = lay.elements.reduce((a, e) => a + e.dots.length, 0);
    let d = strokeLength(lay.elements) / Math.max(4, targetN - nDots);
    for (let it = 0; it < 2; it++) {
      lay = layout(text, Object.assign({}, opts, { d }));
      const g = FK.graph.build(lay.elements, { targetN });
      const st = Object.assign({}, FK.plan.DEFAULTS, planOpts || {}, { targetN });
      let c = FK.plan.evaluate(g, targetN, st, false);
      if (!c.feasible) c = FK.plan.evaluate(g, targetN - 1, st, false);
      if (c.feasible && c.dTu > 0) d = c.dTu;
    }
    return layout(text, Object.assign({}, opts, { d }));
  }

  FK.text = { layout, build, splitLines, strokePath };
})(FK);
