import { LOGO_BODY_LIMIT, brevoAttachments } from '../../src/content/logo-attachments.mjs';
import {INQUIRY_PACKAGES,INQUIRY_LIMITS} from '../../src/content/inquiry.mjs';
import {FORM_OCCASION_IDS} from '../../src/content/occasions.mjs';
import { createTranslator } from '../../src/i18n/ui.mjs';
import { LOCALES, localizedHref, localeFromPath } from '../../src/i18n/routing.mjs';
import { SOURCE_IDS, SOURCE_OTHER, SOURCE_TEXT_MAX, INQUIRY_REF } from '../../src/content/inquiry-source.mjs';
import { contact } from '../../src/content/contact.mjs';

// Cloudflare Pages Function. Nur Web-Standard-APIs für einen späteren EU-Umzug.
// Keine eigene dauerhafte Ablage und keine Anwendungslogs. Hosting, Brevo und
// Empfängerpostfach verarbeiten/speichern dennoch Daten, siehe Datenschutz-Doku.
//
// Antwortvertrag (docs/DESIGN.md, „Versandzustände“): Mit `Accept: application/json` antwortet der Endpoint immer
// JSON ({ok:true,state:'sent'|'not-configured'} oder {ok:false,detail}). Ohne JavaScript leitet nur ein bestätigter
// Versand der Anfrage weiter (POST/Redirect/GET, kein Doppelversand beim Neuladen), auf die Danke-Seite der Sprache.
// Sie zeigt Dank und Herkunftsfrage immer (Marc, 19.11.2026); der frühere signierte Link, der sie in einen Zustand
// „gesendet“ schaltete, ist damit entfallen. Eine bestätigte Herkunftsantwort beantwortet der Endpoint ohne JavaScript
// selbst mit einer Bestätigungsseite. Fehler und fehlende Versandkonfiguration
// antworten mit einer lesbaren Seite am Formularziel, damit die Zurück-Taste die Eingaben behält.
interface Env {
  BREVO_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  TURNSTILE_SECRET?: string; // Erst mit passendem Widget + Datenschutzinformation aktivieren.
  SITE_NAME?: string;
}
type Kind = 'inquiry' | 'source';
type Translate = ReturnType<typeof createTranslator>;
/** Wer antwortet wem: Sprache, Formular und Wunschformat der anfragenden Seite. */
interface Reply { request: Request; locale: string; t: Translate; kind: Kind }

