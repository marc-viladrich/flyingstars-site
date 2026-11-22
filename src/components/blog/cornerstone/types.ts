// Cornerstone-Artikel (Runde 15, 22.11.2026): ein Blogartikel bekommt eine eigene Darstellung mit Titelbild im Lichtraster,
// Fotos, isometrischer Scroll-Szene und Logo-Formation. Der Text bleibt unverändert in der Collection (Editor, Übersetzung);
// die Darstellung ordnet nur seine Abschnitte an. Normale Artikel und jeder Fall, in dem der Text nicht mehr zur Anordnung
// passt, bleiben im normalen Blogformat (BlogPost.astro).
//
// Abschnitte (section): 0 = Text vor dem ersten Zwischentitel (##), n = n-ter Zwischentitel mit allem bis zum nächsten,
// darin die Unterabschnitte (###). Die Anordnung muss jeden Abschnitt genau einmal verwenden (oder zweimal als die beiden
// Teile einer Teilung nach einem Absatz), sonst gilt sie nicht.
import type { Story } from '../story-scene';

/** Übersetzungsschlüssel relativ zum Präfix des Artikels (CornerstoneArticle.i18n), Texte in src/i18n/ui.json */
export type UiKey = string;
export type CornerstonePhoto = { src: string; width: number; height: number; alt: UiKey };
export type CornerstoneBlock =
  /** ein Abschnitt als Fließtext; split: nur der Teil bis einschließlich Absatz `after` (part 0) bzw. danach (part 1), etwa
   *  für eine Tabelle zwischen zwei Absätzen. Beide Teile müssen vorkommen. */
  | { kind: 'text'; section: number; split?: { after: number; part: 0 | 1 } }
  /** Vergleichstabelle Drohnenshow · Feuerwerk · Lasershow aus der Seite „Nachhaltigkeit“ (pages/nachhaltigkeit, Abschnitt
   *  „alternative“), in der Sprache des Artikels; eine Quelle für beide Stellen */
  | { kind: 'compare'; label: UiKey; caption: UiKey }
  /** ein Foto über die Artikelbreite oder eine Reihe (Handy: Slider), mit Leuchtpunkt-Unterlage (ArticlePhotos.astro) */
  | { kind: 'photos'; photos: CornerstonePhoto[]; caption?: UiKey; focus?: string }
  /** Scroll-Szene: jeder genannte Abschnitt ist ein Kapitel, seine Unterabschnitte (###) sind die Schritte der Szene, in
   *  dieser Reihenfolge (steps: 'list': die Punkte der ersten Aufzählung im Abschnitt, Titel = fetter Anfang). Die Szene muss
   *  genau so viele Schritte haben. groups: Kurzname je Kapitel für die Schrittleiste. */
  | { kind: 'story'; sections: number[]; steps?: 'h3' | 'list'; scene: () => Story; groups: UiKey[]; label: UiKey; caption: UiKey }
  /** Schlussabschnitt mit der Logo-Formation (FormationFinale.astro) */
  | { kind: 'finale'; section: number };
export interface CornerstoneArticle {
  /** Quell-ID des deutschen Posts ohne Sprachpräfix, z. B. '2025-06-12-wie-programmiert-man-eine-drohnenshow' */
  post: string;
  /** Präfix der Übersetzungsschlüssel, z. B. 'cornerstone.programmieren' */
  i18n: string;
  /** Titelbild (tools/blog/cornerstone-media.mjs): AVIF + WebP für den Kopf, JPG 16:9 / 4:3 / 1:1 für Suche und Vorschauen */
  cover: { avif: string; webp: string; width: number; height: number; alt: UiKey; social: { src: string; width: number; height: number }[] };
  /** Bilder aus dem importierten Text weglassen (die Darstellung bringt eigene Fotos) */
  dropBodyImages?: boolean;
  blocks: CornerstoneBlock[];
}
export const defineCornerstone = (article: CornerstoneArticle) => article;

export type Section = { html: string; title: string; subs: { html: string; title: string }[]; head: string; lead: string };
const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;|&#x26;/g, '&').replace(/&nbsp;/g, ' ').trim();

