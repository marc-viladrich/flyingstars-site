import { CONSENT_KEY, DENIED, consentRecord, readConsent, consentSignals, trackingConfig } from '../lib/consent.mjs';

type Choices = { analytics: boolean; ads: boolean };
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const dialog = document.querySelector<HTMLDialogElement>('#consent');
if (dialog) initConsent(dialog);

function initConsent(dialog: HTMLDialogElement) {
  const config = trackingConfig(JSON.parse(dialog.dataset.config!));
  const settings = dialog.querySelector<HTMLElement>('#consent-settings')!;
  const toggle = dialog.querySelector<HTMLButtonElement>('[data-consent-settings]')!;
  const saveButton = dialog.querySelector<HTMLButtonElement>('[data-consent-save]')!;
  const error = dialog.querySelector<HTMLElement>('[data-consent-error]')!;
  const check = (name: string) => dialog.querySelector<HTMLInputElement>(`[name="${name}"]`);
  const reopen = document.querySelector<HTMLButtonElement>('[data-consent-open]')!;
  let choices: Choices = { analytics: false, ads: false };
  let loaded = false;
  let returnFocus: HTMLElement | null = null;
  let expiryTimer: ReturnType<typeof setTimeout>;

  // This queue is local. No Google script, preconnect, iframe or request before consent.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { ...DENIED });
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('set', 'url_passthrough', false);

  function stored() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      const record = readConsent(raw, config);
      // A read-only store may still contain an old grant after a failed withdrawal.
      // Require the ability to retain/replace this exact record before restoring it.
      // Writing the same value neither extends expiry nor triggers a storage event.
      if (record && raw) localStorage.setItem(CONSENT_KEY, raw);
      return record;
    }
    catch { return null; }
  }

  function apply(next: Choices) {
    choices = next;
    window.gtag('consent', 'update', consentSignals(next));
    const ga = config.ga && next.analytics;
    const ads = config.ads && next.ads;
    if (!loaded && (ga || ads)) {
      loaded = true;
      window.gtag('js', new Date());
      // Minimize the configured page fields. Disable enhanced measurement in the account too.
      const page = { page_location: location.origin + location.pathname, page_referrer: '', page_title: '', allow_google_signals: false, allow_ad_personalization_signals: false };
      if (ga) window.gtag('config', config.ga, page);
      if (ads) window.gtag('config', config.ads, { ...page, send_page_view: false });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga ? config.ga : config.ads)}`;
      script.dataset.consentTag = '';
      document.head.append(script);
    }
  }

  function removeGoogleCookies() {
    // Only first-party cookies are accessible. Google-domain/HttpOnly cookies are not.
    const paths = new Set(['/', ...location.pathname.split('/').map((_, i, all) => all.slice(0, i + 1).join('/') || '/')]);
    const parts = location.hostname.split('.');
    const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.'))];
    for (const entry of document.cookie.split(';')) {
      const name = entry.trim().split('=')[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_)/.test(name)) continue;
      for (const path of paths) for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=${path};${domain ? ` Domain=${domain};` : ''} SameSite=Lax`;
      }
    }
  }

  function reloadWithoutTags() {
    // Removing a script node does not unload it. A fresh document enforces Basic mode.
    if (config.ga) (window as unknown as Record<string, unknown>)[`ga-disable-${config.ga}`] = true;
    removeGoogleCookies();
    location.reload();
  }

  function scheduleExpiry(expiresAt: number) {
    clearTimeout(expiryTimer);
    const remaining = expiresAt - Date.now();
    // Browser timers are limited to signed 32-bit milliseconds. Recheck long-lived tabs.
    expiryTimer = setTimeout(() => {
      if (Date.now() >= expiresAt) {
        try { localStorage.removeItem(CONSENT_KEY); } catch { /* denies on the next load */ }
        reloadWithoutTags();
      } else scheduleExpiry(expiresAt);
    }, Math.max(0, Math.min(remaining, 2_147_000_000)));
  }

  function open(showSettings = false) {
    // Safari does not focus a button on pointer click, so native dialog focus return
    // alone would send a footer visitor back to the body.
    returnFocus = showSettings ? reopen : null;
    settings.hidden = !showSettings;
    toggle.hidden = showSettings;
    toggle.setAttribute('aria-expanded', String(showSettings));
    saveButton.hidden = !showSettings;
    for (const name of ['analytics', 'ads'] as const) {
      const input = check(name); if (input) input.checked = choices[name];
    }
    dialog.showModal();
    dialog.querySelector<HTMLElement>('#consent-title')!.focus();
  }

  function save(next: Choices) {
    const record = consentRecord(next, config);
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(record)); error.hidden = true; }
    catch {
      error.hidden = false;
      try { localStorage.removeItem(CONSENT_KEY); } catch { /* stored() also denies read-only storage */ }
    }
    if (!next.analytics && !next.ads) removeGoogleCookies();
    // Every change to an already running tag starts a clean document, including adding a purpose.
    if (loaded && (next.analytics !== choices.analytics || next.ads !== choices.ads)) {
      // If storage is unavailable, reloading denies everything safely.
      reloadWithoutTags(); return;
    }
    apply(record); scheduleExpiry(record.expiresAt);
    if (error.hidden) dialog.close();
  }

  dialog.querySelector('[data-consent-reject]')!.addEventListener('click', () => save({ analytics: false, ads: false }));
  dialog.querySelector('[data-consent-accept]')!.addEventListener('click', () => save({ analytics: Boolean(config.ga), ads: Boolean(config.ads) }));
  saveButton.addEventListener('click', () => save({ analytics: check('analytics')?.checked ?? false, ads: check('ads')?.checked ?? false }));
  toggle.addEventListener('click', () => {
    settings.hidden = false; toggle.hidden = true; saveButton.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    (check('analytics') ?? check('ads'))?.focus();
  });
  dialog.querySelector('[data-consent-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => returnFocus?.focus({ preventScroll: true }));
  reopen.hidden = false;
  reopen.addEventListener('click', () => open(true));
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null) location.reload();
  });
  // BFCache can resurrect a previously consented document after another tab revoked consent.
  window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });

  // Integration point, deliberately not a page-view/thank-you-page trigger.
  // The form integration must emit this only after server-confirmed delivery, with an
  // opaque request UUID. No form payloads, email hashes, or replay after later consent.
  const sent = new Set<string>();
  window.addEventListener('flyingstars:lead-confirmed', (event) => {
    const id: unknown = (event as CustomEvent).detail?.requestId;
    if (!choices.ads || !loaded || !config.ads || !config.label
      || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || sent.has(id)) return;
    sent.add(id);
    window.gtag('event', 'conversion', {
      send_to: `${config.ads}/${config.label}`, transaction_id: id,
      page_location: location.origin + location.pathname, page_referrer: '', page_title: '',
    });
  });

  const previous = stored();
  if (previous) { apply(previous); scheduleExpiry(previous.expiresAt); }
  else {
    removeGoogleCookies();
    // Legal texts must remain readable without making a banner choice.
    if (!/\/(datenschutz|impressum)\/$/.test(location.pathname)) open();
  }
}
