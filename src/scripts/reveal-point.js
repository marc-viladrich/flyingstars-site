// Auslösepunkt aller Reveals beim Scrollen (Vorhang, Text, Team, Lichtpunkte auf Touch): sobald ein halbes rem des
// Elements im Bild ist (Marc, 03.11.2026: „sobald ein Bild in den Viewport kommt oder höchstens nach einem halben rem“;
// vorher 3 rem, immer noch zu spät). rootMargin kennt kein rem, deshalb aus der aktuellen Grundschriftgröße gerechnet.
export const REVEAL_REM = 0.5;
const rem = typeof getComputedStyle !== 'function' || typeof document === 'undefined' ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
export const REVEAL_MARGIN = `0px 0px -${Math.round(REVEAL_REM * rem)}px 0px`;
