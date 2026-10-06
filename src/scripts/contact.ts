const form = document.querySelector<HTMLFormElement>('#inquiry-form');
if (form) {
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('[data-step]')];
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const label = form.querySelector<HTMLElement>('[data-step-label]')!;
  const bar = form.querySelector<HTMLElement>('.bar i')!;
  let step = 0;
  const show = (index: number, focus = true) => {
    step = index;
    steps.forEach((fieldset, i) => { fieldset.hidden = i !== index; });
    label.textContent = `Schritt ${index + 1} von ${steps.length}`;
    bar.style.width = `${(index + 1) / steps.length * 100}%`;
    if (focus) steps[index].querySelector<HTMLInputElement>('input,select,textarea')?.focus();
  };
  const validate = (container: Element) => {
    const fields = [...container.querySelectorAll<HTMLInputElement>('[required]')];
    let first: HTMLInputElement | undefined;
    fields.forEach((field) => {
      const valid = field.checkValidity();
      const error = form.querySelector<HTMLElement>(`[data-err-for="${field.name}"]`);
      field.setAttribute('aria-invalid', String(!valid));
      if (error) error.textContent = valid ? '' : field.type === 'radio' ? 'Bitte wähle einen Anlass.' : field.type === 'email' && field.value ? 'Bitte gib eine gültige E-Mail-Adresse ein.' : field.dataset.msg || 'Bitte ausfüllen.';
      if (!valid) first ||= field;
    });
    first?.focus();
    return !first;
  };
  form.noValidate = true;
  form.querySelectorAll<HTMLElement>('.progress,.bar').forEach((element) => { element.hidden = false; });
  form.querySelector('[data-next]')?.addEventListener('click', () => { if (validate(steps[step])) show(1); });
  form.querySelector('[data-back]')?.addEventListener('click', () => show(0));
  form.querySelectorAll<HTMLInputElement>('input,select,textarea').forEach((field) => field.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    const error = form.querySelector<HTMLElement>(`[data-err-for="${field.name}"]`);
    if (error) error.textContent = '';
  }));
  const params = new URLSearchParams(location.search);
  const selected = params.get('paket');
  const select = form.querySelector<HTMLSelectElement>('[name=paket]')!;
  if (selected && ['SPARK','HORIZON','ODYSSEY'].includes(selected)) {
    select.value = [...select.options].find((option) => option.text.startsWith(selected))?.value || '';
  }
  const drones = Number(params.get('drohnen'));
  if (Number.isInteger(drones) && drones >= 100 && drones <= 1000) {
    const input = document.createElement('input'); input.type = 'hidden'; input.name = 'drohnen'; input.value = String(drones); form.append(input);
  }
  select.addEventListener('change', () => form.querySelector('[name=drohnen]')?.remove());
  // Text typed into the price calculator's sky preview, written into the message as an editable draft.
  const skyText = params.get('text')?.replace(/\s+/g, ' ').trim().slice(0, 60);
  const message = form.querySelector<HTMLTextAreaElement>('[name=message]');
  if (skyText && message && !message.value) message.value = `Text am Himmel: ${skyText}`;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalid = steps.findIndex((fieldset) => !validate(fieldset));
    if (invalid >= 0) { show(invalid, false); validate(steps[invalid]); return; }
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    button.disabled = true; button.textContent = 'Wird gesendet …'; status.textContent = '';
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.detail || 'Die Anfrage konnte nicht gesendet werden.');
      if (result.state === 'not-configured') {
        status.textContent = 'Der Formularversand ist noch nicht eingerichtet. Es wurde nichts gesendet oder gespeichert. Bitte schreibe uns direkt an team@flyingstars.art.';
      } else {
        status.textContent = 'Deine Anfrage wurde gesendet. Wir melden uns innerhalb von 48 Stunden.';
        form.reset(); show(0, false);
      }
    } catch (error) { status.textContent = `${error instanceof Error ? error.message : 'Versand fehlgeschlagen.'} Bitte versuche es später erneut oder schreibe direkt an team@flyingstars.art.`; }
    finally { button.disabled = false; button.textContent = 'Anfrage senden'; status.focus(); }
  });
  show(0, false);
}
