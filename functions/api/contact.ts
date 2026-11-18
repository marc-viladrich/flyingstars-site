import { LOGO_BODY_LIMIT, brevoAttachments } from '../../src/content/logo-attachments.mjs';
import {INQUIRY_PACKAGES,INQUIRY_LIMITS} from '../../src/content/inquiry.mjs';
import {FORM_OCCASION_IDS} from '../../src/content/occasions.mjs';
import { createTranslator } from '../../src/i18n/ui.mjs';
import { LOCALES, localizedHref, localeFromPath } from '../../src/i18n/routing.mjs';
import { SOURCE_IDS, SOURCE_OTHER, SOURCE_TEXT_MAX, INQUIRY_REF } from '../../src/content/inquiry-source.mjs';

// Cloudflare Pages Function. Nur Web-Standard-APIs für einen späteren EU-Umzug.
// Keine eigene dauerhafte Ablage und keine Anwendungslogs. Hosting, Brevo und
// Empfängerpostfach verarbeiten/speichern dennoch Daten, siehe Datenschutz-Doku.
interface Env {
  BREVO_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  TURNSTILE_SECRET?: string; // Erst mit passendem Widget + Datenschutzinformation aktivieren.
  SITE_NAME?: string;
}

const MAX_BODY = LOGO_BODY_LIMIT; // Auch ohne oder mit falschem Content-Length durchsetzen.
const MAX = INQUIRY_LIMITS;
const EXTRA_FIELDS = ['anlass', 'datum', 'datum-offen', 'ort', 'paket', 'drohnen', 'telefon', 'firma', 'quelle', 'ref'];
const CONTROL = /[\u0000-\u001f\u007f]/;

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  // Frühe Fehler verwenden die Sprache der gleichursprünglichen Formularseite.
  const referrer = request.headers.get('referer');
  let locale = 'de';
  try {
    const page = new URL(referrer ?? request.url);
    if (page.origin === new URL(request.url).origin) locale = localeFromPath(page.pathname);
  } catch { /* Fehlender/ungültiger Referrer: deutsche Standardsprache. */ }
  let t = createTranslator(locale);
  // Keine fremden Websites als Browser-Mailrelay. Kein Ersatz für ein Rate-Limit.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return problem(403, t('contactAPI.origin'));
  const ct = request.headers.get('content-type') ?? '';
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)(;|$)/i.test(ct)) return problem(415, t('contactAPI.formData'));
  let form: FormData;
  let bodySize = 0;
  try {
    if (Number(request.headers.get('content-length')) > (/^application\/x-www-form-urlencoded/i.test(ct) ? INQUIRY_LIMITS.body : MAX_BODY)) return problem(413, t('contactAPI.bodySize'));
    const reader = request.body?.getReader();
    if (!reader) return problem(400, t('contactAPI.empty'));
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY) {
          await reader.cancel();
          return problem(413, t('contactAPI.bodySize'));
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    bodySize = size;
    form = await new Response(bytes, { headers: { 'content-type': ct } }).formData();
  } catch { return problem(400, t('contactAPI.unreadable')); }

  // Only the two named attachments are accepted, each at most once.
  if ([...form].length > INQUIRY_LIMITS.fields || [...form].some(([key, value]) => (typeof value !== 'string' && !['logo-original', 'logo-preview'].includes(key)) || (key !== 'extras' && form.getAll(key).length !== 1))) {
    return problem(400, t('contactAPI.invalidForm'));
  }
  if (![...form].some(([,value]) => typeof value !== 'string') && bodySize > INQUIRY_LIMITS.body) return problem(413, t('contactAPI.bodySize'));
  locale = LOCALES.find((value) => value === form.get('locale')) ?? 'de';
  t = createTranslator(locale);
  const get = (key: string) => String(form.get(key) ?? '').trim();
  // Honeypot: bewusst Erfolg vortäuschen, ohne Versand.
  if (get('website')) return ok(request, 'sent', locale);
  // Zweite kleine Meldung von der Danke-Seite: woher die Anfrage kam. Keine Personendaten, nur Auswahl, optionaler
  // Kurztext und der Zufallswert der Anfrage (src/content/inquiry-source.mjs).
  if (get('kind') === 'quelle') return source(request, env, form, locale, t);
  // Ergänzende, umgehbare Zeitfalle. Kein Tracking, keine Sperre für No-JS.
  const duration = get('form-duration');
  if (duration && (!/^\d{1,12}$/.test(duration) || Number(duration) < 2000)) {
    return problem(400, t('contactAPI.wait'));
  }

  const name = get('name'), email = get('email'), message = get('message');
  const extra: Record<string, string> = Object.fromEntries(EXTRA_FIELDS.map((key) => [key, get(key)]));
  const extras = form.getAll('extras').map((value) => String(value).trim()).filter(Boolean);
  if (extras.length > INQUIRY_LIMITS.extras || extras.some((value) => !/^[a-z]+(-[a-z]+)*$/.test(value) || value.length > INQUIRY_LIMITS.extraId)) return problem(400, t('contactAPI.extras'));
  if (!name || !email || (!message && !extra.anlass)) return problem(400, t('contactAPI.required'));
  if (Object.values(extra).some((value) => value.length > INQUIRY_LIMITS.extra || CONTROL.test(value))) return problem(400, t('contactAPI.additional'));
  if (extra.anlass && !FORM_OCCASION_IDS.includes(extra.anlass)) return problem(400, t('contactAPI.occasion'));
  if (extra.paket && !INQUIRY_PACKAGES.includes(extra.paket)) return problem(400, t('contactAPI.package'));
  if (extra.ref && !INQUIRY_REF.test(extra.ref)) return problem(400, t('contactAPI.additional'));
  if (extra['datum-offen'] && extra['datum-offen'] !== 'ja') return problem(400, t('contactAPI.openDate'));
  if (extra.datum && (!/^\d{4}-\d{2}-\d{2}$/.test(extra.datum) || !Number.isFinite(Date.parse(extra.datum)) || new Date(extra.datum).toISOString().slice(0, 10) !== extra.datum)) return problem(400, t('contactAPI.date'));
  if (extra.drohnen && (!/^\d+$/.test(extra.drohnen) || Number(extra.drohnen) < INQUIRY_LIMITS.dronesMin || Number(extra.drohnen) > INQUIRY_LIMITS.dronesMax)) return problem(400, t('contactAPI.drones'));
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) return problem(400, t('contactAPI.length'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return problem(400, t('contactAPI.email'));
  if (CONTROL.test(name) || CONTROL.test(email) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) return problem(400, t('contactAPI.characters'));
  if (extra['datum-offen']) extra.datum = ''; // Nicht zugleich offenes und festes Datum versenden.
  if (extras.length) extra.extras = [...new Set(extras)].join(', ');

  let attachment;
  try { attachment = await brevoAttachments(form); }
  catch { return problem(400, t('logoInquiry.invalid')); }

  if (env.TURNSTILE_SECRET) {
    const token = get('cf-turnstile-response');
    if (!token || token.length > 2048) return problem(403, t('contactAPI.spam'));
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10_000),
        // remoteip ist optional. Die Besucher-IP wird hier nicht weitergereicht.
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
      });
      const result = await response.json() as { success?: boolean; hostname?: string };
      if (!response.ok || result.success !== true || result.hostname !== new URL(request.url).hostname) return problem(403, t('contactAPI.spam'));
    } catch { return problem(503, t('contactAPI.spamUnavailable')); }
  }

  if (!env.BREVO_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return ok(request, 'not-configured', locale);
  const site = (env.SITE_NAME ?? 'Website').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120);
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        ...(attachment.length ? { attachment } : {}),
        sender: { email: env.CONTACT_FROM, name: site }, to: [{ email: env.CONTACT_TO }], replyTo: { email, name },
        // Namen nicht zusätzlich in den Betreff und damit in Betreff-/Benachrichtigungslogs schreiben.
        subject: `Anfrage über ${site}`,
        textContent: `Name: ${name}\nE-Mail: ${email}\n${Object.entries(extra).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${message}\n`,
      }),
    });
    if (!response.ok) return problem(502, t('contactAPI.delivery'));
  } catch {
    // Keine Fehlerobjekte/Providerantworten loggen oder ausgeben. Bei Timeout ist
    // eine Annahme durch Brevo möglich; kein automatischer Retry mit Duplikatrisiko.
    return problem(503, t('contactAPI.unconfirmed'));
  }
  // Generated only after Brevo accepted the message. Never for honeypot/preview/error.
  return ok(request, 'sent', locale, crypto.randomUUID());
};

