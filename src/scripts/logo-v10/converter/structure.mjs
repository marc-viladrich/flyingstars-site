// Step 2: containment tree, widths, figure/ground by narrowness, draw masks, tile detection.
import { insideDistance } from './dt.mjs';
import { labDist } from './color.mjs';

const KAPPA = 0.6;       // a child is "narrow" (figure) when its width < KAPPA * the ink depth around it
const TILE_FILL = 0.82;  // draw mask area / bbox area above which a container is a tile
const TILE_COVER = 0.5;  // tile bbox must cover this share of the logo bbox

function median(a) { if (!a.length) return 0; const b = Float64Array.from(a).sort(); return b[b.length >> 1]; }
function pct(a, q) { if (!a.length) return 0; const b = Float64Array.from(a).sort(); return b[Math.min(b.length - 1, Math.floor(b.length * q))]; }

// local mask of region set within a bbox
function localMask(seg, x0, y0, w, h, test) {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (test(seg.id[(y + y0) * seg.W + x + x0], (y + y0) * seg.W + x + x0)) m[y * w + x] = 1;
  return m;
}

function ridgeOf(dt, w, h) {
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = dt[y * w + x];
    if (v < 1) continue;
    let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      if (dt[Y * w + X] > v + 1e-6) { ok = false; break; }
    }
    if (ok) out.push(y * w + x);
  }
  return out;
}