const MAX_BODY = LOGO_BODY_LIMIT; // Auch ohne oder mit falschem Content-Length durchsetzen.
const MAX = INQUIRY_LIMITS;
const EXTRA_FIELDS = ['anlass', 'datum', 'datum-offen', 'ort', 'paket', 'drohnen', 'telefon', 'firma', 'ref'];
const CONTROL = /[\u0000-\u001f\u007f]/;

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  // Frühe Fehler verwenden die Sprache und das Formular der gleichursprünglichen Seite.
  const reply: Reply = { request, locale: 'de', t: createTranslator('de'), kind: 'inquiry' };
  try {
    const page = new URL(request.headers.get('referer') ?? request.url);
    if (page.origin === new URL(request.url).origin) {
      reply.locale = localeFromPath(page.pathname);
      reply.kind = page.pathname === localizedHref('/danke/', reply.locale) ? 'source' : 'inquiry';
    }
  } catch { /* Fehlender/ungültiger Referrer: deutsche Standardsprache. */ }
  reply.t = createTranslator(reply.locale);
  const fail = (status: number, key: string) => problem(reply, status, reply.t(key));
  // Keine fremden Websites als Browser-Mailrelay. Kein Ersatz für ein Rate-Limit.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return fail(403, 'contactAPI.origin');
  const ct = request.headers.get('content-type') ?? '';
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)(;|$)/i.test(ct)) return fail(415, 'contactAPI.formData');
  let form: FormData;
  let bodySize = 0;
  try {
    if (Number(request.headers.get('content-length')) > (/^application\/x-www-form-urlencoded/i.test(ct) ? INQUIRY_LIMITS.body : MAX_BODY)) return fail(413, 'contactAPI.bodySize');
    const reader = request.body?.getReader();
    if (!reader) return fail(400, 'contactAPI.empty');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY) {
          await reader.cancel();
          return fail(413, 'contactAPI.bodySize');
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    bodySize = size;
    form = await new Response(bytes, { headers: { 'content-type': ct } }).formData();
  } catch { return fail(400, 'contactAPI.unreadable'); }

  // Only the two named attachments are accepted, each at most once.
  if ([...form].length > INQUIRY_LIMITS.fields || [...form].some(([key, value]) => (typeof value !== 'string' && !['logo-original', 'logo-preview'].includes(key)) || (key !== 'extras' && form.getAll(key).length !== 1))) {
    return fail(400, 'contactAPI.invalidForm');
  }
  if (![...form].some(([,value]) => typeof value !== 'string') && bodySize > INQUIRY_LIMITS.body) return fail(413, 'contactAPI.bodySize');
  reply.locale = LOCALES.find((value) => value === form.get('locale')) ?? 'de';
  reply.t = createTranslator(reply.locale);
  const get = (key: string) => String(form.get(key) ?? '').trim();
  reply.kind = get('kind') === 'quelle' ? 'source' : 'inquiry';
  // Honeypot: bewusst Erfolg vortäuschen, ohne Versand.
  if (get('website')) return confirmed(reply);
  // Zweite kleine Meldung von der Danke-Seite: woher die Anfrage kam. Keine Personendaten, nur Auswahl, optionaler
  // Kurztext und der Zufallswert der Anfrage (src/content/inquiry-source.mjs).
  if (reply.kind === 'source') return source(reply, env, form);
  // Ergänzende, umgehbare Zeitfalle. Kein Tracking, keine Sperre für No-JS.
  const duration = get('form-duration');
  if (duration && (!/^\d{1,12}$/.test(duration) || Number(duration) < 2000)) {
    return fail(400, 'contactAPI.wait');
  }

  const name = get('name'), email = get('email'), message = get('message');
  const extra: Record<string, string> = Object.fromEntries(EXTRA_FIELDS.map((key) => [key, get(key)]));
  const extras = form.getAll('extras').map((value) => String(value).trim()).filter(Boolean);
  if (extras.length > INQUIRY_LIMITS.extras || extras.some((value) => !/^[a-z]+(-[a-z]+)*$/.test(value) || value.length > INQUIRY_LIMITS.extraId)) return fail(400, 'contactAPI.extras');
  if (!name || !email || (!message && !extra.anlass)) return fail(400, 'contactAPI.required');
  if (Object.values(extra).some((value) => value.length > INQUIRY_LIMITS.extra || CONTROL.test(value))) return fail(400, 'contactAPI.additional');
  if (extra.anlass && !FORM_OCCASION_IDS.includes(extra.anlass)) return fail(400, 'contactAPI.occasion');
  if (extra.paket && !INQUIRY_PACKAGES.includes(extra.paket)) return fail(400, 'contactAPI.package');
  if (extra.ref && !INQUIRY_REF.test(extra.ref)) return fail(400, 'contactAPI.additional');
  if (extra['datum-offen'] && extra['datum-offen'] !== 'ja') return fail(400, 'contactAPI.openDate');
  if (extra.datum && (!/^\d{4}-\d{2}-\d{2}$/.test(extra.datum) || !Number.isFinite(Date.parse(extra.datum)) || new Date(extra.datum).toISOString().slice(0, 10) !== extra.datum)) return fail(400, 'contactAPI.date');
  if (extra.drohnen && (!/^\d+$/.test(extra.drohnen) || Number(extra.drohnen) < INQUIRY_LIMITS.dronesMin || Number(extra.drohnen) > INQUIRY_LIMITS.dronesMax)) return fail(400, 'contactAPI.drones');
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) return fail(400, 'contactAPI.length');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'contactAPI.email');
  if (CONTROL.test(name) || CONTROL.test(email) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) return fail(400, 'contactAPI.characters');
  if (extra['datum-offen']) extra.datum = ''; // Nicht zugleich offenes und festes Datum versenden.
  if (extras.length) extra.extras = [...new Set(extras)].join(', ');

  let attachment;
  try { attachment = await brevoAttachments(form); }
  catch { return fail(400, 'logoInquiry.invalid'); }

  if (env.TURNSTILE_SECRET) {
    const token = get('cf-turnstile-response');
    if (!token || token.length > 2048) return fail(403, 'contactAPI.spam');
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10_000),
        // remoteip ist optional. Die Besucher-IP wird hier nicht weitergereicht.
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
      });
      const result = await response.json() as { success?: boolean; hostname?: string };
      if (!response.ok || result.success !== true || result.hostname !== new URL(request.url).hostname) return fail(403, 'contactAPI.spam');
    } catch { return fail(503, 'contactAPI.spamUnavailable'); }
  }

  if (!configured(env)) return notConfigured(reply);
  const site = siteName(env);
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { 'api-key': env.BREVO_API_KEY!, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        ...(attachment.length ? { attachment } : {}),
        sender: { email: env.CONTACT_FROM, name: site }, to: [{ email: env.CONTACT_TO }], replyTo: { email, name },
        // Namen nicht zusätzlich in den Betreff und damit in Betreff-/Benachrichtigungslogs schreiben.
        subject: `Anfrage über ${site}`,
        textContent: `Name: ${name}\nE-Mail: ${email}\n${Object.entries(extra).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${message}\n`,
      }),
    });
    if (!response.ok) return fail(502, 'contactAPI.delivery');
  } catch {
    // Keine Fehlerobjekte/Providerantworten loggen oder ausgeben. Bei Timeout ist
    // eine Annahme durch Brevo möglich; kein automatischer Retry mit Duplikatrisiko.
    return fail(503, 'contactAPI.unconfirmed');
  }
  // Generated only after Brevo accepted the message. Never for honeypot/preview/error.
  return confirmed(reply, crypto.randomUUID());
};

