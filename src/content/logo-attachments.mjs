// 2 MiB per image, two images + 64 KiB fields/multipart overhead. No persistent storage.
export const LOGO_FILE_LIMIT = 2 * 1024 * 1024;
export const LOGO_BODY_LIMIT = 2 * LOGO_FILE_LIMIT + 64 * 1024;
const types = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
export async function validateLogoFile(file, preview = false) {
  if (!file || typeof file === 'string' || !file.size || file.size > LOGO_FILE_LIMIT || !types[file.type] || (preview && file.type !== 'image/png')) throw Error('attachment');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = (a, b) => String.fromCharCode(...bytes.slice(a, b));
  let valid = false;
  const view = new DataView(bytes.buffer);
  const pixels = (w,h) => w > 0 && h > 0 && w * h <= 16_000_000;
  if (file.type === 'image/png') valid = bytes.length >= 33 && ascii(1, 4) === 'PNG' && bytes[0] === 137 && ascii(12,16) === 'IHDR' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  if (valid && file.type === 'image/png') {
    valid = pixels(view.getUint32(16), view.getUint32(20));
    let pos = 8, data = false, end = false;
    while (valid && pos + 12 <= bytes.length) {
      const length = view.getUint32(pos), type = ascii(pos+4,pos+8);
      if (pos+12+length > bytes.length) { valid=false; break; }
      if (type === 'IDAT') data=true;
      pos += length+12;
      if (type === 'IEND') { end=length===0 && pos===bytes.length; break; }
    }
    valid = valid && data && end;
  }
  if (file.type === 'image/jpeg') valid = bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  if (valid && file.type === 'image/jpeg') {
    let pos=2, frame=false;
    while (pos+4 < bytes.length && bytes[pos] === 255) {
      const marker=bytes[pos+1]; if (marker===218) break;
      const length=view.getUint16(pos+2); if (length<2 || pos+2+length>bytes.length) {valid=false;break;}
      if ([192,193,194].includes(marker)) { frame=length>=8 && pixels(view.getUint16(pos+7),view.getUint16(pos+5)); }
      pos+=length+2;
    }
    valid = valid && frame;
  }
  if (file.type === 'image/webp') valid = bytes.length >= 30 && ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(ascii(12,16));
  if (valid && file.type === 'image/webp') {
    valid = view.getUint32(4,true)+8===bytes.length;
    const kind=ascii(12,16);
    if (kind==='VP8X') valid = valid && pixels(1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16));
    if (kind==='VP8 ') valid = valid && bytes[23]===157 && bytes[24]===1 && bytes[25]===42 && pixels(view.getUint16(26,true)&16383,view.getUint16(28,true)&16383);
    if (kind==='VP8L') valid = valid && bytes[20]===47 && pixels(1+((bytes[21]|bytes[22]<<8)&16383),1+((bytes[22]>>6|bytes[23]<<2|bytes[24]<<10)&16383));
  }
  if (file.type === 'image/svg+xml') {
    // Accept only static geometry. Never evaluate SVG or embed it as HTML on the server.
    let svg = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim().replace(/^<\?xml[^?]*\?>\s*/, '').replace(/<!--[\s\S]*?-->/g, '');
    const tags = /<\/?([a-zA-Z][\w:-]*)([^<>]*?)\s*\/?\s*>/g;
    const allowed = new Set('svg g path rect circle ellipse line polyline polygon title desc defs linearGradient radialGradient stop clipPath'.split(' '));
    const attrs = new Set('xmlns viewBox width height x y x1 x2 y1 y2 cx cy r rx ry d points fill stroke stroke-width stroke-linecap stroke-linejoin fill-rule clip-rule opacity fill-opacity stroke-opacity transform id offset stop-color stop-opacity gradientUnits gradientTransform'.split(' '));
    let count = 0; const stack=[];
    valid = /^<svg[\s>]/.test(svg) && /<\/svg>$/.test(svg) && !/[&]/.test(svg);
    const text = svg.replace(tags, (tag, name, raw) => {
      count++;
      if (tag.startsWith('</')) { if (stack.pop() !== name || raw.trim()) valid=false; }
      else if (!tag.endsWith('/>')) stack.push(name);
      if (!allowed.has(name)) valid = false;
      const rest = raw.replace(/\s+([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g, (_, key, quoted) => {
        const value = quoted.slice(1,-1);
        if (!attrs.has(key) || /url\s*\(|[<>\\]/i.test(value) || (key === 'xmlns' && value !== 'http://www.w3.org/2000/svg')) valid = false;
        return '';
      });
      if (rest.trim()) valid = false;
      return '';
    });
    if (!count || stack.length || /[<>]/.test(text)) valid = false;
  }
  if (!valid) throw Error('attachment');
  return { bytes, extension: types[file.type] };
}

// Brevo's allowlist excludes SVG and WebP. Preserve exact original bytes inside a
// single-file, uncompressed ZIP rather than changing the type or losing the original.
function zip(bytes, filename) {
  const name = new TextEncoder().encode(filename);
  let crc = 0xffffffff;
  for (const b of bytes) { crc ^= b; for (let j=0;j<8;j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  crc = (crc ^ 0xffffffff) >>> 0;
  const out = new Uint8Array(30 + name.length + bytes.length + 46 + name.length + 22), v = new DataView(out.buffer);
  const u16 = (p,n) => v.setUint16(p,n,true), u32 = (p,n) => v.setUint32(p,n,true);
  u32(0,0x04034b50); u16(4,20); u32(14,crc); u32(18,bytes.length); u32(22,bytes.length); u16(26,name.length); out.set(name,30); out.set(bytes,30+name.length);
  const c = 30+name.length+bytes.length;
  u32(c,0x02014b50); u16(c+4,20); u16(c+6,20); u32(c+16,crc); u32(c+20,bytes.length); u32(c+24,bytes.length); u16(c+28,name.length); out.set(name,c+46);
  const e=c+46+name.length; u32(e,0x06054b50); u16(e+8,1); u16(e+10,1); u32(e+12,46+name.length); u32(e+16,c);
  return out;
}
export async function brevoAttachments(form) {
  const result = [];
  for (const field of ['logo-original', 'logo-preview']) {
    const file = form.get(field);
    if (file === null) continue;
    const { bytes, extension } = await validateLogoFile(file, field === 'logo-preview');
    let name = `${field}.${extension}`, payload = bytes;
    if (extension === 'svg' || extension === 'webp') { payload = zip(bytes, name); name += '.zip'; }
    let binary = '';
    for (let i=0;i<payload.length;i+=8192) binary += String.fromCharCode(...payload.subarray(i,i+8192));
    result.push({ name, content: btoa(binary) });
  }
  return result;
}
