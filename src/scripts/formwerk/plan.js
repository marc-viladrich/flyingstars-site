import FK from "./fk.js";
// copied from formations-werkzeug/core/plan.js by tools/sync-formwerk.js – edit there, then sync
// Plan (SPEC §6.6, §6.7, §6.10): for every candidate count N allocate exactly, place with equal chords, scale to the
// target spacing (never at or below the 1.0 m floor), rate it; count strip + suggestions ("nächst niedrigere saubere
// Zahl"); the chosen formation with spare drones in a grid below the figure.
(function (FK) {
  "use strict";
  const DEFAULTS = {
    targetN: 100, showTotal: null, spacing: 2.0, hardMin: 1.0, floorMargin: 0.001, floorGrowMax: 1.25,
    sizeMode: "auto", scaleK: 1.0, fixedWidth: null, tiers: { green: 1.20, amber: 1.50, textGreen: [0.70, 1.30], textAmber: [0.55, 1.45] }, chosenN: null,
    spares: "below", sparePitchMin: 2.0, symmetry: true,
  };

  // drones in template units for an allocation m
  function layout(graph, m, bridges, parts) {
    const br = new Set(bridges || []);
    const drones = [], nodeDrone = new Array(graph.nodes.length).fill(-1);
    const addNode = (id) => {
      if (nodeDrone[id] < 0) { const nd = graph.nodes[id]; nodeDrone[id] = drones.length; drones.push({ p: nd.p.slice(), role: "node", node: id, edge: null, el: nd.el, kind: nd.kind, part: parts ? parts.nodePart[id] : undefined }); }
      return nodeDrone[id];
    };
    const perEdge = [];
    for (const e of graph.edges) {
      const ia = addNode(e.a), r = FK.place.equalChord(e.Q, m[e.id], e.L), seq = [ia], part = parts ? parts.edgePart[e.id] : undefined;
      r.pts.forEach((p, k) => { seq.push(drones.length); drones.push({ p, role: "edge", node: null, edge: e.id, el: e.el, kind: "edge", u: (k + 1) / m[e.id], part }); });
      seq.push(addNode(e.b));
      perEdge.push({ edge: e.id, m: m[e.id], seq, bridge: br.has(e.id) && m[e.id] === 1, part });
    }
    for (const nd of graph.nodes) if (nd.deg === 0) addNode(nd.id);
    return { drones, perEdge };
  }

  // Scene motifs with their own drone count (Flo 25.09.2026: "pro Motiv Drohnenanzahl zuordnen als Option"): each is a
  // part, allocated on its own and evenly inside; everything else ("auto") shares the rest with one spacing.
  // settings.itemCounts = { itemId: n }; null when nothing has its own count (then everything is one part as before).
  function partsOf(graph, st) {
    const fixed = st.itemCounts || {};
    const itemOf = new Map((graph.elements || []).map((e) => [e.id, e.item]));
    const keyOf = (el) => { const it = itemOf.get(el); return it !== undefined && it !== null && fixed[it] > 0 ? String(it) : "auto"; };
    const nodePart = graph.nodes.map((nd) => keyOf(nd.el)), edgePart = graph.edges.map((e) => keyOf(e.el));
    if (nodePart.every((k) => k === "auto") && edgePart.every((k) => k === "auto")) return null;
    const map = new Map(), get = (k) => { if (!map.has(k)) map.set(k, { key: k, n: k === "auto" ? null : Math.floor(fixed[k]), nodes: [], edges: [] }); return map.get(k); };
    nodePart.forEach((k, i) => get(k).nodes.push(i));
    edgePart.forEach((k, i) => get(k).edges.push(i));
    const list = [...map.values()].sort((a, b) => (a.key === "auto") - (b.key === "auto"));
    const fixedSum = list.reduce((a, p) => a + (p.n || 0), 0), auto = map.get("auto") || null;
    return { list, nodePart, edgePart, fixedSum, auto, minN: fixedSum + (auto ? auto.nodes.length : 0) };
  }

  // one exact allocation over a set of edges: N drones, V of them on the Pflichtpunkte of that set
  function allocSub(graph, ids, V, N, groups) {
    const E = ids.length, T = N - V + E;
    if (N < V) return { ok: false, reason: `weniger Drohnen als Pflichtpunkte (${V})` };
    if (!E) return N === V ? { ok: true, m: [], ratio: 1, bridges: [] } : { ok: false, reason: "keine Linien – nur Punkte" };
    const L = ids.map((id) => graph.edges[id].L), cbar = L.reduce((x, y) => x + y, 0) / T, local = new Map(ids.map((id, i) => [id, i]));
    // stroke ends: two drones, none in between. Equal edges get the same answer (tolerance against rounding noise), and
    // mirror partners too: a group is a bridge only when all its edges are
    const grpG = (groups || []).map((grp) => grp.filter((id) => local.has(id))).filter((grp) => grp.length > 1);
    const brSet = new Set(ids.filter((id) => graph.edges[id].cap && graph.edges[id].L <= 2.0 * cbar * (1 + 1e-6)));
    for (const grp of grpG) if (!grp.every((id) => brSet.has(id))) grp.forEach((id) => brSet.delete(id));
    const bridges = ids.filter((id) => brSet.has(id));
    const g = grpG.map((grp) => grp.map((id) => local.get(id)));
    const fx = bridges.map((id) => local.get(id));
    const a = FK.allocate.allocate(L, T, g, { fixedOne: fx });
    if (a) return { ok: true, m: a.m, ratio: a.ratio, bridges };
    if (fx.length) { // stroke-end bridges are a refinement: when this count cannot keep them all, place it without
      const b = FK.allocate.allocate(L, T, g, {});
      if (b) return { ok: true, m: b.m, ratio: b.ratio, bridges: [] };
    }
    if (g.length && FK.allocate.allocate(L, T, [], { fixedOne: fx })) return { ok: false, parity: true, reason: "Symmetrie: nur gerade Anzahl" };
    return { ok: false, reason: "nicht verteilbar" };
  }

  function allocateFor(graph, N, useGroups, parts, names) {
    const groups = useGroups ? graph.groups : [];
    if (!parts) return allocSub(graph, graph.edges.map((e) => e.id), graph.nodes.length, N, groups);
    if (!parts.auto && N !== parts.fixedSum) return { ok: false, reason: `Anzahl ist durch die Motive festgelegt (${parts.fixedSum})` };
    const m = new Array(graph.edges.length).fill(1), bridges = [];
    let ratio = 1;
    for (const p of parts.list) {
      const r = allocSub(graph, p.edges, p.nodes.length, p.key === "auto" ? N - parts.fixedSum : p.n, groups);
      if (!r.ok) return Object.assign(r, { part: p.key, reason: (p.key === "auto" ? "" : ((names && names[p.key]) || "Motiv") + ": ") + r.reason });
      p.edges.forEach((id, i) => (m[id] = r.m[i]));
      bridges.push(...r.bridges);
      ratio = Math.max(ratio, r.ratio);
    }
    return { ok: true, m, ratio, bridges };
  }

  // scale (m per template unit) for a candidate
  function scaleFor(st, dTu, closestTu, graph) {
    const f = st.hardMin + st.floorMargin;
    // drones on top of each other (closest << spacing) can never be fixed by growing: keep the size, report the error
    const sTarget = st.spacing / dTu, sFloor = closestTu > 1e-6 * dTu ? f / closestTu : 0;
    const sAuto = Math.max(sTarget, sFloor);
    let s = sAuto;
    if (st.sizeMode === "scaled") s = sAuto * st.scaleK;
    else if (st.sizeMode === "fixed" && st.fixedWidth > 0 && graph.bbox.w > 0) s = st.fixedWidth / graph.bbox.w;
    return { s, sAuto, floorFactor: sFloor > sTarget ? sFloor / sTarget : 1 };
  }

  function rate(c, st) {
    if (!c.feasible) return "unmoeglich";
    if (c.closest_m !== null && c.closest_m <= st.hardMin + 1e-9) return "rot";
    const ev = FK.validate.evenTier(c.spread, c.band, c.isText, st.tiers);
    if (ev === "ungleich") return "ungleich";
    if (ev === "gelb" || c.nNeck || c.nBetween || c.nShort || c.lowDensity || (st.sizeMode !== "auto" && c.d_m < 0.98 * st.spacing)) return "gelb";
    return "gruen";
  }

  function evaluate(graph, N, st, quick, parts) {
    if (parts === undefined) parts = partsOf(graph, st);
    const al = allocateFor(graph, N, st.symmetry !== false, parts, st.itemNames);
    const c = { N, feasible: al.ok, reasons: [], estimated: !!quick };
    if (!al.ok) { c.status = "unmoeglich"; c.reasons.push(al.reason); c.parity = !!al.parity; c.part = al.part; return c; }
    c.m = al.m; c.bridges = al.bridges;
    if (quick) { // evenness from the allocation alone, inside every part
      const brq = new Set(al.bridges || []), sets = parts ? parts.list.map((p) => p.edges) : [graph.edges.map((e) => e.id)];
      let spread = 1, band = null, dTu = Infinity, nShort = 0;
      for (const ids of sets) {
        const own = ids.filter((id) => !brq.has(id)), sp = own.map((id) => graph.edges[id].L / al.m[id]), all = [];
        if (!sp.length) continue;
        own.forEach((id) => { for (let k = 0; k < al.m[id]; k++) all.push(graph.edges[id].L / al.m[id]); });
        const dP = FK.validate.median(all) || 1, lo = Math.min(...sp), hi = Math.max(...sp);
        spread = Math.max(spread, hi / lo); band = band ? [Math.min(band[0], lo / dP), Math.max(band[1], hi / dP)] : [lo / dP, hi / dP];
        dTu = Math.min(dTu, dP); nShort += own.filter((id) => graph.edges[id].L < 0.6 * dP).length;
      }
      if (!Number.isFinite(dTu)) dTu = 1;
      c.spread = spread; c.band = band || [1, 1]; c.isText = !!graph.isText;
      const sc = scaleFor(st, dTu, dTu, graph);
      c.s = sc.s; c.d_m = sc.s * dTu; c.closest_m = null; c.width = graph.bbox.w * sc.s; c.height = graph.bbox.h * sc.s;
      c.nShort = nShort; c.nNeck = 0; c.nBetween = 0;
      c.status = rate(c, st);
      return c;
    }
    const lay = layout(graph, al.m, al.bridges, parts);
    const A = FK.validate.analyze(lay, graph);
    // with own counts per motif the spacing differs between motifs: the target spacing holds for the densest one
    const dT = parts ? A.dMin : A.d, brs = new Set(al.bridges || []);
    const sc = scaleFor(st, dT, A.closest.d, graph);
    Object.assign(c, {
      s: sc.s, sAuto: sc.sAuto, floorFactor: sc.floorFactor, dTu: dT, closestTu: A.closest.d,
      d_m: sc.s * dT, closest_m: Number.isFinite(A.closest.d) ? sc.s * A.closest.d : null,
      spread: A.spread, band: A.band, nNeck: A.nNeck, nBetween: A.nBetween, nCorner: A.nCorner,
      nShort: graph.edges.filter((e) => !brs.has(e.id) && e.L < 0.6 * A.dOf(parts ? parts.edgePart[e.id] : undefined)).length,
    });
    if (parts) c.parts = parts.list.map((p) => {
      const k = p.key, n = lay.drones.filter((d) => d.part === k).length, dP = A.dPart[k];
      const out = { key: k, n, fixed: k !== "auto", min: p.nodes.length };
      if (dP !== undefined) { out.d_m = sc.s * dP; out.spread = A.partSpread[k] || 1; out.tier = FK.validate.evenTier(out.spread, A.partBand[k], false, st.tiers); }
      else { out.d_m = null; out.spread = 1; out.tier = "gruen"; }
      return out;
    });
    const b = FK.geom.bbox(lay.drones.map((d) => d.p));
    c.width = b.w * sc.s; c.height = b.h * sc.s;
    c.isText = !!graph.isText;
    if (c.isText) { // FS rule of thumb for customers: 10–12 drones per letter for simple text
      c.perCap = (FK.font.CAP * sc.s) / c.d_m; c.perLetter = graph.nGlyphs ? N / graph.nGlyphs : null;
      if (graph.textOutline) { c.perStroke = (graph.strokeW * sc.s) / c.d_m; c.lowDensity = c.perStroke < 1.3; } // outline letters: both sides of a stroke must stay apart
      else c.lowDensity = (c.perLetter !== null && c.perLetter < 10 - 1e-9) || c.perCap < 3.5;
    }
    c.status = rate(c, st);
    if (sc.floorFactor > 1 + 1e-6 && st.sizeMode === "auto") c.reasons.push("Größe durch engstes Paar bestimmt");
    c._layout = lay; c._analysis = A;
    return c;
  }

  // count strip, suggestions, chosen formation
  function plan(graph, settings) {
    const st = Object.assign({}, DEFAULTS, settings || {});
    st.tiers = Object.assign({}, DEFAULTS.tiers, (settings || {}).tiers);
    const V = graph.nodes.length, E = graph.edges.length;
    const F = st.showTotal > 0 ? Math.floor(st.showTotal) : Infinity;
    if (!V && !E) return { empty: true, cells: [], suggestions: [], settings: st };
    const parts = partsOf(graph, st), locked = !!(parts && !parts.auto); // locked: every motif has its own count
    let Nhi = Math.min(st.targetN, F);
    if (st.sizeMode === "fixed" && st.fixedWidth > 0 && graph.bbox.w > 0) {
      const s = st.fixedWidth / graph.bbox.w;
      Nhi = Math.min(Nhi, Math.max(V, Math.round((s * graph.total) / st.spacing) + V - E + 5));
    }
    Nhi = Math.max(Nhi, parts ? parts.minN : V);
    if (locked) Nhi = parts.fixedSum;
    const W = Math.max(10, Math.ceil(0.1 * Nhi));
    const Nlo = locked ? Nhi : Math.max(parts ? parts.minN : V, Nhi - W);
    const quick = Nhi > 400;
    const cache = new Map();
    const ev = (N, full) => {
      const k = N + (full || !quick ? "f" : "q");
      if (!cache.has(k)) cache.set(k, evaluate(graph, N, st, !(full || !quick), parts));
      return cache.get(k);
    };
    const cells = [];
    for (let N = Nhi; N >= Nlo; N--) cells.push(ev(N));
    const aboveCells = [];
    if (F > st.targetN && !locked) for (let N = st.targetN + 1; N <= Math.min(st.targetN + 5, F); N++) { const c = ev(N); c.aboveTarget = true; aboveCells.push(c); }
    // suggestions (§6.6): highest clean N <= Nhi, the next lower clean one, the target itself
    const has = (s) => cells.some((c) => c.status === s);
    const best = has("gruen") ? "gruen" : has("gelb") ? "gelb" : null;
    const sugg = [];
    if (best) {
      const hits = cells.filter((c) => c.status === best);
      sugg.push({ N: hits[0].N, label: "Empfohlen", status: best });
      if (hits[1]) sugg.push({ N: hits[1].N, label: "", status: best });
    }
    let conflict = null;
    if (locked) sugg.splice(0, sugg.length, { N: Nhi, label: "Summe der Motive", status: cells[0].status });
    else if (best !== "gruen") {
      conflict = { title: `Keine saubere Anzahl zwischen ${Nlo} und ${Nhi}`, down: null, up: null, cause: null };
      for (let N = Nlo - 1; N >= Math.max(V, Nhi - 3 * W); N--) { const c = ev(N); if (c.status === "gruen") { conflict.down = N; break; } }
      if (F > st.targetN) for (let N = st.targetN + 1; N <= Math.min(st.targetN + 3 * W, F); N++) { const c = ev(N); if (c.status === "gruen") { conflict.up = N; break; } }
      const t = cells.find((c) => c.feasible);
      if (!t) conflict.cause = cells[0] && cells[0].reasons[0];
      else if (FK.validate.evenTier(t.spread, t.band, t.isText, st.tiers) !== "gruen") conflict.cause = blocker(graph, t);
      // far-away clean count: pre-selected only when the window has nothing usable (all "deutlich ungleich")
      if (conflict.down !== null) { const s = { N: conflict.down, label: "Nächste saubere darunter", status: "gruen" }; if (best) sugg.push(s); else sugg.unshift(s); }
      if (conflict.up !== null) sugg.push({ N: conflict.up, label: `über Ziel (+${conflict.up - st.targetN})`, status: "gruen", above: true });
    }
    if (!best) { // nothing green or amber: at least offer the most even count of the window
      const even = cells.filter((c) => c.feasible && c.status === "ungleich").sort((a, b) => a.spread - b.spread || b.N - a.N)[0];
      if (even && !sugg.some((s) => s.N === even.N)) sugg.push({ N: even.N, label: "Am gleichmäßigsten", status: even.status });
    }
    const tgt = locked ? cells[0] : ev(Math.min(st.targetN, F));
    if (tgt.feasible && !sugg.some((s) => s.N === tgt.N)) sugg.push({ N: tgt.N, label: "Ziel", status: tgt.status });
    // chosen: user choice, else the first suggestion that is not above the target
    let chosenN = locked ? Nhi : st.chosenN;
    if (!(chosenN >= (parts ? parts.minN : V)) || (chosenN > F && !locked)) chosenN = null;
    if (chosenN === null) { const s1 = sugg.find((s) => !s.above); chosenN = s1 ? s1.N : Nhi; }
    let chosen = ev(chosenN, true);
    let asym = false;
    if (!chosen.feasible && chosen.parity) { // user insists on an odd count: plan without mirror ties, warn
      const st2 = Object.assign({}, st, { symmetry: false });
      chosen = evaluate(graph, chosenN, st2, false, parts);
      asym = true;
    }
    const formation = chosen.feasible ? buildFormation(graph, chosen, st, F, asym) : null;
    const partInfo = parts ? partsReport(graph, parts, chosen, st) : null;
    if (formation) formation.parts = partInfo;
    for (const s of sugg) { const c = cache.get(s.N + "f") || cache.get(s.N + "q"); if (c && c.width) { s.width = c.width; s.height = c.height; } }
    for (const c of cells.concat(aboveCells)) { delete c._layout; delete c._analysis; }
    return { settings: st, V, E, Nhi, Nlo, W, F, cells, aboveCells, suggestions: sugg.slice(0, 4), conflict, chosen: stripC(chosen), formation, estimated: quick, parts: partInfo, locked };
  }

  // per motif: drones, spacing, evenness; for motifs with their own count the nearest even counts below and above
  function partsReport(graph, parts, c, st) {
    const groups = st.symmetry !== false ? graph.groups : [];
    const tierAt = (p, n) => {
      const a = allocSub(graph, p.edges, p.nodes.length, n, groups);
      if (!a.ok) return null;
      const br = new Set(a.bridges), sp = p.edges.map((id, i) => (br.has(id) ? null : graph.edges[id].L / a.m[i])).filter((v) => v !== null);
      return sp.length ? FK.validate.evenTier(Math.max(...sp) / Math.min(...sp), null, false, st.tiers) : "gruen";
    };
    return parts.list.map((p) => {
      const r = Object.assign({ key: p.key, fixed: p.key !== "auto", min: p.nodes.length, n: p.n, name: (st.itemNames && st.itemNames[p.key]) || (p.key === "auto" ? "übrige Motive" : "Motiv") },
        c.feasible && c.parts ? c.parts.find((x) => x.key === p.key) : {});
      if (!c.feasible && c.part === p.key) {
        const m = /weniger Drohnen als Pflichtpunkte \((\d+)\)/.exec(c.reasons[0] || "");
        r.reason = m ? `${r.name} braucht mindestens ${m[1]} Drohnen (eine auf jeder Ecke, jedem Ende, jeder Kreuzung)` : c.reasons[0];
      }
      // nearest even counts only where they help: the motif that blocks the plan, or an uneven one
      if (r.fixed && (c.feasible ? r.tier !== "gruen" : c.part === p.key)) {
        const n = p.n, w = Math.max(10, Math.ceil(0.25 * n));
        for (let k = n - 1; k >= Math.max(p.nodes.length, n - w); k--) if (tierAt(p, k) === "gruen") { r.down = k; break; }
        for (let k = Math.max(n + 1, p.nodes.length); k <= Math.max(n, p.nodes.length) + w; k++) if (tierAt(p, k) === "gruen") { r.up = k; break; }
      }
      return r;
    });
  }
  function stripC(c) { const o = Object.assign({}, c); delete o._layout; delete o._analysis; return o; }

  function blocker(graph, c) {
    if (!c.m) return null;
    const sp = graph.edges.map((e) => ({ e, v: e.L / c.m[e.id] }));
    const lo = sp.reduce((a, b) => (b.v < a.v ? b : a)), hi = sp.reduce((a, b) => (b.v > a.v ? b : a));
    const dTu = c.dTu || hi.v;
    const short = [lo, hi].map((x) => x.e).filter((e) => e.L < 1.5 * dTu).sort((a, b) => a.L - b.L)[0];
    if (short) return `Segment (${FK.validate.fmt(short.L * (c.s || 1))} m) zwischen zwei Pflichtpunkten passt nicht zu ${FK.validate.fmt(c.d_m || 2)} m Abstand`;
    return `Segmentlängen passen nicht zu gleichen Abständen (Spread ${FK.validate.fmt(c.spread, 2)})`;
  }

  // metres: plane coordinates (x right, y up); spare drones in a grid below the figure
  function buildFormation(graph, c, st, F, asym) {
    const lay = c._layout, s = c.s;
    const drones = lay.drones.map((d, i) => Object.assign({}, d, { i, p: [d.p[0] * s, d.p[1] * s], lit: true }));
    const colorOf = new Map(graph.elements.map((e) => [e.id, e.color]));
    drones.forEach((d) => (d.color = colorOf.get(d.el) || "#ff9e29"));
    const perEdge = lay.perEdge.map((pe) => ({ edge: pe.edge, m: pe.m, seq: pe.seq.slice(), bridge: pe.bridge, part: pe.part }));
    const litB = FK.geom.bbox(drones.map((d) => d.p));
    let nSpare = 0;
    if (Number.isFinite(F) && F > drones.length && st.spares !== "none") {
      nSpare = F - drones.length;
      const pitch = Math.max(c.d_m, st.sparePitchMin);
      const cols = Math.max(1, Math.min(nSpare, Math.floor(litB.w / pitch) + 1));
      const top = litB.y0 - 2 * Math.max(c.d_m, pitch);
      for (let k = 0; k < nSpare; k++) {
        const row = Math.floor(k / cols), inRow = Math.min(cols, nSpare - row * cols), col = k - row * cols;
        const x = litB.cx + (col - (inRow - 1) / 2) * pitch, y = top - row * pitch;
        drones.push({ i: drones.length, p: [x, y], role: "spare", node: null, edge: null, el: null, kind: "spare", lit: false, color: "#000000" });
      }
    }
    const form = { N: lay.drones.length, nSpare, total: drones.length, scale: s, d: c.d_m, closest: c.closest_m, spread: c.spread, band: c.band, floorFactor: c.floorFactor || 1, width: c.width, height: c.height, drones, perEdge, asym, litBox: litB };
    form.analysis = FK.validate.analyze(form, graph);
    return form;
  }

  FK.plan = { plan, evaluate, layout, allocateFor, partsOf, DEFAULTS };
})(FK);
