// Keine Einzelwörter in der letzten Zeile (Marc, 01./02.11.2026: „immer noch text orphans … site-wide“). CSS text-wrap
// balance/pretty deckt kurze Texte ab, lässt aber lange Absätze auf dem Handy und Firefox (kein pretty) aus. Deshalb
// verbindet diese Funktion in jedem Textblock die letzten beiden Wörter mit einem geschützten Leerzeichen (&nbsp;), und
// zwar beim Ausliefern des HTML (src/middleware.ts): ohne JavaScript, in jedem Browser, ohne Nachlaufen beim Laden.
// Ausnahmen: lange Wörter (sonst passt das Paar auf schmalen Bildschirmen nicht in eine Zeile), Blöcke mit Unterblöcken,
// <br> (bewusster Umbruch), Elemente mit data-orphans="keep".

// Nur Fließtext-Blöcke. Überschriften regelt text-wrap: balance (große Schrift, ein verbundenes Paar liefe über), dt/dd
// stehen oft in schmalen Spalten (Eckdaten), dort würde ein Paar die Spalte sprengen.
const BLOCK = /<(p|li|figcaption|blockquote)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
const NESTED = /<(?:p|li|ul|ol|div|dl|table|section|h[1-6]|br|script|style|template|svg)\b/i;
/** Wörter, die zusammen höchstens so lang sind, werden verbunden (Zeichen ohne Tags); das letzte Wort höchstens MAX_LAST. */
const MAX_PAIR = 28;
const MAX_LAST = 22; // „Sicherheitsprotokoll.“ (21) passt mit seinem Vorgänger noch in jede Spalte, seit Absätze pretty statt balance umbrechen

/** Verbindet im inneren HTML eines Blocks die letzten zwei Wörter. Tags bleiben unangetastet. */
export function joinLastWords(inner: string): string {
  // Text- und Tag-Stücke; nur in Textstücken wird gesucht
  const parts = inner.split(/(<[^>]*>)/);
  let seenWord = false, wordLen = 0, prevLen = 0, target = -1, targetPart = -1;
  // von hinten: erst das letzte Wort überspringen, dann das Leerzeichen davor finden
  outer: for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.startsWith('<')) continue;
    // Entities zählen als ein Zeichen
    for (let j = part.length - 1; j >= 0; j--) {
      const ch = part[j];
      const space = ch === ' ' || ch === '\n' || ch === '\t';
      if (!seenWord) { if (!space) { seenWord = true; wordLen = 1; } continue; }
      if (target < 0) {
        if (!space) { wordLen++; continue; }
        target = j; targetPart = i;
        continue;
      }
      // Länge des vorletzten Worts bis zum nächsten Leerzeichen
      if (space) { if (prevLen > 0) break outer; continue; }
      prevLen++;
    }
  }
  if (target < 0 || wordLen > MAX_LAST || wordLen + prevLen > MAX_PAIR || prevLen === 0) return inner;
  // nur ein einzelnes normales Leerzeichen ersetzen, Zeilenumbrüche im Quelltext ebenso
  const part = parts[targetPart];
  let start = target;
  while (start > 0 && /\s/.test(part[start - 1])) start--;
  parts[targetPart] = part.slice(0, start) + '&nbsp;' + part.slice(target + 1);
  // Bindestrich im letzten Wort („E-Transit.“) ist sonst eine Umbruchstelle: Wortverbinder (U+2060) dahinter
  for (let i = targetPart; i < parts.length; i++) {
    if (parts[i].startsWith('<')) continue;
    const from = i === targetPart ? parts[i].lastIndexOf('&nbsp;') + 6 : 0;
    parts[i] = parts[i].slice(0, from) + parts[i].slice(from).replace(/-(?=[^\s-])/g, '-&#8288;');
  }
  return parts.join('');
}

const RAW = /(<(script|style|textarea|pre|template)\b[\s\S]*?<\/\2>)/gi;

/** Wendet joinLastWords auf alle Textblöcke einer HTML-Seite an; Inhalte von script, style, textarea, pre, template
 * bleiben unberührt. */
export function noOrphans(html: string): string {
  return html.split(RAW).map((chunk, i, all) => {
    // split mit zwei Gruppen: [Text, ganzer Rohblock, Tagname, Text, …]
    if (i % 3 !== 0) return i % 3 === 1 ? chunk : '';
    return blocks(chunk);
  }).join('');
}

// Ein Block mit Unterblöcken (z. B. <li> einer Teamkarte mit <p> darin) wird nicht selbst verbunden, aber seine
// Unterblöcke schon. Früher verschluckte der Treffer auf <li> das innere <p>, das dann nie bearbeitet wurde.
function blocks(html: string): string {
  return html.replace(BLOCK, (whole, tag: string, attrs = '', inner: string) => {
    if (/data-orphans=["']?keep/.test(attrs)) return whole;
    if (NESTED.test(inner)) { const nested = blocks(inner); return nested === inner ? whole : `<${tag}${attrs}>${nested}</${tag}>`; }
    if (inner.includes('&nbsp;')) return whole;
    const joined = joinLastWords(inner);
    return joined === inner ? whole : `<${tag}${attrs}>${joined}</${tag}>`;
  });
}
