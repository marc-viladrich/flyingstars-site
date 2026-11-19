// Schriftstärke der Verlaufsworte (docs/DESIGN.md → Himmel): Der markierte Begriff einer Überschrift (.grad aus Accent.astro)
// steht zuerst in der dünnsten Stärke der variablen Space Grotesk (300) und wird beim Hineinscrollen einmal ruhig in die
// Stärke seiner Überschrift dicker. Den dünnen Startzustand setzt himmel.css schon vor dem ersten Bild (html.reveal), dieses
// Skript gibt nur den Auslöser. Ohne Bewegung (reduced motion, Pause) gilt sofort der Endzustand, ebenfalls über CSS.
//
// Kein Layoutsprung: Space Grotesk ist zwischen 300 und 700 fast gleich breit (Abweichung unter 0,06 em je Wort, gemessen
// am Schriftschnitt). Den Rest gleicht ein Zeichenabstand aus, der beim Dickerwerden auf den Wert der Überschrift zurückgeht;
// Start- und Endbreite sind damit gleich, und text-wrap: balance bricht nicht um.

const SEL = ':is(h1, h2, h3) .grad';
const THIN = 300; // untere Grenze der Gewichtsachse in public/fonts/space-grotesk-0.woff2 (fonts.css: 300 700)

let ctx: CanvasRenderingContext2D | null | undefined;
const width = (text: string, weight: string, cs: CSSStyleDeclaration) => {
  if (ctx === undefined) ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${weight} ${cs.fontSize} ${cs.fontFamily}`;
  return ctx.measureText(text).width;
};

// Zeichenabstand im dünnen Zustand, damit der Begriff dünn genauso breit ist wie in seiner Endstärke
function compensate(el: HTMLElement): void {
  const parent = el.parentElement; if (!parent) return;
  const cs = getComputedStyle(parent);
  let text = el.textContent ?? '';
  if (cs.textTransform === 'uppercase') text = text.toUpperCase();
  const n = Array.from(text).length; if (!n) return;
  const delta = (width(text, cs.fontWeight, cs) - width(text, String(THIN), cs)) / n;
  const base = parseFloat(cs.letterSpacing) || 0;
  // in em der Überschrift (der Begriff hat dieselbe Schriftgröße)
  el.style.setProperty('--st-ls0', `${((base + delta) / (parseFloat(cs.fontSize) || 1)).toFixed(4)}em`);
}

export function staerke(): void {
  const root = document.documentElement;
  const words = [...document.querySelectorAll<HTMLElement>(SEL)];
  if (!words.length || !root.classList.contains('reveal') || !('IntersectionObserver' in window)) return;
  for (const el of words) compensate(el);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('st-an'); io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  for (const el of words) io.observe(el);
}
