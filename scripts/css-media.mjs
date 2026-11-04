// Kleine PostCSS-Abbildung für die verwendete Custom-Media-Teilmenge: benannte einzelne Bedingungen.
// Vite läuft bereits mit PostCSS; kein Wechsel des CSS-Compilers und keine zusätzliche Abhängigkeit.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';
export const mediaFile = fileURLToPath(new URL('../src/styles/media.css', import.meta.url));
export function mediaAliases(source = readFileSync(mediaFile, 'utf8')) {
  const aliases = new Map();
  postcss.parse(source).walkAtRules('custom-media', rule => {
    const match = rule.params.match(/^(--[\w-]+)\s+(\((?:min|max)-(?:width|height):\s*[\d.]+em\))$/);
    if (!match || aliases.has(match[1])) throw rule.error('Custom Media braucht einen eindeutigen Namen und eine einzelne em-Grenze.');
    aliases.set(match[1], match[2]);
  });
  return aliases;
}
export function expandMedia(query, aliases = mediaAliases()) {
  return query.replace(/\((--[\w-]+)\)/g, (_, name) => {
    if (!aliases.has(name)) throw new Error(`Unbekanntes Custom Media: ${name}`);
    return aliases.get(name);
  });
}
export function cssMedia() {
  return {
    postcssPlugin: 'flyingstars-custom-media',
    Once(root, {result}) {
      const aliases = mediaAliases();
      result.messages.push({type: 'dependency', plugin: 'flyingstars-custom-media', file: mediaFile});
      root.walkAtRules('media', rule => { rule.params = expandMedia(rule.params, aliases); });
      root.walkAtRules('custom-media', rule => { rule.remove(); });
    },
  };
}
