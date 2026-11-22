// Farben der isometrischen Blog-Szenen (StoryScene.astro, story-scene.ts und weitere Szenen): Logoverlauf in acht Stufen
// für Drohnen und Lichtspuren, Zonenfarben wie die Standortzeichnung der Startseite (LandingSite.astro), je Baustein eine.
// Als Daten außerhalb von CSS, weil die Szene sie zur Build-Zeit in SVG-Daten schreibt (scripts/css-tokens.test.mjs prüft
// nur CSS und Astro).
export const SCENE_COLORS = ['#ff9e29', '#f58a5a', '#ec7f95', '#db64e8', '#b88bec', '#8aa9ee', '#6fc8ef', '#33edf2'];
export const SCENE_ZONES = { drone: '#ff9e29', software: '#c49bf2', sim: '#6fdc98', field: '#e8dccb', station: '#6aa8ff', idea: '#db64e8', warn: '#f5b43c', crowd: '#c49bf2', sky: '#c49bf2' };
export const scenePalette = { colors: SCENE_COLORS, zone: SCENE_ZONES };
/** Zonen der Ablauf-Szene (Labor, AblaufSzene.astro) */
export const ABLAUF_ZONES = { safety: '#ff7a6e', operative: '#f5b43c', drones: '#6fdc98', start: '#6aa8ff', guests: '#c49bf2' };