// v7: opts.flat (the schematic picture of a crest, schematic.mjs): every opaque region is a figure drawn in its own colour,
// filled into the figure around it (so a nested boundary is drawn once, by the inner field), and nothing is a tile
export function structure(seg, opts = {}) {
  const flat = !!opts.flat;
  const { W, H, id, regions } = seg;
  const K = regions.length;
  for (const g of regions) { g.children = []; g.parent = -1; g.holeLabels = null; }
  // --- holes and containment
  const holeOf = new Array(K).fill(null); // local hole masks
  for (const g of regions) {
    if (g.id === 0) continue;
    const x0 = Math.max(0, g.x0 - 1), y0 = Math.max(0, g.y0 - 1), x1 = Math.min(W - 1, g.x1 + 1), y1 = Math.min(H - 1, g.y1 + 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const reach = new Uint8Array(w * h);
    const st = [];
    const inR = (x, y) => id[(y + y0) * W + x + x0] === g.id;
    const seed = (x, y) => { const k = y * w + x; if (!reach[k] && !inR(x, y)) { reach[k] = 1; st.push(k); } };
    for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
    for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
    while (st.length) {
      const k = st.pop(), x = k % w, y = (k - x) / w;
      if (x > 0) seed(x - 1, y); if (x < w - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < h - 1) seed(x, y + 1);
    }
    const hole = new Uint8Array(w * h);
    let ha = 0;
    const labels = new Set();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (!reach[k] && !inR(x, y)) { hole[k] = 1; ha++; labels.add(id[(y + y0) * W + x + x0]); }
    }
    g.box = { x0, y0, w, h };
    g.holeArea = ha;
    g.fillArea = g.area + ha;
    holeOf[g.id] = hole;
    g.holeLabels = labels;
  }
  for (const g of regions) {
    if (g.id === 0) continue;
    for (const l of g.holeLabels) {
      const c = regions[l];
      if (c.id === 0) continue;
      if (c.parent < 0 || regions[c.parent].fillArea > g.fillArea) c.parent = g.id;
    }
  }
  for (const g of regions) if (g.id) { if (g.parent < 0) g.parent = 0; regions[g.parent].children.push(g.id); }

  // --- widths (own mask)
  const dtOwn = new Array(K).fill(null), ridge = new Array(K).fill(null);
  for (const g of regions) {
    if (!g.id) continue;
    const { x0, y0, w, h } = g.box;
    const m = localMask(seg, x0, y0, w, h, l => l === g.id);
    const dt = insideDistance(m, w, h);
    dtOwn[g.id] = dt;
    const r = ridgeOf(dt, w, h);
    ridge[g.id] = r;
    g.width = Math.max(1, 2 * pct(r.map(k => dt[k]), 0.75) - 1);
    let mx = 0; for (const k of r) if (dt[k] > mx) mx = dt[k];
    g.maxDepth = mx - 0.5;
  }
  // --- enclosure depth e(X) = how much parent ink lies beyond X
  for (const p of regions) {
    if (!p.id || !p.children.length) continue;
    const { x0, y0, w, h } = p.box;
    const hole = holeOf[p.id];
    const m = localMask(seg, x0, y0, w, h, l => l === p.id);
    for (let k = 0; k < w * h; k++) if (hole[k]) m[k] = 1;
    const dtF = insideDistance(m, w, h);
    for (const cid of p.children) {
      const c = regions[cid];
      const vals = [];
      for (const k of ridge[cid]) {
        const cx = k % c.box.w + c.box.x0, cy = Math.floor(k / c.box.w) + c.box.y0;
        vals.push(dtF[(cy - y0) * w + cx - x0] - dtOwn[cid][k]);
      }
      c.encl = Math.max(0, median(vals));
    }
  }
  // --- roles, top-down
  const order = [];
  const q = [0];
  while (q.length) { const g = q.shift(); order.push(g); for (const c of regions[g].children) q.push(c); }
  const nearWhite = lab => lab[0] > 0.92 && Math.hypot(lab[1], lab[2]) < 0.04;
  regions[0].role = 'ground';
  // class E: lettering or symbols inlaid in a solid shape (white SAP in the blue shape, OTTO in the red
  // diamond). Two or more wide children of one parent that stand in a row like glyphs are the figure: they are
  // drawn as normal lettering, and the parent contributes only its outer outline (it is filled across them).
  const inlay = new Set();
  for (const p of regions) {
    if (!p.id || !p.children.length) continue;
    const kids = p.children.map(c => regions[c]).filter(c => c.fillArea < 0.6 * p.fillArea && c.area > 30);
    // a single complex inlay (one connected word, a symbol with its own counters): not a plain counter
    for (const c of kids) {
      const solid = c.fillArea / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1));
      if (c.fillArea > 0.02 * p.fillArea && (c.children.length >= 1 || solid < 0.35)) inlay.add(c.id);
    }
    if (kids.length < 2) continue;
    const hs = kids.map(c => c.y1 - c.y0 + 1).sort((a, b) => a - b), mh = hs[hs.length >> 1];
    const row = kids.filter(c => c.fillArea < 0.4 * p.fillArea).filter(c => { const h = c.y1 - c.y0 + 1; return h > 0.6 * mh && h < 1.6 * mh; });
    if (row.length < 2) continue;
    const cy = row.map(c => (c.y0 + c.y1) / 2).sort((a, b) => a - b)[row.length >> 1];
    const line = row.filter(c => Math.abs((c.y0 + c.y1) / 2 - cy) < 0.3 * mh);
    if (line.length < 2) continue;
    let bx0 = Infinity, bx1 = -Infinity; for (const c of line) { bx0 = Math.min(bx0, c.x0); bx1 = Math.max(bx1, c.x1); }
    if (bx1 - bx0 + 1 < 1.3 * mh) continue;
    // glyphs stand side by side
    const byX = line.slice().sort((a, b) => a.x0 - b.x0);
    if (byX.some((c, i) => i && byX[i - 1].x1 - c.x0 > 0.3 * Math.min(c.x1 - c.x0, byX[i - 1].x1 - byX[i - 1].x0))) continue;
    // glyphs are not narrow strokes of the parent (those are knock-outs) and not one dominant hole
    for (const c of line) { inlay.add(c.id); c.inlayRow = true; }
  }
  for (const gid of order) {
    if (!gid) continue;
    const g = regions[gid], p = regions[g.parent];
    g.fillInto = -1;
    if (p.role === 'ground') {
      g.role = g.isBg ? 'ground' : 'figure';
      g.drawLab = g.lab;
    } else {
      // narrow relative to the ink around it, or a small inlay that is still thinner than that ink (a letter
      // near the edge of its tile)
      // a region that holds figures of its own (the sky inside a ring around a pinwheel) is ground, not a stroke
      let kidArea = 0; for (const c of g.children) kidArea += regions[c].fillArea;
      const holds = kidArea > 0.15 * g.fillArea;
      const narrow = !holds && (g.width < KAPPA * g.encl || (g.fillArea < 0.12 * p.fillArea && g.width < g.encl));
      // v4: inside a figure that is itself drawn within its container (the white rune cut into the blue
      // Bluetooth lozenge), a piece in the container's colour is the container showing through: a counter of
      // that figure, not ink. (A thin one is still drawn: simplify.mjs turns long thin counters into slot lines.)
      if (flat && !g.isBg) { g.role = 'figure'; g.fillInto = p.id; g.drawLab = g.lab; g.knockout = false; continue; }
      const cont = p.fillInto > 0 ? regions[p.fillInto] : null;
      if (cont && !g.isBg && labDist(g.lab, cont.lab) < 0.06 && (p.isBg || labDist(g.lab, p.lab) > 0.15)) { g.role = 'ground'; continue; }
      if (narrow) {
        g.role = 'figure'; g.fillInto = p.id; g.drawLab = g.isBg ? p.drawLab : g.lab; g.knockout = g.isBg;
      } else if (inlay.has(g.id) && p.role === 'figure') {
        // a transparent cut-out shows the sky: drawn in the parent's colour; a painted inlay keeps its own
        const cut = g.isBg && seg.transparent;
        g.role = 'figure'; g.fillInto = p.id; g.inlay = true; g.drawLab = cut ? p.drawLab : g.lab; g.knockout = cut;
      } else {
        const behind = p.parent > 0 ? regions[p.parent].lab : null;
        if (g.isBg || (seg.transparent && nearWhite(g.lab)) || (behind && labDist(g.lab, behind) < 0.08)) { g.role = 'ground'; }
        else { g.role = 'figure'; g.drawLab = g.lab; }
      }
    }
  }
  // v4 (point 1): the figure inside a container is the logo. A figure drawn within its container (knocked out,
  // inlaid or painted on it) that is a substantial part of the container is judged as strictly as lettering
  // (all strokes, counters, free ends and salient corners), so it, not the plain container, drives the scale.
  for (const g of regions) {
    if (!g.id || g.role !== 'figure' || !(g.fillInto > 0)) continue;
    const c = regions[g.fillInto];
    const dg = Math.hypot(g.x1 - g.x0 + 1, g.y1 - g.y0 + 1), dc = Math.hypot(c.x1 - c.x0 + 1, c.y1 - c.y0 + 1);
    // (a counter of a letter filed as a narrow figure is not one: its container is no fatter than its own stroke)
    if (g.inlay || (dg >= 0.3 * dc && g.fillArea >= 0.03 * c.fillArea && c.maxDepth >= 1.2 * g.width)) g.glyphLike = true;
  }
  // --- boundary ownership between adjacent figures: a shared boundary is drawn once, by the narrower
  //     figure; the wider one is filled across it (generalises idea 1 beyond nesting, e.g. the f of Facebook
  //     touching the disc edge, the lens of Mastercard)
  for (const g of regions) g.fillers = g.fillInto > 0 ? [g.fillInto] : [];
  {
    const perim = new Map(), shared = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = id[i];
      for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
        if (j < 0) continue;
        const b = id[j];
        if (a === b) continue;
        perim.set(a, (perim.get(a) || 0) + 1); perim.set(b, (perim.get(b) || 0) + 1);
        const k = a < b ? a * K + b : b * K + a;
        shared.set(k, (shared.get(k) || 0) + 1);
      }
    }
    for (const [k, v] of shared) {
      let a = regions[Math.floor(k / K)], b = regions[k % K];
      if (!a.id || !b.id || a.role !== 'figure' || b.role !== 'figure') continue;
      if (a.parent === b.id || b.parent === a.id) continue; // nesting handled above
      // b = the narrower one
      if (a.width < b.width || (a.width === b.width && a.area < b.area)) [a, b] = [b, a];
      if (b.width >= 0.8 * a.width || b.area >= a.area) continue;
      if (v < 0.25 * (perim.get(b.id) || 1)) continue;
      if (!b.fillers.includes(a.id)) b.fillers.push(a.id);
    }
  }
  // --- v7 (item 4): an overlap of two shapes of one hue (the two P's of PayPal): a figure region darker than two
  // same-hue figure regions it lies between (at least OVL_BORDER of its border shared with them, each at least a
  // quarter) and smaller than either; it goes into both draw masks, so each shape is drawn as its complete outline
  const overlapInto = new Map(); // overlap region id -> [A id, B id]
  {
    const OVL_BORDER = 0.7, OVL_HUE_DEG = 45, OVL_DARK = 0.02;
    const nb = new Map(), per = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = id[i];
      for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
        if (j < 0) continue; const b = id[j]; if (a === b) continue;
        per.set(a, (per.get(a) || 0) + 1); per.set(b, (per.get(b) || 0) + 1);
        const k = a * K + b, k2 = b * K + a; nb.set(k, (nb.get(k) || 0) + 1); nb.set(k2, (nb.get(k2) || 0) + 1);
      }
    }
    const hue = g => Math.hypot(g.lab[1], g.lab[2]) > 0.02 ? [g.lab[1] / Math.hypot(g.lab[1], g.lab[2]), g.lab[2] / Math.hypot(g.lab[1], g.lab[2])] : null;
    for (const o of regions) {
      if (!o.id || o.role !== 'figure' || o.parent !== 0 && regions[o.parent].role !== 'ground') continue;
      const ho = hue(o); if (!ho) continue;
      const cand = [];
      for (const g of regions) {
        if (!g.id || g === o || g.role !== 'figure' || g.area <= o.area) continue;
        const sh = nb.get(o.id * K + g.id) || 0; if (sh < 0.25 * (per.get(o.id) || 1)) continue;
        // (shades of one hue: hue angles within OVL_HUE_DEG, the navy and the light blue of PayPal are 35 degrees apart)
        const hg = hue(g); if (!hg || hg[0] * ho[0] + hg[1] * ho[1] < Math.cos(OVL_HUE_DEG * Math.PI / 180)) continue;
        if (o.lab[0] > g.lab[0] - OVL_DARK) continue;
        cand.push([g, sh]);
      }
      if (cand.length !== 2) continue;
      if (cand[0][1] + cand[1][1] < OVL_BORDER * (per.get(o.id) || 1)) continue;
      overlapInto.set(o.id, [cand[0][0].id, cand[1][0].id]);
    }
  }
  // --- draw masks: figure + filled narrow children (with everything inside them)
  let lx0 = W, ly0 = H, lx1 = 0, ly1 = 0;
  for (const g of regions) if (g.id && g.role === 'figure') { lx0 = Math.min(lx0, g.x0); ly0 = Math.min(ly0, g.y0); lx1 = Math.max(lx1, g.x1); ly1 = Math.max(ly1, g.y1); }
  const logoBoxArea = Math.max(1, (lx1 - lx0 + 1) * (ly1 - ly0 + 1));
  const figures = [];
  const dropped = [];
  for (const g of regions) {
    if (!g.id || g.role !== 'figure') continue;
    if (overlapInto.has(g.id)) { dropped.push({ kind: 'overlap', region: g.id, into: overlapInto.get(g.id) }); continue; }
    const fillKids = regions.filter(c => c.id && ((c.fillers && c.fillers.includes(g.id)) || (overlapInto.get(c.id) || []).includes(g.id)));
    let bx0 = g.box.x0, by0 = g.box.y0, bx1 = g.box.x0 + g.box.w, by1 = g.box.y0 + g.box.h;
    for (const c of fillKids) { bx0 = Math.min(bx0, c.box.x0); by0 = Math.min(by0, c.box.y0); bx1 = Math.max(bx1, c.box.x0 + c.box.w); by1 = Math.max(by1, c.box.y0 + c.box.h); }
    const x0 = bx0, y0 = by0, w = bx1 - bx0, h = by1 - by0;
    const sameBox = x0 === g.box.x0 && y0 === g.box.y0 && w === g.box.w && h === g.box.h;
    const mask = localMask(seg, x0, y0, w, h, l => l === g.id);
    let kidArea = 0;
    for (const c of fillKids) {
      kidArea += c.area;
      const hb = c.box, hh = holeOf[c.id];
      for (let y = 0; y < hb.h; y++) for (let x = 0; x < hb.w; x++) {
        const gx = x + hb.x0, gy = y + hb.y0;
        if (id[gy * W + gx] === c.id || hh[y * hb.w + x]) mask[(gy - y0) * w + gx - x0] = 1;
      }
    }
    let ma = 0; for (let k = 0; k < w * h; k++) ma += mask[k];
    const bboxArea = (g.x1 - g.x0 + 1) * (g.y1 - g.y0 + 1);
    let isTile = !flat && fillKids.length > 0 && kidArea > 0.03 * ma && ma / bboxArea >= TILE_FILL && bboxArea >= TILE_COVER * logoBoxArea;
    if (isTile) {
      // a tile's outer contour runs along its bounding box (corners may be rounded); a notch cut in from
      // outside (the Selenium check) carries shape information, so such a container is not dropped
      const lim = 0.12 * Math.min(g.x1 - g.x0 + 1, g.y1 - g.y0 + 1);
      outer: for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) {
        const i = y * W + x;
        if (id[i] !== g.id) continue;
        if (!((x > 0 && id[i - 1] === 0) || (x < W - 1 && id[i + 1] === 0) || (y > 0 && id[i - W] === 0) || (y < H - 1 && id[i + W] === 0))) continue;
        if (Math.min(x - g.x0, g.x1 - x, y - g.y0, g.y1 - y) > lim) { isTile = false; break outer; }
      }
    }
    if (isTile) { g.tile = true; dropped.push({ kind: 'tile', region: g.id, area: ma }); continue; }
    const dt = fillKids.length || !sameBox ? insideDistance(mask, w, h) : dtOwn[g.id];
    const depth = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) depth[k] = mask[k] ? Math.max(0.01, dt[k] - 0.5) : 0;
    figures.push({ rid: g.id, x0, y0, w, h, mask, depth, area: ma, drawLab: g.drawLab, ownColour: !g.knockout && !g.facets, region: g });
  }
  return { regions, figures, dropped, logoBox: [lx0, ly0, lx1, ly1] };
}
