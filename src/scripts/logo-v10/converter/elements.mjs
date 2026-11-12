// v7: containers, elements and the removal of an element (DESIGN.md, feedback on v6.2, row 7).
//
// All three work on the image, not inside the ladder: a container that is dropped, or an element the user excludes, is
// removed from the picture of the logo, and the converter then sees the logo as if it never had it (structure, parts,
// the budget ladder all re-run on the edited image). So the freed drones go to the rest or the count drops, by the same
// rules as for any other logo.
//
// Container: a ring, a double ring, a disc, a plate or a frame that surrounds the rest of the logo and is not itself the
// motif (the rings of Eintracht Frankfurt, the Lidl circle, the Miele plate). Found in the radial coordinate of the
// outermost figure C0 when C0's filled outline is an ellipse or a rectangle (a shield, which carries the crest's shape,
// is neither): a cut rho* (the inner edge of a band) at which no figure straddles, the regions outside the cut cover the
// full turn (the bands, their ring text, the ground between two rings), and the figures inside hold a real share of the
// ink and are not just more concentric rings (a target is rings all the way down: the rings are the motif). The
// innermost such cut is taken (a double ring is container down to the inner edge of the inner ring). A plain plate
// right inside the cut, or C0 itself when no cut exists (a filled disc or rectangle that holds the content: Lidl's
// yellow disc, the Miele plate), belongs to the container as well. A hollow rectangular frame is the motif (Deutsche
// Bahn, an Instagram-like camera): only round rings and filled plates are containers.
//
// Elements: what a person would call one thing: the container, each row of lettering, each figure with its details
// (the eagle with its knocked-out feathers, the lozenges of a field), each small ornament. Computed once on the logo
// without its container (when there is one), so the anchors stay valid whatever is dropped later.
import { insideDistance, sourceDistance } from './dt.mjs';
import { labDist } from './color.mjs';
import { findParts } from './parts.mjs';
import { letterRows } from './select.mjs';

export const CONT_SHAPE = 0.93, CONT_TOL = 0.02, CONT_COVER = 0.9, CONT_CONTENT = 0.05, PLATE_OWN = 0.6, CONT_RHO_MIN = 0.3;
const BINS = 72;
const bitCount = b => { let n = 0; for (const v of b) n += v; return n; };

function rootOf(regions, id) { let g = regions[id]; while (g.parent > 0) g = regions[g.parent]; return g; }

// mean RGBA of every region over the image
export function regionColours(image, seg) {
  const K = seg.regions.length, s = new Float64Array(K * 4), n = new Float64Array(K);
  const { data } = image;
  for (let i = 0; i < seg.W * seg.H; i++) { const r = seg.id[i]; n[r]++; for (let c = 0; c < 4; c++) s[r * 4 + c] += data[i * 4 + c]; }
  for (let r = 0; r < K; r++) if (n[r]) for (let c = 0; c < 4; c++) s[r * 4 + c] = Math.round(s[r * 4 + c] / n[r]);
  return s;
}

