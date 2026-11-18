// Himmelszeile (Startseite, nach #kundinnen): Das Markup steht sofort beim Seitenstart (index.ts), damit nichts springt,
// wenn der Schwarm (schwarm.ts) später lädt und die Zeile belebt. Texte sind Entwürfe, nicht mit FlyingStars abgestimmt.
const TEXT = {
  de: { label: 'Was soll am Himmel stehen?', ph: 'Name, Marke oder Datum eintippen', go: 'Damit anfragen' },
  en: { label: 'What should the sky say?', ph: 'Type a name, brand or date', go: 'Enquire with this' },
  nl: { label: 'Wat moet er in de lucht staan?', ph: 'Typ een naam, merk of datum', go: 'Hiermee aanvragen' },
};
const lang = () => { const l = document.documentElement.lang; return (l === 'en' || l === 'nl' ? l : 'de') as keyof typeof TEXT; };

/** Die Zeile hinter host (einmal je Seite). */
export function zeile(host: Element): HTMLElement {
  const next = host.nextElementSibling;
  if (next instanceof HTMLElement && next.classList.contains('hm-zeile')) return next;
  const t = TEXT[lang()], el = document.createElement('section');
  el.className = 'hm-zeile'; el.setAttribute('aria-label', t.label);
  el.innerHTML = `<div class="hm-own" aria-hidden="true"></div><form class="hm-zeile-row" action="#anfrage"><label class="hm-zeile-l" for="hm-zeile-in">${t.label}</label><input id="hm-zeile-in" type="text" maxlength="24" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="${t.ph}"><a class="link" href="#anfrage">${t.go} <span aria-hidden="true">→</span></a></form>`;
  host.after(el);
  return el;
}

/** Nur auf der Startseite (wie plan() in schwarm.ts). */
export function zeileVorab(): void {
  if (location.pathname.replace(/^\/(en|nl)(?=\/)/, '') !== '/') return;
  const host = document.querySelector('main #kundinnen');
  if (host) zeile(host);
}
