/** Keep a submit on this page until the asynchronously loaded handler owns it. */
export function deferredForm(form, load) {
  let pending;
  let queued = false;
  const ensure = () => {
    if (!pending) pending = Promise.resolve().then(load).then((module) => {
      form.removeEventListener('submit', submit, { capture: true });
      return module;
    }, (error) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  const submit = async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (queued) return;
    queued = true;
    const submitter = event.submitter;
    try {
      await ensure();
      // Re-enter the ordinary submit path once, preserving the actual submit button.
      form.requestSubmit(submitter || undefined);
    } catch {
      const status = form.querySelector('[data-form-status]');
      if (status) {
        status.textContent = status.dataset.loadError;
        status.focus();
      }
    } finally {
      queued = false;
    }
  };
  form.addEventListener('submit', submit, { capture: true });
  return ensure;
}
