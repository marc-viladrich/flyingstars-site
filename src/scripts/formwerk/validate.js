import FK from "./fk.js";
// copied from formations-werkzeug/core/validate.js by tools/sync-formwerk.js – edit there, then sync
// Validator (SPEC §7): one set of metric definitions for the count strip and the final formation.
// analyze() works in any unit (template units for candidates, metres for the final formation).
(function (FK) {
  "use strict";
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const median = (v) => { if (!v.length) return 0; const s = v.slice().sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

  // layout: { drones: [{ p, role, node, edge, el }], perEdge: [{ edge, m, seq }] }, graph for node kinds / edge data
  function analyze(layout, graph, opts) {
    const o = Object.assign({ clumpRel: 0.8, gapRel: 0.9 }, opts || {});
    const D = layout.drones, lit = D.filter((d) => d.role !== "spare");
    const pts = D.map((d) => d.p);
    const chords = [], mu = [], segCV = [];
    const adj = new Set(), key = (i, j) => (i < j ? i + ":" + j : j + ":" + i);
    const near = D.map(() => []); // [{ node, e, dir, steps }]
    // parts: scene motifs with their own drone count have their own spacing; evenness and clumps are measured inside
    // each part (one part "" when nothing has its own count)
    const pkey = (x) => (x === undefined || x === null ? "" : String(x)), byPart = new Map();
    for (const pe of layout.perEdge) {
      const c = [];
      for (let k = 0; k + 1 < pe.seq.length; k++) { c.push(dist(D[pe.seq[k]].p, D[pe.seq[k + 1]].p)); adj.add(key(pe.seq[k], pe.seq[k + 1])); }
      pe.chords = c;
      chords.push(...c);
      const pk = pkey(pe.part);
      if (!byPart.has(pk)) byPart.set(pk, []);
      byPart.get(pk).push(...c);
      const mean = c.reduce((a, b) => a + b, 0) / c.length;
      mu.push({ edge: pe.edge, mean, m: pe.m, bridge: !!pe.bridge, part: pk });
      if (c.length >= 2) { const sd = Math.sqrt(c.reduce((a, b) => a + (b - mean) ** 2, 0) / c.length); segCV.push(sd / mean); }
      const s = pe.seq, na = s[0], nb = s[s.length - 1];
      for (let k = 1; k <= 2 && k < s.length; k++) near[s[k]].push({ node: na, e: pe.edge, dir: 0, steps: k });
      for (let k = 1; k <= 2 && s.length - 1 - k >= 0; k++) near[s[s.length - 1 - k]].push({ node: nb, e: pe.edge, dir: 1, steps: k });
    }
    const d = median(chords) || 1;
    const dPart = {};
    for (const [k, v] of byPart) dPart[k] = median(v) || d;
    const dOf = (k) => { const v = dPart[pkey(k)]; return v !== undefined ? v : d; };
    // evenness: bridges across stroke ends are not "spacing"
    let spread = 1, band = null, worstPart = null;
    const partSpread = {}, partBand = {};
    for (const k of Object.keys(dPart)) {
      const v = mu.filter((x) => x.part === k && !x.bridge).map((x) => x.mean).filter((x) => x > 0);
      if (!v.length) continue;
      const lo = Math.min(...v), hi = Math.max(...v);
      partSpread[k] = hi / lo; partBand[k] = [lo / dPart[k], hi / dPart[k]];
      if (hi / lo > spread) { spread = hi / lo; worstPart = k; }
      band = band ? [Math.min(band[0], lo / dPart[k]), Math.max(band[1], hi / dPart[k])] : partBand[k].slice();
    }
    if (!band) band = [1, 1];
    const dVals = Object.values(dPart), dMin = dVals.length ? Math.min(...dVals) : d, dMax = dVals.length ? Math.max(d, ...dVals) : d;
    const cp = FK.geom.closestPair(pts);
    // clumps: non-adjacent pairs closer than clumpRel * local spacing (two parts: the larger spacing), classified
    const clumps = [];
    let gapMin = Infinity, gapRelMin = Infinity, gapPair = null;
    for (const [i, j, dd] of FK.geom.pairsWithin(pts, Math.max(o.clumpRel, o.gapRel) * dMax)) {
      if (D[i].role === "spare" || D[j].role === "spare") continue;
      const ki = pkey(D[i].part), kj = pkey(D[j].part), base = ki === kj ? dOf(ki) : Math.max(dOf(ki), dOf(kj)), rel = dd / base;
      if (D[i].el !== D[j].el) { if (rel < gapRelMin) { gapRelMin = rel; gapMin = dd; gapPair = [i, j]; } }
      if (dd >= o.clumpRel * base || adj.has(key(i, j))) continue;
      let type = null, node = null;
      for (const a of near[i]) { for (const b of near[j]) if (a.node === b.node && (a.e !== b.e || a.dir !== b.dir)) { type = "corner"; node = a.node; break; } if (type) break; }
      if (type) { const nd = graph && D[node].node !== null && D[node].node !== undefined ? graph.nodes[D[node].node] : null; if (nd && nd.kind === "junction") type = "junction"; }
      else type = D[i].el !== D[j].el ? "between" : "neck";
      clumps.push({ i, j, d: dd, rel, type, node });
    }
    return {
      n: lit.length, d, chords, mu, spread, band, segCVmax: segCV.length ? Math.max(...segCV) : 0,
      dPart, dOf, dMin, partSpread, partBand, worstPart,
      closest: cp, clumps, gapMin, gapRelMin, gapPair,
      nCorner: clumps.filter((c) => c.type === "corner" || c.type === "junction").length,
      nBetween: clumps.filter((c) => c.type === "between").length,
      nNeck: clumps.filter((c) => c.type === "neck").length,
    };
  }

  // shape fidelity per edge: max(template -> chord polyline, drones -> template) / d
  function fidelity(layout, graph, scale) {
    const D = layout.drones, out = [];
    for (const pe of layout.perEdge) {
      const e = graph.edges[pe.edge], poly = pe.seq.map((i) => D[i].p.map((v) => v / scale));
      const cum = FK.geom.cumLen(e.Q, false), L = cum[cum.length - 1];
      const dTu = (pe.chords && pe.chords.length ? pe.chords.reduce((a, b) => a + b, 0) / pe.chords.length : L) / scale;
      const n = Math.max(4, Math.ceil(L / (0.05 * Math.max(dTu, 1e-9))));
      let h = 0;
      const pcum = FK.geom.cumLen(poly, false);
      for (let k = 0; k <= Math.min(n, 2000); k++) { const q = FK.geom.pointAt(e.Q, cum, (L * k) / Math.min(n, 2000), false); const pr = FK.geom.project(poly, pcum, q, false); if (pr.d > h) h = pr.d; }
      out.push({ edge: pe.edge, h: h * scale });
    }
    return out;
  }

  const fmt = (x, dec = 2) => (Number.isFinite(x) ? x.toFixed(dec).replace(".", ",").replace(/^-0(,0+)?$/, "0$1") : "–");

  // final report for a formation in metres; ctx: { graph, settings, plan info, source info }
  function report(form, ctx) {
    const st = ctx.settings, g = ctx.graph, F = [];
    const add = (id, severity, title, extra) => F.push(Object.assign({ id, severity, title }, extra || {}));
    const hardMin = st.hardMin, lscWarn = Math.SQRT2 * hardMin;
    // distance checks on the written coordinates (4 decimals) [R1]
    const written = form.drones.map((dr) => [Math.round(dr.p[0] * 1e4) / 1e4, Math.round(dr.p[1] * 1e4) / 1e4]);
    const pairs = FK.geom.pairsWithin(written, lscWarn + 1e-9);
    const fail = pairs.filter((p) => p[2] <= hardMin + 1e-12), warn = pairs.filter((p) => p[2] > hardMin + 1e-12 && p[2] <= lscWarn + 1e-12);
    const A = form.analysis;
    if (fail.length) {
      const worst = fail.reduce((a, b) => (b[2] < a[2] ? b : a));
      add("F_MIN_1M", "FEHLER", `Abstand 1,0 m oder weniger (harte Grenze, LSC meldet „Collision“): ${fail.length} ${fail.length === 1 ? "Paar" : "Paare"}, engstes ${fmt(worst[2])} m`, { where: { drones: [worst[0], worst[1]] }, options: [{ id: "scale", label: `Skalieren ×${fmt((hardMin + st.floorMargin) / worst[2], 2)}`, k: (hardMin + st.floorMargin) / worst[2] }] });
    }
    if (warn.length) {
      const worst = warn.reduce((a, b) => (b[2] < a[2] ? b : a));
      add("W_LSC_141", "WARNUNG", `Bis 1,41 m (√2) – LSC meldet „mögliche Kollisionen“ (${warn.length} ${warn.length === 1 ? "Paar" : "Paare"}, engstes ${fmt(worst[2])} m)`, { where: { drones: [worst[0], worst[1]] }, options: [{ id: "scale142", label: "Engstes Paar = 1,42 m skalieren" }] });
    }
    const tiers = st.tiers, parts = form.parts && form.parts.length ? form.parts : null;
    for (const p of parts || []) {
      if (!p.fixed || !p.tier || p.tier === "gruen") continue;
      const opts = [p.down, p.up].filter((k) => k > 0).map((k) => ({ id: "itemN", item: p.key, n: k, label: `${p.name}: ${k} Drohnen` }));
      add("W_PART_EVEN", "WARNUNG", `${p.tier === "ungleich" ? "Deutlich ungleich" : "Ungleich"}: ${p.name} mit ${p.n} Drohnen (Spread ${fmt(p.spread, 2)})${opts.length ? " – gleichmäßig mit " + [p.down, p.up].filter((k) => k > 0).join(" oder ") : ""}`, { value: p.spread, options: opts });
    }
    const evS = parts ? A.partSpread.auto : A.spread, evB = parts ? A.partBand.auto : A.band;
    const ev = evS === undefined ? "gruen" : evenTier(evS, evB, g.isText, tiers);
    if (ev !== "gruen") {
      const pre = ev === "ungleich" ? "Deutlich ungleich: " : "";
      if (g.isText) add("W_SPREAD", "WARNUNG", `${pre}Ungleiche Abstände zwischen Strichen (${fmt(A.band[0], 2)}–${fmt(A.band[1], 2)} × Abstand)`, { value: A.band });
      else add("W_SPREAD", "WARNUNG", `${pre}Ungleiche Abstände zwischen Segmenten${parts ? " (übrige Motive)" : ""} (Spread ${fmt(evS, 2)})`, { value: evS });
    }
    if (g.isText && g.textOutline && g.strokeW > 0) { // outline letters: the two sides of every stroke must stay clearly apart
      const perStroke = (g.strokeW * form.scale) / form.d, cap = !(st.showTotal > 0) ? Infinity : st.showTotal;
      const need = Math.ceil((form.N * 1.5) / perStroke), opts = need > form.N && need <= cap ? [{ id: "setN", label: `Anzahl ${need} übernehmen`, n: need }] : [];
      if (perStroke < 1.3) add("W_TEXT_DENSITY", "WARNUNG", `Umriss zu schmal: Striche nur ${fmt(perStroke, 1)} Abstände breit – die beiden Seiten verschmelzen (mind. 1,5, etwa ${need} Drohnen)`, { options: opts });
      else if (perStroke < 1.6) add("H_TEXT_DENSITY", "HINWEIS", `Umriss knapp: Striche ${fmt(perStroke, 1)} Abstände breit (gut ab 1,5–2)`, { options: opts });
    } else if (g.isText && g.nGlyphs) { // FS rule of thumb for customers: 10–12 drones per letter for simple text (Flo 25.09.2026)
      const perCap = (FK.font.CAP * form.scale) / form.d, perLetter = form.N / g.nGlyphs;
      const n10 = 10 * g.nGlyphs, n12 = 12 * g.nGlyphs, cap = !(st.showTotal > 0) ? Infinity : st.showTotal;
      const opts = [n10, n12].filter((n) => n > form.N && n <= cap).map((n) => ({ id: "setN", label: `Anzahl ${n} übernehmen`, n }));
      if (perLetter < 10 - 1e-9) add("W_TEXT_DENSITY", "WARNUNG", `Unter dem Richtwert: ${fmt(perLetter, 1)} Drohnen pro Buchstabe (einfache Schrift: 10–12, also ${n10}–${n12} Drohnen) · ${fmt(perCap, 1)} Abstände pro Buchstabenhöhe`, { options: opts });
      else if (perCap < 3.5) add("W_TEXT_DENSITY", "WARNUNG", `Zu grob für diese Buchstaben: nur ${fmt(perCap, 1)} Abstände pro Buchstabenhöhe (${fmt(perLetter, 1)} Drohnen pro Buchstabe)`, { options: [{ id: "setN", label: `Anzahl ${Math.ceil((form.N * 4) / perCap)} übernehmen`, n: Math.ceil((form.N * 4) / perCap) }].filter((o) => o.n <= cap) });
      else if (perLetter < 12 - 1e-9) add("H_TEXT_DENSITY", "HINWEIS", `${fmt(perLetter, 1)} Drohnen pro Buchstabe – reicht für einfache Schrift (Richtwert 10–12); mehr Drohnen machen runde Buchstaben deutlicher`, { options: opts });
    }
    // clumps
    const corner = A.clumps.filter((c) => c.type === "corner" || c.type === "junction");
    if (corner.length) {
      const w = corner.reduce((a, b) => (b.d < a.d ? b : a));
      const node = form.drones[w.node], nd = node && node.node !== null ? g.nodes[node.node] : null;
      const open = nd && nd.tau !== undefined ? 180 - nd.tau : null;
      add(w.type === "junction" ? "W_CLUMP_JUNCTION" : "W_CLUMP_CORNER", "HINWEIS",
        w.type === "junction" ? `Enge Nachbarn am Knoten: ${fmt(w.d)} m (${fmt(w.rel, 2)} d)` : `Enge Nachbarn an spitzer Ecke: ${fmt(w.d)} m (${fmt(w.rel, 2)} d${open !== null ? ", Öffnung " + fmt(open, 0) + "°" : ""})`,
        { where: { drones: [w.i, w.j] }, count: corner.length, options: [{ id: "keep", label: "Beibehalten" }, { id: "nodrone", label: w.type === "junction" ? "Knoten ohne Drohne" : "Ecke ohne Drohne" }] });
    }
    const between = A.clumps.filter((c) => c.type === "between");
    if (between.length) {
      const w = between.reduce((a, b) => (b.d < a.d ? b : a));
      add("W_CLUMP_BETWEEN", "WARNUNG", `Elemente zu nah: ${elName(g, form.drones[w.i].el)} und ${elName(g, form.drones[w.j].el)} (${fmt(w.rel, 2)} d)`, { where: { drones: [w.i, w.j] }, count: between.length, options: [{ id: "more", label: "Mehr Drohnen" }, { id: "accept", label: "Akzeptieren" }] });
    } else if (A.gapPair && A.gapRelMin < 0.9) {
      add("H_ELEMENT_GAP", "HINWEIS", `Elemente knapp: ${elName(g, form.drones[A.gapPair[0]].el)} und ${elName(g, form.drones[A.gapPair[1]].el)} (${fmt(A.gapRelMin, 2)} d)`, { where: { drones: A.gapPair } });
    }
    const neck = A.clumps.filter((c) => c.type === "neck");
    if (neck.length) {
      const w = neck.reduce((a, b) => (b.d < a.d ? b : a));
      add("W_CLUMP_NECK", "WARNUNG", `Engstelle in ${elName(g, form.drones[w.i].el)}: ${fmt(w.d)} m (${fmt(w.rel, 2)} d)`, { where: { drones: [w.i, w.j] }, count: neck.length, options: [{ id: "accept", label: "Akzeptieren" }] });
    }
    // short edges between Pflichtpunkte
    const shortW = [], shortH = [];
    const partOfEdge = new Map(form.perEdge.map((pe) => [pe.edge, pe.part])), dE = (edge) => A.dOf(partOfEdge.get(edge)); // local spacing
    for (const pe of form.perEdge) { if (pe.bridge) continue; const L = g.edges[pe.edge].L * form.scale, de = dE(pe.edge); if (L < 0.6 * de) shortW.push({ pe, L, de }); else if (L < 0.75 * de) shortH.push({ pe, L, de }); }
    if (shortW.length) { const w = shortW.reduce((a, b) => (b.L < a.L ? b : a)); add("W_SHORT_EDGE", "WARNUNG", `Sehr kurzes Segment zwischen zwei Pflichtpunkten (${fmt(w.L)} m = ${fmt(w.L / w.de, 2)} d)`, { where: { drones: [w.pe.seq[0], w.pe.seq[w.pe.seq.length - 1]] }, count: shortW.length }); }
    else if (shortH.length) { const w = shortH.reduce((a, b) => (b.L < a.L ? b : a)); add("W_SHORT_EDGE", "HINWEIS", `Kurzes Segment zwischen zwei Pflichtpunkten (${fmt(w.L)} m = ${fmt(w.L / w.de, 2)} d)`, { where: { drones: [w.pe.seq[0], w.pe.seq[w.pe.seq.length - 1]] }, count: shortH.length }); }
    // shape fidelity
    const fid = fidelity(form, g, form.scale);
    const fw = fid.filter((f) => f.h > 0.2 * dE(f.edge)), fh = fid.filter((f) => f.h > 0.1 * dE(f.edge) && f.h <= 0.2 * dE(f.edge));
    if (fw.length) { const w = fw.reduce((a, b) => (b.h / dE(b.edge) > a.h / dE(a.edge) ? b : a)); add("W_SHAPE", "WARNUNG", `Form wird ungenau in ${elName(g, g.edges[w.edge].el)} (${fmt(w.h / dE(w.edge), 2)} d Abweichung)`, { where: { edge: w.edge }, count: fw.length, options: [{ id: "more", label: "Mehr Drohnen" }, { id: "corner", label: "Ecke setzen" }] }); }
    else if (fh.length) { const w = fh.reduce((a, b) => (b.h / dE(b.edge) > a.h / dE(a.edge) ? b : a)); add("W_SHAPE", "HINWEIS", `Form leicht vereinfacht in ${elName(g, g.edges[w.edge].el)} (${fmt(w.h / dE(w.edge), 2)} d Abweichung)`, { where: { edge: w.edge }, count: fh.length }); }
    // small loops kept as contours
    const loopDrones = new Map();
    for (const pe of form.perEdge) { const e = g.edges[pe.edge]; if (!e.closedPath) continue; loopDrones.set(e.path, (loopDrones.get(e.path) || 0) + pe.m); }
    for (const [pth, n] of loopDrones) if (n <= 3) add("W_SMALL_LOOP", "WARNUNG", `Kontur mit nur ${n} Drohnen (${elName(g, g.paths[pth].el)})`, { where: { path: pth } });
    // size / scale
    if (st.sizeMode === "auto" && form.floorFactor > 1 + 1e-6) {
      const x = form.d, sev = form.floorFactor > st.floorGrowMax + 1e-9 ? "WARNUNG" : "HINWEIS";
      add(sev === "WARNUNG" ? "W_SIZE_BY_FLOOR" : "H_SIZE_BY_FLOOR", sev, sev === "WARNUNG" ? `Engstes Paar macht die ganze Formation ×${fmt(form.floorFactor, 2)} größer (Abstand ${fmt(x)} m statt ${fmt(st.spacing)} m)` : `Größe durch engstes Paar bestimmt: Abstand ${fmt(x)} m statt ${fmt(st.spacing)} m`);
    }
    if (st.sizeMode !== "auto" && form.d < 0.98 * st.spacing) add("W_BELOW_TARGET", "WARNUNG", `Abstand unter Zielabstand (${fmt(form.d)} m < ${fmt(st.spacing)} m)`, { options: [{ id: "auto", label: "Auf Zielabstand" }] });
    if (form.asym) add("W_MIRROR", "WARNUNG", "Nicht symmetrisch – mit dieser Anzahl geht es nur ungleich links/rechts", { options: [{ id: "even", label: "Gerade Anzahl wählen" }] });
    // information
    if (form.N < st.targetN) add("H_COUNT", "HINWEIS", `${st.targetN - form.N} ${st.targetN - form.N === 1 ? "Drohne" : "Drohnen"} weniger als Ziel${form.nSpare ? " – Restdrohnen: " + form.nSpare : ""}`);
    if (form.N > st.targetN) add("H_COUNT", "HINWEIS", `${form.N - st.targetN} Drohnen mehr als Ziel (über Ziel gewählt)`);
    const sp = g.specks || [];
    if (sp.length) { const dots = sp.filter((s) => s.kind === "dot").length; add("H_SPECKS", "HINWEIS", `${sp.length} Kleinteile: ${dots} als Punkt, ${sp.length - dots} ausgelassen`); }
    if (ctx.excluded && ctx.excluded.length) add("H_SVG_EXCLUDED", "HINWEIS", `${ctx.excluded.length} SVG-Formen ausgelassen (Hintergrund / unsichtbar)`);
    const snaps = g.stats.snaps + g.stats.joins + g.stats.seams;
    if (snaps) add("H_SNAPS", "HINWEIS", `${snaps} Anschlüsse eingerastet`);
    if (g.stats.overlaps.length) add("H_OVERLAP", "HINWEIS", `Konturen überlappen (${g.stats.overlaps.length}×)`);

    const nF = F.filter((f) => f.severity === "FEHLER").length, nW = F.filter((f) => f.severity === "WARNUNG").length;
    const status = nF ? "rot" : nW ? "gelb" : "gruen";
    const summary = nF ? `Nicht exportierbar – ${nF} Fehler` : nW ? `Exportierbar mit ${nW} ${nW === 1 ? "Warnung" : "Warnungen"}` : "Sauber";
    const order = { FEHLER: 0, WARNUNG: 1, HINWEIS: 2 };
    F.sort((a, b) => order[a.severity] - order[b.severity]);
    return { status, summary, findings: F, closest: fail.length || warn.length ? Math.min(...pairs.map((p) => p[2])) : form.closest, nFail: fail.length, nWarn: warn.length, failPairs: fail, warnPairs: warn };
  }
  // evenness tier: outlines by max/min spread, text by the band [min, max] of the segment means relative to d
  function evenTier(spread, band, isText, tiers) {
    if (isText && band) {
      const inside = (r) => band[0] >= r[0] - 1e-9 && band[1] <= r[1] + 1e-9;
      return inside(tiers.textGreen) ? "gruen" : inside(tiers.textAmber) ? "gelb" : "ungleich";
    }
    return spread <= tiers.green + 1e-9 ? "gruen" : spread <= tiers.amber + 1e-9 ? "gelb" : "ungleich";
  }
  function elName(g, id) { const e = g.elements.find((x) => x.id === id); return e ? e.name : id; }

  FK.validate = { analyze, fidelity, report, median, fmt, evenTier };
})(FK);
