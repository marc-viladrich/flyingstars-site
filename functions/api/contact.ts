import { createTranslator } from '../../src/i18n/ui.mjs';
import { LOCALES, localizedHref } from '../../src/i18n/routing.mjs';

// Kontaktformular-Endpoint als Cloudflare Pages Function (Prototyp-Stack).
// Bewusst nur Web-Standard-APIs (Request/Response/FormData/fetch), damit der Code
// 1:1 auf jede andere Runtime (Deno, Node, Worker eines EU-Anbieters) umziehen kann.
// Speichert nichts. Sendet per Brevo Transactional API, wenn BREVO_API_KEY gesetzt ist.

interface Env {
  BREVO_API_KEY?: string;      // Secret
  CONTACT_TO?: string;         // Empfängeradresse
  CONTACT_FROM?: string;       // verifizierte Absenderadresse bei Brevo
  TURNSTILE_SECRET?: string;   // optional; wenn gesetzt, wird cf-turnstile-response geprüft
  SITE_NAME?: string;
}

const MAX = { name: 120, email: 200, message: 5000 };

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('form')) return problem(415, createTranslator('de')('contactAPI.formData'));
  const form = await request.formData();
  const locale = LOCALES.find((l) => l === form.get('locale')) ?? 'de';
  const t = createTranslator(locale);
  const get = (k: string) => String(form.get(k) ?? '').trim();

  // Honeypot: Bots füllen das versteckte Feld. Bewusst 200 statt Fehler, damit sie nichts lernen.
  if (get('website')) return ok(request, 'sent', locale);

  const name = get('name'), email = get('email'), message = get('message');
  const extra = Object.fromEntries(['anlass', 'datum', 'datum-offen', 'ort', 'paket', 'drohnen', 'telefon', 'firma', 'quelle'].map((key) => [key, get(key)]));
  // Extras von der Preisseite (Mehrfachauswahl, Werte wie „express“), als eine Zeile in die Mail
  const extras = form.getAll('extras').map((value) => String(value).trim()).filter(Boolean);
  if (extras.length > 10 || extras.some((value) => !/^[a-z]+(-[a-z]+)*$/.test(value) || value.length > 30)) return problem(400, t('contactAPI.extras'));
  if (extras.length) extra.extras = extras.join(', ');
  if (!name || !email || (!message && !extra.anlass)) return problem(400, t('contactAPI.required'));
  if (Object.values(extra).some((value) => value.length > 200 || /[\r\n]/.test(value))) return problem(400, t('contactAPI.additional'));
  if (extra.anlass && !['firma', 'stadt', 'agentur', 'privat', 'indoor', 'sonstiges'].includes(extra.anlass)) return problem(400, t('contactAPI.occasion'));
  if (extra.drohnen && (!/^\d+$/.test(extra.drohnen) || Number(extra.drohnen) < 100 || Number(extra.drohnen) > 1000)) return problem(400, t('contactAPI.drones'));
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) return problem(400, t('contactAPI.length'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return problem(400, t('contactAPI.email'));
  if (/[\r\n]/.test(name) || /[\r\n]/.test(email)) return problem(400, t('contactAPI.characters'));

  if (env.TURNSTILE_SECRET) {
    const token = get('cf-turnstile-response');
    const ip = request.headers.get('cf-connecting-ip') ?? '';
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
    });
    const v = (await r.json()) as { success: boolean };
    if (!v.success) return problem(403, t('contactAPI.spam'));
  }

  if (!env.BREVO_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    // Prototyp ohne Mailversand: nichts speichern, aber ehrlich antworten.
    return ok(request, 'not-configured', locale);
  }

  const site = env.SITE_NAME ?? 'Website';
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: env.CONTACT_FROM, name: site },
      to: [{ email: env.CONTACT_TO }],
      replyTo: { email, name },
      subject: `Anfrage über ${site}: ${name}`,
      textContent: `Name: ${name}\nE-Mail: ${email}\n${Object.entries(extra).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${message}\n`,
    }),
  });
  if (!res.ok) return problem(502, t('contactAPI.delivery'));
  return ok(request, 'sent', locale);
};

export const onRequestGet = (): Response => problem(405, createTranslator('de')('contactAPI.post'));

function ok(request: Request, state = 'sent', locale = 'de'): Response {
  // Ohne JS: Redirect auf Danke-Seite. Mit fetch (Accept: application/json): JSON.
  if ((request.headers.get('accept') ?? '').includes('application/json')) {
    return new Response(JSON.stringify({ ok: true, state }), { headers: { 'content-type': 'application/json' } });
  }
  const url = new URL(request.url); url.pathname = localizedHref('/danke/', locale); url.search = state === 'sent' ? '' : `?state=${state}`;
  return Response.redirect(url.toString(), 303);
}

function problem(status: number, detail: string): Response {
  return new Response(JSON.stringify({ ok: false, detail }), { status, headers: { 'content-type': 'application/json' } });
}
