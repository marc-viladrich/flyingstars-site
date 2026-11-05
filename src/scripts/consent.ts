import * as CookieConsent from 'vanilla-cookieconsent';
import { CONSENT_KEY, CONSENT_LIFETIME, DENIED, consentRevision, readConsent, consentSignals, trackingConfig } from '../lib/consent.mjs';

type Choices = { analytics: boolean; marketing: boolean };
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
const element = document.querySelector<HTMLElement>('#consent-config');
if (element) void initConsent(element);

async function initConsent(element: HTMLElement) {
  const config = trackingConfig(JSON.parse(element.dataset.config!));
  const copy: Record<string, string> = JSON.parse(element.dataset.copy!);
  const reopen = document.querySelector<HTMLButtonElement>('[data-consent-open]')!;
  let choices: Choices = { analytics: false, marketing: false };
  let loaded = false;
  let booting = true;
  let returnFocus: HTMLElement | null = null;
  let expiryTimer: ReturnType<typeof setTimeout>;
  let current: ReturnType<typeof readConsent> = null;
  const inertElements = new Map<HTMLElement, boolean>();
  // Only the settings dialog is modal. The first notice is a small region in the corner that leaves the page
  // usable and undimmed (Marc, 02.11.2026: „viel zu in your face … links/rechts unten in einer Ecke, deutlich kleiner“).
  function isolateModal() {
    const visible = document.querySelector('#cc-main .pm[role=dialog]:not([aria-hidden=true])');
    if (visible) {
      for (const child of document.body.children) {
        if (!(child instanceof HTMLElement) || child.contains(visible)) continue;
        if (!inertElements.has(child)) inertElements.set(child, child.inert);
        child.inert = true;
      }
    } else {
      for (const [child, previous] of inertElements) child.inert = previous;
      inertElements.clear();
    }
  }

  // A local queue only: no Google request until a purpose was explicitly granted.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { ...DENIED });
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('set', 'url_passthrough', false);

  function focusVisibleModal() {
    // The settings dialog keeps focus. The corner notice only takes it when it appears and nothing else has focus,
    // so it never pulls focus back while someone is using the page (WebKit sometimes drops the library's own focus).
    const notice = document.activeElement === document.body
      ? document.querySelector<HTMLElement>('#cc-main .cm:not([aria-hidden=true])') : null;
    const modal = document.querySelector<HTMLElement>('#cc-main .pm:not([aria-hidden=true])') ?? notice;
    if (modal && getComputedStyle(modal).visibility === 'visible' && !modal.contains(document.activeElement)) {
      modal.focus({ preventScroll: true });
    }
  }

  function stored() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      const record = readConsent(raw, config);
      // A stale grant in read-only storage must never restore tracking.
      if (record && raw) localStorage.setItem(CONSENT_KEY, raw);
      return record;
    } catch { return null; }
  }

  function removeGoogleCookies() {
    // First-party, accessible cookies only. Foreign and HttpOnly cookies cannot be erased here.
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
    if (config.ga) (window as unknown as Record<string, unknown>)[`ga-disable-${config.ga}`] = true;
    removeGoogleCookies();
    // Unload the running Google library. No extra denied ping in the old document.
    location.reload();
  }

  function scheduleExpiry(expiresAt: number) {
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(() => {
      if (Date.now() >= expiresAt) {
        try { localStorage.removeItem(CONSENT_KEY); } catch { /* next load fails closed */ }
        reloadWithoutTags();
      } else scheduleExpiry(expiresAt);
    }, Math.max(0, Math.min(expiresAt - Date.now(), 2_147_000_000)));
  }

  function apply(record: NonNullable<typeof current>) {
    const next = { analytics: record.analytics, marketing: record.marketing };
    current = record;
    if (loaded && (next.analytics !== choices.analytics || next.marketing !== choices.marketing)) {
      reloadWithoutTags(); return;
    }
    choices = next;
    window.gtag('consent', 'update', consentSignals(next));
    const ga = config.ga && next.analytics;
    const ads = config.ads && next.marketing;
    if (!loaded && (ga || ads)) {
      loaded = true;
      window.gtag('js', new Date());
      const page = { page_location: location.origin + location.pathname, page_referrer: '', page_title: '', allow_google_signals: false, allow_ad_personalization_signals: false, allow_enhanced_conversions: false };
      if (ga) window.gtag('config', config.ga, page);
      if (ads) window.gtag('config', config.ads, { ...page, send_page_view: false });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga ? config.ga : config.ads)}`;
      script.dataset.consentTag = '';
      document.head.append(script);
    }
    if (!next.analytics && !next.marketing) removeGoogleCookies();
    scheduleExpiry(record.expiresAt);
  }

  const previous = stored();
  if (!previous) {
    try { localStorage.removeItem(CONSENT_KEY); } catch { /* callbacks ignore a stale read-only grant */ }
    removeGoogleCookies();
  }
  const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  const paragraph = (text: string) => `<span class="consent-paragraph">${escape(text)}</span>`;
  const privacy = `<a class="link" href="${escape(element.dataset.privacy!)}">${escape(copy.privacy)}</a>`;
  // Eine Karte für alles (Marc, 03.11.2026): kurzer Text, die Schalter direkt darunter, kein zweiter großer Dialog.
  // Spans statt divs, weil die Bibliothek die Beschreibung in ein <p> setzt. Anbieter steht am Schalter, Details
  // (Rechtsgrundlage, Speicherdauer, Drittland) in der Datenschutzerklärung.
  const purposes = [
    config.ga && { category: 'analytics', title: copy.analytics, provider: 'Google Analytics' },
    config.ads && { category: 'marketing', title: copy.ads, provider: 'Google Ads' },
  ].filter(Boolean) as { category: keyof Choices; title: string; provider: string }[];
  const toggles = `<span class="consent-toggles" role="group" aria-label="${escape(copy.choices)}">${purposes.map((purpose) =>
    `<label class="consent-toggle"><input type="checkbox" role="switch" data-purpose="${purpose.category}"><span class="consent-switch" aria-hidden="true"></span><span class="consent-toggle-text"><b>${escape(purpose.title)}</b> ${escape(purpose.provider)}</span></label>`).join('')}</span>`;
  const summary = paragraph(copy.summary) + toggles + `<span class="consent-paragraph consent-fine">${privacy}</span>`;
  const onConsent = ({ cookie }: { cookie: CookieConsent.CookieValue }) => {
    if (booting) { if (previous) apply(previous); return; }
    const record = readConsent(JSON.stringify(cookie), config);
    if (record) apply(record);
    if (!stored()) {
      const warning = document.querySelector<HTMLElement>('[data-consent-error]')!;
      warning.hidden = false;
    }
  };
  // The configured-only stylesheet starts loading in the head, alongside the page.
  // Wait for its actual completion before showing or focusing the consent controls.
  const stylesheet = document.querySelector<HTMLLinkElement>('link[data-consent-styles]');
  if (!stylesheet) throw new Error('Consent stylesheet missing');
  if (!stylesheet.sheet) await new Promise<void>((resolve, reject) => {
    stylesheet.addEventListener('load', () => resolve(), {once:true});
    stylesheet.addEventListener('error', () => reject(new Error('Consent stylesheet failed to load')), {once:true});
  });
  await CookieConsent.run({
    mode: 'opt-in', revision: consentRevision(config), autoShow: false,
    hideFromBots: false, disablePageInteraction: false, manageScriptTags: false,
    autoClearCookies: false, lazyHtmlGeneration: true,
    cookie: { name: CONSENT_KEY, useLocalStorage: true, expiresAfterDays: CONSENT_LIFETIME / 86400000 },
    guiOptions: {
      consentModal: { layout: 'box', position: 'bottom right', equalWeightButtons: true, flipButtons: false },
      preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      ...(config.ga ? { analytics: {} } : {}),
      ...(config.ads ? { marketing: {} } : {}),
    },
    language: { default: document.documentElement.lang, translations: {
      [document.documentElement.lang]: {
        consentModal: {
          title: copy.title, description: summary, acceptAllBtn: copy.accept,
          acceptNecessaryBtn: copy.reject, revisionMessage: copy.revision,
        },
        preferencesModal: { sections: [] },
      },
    } },
    onConsent, onChange: onConsent,
    onModalShow: () => {
      // Match native dialog isolation, including macOS Tab modes that skip buttons.
      isolateModal();
      // Focus immediately as well as the library's delayed animation focus. In WebKit,
      // a restored page can otherwise leave focus on body while the notice is visible.
      requestAnimationFrame(focusVisibleModal);
      // Its animation class appears at 100ms and its own focus runs at 200ms.
      // A late page load or returning to an iOS tab can otherwise leave body focused.
      setTimeout(focusVisibleModal, 250);
    },
    onModalHide: () => {
      isolateModal();
      // v3.2.1 schedules autofocus 200ms after opening even if already closed.
      // Repair only a lost/hidden focus, without stealing it from a user's next action.
      setTimeout(() => {
        const active = document.activeElement;
        if (active !== document.body && !active?.closest('#cc-main [aria-hidden=true]')) return;
        const visible = document.querySelector<HTMLElement>('#cc-main [role=dialog]:not([aria-hidden=true])');
        (visible ?? returnFocus)?.focus({ preventScroll: true });
      }, 220);
    },
    onModalReady: ({ modal }) => {
      // WebKit can discard focus set while the modal is still transitioning.
      // Restore it when the actual transition ends, while preserving focus inside.
      modal.addEventListener('transitionend', (event) => { if (event.target === modal) focusVisibleModal(); });
      // The library scrolls its notice description on short screens. Safari needs
      // an explicit keyboard target to read that region (axe scrollable-region-focusable).
      const desc = modal.querySelector<HTMLElement>('.cm__desc');
      if (desc && desc.scrollHeight > desc.clientHeight) desc.setAttribute('tabindex', '0');
      // Match visual order and keyboard order, with rejection first at equal weight.
      const reject = modal.querySelector<HTMLButtonElement>('[data-role=necessary]');
      if (reject) reject.parentElement!.prepend(reject);
      modal.querySelectorAll<HTMLButtonElement>('.cm__btn, .pm__btn').forEach((button) => {
        button.classList.add('btn');
        if (['all', 'necessary'].includes(button.dataset.role ?? '')) button.classList.add('primary');
      });
      wireToggles(modal);
    },
  });
  // Schalter in der Karte: anfangs der gespeicherte Stand (neu: alles aus). Wer etwas umlegt, speichert mit dem rechten
  // Knopf genau diese Auswahl („Auswahl speichern“); unverändert bleibt er „Akzeptieren“ für alles. Ablehnen bleibt
  // gleich gewichtet daneben.
  function syncToggles() {
    const card = document.querySelector<HTMLElement>('#cc-main .cm');
    if (!card) return;
    card.querySelectorAll<HTMLInputElement>('[data-purpose]').forEach((input) => { input.checked = choices[input.dataset.purpose as keyof Choices]; });
    card.dataset.dirty = '';
    const all = card.querySelector<HTMLButtonElement>('[data-role=all]');
    if (all) all.textContent = copy.accept;
  }
  function wireToggles(modal: HTMLElement) {
    if (!modal.matches('.cm') || modal.dataset.wired) return;
    modal.dataset.wired = '1';
    const inputs = [...modal.querySelectorAll<HTMLInputElement>('[data-purpose]')];
    const all = modal.querySelector<HTMLButtonElement>('[data-role=all]')!;
    const dirty = () => inputs.some((input) => input.checked !== choices[input.dataset.purpose as keyof Choices]);
    modal.addEventListener('change', () => { all.textContent = dirty() ? copy.save : copy.accept; });
    // Vor dem Klick-Handler der Bibliothek: bei geänderter Auswahl genau diese speichern statt alles anzunehmen
    modal.addEventListener('click', (event) => {
      if (!(event.target as HTMLElement).closest('[data-role=all]') || !dirty()) return;
      event.preventDefault(); event.stopPropagation();
      CookieConsent.acceptCategory(inputs.filter((input) => input.checked).map((input) => input.dataset.purpose!));
      CookieConsent.hide();
    }, true);
    syncToggles();
  }

  // The library may have read a stale grant from a store that became read-only.
  // Clear its in-memory selection too; it must not preselect optional purposes.
  if (!previous && CookieConsent.validConsent()) CookieConsent.acceptCategory([]);
  booting = false;
  const warning = document.createElement('p');
  warning.dataset.consentError = ''; warning.role = 'status'; warning.hidden = true;
  warning.textContent = copy.storageError;
  element.after(warning);
  reopen.hidden = false;
  let reopened = false;
  reopen.addEventListener('click', () => {
    reopened = true;
    returnFocus = reopen;
    reopen.focus({ preventScroll: true }); // Safari pointer clicks do not focus buttons.
    CookieConsent.show(true);
    syncToggles();
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#cc-main .cm')?.focus({ preventScroll: true }));
  });
  // Über das Cookie-Symbol geöffnete Karte schließt Escape ohne Änderung (auch auf Datenschutz/Impressum, wo noch keine
  // Entscheidung vorliegt); die automatisch erscheinende erste Karte bleibt, bis jemand entscheidet.
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !reopened) return;
    if (!document.querySelector('#cc-main .cm:not([aria-hidden=true])') || !document.documentElement.classList.contains('show--consent')) return;
    reopened = false;
    CookieConsent.hide();
    returnFocus?.focus({ preventScroll: true });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null) reloadWithoutTags();
  });
  // The library cycles Tab inside the notice even when it is not modal. A corner notice must not trap the keyboard:
  // stop its handler before it runs and let the browser move focus on to the page.
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || document.querySelector('#cc-main .pm[role=dialog]:not([aria-hidden=true])')) return;
    if ((document.activeElement as HTMLElement | null)?.closest('#cc-main .cm')) event.stopPropagation();
  }, true);
  window.addEventListener('load', focusVisibleModal, { once: true });
  window.addEventListener('focus', focusVisibleModal);
  window.addEventListener('pageshow', (event) => { if (event.persisted) reloadWithoutTags(); else focusVisibleModal(); });
  if (!previous && !/\/(datenschutz|impressum)\/$/.test(location.pathname)) CookieConsent.show(true);

  const sent = new Set<string>();
  window.addEventListener('flyingstars:lead-confirmed', (event) => {
    const id: unknown = (event as CustomEvent).detail?.requestId;
    if (!current || current.expiresAt <= Date.now() || !loaded
      || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || sent.has(id)) return;
    sent.add(id);
    const page = { page_location: location.origin + location.pathname, page_referrer: '', page_title: '' };
    if (choices.marketing && CookieConsent.acceptedCategory('marketing') && config.ads && config.label) window.gtag('event', 'conversion', {
      ...page, send_to: `${config.ads}/${config.label}`, transaction_id: id,
    });
    if (choices.analytics && CookieConsent.acceptedCategory('analytics') && config.ga) window.gtag('event', 'generate_lead', { ...page, send_to: config.ga });
  });
}
