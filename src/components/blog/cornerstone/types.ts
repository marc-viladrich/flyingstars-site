// Cornerstone-Artikel (Runde 15, 22.11.2026): ein Blogartikel bekommt eine eigene Darstellung mit Titelbild im Lichtraster,
// Fotos, isometrischer Scroll-Szene und Logo-Formation. Der Text bleibt unverändert in der Collection (Editor, Übersetzung);
// die Darstellung ordnet nur seine Abschnitte an. Normale Artikel und jeder Fall, in dem der Text nicht mehr zur Anordnung
// passt, bleiben im normalen Blogformat (BlogPost.astro).
//
// Abschnitte (section): 0 = Text vor dem ersten Zwischentitel (##), n = n-ter Zwischentitel mit allem bis zum nächsten,
// darin die Unterabschnitte (###). Die Anordnung muss jeden Abschnitt genau einmal verwenden, sonst gilt sie nicht.
import type { Story } from '../story-scene';

/** Übersetzungsschlüssel relativ zum Präfix des Artikels (CornerstoneArticle.i18n), Texte in src/i18n/ui.json */
export type UiKey = string;
export type CornerstonePhoto = { src: string; width: number; height: number; alt: UiKey };
export type CornerstoneBlock =
  /** ein Abschnitt als Fließtext */
  | { kind: 'text'; section: number }
  /** ein Foto über die Artikelbreite oder eine Reihe (Handy: Slider), mit Leuchtpunkt-Unterlage (ArticlePhotos.astro) */
  | { kind: 'photos'; photos: CornerstonePhoto[]; caption?: UiKey; focus?: string }
  /** Scroll-Szene: jeder genannte Abschnitt ist ein Kapitel, seine Unterabschnitte (###) sind die Schritte der Szene, in
   *  dieser Reihenfolge. Die Szene muss genau so viele Schritte haben. groups: Kurzname je Kapitel für die Schrittleiste. */
  | { kind: 'story'; sections: number[]; scene: () => Story; groups: UiKey[]; label: UiKey; caption: UiKey }
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

/** Prüft die Anordnung gegen den Text: jeder Abschnitt genau einmal, Szenen mit passender Schrittzahl */
export function checkPlan(article: CornerstoneArticle, sections: Section[], stories: Map<CornerstoneBlock, Story>): string | undefined {
  const used = article.blocks.flatMap((b) => b.kind === 'text' || b.kind === 'finale' ? [b.section] : b.kind === 'story' ? b.sections : []);
  const missing = sections.map((s, i) => (s.html.trim() ? i : -1)).filter((i) => i >= 0 && !used.includes(i));
  if (used.some((i) => i >= sections.length)) return `Abschnitt ${Math.max(...used)} fehlt im Text (${sections.length} Abschnitte)`;
  if (new Set(used).size !== used.length) return 'Abschnitt doppelt angeordnet';
  if (missing.length) return `Abschnitte ${missing.join(', ')} kommen in der Anordnung nicht vor`;
  for (const b of article.blocks) if (b.kind === 'story') {
    const n = b.sections.reduce((sum, i) => sum + sections[i].subs.length, 0), story = stories.get(b)!;
    if (n !== story.steps) return `Szene hat ${story.steps} Schritte, der Text ${n} Unterabschnitte`;
    if (b.groups.length !== b.sections.length) return 'groups und sections sind verschieden lang';
  }
}
