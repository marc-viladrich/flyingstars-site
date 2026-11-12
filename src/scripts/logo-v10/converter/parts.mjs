// Step 6 helpers: top-level parts, text rows (wordmark / small print), Bildmarke.
//
// v6.1: text rows are found with a text-line model instead of a pairwise chain plus an end test. Letters are
// chained by proximity as before (similar height, overlapping vertically, close horizontally), but a chain is
// not yet a word: a symbol of about letter height standing next to the word (the Drupal drop, the Adobe A,
// the Spotify disc, one bar of the Slack hash) chains into it. Each chain is therefore read as a text line:
//   baseline B (median bottom of the typical glyphs), top line T (cap or ascender line), line height H = B - T,
//   x-height Hx (typical height of the glyphs standing on the baseline);
// a member fits the line when it stands on the baseline inside the band, or is a descender (reaches below the
// baseline by at most 0.45 H and fills the x-height above it), or is a small attachment (dot, accent, mark).
// The row is the run of consecutive fitting members (at least 3 glyphs); what lies outside it is split off and
// becomes its own part. A word in two inks (WordPress) is a word when each ink forms one run; three inks, or
// one ink interrupted by another (penguin feet beside a black body), are not. Shape parts left over are
// clustered when they nearly touch (the pieces of the Slack hash, the Microsoft squares), so that a symbol
// built from several pieces is one Bildmarke.
function bboxOf(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of list) { x0 = Math.min(x0, r.x0); y0 = Math.min(y0, r.y0); x1 = Math.max(x1, r.x1); y1 = Math.max(y1, r.y1); }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const pctl = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1)))]; };
const labD = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// text-line band of a chain of members (sorted by x0), or null when there is no line to read. The baseline is
// the bottom shared by most members (a mode, not a median: the pieces of a symbol chained into the word must not
// move it), the top line the cap or ascender line of the glyphs standing on it.
export function lineBand(list) {
  if (list.length < 3) return null;
  const hMax = Math.max(...list.filter(r => !r.rim).map(r => r.h), 1);
  const cand = list.filter(r => !r.rim && r.h >= 0.25 * hMax && Math.min(r.w, r.h) > Math.max(2, 0.04 * hMax));
  let B = null, best = -1;
  for (const c of cand) {
    const on = cand.filter(r => Math.abs(r.y1 - c.y1) <= 0.12 * Math.max(r.h, c.h));
    // (support: how many members stand on it, times how far along the chain they reach: a word spans the row,
    // the aligned pieces of a symbol beside it do not, PostHog)
    const sup = on.length * (Math.max(...on.map(r => r.x1)) - Math.min(...on.map(r => r.x0)) + 1) + 1e-3 * on.reduce((t, r) => t + r.h, 0);
    if (sup > best) { best = sup; B = med(on.map(r => r.y1)); }
  }
  // typical glyphs on that baseline: neither specks (dots, accents) nor a symbol much taller than the letters
  const on = cand.filter(r => Math.abs(r.y1 - B) <= 0.12 * r.h);
  if (on.length < 3) return null;
  const hm = med(on.map(r => r.h));
  const core = on.filter(r => r.h >= 0.35 * hm && r.h <= 1.6 * hm);
  if (core.length < 3) return null;
  const T = pctl(core.map(r => r.y0), 0.2);
  const H = B - T + 1;
  if (H < 4) return null;
  const Hx = med(core.map(r => r.h));
  return { B, T, H, Hx };
}
// how a member relates to the line: 'glyph' (stands on the baseline or is a descender), 'small' (dot, accent,
// mark: neutral) or 'out' (a symbol, a piece of one, a bar, something taller than the line)
export function fitLine(r, L) {
  const { B, T, H, Hx } = L;
  // anti-aliasing slivers along a letter (1 px wide) are neutral
  if (r.rim || Math.min(r.w, r.h) <= Math.max(2, 0.04 * H)) return 'small';
  if (r.h < 0.35 * H && r.w < 1.2 * H) return r.y0 >= T - 0.6 * H && r.y1 <= B + 0.6 * H ? 'small' : 'out';
  const onBase = Math.abs(r.y1 - B) <= 0.12 * H;
  // an ascender rises above a top line that is the x-height (a lowercase word with few ascenders: the l of
  // mixpanel); it is narrow, as ascender letters are
  const asc = onBase && r.y0 < T - 0.2 * H && r.w <= 0.8 * r.h && r.y0 >= T - 0.8 * Hx;
  if (asc) return 'glyph';
  if (r.h > 1.5 * H || r.y0 < T - 0.2 * H || r.y1 > B + 0.45 * H) return 'out';
  if (onBase) return 'glyph';
  if (r.y1 > B && B - r.y0 >= Math.min(0.75 * Hx, 0.5 * H)) return 'glyph'; // descender: fills the x-height above the baseline
  return 'out';
}

