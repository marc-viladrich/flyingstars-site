import { once } from '../load-once.js';

const groups = [
  ['lebkuchen schneemann hund biene taube marienkaefer smiley sparschwein lotusblume schmetterling', () => import('./figuren.js')],
  ['roboter zahnraeder drehzahl sportwagen hubschrauber flugzeug lkw feuerwehr', () => import('./technik.js')],
  ['anstossen eheringe', () => import('./hochzeit.js')],
  ['batterie doppelherz unendlich peace anker torte', () => import('./einfach.js')],
  ['leuchtturm sektflasche konfetti diskokugel ballons basketball zuckerstange glocke geburtstag mikrofon cocktail bierkrug', () => import('./dinge.js')],
  ['stern galaxie sonne', () => import('./symbole.js')],
];
const builders = new Map(groups.flatMap(([names, load]) => {
  const module = once(load);
  return names.split(' ').map((name) => [name, () => module().then((exports) => exports[name])]);
}));
export const bodyBuilder = (key) => builders.get(key);
/** Oberhalb der Grenze warten die übrigen Drohnen in Reserve. */
export const LIT_MAX = 480;
export const registeredBodies = () => builders.keys();
