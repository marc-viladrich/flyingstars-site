const form = document.querySelector<HTMLFormElement>('#inquiry-form');
if (form) {
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('[data-step]')];
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const label = form.querySelector<HTMLElement>('[data-step-label]')!;
  const bar = form.querySelector<HTMLElement>('.bar i')!;
  // All visible texts come from site/inquiry via the component (data-messages); none live in this script.
  const text: Record<string, string> = JSON.parse(form.dataset.messages || '{}');
  let step = 0;
  const show = (index: number, focus = true) => {
    step = index;
    steps.forEach((fieldset, i) => { fieldset.hidden = i !== index; });
    label.textContent = text.step.replace(/\{current\}/g, String(index + 1)).replace(/\{total\}/g, String(steps.length));
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
      if (error) error.textContent = valid ? '' : field.type === 'radio' ? text.occasion : field.type === 'email' && field.value ? text.invalidEmail : field.dataset.msg || text.required;
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
    select.value = [...select.options].find((option) => option.value===selected || option.text.startsWith(selected))?.value || '';
  }
  const drones = Number(params.get('drohnen'));
  if (Number.isInteger(drones) && drones >= 100 && drones <= 1000) {
    const input = document.createElement('input'); input.type = 'hidden'; input.name = 'drohnen'; input.value = String(drones); form.append(input);
  }
  select.addEventListener('change', () => form.querySelector('[name=drohnen]')?.remove());
  // Text typed into the price calculator's sky preview and the show put together in the configurator, written into
  // the message as an editable draft. Values are only assigned, never parsed as HTML.
  const skyText = params.get('text')?.replace(/\s+/g, ' ').trim().slice(0, 60);
  const showSummary = params.get('show')?.replace(/\r/g, '').trim().slice(0, 600);
  const message = form.querySelector<HTMLTextAreaElement>('[name=message]');
  const draft = [showSummary, skyText && text.skyText.replace(/\{text\}/g, () => skyText)].filter(Boolean).join('\n');
  if (draft && message && !message.value) message.value = draft;
  const occasion = params.get('anlass');
  const occasionInput = occasion ? [...form.querySelectorAll<HTMLInputElement>('[name=anlass]')].find((input) => input.value === occasion) : undefined;
  if (occasionInput && !form.querySelector('[name=anlass]:checked')) occasionInput.checked = true;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalid = steps.findIndex((fieldset) => !validate(fieldset));
    if (invalid >= 0) { show(invalid, false); validate(steps[invalid]); return; }
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    button.disabled = true; button.textContent = text.sending; status.textContent = '';
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.detail || text.sendFailed);
      if (result.state === 'not-configured') {
        status.textContent = text.notConfigured;
      } else {
        status.textContent = text.success;
        form.reset(); show(0, false);
      }
    } catch (error) { status.textContent = `${error instanceof Error ? error.message : text.failed} ${text.retry}`; }
    finally { button.disabled = false; button.textContent = text.submit; status.focus(); }
  });
  show(0, false);
}
