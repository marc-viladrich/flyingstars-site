// Separable Lanczos-3 resize on premultiplied RGBA, close to what sharp/libvips does in tools/raster.mjs.
// The converter reacts to the exact edge profile of the raster, so the browser uses the same kernel
// family as the CLI instead of the canvas' own smoothing.

function lanczos(x) {
  if (x === 0) return 1;
  if (x <= -3 || x >= 3) return 0;
  const px = Math.PI * x;
  return 3 * Math.sin(px) * Math.sin(px / 3) / (px * px);
}

function weights(srcLen, dstLen) {
  const scale = srcLen / dstLen, support = 3 * Math.max(1, scale), inv = 1 / Math.max(1, scale);
  const out = [];
  for (let i = 0; i < dstLen; i++) {
    const c = (i + 0.5) * scale - 0.5;
    const a = Math.max(0, Math.ceil(c - support)), b = Math.min(srcLen - 1, Math.floor(c + support));
    const w = new Float64Array(b - a + 1);
    let sum = 0;
    for (let j = a; j <= b; j++) { const v = lanczos((j - c) * inv); w[j - a] = v; sum += v; }
    for (let k = 0; k < w.length; k++) w[k] /= sum;
    out.push({ a, w });
  }
  return out;
}

// data: Uint8ClampedArray RGBA (straight alpha), returns Uint8ClampedArray RGBA dw × dh
export function resizeLanczos(data, sw, sh, dw, dh) {
  const pm = new Float64Array(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++) {
    const a = data[i * 4 + 3] / 255;
    pm[i * 4] = data[i * 4] * a; pm[i * 4 + 1] = data[i * 4 + 1] * a; pm[i * 4 + 2] = data[i * 4 + 2] * a; pm[i * 4 + 3] = data[i * 4 + 3];
  }
  const wx = weights(sw, dw), wy = weights(sh, dh);
  const tmp = new Float64Array(dw * sh * 4);
  for (let y = 0; y < sh; y++) for (let x = 0; x < dw; x++) {
    const { a, w } = wx[x];
    let r = 0, g = 0, b = 0, al = 0;
    for (let k = 0; k < w.length; k++) { const s = (y * sw + a + k) * 4, v = w[k]; r += pm[s] * v; g += pm[s + 1] * v; b += pm[s + 2] * v; al += pm[s + 3] * v; }
    const d = (y * dw + x) * 4; tmp[d] = r; tmp[d + 1] = g; tmp[d + 2] = b; tmp[d + 3] = al;
  }
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const { a, w } = wy[y];
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, al = 0;
      for (let k = 0; k < w.length; k++) { const s = ((a + k) * dw + x) * 4, v = w[k]; r += tmp[s] * v; g += tmp[s + 1] * v; b += tmp[s + 2] * v; al += tmp[s + 3] * v; }
      const d = (y * dw + x) * 4;
      const A = Math.min(255, Math.max(0, al));
      const k = A > 0 ? 255 / A : 0;
      out[d] = Math.round(r * k); out[d + 1] = Math.round(g * k); out[d + 2] = Math.round(b * k); out[d + 3] = Math.round(A);
    }
  }
  return out;
}