// the filled outline of a region (its pixels and its holes) within its bbox: Uint8Array over [x0, y0, w, h]
function filledOf(seg, g) {
  const { W, id } = seg, x0 = g.x0, y0 = g.y0, w = g.x1 - g.x0 + 1, h = g.y1 - g.y0 + 1;
  const out = new Uint8Array(w * h), st = [];
  const seed = k => { if (out[k] === 0 && id[(Math.floor(k / w) + y0) * W + (k % w) + x0] !== g.id) { out[k] = 2; st.push(k); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (st.length) { const k = st.pop(), x = k % w, y = (k - x) / w; if (x > 0) seed(k - 1); if (x < w - 1) seed(k + 1); if (y > 0) seed(k - w); if (y < h - 1) seed(k + w); }
  for (let k = 0; k < w * h; k++) out[k] = out[k] === 2 ? 0 : 1;
  return { x0, y0, w, h, m: out };
}

export function detectContainer(image, seg, st) {
  const none = { found: false, dropped: false, box: null };
  const { W, id, regions } = seg;
  const tile = st.dropped.find(d => d.kind === 'tile');
  if (tile) { const g = regions[tile.region]; return { found: true, dropped: true, box: [g.x0, g.y0, g.x1, g.y1], kind: 'tile' }; }
  const [lx0, ly0, lx1, ly1] = st.logoBox;
  const lw = lx1 - lx0 + 1, lh = ly1 - ly0 + 1;
  const figRid = new Set(st.figures.map(F => F.rid));
  let C0 = null;
  for (const F of st.figures) {
    const g = F.region;
    if (g.parent > 0 || g.x1 - g.x0 + 1 < 0.92 * lw || g.y1 - g.y0 + 1 < 0.92 * lh) continue;
    if (!C0 || g.fillArea > C0.fillArea) C0 = g;
  }
  if (!C0) return none;
  const fill = filledOf(seg, C0);
  const a = fill.w / 2, b = fill.h / 2, cx = fill.x0 + a, cy = fill.y0 + b;
  let inter = 0, uni = 0, nf = 0;
  for (let y = 0; y < fill.h; y++) for (let x = 0; x < fill.w; x++) {
    const f = fill.m[y * fill.w + x], e = ((x + 0.5 - a) / a) ** 2 + ((y + 0.5 - b) / b) ** 2 <= 1;
    nf += f; if (f && e) inter++; if (f || e) uni++;
  }
  const shape = inter / uni >= CONT_SHAPE ? 'ellipse' : nf / (fill.w * fill.h) >= CONT_SHAPE ? 'rect' : null;
  if (!shape) return none;
  const rho = shape === 'ellipse' ? (x, y) => Math.hypot((x - cx) / a, (y - cy) / b) : (x, y) => Math.max(Math.abs(x - cx) / a, Math.abs(y - cy) / b);
  // per region inside the filled outline: radial range, angular bins, pixel count
  const S = new Map();
  for (let y = 0; y < fill.h; y++) for (let x = 0; x < fill.w; x++) {
    if (!fill.m[y * fill.w + x]) continue;
    const X = x + fill.x0, Y = y + fill.y0, r = id[Y * W + X];
    const px = X + 0.5, py = Y + 0.5, p = rho(px, py);
    let s = S.get(r); if (!s) S.set(r, s = { r, min: Infinity, max: -Infinity, bins: new Uint8Array(BINS), outer: new Float32Array(BINS), n: 0 });
    s.min = Math.min(s.min, p); s.max = Math.max(s.max, p); s.n++;
    const k = Math.min(BINS - 1, Math.floor((Math.atan2((py - cy) / b, (px - cx) / a) + Math.PI) / (2 * Math.PI) * BINS));
    s.bins[k] = 1; if (p > s.outer[k]) s.outer[k] = p;
  }
  const isFig = r => figRid.has(r);
  let ink = 0; for (const s of S.values()) if (isFig(s.r)) ink += s.n;
  const sig = s => s.n >= 0.003 * ink;
  // (a ring or disc of the container's own shape: it turns all the way round at a steady radius)
  const concentricFull = s => { if (bitCount(s.bins) < CONT_COVER * BINS) return false; let lo = Infinity, hi = 0; for (let k = 0; k < BINS; k++) if (s.bins[k]) { lo = Math.min(lo, s.outer[k]); hi = Math.max(hi, s.outer[k]); } return hi <= 1.12 * lo; };
  const cuts = [...new Set([...S.values()].filter(s => s.min >= CONT_RHO_MIN && s.n >= 20).map(s => +s.min.toFixed(3)))].sort((x, y) => x - y);
  let cut = null;
  for (const c of cuts) {
    let ok = true, inInk = 0, plainOnly = true;
    const cover = new Uint8Array(BINS);
    for (const s of S.values()) {
      if (isFig(s.r) && sig(s) && s.min < c - CONT_TOL && s.max > c + CONT_TOL) { ok = false; break; }
      if (s.min >= c - CONT_TOL) for (let k = 0; k < BINS; k++) cover[k] |= s.bins[k];
      if (isFig(s.r) && s.max <= c + CONT_TOL) { inInk += s.n; if (sig(s) && !concentricFull(s)) plainOnly = false; }
    }
    if (!ok || bitCount(cover) < CONT_COVER * BINS || inInk < CONT_CONTENT * ink || plainOnly) continue;
    cut = c; break;
  }
  const contRegions = new Set();
  let plate = null;
  // a plain plate holding the content: mostly its own ink, its holes hold figures (Lidl's disc, the Miele plate)
  const plainPlate = g => isFig(g.id) && g.area >= PLATE_OWN * g.fillArea && st.figures.some(F => F.region.fillInto === g.id || rootOf(regions, F.rid) === g && F.region !== g && F.region.parent === g.id);
  if (cut !== null) {
    if (shape === 'rect') return none; // a hollow rectangular frame is the motif (Deutsche Bahn)
    for (const s of S.values()) if (s.min >= cut - CONT_TOL) contRegions.add(s.r);
    contRegions.add(C0.id);
    // the outermost content: a plain plate filling the window joins the container
    for (const s of S.values()) {
      const g = regions[s.r];
      if (contRegions.has(s.r) || s.min > 0.1 || s.max < cut - 0.08 || bitCount(s.bins) < CONT_COVER * BINS || !plainPlate(g)) continue;
      if (!contRegions.has(g.parent)) continue;
      plate = g.id; contRegions.add(g.id);
    }
  } else if (plainPlate(C0)) {
    // C0 itself is a filled plate with content (no ring around it)
    let inInk = 0; for (const s of S.values()) if (isFig(s.r) && s.r !== C0.id) inInk += s.n;
    if (inInk < CONT_CONTENT * ink) return none;
    plate = C0.id; contRegions.add(C0.id);
  } else return none;
  // window area: the filled outline inside the cut (or the plate's filled outline)
  let windowArea = 0;
  for (const s of S.values()) if (!contRegions.has(s.r)) windowArea += s.n;
  return { found: true, dropped: false, box: [C0.x0, C0.y0, C0.x1, C0.y1], kind: plate !== null ? (cut !== null ? 'ring+plate' : 'plate') : 'ring', shape, cut, regions: contRegions, plate, fill, windowArea, C0: C0.id };
}

// the logo without its container: container pixels transparent; ground-coloured content standing directly on a plate
// (letters knocked out of the Lidl disc, the Miele letters) painted in the plate's colour, as the converter draws a
// knock-out anyway; the window's own ground (the white disc around the eagle) and cut-outs inside the content
// transparent; painted ground regions lining nothing (the white quarters of BMW) keep their colour.
export function withoutContainer(image, seg, st, cont) {
  const { W, H, id, regions } = seg, N = W * H;
  const rgb = regionColours(image, seg);
  const out = new Uint8ClampedArray(N * 4);
  const { data } = image;
  const f = cont.fill;
  const inFill = i => { const x = i % W - f.x0, y = Math.floor(i / W) - f.y0; return x >= 0 && y >= 0 && x < f.w && y < f.h && f.m[y * f.w + x]; };
  for (let i = 0; i < N; i++) {
    const r = id[i], g = regions[r];
    if (r === 0 || cont.regions.has(r)) continue;
    const ground = g.isBg || g.role === 'ground';
    // (outside the container: everything but its anti-aliasing rims, 1 px slivers along its edge)
    if (!inFill(i)) { if (!ground && !(g.maxDepth <= 1 && g.area < 0.01 * cont.windowArea)) out.set(data.subarray(i * 4, i * 4 + 4), i * 4); continue; }
    // (on a plate, the anti-aliasing rims between the plate and its content go with the content)
    if (cont.plate !== null && g.maxDepth <= 1 && !ground) { out.set([rgb[cont.plate * 4], rgb[cont.plate * 4 + 1], rgb[cont.plate * 4 + 2], 255], i * 4); continue; }
    if (ground) {
      if (cont.plate !== null && g.parent === cont.plate) { out.set([rgb[cont.plate * 4], rgb[cont.plate * 4 + 1], rgb[cont.plate * 4 + 2], 255], i * 4); continue; }
      if (g.isBg) continue;
      const lining = cont.regions.has(g.parent) && g.fillArea >= 0.5 * cont.windowArea;
      if (!lining && cont.regions.has(g.parent)) out.set([data[i * 4], data[i * 4 + 1], data[i * 4 + 2], 255], i * 4);
      continue;
    }
    out.set(data.subarray(i * 4, i * 4 + 4), i * 4);
    out[i * 4 + 3] = Math.max(out[i * 4 + 3], 255 * (data[i * 4 + 3] >= 96));
  }
  return { width: image.width, height: image.height, data: out };
}

// elements of a segmented logo. Returns { list: [{ id, kind, box, figs, anchor }], pix: Int32Array (element of each pixel,
// -1 for ground) }; `extra` elements (the container, from the original segmentation) are listed first with their pixels.
export function computeElements(seg, st, extra = []) {
  const { W, H, id, regions } = seg;
  const figs = st.figures;
  for (const F of figs) F.root = rootOf(regions, F.rid).id;
  const ctx = { seg, st, figs };
  const parts = findParts(ctx);
  const n = figs.length, par = figs.map((_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[Math.max(a, b)] = Math.min(a, b); };
  const kindOf = new Map();
  // lettering: each text row, and each row of letters inlaid in a shape
  const isText = i => figs[i].part && figs[i].part.kind === 'text';
  const byPart = new Map();
  figs.forEach((F, i) => { if (isText(i)) { if (byPart.has(F.part)) uni(i, byPart.get(F.part)); else byPart.set(F.part, i); } });
  const lr = letterRows(ctx, new Set(figs.map((_, i) => i).filter(i => !isText(i))));
  const mh = Math.max(0, ...lr.map(r => r.h));
  const inlaid = new Set();
  // (a row of plain bars, the stripes of a crest, is no lettering: parts.mjs has the same rule for text rows)
  const bars = r => r.figs.filter(i => { const g = figs[i].region; return g.x1 - g.x0 + 1 <= 0.25 * (g.y1 - g.y0 + 1); }).length > 0.75 * r.figs.length;
  for (const r of lr) if (r.figs.length >= 3 && r.h >= 0.45 * mh && !bars(r)) { for (const i of r.figs) { uni(i, r.figs[0]); inlaid.add(i); } }
  const letter = i => isText(i) || inlaid.has(i);
  // details of a figure: knock-outs and inlays filled into it that are small against it
  const byRid = new Map(figs.map((F, i) => [F.rid, i]));
  figs.forEach((F, i) => {
    const p = F.region.fillInto > 0 ? byRid.get(F.region.fillInto) : undefined;
    if (p === undefined || letter(i) !== letter(p)) return;
    if (F.region.fillArea < 0.08 * figs[p].region.fillArea) uni(i, p);
  });
  // a symbol in several pieces (the Slack hash) is one thing; so are siblings of one colour on one ground (lozenges)
  figs.forEach((F, i) => figs.forEach((G, j) => {
    if (j <= i || letter(i) || letter(j)) return;
    const a = F.region, b = G.region;
    const gap0 = Math.hypot(Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), Math.max(a.y0 - b.y1, b.y0 - a.y1, 0));
    if (F.part && F.part === G.part && F.part.pieces && gap0 <= 0.25 * Math.min(Math.max(a.x1 - a.x0, a.y1 - a.y0), Math.max(b.x1 - b.x0, b.y1 - b.y0))) { uni(i, j); return; }
    if (a.parent !== b.parent || labDist(F.drawLab, G.drawLab) >= 0.08) return;
    const gap = Math.hypot(Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), Math.max(a.y0 - b.y1, b.y0 - a.y1, 0));
    const sz = Math.max(Math.hypot(a.x1 - a.x0, a.y1 - a.y0), Math.hypot(b.x1 - b.x0, b.y1 - b.y0));
    if (gap <= 0.3 * sz && Math.max(a.area, b.area) <= 6 * Math.min(a.area, b.area)) uni(i, j);
  }));
  // small pieces lying inside a larger figure's filled outline, or inside its box and touching it, are details of it (the
  // white pieces and the staff of the Chelsea lion, the eye of the eagle); lettering stays its own element, and so do
  // pieces standing apart (the stars above a shield)
  {
    const m = new Map(); figs.forEach((F, i) => { const r = find(i); if (!m.has(r)) m.set(r, []); m.get(r).push(i); });
    const list = [...m.values()].map(g => ({ g, a: g.reduce((t, i) => t + figs[i].area, 0), text: g.some(letter) })).sort((x, y) => y.a - x.a);
    let ink = 0; for (const F of figs) ink += F.area;
    for (const big of list) {
      if (big.text || big.a < 0.03 * ink) continue;
      const main = big.g.reduce((x, i) => figs[i].area > figs[x].area ? i : x, big.g[0]);
      const f = filledOf(seg, figs[main].region);
      const inside = (X, Y) => { const x = X - f.x0, y = Y - f.y0; return x >= 0 && y >= 0 && x < f.w && y < f.h && f.m[y * f.w + x]; };
      const bb = [Infinity, Infinity, -Infinity, -Infinity];
      const src = new Uint8Array(W * H);
      for (const i of big.g) { const F = figs[i]; bb[0] = Math.min(bb[0], F.region.x0); bb[1] = Math.min(bb[1], F.region.y0); bb[2] = Math.max(bb[2], F.region.x1); bb[3] = Math.max(bb[3], F.region.y1); for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (F.mask[y * F.w + x]) src[(y + F.y0) * W + x + F.x0] = 1; }
      let dist = null;
      const touchR = 0.02 * Math.hypot(st.logoBox[2] - st.logoBox[0], st.logoBox[3] - st.logoBox[1]);
      for (const sm of list) {
        if (sm === big || sm.text || sm.a >= 0.15 * big.a || find(sm.g[0]) === find(big.g[0])) continue;
        let n = 0, k = 0, kb = 0, near = false;
        for (const i of sm.g) { const F = figs[i]; for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (F.mask[y * F.w + x]) { const X = x + F.x0, Y = y + F.y0; n++; if (inside(X, Y)) k++; if (X >= bb[0] && X <= bb[2] && Y >= bb[1] && Y <= bb[3]) kb++; } }
        if (n && k < 0.8 * n && kb >= 0.8 * n) {
          dist ??= sourceDistance(src, W, H);
          for (const i of sm.g) { const F = figs[i]; for (let y = 0; y < F.h && !near; y++) for (let x = 0; x < F.w; x++) if (F.mask[y * F.w + x] && dist[(y + F.y0) * W + x + F.x0] <= touchR) { near = true; break; } }
        }
        if (n && (k >= 0.8 * n || near)) uni(sm.g[0], big.g[0]);
      }
    }
  }
  const groups = new Map();
  figs.forEach((F, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); });
  let inkAll = 0; for (const F of figs) inkAll += F.area;
  const [lx0, ly0, lx1, ly1] = st.logoBox, diag = Math.hypot(lx1 - lx0, ly1 - ly0);
  const list = extra.map((e, k) => ({ ...e, id: k }));
  const pix = new Int32Array(W * H).fill(-1);
  for (const e of list) for (const i of e.pixels) pix[i] = e.id;
  const sorted = [...groups.values()].sort((x, y) => Math.min(...x.map(i => figs[i].region.x0 + 1e4 * figs[i].region.y0)) - Math.min(...y.map(i => figs[i].region.x0 + 1e4 * figs[i].region.y0)));
  for (const g of sorted) {
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    let area = 0;
    for (const i of g) { const r = figs[i].region; box[0] = Math.min(box[0], r.x0); box[1] = Math.min(box[1], r.y0); box[2] = Math.max(box[2], r.x1); box[3] = Math.max(box[3], r.y1); area += figs[i].area; }
    const kind = g.some(letter) ? 'text' : area >= 0.03 * inkAll || Math.hypot(box[2] - box[0], box[3] - box[1]) >= 0.2 * diag ? 'figure' : 'ornament';
    const e = { id: list.length, kind, box, figs: g, anchor: null };
    list.push(e);
    // own pixels of the element; the anchor is the deepest of them (on the largest figure)
    let best = -1, bk = -1;
    for (const i of g) {
      const F = figs[i];
      for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
        const k = y * F.w + x, X = x + F.x0, Y = y + F.y0;
        if (!F.mask[k] || id[Y * W + X] !== F.rid) continue;
        if (pix[Y * W + X] < 0) pix[Y * W + X] = e.id;
        if (F.depth[k] > best) { best = F.depth[k]; bk = Y * W + X; }
      }
    }
    if (bk >= 0) e.anchor = { x: (bk % W) + 0.5, y: Math.floor(bk / W) + 0.5 };
  }
  for (const e of list) if (!e.anchor && e.pixels && e.pixels.length) {
    // (an extra element: its deepest pixel)
    const m = new Uint8Array(W * H); for (const i of e.pixels) m[i] = 1;
    const dt = insideDistance(m, W, H); let best = -1, bk = -1;
    for (const i of e.pixels) if (dt[i] > best && pix[i] === e.id) { best = dt[i]; bk = i; }
    if (bk >= 0) e.anchor = { x: (bk % W) + 0.5, y: Math.floor(bk / W) + 0.5 };
  }
  return { list, pix, parts };
}

