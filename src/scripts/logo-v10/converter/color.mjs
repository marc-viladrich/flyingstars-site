// sRGB <-> OKLab, and lifting of colours too dark for a night sky.
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) LIN[i] = toLin(i);
const fromLin = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(v * 255))); };

export function rgbToOklab(r, g, b, out = [0, 0, 0]) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  out[0] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  out[1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  out[2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return out;
}

function oklabToLin(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}

export function oklabToRgb(L, a, b) {
  const inG = (a2, b2) => { const [r, g, bb] = oklabToLin(L, a2, b2); return r >= -1e-4 && g >= -1e-4 && bb >= -1e-4 && r <= 1.0001 && g <= 1.0001 && bb <= 1.0001; };
  // gamut map: keep L and hue, take the largest chroma factor that stays in sRGB (bisection)
  if (!inG(a, b)) {
    let lo = 0, hi = 1;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (inG(a * m, b * m)) lo = m; else hi = m; }
    a *= lo; b *= lo;
  }
  const [r, g, bb] = oklabToLin(L, a, b);
  return [fromLin(Math.max(0, r)), fromLin(Math.max(0, g)), fromLin(Math.max(0, bb))];
}

export const labDist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

// LEDs on a night sky: every dot bright. OKLab L >= L_MIN, hue kept.
// dark near-neutral ink -> white; dark hues -> vivid light version of the same hue (chroma kept or raised,
// then clipped to the gamut). Monotone in L, so two shades of one brand colour stay distinguishable.
export const L_MIN = 0.72;
export function liftForSky(lab) {
  let [L, a, b] = lab;
  const C = Math.hypot(a, b);
  if (C < 0.045) {
    if (L < 0.62) return oklabToRgb(0.96, 0, 0);
    return oklabToRgb(Math.max(L, 0.8), a, b);
  }
  if (C < 0.11 && L < 0.45) { L = 0.86; a *= 0.8; b *= 0.8; return oklabToRgb(L, a, b); }
  const TOP = 0.8;
  if (L < TOP) {
    const L2 = L_MIN + (TOP - L_MIN) * (Math.max(0, L) / TOP) ** 2;
    const k = Math.min(1.5, Math.sqrt(L2 / Math.max(0.25, L)));
    a *= k; b *= k; L = L2;
  }
  return oklabToRgb(L, a, b);
}
