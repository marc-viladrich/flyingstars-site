// Einfarbige Logos (Presse, Qualität und Sicherheit, Footer) als echte Dateien statt CSS-Filter.
// Warum (Marc, 21.11.2026): Safari 26 wendet `filter: brightness(0) invert(1)` auf <img> nicht mehr zuverlässig an
// (WebKit-Regression, iOS 26.2); auf seinem iPhone standen ZDF, ntv, WAZ, naturstrom … in Originalfarben. Die Kundenlogos
// im Laufband waren nicht betroffen, weil sie schon als weiße Dateien vorliegen. Darum wird jede Variante hier beim Build aus
// dem Original in public/brand/logos/ abgeleitet (Route src/pages/brand/logos/mono/[file].ts), es gibt keine Handkopien.
// - normal: jede sichtbare Fläche weiß (wie bisher brightness(0) invert(1))
// - knock: helle Flächen werden ausgespart (ZDF-„2“, ntv-Schrift), damit die Marke als Silhouette lesbar bleibt
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const MONO_DIR = '/brand/logos/mono/';
const SOURCE_DIR = '/brand/logos/';
const KNOCK = '--knock';

/** Öffentlicher Pfad der einfarbigen Fassung eines Logos aus public/brand/logos/. */
export function monoLogoSrc(src, { knock = false } = {}) {
  const m = /^\/brand\/logos\/([a-z0-9-]+)\.(svg|png)$/i.exec(src);
  if (!m) throw new Error(`Einfarbiges Logo nur für Dateien in ${SOURCE_DIR}: ${src}`);
  return `${MONO_DIR}${m[1]}${knock ? KNOCK : ''}.${m[2].toLowerCase()}`;
}

/** Umkehrung für die Route: Dateiname der Variante → Quellpfad und Modus. */
export function parseMonoFile(file) {
  const m = /^([a-z0-9-]+?)(--knock)?\.(svg|png)$/i.exec(file);
  if (!m) return null;
  return { source: `${SOURCE_DIR}${m[1]}.${m[3].toLowerCase()}`, knock: Boolean(m[2]), ext: m[3].toLowerCase() };
}

const NAMED = { white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0], blue: [0, 0, 255], green: [0, 128, 0], gray: [128, 128, 128], grey: [128, 128, 128] };
function rgbOf(value) {
  const v = value.trim().toLowerCase();
  let h = /^#([0-9a-f]{3,8})$/.exec(v)?.[1];
  if (h) {
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(v);
  if (rgb) return rgb[1].split(/[ ,/]+/).slice(0, 3).map((n) => (n.endsWith('%') ? parseFloat(n) * 2.55 : parseFloat(n)));
  return NAMED[v] ?? null;
}
const isLight = (rgb) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.8;

/** Farbe → Weiß (bzw. Schwarz = Aussparung in der Maske bei knock). none/transparent/url()/currentColor bleiben. */
function paint(value, knock) {
  const rgb = rgbOf(value);
  if (!rgb) return value;
  return knock && isLight(rgb) ? '#000' : '#fff';
}

const PAINT = /((?:fill|stroke|stop-color|color)\s*[:=]\s*["']?)(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|[a-zA-Z]+)/g;

/** SVG-Quelltext → einfarbig weiße Fassung. */
export function monoSvg(text, { knock = false } = {}) {
  const open = /<svg\b[^>]*>/i.exec(text);
  const close = text.lastIndexOf('</svg>');
  if (!open || close < 0) throw new Error('Kein <svg>-Element gefunden');
  const attrs = open[0];
  const vb = /viewBox\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const w = /\swidth\s*=\s*["']([\d.]+)/i.exec(attrs)?.[1];
  const h = /\sheight\s*=\s*["']([\d.]+)/i.exec(attrs)?.[1];
  const box = vb?.length === 4 ? vb : w && h ? [0, 0, Number(w), Number(h)] : null;
  if (!box) throw new Error('SVG ohne viewBox und ohne Breite/Höhe');
  const inner = text.slice(open.index + attrs.length, close).replace(PAINT, (_, pre, color) => pre + paint(color, knock));
  // Präfix-Namensräume der Quelle (sodipodi:, inkscape: …) mitnehmen, sonst ist die Datei kein gültiges XML mehr
  const ns = new Map([['xlink', 'http://www.w3.org/1999/xlink']]);
  for (const [, k, v] of attrs.matchAll(/\sxmlns:([\w-]+)\s*=\s*["']([^"']+)["']/g)) if (k !== 'svg') ns.set(k, v);
  const nsAttrs = [...ns].map(([k, v]) => ` xmlns:${k}="${v}"`).join('');
  const head = `<svg xmlns="http://www.w3.org/2000/svg"${nsAttrs} viewBox="${box.join(' ')}"${w ? ` width="${w}"` : ''}${h ? ` height="${h}"` : ''}>`;
  if (!knock) return `${head}<g fill="#fff">${inner}</g></svg>`;
  // Aussparung: die Zeichnung wird zur Luminanzmaske (weiß = sichtbar, schwarz = ausgespart) über einer weißen Fläche
  const [x, y, bw, bh] = box;
  return `${head}<defs><mask id="fs-mono-knock" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${bw}" height="${bh}"><g fill="#fff">${inner}</g></mask></defs><rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#fff" mask="url(#fs-mono-knock)"/></svg>`;
}

/** PNG → weiß bei gleicher Deckkraft (entspricht brightness(0) invert(1)). knock wird bei Rastergrafiken nicht unterstützt. */
export async function monoPng(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

/** Alle ableitbaren Varianten (für getStaticPaths). */
export async function monoLogoFiles(publicRoot = path.resolve(process.cwd(), 'public')) {
  const files = await fs.readdir(path.join(publicRoot, SOURCE_DIR));
  return files.filter((f) => /^[a-z0-9-]+\.(svg|png)$/i.test(f)).flatMap((f) => {
    const src = `${SOURCE_DIR}${f}`;
    // Aussparung nur bei farbigen Vektor-Logos; weiße Fassungen (-weiss) hätten nichts mehr übrig
    return f.endsWith('.svg') && !/-weiss\.svg$/.test(f) ? [monoLogoSrc(src), monoLogoSrc(src, { knock: true })] : [monoLogoSrc(src)];
  }).map((p) => p.slice(MONO_DIR.length));
}

/** Inhalt einer Variante aus der Quelldatei. */
export async function renderMonoLogo(file, publicRoot = path.resolve(process.cwd(), 'public')) {
  const parsed = parseMonoFile(file);
  if (!parsed) return null;
  const buf = await fs.readFile(path.join(publicRoot, parsed.source));
  if (parsed.ext === 'png') return parsed.knock ? null : { type: 'image/png', body: await monoPng(buf) };
  return { type: 'image/svg+xml', body: monoSvg(buf.toString('utf8'), { knock: parsed.knock }) };
}
