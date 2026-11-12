import { getLogoInquiry, removeLogoInquiry, clearLogoInquiry, logoInquiryReady } from './logo-inquiry.mjs';
import { t } from '../i18n/ui.mjs';
export function logoInquiryForm(form: HTMLFormElement) {
  const box = form.querySelector<HTMLElement>('[data-logo-inquiry]')!;
  let urls: string[] = [];
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const buttonText = () => {
    const selected = getLogoInquiry();
    return selected?.original || selected?.preview ? t('logoInquiry.send') : t('contactform.sendEnquiry');
  };
  const draw = () => {
    urls.forEach(url => URL.revokeObjectURL(url)); urls = []; box.replaceChildren();
    const selected = getLogoInquiry();
    box.hidden = !selected || !Object.values(selected).some(Boolean);
    if (box.hidden || !selected) { button.textContent = buttonText(); return; }
    const hint = document.createElement('p'); hint.textContent = t('logoInquiry.purpose'); box.append(hint);
    for (const key of ['original', 'preview', 'drones'] as const) {
      const value = selected[key]; if (!value) continue;
      const row = document.createElement('div'); row.dataset.logoItem = key;
      if (key !== 'drones') {
        const file = value as File, img = document.createElement('img');
        img.src = URL.createObjectURL(file); urls.push(img.src); img.width = 96; img.height = 96; img.style.objectFit = 'contain'; img.alt = t(`logoInquiry.${key}`); row.append(img);
        const label = document.createElement('span'); label.textContent = `${t(`logoInquiry.${key}`)}: ${file.name} (${Math.ceil(file.size / 1024)} KiB)`; row.append(label);
      } else { row.append(t('logoInquiry.drones', {n:value})); }
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = t('logoInquiry.remove'); remove.setAttribute('aria-label', `${t('logoInquiry.remove')}: ${key === 'drones' ? t('logoInquiry.drones', {n:value}) : t(`logoInquiry.${key}`)}`);
      remove.addEventListener('click', () => { removeLogoInquiry(key); box.querySelector<HTMLButtonElement>('button')?.focus(); }); row.append(remove); box.append(row);
    }
    const rights = document.createElement('p'); rights.textContent = t('logoInquiry.rights'); box.append(rights);
    button.textContent = buttonText();
  };
  window.addEventListener('flyingstars:logo-inquiry', draw); void logoInquiryReady.then(draw);
  return {
    append(data: FormData) {
      const selected = getLogoInquiry(); if (!selected) return;
      if (selected.original) data.set('logo-original', selected.original);
      if (selected.preview) data.set('logo-preview', selected.preview);
      // This explicit, removable choice owns the submitted drone count.
      data.delete('drohnen');
      if (selected.drones) data.set('drohnen', String(selected.drones));
    },
    clear: clearLogoInquiry, buttonText,
  };
}
