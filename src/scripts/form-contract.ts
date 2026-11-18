// Gemeinsamer Vertrag beider Formulare (Anfrage und Herkunftsfrage auf der Danke-Seite) mit /api/contact:
// Erfolg ist ausschließlich ein vom Endpoint bestätigtes `state: 'sent'`. Fehlertexte kommen vom Server oder sind
// lokalisierte Ersatztexte, nie technische Browsermeldungen. Dazu dieselbe Feld-/Gruppenfehler-Logik.
export type SendResult = { state: 'sent'; requestId?: string } | { state: 'not-configured' };

/** Kein bestätigter Versand. `detail` ist die lokalisierte Servermeldung, falls es eine gab. */
export class SendError extends Error {
  constructor(readonly detail?: string) { super(detail ?? 'send failed'); }
}

export async function sendForm(action: string, body: FormData): Promise<SendResult> {
  let response: Response;
  try { response = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } }); }
  catch { throw new SendError(); }
  let result: { ok?: unknown; state?: unknown; detail?: unknown; requestId?: unknown };
  try { result = await response.json(); } catch { throw new SendError(); }
  if (response.ok && result?.ok === true && result.state === 'sent') return { state: 'sent', ...(typeof result.requestId === 'string' ? { requestId: result.requestId } : {}) };
  if (response.ok && result?.ok === true && result.state === 'not-configured') return { state: 'not-configured' };
  throw new SendError(typeof result?.detail === 'string' && result.detail ? result.detail : undefined);
}

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
/** Fehlermeldung an `[data-err-for=name]` und `aria-invalid` an allen Feldern dieses Namens (Radiogruppe = ein Feld). */
export function setFieldError(form: HTMLFormElement, name: string, message: string) {
  form.querySelectorAll<Field>(`[name="${name}"]`).forEach((field) => field.setAttribute('aria-invalid', String(Boolean(message))));
  const error = form.querySelector<HTMLElement>(`[data-err-for="${name}"]`);
  if (error) error.textContent = message;
}
/** Eine Eingabe nimmt den Fehler ihres Feldes zurück. */
export function clearErrorsOnInput(form: HTMLFormElement) {
  form.addEventListener('input', (event) => {
    const field = event.target as Field;
    if (field.name) setFieldError(form, field.name, '');
  });
}
