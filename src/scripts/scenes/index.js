// Motif builders added from the eleventh version on, one module per occasion. Every builder is
// (n, caption, version) => scene | Promise<scene> and uses exactly n drones in every beat (see show-field.js).
import { textScene } from "./text.js";
import { builders as hochzeit } from "./hochzeit.js";
import { builders as jubilaeum } from "./jubilaeum.js";
import { builders as launch } from "./launch.js";
import { builders as kultur } from "./kultur.js";
import { builders as winter } from "./winter.js";
import { builders as festival } from "./festival.js";
import { builders as natur } from "./natur.js";
import { builders as kugel } from "./kugel.js"; // Show-Folge der Startseite (Himmel, Runde 4)
import { builders as schnee } from "./schnee.js"; // Show-Folge der Startseite (Himmel, Runde 6)

export const BUILDERS = {
  ...hochzeit, ...jubilaeum, ...launch, ...kultur, ...winter, ...festival, ...natur, ...kugel, ...schnee,
  textSPARK: (n, caption, v) => textScene(n, caption, v, "SPARK"),
  textHORIZON: (n, caption, v) => textScene(n, caption, v, "HORIZON"),
  textODYSSEY: (n, caption, v) => textScene(n, caption, v, "ODYSSEY"),
};
