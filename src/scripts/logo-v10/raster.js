import { resizeLanczos } from './resample.js';

// Browser mirror of tools/raster.mjs: file -> { width, height, data: Uint8ClampedArray RGBA }, long side = size.
// Same steps: render large, trim borders that match the top-left pixel (threshold 1), fit inside
// size - 2·margin (enlarging allowed), pad 6 % with transparent (if the image has any transparency)
// or with the top-left colour.

const RENDER_LONG = 1024; // SVGs are drawn at twice the target size, like the density rule in raster.mjs
const MAX_RASTER = 2048;  // very large bitmaps are scaled down before trimming

export async function rasterizeFile(file, size = 512, pad = 0.06, kernel = 'lanczos') {
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');
  const img = isSvg ? await loadSvg(await file.text(), size * 2) : await loadBitmap(file);
  const src = drawSource(img, size * 2);
  return rasterizeCanvas(src, size, pad, kernel);
}

function drawSource({ el, w, h }, limit = MAX_RASTER) {
  const k = Math.min(1, limit / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
  const c = canvas(cw, ch);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(el, 0, 0, cw, ch);
  return c;
}

function rasterizeCanvas(src, size, pad, kernel) {
  const m = Math.round(size * pad), inner = size - 2 * m;
  const sw = src.width, sh = src.height;
  const px = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  const bg0 = [px[0], px[1], px[2], px[3]];

  // trim: rows/columns whose every pixel is within 1 of the top-left pixel
  const differs = i => bg0[3] === 0 && px[i + 3] <= 1 ? false
    : Math.abs(px[i] - bg0[0]) > 1 || Math.abs(px[i + 1] - bg0[1]) > 1 || Math.abs(px[i + 2] - bg0[2]) > 1 || Math.abs(px[i + 3] - bg0[3]) > 1;
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (differs((y * sw + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = sw - 1; y1 = sh - 1; } // nothing to trim against: keep everything
  const tw = x1 - x0 + 1, th = y1 - y0 + 1;

  // fit inside inner × inner
  const k = inner / Math.max(tw, th);
  const rw = Math.max(1, Math.round(tw * k)), rh = Math.max(1, Math.round(th * k));
  const crop = src.getContext('2d', { willReadFrequently: true }).getImageData(x0, y0, tw, th).data;
  let data;
  if (kernel === 'lanczos') data = resizeLanczos(crop, tw, th, rw, rh);
  else {
    const c = canvas(rw, rh), g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, x0, y0, tw, th, 0, 0, rw, rh);
    data = g.getImageData(0, 0, rw, rh).data;
  }

  let transparent = false;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) { transparent = true; break; }
  const bg = transparent ? [0, 0, 0, 0] : bg0;

  const W = rw + 2 * m, H = rh + 2 * m;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) out.set(bg, i * 4);
  for (let y = 0; y < rh; y++) out.set(data.subarray(y * rw * 4, (y + 1) * rw * 4), ((y + m) * W + m) * 4);
  return { width: W, height: H, data: out };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.decoding = 'async';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Die Datei lässt sich nicht als Bild lesen.'));
    el.src = url;
  });
}

async function loadBitmap(file) {
  const url = URL.createObjectURL(file);
  try {
    const el = await loadImage(url);
    if (!el.naturalWidth || !el.naturalHeight) throw new Error('Das Bild hat keine Größe.');
    return { el, w: el.naturalWidth, h: el.naturalHeight };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

// SVGs often lack width/height or give tiny ones; set an explicit size from the viewBox so every
// browser draws them sharply at RENDER_LONG on the long side.
async function loadSvg(text, renderLong = RENDER_LONG) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) throw new Error('Die SVG-Datei ist nicht lesbar.');
  let vw = 0, vh = 0;
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { vw = vb[2]; vh = vb[3]; }
  else {
    vw = parseFloat(svg.getAttribute('width')) || 0; vh = parseFloat(svg.getAttribute('height')) || 0;
    if (vw > 0 && vh > 0) svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  }
  if (!(vw > 0 && vh > 0)) { vw = vh = 1; }
  const k = renderLong / Math.max(vw, vh);
  const w = Math.max(1, Math.round(vw * k)), h = Math.max(1, Math.round(vh * k));
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try { return { el: await loadImage(url), w, h }; }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
