// Lichtraster- und Punkt-Reveal-Rezept, unverändert aus Marcs Bildeffekt-Labor übernommen
// (Kundenordner 27-blog-bilder-2026-11-21/effekt-labor/src/core/lichtraster.mjs, Stand 21.11.2026). Gleiche Regler, gleiche
// JSON-Exporte: ein im Labor gespeichertes Rezept lässt sich hier 1:1 einsetzen. Änderungen zuerst im Labor machen.
export const WIDTH = 1600;
export const HEIGHT = 1000;
export const GROUND = '#0f0d0c';
export const DEFAULTS = Object.freeze({
  cellSize: 12,
  peakMix: 0.5,
  gamma: 1.4,
  threshold: 0.04,
  pointSize: 0.96,
  opening: 1,
  opacityRange: 0.55,
  angle: 19.29,
  focusX: 0,
  focusY: 0,
});

const SAMPLES = 4;
const PALETTE = [[255, 158, 41], [219, 100, 232], [51, 237, 242]];
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const linear = Array.from({ length: 256 }, (_, byte) => {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
});

export function gridSize(cellSize, width = WIDTH, height = HEIGHT) {
  if (!Number.isFinite(cellSize) || cellSize < 1 || !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new RangeError('Ungültige Zell- oder Bildgröße.');
  }
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  return { cols, rows, sampleWidth: cols * SAMPLES, sampleHeight: rows * SAMPLES };
}

/** Cover crop in source pixels. Focus is the fraction of the available overflow. */
export function coverCrop(width, height, targetWidth, targetHeight, [focusX, focusY]) {
  const scale = Math.max(targetWidth / width, targetHeight / height);
  const cropWidth = targetWidth / scale;
  const cropHeight = targetHeight / scale;
  return {
    x: Math.max(0, width - cropWidth) * focusX,
    y: Math.max(0, height - cropHeight) * focusY,
    width: cropWidth,
    height: cropHeight,
  };
}

function levels(data, channels) {
  const gray = channels === 1 ? data : new Uint8Array(data.length / 4);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    if (channels === 4) {
      const j = i * 4;
      const y = (0.2126 * linear[data[j]] + 0.7152 * linear[data[j + 1]] + 0.0722 * linear[data[j + 2]])
        * data[j + 3] / 255;
      gray[i] = Math.round(255 * (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055));
    }
    histogram[gray[i]]++;
  }

  function percentile(fraction) {
    const index = Math.floor(gray.length * fraction);
    let count = 0;
    return histogram.findIndex(frequency => (count += frequency) > index);
  }

  const low = percentile(0.01);
  const range = Math.max(1, percentile(0.99) - low);
  return Float32Array.from(gray, v => clamp((v - low) / range));
}

function gradient(u) {
  const t = clamp(u) * 2;
  const segment = t <= 1 ? 0 : 1;
  const color = PALETTE[segment].map((v, i) => Math.round(v + (PALETTE[segment + 1][i] - v) * (t - segment)));
  return '#' + color.map(v => v.toString(16).padStart(2, '0')).join('');
}

function cellLevel(luma, x, y, sampleWidth, peakMix) {
  let sum = 0;
  let max = 0;
  for (let j = 0; j < SAMPLES; j++) {
    for (let i = 0; i < SAMPLES; i++) {
      const v = luma[(y * SAMPLES + j) * sampleWidth + x * SAMPLES + i];
      sum += v;
      max = Math.max(max, v);
    }
  }
  return (1 - peakMix) * sum / (SAMPLES * SAMPLES) + peakMix * max;
}

/**
 * The buffer contains row-major samples, already cover-cropped to gridSize().
 * Pass 1 channel for luminance bytes or 4 for RGBA. Reveal uses the same point
 * geometry as a photo mask and does not need a luminance buffer.
 */
export function createPoints(data, options = {}) {
  const {
    width = WIDTH, height = HEIGHT, channels = 1, effect = 'lichtraster',
    cellSize, peakMix, gamma, threshold, pointSize, opening, opacityRange, angle, diagonal = 0,
  } = { ...DEFAULTS, ...options };
  const reveal = effect === 'punkt-reveal';
  const { cols, rows, sampleWidth, sampleHeight } = gridSize(cellSize, width, height);
  if (!reveal && (![1, 4].includes(channels) || data?.length !== sampleWidth * sampleHeight * channels)) {
    throw new RangeError('Lichtraster erwartet einen Graustufen- oder RGBA-Puffer in der Abtastgröße.');
  }
  const luma = reveal ? null : levels(data, channels);
  const radians = angle * Math.PI / 180;
  const [dx, dy] = angle === DEFAULTS.angle ? [1, 0.35] : [Math.cos(radians), Math.sin(radians)];
  const span = cols * Math.abs(dx) + rows * Math.abs(dy);
  const offset = Math.min(0, cols * dx) + Math.min(0, rows * dy);
  const minOpacity = Number((1 - opacityRange).toFixed(2));
  const points = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = reveal ? 1 : Math.pow(cellLevel(luma, x, y, sampleWidth, peakMix), gamma);
      if (!reveal && v < threshold) continue;

      const cx = (x + 0.5) * cellSize;
      const cy = (y + 0.5) * cellSize;
      const brightnessScale = reveal
        ? 1 - diagonal * 0.88 * (1 - (cx / width + 1 - cy / height) / 2)
        : Math.sqrt(v);
      const radius = cellSize / 2 * pointSize * opening * brightnessScale;
      const r = Number(radius.toFixed(2));
      if (r === 0) continue;
      points.push({
        x: cx, y: cy, r,
        color: reveal ? null : gradient((x * dx + y * dy - offset) / span),
        opacity: reveal ? 1 : Number((minOpacity + opacityRange * v).toFixed(2)),
      });
    }
  }
  return points;
}

export function rasterSvg(points, width = WIDTH, height = HEIGHT) {
  const dots = points.map(({ x, y, r, color, opacity }) =>
    `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${color}" fill-opacity="${opacity.toFixed(2)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${GROUND}"/>${dots}</svg>`;
}
