// Depiction proxy, candidate (b): multi-scale blur match in colour. The dots (each a small blob in its own
// colour) and a reference image are blurred at 1, 2, 4 and 8 % of the logo diagonal and compared by normalised
// cross-correlation; the score is the mean. Reference 'ink' = the logo's ink in its sky-lifted colours;
// reference 'line' = the target line drawing (target.mjs boundaries, weighted by contrast, in the colour of
// the drawn side). Works at 1/4 resolution.
import { linkGraph } from './score.mjs';
import { liftForSky } from './color.mjs';

// ---------------- (b) multi-scale blur match ----------------
export const F = 8; // working resolution: 1/8 (v8, perf C: the converter's internal decisions; the yardstick in eval/proxy keeps 1/4)
export function gaussBlur(img, w, h, ch, sigma) {
  if (sigma < 0.3) return img;
  const r = Math.ceil(3 * sigma), k = new Float64Array(2 * r + 1);
  let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-i * i / (2 * sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  // Precompute clamped sample offsets once per axis, rather than per channel/tap.
  const len = k.length, xs = new Int32Array(w * len), ys = new Int32Array(h * len);
  for (let x = 0; x < w; x++) for (let j = 0; j < len; j++) xs[x * len + j] = Math.min(w - 1, Math.max(0, x + j - r)) * ch;
  for (let y = 0; y < h; y++) for (let j = 0; j < len; j++) ys[y * len + j] = Math.min(h - 1, Math.max(0, y + j - r)) * w * ch;
  const tmp = new Float64Array(img.length), out = new Float64Array(img.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let v = 0;
    const o = y * w * ch + c, a = x * len;
    for (let j = 0; j < len; j++) v += k[j] * img[o + xs[a + j]];
    tmp[(y * w + x) * ch + c] = v;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let v = 0;
    const o = x * ch + c, a = y * len;
    for (let j = 0; j < len; j++) v += k[j] * tmp[o + ys[a + j]];
    out[(y * w + x) * ch + c] = v;
  }
  return out;
}
function ncc(a, b) {
  let ma = 0, mb = 0; const n = a.length;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
}
export function refImage(T, kind) {
  T._ref ??= {};
  if (T._ref[kind]) return T._ref[kind];
  const { W, H, id, seg } = T;
  const w = Math.ceil(W / F), h = Math.ceil(H / F), img = new Float64Array(w * h * 3);
  const col = new Map();
  const colOf = r => { if (!col.has(r)) col.set(r, liftForSky(seg.regions[r].lab).map(v => v / 255)); return col.get(r); };
  if (kind === 'ink') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!T.ink[i]) continue;
      const c = colOf(id[i]), o = (Math.floor(y / F) * w + Math.floor(x / F)) * 3;
      for (let k = 0; k < 3; k++) img[o + k] += c[k] / (F * F);
    }
  } else {
    for (const e of T.el) {
      const r = T.ground(e.ra) ? e.rb : T.ground(e.rb) ? e.ra : e.g;
      const c = colOf(r), o = (Math.min(h - 1, Math.floor(e.y / F)) * w + Math.min(w - 1, Math.floor(e.x / F))) * 3;
      for (let k = 0; k < 3; k++) img[o + k] += e.w * c[k] / F;
    }
  }
  return (T._ref[kind] = { img, w, h, diag: T.diag, blurred: new Map() });
}
export function blurMatch(T, res, kind = 'line', sEff = null) {
  const R = refImage(T, kind), { w, h } = R;
  if (sEff === null) sEff = linkGraph(res.points).sEff;
  const dot = new Float64Array(w * h * 3);
  for (const p of res.points) {
    const X = Math.min(w - 1, Math.max(0, Math.floor(p.x / F))), Y = Math.min(h - 1, Math.max(0, Math.floor(p.y / F)));
    const o = (Y * w + X) * 3; dot[o] += p.r / 255; dot[o + 1] += p.g / 255; dot[o + 2] += p.b / 255;
  }
  const out = {};
  let m = 0;
  for (const f of [0.01, 0.02, 0.04, 0.08]) {
    const sg = f * R.diag / F;
    if (!R.blurred.has(f)) R.blurred.set(f, gaussBlur(R.img, w, h, 3, sg));
    const v = Math.max(0, ncc(R.blurred.get(f), gaussBlur(dot, w, h, 3, Math.hypot(sg, 0.3 * sEff / F))));
    out['s' + f] = v; m += v / 4;
  }
  out.score = m;
  return out;
}

