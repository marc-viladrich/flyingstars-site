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
    // Runde 28, Designpass (Claude): Feld „Euer Logo“ mit zwei Kacheln (Original auf hellem Grund, weil Logos meist dunkel
    // auf transparent sind; Punktbild auf Bühnengrund), die Drohnenzahl als kleine Angabe, ein kurzer Hinweis darunter
    const label = document.createElement('span'); label.className = 'lbl'; label.id = 'logo-att-label'; label.textContent = t('logoMode.occasion');
    const list = document.createElement('ul'); list.className = 'logo-att-list'; list.setAttribute('aria-labelledby', label.id);
    for (const key of ['original', 'preview', 'drones'] as const) {
      const value = selected[key]; if (!value) continue;
      const row = document.createElement('li'); row.dataset.logoItem = key;
      const name = key === 'drones' ? t('logoInquiry.drones', {n:value}) : t(`logoInquiry.${key}`);
      if (key !== 'drones') {
        const file = value as File, thumb = document.createElement('span'), img = document.createElement('img');
        thumb.className = `logo-att-thumb is-${key}`;
        img.src = URL.createObjectURL(file); urls.push(img.src); img.width = 64; img.height = 64; img.alt = ''; thumb.append(img);
        const cap = document.createElement('span'), title = document.createElement('b'), meta = document.createElement('small');
        cap.className = 'logo-att-cap'; title.textContent = name; meta.textContent = `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`;
        cap.append(title, meta); row.append(thumb, cap);
      } else { const cap = document.createElement('span'); cap.className = 'logo-att-cap'; cap.textContent = name; row.append(cap); }
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'logo-att-x'; remove.textContent = '×'; remove.title = t('logoInquiry.remove');
      remove.setAttribute('aria-label', `${t('logoInquiry.remove')}: ${name}`);
      remove.addEventListener('click', () => { removeLogoInquiry(key); box.querySelector<HTMLButtonElement>('button')?.focus(); }); row.append(remove); list.append(row);
    }
    const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = t('logoInquiry.purpose');
    box.append(label, list, hint);
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
