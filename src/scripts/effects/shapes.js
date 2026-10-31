// Einfache Motive für Vorführungen: neutral, damit sich niemand auf den Schlips getreten fühlt.
// Bewusst keine Kundenlogos als Formation, dafür fehlt die Freigabe.
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

export const SHAPES = {
  heart: { kind: 'svg', markup: svg('<path d="M100 172 C60 140 22 112 22 72 C22 44 44 26 68 26 C84 26 94 36 100 48 C106 36 116 26 132 26 C156 26 178 44 178 72 C178 112 140 140 100 172 Z"/>') },
  ring: { kind: 'svg', markup: svg('<circle cx="100" cy="112" r="62"/><circle cx="100" cy="112" r="50"/><path d="M84 52 L92 34 H108 L116 52 L100 66 Z"/>') },
  anchor: { kind: 'svg', markup: svg('<circle cx="100" cy="34" r="14"/><path d="M100 48 V176 M68 72 H132"/><path d="M38 132 Q52 180 100 178 Q148 180 162 132"/><path d="M38 132 L28 148 M38 132 L54 138 M162 132 L172 148 M162 132 L146 138"/>') },
  moin: { kind: 'text', text: 'MOIN', font: '700 180px "Space Grotesk", sans-serif' },
};