export function findParts(ctx) {
  const { regions } = ctx.st;
  // top-level units: roots of drawn figures
  const rootIds = [...new Set(ctx.figs.map(F => F.root))];
  const roots = rootIds.map(id => { const r = regions[id]; return { id, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, w: r.x1 - r.x0 + 1, h: r.y1 - r.y0 + 1, area: r.fillArea || r.area, rim: (r.maxDepth ?? 9) <= 1 }; });
  const n = roots.length;
  const par = roots.map((_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[Math.max(a, b)] = Math.min(a, b); };
  // letters: similar height, overlapping vertically, close horizontally
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = roots[i], b = roots[j];
    const hr = Math.max(a.h, b.h) / Math.min(a.h, b.h);
    if (hr > 2.3) continue;
    const ov = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ov < 0.5 * Math.min(a.h, b.h)) continue;
    const gap = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
    if (gap > 1.6 * Math.max(a.h, b.h)) continue;
    if (-gap > 0.3 * Math.min(a.w, b.w)) continue; // letters stand side by side, they do not overlap
    // a letter is not much wider than tall; a bar or a big symbol is not a letter
    if (a.w > 2.6 * a.h || b.w > 2.6 * b.h) continue;
    uni(i, j);
  }
  const groups = new Map();
  roots.forEach((r, i) => { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); });
  let rows = [], others = [];
  const dbg = globalThis.__dbgParts;
  // most glyphs of a word share one ink, or two inks in two runs (a word in two colours: WordPress)
  const oneWord = list => {
    const glyphs = list.filter(r => !r.small);
    if (glyphs.length < 3) return false;
    const labs = glyphs.map(r => regions[r.id].lab);
    const share = Math.max(...labs.map(a => labs.filter(b => labD(a, b) < 0.1).length));
    if (share >= 0.7 * glyphs.length) return true;
    // two inks, each one contiguous run along the row, each at least two glyphs
    const ink = []; for (const a of labs) if (!ink.some(c => labD(c, a) < 0.1)) ink.push(a);
    const seq = labs.map(a => ink.findIndex(c => labD(c, a) < 0.1));
    if (ink.length !== 2) return false;
    let changes = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
    return changes === 1 && seq.filter(k => k === 0).length >= 2 && seq.filter(k => k === 1).length >= 2;
  };
  // a letter of the word's font: on the baseline, of letter proportions and height, in the word's ink and stroke
  const inkOf = list => { const labs = list.map(r => regions[r.id].lab); let best = labs[0], bn = -1; for (const a of labs) { const c = labs.filter(b => labD(a, b) < 0.1).length; if (c > bn) { bn = c; best = a; } } return best; };
  const letterLike = (r, L, glyphs) => {
    if (!glyphs.length || Math.abs(r.y1 - L.B) > 0.15 * L.H || r.w > 1.3 * r.h || r.h > 2.4 * L.Hx || r.h < 0.6 * L.Hx) return false;
    const sw = med(glyphs.map(q => regions[q.id].width)), w = regions[r.id].width;
    return w >= 0.5 * sw && w <= 2 * sw && labD(regions[r.id].lab, inkOf(glyphs)) < 0.12;
  };
  // a text row: >= 3 glyphs on a common line, wider than tall, one word's ink
  const isRow = list => {
    const glyphs = list.filter(r => !r.small);
    if (glyphs.length < 3) return false;
    const b = bboxOf(list);
    if (b.w < 1.5 * b.h) return false;
    const L = lineBand(glyphs);
    if (!L) return false;
    const onBase = glyphs.filter(r => Math.abs(r.y1 - L.B) <= 0.12 * L.H).length, onTop = glyphs.filter(r => Math.abs(r.y0 - L.T) <= 0.12 * L.H).length;
    if (Math.max(onBase, onTop) < 0.6 * glyphs.length) return false;
    // a row of plain bars is not a word (the SoundCloud cloud's bars)
    if (glyphs.filter(r => r.w <= 0.25 * r.h).length > 0.75 * glyphs.length) return false;
    return oneWord(list);
  };
  // a chain is cut at gaps far wider than its letter spacing (over half the typical height and four times the
  // typical gap): a symbol whose pieces line up with a letter's descender would otherwise set the baseline
  // (PostHog); each piece is read as a line of its own
  const chains = [];
  for (const list0 of groups.values()) {
    const list = list0.slice().sort((a, b) => a.x0 - b.x0);
    const big = list.filter(r => !r.rim && Math.min(r.w, r.h) > 2);
    if (big.length < 6) { chains.push(list); continue; }
    const hE = med(big.map(r => r.h)), g = [];
    let x1 = -Infinity; for (const r of big) { if (x1 > -Infinity) g.push(r.x0 - x1); x1 = Math.max(x1, r.x1); }
    const cut = Math.max(0.5 * hE, 4 * Math.max(1, med(g.map(v => Math.max(0, v)))));
    let cur = [], xe = -Infinity;
    for (const r of list) { if (cur.length && !r.rim && Math.min(r.w, r.h) > 2 && r.x0 - xe > cut) { chains.push(cur); cur = []; } cur.push(r); xe = Math.max(xe, r.x1); }
    if (cur.length) chains.push(cur);
  }
  for (const list of chains) {
    const L = lineBand(list);
    if (!L) { for (const r of list) others.push({ kind: 'shape', members: [r], ...bboxOf([r]) }); continue; }
    const fitL = list.map(r => fitLine(r, L)), fit = fitL.slice();
    // a symbol standing at an end of the word that fits the line by its size (the YouTube button, the Rancher
    // cow): far more ink area than a letter and taller than the typical glyph (v6 rule, kept)
    // (v6.1) ... or one in another ink than the word that is wider or taller than a letter (the Claude star, the
    // Meta loop, the Android head, the Stack Overflow tray), or one drawn with a far heavier stroke (a filled
    // shape beside outlined letters: the Vercel triangle)
    for (let it = 0; it < 4; it++) {
      const gi = list.map((r, k) => k).filter(k => fit[k] === 'glyph');
      if (gi.length < 4) break;
      const ma = med(gi.map(k => list[k].w * list[k].h)), mh = med(gi.map(k => list[k].h));
      const ink = inkOf(gi.map(k => list[k])), sw = med(gi.map(k => regions[list[k].id].width));
      // (a swash letter reaching over its neighbours, the N of Nestle, is not a symbol beside the word)
      const reaches = k => gi.some(j => j !== k && Math.min(list[k].x1, list[j].x1) - Math.max(list[k].x0, list[j].x0) > 0.5 * list[j].w);
      const sym = k => { const r = list[k], g = regions[r.id]; return !reaches(k) && ((r.w * r.h > 3.5 * ma && r.h > 1.15 * mh)
        || (r.h >= 0.8 * L.H && ((labD(g.lab, ink) >= 0.12 && (r.w > 1.3 * r.h || r.h > 1.15 * L.Hx)) || g.width > 2.2 * sw))
        || (r.w > 1.8 * L.H && r.h > 1.15 * L.Hx)); }; // far wider and taller than a letter (the Hyundai oval)
      if (sym(gi[0])) fit[gi[0]] = 'out'; else if (sym(gi[gi.length - 1])) fit[gi[gi.length - 1]] = 'out'; else break;
    }
    // letters stand side by side: two tall members stacked in one column (the two pieces of the AMD arrow) are a
    // symbol
    for (const [k, r] of list.entries()) for (const [j, q] of list.entries()) {
      if (j <= k || fit[k] !== 'glyph' || fit[j] !== 'glyph' || r.h < 0.5 * L.H || q.h < 0.5 * L.H || Math.max(r.w, q.w) > 1.6 * L.H) continue;
      const ov = Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0);
      if (ov >= 0.6 * Math.min(r.w, q.w)) { fit[k] = 'out'; fit[j] = 'out'; }
    }
    // a symbol cut into pieces (the WordPress ring around its W): a piece lying inside the box of a member that
    // does not fit the line (grown by 15 % of its size, three rounds) belongs to that symbol, not to the word
    for (let round = 0; round < 3; round++) {
      let grew = false;
      for (const [k, o] of list.entries()) {
        if (fit[k] !== 'out' || fitL[k] !== 'out' || o.h < 0.8 * L.H) continue; // (only a member off the line: a letter peeled for its size keeps its neighbours, the swash N of Nestle)
        const sym = list.filter((r, j) => fit[j] === 'out' && (r === o || r.symOf === o));
        const b = bboxOf(sym), m = 0.15 * Math.max(b.w, b.h);
        for (const [j, r] of list.entries()) {
          if (fit[j] === 'out' || r.rim || Math.min(r.w, r.h) <= Math.max(2, 0.04 * L.H)) continue;
          const ix = Math.max(0, Math.min(r.x1, b.x1 + m) - Math.max(r.x0, b.x0 - m) + 1), iy = Math.max(0, Math.min(r.y1, b.y1 + m) - Math.max(r.y0, b.y0 - m) + 1);
          if (ix * iy >= 0.8 * r.w * r.h) { fit[j] = 'out'; r.symOf = o; grew = true; }
        }
      }
      if (!grew) break;
    }
    for (const [k, r] of list.entries()) r.small = fit[k] === 'small';
    // runs of consecutive members that fit the line (small attachments do not break a run); a gap far wider
    // than the letter spacing (over 0.6 H and 3 times the typical gap) ends a run too: what stands beyond it is
    // a symbol of letter height (the Allianz eagle) or a word of its own
    const gaps = []; { let x1 = null; for (const [k, r] of list.entries()) { if (fit[k] !== 'glyph') continue; if (x1 !== null) gaps.push(Math.max(0, r.x0 - x1)); x1 = Math.max(x1 ?? -Infinity, r.x1); } }
    const gTyp = gaps.length ? med(gaps) : 0, gBreak = Math.max(0.6 * L.H, 3 * gTyp);
    // an initial capital taller than the lowercase letters (the D of Dior) is a letter, not a symbol: it stands
    // on the baseline, is drawn in the word's ink and stroke, and keeps the letter spacing to the next glyph
    {
      const gl = list.filter((r, k) => fit[k] === 'glyph');
      for (const [k, r] of list.entries()) {
        if (fit[k] !== 'out' || fitL[k] !== 'out' || list.some(q => q.symOf === r)) continue;
        const nx = list.find((q, j) => j > k && fit[j] === 'glyph');
        if (!nx || !letterLike(r, L, gl) || nx.x0 - r.x1 > 2 * gTyp + 0.2 * L.H) continue;
        if (list.some((q, j) => j < k && fit[j] === 'glyph' && q.x1 > r.x0 - 2 * gTyp - 0.2 * L.H)) continue; // initial only
        fit[k] = 'glyph';
      }
    }
    const runs = []; let cur = [], lastX1 = null;
    for (const [k, r] of list.entries()) {
      if (fit[k] === 'out') { if (cur.length) runs.push(cur); cur = []; lastX1 = null; runs.push([r]); continue; }
      if (fit[k] === 'glyph' && lastX1 !== null && r.x0 - lastX1 > gBreak) { runs.push(cur); cur = []; }
      cur.push(r);
      if (fit[k] === 'glyph') lastX1 = Math.max(lastX1 ?? -Infinity, r.x1);
    }
    if (cur.length) runs.push(cur);
    if (dbg) dbg.push({ band: L, fit: list.map((r, k) => `${r.w}x${r.h}@${r.x0},${r.y0}:${fit[k]}`).join(' ') });
    for (const run0 of runs) {
      // small members beyond the word's ends (pieces of a symbol beside it) are not attachments of the word
      const gl = run0.filter(r => !r.small);
      const gx0 = Math.min(...gl.map(r => r.x0)), gx1 = Math.max(...gl.map(r => r.x1));
      const run = gl.length ? run0.filter(r => !r.small || (r.x1 >= gx0 - 0.3 * L.H && r.x0 <= gx1 + 0.3 * L.H)) : run0;
      for (const r of run0) if (!run.includes(r)) others.push({ kind: 'shape', members: [r], ...bboxOf([r]) });
      if (isRow(run)) rows.push({ kind: 'text', members: run, ...bboxOf(run) });
      else for (const r of run) others.push({ kind: 'shape', members: [r], ...bboxOf([r]) });
    }
  }
  for (const r of roots) { delete r.small; delete r.symOf; }
  // groups lying on a bigger part (container stack on the docker whale) belong to it
  const big = rows.concat(others).sort((a, b) => b.w * b.h - a.w * a.h);
  const absorbed = new Set();
  for (const g of big) {
    if (absorbed.has(g)) continue;
    for (const o of big) {
      if (o === g || absorbed.has(o) || o.w * o.h > 0.2 * g.w * g.h) continue;
      // (a text row only when it lies inside the shape: a name under a figure is the wordmark, not a detail of it)
      const m = o.kind === 'text' ? 0.02 * g.h : 0.3 * g.h;
      if (o.x0 >= g.x0 - m && o.x1 <= g.x1 + m && o.y0 >= g.y0 - m && o.y1 <= g.y1 + m && g.kind === 'shape') {
        g.members.push(...o.members); Object.assign(g, bboxOf(g.members)); absorbed.add(o);
      }
    }
  }
  rows = rows.filter(r => !absorbed.has(r)); others = others.filter(r => !absorbed.has(r));
  // v6.1: a symbol drawn in several pieces (the Slack hash, the Microsoft squares, the bars of the Ghost mark):
  // shape parts that nearly touch (gap below a third of the smaller piece) and do not reach into a text row form
  // one part
  {
    const m = others.length, p2 = others.map((_, i) => i);
    const f2 = i => { while (p2[i] !== i) { p2[i] = p2[p2[i]]; i = p2[i]; } return i; };
    const gapOf = (a, b) => Math.hypot(Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), Math.max(a.y0 - b.y1, b.y0 - a.y1, 0));
    const overlapsRow = b => rows.some(r => !(b.x1 < r.x0 || b.x0 > r.x1 || b.y1 < r.y0 || b.y0 > r.y1));
    for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) {
      const a = others[i], b = others[j];
      if (gapOf(a, b) > Math.max(2, 0.4 * Math.min(Math.max(a.w, a.h), Math.max(b.w, b.h)), 1.1 * Math.min(a.w, a.h, b.w, b.h))) continue;
      if (overlapsRow(bboxOf([a, b]))) continue;
      const ra = f2(i), rb = f2(j); if (ra !== rb) p2[Math.max(ra, rb)] = Math.min(ra, rb);
    }
    const cl = new Map();
    others.forEach((o, i) => { const r = f2(i); if (!cl.has(r)) cl.set(r, []); cl.get(r).push(o); });
    // (a cluster is a compact symbol, not a chain of letters or a frieze: aspect at most 3, else its pieces stay apart)
    const compact = list => { const b = bboxOf(list); return b.w <= 3 * b.h && b.h <= 3 * b.w && !overlapsRow(b); };
    others = [...cl.values()].flatMap(list => list.length === 1 ? [list[0]] : compact(list) ? [{ kind: 'shape', members: list.flatMap(o => o.members), ...bboxOf(list), pieces: list.length }] : list);
    // a piece lying inside the box of a symbol of several pieces belongs to it (the side rays of a sunburst)
    for (const c of others.filter(o => o.pieces)) for (const o of others) {
      if (o === c || o.pieces || o.w * o.h > 0.2 * c.w * c.h) continue;
      if (o.x0 >= c.x0 && o.x1 <= c.x1 && o.y0 >= c.y0 && o.y1 <= c.y1) { c.members.push(...o.members); c.pieces++; o.into = c; }
    }
    others = others.filter(o => !o.into);
  }
  // small attachments (dots of i, accents, ®, ™) join the row they sit on or next to
  const keep = [], box0 = new Map(rows.map(rw => [rw, { x0: rw.x0, y0: rw.y0, x1: rw.x1, y1: rw.y1, h: rw.h }]));
  for (const o of others) {
    if (o.pieces) { keep.push(o); continue; }
    // (judged against the row as found, so attachments do not chain outwards)
    const row = rows.find(r0 => { const rw = box0.get(r0); return o.h < 0.5 * rw.h && o.x0 >= rw.x0 - 0.6 * rw.h && o.x1 <= rw.x1 + 0.6 * rw.h && o.y1 >= rw.y0 - 0.6 * rw.h && o.y0 <= rw.y1 + 0.3 * rw.h; });
    if (row) { row.members.push(...o.members); Object.assign(row, bboxOf(row.members), { kind: 'text', members: row.members }); }
    else keep.push(o);
  }
  others = keep;
  // a 'row' of pieces standing on a symbol of the same pieces (the upper rays of the Okta sunburst) is part of it
  {
    const dg = r => Math.hypot(r.w, r.h);
    const mdiag = list => med(list.map(dg));
    const gapOf = (a, b) => Math.hypot(Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), Math.max(a.y0 - b.y1, b.y0 - a.y1, 0));
    for (const rw of rows.slice()) {
      const c = others.find(o => o.pieces >= 3 && gapOf(o, rw) <= 0.5 * rw.h && (() => { const u = bboxOf([o, rw]); return u.w <= 2.2 * u.h && u.h <= 2.2 * u.w; })()
        && mdiag(rw.members) >= 0.6 * mdiag(o.members) && mdiag(rw.members) <= 1.6 * mdiag(o.members));
      if (!c) continue;
      c.members.push(...rw.members); Object.assign(c, bboxOf([c, rw])); c.pieces += rw.members.length;
      rows.splice(rows.indexOf(rw), 1);
    }
  }
  const all = rows.concat(others);
  const [lx0, ly0, lx1, ly1] = ctx.st.logoBox;
  const logoDiag = Math.hypot(lx1 - lx0, ly1 - ly0);
  for (const p of all) p.size = Math.sqrt(p.w * p.h);
  const maxText = Math.max(0, ...rows.map(r => r.h));
  const bigShape = others.filter(o => o.size > 0.25 * logoDiag);
  for (const p of all) {
    p.small = false;
    if (p.kind === 'text' && maxText && p.h < 0.45 * maxText) p.small = true;                       // tagline under a wordmark
    if (p.kind === 'text' && bigShape.length && p.h < 0.12 * Math.max(...bigShape.map(o => o.h))) p.small = true;
    if (p.kind === 'shape' && Math.hypot(p.w, p.h) < 0.06 * logoDiag) p.small = true;               // ®, ™, specks
  }
  // the Bildmarke: shape parts that are not small; the wordmark: the largest text row
  const maxShape = Math.max(0, ...others.map(o => o.size));
  const wordmark = rows.filter(r => !r.small).sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
  // (v6.1) a shape that holds the wordmark (a box, an oval, a banner behind the letters) is its frame, not a
  // Bildmarke beside it; a mark is measured against the wordmark as well as the logo (a symbol beside a long
  // word is small against the logo's diagonal: the Spotify disc)
  const holds = (o, r) => r && o.x0 <= r.x0 + 0.1 * r.w && o.x1 >= r.x1 - 0.1 * r.w && o.y0 <= r.y0 + 0.2 * r.h && o.y1 >= r.y1 - 0.2 * r.h;
  // (a letter split off the word, a short word beside it: a shape that stands on the wordmark's line at letter
  // height next to it is lettering, not a Bildmarke)
  const wBand = wordmark ? lineBand(wordmark.members) : null;
  const onLine = o => wBand && !o.pieces && o.members.length === 1 && o.x0 <= wordmark.x1 + 1.5 * wBand.H && o.x1 >= wordmark.x0 - 1.5 * wBand.H && letterLike(o.members[0], wBand, wordmark.members.filter(r => r.h >= 0.35 * wBand.H));
  const mark = others.filter(o => !o.small && !holds(o, wordmark) && !onLine(o) && o.size >= 0.35 * maxShape && (o.size >= 0.15 * logoDiag || (wordmark && o.h >= 0.8 * wordmark.h && o.size >= 0.08 * logoDiag)));
  const partOf = new Map();
  all.forEach((p, i) => { p.index = i; for (const m of p.members) partOf.set(m.id, p); });
  for (const F of ctx.figs) F.part = partOf.get(F.root);
  return { all, rows, mark, wordmark, hasMark: mark.length > 0 && wordmark !== null };
}
