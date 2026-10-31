// Headlines dürfen einzelne Begriffe mit *Sternchen* markieren: sie erscheinen im Logoverlauf (.grad).
// plain() liefert denselben Text ohne Markierung für aria-label, caption und alt.
export const plain = (text = '') => text.replace(/\*([^*]+)\*/g, '$1');
export const accentParts = (text = '') => text.split(/\*([^*]+)\*/).map((t, i) => ({ t, g: i % 2 === 1 })).filter((p) => p.t);
