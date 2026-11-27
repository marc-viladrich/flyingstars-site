// Läuft vor der ersten Darstellung der statischen Startseite.
(() => {
  // Interne Links behalten ihre Sprache, auch wenn sie zurück zu "/" führen.
  if (location.pathname !== '/' || document.referrer.startsWith(location.origin + '/')) return;

  const { homeLocaleRoutes, localeChoiceKey } = document.currentScript.dataset;
  const routes = JSON.parse(homeLocaleRoutes);
  let locale;
  try {
    locale = sessionStorage.getItem(localeChoiceKey);
  } catch {
    // Die Browserpräferenz ist auch bei gesperrtem Sitzungsspeicher verfügbar.
  }
  if (!Object.hasOwn(routes, locale)) {
    const preferences = navigator.languages?.length ? navigator.languages : [navigator.language];
    locale = preferences
      .map((tag) => tag?.toLowerCase().split('-')[0])
      .find((language) => Object.hasOwn(routes, language));
  }

  const target = routes[locale];
  if (typeof target === 'string' && target !== location.pathname) {
    location.replace(target + location.search + location.hash);
  }
})();
