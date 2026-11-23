// Runde 14 (Marc und Moritz, 21.11.2026): Formationen aus dem Show-Konfigurator im Seitenkopf einer Anlass-Seite, statt des
// Showreels (landingHero mit `show:` statt `video:`). Dieselbe Engine und derselbe Ablauf-Baukasten wie der
// Konfigurator-Teaser (show-field.js, buildReel in show-teaser.js), ohne Wireframe. Die Ecke links oben nennt die Art der
// Show wie im Konfigurator („2D“, „3D“, „3D+“), damit die Steigerung 2D → 3D lesbar wird.
// Laden und Anzeigen (LandingHero.astro): bis das erste Bild fliegt, steht das Standbild im Rahmen (kein leerer Rahmen);
// bei reduzierter Bewegung, globaler Pause beim Laden oder ohne JavaScript bleibt das Standbild. Außerhalb des Bildes und
// bei verstecktem Tab zeichnet die Engine nicht (show-field.js).
import { t as message } from "../i18n/ui.mjs";
import { createField } from "./show-field.js";
import { openReel, REELS, REEL_CLOUD } from "./show-teaser.js";

/** Tempo gegenüber der Konfigurator-Vorschau: ruhiger als der Teaser (3,4×), ein Hochzeits-Seitenkopf erzählt, er zählt nicht auf. */
export const HERO_RATE = 2.2;
/** Runde 15 (Marc: „zu klein“): das Motiv füllt den Rahmen weiter als im Teaser (0,82), Rand bleibt für Eigenbewegung. */
export const HERO_ZOOM = 0.94;
/** Art der Show je Fassung, dieselben Wörter wie die Pills „Art der Show“ im Konfigurator. */
const ART = { SPARK: "preise.art.2d", HORIZON: "preise.art.3d", ODYSSEY: "preise.art.story" };

/** Startet die Show im Rahmen root ([data-lh-show], Ablauf im Attribut). */
export async function initHeroShow(root) {
  if (root.dataset.lhShowReady) return;
  root.dataset.lhShowReady = "true";
  const reel = REELS[root.dataset.lhShow] ? root.dataset.lhShow : "hochzeitHero";
  const canvas = root.querySelector("[data-lh-field]"), art = root.querySelector("[data-lh-art]");
  let shown = "", reelPlayback;
  const label = (beat) => {
    const key = ART[beat?.reel?.pkg];
    if (!key || key === shown) return;
    shown = key;
    art.textContent = message(key);
  };
  // Die Ecke wechselt, wenn das neue Bild sich formt (60 % des Anflugs), nicht beim Abflug: sonst stand „3D+“ noch über dem
  // Herztunnel. onTick kommt je gezeichnetem Bild; die Dauer des Anflugs steht am Canvas (show-field.js, data-flight).
  const onTick = (tl) => {
    if (!tl) return;
    const b = tl.beats[tl.beat], flight = Number(canvas.dataset.flight) || 0, total = flight + (b.hold ?? 2.2);
    if (tl.frac * total >= flight * 0.6) label(b);
  };
  // oben Platz für die Ecken-Beschriftung, unten nur ein schmaler Rand: am Handy ist der Rahmen flach, das Motiv soll ihn füllen
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const field = createField(canvas, { onTick, onBeat: (k) => reelPlayback?.advance(k), ...REEL_CLOUD, fitProjected: true, view: () => ({ top: rem() * 1.5, bottom: rem() * 0.5 }) });
  field.setRate(HERO_RATE);
  reelPlayback = await openReel(field, reel, { zoom: HERO_ZOOM });
  const { scene } = reelPlayback;
  field.show(scene, 300, 1, { at: 0, cloud: true });
  label(scene.beats[0]);
  // erst jetzt über das Standbild blenden: die ersten Drohnen fliegen schon ein
  requestAnimationFrame(() => root.classList.add("is-live"));
}
