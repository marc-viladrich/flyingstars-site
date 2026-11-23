// Vollständiges Register für Katalogprüfungen und Kontaktbögen.
import { bodyBuilder, registeredBodies } from './load.js';
export { LIT_MAX } from './load.js';
export { SPORT_3D } from './sport.js';

const keys = [...registeredBodies()];
export const CATALOG_3D = Object.fromEntries(await Promise.all(keys.map(async (key) => [key, await bodyBuilder(key)()])));
