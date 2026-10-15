// The palette owns stored colour identifiers, CSS values and canvas RGB channels.
export const COLOR_TOKENS = Object.freeze([
  Object.freeze({"id": "ground", "label": "Hintergrund", "value": "#0f0d0c", "group": "Flächen"}),
  Object.freeze({"id": "surface", "label": "Fläche", "value": "#161311", "group": "Flächen"}),
  Object.freeze({"id": "surface-2", "label": "Erhöhte Fläche", "value": "#1d1916", "group": "Flächen"}),
  Object.freeze({"id": "text", "label": "Text", "value": "#f6f1e8", "group": "Text"}),
  Object.freeze({"id": "muted", "label": "Gedämpfter Text", "value": "#b5aa9a", "group": "Text"}),
  Object.freeze({"id": "faint", "label": "Dezenter Text", "value": "#a39888", "group": "Text"}),
  Object.freeze({"id": "amber", "label": "Amber", "value": "#f5a73c", "group": "Marke"}),
  Object.freeze({"id": "orchid", "label": "Orchidee", "value": "#d57fe6", "group": "Marke"}),
  Object.freeze({"id": "cyan", "label": "Cyan", "value": "#33edf2", "group": "Marke"}),
  Object.freeze({"id": "good", "label": "Positiv", "value": "#6fdc98", "group": "Status"}),
  Object.freeze({"id": "bad", "label": "Negativ", "value": "#ff6f61", "group": "Status"}),
  Object.freeze({"id": "project-nfl", "label": "NFL-Blau", "value": "#5b8def", "group": "Projekte"}),
  Object.freeze({"id": "project-puma", "label": "Puma-Grün", "value": "#3ddc84", "group": "Projekte"}),
  Object.freeze({"id": "project-ford", "label": "Ford-Blau", "value": "#6f9bff", "group": "Projekte"}),
  Object.freeze({"id": "project-bokkenrijders", "label": "Bokkenrijders-Rot", "value": "#ff5a5f", "group": "Projekte"}),
  Object.freeze({"id": "package-spark", "label": "Spark-Orange", "value": "#ff9e29", "group": "Pakete"}),
  Object.freeze({"id": "package-horizon", "label": "Horizon-Violett", "value": "#db64e8", "group": "Pakete"}),
  Object.freeze({"id": "package-odyssey", "label": "Odyssey-Cyan", "value": "#33edf2", "group": "Pakete"}),
  Object.freeze({"id": "white", "label": "Weiß", "value": "#ffffff", "group": "Flächen"}),
  Object.freeze({"id": "black", "label": "Schwarz", "value": "#000000", "group": "Flächen"}),
  Object.freeze({"id": "video-ground", "label": "Video-Hintergrund", "value": "#050505", "group": "Flächen"}),
  Object.freeze({"id": "shade-base", "label": "Schattierung", "value": "#080706", "group": "Flächen"}),
  Object.freeze({"id": "media-ground", "label": "Medien-Hintergrund", "value": "#0a0908", "group": "Flächen"}),
  Object.freeze({"id": "formation-ground", "label": "Formation-Hintergrund", "value": "#13100e", "group": "Flächen"}),
  Object.freeze({"id": "paper", "label": "Papier", "value": "#f3eee4", "group": "Presse"}),
  Object.freeze({"id": "paper-ink", "label": "Papier-Schrift", "value": "#1b1714", "group": "Presse"}),
  Object.freeze({"id": "paper-muted", "label": "Papier-Metadaten", "value": "#6d6259", "group": "Presse"}),
  Object.freeze({"id": "paper-body", "label": "Papier-Text", "value": "#4a403a", "group": "Presse"}),
  Object.freeze({"id": "eco-glow-ground", "label": "Nachhaltigkeit-Hintergrund", "value": "#17120f", "group": "Flächen"}),
  Object.freeze({"id": "portrait-ground", "label": "Porträt-Hintergrund", "value": "#16120f", "group": "Flächen"}),
  Object.freeze({"id": "testimonial-line", "label": "Zitat-Rahmen", "value": "#333333", "group": "Flächen"}),
  Object.freeze({"id": "testimonial-surface", "label": "Zitat-Fläche", "value": "#151a21", "group": "Flächen"}),
]);
const byId = new Map(COLOR_TOKENS.map(token => [token.id, token]));
export const isColorToken = id => byId.has(id);
function tokenFor(id) {
  const token = byId.get(id);
  if (!token) throw new RangeError(`Unbekannte Farbe: ${id}`);
  return token;
}
export function colorVar(id) { return `var(--c-${tokenFor(id).id})`; }
export function rgbOf(id) {
  return tokenFor(id).value.slice(1).match(/../g).map(channel => parseInt(channel, 16));
}
export const colorTokenCSS = () => `:root{${COLOR_TOKENS.map(({id,value}) => `--c-${id}:${value}`).join(";")}}`;