// the element under (x, y), or the nearest one
export function elementAt(E, W, H, x, y) {
  const X = Math.floor(x), Y = Math.floor(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H && E.pix[Y * W + X] >= 0) return E.pix[Y * W + X];
  let best = -1, bd = Infinity;
  for (let i = 0; i < W * H; i++) { const e = E.pix[i]; if (e < 0) continue; const d = (i % W + 0.5 - x) ** 2 + (Math.floor(i / W) + 0.5 - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}

// the image with the given pixels repainted in the colour that surrounds them (per connected piece: the most common
// colour of the pixels just outside it, transparent where that is the background); anti-aliasing pixels of no element
// next to the piece go with it
export function paintOut(image, pix, ids) {
  const W = image.width, H = image.height, N = W * H, data = new Uint8ClampedArray(image.data);
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (ids.has(pix[i])) mask[i] = 1;
  // grow by two pixels over pixels that belong to no element
  for (let it = 0; it < 2; it++) {
    const add = [];
    for (let i = 0; i < N; i++) {
      if (mask[i] || pix[i] >= 0) continue;
      const x = i % W, y = (i - x) / W;
      if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < H - 1 && mask[i + W])) add.push(i);
    }
    for (const i of add) mask[i] = 1;
  }
  const seen = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (!mask[s] || seen[s]) continue;
    const comp = [s]; seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % W, y = (i - x) / W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && mask[j] && !seen[j]) { seen[j] = 1; comp.push(j); }
    }
    // the colours just outside the piece (1-3 px)
    const votes = new Map();
    for (const i of comp) {
      const x = i % W, y = (i - x) / W;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X; if (mask[j]) continue;
        const a = image.data[j * 4 + 3] < 96 ? 0 : 1;
        const key = a ? ((image.data[j * 4] >> 3) << 10) | ((image.data[j * 4 + 1] >> 3) << 5) | (image.data[j * 4 + 2] >> 3) : -1;
        votes.set(key, (votes.get(key) || 0) + 1);
      }
    }
    let key = -1, bn = -1; for (const [k, v] of votes) if (v > bn) { bn = v; key = k; }
    const c = key < 0 ? [0, 0, 0, 0] : [((key >> 10) & 31) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4, 255];
    if (key >= 0) {
      // the exact colour: mean of the outside pixels of that bin
      let n = 0, r = 0, g = 0, b = 0;
      for (const i of comp) { const x = i % W, y = (i - x) / W; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (mask[j] || image.data[j * 4 + 3] < 96) continue; const k2 = ((image.data[j * 4] >> 3) << 10) | ((image.data[j * 4 + 1] >> 3) << 5) | (image.data[j * 4 + 2] >> 3); if (k2 !== key) continue; r += image.data[j * 4]; g += image.data[j * 4 + 1]; b += image.data[j * 4 + 2]; n++; } }
      if (n) { c[0] = Math.round(r / n); c[1] = Math.round(g / n); c[2] = Math.round(b / n); }
    }
    for (const i of comp) data.set(c, i * 4);
  }
  return { width: W, height: H, data };
}
