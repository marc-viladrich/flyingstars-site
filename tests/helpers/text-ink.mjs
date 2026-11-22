// Freeze transient reveals while keeping the runtime word wrappers and clip boxes.
export const settledTextCss = `
  *, *::before, *::after { animation: none !important; transition: none !important; }
  [data-reveal-group].is-in [data-reveal] { opacity: 1; transform: none; }
`;

export async function prepareText(page) {
  await page.addStyleTag({ content: settledTextCss });
  await page.evaluate(async () => {
    await document.fonts.load('500 1rem "Space Grotesk"', 'Ägjpqy');
    await document.fonts.ready;
    document.querySelectorAll('[data-reveal-group], [data-curtain], .member').forEach(el => el.classList.add('is-in'));
  });
}

// Runs inside the browser. Range gives each glyph's typographic box. A zero-height
// inline baseline marker calibrates Range against the DOM for each font instance.
export function inspectTextInk() {
  const canvas = document.createElement('canvas').getContext('2d');
  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const fonts = new Map();
  const styles = new Map();
  const clips = new Map();
  const findings = [];
  const clipShapes = new Set();
  let glyphs = 0;
  let gradients = 0;
  const css = el => {
    if (!styles.has(el)) styles.set(el, getComputedStyle(el));
    return styles.get(el);
  };
  const label = el => el.localName + [...el.classList]
    .filter(cls => !cls.startsWith('astro-')).map(cls => '.' + cls).join('');

  function fontMetrics(style) {
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if (fonts.has(font)) return fonts.get(font);
    const probe = document.createElement('span');
    probe.style.cssText = 'all:initial;position:fixed;visibility:hidden;top:0;left:0;white-space:nowrap';
    probe.style.font = font;
    const sample = document.createTextNode('Hg');
    const baseline = document.createElement('span');
    baseline.style.cssText = 'all:initial;display:inline-block;width:0;height:0;vertical-align:baseline';
    probe.append(sample, baseline);
    document.body.append(probe);
    const sampleRange = document.createRange();
    sampleRange.selectNodeContents(sample);
    const descent = sampleRange.getBoundingClientRect().bottom - baseline.getBoundingClientRect().bottom;
    probe.remove();
    const metrics = { font, descent, ink: new Map() };
    fonts.set(font, metrics);
    return metrics;
  }

  function clipBoxes(el) {
    if (clips.has(el)) return clips.get(el);
    const style = css(el);
    const gradient = style.backgroundClip.split(', ').includes('text') && style.backgroundImage !== 'none';
    const overflow = style.display !== 'inline' && style.overflowY !== 'visible';
    const shape = style.clipPath !== 'none' ? style.clipPath : null;
    const mask = style.maskImage && style.maskImage !== 'none';
    const boxes = [];
    if (gradient) {
      for (const rect of el.getClientRects()) boxes.push({ kind: 'gradient', top: rect.top, bottom: rect.bottom });
    }
    if (overflow && el !== document.body && el !== document.documentElement) {
      const top = el.getBoundingClientRect().top + el.clientTop;
      const margin = style.overflowY === 'clip' ? parseFloat(style.overflowClipMargin) || 0 : 0;
      boxes.push({ kind: 'overflow', top: top - margin, bottom: top + el.clientHeight + margin });
    }
    if (shape) {
      clipShapes.add(`${label(el)} ${shape}`);
      const inset = shape.match(/^inset\(([^)]+)\)$/)?.[1].split(' round ')[0].split(/\s+/);
      if (inset) {
        const rect = el.getBoundingClientRect();
        const length = value => parseFloat(value) * (value.endsWith('%') ? rect.height / 100 : 1);
        boxes.push({ kind: 'clip-path', top: rect.top + length(inset[0]), bottom: rect.bottom - length(inset[2] ?? inset[0]) });
      }
    }
    if (mask) {
      clipShapes.add(`${label(el)} mask: ${style.maskImage}`);
      const rect = el.getBoundingClientRect();
      boxes.push({ kind: 'mask', top: rect.top, bottom: rect.bottom });
    }
    clips.set(el, boxes);
    return boxes;
  }

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.data.trim()) continue;
    const el = node.parentElement;
    const style = css(el);
    if (!/Space Grotesk/i.test(style.fontFamily) || style.visibility !== 'visible') continue;
    if (el.closest('script, style, svg, .sr-only, [inert], [aria-hidden="true"], dialog:not([open]), details:not([open]) > :not(summary)')) continue;
    const ancestors = [];
    let hidden = false;
    for (let parent = el; parent && parent !== document.documentElement; parent = parent.parentElement) {
      if (css(parent).display === 'none' || Number(css(parent).opacity) === 0) {
        hidden = true;
        break;
      }
      const boxes = clipBoxes(parent);
      if (boxes.length) ancestors.push({ parent, boxes });
    }
    if (hidden || !ancestors.length) continue;
    range.selectNodeContents(node);
    if (!range.getClientRects().length) continue;
    const font = fontMetrics(style);
    canvas.font = font.font;
    const failures = new Map();
    for (const match of node.data.matchAll(/[\p{L}\p{N}][\p{M}]*|[^\p{L}\p{N}\p{M}\s]/gu)) {
      const raw = match[0];
      const char = style.textTransform === 'uppercase' ? raw.toUpperCase()
        : style.textTransform === 'lowercase' ? raw.toLowerCase()
          : raw;
      if (!font.ink.has(char)) {
        const { actualBoundingBoxAscent, actualBoundingBoxDescent } = canvas.measureText(char);
        font.ink.set(char, [actualBoundingBoxAscent, actualBoundingBoxDescent]);
      }
      const [ascent, descent] = font.ink.get(char);
      if (ascent + descent <= 0) continue;
      range.setStart(node, match.index);
      range.setEnd(node, match.index + raw.length);
      const rect = range.getClientRects()[0];
      if (!rect?.width) continue;
      const baseline = rect.bottom - font.descent;
      const top = baseline - ascent;
      const bottom = baseline + descent;
      glyphs++;
      for (const { parent, boxes } of ancestors) {
        const gradientBoxes = boxes.filter(box => box.kind === 'gradient');
        if (gradientBoxes.length) gradients++;
        for (const box of boxes) {
          // An inline gradient may have several fragments. Check only the
          // fragment on this baseline, even when its ink extends beyond it.
          if (box.kind === 'gradient' && !(baseline >= box.top && baseline <= box.bottom)) continue;
          const above = box.top - top;
          const below = bottom - box.bottom;
          if (Math.max(above, below) <= 0.75) continue; // font hinting and CSS pixel rounding
          const key = `${label(parent)} ${box.kind}`;
          if (!failures.has(key)) failures.set(key, []);
          const round = value => Math.round(value * 100) / 100;
          failures.get(key).push({
            char, index: match.index, baseline: round(baseline + scrollY),
            ink: [round(top + scrollY), round(bottom + scrollY)],
            clip: [round(box.top + scrollY), round(box.bottom + scrollY)],
            above: round(Math.max(0, above)), below: round(Math.max(0, below)),
          });
        }
      }
    }
    for (const [clip, letters] of failures) {
      const heading = el.closest('h1, h2, h3, h4, h5, h6');
      findings.push({
        clip, text: node.data.trim(), element: label(el),
        heading: heading?.textContent.replace(/\s+/g, ' ').trim(),
        fontSize: style.fontSize, lineHeight: style.lineHeight, weight: style.fontWeight,
        letters,
      });
    }
  }
  return { glyphs, gradients, findings, clipShapes: [...clipShapes] };
}