async function source(reply: Reply, env: Env, form: FormData): Promise<Response> {
  const fail = (status: number, key: string) => problem(reply, status, reply.t(key));
  const get = (key: string) => String(form.get(key) ?? '').trim();
  if ([...form.keys()].some((key) => !['kind', 'locale', 'ref', 'quelle', 'quelle-text', 'website'].includes(key))) return fail(400, 'contactAPI.invalidForm');
  const value = get('quelle'), ref = get('ref');
  // Ohne Auswahl gibt es nichts zu senden: dieselbe Meldung wie im Formular selbst.
  if (!SOURCE_IDS.includes(value)) return fail(400, 'thanks.pleaseChooseAnAnswer');
  // Freitext gehört nur zu „Andere“. Ein Rest aus einer vorherigen Wahl (ohne JavaScript bleibt das Feld im Formular)
  // wird verworfen, nicht abgelehnt: die Auswahl allein ist eine gültige Antwort.
  const text = value === SOURCE_OTHER ? get('quelle-text') : '';
  if (text.length > SOURCE_TEXT_MAX || CONTROL.test(text)) return fail(400, 'contactAPI.additional');
  if (ref && !INQUIRY_REF.test(ref)) return fail(400, 'contactAPI.additional');
  if (!configured(env)) return notConfigured(reply);
  const site = siteName(env);
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { 'api-key': env.BREVO_API_KEY!, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: env.CONTACT_FROM, name: site }, to: [{ email: env.CONTACT_TO }],
        subject: `Quelle zur Anfrage über ${site}${ref ? ` (${ref})` : ''}`,
        textContent: `Wo habt ihr das erste Mal von uns gehört?\nquelle: ${value}${text ? `\nfreitext: ${text}` : ''}\nref: ${ref || 'ohne Bezug (direkter Aufruf, ohne JavaScript oder neue Sitzung)'}\n`,
      }),
    });
    if (!response.ok) return fail(502, 'contactAPI.delivery');
  } catch { return fail(503, 'contactAPI.unconfirmed'); }
  return confirmed(reply);
}

/** Der Endpoint nimmt nur POST an. */
export const onRequestGet = async (): Promise<Response> => json({ ok: false, detail: createTranslator('de')('contactAPI.post') }, 405);

const configured = (env: Env) => Boolean(env.BREVO_API_KEY && env.CONTACT_TO && env.CONTACT_FROM);
const siteName = (env: Env) => (env.SITE_NAME ?? 'Website').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120);
const wantsJson = (request: Request) => (request.headers.get('accept') ?? '').includes('application/json');

