// Gemeinsamer Kern für Website-Masken und Dashboard. Kantenhöhe und Punktgrößen in Kachelpixeln.
export const DEFAULTS = Object.freeze({
  punktradiusKantePx: 4.8,
  groessenvarianzProzent: 60,
  mindestabstandFaktor: 1.1,
  kantenwelleBreitPx: 56,
  wellenunruheProzent: 60,
  chaosProzent: 0,
  bandhoeheBreitPx: 120,
  animation: 'keine',
  animationsstaerkePx: 4,
});

export const SEED = 11;
export const MOTION_GROUPS = 4;
export const MAX_MOTION_PX = 4;

const TAU = Math.PI * 2;
const wrap = (value, period) => ((value % period) + period) % period;
const round = (value) => +value.toFixed(1);
const mobilePixels = (wide) => Math.round(wide * 32 / 72);

export function tileSizes(settings) {
  return {
    breit: { width: 960, band: settings.bandhoeheBreitPx, rise: settings.kantenwelleBreitPx },
    schmal: {
      width: 480,
      band: mobilePixels(settings.bandhoeheBreitPx),
      rise: mobilePixels(settings.kantenwelleBreitPx),
    },
  };
}

function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wave(rnd, width) {
  const phases = [rnd(), rnd(), rnd()].map((value) => value * TAU);
  return (x) => (
    (Math.sin(TAU * x / width + phases[0]) +
      0.55 * Math.sin(2 * TAU * x / width + phases[1]) +
      0.3 * Math.sin(3 * TAU * x / width + phases[2])) / (1 + 0.55 + 0.3) + 1
  ) / 2;
}

// Detuned oscillators with seeded wavelengths and phases, including a slower
// amplitude envelope. Blend neighboring copies with zero endpoint slope so
// wrapping preserves both height and tangent even with fractional frequencies.
export function edgeProfile(width, rise, unrest = 0, seed = SEED) {
  const mix = unrest / 100;
  const rnd = random(seed ^ 0x27b4a693);
  const waves = [[1.23, 0.48], [2.47, 0.38], [4.39, 0.22], [7.13, 0.12]]
    .map(([frequency, weight]) => [frequency + rnd() * 0.28, weight, rnd() * TAU]);
  const envelopePhase = rnd() * TAU;
  const weightSum = waves.reduce((sum, [, weight]) => sum + weight, 0);
  const irregular = (t) => {
    const signal = waves.reduce((sum, [frequency, weight, phase]) =>
      sum + weight * Math.sin(TAU * frequency * t + phase), 0) / weightSum;
    const envelope = 0.78 + 0.22 * Math.sin(TAU * 1.31 * t + envelopePhase);
    return envelope * signal;
  };

  return (x) => {
    const t = wrap(x, width) / width;
    const regular = Math.sin(TAU * t);
    if (!mix) return rise * (0.5 + 0.5 * regular);
    const fade = t ** 3 * (10 + t * (-15 + 6 * t));
    const closed = (1 - fade) * irregular(t) + fade * irregular(t - 1);
    return rise * (0.5 + 0.5 * ((1 - mix) * regular + mix * closed));
  };
}

function edgeFill(width, height, lift, bleed) {
  const step = 12;
  const digits = (value) => +value.toFixed(6);
  const y = (x) => digits(height - lift(x));
  const delta = (x) => digits((lift(x - 0.01) - lift(x + 0.01)) / 0.02 * step / 3);
  const start = bleed ? -step : 0;
  const stop = bleed ? width + step : width;
  let path = `M${start} ${y(start)}`;
  for (let x = start; x < stop; x += step) {
    const end = x + step;
    path += `C${x + step / 3} ${digits(y(x) + delta(x))} ${end - step / 3} ${digits(y(end) - delta(end))} ${end} ${y(end)}`;
  }
  return `${path}V${height}H${start}Z`;
}

// Dieselbe Mindestabstandsprüfung wie im Website-Generator.
// Nur Zellen im Radius des größten möglichen Konflikts können Treffer enthalten.
function pointIndex(width, height) {
  const columns = Math.ceil(width / 16);
  const cellWidth = width / columns;
  const cells = Array(columns * (Math.ceil(height / 16) + 3));
  const row = (y) => Math.floor(y / 16) + 1;
  let maxGap = 0;

  return {
    insert(dot) {
      const index = row(dot.y) * columns + Math.floor(dot.x / cellWidth);
      (cells[index] ??= []).push(dot);
      maxGap = Math.max(maxGap, dot.g);
    },
    isFar(x, y, gap) {
      const search = (gap + maxGap) / 2;
      const top = Math.max(0, row(y - search));
      const bottom = Math.min(cells.length / columns - 1, row(y + search));
      const left = Math.floor((x - search) / cellWidth);
      const right = Math.min(left + columns - 1, Math.floor((x + search) / cellWidth));

      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const bucket = cells[r * columns + wrap(c, columns)];
          if (!bucket) continue;
          for (const dot of bucket) {
            const dx = Math.abs(dot.x - x);
            const dy = dot.y - y;
            const minGap = (gap + dot.g) / 2;
            if (Math.min(dx, width - dx) ** 2 + dy ** 2 < minGap ** 2) return false;
          }
        }
      }
      return true;
    },
  };
}

