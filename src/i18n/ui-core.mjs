/** @param {{flat?: boolean, onMissing?: (error: Error) => void}} [options] */
export function translatorFor(source,locale = 'de', { flat = false, onMissing } = {}) {
  const lookup = (key) => flat ? source[key] : source[key]?.[locale];
  const translate = (key, values = {}) => {
    const message = lookup(key);
    if (typeof message !== 'string') {
      const error = new Error(`Missing ${locale} UI message: ${key}`);
      onMissing?.(error);
      throw error;
    }
    return message.replace(/\{(\w+)\}/g, (_, name) => {
      if (!(name in values)) throw new Error(`Missing ${name} in UI message ${key}`);
      return String(values[name]);
    });
  };
  // Render-time provenance for the dictionary actually used by this translator.
  translate.afeAddress=key=>({owner:{collection:'siteUi',id:'ui'},part:'data',path:[key,locale],mode:/\{\w+\}/.test(lookup(key)||'')?'panel':'inline'});
  return translate;
}
