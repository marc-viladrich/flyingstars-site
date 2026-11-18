// Register der 3D-Fassungen von Katalogmotiven (docs/katalog-3d.md). Jede Fassung ist (n) → { pts, live } mit genau n
// Punkten [x, y, z, r, g, b] in den Koordinaten der Katalogformation; scenes/catalog.js nimmt sie für die Show-Arten
// 3D (HORIZON) und Storytelling (ODYSSEY). Motive ohne Eintrag bleiben dort ihre 2D-Formation.
import { lebkuchen, schneemann, hund, biene, taube, marienkaefer, smiley, sparschwein, lotusblume } from './figuren.js';
import { leuchtturm, sektflasche, konfetti, diskokugel, ballons, basketball, zuckerstange, glocke, geburtstag, mikrofon, cocktail, bierkrug } from './dinge.js';
import { stern, galaxie, sonne } from './symbole.js';

export const CATALOG_3D = { lebkuchen, schneemann, hund, biene, leuchtturm, sektflasche, stern, galaxie, taube, konfetti, diskokugel, ballons, basketball, zuckerstange, glocke, geburtstag, marienkaefer, sonne, mikrofon, cocktail, bierkrug, smiley, sparschwein, lotusblume };
/** Höchstens so viele Drohnen tragen das Skelett; darüber werden die Linien nicht schöner, nur dichter (Reserve). */
export const LIT_MAX = 480;