export function generateTile(settings, { width, band, rise }, seed = SEED, { bleed = false } = {}) {
  const rnd = random(seed);
  const reachAt = wave(rnd, width);
  const denseAt = wave(rnd, width);
  const index = pointIndex(width, band);
  const dots = [];
  const variance = settings.groessenvarianzProzent / 100;
  const radiusScale = settings.punktradiusKantePx / 4.6;
  const spacing = settings.mindestabstandFaktor;
  const raster = Math.max(0, (50 - settings.chaosProzent) / 50);
  const jitter = Math.max(0, (settings.chaosProzent - 50) / 50);
  const pitch = 7 * radiusScale * spacing;
  const gridX = width / Math.max(1, Math.round(width / pitch));

  for (let i = 0; i < 400000 && dots.length < 6000; i++) {
    const rawX = rnd() * width;
    const d = rnd() ** 1.5;
    const x = raster
      ? wrap(rawX + raster * (Math.round(rawX / gridX) * gridX - rawX), width)
      : rawX;
    const reach = band * (0.55 + 0.45 * reachAt(x));
    const cover = 0.93 * (1 - d) ** 1.45 * (0.78 + 0.22 * denseAt(x));
    if (cover < 0.004) continue;

    const r = (1.4 + 3.2 * (1 - d) ** 1.2) * radiusScale * (1 - variance + rnd() * 2 * variance);
    const depth = d * reach - (rnd() - 0.5) * 3;
    const y = raster
      ? band - Math.max(0, depth + raster * (Math.round(depth / pitch) * pitch - depth))
      : band - depth;
    const g = (0.5 + 0.4 * Math.min(1, d / 0.35)) * Math.sqrt((Math.PI * r * r) / cover) * spacing;
    if (!index.isFar(x, y, g)) continue;

    const dot = { x, y, r, g, d };
    index.insert(dot);
    dots.push(dot);
  }

  const height = band + rise;
  const lift = edgeProfile(width, rise, settings.wellenunruheProzent, seed);
  const shift = random(seed ^ 0x5196f42);
  const points = dots.map((dot, i) => {
    const x = jitter ? wrap(dot.x + (shift() - 0.5) * pitch * 2.8 * jitter, width) : dot.x;
    const drift = jitter ? (shift() - 0.5) * pitch * 2.2 * jitter * Math.min(1, dot.d * 5) : 0;
    return {
      x,
      y: dot.y + rise - lift(x) + drift,
      r: dot.r,
      // Die dichteste Punktreihe trägt die Kante und bleibt bei Bewegung verankert.
      group: dot.d < 0.16 ? 0 : 1 + (i % MOTION_GROUPS),
    };
  });

  const fillPath = rise ? edgeFill(width, height, lift, bleed) : '';
  return { width, height, fillPath, points };
}

export function strokePaths(tile, group, padding = 0) {
  const bins = new Map();
  for (const dot of tile.points) {
    if (group !== undefined && dot.group !== group) continue;
    for (const dx of [0, -tile.width, tile.width]) {
      const x = dot.x + dx;
      if (x + dot.r + padding < 0 || x - dot.r - padding > tile.width) continue;
      const radius = (Math.round(dot.r * 4) / 4).toFixed(2);
      const fragments = bins.get(radius) ?? [];
      if (!bins.has(radius)) bins.set(radius, fragments);
      fragments.push(`M${round(x)} ${round(dot.y)}h0`);
    }
  }
  return [...bins].sort(([a], [b]) => a - b).map(([radius, fragments]) => ({
    strokeWidth: round(radius * 2),
    d: fragments.join(''),
  }));
}

export function maskSvg(tile) {
  const { width, height, fillPath } = tile;
  const fill = fillPath ? `<path fill="#fff" d="${fillPath}"/>` : '';
  const paths = strokePaths(tile).map(({ strokeWidth, d }) => (
    `<path stroke-width="${strokeWidth}" d="${d}"/>`
  )).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${fill}<g fill="none" stroke="#fff" stroke-linecap="round">${paths}</g></svg>`;
}


// Aufruf: node tools/himmel/uebergang.mjs [seed=11 | werte.json]
if (typeof process !== 'undefined' && process.argv?.[1]) {
  const { URL: NodeURL, pathToFileURL } = await import('node:url');
  if (pathToFileURL(process.argv[1]).href === import.meta.url) {
    const { readFileSync, writeFileSync } = await import('node:fs');
    const arg = process.argv[2];
    const settings = arg?.endsWith('.json') ? JSON.parse(readFileSync(arg, 'utf8')) : DEFAULTS;
    const seed = arg && !arg.endsWith('.json') ? Number(arg) : settings.seed ?? SEED;
    const files = { breit: 'uebergang.svg', schmal: 'uebergang-schmal.svg' };
    for (const [variant, size] of Object.entries(tileSizes(settings))) {
      const tile = generateTile(settings, size, seed);
      const file = files[variant];
      writeFileSync(new NodeURL(`../../public/media/${file}`, import.meta.url), maskSvg(tile));
      console.log(`${file}: ${tile.points.length} Punkte, ${tile.width} × ${tile.height} Kachelpixel`);
    }
  }
}