async function source(request: Request, env: Env, form: FormData, locale: string, t: (key: string) => string): Promise<Response> {
  const get = (key: string) => String(form.get(key) ?? '').trim();
  if ([...form.keys()].some((key) => !['kind', 'locale', 'ref', 'quelle', 'quelle-text', 'website'].includes(key))) return problem(400, t('contactAPI.invalidForm'));
  if (get('website')) return sourceOk(request, 'sent', locale);
  const value = get('quelle'), text = get('quelle-text'), ref = get('ref');
  if (!SOURCE_IDS.includes(value)) return problem(400, t('contactAPI.invalidForm'));
  if (text.length > SOURCE_TEXT_MAX || CONTROL.test(text) || (text && value !== SOURCE_OTHER)) return problem(400, t('contactAPI.additional'));
  if (ref && !INQUIRY_REF.test(ref)) return problem(400, t('contactAPI.additional'));
  if (!env.BREVO_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return sourceOk(request, 'not-configured', locale);
  const site = (env.SITE_NAME ?? 'Website').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120);
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: env.CONTACT_FROM, name: site }, to: [{ email: env.CONTACT_TO }],
        subject: `Quelle zur Anfrage über ${site}${ref ? ` (${ref})` : ''}`,
        textContent: `Wo habt ihr das erste Mal von uns gehört?\nquelle: ${value}${text ? `\nfreitext: ${text}` : ''}\nref: ${ref || 'ohne Bezug (ohne JavaScript oder neue Sitzung)'}\n`,
      }),
    });
    if (!response.ok) return problem(502, t('contactAPI.delivery'));
  } catch { return problem(503, t('contactAPI.unconfirmed')); }
  return sourceOk(request, 'sent', locale);
}
function sourceOk(request: Request, state: string, locale: string): Response {
  if ((request.headers.get('accept') ?? '').includes('application/json')) return json({ ok: true, state });
  const url = new URL(request.url); url.pathname = localizedHref('/danke/', locale); url.hash = ''; url.search = '?quelle=' + state;
  return new Response(null, { status: 303, headers: { location: url.toString(), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}

export const onRequestGet = (): Response => problem(405, createTranslator('de')('contactAPI.post'));

function ok(request: Request, state = 'sent', locale = 'de', requestId?: string): Response {
  if ((request.headers.get('accept') ?? '').includes('application/json')) return json({ ok: true, state, ...(requestId ? { requestId } : {}) });
  // Statische Danke-Seite ist noch eine Vorschauseite. Vor echtem Versand abstimmen.
  const url = new URL(request.url); url.pathname = localizedHref('/danke/', locale); url.hash = '';
  url.search = state === 'sent' ? '' : `?state=${state}`;
  return new Response(null, { status: 303, headers: { location: url.toString(), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}
function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...(status === 405 ? { allow: 'POST' } : {}) } });
}
function problem(status: number, detail: string): Response { return json({ ok: false, detail }, status); }