/** Artikel-HTML in Abschnitte teilen (Text unverändert; leere Absätze fallen weg, Bilder auf Wunsch) */
export function splitSections(html: string, dropImages = false): Section[] {
  let clean = html.replace(/<p>(\s|&nbsp;| )*<\/p>/g, '');
  if (dropImages) clean = clean.replace(/<p>\s*<img[^>]*>\s*<\/p>/g, '');
  const parts = clean.split(/(?=<h2[\s>])/).map((c) => c.trim());
  if (!/^<h2[\s>]/.test(parts[0] ?? '')) parts[0] = parts[0] ?? ''; else parts.unshift('');
  return parts.map((part) => {
    const [first, ...rest] = part.split(/(?=<h3[\s>])/);
    const head = first.match(/^<h2[^>]*>[\s\S]*?<\/h2>/)?.[0] ?? '';
    return {
      html: part, head, lead: first.slice(head.length).trim(),
      title: strip(head),
      subs: rest.map((h) => ({ html: h.trim(), title: strip(h.match(/^<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '').replace(/^\d+\.\s*/, '') })),
    };
  });
}

export type Step = { html: string; title: string };
/** Schritte eines Abschnitts: Unterabschnitte (###) oder die Punkte der ersten Aufzählung; head = alles davor */
export function stepsOf(section: Section, mode: 'h3' | 'list' = 'h3'): { head: string; steps: Step[]; rest: string } | undefined {
  if (mode === 'h3') return { head: section.head + section.lead, steps: section.subs, rest: '' };
  const at = section.html.search(/<ul[\s>]/), end = section.html.indexOf('</ul>', at);
  if (at < 0 || end < 0) return undefined;
  const items = [...section.html.slice(at, end).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim());
  return {
    head: section.html.slice(0, at).trim(), rest: section.html.slice(end + 5).trim(),
    steps: items.map((html) => ({ html: /^<p[\s>]/.test(html) ? html : `<p>${html}</p>`, title: strip(html.match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? '').replace(/:$/, '') })),
  };
}
/** Abschnitt nach dem n-ten Absatz teilen: [bis einschließlich Absatz n, Rest] */
export function splitAfter(html: string, n: number): [string, string] | undefined {
  let i = 0;
  for (const m of html.matchAll(/<\/p>/g)) if (++i === n) { const at = m.index! + 4; return [html.slice(0, at).trim(), html.slice(at).trim()]; }
}

/** Prüft die Anordnung gegen den Text: jeder Abschnitt genau einmal (Teilungen: beide Teile), Szenen mit passender Schrittzahl */
export function checkPlan(article: CornerstoneArticle, sections: Section[], stories: Map<CornerstoneBlock, Story>): string | undefined {
  type Use = { i: number; split?: { after: number; part: 0 | 1 } };
  const uses: Use[] = article.blocks.flatMap((b): Use[] => b.kind === 'text' ? [{ i: b.section, split: b.split }] : b.kind === 'finale' ? [{ i: b.section }] : b.kind === 'story' ? b.sections.map((i) => ({ i })) : []);
  const used = uses.map((u) => u.i);
  const missing = sections.map((s, i) => (s.html.trim() ? i : -1)).filter((i) => i >= 0 && !used.includes(i));
  if (used.some((i) => i >= sections.length)) return `Abschnitt ${Math.max(...used)} fehlt im Text (${sections.length} Abschnitte)`;
  for (const i of new Set(used)) {
    const here = uses.filter((u) => u.i === i);
    if (here.length === 1 && !here[0].split) continue;
    const [a, b] = here;
    if (here.length !== 2 || !a.split || !b.split || a.split.after !== b.split.after || a.split.part === b.split.part) return `Abschnitt ${i} doppelt oder unvollständig geteilt`;
    if (!splitAfter(sections[i].html, a.split.after)) return `Abschnitt ${i} hat weniger als ${a.split.after} Absätze`;
  }
  if (missing.length) return `Abschnitte ${missing.join(', ')} kommen in der Anordnung nicht vor`;
  for (const b of article.blocks) if (b.kind === 'story') {
    const parts = b.sections.map((i) => stepsOf(sections[i], b.steps));
    if (parts.some((p) => !p)) return 'Aufzählung für die Szene fehlt';
    if (parts.some((p) => p!.rest)) return 'Text nach der Aufzählung der Szene (ginge verloren)';
    const n = parts.reduce((sum, p) => sum + p!.steps.length, 0), story = stories.get(b)!;
    if (n !== story.steps) return `Szene hat ${story.steps} Schritte, der Text ${n} Unterabschnitte`;
    if (b.groups.length !== b.sections.length) return 'groups und sections sind verschieden lang';
  }
}
