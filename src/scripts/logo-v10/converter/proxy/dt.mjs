// Exact separable Euclidean distance transform. Scratch is private, synchronous, and reused.
const INF = 1e20;
let capacity = 0, g, d, v, z;
function scratch(n) {
  if (n <= capacity) return;
  capacity = n;
  g = new Float64Array(n); d = new Float64Array(n);
  v = new Int32Array(n); z = new Float64Array(n + 1);
}
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s;
    for (;;) {
      const r = v[k];
      s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r);
      if (s <= z[k]) { k--; if (k < 0) { k = 0; break; } } else break;
    }
    if (k === 0 && s <= z[0]) { v[0] = q; z[0] = -INF; z[1] = INF; continue; }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    d[q] = (q - r) * (q - r) + f[r];
  }
}

// The first pass sees binary sources only: nearest vertical source by forward/backward scans.
// Keep edtSq generic for callers supplying a non-binary cost field.
function binarySq(f, w, h) {
  scratch(Math.max(w, h));
  for (let x = 0; x < w; x++) {
    let last = -1;
    for (let y = 0, i = x; y < h; y++, i += w) {
      if (f[i] === 0) last = y;
      else if (last >= 0) f[i] = (y - last) * (y - last);
    }
    last = -1;
    for (let y = h - 1, i = y * w + x; y >= 0; y--, i -= w) {
      if (f[i] === 0) last = y;
      else if (last >= 0) { const sq = (last - y) * (last - y); if (sq < f[i]) f[i] = sq; }
    }
  }
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) g[x] = f[o + x];
    edt1d(g, w, d, v, z);
    for (let x = 0; x < w; x++) f[o + x] = d[x];
  }
  return f;
}
// f: Float32Array w*h, 0 at sources, INF elsewhere. In place -> squared distances.
export function edtSq(f, w, h) {
  const n = Math.max(w, h);
  scratch(n);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) g[y] = f[y * w + x];
    edt1d(g, h, d, v, z);
    for (let y = 0; y < h; y++) f[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) g[x] = f[o + x];
    edt1d(g, w, d, v, z);
    for (let x = 0; x < w; x++) f[o + x] = d[x];
  }
  return f;
}

// Distance from each inside pixel (mask=1) to the nearest outside pixel centre.
// Pixels outside the grid count as outside. Returns Float32Array (0 outside).
export function insideDistance(mask, w, h) {
  const W = w + 2, H = h + 2;
  const f = new Float32Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[(y + 1) * W + x + 1] = mask[y * w + x] ? INF : 0;
  binarySq(f, W, H);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(f[(y + 1) * W + x + 1]);
  return out;
}

// Distance from every pixel to the nearest source pixel (src=1). Infinity-ish if none.
export function sourceDistance(src, w, h) {
  const f = new Float32Array(w * h);
  let any = false;
  for (let i = 0; i < w * h; i++) { if (src[i]) { f[i] = 0; any = true; } else f[i] = INF; }
  if (!any) return f.fill(1e9);
  binarySq(f, w, h);
  for (let i = 0; i < w * h; i++) f[i] = Math.sqrt(f[i]);
  return f;
}
