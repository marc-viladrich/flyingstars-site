import { t as message } from '../../i18n/ui.mjs';
// Geschichten mit Zerlegen und Zusammensetzen (Runde 16, Marc 21.11.2026): zwei Motive, die zusammengehören, gehen
// ohne Wolke ineinander über, Drohne für Drohne auf geraden Bahnen (scenes/umbau.js), wie der kleine Roboter, der zum
// Greifarm wird. Beide sind 3D+-Fassungen eines Motivs im Konfigurator (src/content/show-configurator.js) und spielen
// im Teaser der Startseite (REELS.start in show-teaser.js).
//   cakeNumberStory (Jubiläum): die Torte dreht sich, dann löst sie sich Stockwerk für Stockwerk und setzt sich zu eurer
//     Zahl zusammen, das Konfetti zuletzt; danach tanzt das Konfetti um die Zahl. 3D zeigt nur die Torte, 3D+ erzählt.
//   tachoCarStory (Marketing): die Nadel dreht in den roten Bereich, dann zerlegt sich der Drehzahlmesser und setzt sich
//     von den Rädern aufwärts zum Sportwagen zusammen, der losfährt.
import { share } from '../show-motion.js';
import { chain } from './umbau.js';
import { builders as wahrzeichen } from './wahrzeichen.js';

const catalog = () => import('./catalog.js');
/** Schlussbild einer Katalog-Geschichte in 3D+ (der Körper mit eigener Bewegung, ohne das Zeichnen mit Licht davor). */
const alive = async (key, n, caption) => ({ ...(await (await catalog()).catalogScene(key, 'ODYSSEY', n, caption)).beats.at(-1), caption });

/** Jubiläumszahl, wenn die Fassung keine nennt. */
export const CAKE_NUMBER = '50';

export const builders = {
  async cakeNumberStory(n, caption, version) {
    const value = version?.value ?? CAKE_NUMBER;
    const cake = await alive('torte', n, message('umbau.cakeTurns'));
    const number = (await wahrzeichen.jahre3d(n, caption, { value })).beats[0];
    // Zahl und Wort zuerst (von unten nach oben), das Konfetti zuletzt: so viele Drohnen trägt die Zahl (wahrzeichen.js)
    const [nk] = share(Math.min(n, 480), [3, 1]);
    const beats = chain([cake], [{ ...number, caption }], { frame: 'jubel', hold: 3.4, caption: message('umbau.cakeBecomesNumber', { v0: value }), spread: 2.8, fly: 2.3, order: (p, i) => (i < nk ? p[1] : 4 + i / n) });
    return { beats };
  },
  async tachoCarStory(n, caption) {
    // die Nadel erreicht den roten Bereich nach der halben Periode (6,5 s, catalog-3d/technik.js), dort beginnt der Umbau
    const tacho = await alive('drehzahl', n, message('umbau.needleRevs'));
    const car = await alive('sportwagen', n, message('umbau.carDrives'));
    return { beats: chain([tacho], [car], { frame: 'tacho', hold: 3.25, caption: message('umbau.tachoBecomesCar'), spread: 2.8, fly: 2.3 }) };
  },
};
