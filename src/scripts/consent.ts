import * as CookieConsent from 'vanilla-cookieconsent';
import libraryStyles from 'vanilla-cookieconsent/dist/cookieconsent.css?url';
import siteStyles from '../styles/consent.css?url';
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
  function isolateModal() {
    const visible = document.querySelector('#cc-main [role=dialog]:not([aria-hidden=true])');
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
    const modal = document.querySelector<HTMLElement>('#cc-main .pm:not([aria-hidden=true])')
      ?? document.querySelector<HTMLElement>('#cc-main .cm:not([aria-hidden=true])');
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
  const summary = paragraph(copy.summary) + paragraph([config.ga && copy.gaSummary, config.ads && copy.adsSummary].filter(Boolean).join(' ')) + paragraph(copy.transfer);
  const onConsent = ({ cookie }: { cookie: CookieConsent.CookieValue }) => {
    if (booting) { if (previous) apply(previous); return; }
    const record = readConsent(JSON.stringify(cookie), config);
    if (record) apply(record);
    if (!stored()) {
      const warning = document.querySelector<HTMLElement>('[data-consent-error]')!;
      warning.hidden = false;
    }
  };
  // Astro hoists ordinary CSS imports even when this component is not rendered.
  // URL imports keep both stylesheets behind the same configured-ID boundary as JS.
  await Promise.all([libraryStyles, siteStyles].map((href) => new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href;
    link.onload = () => resolve(); link.onerror = () => reject(new Error('Consent stylesheet failed to load'));
    document.head.append(link);
  })));
  await CookieConsent.run({
    mode: 'opt-in', revision: consentRevision(config), autoShow: false,
    hideFromBots: false, disablePageInteraction: true, manageScriptTags: false,
    autoClearCookies: false, lazyHtmlGeneration: true,
    cookie: { name: CONSENT_KEY, useLocalStorage: true, expiresAfterDays: CONSENT_LIFETIME / 86400000 },
    guiOptions: {
      consentModal: { layout: 'box', position: 'middle center', equalWeightButtons: true, flipButtons: false },
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
          acceptNecessaryBtn: copy.reject, showPreferencesBtn: copy.settings,
          revisionMessage: copy.revision, footer: privacy,
        },
        preferencesModal: {
          title: copy.title, closeIconLabel: copy.close, acceptAllBtn: copy.accept,
          acceptNecessaryBtn: copy.reject, savePreferencesBtn: copy.save,
          serviceCounterLabel: copy.categoryLabel,
          sections: [
            { description: summary + privacy },
            { title: copy.necessaryTitle, description: copy.necessary, linkedCategory: 'necessary' },
            ...(config.ga ? [{ title: copy.analytics, description: copy.analyticsDetail, linkedCategory: 'analytics' }] : []),
            ...(config.ads ? [{ title: copy.ads, description: copy.adsDetail, linkedCategory: 'marketing' }] : []),
            { description: copy.retention },
          ],
        },
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
      modal.querySelector<HTMLElement>('.cm__desc')?.setAttribute('tabindex', '0');
      // Match visual order and keyboard order, with rejection first at equal weight.
      const reject = modal.querySelector<HTMLButtonElement>('[data-role=necessary]');
      if (reject) reject.parentElement!.prepend(reject);
      modal.querySelectorAll<HTMLButtonElement>('.cm__btn, .pm__btn').forEach((button) => {
        button.classList.add('btn');
        if (['all', 'necessary'].includes(button.dataset.role ?? '')) button.classList.add('primary');
      });
    },
  });
  // The library may have read a stale grant from a store that became read-only.
  // Clear its in-memory selection too; it must not preselect optional purposes.
  if (!previous && CookieConsent.validConsent()) CookieConsent.acceptCategory([]);
  booting = false;
  const warning = document.createElement('p');
  warning.dataset.consentError = ''; warning.role = 'status'; warning.hidden = true;
  warning.textContent = copy.storageError;
  element.after(warning);
  reopen.hidden = false;
  reopen.addEventListener('click', () => {
    returnFocus = reopen;
    reopen.focus({ preventScroll: true }); // Safari pointer clicks do not focus buttons.
    CookieConsent.showPreferences();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null) reloadWithoutTags();
  });
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
