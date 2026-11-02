/** Gemeinsame Geometrie für redaktionelle Fakten und Prozessreihen, ohne Inhalt zu duplizieren. */
export const factColumns = (count: number) => Math.min(count, count === 4 ? 4 : 3);
const STOPS = ['#ff9e29', '#ec7f95', '#b88bec', '#6fc8ef', '#33edf2'].map((hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)));
export function processColor(position: number): string {
  const x = Math.min(1, Math.max(0, position)) * (STOPS.length - 1), k = Math.min(STOPS.length - 2, Math.floor(x)), f = x - k;
  return `#${STOPS[k].map((c, j) => Math.round(c + (STOPS[k + 1][j] - c) * f).toString(16).padStart(2, '0')).join('')}`;
}
export function processEntries<T extends { when?: string }>(items: T[]) {
  return items.map((item, i) => ({ ...item, i, ordinal: String(i + 1).padStart(2, '0'), last: i === items.length - 1,
    repeat: i > 0 && item.when !== undefined && item.when === items[i - 1].when,
    color: processColor(items.length > 1 ? i / (items.length - 1) : 0), nextColor: processColor(items.length > 1 ? Math.min(i + 1, items.length - 1) / (items.length - 1) : 0) }));
}
