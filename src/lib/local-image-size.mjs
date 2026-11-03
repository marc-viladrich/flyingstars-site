import path from 'node:path';
import sharp from 'sharp';

const sizes = new Map();
/** Read the actual public asset. No content-side copy of logo dimensions. */
export function localImageSize(src) {
  const root = path.resolve(process.cwd(), 'public');
  const file = path.resolve(root, `.${src}`);
  if (!src.startsWith('/') || src.startsWith('//') || /[?#]/.test(src) || !file.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Expected a local public image path: ${src}`);
  }
  if (!sizes.has(file)) sizes.set(file, sharp(file).metadata().then(({ width, height }) => {
    if (!width || !height) throw new Error(`Image has no intrinsic dimensions: ${src}`);
    return { width, height };
  }));
  return sizes.get(file);
}
