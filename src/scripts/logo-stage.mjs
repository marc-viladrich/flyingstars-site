// Runde 9 (Marc 20.11.2026: „wenn ich das Shell-Logo von 100 Drohnen mit rüber nehme auf den Konfigurator, dann sieht es
// ganz anders aus als im Logo-Konfigurator selbst“). Gemessen: beide Ansichten zeigen dieselben Punkte (109 bei Shell),
// aber der Logo-Modus zoomte das Logo bis 80 % der Bühnenhöhe um die Bühnenmitte, und die Hinweiskarte („braucht etwa 109
// Drohnen“) lag über dem unteren Drittel. Der Sockel der Muschel verschwand darunter; bei 390 px stand vom Logo kaum die
// obere Hälfte frei. logoFrame legt das Logo darum in die freie Fläche über der Karte, so groß, wie es dort passt.
//
// Runde 10b (Marc 20.11.2026: „die meisten Logos sind sehr nah am oberen Rand, zu viel White Space nach unten“): Bis Runde
// 10 verschob ein unsichtbarer Hilfspunkt in fitPts das Logo, gerechnet mit der damaligen Abbildung der Bühne. Seit die
// Bühne den freien Teil kennt und das gezeichnete Bild einpasst (show-field.js, view/fitProjected), stimmte die Rechnung
// nicht mehr, und die Minimap rechts unten schob jedes Logo nach oben, auch wenn es gar nicht über ihr stand. Jetzt nennt
// logoFrame nur das Band, in dem das Logo stehen soll (area, Anteile der Bühne); die Bühne setzt es dort exakt mittig
// (placeInArea), mit derselben Projektion, mit der sie zeichnet. Eine Abdeckung kürzt das Band nur, wenn das Logo
// waagrecht über ihr steht.

/** Rand oben und unten (Anteil der Bühnenhöhe) und Abstand zu einer Abdeckung. */
export const LOGO_AREA = { top: 0.08, bottom: 0.92, gap: 0.04, width: 0.88, maxZoom: 1.6 };

/**
 * lit: leuchtende Punkte [x, y, …] (y nach oben). stage: { W, H, covers?, coverTop? } in CSS-Pixeln; covers = Flächen über
 * dem unteren Teil der Bühne ({ top, left, right }, Hinweiskarte, Minimap), coverTop = eine Abdeckung über die ganze
 * Breite (ältere Form). → { fitPts, zoom, area } für einen Beat der Bühne.
 */
export function logoFrame(lit, { W, H, covers = [], coverTop = null }) {
  if (!lit.length || !W || !H) return { fitPts: lit, zoom: 1 };
  const all = [...covers, ...(coverTop === null ? [] : [{ top: coverTop, left: 0, right: W }])];
  const avoid = all.map((c) => ({ top: c.top / H - LOGO_AREA.gap, left: c.left / W, right: c.right / W }));
  return { fitPts: lit, zoom: 1, area: { top: LOGO_AREA.top, bottom: LOGO_AREA.bottom, width: LOGO_AREA.width, maxZoom: LOGO_AREA.maxZoom, avoid } };
}
