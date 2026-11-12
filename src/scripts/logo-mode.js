// Logo-Modus des Show-Konfigurators (Runde 27, Marc 12.11.2026). Wird erst geladen, wenn jemand in den Logo-Modus wechselt
// oder ein Logo hochlädt (show-configurator.js importiert dieses Modul dynamisch; der Konverter selbst rechnet im Worker
// von logo-v10/ und lädt mit der ersten eigenen Datei).
// - Kundenlogos: vorberechnete Formationen (public/media/logo-modus/kundenlogos.json, erzeugt mit
//   23-logo-drohnen-konverter/tools/v10/examples.mjs). Gezeigt werden je Drohnenzahl nur die Logos, die in diese Zahl passen.
// - Eigenes Logo: logo-v10 (Kontur, Budget-Flexibilität, Detailgrad), Entfernen von Teilen in einer flachen Ansicht über der
//   Bühne (die Bühne selbst ist gekippt und fliegt; dort wäre ein Klick nicht verlässlich einer Drohne zuzuordnen).
import { decodePoints } from "./logo-v10/prepared.mjs";
import { exampleRaster } from "./logo-v10/example-raster.mjs";
import { logoFormations } from "./logo-v10/logo-formation.js";
import { colourRuns, targetKey, selectedPoints, widenSelection, selectElement, selectionForAction } from "./logo-v10/groups.mjs";
import { nearestHit, rectUnits } from "./logo-v10/pick.mjs";
import { bindRubberBand } from "./logo-v10/rubber-band.mjs";

