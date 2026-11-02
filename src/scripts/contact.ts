import { t } from '../i18n/ui.mjs';
const form = document.querySelector<HTMLFormElement>('#inquiry-form');
if (form) {
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('[data-step]')];
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const label = form.querySelector<HTMLElement>('[data-step-label]')!;
  const marks = [...form.querySelectorAll<HTMLElement>('.ask-steps span')];
  let step = 0;
  const show = (index: number, focus = true) => {
    step = index;
    steps.forEach((fieldset, i) => { fieldset.hidden = i !== index; });
    marks.forEach((mark, i) => mark.classList.toggle('on', i <= index));
    form.classList.toggle('is-2', index === 1);
    if (focus) label.textContent = t('contact.stepValueOfValue', { v0: index + 1, v1: steps.length });
    if (focus) steps[index].querySelector<HTMLInputElement>('input,select,textarea')?.focus();
  };
  // Datum: Pflicht, außer „Noch nicht festgelegt“ ist angekreuzt (ohne JS bleibt es freiwillig)
  const date = form.querySelector<HTMLInputElement>('[name=datum]');
  const dateOpen = form.querySelector<HTMLInputElement>('[data-date-open]');
  const syncDate = () => {
    if (!date || !dateOpen) return;
    date.required = !dateOpen.checked; date.disabled = dateOpen.checked;
    if (dateOpen.checked) { date.value = ''; date.removeAttribute('aria-invalid'); const e = form.querySelector<HTMLElement>('[data-err-for="datum"]'); if (e) e.textContent = ''; }
  };
  dateOpen?.addEventListener('change', syncDate); syncDate();
  const validate = (container: Element) => {
    const fields = [...container.querySelectorAll<HTMLInputElement>('[required]')];
    let first: HTMLInputElement | undefined;
    fields.forEach((field) => {
      const valid = field.checkValidity();
      const error = form.querySelector<HTMLElement>(`[data-err-for="${field.name}"]`);
      field.setAttribute('aria-invalid', String(!valid));
      if (error) error.textContent = valid ? '' : field.type === 'radio' ? t('contact.pleaseChooseAnOccasion') : field.type === 'email' && field.value ? t('contact.pleaseEnterAValidEmailAddress') : field.dataset.msg || t('contact.pleaseFillInThisField');
      if (!valid) first ||= field;
    });
    first?.focus();
    return !first;
  };
  form.noValidate = true;
  form.querySelectorAll<HTMLElement>('.ask-steps').forEach((element) => { element.hidden = false; });
  form.querySelector('[data-next]')?.addEventListener('click', () => { if (validate(steps[step])) show(1); });
  form.querySelector('[data-back]')?.addEventListener('click', () => show(0));
  form.querySelectorAll<HTMLInputElement>('input,select,textarea').forEach((field) => field.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    const error = form.querySelector<HTMLElement>(`[data-err-for="${field.name}"]`);
    if (error) error.textContent = '';
  }));
  const params = new URLSearchParams(location.search);
  const selected = params.get('paket');
  const packs = [...form.querySelectorAll<HTMLInputElement>('[name=paket]')];
  const pick = selected ? packs.find((input) => input.value === selected) : undefined;
  if (pick) pick.checked = true;
  const drones = Number(params.get('drohnen'));
  if (Number.isInteger(drones) && drones >= 100 && drones <= 1000) {
    const input = document.createElement('input'); input.type = 'hidden'; input.name = 'drohnen'; input.value = String(drones); form.append(input);
  }
  packs.forEach((input) => input.addEventListener('change', () => form.querySelector('[name=drohnen]')?.remove()));
  // Text typed into the price calculator's sky preview and the show put together in the configurator, written into
  // the message as an editable draft. Values are only assigned, never parsed as HTML.
  const skyText = params.get('text')?.replace(/\s+/g, ' ').trim().slice(0, 60);
  const showSummary = params.get('show')?.replace(/\r/g, '').trim().slice(0, 600);
  const message = form.querySelector<HTMLTextAreaElement>('[name=message]');
  const draft = [showSummary, skyText && t('contact.textInTheSkyValue', { v0: skyText })].filter(Boolean).join('\n');
  if (draft && message && !message.value) message.value = draft;
  // Paketkarten auf derselben Seite (Startseite): Klick wählt das Paket im Formular und springt hin, statt zu /kontakt/
  document.querySelectorAll<HTMLAnchorElement>('[data-pick-paket]').forEach((link) => link.addEventListener('click', (event) => {
    const input = packs.find((p) => p.value === link.dataset.pickPaket);
    if (!input) return;
    event.preventDefault();
    input.checked = true;
    form.querySelector('[name=drohnen]')?.remove();
    show(0, false);
    form.closest('section')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#anfrage');
  }));
  // Extras von der Preisseite: Feld einblenden und vorbelegen
  const extras = (params.get('extras') ?? '').split(',').filter(Boolean);
  const extraInputs = [...form.querySelectorAll<HTMLInputElement>('[name=extras]')];
  const extraPicks = extraInputs.filter((input) => extras.includes(input.value));
  if (extraPicks.length) {
    extraPicks.forEach((input) => { input.checked = true; });
    form.querySelector<HTMLElement>('[data-extras-field]')!.hidden = false;
  }
  const occasion = params.get('anlass');
  const occasionInput = occasion ? [...form.querySelectorAll<HTMLInputElement>('[name=anlass]')].find((input) => input.value === occasion) : undefined;
  if (occasionInput && !form.querySelector('[name=anlass]:checked')) occasionInput.checked = true;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalid = steps.findIndex((fieldset) => !validate(fieldset));
    if (invalid >= 0) { show(invalid, false); validate(steps[invalid]); return; }
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    button.disabled = true; button.textContent = t('contact.sending'); status.textContent = '';
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.detail || t('contact.yourEnquiryCouldNotBeSent'));
      if (result.state === 'not-configured') {
        status.textContent = t('contact.formDeliveryHasNotBeenSetUpYetNothingWas');
      } else {
        status.textContent = t('contact.yourEnquiryHasBeenSentWeLlGetBackTo');
        form.reset(); syncDate(); show(0, false);
      }
    } catch (error) { status.textContent = t('contact.valuePleaseTryAgainLaterOrEmailTeamFlyingstarsArt', { v0: error instanceof Error ? error.message : t('contact.deliveryFailed') }); }
    finally { button.disabled = false; button.textContent = t('contactform.sendEnquiry'); status.focus(); }
  });
  show(0, false);
}
