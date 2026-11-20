// Runde 10b (Marc 20.11.2026, Screenshot: „152 Drohnen empfohlen“, Regler „Gewünschte Drohnenanzahl 200“, Karte „Passend
// für euer Logo: Eure 3D Show“): „Die Anzahl der vorgeschlagenen Drohnen matcht gar nicht mit dem, was weiter unten
// vorgeschlagen wird.“ Ursache: Große Zahl (Bedarf des Logos), Karte (die gerade eingestellte Show-Art, Standard 3D) und
// „Dieses Logo in der Show verwenden“ (Bedarf aufgerundet auf die Mindestzahl dieser Art: 152 → 3D mit 200) rechneten je
// für sich. logoAdvice ist jetzt die eine Quelle für alle drei: dieselbe Show-Art, dieselbe buchbare Drohnenzahl.
// Regel: die eingestellte Show-Art bleibt, solange das Logo ihre Mindestzahl braucht; braucht es weniger, die größte Art,
// deren Mindestzahl es erreicht (152 → 2D statt 3D; eine Art wird dabei nie höher, außer 2D ab 400 Drohnen wird 3D wie
// überall im Konfigurator). Drohnen: die nächste Preisstufe dieser Art, mindestens der Bedarf.

/**
 * need: Drohnen, die das Logo braucht (leuchtende Punkte). art: eingestellte Show-Art ('2d' | '3d' | 'story').
 * pkg: { SHOW_ARTS, artMin, stopAtLeast, artForDrones } aus src/content/show-packages.ts (hineingereicht, damit die
 * Funktion ohne Build im Test läuft). → { art, drones }
 */
export function logoAdvice(need, art, { SHOW_ARTS, artMin, stopAtLeast, artForDrones }) {
  const n = Math.max(1, Math.ceil(need));
  let fit = art;
  if (n < artMin(art)) fit = [...SHOW_ARTS].filter((a) => artMin(a) <= Math.max(n, artMin(SHOW_ARTS[0])) && SHOW_ARTS.indexOf(a) <= SHOW_ARTS.indexOf(art)).at(-1) ?? SHOW_ARTS[0];
  let drones = stopAtLeast(fit, Math.max(artMin(fit), n));
  const up = artForDrones(fit, drones);
  if (up !== fit) { fit = up; drones = stopAtLeast(fit, Math.max(artMin(fit), n)); }
  return { art: fit, drones };
}