let examples = null;
/** Die Kundenlogos für n Drohnen: [{ name, pts: [[x, y], …] (y nach unten, lange Seite in [-1, 1]), n }]. */
export async function customerLogos(n) {
  examples ??= fetch("/media/logo-modus/kundenlogos.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  const data = await examples;
  // nur von Hand freigegebene Bilder (ok: geprüft in 23-logo-drohnen-konverter/screens/v10-kundenlogos); je Logo das größte
  // freigegebene Bild bis zur gewählten Zahl. Passen weniger als zwei, kommen die kleinsten freigegebenen Bilder darüber
  // dazu, mit ihrer eigenen Zahl (die Bildunterschrift nennt sie): lieber ein ehrliches „ab 400“ als ein wackliges Logo
  const pick = (logo, test) => { const c = [...data.counts].filter((k) => logo.steps[k]?.ok && test(k)); return c.length ? c : null; };
  const out = [];
  for (const logo of data.logos) { const c = pick(logo, (k) => k <= n && logo.steps[k].n <= n * 1.05); if (c) out.push({ logo, k: c.at(-1), fits: true }); }
  if (out.length < 2) {
    const more = [];
    for (const logo of data.logos) { if (out.some((x) => x.logo === logo)) continue; const c = pick(logo, (k) => k > n); if (c) more.push({ logo, k: c[0], fits: false }); }
    out.push(...more.sort((x, y) => x.k - y.k).slice(0, 4 - out.length));
  }
  return out.map(({ logo, k, fits }) => {
    const s = logo.steps[k], pts = []; for (let i = 0; i < s.p.length; i += 2) pts.push([s.p[i] / 1000, s.p[i + 1] / 1000]);
    return { id: logo.id, name: logo.name, pts, n: s.n, fits };
  });
}

/**
 * Eine Sitzung je hochgeladener Datei. opts: { flex: 'auto'|'strict'|'medium'|'flexible', density?: Zahl }.
 * formation(n) → Punkte [{ x, y, c: [r, g, b] }] mit meta { n, wanted, over, … } (Farben schon für den Nachthimmel).
 */
export function logoSession(file, init = {}) {
  const raster = exampleRaster(file);
  let opts = { flex: "auto", part: "auto", ...init }, inst = null, removed = [];
  if (opts.density == null) delete opts.density;
  const removals = () => ({ exclude: removed.filter((r) => !r.erase).flatMap((r) => r.anchors), erase: removed.filter((r) => r.erase).flatMap((r) => r.anchors) });
  const fresh = () => { inst?.dispose(); inst = logoFormations(file, { opts: { ...opts }, raster }); if (removed.length) inst.setRemovals(removals()); };
  return {
    formation: (n, o) => { if (!inst) fresh(); return inst.formation(n, o); },
    setOptions(next) { const o = { ...opts, ...next }; if (o.density == null) delete o.density; if (JSON.stringify(o) === JSON.stringify(opts)) return false; opts = o; inst?.dispose(); inst = null; return true; },
    get options() { return { ...opts }; },
    get removed() { return removed; },
    setRemoved(list) { removed = list; inst?.setRemovals(removals()); },
    dispose() { inst?.dispose(); inst = null; },
  };
}

/**
 * Teile entfernen direkt auf der Bühne (Marc 12.11.: wie im Prototyp, ohne eigenen Knopf). Die Punkte stehen dort, wo das
 * Feld sie zeichnet (screenOf(): Bildschirmlage je Punktindex); entfernte Teile als Geister, über eine Ausgleichsabbildung
 * Logo → Bildschirm aus den aktuellen Punkten gelegt. el: { canvas, band, bar, text, remove, restore, clear, all }.
 */
export function stageEditor(el, { screenOf, onChange, t }) {
  const c = el.canvas, g = c.getContext("2d");
  let shown = null, groups = null, removed = [], selected = new Set(), hover = null, raf = 0, on = false;
  /** Logo-Koordinaten → Bildschirm: kleinste Quadrate über alle Punkte mit Lage (x' = a x + b, y' = c y + d) */
  function mapper(scr) {
    let n = 0, sx = 0, sy = 0, sX = 0, sY = 0, sxx = 0, syy = 0, sxX = 0, syY = 0;
    shown.forEach((p, j) => { const q = scr[j]; if (!q) return; n++; sx += p.x; sy += p.y; sX += q[0]; sY += q[1]; sxx += p.x * p.x; syy += p.y * p.y; sxX += p.x * q[0]; syY += p.y * q[1]; });
    if (n < 2) return null;
    const a = (n * sxX - sx * sX) / Math.max(1e-9, n * sxx - sx * sx), b = (sX - a * sx) / n, cc = (n * syY - sy * sY) / Math.max(1e-9, n * syy - sy * sy), d = (sY - cc * sy) / n;
    return (p) => [a * p.x + b, cc * p.y + d];
  }
  const ghostsOf = (r) => { const f = shown?.meta.frame; return r.ghost.map((p) => (f && p.source ? { ...p, x: p.source.x * f.sx + f.ox, y: p.source.y * f.sy + f.oy } : p)); };
  const pointsFor = (key) => (key[0] === "g" ? ghostsOf(removed[+key.slice(1)]) : selectedPoints(groups, shown, key));
  let frame = null; // { scr, map } of the current animation frame
  function measure() {
    const scr = screenOf(); if (!scr || !shown) return (frame = null);
    const map = mapper(scr);
    frame = { scr, map, pos: (p) => { const j = shown.indexOf(p); return j >= 0 && scr[j] ? scr[j] : map ? map(p) : null; } };
    return frame;
  }
  const candidates = () => {
    const f = frame ?? measure(); if (!f) return [];
    const out = [];
    shown.forEach((p, j) => { if (p.e >= 0 && f.scr[j]) out.push({ x: f.scr[j][0], y: f.scr[j][1], key: targetKey(groups, p) }); });
    removed.forEach((r, i) => { for (const p of ghostsOf(r)) { const q = f.map?.(p); if (q) out.push({ x: q[0], y: q[1], key: "g" + i }); } });
    return out;
  };
  function draw() {
    const d = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
    const f = measure(); if (!f || !on) return;
    const rad = Math.max(3, Math.min(w, h) * 0.006);
    if (f.map) for (const r of removed) for (const p of ghostsOf(r)) { const q = f.map(p); g.fillStyle = `rgba(${p.c.join(",")},0.22)`; g.beginPath(); g.arc(q[0], q[1], rad * 0.7, 0, Math.PI * 2); g.fill(); }
    for (const key of new Set([...selected, hover].filter(Boolean))) {
      g.strokeStyle = selected.has(key) ? "#ffb36b" : "rgba(255,255,255,.9)"; g.lineWidth = 1.5;
      for (const p of pointsFor(key)) { const q = key[0] === "g" ? f.map?.(p) : f.pos(p); if (!q) continue; g.beginPath(); g.arc(q[0], q[1], rad + 2.5, 0, Math.PI * 2); g.stroke(); }
    }
  }
  const loop = () => { raf = 0; draw(); if (on && (hover || selected.size || removed.length)) raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  function bar() {
    const s = [...selected];
    el.bar.hidden = !on || (!s.length && !removed.length);
    el.text.textContent = s.length ? t("logoMode.selected", { n: s.length }) : t("logoMode.editHint");
    el.remove.hidden = !s.some((k) => k[0] !== "g"); el.restore.hidden = !s.some((k) => k[0] === "g");
    el.clear.hidden = !s.length; el.all.hidden = !removed.length;
  }
  function hit(e) {
    if (!shown || !on) return null;
    const r = c.getBoundingClientRect(); measure();
    return nearestHit(candidates(), e.clientX - r.left, e.clientY - r.top, 16)?.key ?? null;
  }
  const band = bindRubberBand(c, {
    hit, overlay: el.band, candidates,
    select(dr, add) {
      const r = c.getBoundingClientRect();
      const rect = { x0: Math.min(dr.x0, dr.x1) - r.left, y0: Math.min(dr.y0, dr.y1) - r.top, x1: Math.max(dr.x0, dr.x1) - r.left, y1: Math.max(dr.y0, dr.y1) - r.top };
      if (!add) selected.clear();
      measure(); for (const key of rectUnits(candidates(), rect)) widenSelection(selected, key, groups);
      bar(); kick();
    },
  });
  c.addEventListener("pointermove", (e) => { if (band.active) return; const h = hit(e); if (h !== hover) { hover = h; c.style.cursor = hover ? "pointer" : "crosshair"; kick(); } });
  c.addEventListener("pointerleave", () => { hover = null; kick(); });
  c.addEventListener("click", (e) => { if (band.suppressClick()) return; const h = hit(e); if (h) widenSelection(selected, h, groups); else selected.clear(); bar(); kick(); });
  c.addEventListener("dblclick", (e) => { const h = hit(e); if (h?.[0] === "r") { selectElement(selected, groups.runs[+h.slice(1)].e, groups); bar(); kick(); } });
  function apply(mode) {
    const chosen = selectionForAction(selected, mode), keep = removed.filter((r, i) => !chosen.has("g" + i));
    // (nie alles entfernen: ohne Punkte bliebe kein Logo; die Auswahl bleibt dann stehen)
    if (mode === "remove") { const gone = new Set(); for (const key of chosen) if (key[0] !== "g") for (const p of pointsFor(key)) gone.add(p); if (gone.size >= shown.length) return; }
    for (const key of chosen) {
      if (key[0] === "g") continue;
      if (key[0] === "r" && selected.has("e" + groups.runs[+key.slice(1)].e)) continue;
      const dots = pointsFor(key), f = shown.meta.frame;
      const anchors = key[0] === "r"
        ? (shown.meta.colourGroups || []).filter((q) => groups.runs[+key.slice(1)].cgs.includes(q.id)).map((q) => q.anchor)
        : (shown.meta.elements || []).filter((q) => q.id === +key.slice(1)).map((q) => q.anchor);
      if (anchors.length) keep.push({ erase: key[0] === "r", anchors, ghost: dots.map((p) => ({ ...p, source: { x: (p.x - f.ox) / f.sx, y: (p.y - f.oy) / f.sy } })) });
    }
    removed = keep; selected.clear(); hover = null; bar(); kick(); onChange(removed);
  }
  el.remove.addEventListener("click", () => apply("remove"));
  el.restore.addEventListener("click", () => apply("restore"));
  el.clear.addEventListener("click", () => { selected.clear(); bar(); kick(); });
  el.all.addEventListener("click", () => { removed = []; selected.clear(); bar(); onChange(removed); });
  document.addEventListener("keydown", (e) => { if (!on) return; if (e.key === "Escape" && selected.size) { selected.clear(); bar(); kick(); } else if ((e.key === "Delete" || e.key === "Backspace") && selected.size && !/input|textarea/i.test(document.activeElement?.tagName)) { e.preventDefault(); apply("remove"); } });
  return {
    /** neue Formation des eigenen Logos (removedList: die Entfernungen der Sitzung) */
    show(pts, removedList) { shown = pts; removed = removedList; selected.clear(); hover = null; groups = colourRuns({ points: pts.map((p) => Object.assign(p, { r: p.c[0], g: p.c[1], b: p.c[2] })), spacing: pts.meta.spacing }); bar(); kick(); },
    /** an/aus: nur im Anlass „Euer Logo“ mit eigenem Logo, wenn das Bild steht */
    setActive(v) { on = v; c.hidden = !v; if (!v) { selected.clear(); hover = null; } bar(); kick(); },
    reset() { shown = null; removed = []; selected.clear(); hover = null; bar(); kick(); },
  };
}

/** Lebendige Wolke als eigenes Bild: n Drohnen in einer lockeren, atmenden Wolke (für die Wartezeit beim Rechnen). */
export function cloudPoints(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, r = Math.sqrt((i + 0.5) / n);
    pts.push([Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.55, Math.sin(i * 1.7) * 0.25, 210, 220, 255]);
  }
  return pts;
}
export const cloudLive = (p, j, t, o) => { o[0] += 0.05 * Math.sin(t * 0.8 + j * 1.31); o[1] += 0.04 * Math.cos(t * 0.65 + j * 2.17); o[2] += 0.05 * Math.sin(t * 0.5 + j * 0.73); o[3] = 0.55 + 0.35 * Math.sin(t * 1.3 + j * 0.9) ** 2; };

const preparedExamples = new Map();
export function loadExample(id) {
  if (!preparedExamples.has(id)) preparedExamples.set(id, fetch(`/media/logo-modus/beispiele/${id}.json`).then(r => {
    if (!r.ok) throw new Error(`Beispiel ${id}: ${r.status}`); return r.json();
  }).catch(error => { preparedExamples.delete(id); throw error; }));
  return preparedExamples.get(id);
}
export async function exampleFormation(id, n) {
  const data = await loadExample(id), step = data.steps[n];
  if (!step) throw new Error(`Unbekannte Drohnenstufe ${n}`);
  const p = decodePoints(step.p), pts = [];
  for (let i=0;i<p.length;i+=5) pts.push({ x:p[i]/1000, y:p[i+1]/1000, c:data.palette[p[i+2]], e:p[i+3], cg:p[i+4], wt:1 });
  pts.meta = { frame:step.frame, elements:step.elements, colourGroups:step.colourGroups, spacing:step.spacing, n, over:pts.length>n };
  return pts;
}
