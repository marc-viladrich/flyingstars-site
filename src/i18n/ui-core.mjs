export function translatorFor(source,locale = 'de') {
  const translate = (key, values = {}) => {
    const message = source[key]?.[locale];
    if (typeof message !== 'string') throw new Error(`Missing ${locale} UI message: ${key}`);
    return message.replace(/\{(\w+)\}/g, (_, name) => {
      if (!(name in values)) throw new Error(`Missing ${name} in UI message ${key}`);
      return String(values[name]);
    });
  };
  // Render-time provenance for the dictionary actually used by this translator.
  translate.afeAddress=key=>({owner:{collection:'siteUi',id:'ui'},part:'data',path:[key,locale],mode:/\{\w+\}/.test(source[key]?.[locale]||'')?'panel':'inline'});
  return translate;
}
