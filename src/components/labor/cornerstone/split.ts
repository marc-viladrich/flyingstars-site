// Artikel-HTML an den Zwischentiteln (h2) teilen, Text unverändert (Labor, Runde 18, wie labor/blog-artikel). Leere
// Absätze (geschütztes Leerzeichen) und die Bilder aus dem WordPress-Import fallen weg: an ihre Stelle treten die eigenen
// Fotos bzw. das Logo-Finale. Ändert sich die Gliederung, bricht der Build mit einer Meldung ab (expect).
export const clean = (html: string) => html
  .replace(/<p>(\s|&nbsp;| )*<\/p>/g, '')
  .replace(/<p>\s*<img[^>]*>\s*<\/p>/g, '')
  .trim();
const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;|&#x26;/g, '&').trim();
export const titleOf = (c: string) => text(c.match(/^<h[23][^>]*>(.*?)<\/h[23]>/s)?.[1] ?? '');

/** Einleitung und Abschnitte je h2; expect: die Zwischentitel in Reihenfolge (Anfang genügt) */
export function sections(html: string, expect: string[]) {
  const parts = html.split(/(?=<h2[\s>])/).map(clean).filter(Boolean);
  const [intro, ...rest] = parts;
  const got = rest.map(titleOf);
  if (got.length !== expect.length || expect.some((e, i) => !got[i].startsWith(e))) throw new Error(`Gliederung geändert: ${got.join(' | ')}`);
  return { intro, h2: rest };
}

/** Abschnitt mit einer Liste von Schritten (<li><strong>Titel:</strong> …</li>): Kopf bis zur Liste und je Punkt ein Block */
export function listSteps(section: string, count: number) {
  const at = section.search(/<ul[\s>]/);
  const items = [...section.slice(at).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim());
  if (at < 0 || items.length !== count) throw new Error(`Gliederung geändert: ${items.length} statt ${count} Schritte`);
  return {
    head: section.slice(0, at).trim(),
    steps: items.map((html) => ({ html: /^<p[\s>]/.test(html) ? html : `<p>${html}</p>`, title: text(html.match(/<strong>(.*?)<\/strong>/s)?.[1] ?? '').replace(/:$/, '') })),
  };
}

/** Abschnitt nach dem n-ten Absatz teilen (für ein Element zwischen zwei Absätzen) */
export function splitAfterParagraph(section: string, n: number) {
  let i = 0, at = -1;
  for (const m of section.matchAll(/<\/p>/g)) if (++i === n) { at = m.index! + 4; break; }
  if (at < 0) throw new Error(`Gliederung geändert: weniger als ${n} Absätze`);
  return [section.slice(0, at).trim(), section.slice(at).trim()];
}