/** Bestätigter Versand (oder Honeypot): JSON-Erfolg, ohne JavaScript Weiterleitung auf die Danke-Seite (Anfrage) bzw.
 * eine Bestätigungsseite (Herkunftsantwort; ein erneutes Senden beim Neuladen schickt nur dieselbe Auswahl). */
function confirmed(reply: Reply, requestId?: string): Response {
  if (wantsJson(reply.request)) return json({ ok: true, state: 'sent', ...(requestId ? { requestId } : {}) });
  const { t, locale } = reply;
  if (reply.kind === 'source') return page(reply, 200, t('thanks.answerReceived'), t('thanks.answerThanks'), [link(localizedHref('/', locale), t('contactAPI.toHome'))]);
  const location = new URL(localizedHref('/danke/', locale), reply.request.url).toString();
  return new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}
/** Versand nicht eingerichtet: JSON-Zustand für das Skript, ohne JavaScript eine ehrliche Seite statt „Danke“. */
function notConfigured(reply: Reply): Response {
  if (wantsJson(reply.request)) return json({ ok: true, state: 'not-configured' });
  const message = reply.kind === 'source' ? reply.t('thanks.answerNotConfigured') : reply.t('contact.formDeliveryHasNotBeenSetUpYetNothingWas', { email: contact.email });
  return notSent(reply, 503, message);
}
function problem(reply: Reply, status: number, detail: string): Response {
  return wantsJson(reply.request) ? json({ ok: false, detail }, status) : notSent(reply, status, detail);
}
function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...(status === 405 ? { allow: 'POST' } : {}) } });
}

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** Zurück zum Formular, von dem die Meldung kam (nur gleicher Ursprung, ohne Query mit privatem Entwurfstext). */
function formHref(reply: Reply): string {
  let page: URL | undefined;
  try { page = new URL(reply.request.headers.get('referer') ?? ''); if (page.origin !== new URL(reply.request.url).origin) page = undefined; }
  catch { /* Kein verwertbarer Referrer */ }
  // Herkunftsfrage: zurück auf die Danke-Seite, dort steht die Frage
  if (reply.kind === 'source') return localizedHref('/danke/', reply.locale) + '#danke';
  if (page) return page.pathname + '#anfrage';
  return localizedHref('/kontakt/', reply.locale) + '#anfrage';
}
const link = (href: string, label: string) => `<a href="${escape(href)}">${escape(label)}</a>`;
/** Nichts wurde gesendet: Meldung, Weg zurück zum Formular (Eingaben bleiben) und die direkten Kontaktwege. */
function notSent(reply: Reply, status: number, message: string): Response {
  const { t } = reply;
  const headline = reply.kind === 'source' ? t('thanks.answerNotSent') : t('contact.yourEnquiryCouldNotBeSent');
  return page(reply, status, headline, message, [
    `${escape(t('contactAPI.keepEntries'))} ${link(formHref(reply), t('contactAPI.backToForm'))}`,
    `${escape(t('contactAPI.otherWays'))} <a href="mailto:${escape(contact.email)}">${escape(contact.email)}</a> · ${link(contact.phone.href, contact.phone.label)}`,
  ]);
}
/** Lesbare Antwort ohne JavaScript. Systemschrift und -farben, kein Skript, keine externen Ressourcen. `lines` sind
 * bereits maskierte HTML-Absätze. */
function page(reply: Reply, status: number, headline: string, message: string, lines: string[]): Response {
  const body = `<!doctype html><html lang="${reply.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escape(headline)}</title>`
    + '<style>:root{color-scheme:light dark;font:1.0625rem/1.6 system-ui,sans-serif}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:1.5rem;box-sizing:border-box}main{max-width:36rem}h1{font-size:1.75rem;line-height:1.2;margin:0 0 1rem;text-wrap:balance}p{margin:0 0 1rem}a{color:inherit;text-underline-offset:.2em}</style></head>'
    + `<body><main><h1>${escape(headline)}</h1><p data-status="${status}">${escape(message)}</p>${lines.map((line) => `<p>${line}</p>`).join('')}</main></body></html>`;
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
}
