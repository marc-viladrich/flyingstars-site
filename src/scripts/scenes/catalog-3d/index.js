// Vollständiges Register für Katalogprüfungen und Kontaktbögen.
import { bodyBuilder, registeredBodies } from './load.js';
export { LIT_MAX } from './load.js';
export { SPORT_3D } from './sport.js';

const keys = [...registeredBodies()];
// Ohne Top-Level-await (Safari bis 26.6, round23-guards.test.mjs): Prüfungen laden das Register mit loadCatalog3d()
export const loadCatalog3d = async () => Object.fromEntries(await Promise.all(keys.map(async (key) => [key, await bodyBuilder(key)()])));
