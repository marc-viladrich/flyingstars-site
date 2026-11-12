import { LOGO_FILE_LIMIT, validateLogoFile } from '../content/logo-attachments.mjs';
let selection = null;
let preparedAt = 0;
const storageKey = 'flyingstars:logo-inquiry';
const forgetStore = () => { try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be blocked; ordinary enquiries still work. */ } };
export const logoInquiryReady = (async () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (!saved || Date.now() - saved.at > 30 * 60 * 1000) { forgetStore(); return; }
    const restore = value => value ? new File([Uint8Array.from(atob(value.data), c => c.charCodeAt(0))], value.name, { type:value.type }) : null;
    preparedAt = saved.at;
    selection = { original:restore(saved.original), preview:restore(saved.preview), drones:saved.drones };
    for (const key of ['original','preview']) if (selection[key]) await validateLogoFile(selection[key], key === 'preview');
  } catch { selection = null; forgetStore(); }
})();
const notify = () => window.dispatchEvent(new Event('flyingstars:logo-inquiry'));
export const getLogoInquiry = () => {
  if (selection && Date.now()-preparedAt > 30*60*1000) { selection=null; forgetStore(); }
  return selection;
};
export function clearLogoInquiry() { selection = null; forgetStore(); notify(); }
export function removeLogoInquiry(key) { if (selection) { selection = { ...selection, [key]: null };
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved) { saved[key] = null; sessionStorage.setItem(storageKey, JSON.stringify(saved)); }
  } catch { forgetStore(); }
  notify(); } }
export async function prepareLogoInquiry(file, points, drones) {
  await validateLogoFile(file);
  const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1000;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#071024'; ctx.fillRect(0,0,1000,1000);
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const minX=Math.min(...xs), minY=Math.min(...ys), w=Math.max(...xs)-minX, h=Math.max(...ys)-minY;
  const scale=880/Math.max(w,h,0.01);
  for (const p of points) { ctx.fillStyle=`rgb(${p.c.join(',')})`; ctx.beginPath(); ctx.arc(500+(p.x-minX-w/2)*scale,500+(p.y-minY-h/2)*scale,3,0,Math.PI*2); ctx.fill(); }
  const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
  if (!blob || blob.size > LOGO_FILE_LIMIT) throw Error('attachment');
  const next = { original: file, preview: new File([blob], 'logo-preview.png', {type:'image/png'}), drones };
  const encode = async f => {
    let binary = ''; const bytes = new Uint8Array(await f.arrayBuffer());
    for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    return { name:f.name, type:f.type, data:btoa(binary) };
  };
  // Tab-scoped, expires after 30 minutes, cleared on confirmed send/removal.
  // A full quota fails preparation visibly rather than silently dropping the attachment.
  const saved = { at:Date.now(), original:await encode(file), preview:await encode(next.preview), drones };
  sessionStorage.setItem(storageKey, JSON.stringify(saved));
  preparedAt = saved.at; selection = next;
  notify();
}
