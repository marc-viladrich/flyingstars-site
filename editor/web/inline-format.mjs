// Light inline formatting of short texts (headlines, card titles, figures). The stored format is the one
// the site renders with inlineHtml() in src/lib/inline-text.mjs:
//   **bold**  *italic*  ~~strike~~  {o}outline{/o}  {c}caps{/c}
// This module turns what the editor shows (contenteditable DOM) back into that format.
const bold = { open: "**", close: "**" },
  italic = { open: "*", close: "*" },
  strike = { open: "~~", close: "~~" };
const marks = [
  { test: (tag) => tag === "strong" || tag === "b", ...bold },
  { test: (tag) => tag === "em" || tag === "i", ...italic },
  { test: (tag) => tag === "s" || tag === "del" || tag === "strike", ...strike },
  { test: (tag, cls) => tag === "span" && cls.includes("t-outline"), open: "{o}", close: "{/o}" },
  { test: (tag, cls) => tag === "span" && cls.includes("t-caps"), open: "{c}", close: "{/c}" },
];

// Browsers sometimes format with inline styles instead of tags (un-bolding inside a bold heading gives
// <span style="font-weight: normal">). Styles that mean a supported mark count as that mark; "normal"
// styles are no mark.
function styleMarks(style) {
  const css = String(style || "").toLowerCase();
  const out = [];
  if (/font-weight:\s*(bold|[6-9]00)/.test(css)) out.push(bold);
  if (/font-style:\s*italic/.test(css)) out.push(italic);
  if (/text-decoration[^;]*line-through/.test(css)) out.push(strike);
  return out;
}

// Browsers wrap formatting around surrounding spaces ("**Wort **"); marks stay tight to the words.
function wrap(content, open, close) {
  const lead = content.match(/^\s*/)[0],
    trail = content.match(/\s*$/)[0],
    core = content.slice(lead.length, content.length - trail.length);
  return core ? lead + open + core + close + trail : content;
}

// A no-break space typed on purpose ("10 000") stays; the ones a browser inserts next to other
// spaces or at the edges of an editable field become ordinary spaces.
const spaces = (text) => text.replace(/ (?=\s|$)|(?<=^|\s) /g, " ");

// Block wrappers (a pasted or Enter-made <div>/<p>) become a space so words never run together.
const blocks = new Set(["div", "p"]);

// Characters that would start a mark when typed as text are stored with a backslash (the site renders
// them literally): "5*" stays "5*", "**wichtig**" typed by hand stays visible asterisks.
const literal = (text) => text.replace(/[\\*~]|\{(?=\/?[oc]\})/g, (m) => "\\" + m);
function serialize(node, first) {
  if (!node.tag) return literal(spaces(node.text || ""));
  const tag = node.tag.toLowerCase(),
    cls = String(node.attributes?.class || "").split(/\s+/);
  if (tag === "br") return " ";
  let content = (node.children || []).map((child, i) => serialize(child, i === 0)).join("");
  if (blocks.has(tag) && !first) content = " " + content;
  // A span can carry both classes; every matching mark applies, innermost first.
  for (const mark of [...marks.filter((m) => m.test(tag, cls)), ...styleMarks(node.attributes?.style)]) content = wrap(content, mark.open, mark.close);
  return content;
}
// `node` is the field element's tree; its own tag is never a mark.
export function inlineText(node) {
  return (node.children || []).map((child, i) => serialize(child, i === 0)).join("");
}

// Whether the editor can show and write this element's content as inline text.
const allowed = new Set(["strong", "b", "em", "i", "s", "del", "strike", "span", "br", "div", "p", "font"]);
export function inlineSupported(node) {
  return !node.tag || (allowed.has(node.tag.toLowerCase()) && (node.children || []).every(inlineSupported));
}
